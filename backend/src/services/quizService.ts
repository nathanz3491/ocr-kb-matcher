import { getJob } from './jobService';
import { getEntryById, getAllEntries } from './knowledgeBase';
import { getKnowledgeGraph, KnowledgeGraphNode, InternalGraphNode } from './knowledgeGraphStorage';
import { getNodeById, KnowledgeNode } from './knowledgeGraph';
import { loadQuizSessions, saveQuizSessions, loadQuizResults, saveQuizResults } from './quizStorage';
import OpenAI from 'openai';

const MAX_RETRIES = 2;

async function callQuizAI(prompt: string): Promise<string> {
  const apiKey = process.env.MOONSHOT_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('AI API key not configured');

  const client = new OpenAI({
    apiKey,
    baseURL: process.env.MOONSHOT_BASE_URL,
    timeout: 30000,
  });

  const completion = await client.chat.completions.create({
    model: process.env.MOONSHOT_MODEL || 'moonshot-v1-8k',
    max_tokens: 4096,
    messages: [
      { role: 'system', content: 'You are an educational quiz generator. Always respond with valid JSON only, no markdown formatting or additional text.' },
      { role: 'user', content: prompt }
    ],
    temperature: 0.7,
    response_format: { type: 'json_object' },
  });
  return completion.choices[0]?.message?.content || '';
}

function stripMarkdownFences(text: string): string {
  const fenceMatch = text.match(/```json\s*([\s\S]*?)```/);
  if (fenceMatch) return fenceMatch[1].trim();
  const braceMatch = text.match(/\{[\s\S]*\}/);
  return braceMatch ? braceMatch[0].trim() : text.trim();
}

export type QuestionType = 'multiple_choice' | 'fill_in_blank' | 'true_false' | 'matching';

export interface QuizQuestion {
  id: string;
  type: QuestionType;
  question: string;
  options?: string[];
  correctAnswer?: number;
  explanation: string;
  items?: string[];
  matches?: string[];
  correctMatches?: string[];
}

export interface MatchingQuestion {
  id: string;
  type: 'matching';
  question: string;
  items: string[];
  matches: string[];
  correctMatches: string[];
  explanation: string;
}

export interface QuizSession {
  id: string;
  jobId: string;
  questions: QuizQuestion[];
  createdAt: string;
  targetedNodes?: string[];
}

export interface QuizResult {
  sessionId: string;
  jobId: string;
  score: number;
  totalQuestions: number;
  answers: Array<{
    questionId: string;
    selectedAnswer: number;
    correct: boolean;
  }>;
  completedAt: string;
}

let quizSessionsData: Record<string, QuizSession> = {};
let quizResultsData: QuizResult[] = [];
let dataLoaded = false;
let currentUserId: string = '';

async function ensureDataLoaded(userId?: string): Promise<void> {
  if (!dataLoaded || currentUserId !== (userId ?? '')) {
    currentUserId = userId ?? '';
    quizSessionsData = await loadQuizSessions(currentUserId);
    quizResultsData = await loadQuizResults(currentUserId);
    dataLoaded = true;
  }
}

async function setQuizSession(session: QuizSession, userId?: string): Promise<void> {
  await ensureDataLoaded(userId);
  quizSessionsData[session.id] = session;
  await saveQuizSessions(quizSessionsData, currentUserId);
}

async function getQuizSessionFromStorage(sessionId: string, userId?: string): Promise<QuizSession | null> {
  await ensureDataLoaded(userId);
  return quizSessionsData[sessionId] || null;
}

async function pushQuizResult(result: QuizResult, userId?: string): Promise<void> {
  await ensureDataLoaded(userId);
  quizResultsData.push(result);
  await saveQuizResults(quizResultsData, currentUserId);
}

async function getQuizResultsFromStorage(userId?: string): Promise<QuizResult[]> {
  await ensureDataLoaded(userId);
  return quizResultsData;
}

/**
 * Validate and fix quiz data from AI
 * - Ensure matching questions have unique items and matches
 * - Ensure explanation is provided for all questions
 */
function validateAndFixQuizData(quizData: { questions: QuizQuestion[] }): { questions: QuizQuestion[] } {
  const defaultExplanation = 'This question tests your understanding of the concept. Review the material and try again.';
  
  quizData.questions = quizData.questions.map(q => {
    // Add explanation if missing
    if (!q.explanation || q.explanation.trim() === '') {
      q.explanation = defaultExplanation;
    }
    
    // For matching questions, ensure unique items and matches
    if (q.type === 'matching') {
      // Ensure items are unique
      if (q.items && q.items.length > 0) {
        const uniqueItems = [...new Set(q.items)];
        if (uniqueItems.length !== q.items.length) {
          q.items = uniqueItems;
          console.warn('Fixed duplicate items in matching question:', q.id);
        }
      }
      
      // Ensure matches are unique and generate them if missing
      if (!q.matches || q.matches.length === 0) {
        q.matches = q.items?.map((item, idx) => `Match for ${item}`) || [];
      }
      if (!q.correctMatches || q.correctMatches.length === 0) {
        q.correctMatches = q.matches;
      }
      
      // Make matches unique by adding slight variations if needed
      if (q.matches && q.correctMatches) {
        const uniqueMatches = [...new Set(q.matches)];
        if (uniqueMatches.length !== q.matches.length) {
          // Add numeric suffixes to make them unique
          const seen: Record<string, number> = {};
          q.matches = q.matches.map(m => {
            if (seen[m]) {
              seen[m]++;
              return `${m} (${seen[m]})`;
            }
            seen[m] = 1;
            return m;
          });
          // Also update correctMatches with the same logic
          const correctSeen: Record<string, number> = {};
          q.correctMatches = q.correctMatches.map(m => {
            if (correctSeen[m]) {
              correctSeen[m]++;
              return `${m} (${correctSeen[m]})`;
            }
            correctSeen[m] = 1;
            return m;
          });
          console.warn('Fixed duplicate matches in matching question:', q.id);
        }
        
        // Ensure correctMatches has the same length as items
        if (q.correctMatches.length !== q.items?.length) {
          q.correctMatches = [...q.matches];
        }
      }
      
      // Add explanation for matching if missing
      if (!q.explanation || q.explanation === defaultExplanation) {
        q.explanation = 'Match each item on the left with its correct answer on the right. Drag the answer from the available matches.';
      }
    }
    
    return q;
  });
  
  return quizData;
}

/**
 * Generate a quiz from job content using AI
 */
export async function generateQuiz(jobId: string, userId?: string): Promise<QuizSession> {
  const job = await getJob(jobId);
  if (!job) {
    throw new Error('Job not found');
  }

  // Get the extracted text from the job
  const extractedText = job.ocrText || '';
  const matchedNodes = job.results?.map(m => m.kbEntryId).filter(Boolean).join(', ') || '';

  const prompt = `Based on the following educational content, generate a mixed quiz to test understanding.

Content: ${extractedText.substring(0, 2000)}

Related Knowledge Topics: ${matchedNodes}

IMPORTANT: Generate EXACTLY 5 questions in the following MIXED FORMAT:
- 2 Multiple Choice questions (4 options each, type: "multiple_choice")
- 1 Fill-in-the-blank question (provide answer in "options" array, type: "fill_in_blank")
- 1 True/False question (2 options: "True", "False", type: "true_false")
- 1 Matching question (use "items", "matches", "correctMatches" fields, type: "matching")

JSON format:
{
  "questions": [
    {
      "id": "q1",
      "type": "multiple_choice",
      "question": "Question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "explanation": "Brief explanation of why this is correct"
    },
    {
      "id": "q2",
      "type": "fill_in_blank",
      "question": "Fill in the blank: __________ is the answer",
      "options": ["The correct answer text"],
      "correctAnswer": 0,
      "explanation": "Explanation"
    },
    {
      "id": "q3",
      "type": "true_false",
      "question": "True or False: Statement here",
      "options": ["True", "False"],
      "correctAnswer": 0,
      "explanation": "Explanation"
    },
    {
      "id": "q4",
      "type": "matching",
      "question": "Match the items on the left to their correct answers on the right",
      "items": ["Item 1", "Item 2", "Item 3"],
      "matches": ["Match A", "Match B", "Match C"],
      "correctMatches": ["Match A", "Match B", "Match C"],
      "explanation": "Explanation"
    }
  ]
}

Requirements:
- Questions should test understanding of key concepts from the content
- Each question must include a "type" field with value: "multiple_choice", "fill_in_blank", "true_false", or "matching"
- Include brief explanations for learning
- Make questions challenging but fair
- Focus on the knowledge topics mentioned`;

  let quizData: { questions: QuizQuestion[] };
  let response = '';
  let parseFailed = false;

  try {
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        if (attempt === 0) {
          response = await callQuizAI(prompt);
        } else {
          // Strip markdown and retry
          const stripped = stripMarkdownFences(response);
          if (stripped !== response) {
            response = stripped;
            parseFailed = false;
          }
          try {
            JSON.parse(response);
            // If we got here with parseFailed=true, the stripped version worked
            if (parseFailed) break;
          } catch {
            // Still bad, retry with fresh call
            response = await callQuizAI(prompt + '\n\nIMPORTANT: Respond with ONLY valid JSON, no markdown fences, no additional text.');
            parseFailed = true;
          }
        }
        // Try to parse
        const jsonMatch = response.match(/```json\n?([\s\S]*?)\n?```/) || response.match(/\{[\s\S]*\}/);
        const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : response;
        JSON.parse(jsonStr); // Will throw if invalid
        break; // Success
      } catch (err) {
        if (attempt === MAX_RETRIES) {
          console.error('[QuizService] All parse retries failed');
          throw err;
        }
        console.warn(`[QuizService] Parse attempt ${attempt + 1} failed, retrying...`);
      }
    }

    const jsonMatch = response.match(/```json\n?([\s\S]*?)\n?```/) || response.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : response;
    quizData = JSON.parse(jsonStr);

    // Validate and fix the quiz data
    quizData = validateAndFixQuizData(quizData);

    const session: QuizSession = {
      id: `quiz_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      jobId,
      questions: quizData.questions.slice(0, 5),
      createdAt: new Date().toISOString()
    };

    await setQuizSession(session, userId);
    return session;
  } catch (error) {
    console.error('Error generating quiz:', error);
    const defaultSession: QuizSession = {
      id: `quiz_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      jobId,
      questions: getDefaultQuestions().questions,
      createdAt: new Date().toISOString()
    };
    await setQuizSession(defaultSession, userId);
    return defaultSession;
  }
}

/**
 * Generate a quiz from a knowledge topic/node
 * This creates test questions about the actual topic content
 */
export async function generateTopicQuiz(topicId: string, userId?: string): Promise<QuizSession> {
  let topicContent = '';
  let topicTitle = topicId;
  
  // First try Neo4j (primary source for knowledge graph)
  try {
    const neo4jNode = await getNodeById(topicId);
    if (neo4jNode) {
      topicTitle = neo4jNode.title;
      topicContent = `
Topic Name: ${neo4jNode.title}
Topic Description: ${neo4jNode.description}
Category: ${neo4jNode.category || 'General'}
Keywords: ${neo4jNode.keywords?.join(', ') || 'None'}
`;
    }
  } catch {
    // Neo4j might not be available, continue with fallback
  }
  
  // If not found in Neo4j, try local graph
  if (!topicContent) {
    try {
      const graph = await getKnowledgeGraph();
      const node = graph.nodes.find(n => n.id === topicId || n.name.toLowerCase() === topicId.toLowerCase());
      if (node) {
        topicTitle = node.name;
        topicContent = `
Topic Name: ${node.name}
Topic Domain: ${node.domain}
Prerequisites: ${node.prerequisites.join(', ') || 'None'}
Next Steps: ${node.nextSteps.join(', ') || 'None'}
`;
      }
    } catch {
      // Local graph might not be available, continue with fallback
    }
  }
  
  // If not found in local graph, try knowledge base entries
  if (!topicContent) {
    try {
      const kbEntry = await getEntryById(topicId);
      if (kbEntry) {
        topicTitle = kbEntry.title;
        topicContent = `
Title: ${kbEntry.title}
Description: ${kbEntry.description}
Category: ${kbEntry.category || 'General'}
Metadata: ${JSON.stringify(kbEntry.metadata || {})}
`;
      }
    } catch {
      // Knowledge base might not be available, continue with fallback
    }
  }
  
  // If no content from KB, try to get all entries and find a match
  if (!topicContent) {
    try {
      const { entries } = await getAllEntries();
      // Use first entry or generate generic content
      if (entries.length > 0) {
        const entry = entries[0];
        topicTitle = entry.title;
        topicContent = `
Title: ${entry.title}
Description: ${entry.description}
Category: ${entry.category || 'General'}
`;
      } else {
        topicContent = `Topic: ${topicId}`;
      }
    } catch {
      topicContent = `Topic: ${topicId}`;
    }
  }

  const prompt = `You are an expert math teacher creating a PRACTICE AND REVIEW quiz for students.
The purpose is to help students practice and review what they've learned about this topic.

TOPIC: ${topicTitle}
TOPIC CONTENT:
${topicContent}

IMPORTANT: Generate EXACTLY 5 questions in the following MIXED FORMAT:
- 2 Multiple Choice questions (4 options each)
- 1 Fill-in-the-blank question (provide answer)
- 1 True/False question (2 options: True, False)
- 1 Matching question (match items to correct answers)

JSON format:
{
  "questions": [
    {
      "id": "q1",
      "type": "multiple_choice",
      "question": "Specific question about ${topicTitle}?",
      "options": ["Answer A", "Answer B", "Answer C", "Answer D"],
      "correctAnswer": 0,
      "explanation": "Explanation of why this answer is correct"
    },
    {
      "id": "q2",
      "type": "multiple_choice",
      "question": "Another specific question about ${topicTitle}?",
      "options": ["Answer A", "Answer B", "Answer C", "Answer D"],
      "correctAnswer": 1,
      "explanation": "Explanation"
    },
    {
      "id": "q3",
      "type": "fill_in_blank",
      "question": "Fill in the blank: __________ is the answer to this question about ${topicTitle}",
      "options": ["The correct answer text"],
      "correctAnswer": 0,
      "explanation": "Explanation of the answer"
    },
    {
      "id": "q4",
      "type": "true_false",
      "question": "True or False: Statement about ${topicTitle} is correct",
      "options": ["True", "False"],
      "correctAnswer": 0,
      "explanation": "Explanation why it's true or false"
    },
    {
      "id": "q5",
      "type": "matching",
      "question": "Match the items on the left to their correct answers on the right",
      "items": ["Item 1", "Item 2", "Item 3"],
      "matches": ["Match A", "Match B", "Match C"],
      "correctMatches": ["Match A", "Match B", "Match C"],
      "explanation": "Explanation of the matches"
    }
  ]
}

Requirements:
- Each question must be SPECIFIC to the topic content above
- Questions should be like typical homework or exam practice questions
- NO generic options - all options must be plausible and related to the actual topic
- Include calculations or specific answers where applicable
- IMPORTANT: Use EXACT type names: "multiple_choice", "fill_in_blank", "true_false", "matching"`;

  let quizData: { questions: QuizQuestion[] };
  let response = '';
  let parseFailed = false;

  try {
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        if (attempt === 0) {
          response = await callQuizAI(prompt);
        } else {
          // Strip markdown and retry
          const stripped = stripMarkdownFences(response);
          if (stripped !== response) {
            response = stripped;
            parseFailed = false;
          }
          try {
            JSON.parse(response);
            // If we got here with parseFailed=true, the stripped version worked
            if (parseFailed) break;
          } catch {
            // Still bad, retry with fresh call
            response = await callQuizAI(prompt + '\n\nIMPORTANT: Respond with ONLY valid JSON, no markdown fences, no additional text.');
            parseFailed = true;
          }
        }
        // Try to parse
        const jsonMatch = response.match(/```json\n?([\s\S]*?)\n?```/) || response.match(/\{[\s\S]*\}/);
        const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : response;
        JSON.parse(jsonStr); // Will throw if invalid
        break; // Success
      } catch (err) {
        if (attempt === MAX_RETRIES) {
          console.error('[QuizService] All parse retries failed');
          throw err;
        }
        console.warn(`[QuizService] Parse attempt ${attempt + 1} failed, retrying...`);
      }
    }

    const jsonMatch = response.match(/```json\n?([\s\S]*?)\n?```/) || response.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : response;
    quizData = JSON.parse(jsonStr);

    // Validate and fix the quiz data
    quizData = validateAndFixQuizData(quizData);

    const session: QuizSession = {
      id: `quiz_topic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      jobId: topicId,
      questions: quizData.questions.slice(0, 5),
      createdAt: new Date().toISOString()
    };

    await setQuizSession(session, userId);
    return session;
  } catch (error) {
    console.error('Error generating topic quiz:', error);
    const defaultSession: QuizSession = {
      id: `quiz_topic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      jobId: topicId,
      questions: getTopicDefaultQuestions(topicTitle).questions,
      createdAt: new Date().toISOString()
    };
    await setQuizSession(defaultSession, userId);
    return defaultSession;
  }
}

/**
 * Default questions for a topic when AI fails
 * These are actual math practice questions based on common math topics
 */
function getTopicDefaultQuestions(topic: string): { questions: QuizQuestion[] } {
  // Generate topic-specific questions based on keywords in the topic name
  const topicLower = topic.toLowerCase();
  
  // For linear equations
  if (topicLower.includes('line') || topicLower.includes('linear') || topicLower.includes('方程')) {
    return {
      questions: [
        {
          id: 'q1',
          type: 'multiple_choice',
          question: `For the linear equation y = 2x + 3, what is the slope?`,
          options: ['2', '3', '-2', '1'],
          correctAnswer: 0,
          explanation: 'In y = mx + c, m is the slope. Here m = 2.'
        },
        {
          id: 'q2',
          type: 'multiple_choice',
          question: `What is the y-intercept of y = -4x + 7?`,
          options: ['7', '-4', '4', '-7'],
          correctAnswer: 0,
          explanation: 'In y = mx + c, c is the y-intercept. Here c = 7.'
        },
        {
          id: 'q3',
          type: 'fill_in_blank',
          question: `Fill in the blank: The line y = 2x + 3 crosses the y-axis at __________`,
          options: ['(0, 3)'],
          correctAnswer: 0,
          explanation: 'The y-intercept is where x=0, so y = 2(0) + 3 = 3'
        },
        {
          id: 'q4',
          type: 'true_false',
          question: `True or False: A vertical line has a defined slope.`,
          options: ['True', 'False'],
          correctAnswer: 1,
          explanation: 'Vertical lines have undefined slope.'
        },
        {
          id: 'q5',
          type: 'matching',
          question: `Match the linear equation form with its name:`,
          items: ['y = mx + b', 'Ax + By = C', 'y - y₁ = m(x - x₁)'],
          matches: ['Slope-intercept form', 'Standard form', 'Point-slope form'],
          correctMatches: ['Slope-intercept form', 'Standard form', 'Point-slope form'],
          explanation: 'These are three common forms of linear equations.'
        }
      ]
    };
  }
  
  // For algebra topics
  if (topicLower.includes('algebra') || topicLower.includes('代数')) {
    return {
      questions: [
        {
          id: 'q1',
          type: 'multiple_choice',
          question: `Solve for x: 2x + 5 = 13`,
          options: ['4', '9', '8', '6'],
          correctAnswer: 0,
          explanation: '2x = 13 - 5 = 8, so x = 4'
        },
        {
          id: 'q2',
          type: 'multiple_choice',
          question: `Simplify: 3(x + 2) - 2x`,
          options: ['x + 6', '5x + 2', 'x + 2', '5x + 6'],
          correctAnswer: 0,
          explanation: '3x + 6 - 2x = x + 6'
        },
        {
          id: 'q3',
          type: 'fill_in_blank',
          question: `Fill in the blank: If x = -2, the value of x² + 3x + 2 is __________`,
          options: ['0'],
          correctAnswer: 0,
          explanation: '(-2)² + 3(-2) + 2 = 4 - 6 + 2 = 0'
        },
        {
          id: 'q4',
          type: 'true_false',
          question: `True or False: x² - 9 can be factored as (x + 3)(x - 3).`,
          options: ['True', 'False'],
          correctAnswer: 0,
          explanation: 'This is the difference of squares formula.'
        },
        {
          id: 'q5',
          type: 'matching',
          question: `Match each expression with its factored form:`,
          items: ['x² - 4', 'x² - 1', 'x² - 25'],
          matches: ['(x+2)(x-2)', '(x+1)(x-1)', '(x+5)(x-5)'],
          correctMatches: ['(x+2)(x-2)', '(x+1)(x-1)', '(x+5)(x-5)'],
          explanation: 'All are differences of squares.'
        }
      ]
    };
  }
  
  // For geometry
  if (topicLower.includes('geometry') || topicLower.includes('几何')) {
    return {
      questions: [
        {
          id: 'q1',
          type: 'multiple_choice',
          question: `What is the sum of interior angles in a triangle?`,
          options: ['180°', '360°', '90°', '270°'],
          correctAnswer: 0,
          explanation: 'The sum of interior angles in any triangle is 180°.'
        },
        {
          id: 'q2',
          type: 'multiple_choice',
          question: `A circle has radius 5. What is its area? (Use π ≈ 3.14)`,
          options: ['78.5', '31.4', '15.7', '125'],
          correctAnswer: 0,
          explanation: 'Area = πr² = 3.14 × 25 = 78.5'
        },
        {
          id: 'q3',
          type: 'fill_in_blank',
          question: `Fill in the blank: A triangle with all three sides equal is called __________`,
          options: ['Equilateral'],
          correctAnswer: 0,
          explanation: 'Equilateral triangles have all three sides equal.'
        },
        {
          id: 'q4',
          type: 'true_false',
          question: `True or False: A right triangle can be isosceles.`,
          options: ['True', 'False'],
          correctAnswer: 0,
          explanation: 'Yes, a 45-45-90 triangle is both right and isosceles.'
        },
        {
          id: 'q5',
          type: 'matching',
          question: `Match the geometry term with its definition:`,
          items: ['Radius', 'Diameter', 'Circumference'],
          matches: ['Distance from center to edge', 'Distance across through center', 'Distance around the circle'],
          correctMatches: ['Distance from center to edge', 'Distance across through center', 'Distance around the circle'],
          explanation: 'These are basic circle properties.'
        }
      ]
    };
  }
  
  // For functions
  if (topicLower.includes('function') || topicLower.includes('函数')) {
    return {
      questions: [
        {
          id: 'q1',
          type: 'multiple_choice',
          question: `If f(x) = 2x + 1, what is f(3)?`,
          options: ['7', '6', '8', '5'],
          correctAnswer: 0,
          explanation: 'f(3) = 2(3) + 1 = 7'
        },
        {
          id: 'q2',
          type: 'multiple_choice',
          question: `What is the domain of f(x) = 1/x?`,
          options: ['All real numbers except 0', 'All positive numbers', 'All real numbers', 'All integers'],
          correctAnswer: 0,
          explanation: 'Cannot divide by zero, so x ≠ 0'
        },
        {
          id: 'q3',
          type: 'fill_in_blank',
          question: `Fill in the blank: The function f(x) = x² has a range of __________`,
          options: ['y ≥ 0'],
          correctAnswer: 0,
          explanation: 'Square of any real number is non-negative.'
        },
        {
          id: 'q4',
          type: 'true_false',
          question: `True or False: The function f(x) = 3x passes the vertical line test.`,
          options: ['True', 'False'],
          correctAnswer: 0,
          explanation: 'Every x maps to exactly one y, so it is a function.'
        },
        {
          id: 'q5',
          type: 'matching',
          question: `Match each function with its inverse:`,
          items: ['f(x) = x + 2', 'f(x) = 2x', 'f(x) = x² (x≥0)'],
          matches: ['f⁻¹(x) = x - 2', 'f⁻¹(x) = x/2', 'f⁻¹(x) = √x'],
          correctMatches: ['f⁻¹(x) = x - 2', 'f⁻¹(x) = x/2', 'f⁻¹(x) = √x'],
          explanation: 'Inverse functions reverse the operation.'
        }
      ]
    };
  }
  
  // Default fallback questions
  return {
    questions: [
      {
        id: 'q1',
        type: 'multiple_choice',
        question: `What is a key concept in "${topic}"?`,
        options: [
          'Understanding this concept is essential for mastery',
          'This topic has no practical use',
          'This topic is never tested',
          'This topic is only for advanced students'
        ],
        correctAnswer: 0,
        explanation: `Core concepts in ${topic} are fundamental to understanding.`
      },
      {
        id: 'q2',
        type: 'multiple_choice',
        question: `How should you practice "${topic}"?`,
        options: [
          'Solve problems regularly to build understanding',
          'Memorize without understanding',
          'Skip the practice exercises',
          'Only read about it'
        ],
        correctAnswer: 0,
        explanation: 'Active problem-solving is key to learning math.'
      },
      {
        id: 'q3',
        type: 'fill_in_blank',
        question: `Fill in the blank: To master "${topic}", you need __________`,
        options: ['Regular practice'],
        correctAnswer: 0,
        explanation: 'Foundation knowledge supports new learning.'
      },
      {
        id: 'q4',
        type: 'true_false',
        question: `True or False: "${topic}" connects to many other math topics.`,
        options: ['True', 'False'],
        correctAnswer: 0,
        explanation: 'Math topics build on each other progressively.'
      },
      {
        id: 'q5',
        type: 'matching',
        question: `Match the learning stage with its description:`,
        items: ['Basic', 'Intermediate', 'Advanced'],
        matches: ['Foundation concepts', 'Application problems', 'Complex reasoning'],
        correctMatches: ['Foundation concepts', 'Application problems', 'Complex reasoning'],
        explanation: 'Learning progresses through stages.'
      }
    ]
  };
}

export async function generateAdaptiveQuiz(weakNodeIds: string[], count: number, userId?: string): Promise<QuizSession> {
  const graph = await getKnowledgeGraph();
  const allNodes = graph.nodes;

  let targetNodes: InternalGraphNode[] = allNodes.filter(n => weakNodeIds.includes(n.id));

  if (targetNodes.length < count) {
    const otherNodes = allNodes.filter(n => !weakNodeIds.includes(n.id));
    const shuffled = otherNodes.sort(() => Math.random() - 0.5);
    const needed = count - targetNodes.length;
    targetNodes = [...targetNodes, ...shuffled.slice(0, needed)];
  }

  const targetedNodeIds = targetNodes.map(n => n.id);

  const targetNodesContext = targetNodes.map((n, i) => 
    `目标节点${i + 1}: ${n.name}\n  描述: ${n.description || '无详细描述'}\n  领域: ${n.domain}`
  ).join('\n\n');

  const prompt = `你是教育测验生成专家。根据以下薄弱知识节点，生成针对性测验题目。

需要测验的目标节点：
${targetNodesContext}

要求：生成 ${count} 道题目，每个节点对应 1 道题。题目类型应为以下之一：
- 单选题 (type: "multiple_choice")，4个选项
- 判断题 (type: "true_false")，2个选项："True", "False"
- 填空题 (type: "fill_in_blank")，答案放在 options 数组中

JSON格式：
{
  "questions": [
    {
      "id": "q1",
      "type": "multiple_choice",
      "question": "针对第一个目标节点的题目？",
      "options": ["选项A", "选项B", "选项C", "选项D"],
      "correctAnswer": 0,
      "explanation": "解释为什么此答案正确"
    },
    {
      "id": "q2",
      "type": "true_false",
      "question": "针对第二个目标节点的是非判断题？",
      "options": ["True", "False"],
      "correctAnswer": 0,
      "explanation": "解释"
    }
  ]
}

要求：
- 每道题必须针对对应节点的知识点
- 选项要有区分度，不要过于简单
- 必须使用精确的 type 值："multiple_choice", "fill_in_blank", "true_false"
- 只返回有效的 JSON，不要有 markdown 格式或其他文本`;

  let quizData: { questions: QuizQuestion[] };
  let response = '';
  let parseFailed = false;

  try {
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        if (attempt === 0) {
          response = await callQuizAI(prompt);
        } else {
          const stripped = stripMarkdownFences(response);
          if (stripped !== response) {
            response = stripped;
            parseFailed = false;
          }
          try {
            JSON.parse(response);
            if (parseFailed) break;
          } catch {
            response = await callQuizAI(prompt + '\n\n只返回有效JSON，不要markdown fences，不要其他文字。');
            parseFailed = true;
          }
        }
        const jsonMatch = response.match(/```json\n?([\s\S]*?)\n?```/) || response.match(/\{[\s\S]*\}/);
        const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : response;
        JSON.parse(jsonStr);
        break;
      } catch (err) {
        if (attempt === MAX_RETRIES) {
          console.error('[QuizService] Adaptive quiz parse retries failed');
          throw err;
        }
        console.warn(`[QuizService] Adaptive quiz parse attempt ${attempt + 1} failed, retrying...`);
      }
    }

    const jsonMatch = response.match(/```json\n?([\s\S]*?)\n?```/) || response.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : response;
    quizData = JSON.parse(jsonStr);
    quizData = validateAndFixQuizData(quizData);

    const session: QuizSession = {
      id: `quiz_adaptive_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      jobId: 'adaptive',
      questions: quizData.questions.slice(0, count),
      createdAt: new Date().toISOString(),
      targetedNodes: targetedNodeIds
    };

    await setQuizSession(session, userId);
    return session;
  } catch (error) {
    console.error('Error generating adaptive quiz:', error);
    const defaultSession: QuizSession = {
      id: `quiz_adaptive_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      jobId: 'adaptive',
      questions: getDefaultQuestions().questions.slice(0, count),
      createdAt: new Date().toISOString(),
      targetedNodes: targetedNodeIds
    };
    await setQuizSession(defaultSession, userId);
    return defaultSession;
  }
}

/**
 * Submit quiz answers and get score
 */
export async function submitQuiz(
  sessionId: string,
  answers: Array<{ questionId: string; selectedAnswer: number }>,
  userId?: string
): Promise<QuizResult> {
  const session = await getQuizSessionFromStorage(sessionId, userId);
  if (!session) {
    throw new Error('Quiz session not found');
  }

  let correctCount = 0;
  const gradedAnswers = answers.map(answer => {
    const question = session.questions.find(q => q.id === answer.questionId);
    const correct = question ? answer.selectedAnswer === question.correctAnswer : false;
    if (correct) correctCount++;
    return {
      questionId: answer.questionId,
      selectedAnswer: answer.selectedAnswer,
      correct
    };
  });

  const result: QuizResult = {
    sessionId,
    jobId: session.jobId,
    score: correctCount,
    totalQuestions: session.questions.length,
    answers: gradedAnswers,
    completedAt: new Date().toISOString()
  };

  await pushQuizResult(result, userId);
  return result;
}

export async function getQuizSession(sessionId: string, userId?: string): Promise<QuizSession | null> {
  return getQuizSessionFromStorage(sessionId, userId);
}

export async function getQuizResultsByJob(jobId: string, userId?: string): Promise<QuizResult[]> {
  const results = await getQuizResultsFromStorage(userId);
  return results.filter(r => r.jobId === jobId);
}

export async function getAllQuizResults(userId?: string): Promise<QuizResult[]> {
  return getQuizResultsFromStorage(userId);
}

/**
 * Get quiz statistics
 */
export async function getQuizStats(userId?: string): Promise<{
  totalQuizzes: number;
  averageScore: number;
  highestScore: number;
  recentScores: Array<{ date: string; score: number }>;
}> {
  const results = await getQuizResultsFromStorage(userId);
  if (results.length === 0) {
    return {
      totalQuizzes: 0,
      averageScore: 0,
      highestScore: 0,
      recentScores: []
    };
  }

  const scores = results.map(r => r.score);
  const recent = results
    .slice(-10)
    .map(r => ({
      date: r.completedAt,
      score: r.score
    }));

  return {
    totalQuizzes: results.length,
    averageScore: Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100,
    highestScore: Math.max(...scores),
    recentScores: recent
  };
}

/**
 * Default questions as fallback
 */
function getDefaultQuestions(): { questions: QuizQuestion[] } {
  return {
    questions: [
      {
        id: 'q1',
        type: 'multiple_choice',
        question: 'What is the primary purpose of this educational platform?',
        options: [
          'To track learning progress through knowledge graphs',
          'To provide entertainment content',
          'To sell educational products',
          'To replace traditional schools'
        ],
        correctAnswer: 0,
        explanation: 'The platform focuses on tracking learning progress through visual knowledge graphs and AI-powered recommendations.'
      },
      {
        id: 'q2',
        type: 'multiple_choice',
        question: 'Which algorithm is used for spaced repetition?',
        options: [
          'SM-2',
          'Binary Search',
          'Quick Sort',
          'Neural Networks'
        ],
        correctAnswer: 0,
        explanation: 'The SM-2 algorithm is a proven spaced repetition algorithm used to optimize learning intervals.'
      },
      {
        id: 'q3',
        type: 'fill_in_blank',
        question: 'Fill in the blank: The recommendation engine uses __________ to determine what to learn next.',
        options: ['Prerequisites'],
        correctAnswer: 0,
        explanation: 'The recommendation engine checks which nodes have all prerequisites met but are not yet learned.'
      },
      {
        id: 'q4',
        type: 'true_false',
        question: 'True or False: Neo4j is a graph database used to store knowledge relationships.',
        options: ['True', 'False'],
        correctAnswer: 0,
        explanation: 'Neo4j is a graph database that efficiently stores and queries knowledge node relationships.'
      },
      {
        id: 'q5',
        type: 'matching',
        question: 'Match each component with its function:',
        items: ['OCR', 'Knowledge Graph', 'Quiz Generator'],
        matches: ['Extract text from images', 'Visualize learning progress', 'Create practice questions'],
        correctMatches: ['Extract text from images', 'Visualize learning progress', 'Create practice questions'],
        explanation: 'Each component serves a specific purpose in the learning platform.'
      }
    ]
  };
}
