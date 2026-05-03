/**
 * Graph Generation Service
 *
 * Service for generating knowledge graphs from OCR text using MiniMax AI.
 * Converts OCR text into structured graph data with nodes and edges.
 */

import OpenAI from 'openai';
import {
  getMoonshotConfig,
  createOpenAIClient,
  calculateBackoffDelay
} from './ai';
import { GRAPH_GENERATION_PROMPT } from '../prompts/matching';
import { AIGraphData, AIServiceError, AIServiceErrorCode } from '../types/ai';

// Default retry configuration
const DEFAULT_RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 30000
};

/**
 * Sleep utility for async delay
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Creates an AI service error
 */
function createAIError(
  code: AIServiceErrorCode,
  message: string,
  originalError?: Error,
  retryable: boolean = true
): AIServiceError {
  return {
    code,
    message,
    originalError,
    retryable
  };
}

/**
 * Calls the AI with a prompt and returns the response content
 *
 * @param prompt - The prompt to send to the AI
 * @param options - Optional configuration for the AI call
 * @returns The response content from the AI
 * @throws AIServiceError on failure
 */
export async function callAI(
  prompt: string,
  options: {
    temperature?: number;
    responseFormat?: { type: 'json_object' | 'text' };
  } = {}
): Promise<string> {
  const config = getMoonshotConfig();
  const client = createOpenAIClient(config);

  const { temperature = 0.3, responseFormat } = options;

  const completion = await client.chat.completions.create({
    model: config.model,
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
    temperature,
    ...(responseFormat && { response_format: responseFormat }),
  });
  const responseContent = completion.choices[0]?.message?.content || '';

  if (!responseContent) {
    throw createAIError(
      AIServiceErrorCode.INVALID_RESPONSE,
      'Empty response from AI',
      undefined,
      true
    );
  }

  return responseContent;
}

/**
 * Generates a knowledge graph from OCR text
 *
 * @param ocrText - OCR extracted text to analyze
 * @returns Graph data with nodes and edges
 * @throws AIServiceError on failure
 */
export async function generateGraphFromText(
  ocrText: string
): Promise<AIGraphData> {
  const prompt = `${GRAPH_GENERATION_PROMPT}\n\nOCR Text:\n${ocrText}`;

  const response = await callAI(prompt, {
    temperature: 0.3,
    responseFormat: { type: 'json_object' }
  });

  const graphData: AIGraphData = JSON.parse(response);
  return graphData;
}

/**
 * Generates a knowledge graph from OCR text with retry logic
 *
 * @param ocrText - OCR extracted text to analyze
 * @param retryConfig - Optional retry configuration
 * @returns Graph data with nodes and edges
 * @throws AIServiceError on failure
 */
export async function generateGraphFromTextWithRetry(
  ocrText: string,
  retryConfig?: Partial<typeof DEFAULT_RETRY_CONFIG>
): Promise<AIGraphData> {
  const retries = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
  let lastError: AIServiceError | null = null;
  let retryCount = 0;

  for (let attempt = 0; attempt <= retries.maxRetries; attempt++) {
    try {
      console.log(
        `[GraphGeneration] Attempt ${attempt + 1}/${retries.maxRetries + 1}`
      );

      const graphData = await generateGraphFromText(ocrText);

      console.log(
        `[GraphGeneration] Successfully generated graph with ${graphData.nodes.length} nodes and ${graphData.edges.length} edges (retries: ${retryCount})`
      );

      return graphData;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const isRetryable = attempt < retries.maxRetries;

      lastError = createAIError(
        AIServiceErrorCode.API_ERROR,
        errorMessage,
        error instanceof Error ? error : undefined,
        isRetryable
      );

      if (!isRetryable) {
        console.error(`[GraphGeneration] Non-retryable error: ${lastError.message}`);
        break;
      }

      const delay = calculateBackoffDelay(
        attempt,
        retries.baseDelay,
        retries.maxDelay
      );

      console.warn(
        `[GraphGeneration] Attempt ${attempt + 1} failed, retrying in ${Math.round(delay)}ms...`
      );

      retryCount++;
      await sleep(delay);
    }
  }

  // All retries exhausted
  const finalError = lastError || createAIError(
    AIServiceErrorCode.API_ERROR,
    'All retry attempts failed',
    undefined,
    false
  );

  console.error(`[GraphGeneration] Graph generation failed after ${retryCount} retries: ${finalError.message}`);
  throw finalError;
}
