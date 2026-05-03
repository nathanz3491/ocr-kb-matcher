/**
 * Batch Matching Service
 *
 * Matches multiple parsed questions against the knowledge graph using a single AI call.
 * Validates all returned nodeIds against the knowledge graph and handles partial failures.
 * Powered by MiniMax AI.
 */

import OpenAI from 'openai';
import { getMoonshotConfig } from './ai';
import { ParsedQuestion, QuestionMatchResult, MatchResult } from '../../../shared/types';
import { getKnowledgeGraph } from './knowledgeGraphStorage';

const BATCH_MATCHING_PROMPT = `你是一个资深的数学教研专家。请阅读以下【数学知识图谱体系】，并判断每个【测试题目】主要考察了哪些知识点。

【数学知识图谱体系】
{{knowledgeTree}}

【测试题目列表】
{{questions}}

请为每个题目识别出对应的知识点，并返回严格JSON格式：
{
  "results": [
    {
      "questionId": "1",
      "questionText": "What is the Pythagorean theorem?",
      "matchedNodes": [
        {
          "nodeId": "EA-CH-004",
          "confidence": 0.95,
          "reasoning": "Direct mention of theorem"
        }
      ]
    }
  ]
}

注意：
1. 只返回JSON，不要其他文字
2. nodeId 必须是知识图谱中存在的ID
3. confidence 是 0-1 之间的置信度
4. reasoning 解释为什么匹配这个知识点
5. 每个题目必须出现在results数组中，即使没有匹配到任何知识点`;

interface AIMatchedNode {
  nodeId: string;
  confidence: number;
  reasoning: string;
}

interface AIQuestionResult {
  questionId: string;
  questionText: string;
  matchedNodes: AIMatchedNode[];
}

interface AIBatchResponse {
  results: AIQuestionResult[];
}

async function getValidNodeIds(userId?: string): Promise<Set<string>> {
  try {
    const graph = await getKnowledgeGraph(userId);
    return new Set(graph.nodes.map(n => n.id));
  } catch (error) {
    console.error('[Batch Matching] Failed to load knowledge graph:', error);
    return new Set();
  }
}

async function validateBatchResponse(
  responseContent: string,
  validNodeIds: Set<string>
): Promise<AIBatchResponse> {
  try {
    const result: AIBatchResponse = JSON.parse(responseContent);

    const allNodes = result.results.flatMap(r => r.matchedNodes);
    const invalidNodes = allNodes.filter(node => !validNodeIds.has(node.nodeId));

    if (invalidNodes.length === 0) {
      for (const qResult of result.results) {
        qResult.matchedNodes = qResult.matchedNodes.filter(node => node.confidence >= 0.55);
      }
      return result;
    }

    console.warn(`[Batch Matching] Invalid node IDs: ${invalidNodes.map(n => n.nodeId).join(', ')}`);

    for (const qResult of result.results) {
      qResult.matchedNodes = qResult.matchedNodes.filter(
        node => validNodeIds.has(node.nodeId) && node.confidence >= 0.55
      );
    }

    return result;
  } catch (error) {
    console.error('[Batch Matching] Failed to validate response:', error);
    return { results: [] };
  }
}

function formatQuestions(questions: ParsedQuestion[]): string {
  return questions
    .map(q => `${q.index + 1}. [ID: ${q.id}] ${q.text}`)
    .join('\n');
}

function toMatchResult(aiNode: AIMatchedNode, questionText: string): MatchResult {
  return {
    kbEntryId: aiNode.nodeId,
    confidence: aiNode.confidence,
    ocrTextSpan: {
      start: 0,
      end: 0,
      excerpt: questionText
    },
    reasoning: aiNode.reasoning
  };
}

/**
 * Batch match multiple questions against the knowledge graph using a SINGLE AI call.
 */
export async function batchMatchQuestions(
  questions: ParsedQuestion[],
  knowledgeContext: string,
  userId?: string,
  client?: OpenAI
): Promise<QuestionMatchResult[]> {
  if (questions.length === 0) {
    return [];
  }

  const validNodeIds = await getValidNodeIds(userId);

  if (validNodeIds.size === 0) {
    console.error('[Batch Matching] No valid node IDs - cannot match');
    return questions.map(q => ({
      questionId: q.id,
      questionText: q.text,
      matchedNodes: [],
      status: 'failed' as const,
      error: 'No valid node IDs in knowledge graph'
    }));
  }

  const questionsText = formatQuestions(questions);
  const prompt = BATCH_MATCHING_PROMPT
    .replace('{{knowledgeTree}}', knowledgeContext)
    .replace('{{questions}}', questionsText);

  const config = getMoonshotConfig();
  const aiClient = client || new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseURL,
    timeout: 180000
  });

  try {
    const completion = await aiClient.chat.completions.create({
      model: config.model,
      max_tokens: 4096,
      messages: [
        { role: 'system', content: 'You are a mathematics education expert.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });
    const responseContent = completion.choices[0]?.message?.content || '';

    if (!responseContent) {
      console.error('[Batch Matching] Empty response from AI');
      return questions.map(q => ({
        questionId: q.id,
        questionText: q.text,
        matchedNodes: [],
        status: 'failed' as const,
        error: 'Empty response from AI'
      }));
    }

    const validated = await validateBatchResponse(responseContent, validNodeIds);

    const resultMap = new Map<string, AIQuestionResult>();
    for (const r of validated.results) {
      resultMap.set(r.questionId, r);
    }

    return questions.map(q => {
      const aiResult = resultMap.get(q.id);

      if (!aiResult) {
        return {
          questionId: q.id,
          questionText: q.text,
          matchedNodes: [],
          status: 'failed' as const,
          error: 'Question not found in AI response'
        } as QuestionMatchResult;
      }

      const matchedNodes: MatchResult[] = aiResult.matchedNodes.map(
        node => toMatchResult(node, q.text)
      );

      return {
        questionId: q.id,
        questionText: q.text,
        matchedNodes,
        status: matchedNodes.length > 0 ? 'matched' : 'failed'
      } as QuestionMatchResult;
    });

  } catch (error) {
    console.error('[Batch Matching] AI call failed:', error);
    return questions.map(q => ({
      questionId: q.id,
      questionText: q.text,
      matchedNodes: [],
      status: 'failed' as const,
      error: error instanceof Error ? error.message : 'Unknown error'
    }));
  }
}
