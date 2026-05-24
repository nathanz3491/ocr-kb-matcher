/**
 * AI-assisted Question Parsing Service
 *
 * Parses OCR text to extract individual questions using MiniMax AI API.
 * Returns structured ParsedQuestion[] matching the shared types.
 */

import OpenAI from 'openai';
import { getMoonshotConfig } from './ai';
import { ParsedQuestion } from '../../../shared/types';

const MAX_QUESTIONS = 50;

const QUESTION_PARSING_PROMPT = `你是一个数学教研专家。请从以下OCR识别的文本中提取所有题目。

要求：
1. 识别所有独立题目（选择题、判断题、填空题、解答题等）
2. 只返回纯JSON，不要任何其他文字
3. 题目按出现顺序编号，使用字符串键（"1", "2", "3" 等）
4. 每道题只保留题目主干，剔除答案选项（A/B/C/D 或 a/b/c/d）
5. 不返回答案、解析或任何附加说明
6. 最多返回${MAX_QUESTIONS}道题，超出部分请截断

输出格式（严格按此JSON格式，不要加任何注释）：
{
    "questions": {
        "1": { "content": "题目1的文本（不含选项）" },
        "2": { "content": "题目2的文本（不含选项）" }
    }
}

【OCR识别文本】
{{ocrText}}
`;

interface AIQuestionResponse {
  questions: {
    [key: string]: {
      content: string;
    };
  };
}

/**
 * Parses OCR text to extract individual questions using AI
 *
 * @param text - OCR extracted text containing questions
 * @returns Array of ParsedQuestion objects
 * @throws Error if JSON structure is invalid or parsing fails
 */
export async function parseQuestions(text: string): Promise<ParsedQuestion[]> {
  if (!text || text.trim().length === 0) {
    return [];
  }

  const config = getMoonshotConfig();
  const client = new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseURL,
    timeout: 120000,
  });

  const prompt = QUESTION_PARSING_PROMPT.replace('{{ocrText}}', text);

  const completion = await client.chat.completions.create({
    model: 'moonshot-v1-32k',
    max_tokens: 4096,
    temperature: 0.3,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: 'You are a mathematics education expert.' },
      { role: 'user', content: prompt }
    ],
  });
  const responseContent = completion.choices[0]?.message?.content || '';

  if (!responseContent) {
    throw new Error('Empty response from AI when parsing questions');
  }

  return parseAndValidateResponse(responseContent);
}

/**
 * Parses and validates the AI JSON response
 *
 * @param responseContent - Raw JSON string from AI
 * @returns Array of ParsedQuestion objects
 * @throws Error if structure is invalid
 */
function parseAndValidateResponse(responseContent: string): ParsedQuestion[] {
  let parsed: AIQuestionResponse;

  try {
    let jsonString = responseContent.trim();
    const codeBlockMatch = jsonString.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      jsonString = codeBlockMatch[1].trim();
    }

    parsed = JSON.parse(jsonString);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to parse AI response as JSON: ${msg}`);
  }

  if (!parsed.questions || typeof parsed.questions !== 'object') {
    throw new Error('Invalid JSON structure: missing or invalid "questions" object');
  }

  const questions: ParsedQuestion[] = [];
  const questionKeys = Object.keys(parsed.questions);

  if (questionKeys.length > MAX_QUESTIONS) {
    console.warn(
      `[Question Parser] ${questionKeys.length} questions found, ` +
      `limiting to ${MAX_QUESTIONS}`
    );
  }

  for (const key of questionKeys) {
    const index = parseInt(key, 10);
    if (isNaN(index)) {
      console.warn(`[Question Parser] Skipping non-numeric key: "${key}"`);
      continue;
    }

    if (questions.length >= MAX_QUESTIONS) {
      break;
    }

    const value = parsed.questions[key];

    if (!value || typeof value.content !== 'string') {
      console.warn(`[Question Parser] Skipping invalid question entry for key: "${key}"`);
      continue;
    }

    const cleanedContent = stripAnswerOptions(value.content);

    questions.push({
      id: key,
      text: cleanedContent,
      index
    });
  }

  return questions;
}

/**
 * Removes answer options (A/B/C/D or a/b/c/d patterns) from question text
 *
 * @param content - Raw question content
 * @returns Cleaned content without answer options
 */
function stripAnswerOptions(content: string): string {
  return content
    .replace(/^[A-Da-d][.、]\s*/gm, '')
    .replace(/\([A-Da-d]\)\s*/g, '')
    .replace(/^\d+[.、]\s*/gm, '');
}
