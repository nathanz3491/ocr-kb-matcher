import { getKnowledgeGraph, InternalGraphNode } from './knowledgeGraphStorage';

interface ExtractedQuestion {
  questionIndex: number;
  questionText: string;
}

interface PracticeQuestion {
  id: string;
  type: 'multiple_choice';
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

export async function extractWrongQuestions(
  ocrText: string,
  indices: string[]
): Promise<ExtractedQuestion[]> {
  const indicesList = indices.join(', ');
  const prompt = `Given the following educational document containing numbered questions:

${ocrText}

Extract ONLY the questions at the following indices: ${indicesList}

For each index, return the question text exactly as it appears. If a question index is not found in the document, still return it with the text "Question not found at this index".

Return a JSON object with this exact structure:
{
  "questions": [
    {"index": 1, "text": "The full question text here..."},
    {"index": 3, "text": "The full question text here..."}
  ]
}`;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await callMiniMaxAI(prompt);
      const parsed = JSON.parse(response);
      return parsed.questions.map((q: { index: number; text: string }) => ({
        questionIndex: q.index,
        questionText: q.text,
      }));
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (attempt === 0) {
        console.warn(`[extractWrongQuestions] attempt 1 failed: ${msg}. Retrying...`);
      } else {
        return [{ questionIndex: 1, questionText: ocrText }];
      }
    }
  }
  return [{ questionIndex: 1, questionText: ocrText }];
}

export async function generateExplanation(
  questionText: string,
  kbContext: string
): Promise<string> {
  const model = 'kimi-k2.5';
  const callKimi = async (prompt: string): Promise<string> => {
    const apiKey = process.env.MOONSHOT_API_KEY || process.env.AI_API_KEY;
    if (!apiKey) throw new Error('MOONSHOT_API_KEY not set');
    const response = await fetch('https://api.moonshot.cn/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: 'You are a general education expert. Always respond with valid JSON. IMPORTANT: All text fields — especially "explanation" and all question fields — must use strict markdown formatting: **bold**, *italic*, `code`, line breaks, and |highlighted text| (wrap key terms, concepts, and important phrases in pipe characters to highlight them visually — these will be rendered as a yellow highlighter effect in the UI). This content will be rendered as markdown in the UI.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 4096,
      }),
    });
    if (!response.ok) throw new Error(`AI API error: ${response.status}`);
    const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    return data.choices?.[0]?.message?.content || '';
  };

  const prompt = `The following question was answered incorrectly:

${questionText}

${kbContext ? `Relevant knowledge base context:\n${kbContext}\n` : ''}
Provide a clear explanation of why the answer to this question might be wrong. Cover:
1. What the likely correct answer or concept is
2. Why the common misconception or error occurs
3. The underlying principle that should be understood

Return a JSON object with this exact structure (no markdown):
{
  "explanation": "Your detailed explanation here..."
}`;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await callKimi(prompt);
      const parsed = JSON.parse(response);
      return parsed.explanation;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (attempt === 0) {
        console.warn(`[generateExplanation] attempt 1 failed: ${msg}. Retrying...`);
      } else {
        return `Explanation: ${questionText} relates to the concept covered in the provided knowledge base context. ${kbContext ? 'Refer to the knowledge base for detailed information.' : 'Review the relevant material to understand the underlying principle.'}`;
      }
    }
  }
  return 'Explanation generation failed. Please try again.';
}

export async function generatePracticeQuestions(
  questionText: string,
  count: number
): Promise<PracticeQuestion[]> {
  const prompt = `Generate ${count} practice questions similar to the following question:

${questionText}

Each practice question should:
- Test the same underlying concept as the original question
- Be at the same difficulty level
- Have exactly 4 multiple choice options (A, B, C, D) with one clearly correct answer
- Have a brief explanation for why the correct answer is right

Return ONLY valid JSON with this exact structure (no markdown, no commentary):
{
  "questions": [
    {
      "id": "q1",
      "type": "multiple_choice",
      "question": "The practice question text...",
      "options": ["Option A text", "Option B text", "Option C text", "Option D text"],
      "correctAnswer": 0,
      "explanation": "Why option A is correct..."
    }
  ]
}`;

  const fallbackPrompt = `Given this question: "${questionText}"

Generate ${count} simple multiple choice practice questions. Each must be valid JSON with fields: id, type="multiple_choice", question, options=[4 strings], correctAnswer=0-3, explanation.

Output only valid JSON like: {"questions":[{"id":"q1","type":"multiple_choice","question":"...","options":["A","B","C","D"],"correctAnswer":0,"explanation":"..."}]}`;

  async function tryGenerate(p: string): Promise<string> {
    const raw = await callMiniMaxAI(p);
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.questions) || parsed.questions.length === 0) {
      throw new Error('Invalid response: no questions array');
    }
    return raw;
  }

  let lastError = '';
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const raw = await tryGenerate(attempt === 0 ? prompt : fallbackPrompt);
      const parsed = JSON.parse(raw);
      return parsed.questions.map((q: { id?: string; type?: string; question: string; options: string[]; correctAnswer: number; explanation: string }, idx: number) => ({
        id: q.id || `practice-${Date.now()}-${idx}`,
        type: 'multiple_choice' as const,
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
      }));
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
  }
  console.warn(`[generatePracticeQuestions] All attempts failed: ${lastError}. Returning empty array.`);
  return [];
}

function stripMarkdown(text: string): string {
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^```json\s*/i, '');
  cleaned = cleaned.replace(/^```\s*/i, '');
  cleaned = cleaned.replace(/\s*```$/i, '');
  return cleaned.trim();
}

function extractJSON(text: string): string {
  const stripped = stripMarkdown(text);
  try {
    JSON.parse(stripped);
    return stripped;
  } catch {
    const match = stripped.match(/\{[\s\S]*\}/);
    if (match) {
      const candidate = match[0];
      try {
        JSON.parse(candidate);
        return candidate;
      } catch {
        throw new Error('Response is not valid JSON');
      }
    }
    throw new Error('Response is not valid JSON');
  }
}

async function callMiniMaxAI(prompt: string): Promise<string> {
  const apiKey = process.env.MOONSHOT_API_KEY || process.env.AI_API_KEY;
  if (!apiKey) {
    throw new Error('MOONSHOT_API_KEY environment variable is not set');
  }

  const response = await fetch('https://api.moonshot.cn/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.MOONSHOT_MODEL || 'kimi-k2-0711-preview',
      messages: [
        { role: 'system', content: 'You are an expert educational AI assistant. Always respond with valid JSON. IMPORTANT: All text fields — especially "explanation" and all question fields — must use strict markdown formatting: **bold**, *italic*, `code`, line breaks. This content will be rendered as markdown in the UI.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    throw new Error(`AI API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  return data.choices?.[0]?.message?.content || '';
}

export async function getKBContext(userId?: string): Promise<string> {
  try {
    const graph = await getKnowledgeGraph(userId);
    if (!graph || !graph.nodes || graph.nodes.length === 0) {
      return '';
    }
    const nodeSummaries = graph.nodes.slice(0, 20).map((node: InternalGraphNode) => {
      return `- ${node.name || 'Unknown'}: ${node.description || 'No description'}`;
    });
    return nodeSummaries.join('\n');
  } catch {
    return '';
  }
}
