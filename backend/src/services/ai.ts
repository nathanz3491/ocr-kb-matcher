/**
 * AI Matching Service
 *
 * Service for matching OCR text to knowledge base entries using MiniMax AI API.
 * Implements retry logic with exponential backoff and structured JSON output.
 */

import OpenAI from 'openai';
import type {
  KnowledgeBaseEntry,
  MatchResult
} from '../../../shared/types';
import type {
  AIMatchingResult,
  MoonshotConfig,
  RetryConfig,
  AIServiceError,
  ParsedMatchingResponse,
  TokenUsage,
  MatchWithMetadata
} from '../types/ai';
import { AIServiceErrorCode } from '../types/ai';
import {
  SYSTEM_PROMPT,
  buildUserPrompt,
  OUTPUT_SCHEMA
} from '../prompts/matching';
import { moonshotBreaker } from '../lib/circuitBreaker';
import { logger } from '../lib/logger';

// Maximum KB entries per request to avoid token limits
const MAX_KB_ENTRIES_PER_REQUEST = 100;

// Default timeout: 120 seconds (Moonshot may take longer with many KB entries)
const DEFAULT_TIMEOUT = 120000;

// Default retry configuration
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  retryOnRateLimit: true
};

/**
 * Gets MiniMax configuration from environment variables
 *
 * @returns MoonshotConfig object
 * @throws Error if required env vars are missing
 */
export function getMoonshotConfig(): MoonshotConfig {
  const apiKey = process.env.MOONSHOT_API_KEY;
  const baseURL = process.env.MOONSHOT_BASE_URL || 'https://api.moonshot.cn/v1';
  const model = process.env.MOONSHOT_MODEL || 'moonshot-v1-8k';

  if (!apiKey) {
    throw createAIError(
      AIServiceErrorCode.CONFIG_ERROR,
      'MOONSHOT_API_KEY environment variable is required',
      undefined,
      false
    );
  }

  return {
    apiKey,
    baseURL,
    model,
    timeout: DEFAULT_TIMEOUT,
    maxRetries: DEFAULT_RETRY_CONFIG.maxRetries
  };
}

/**
 * Creates an OpenAI client configured for Moonshot API
 *
 * @param config - Moonshot configuration
 * @returns OpenAI client instance
 */
export function createOpenAIClient(config: MoonshotConfig): OpenAI {
  return new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseURL,
    timeout: config.timeout,
    maxRetries: 0
  });
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
 * Checks if an error is a rate limit error
 */
function isRateLimitError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('rate limit') ||
      message.includes('too many requests') ||
      message.includes('429')
    );
  }
  return false;
}

/**
 * Checks if an error is a timeout error
 */
function isTimeoutError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('timeout') ||
      message.includes('etimedout') ||
      message.includes('request timed out')
    );
  }
  return false;
}

/**
 * Calculates exponential backoff delay
 *
 * @param attempt - Current attempt number (0-indexed)
 * @param baseDelay - Base delay in milliseconds
 * @param maxDelay - Maximum delay in milliseconds
 * @returns Delay in milliseconds
 */
export function calculateBackoffDelay(
  attempt: number,
  baseDelay: number = DEFAULT_RETRY_CONFIG.baseDelay,
  maxDelay: number = DEFAULT_RETRY_CONFIG.maxDelay
): number {
  const exponentialDelay = baseDelay * Math.pow(2, attempt);
  // Add jitter to avoid thundering herd
  const jitter = Math.random() * 1000;
  return Math.min(exponentialDelay + jitter, maxDelay);
}

/**
 * Sleep utility for async delay
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Finds matches between OCR text and knowledge base entries
 *
 * @param ocrText - OCR extracted text to analyze
 * @param kbNodes - Knowledge base entries to match against
 * @returns Array of match results
 * @throws AIServiceError on failure
 */
export async function findMatches(
  ocrText: string,
  kbNodes: KnowledgeBaseEntry[]
): Promise<MatchResult[]> {
  // Limit KB nodes to avoid token limits
  const limitedNodes = kbNodes.slice(0, MAX_KB_ENTRIES_PER_REQUEST);

  if (kbNodes.length > MAX_KB_ENTRIES_PER_REQUEST) {
    logger.warn(
      { totalEntries: kbNodes.length, limitedTo: MAX_KB_ENTRIES_PER_REQUEST },
      'Knowledge base entries exceed limit, truncating',
    );
  }

  // Get configuration
  const config = getMoonshotConfig();

  // Perform matching with retry
  const result = await matchWithRetry(ocrText, limitedNodes, config);

  // Circuit breaker prevented matching — return empty
  if (result === null) {
    return [];
  }

  // Enrich matches with node information
  const enrichedMatches = result.matches.map(match => {
    const node = kbNodes.find(n => n.id === match.kbEntryId);
    return {
      ...match,
      title: node?.title || match.kbEntryId,
      category: node?.category || 'Unknown',
      description: node?.description
    };
  });

  return enrichedMatches;
}

/**
 * Creates the matching prompt for the AI
 *
 * @param ocrText - OCR extracted text
 * @param kbNodes - Knowledge base entries
 * @returns User prompt string
 */
export function createMatchingPrompt(
  ocrText: string,
  kbNodes: KnowledgeBaseEntry[]
): string {
  return buildUserPrompt(ocrText, kbNodes);
}

/**
 * Parses the AI matching response
 *
 * @param response - Raw response content from AI
 * @returns Parsed matching response
 */
export function parseMatchingResponse(
  response: string
): ParsedMatchingResponse {
  try {
    let jsonString = response.trim();

    const fenceMatch = jsonString.match(/```json\s*([\s\S]*?)```/);
    if (fenceMatch) {
      jsonString = fenceMatch[1].trim();
    }

    const parsed = JSON.parse(jsonString) as AIMatchingResult;

    if (!parsed.matches || !Array.isArray(parsed.matches)) {
      return {
        success: false,
        error: 'Invalid response: missing matches array'
      };
    }

    const results: MatchResult[] = parsed.matches
      .filter(match => match.confidence >= 0.55)
      .map(match => ({
        kbEntryId: match.kbEntryId,
        confidence: match.confidence,
        ocrTextSpan: {
          start: match.ocrTextSpan.start,
          end: match.ocrTextSpan.end,
          excerpt: match.ocrTextSpan.excerpt
        },
        reasoning: match.reasoning
      }));

    return {
      success: true,
      results
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown parsing error';
    return {
      success: false,
      error: `Failed to parse AI response: ${errorMessage}`
    };
  }
}

/**
 * Performs matching with retry logic and exponential backoff
 *
 * @param ocrText - OCR extracted text
 * @param kbNodes - Knowledge base entries
 * @param config - Moonshot configuration
 * @param retryConfig - Optional retry configuration
 * @returns Match results with metadata
 */
export async function matchWithRetry(
  ocrText: string,
  kbNodes: KnowledgeBaseEntry[],
  config?: MoonshotConfig,
  retryConfig?: Partial<RetryConfig>
): Promise<{
  matches: MatchResult[];
  metadata: {
    model: string;
    tokenUsage: TokenUsage;
    duration: number;
    retryCount: number;
  };
} | null> {
  const cfg = config || getMoonshotConfig();
  const retries = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
  const client = createOpenAIClient(cfg);

  const userPrompt = createMatchingPrompt(ocrText, kbNodes);

  let lastError: AIServiceError | null = null;
  let retryCount = 0;
  const startTime = Date.now();

  for (let attempt = 0; attempt <= retries.maxRetries; attempt++) {
    try {
      logger.info(
        { attempt: attempt + 1, maxAttempts: retries.maxRetries + 1, kbEntries: kbNodes.length },
        'AI matching attempt',
      );

      const completion = await moonshotBreaker.fire({
        client,
        model: cfg.model,
        max_tokens: 4096,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        temperature: 1,
        response_format: { type: 'json_object' },
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

      const parsed = parseMatchingResponse(responseContent);

      if (!parsed.success) {
        throw createAIError(
          AIServiceErrorCode.INVALID_RESPONSE,
          parsed.error || 'Failed to parse response',
          undefined,
          true
        );
      }

      const duration = Date.now() - startTime;

      const tokenUsage: TokenUsage = {
        promptTokens: completion.usage?.prompt_tokens || 0,
        completionTokens: completion.usage?.completion_tokens || 0,
        totalTokens: completion.usage?.total_tokens || 0
      };

      logger.info(
        { durationMs: duration, retryCount, totalTokens: tokenUsage.totalTokens },
        'AI matching completed',
      );

      return {
        matches: parsed.results || [],
        metadata: {
          model: cfg.model,
          tokenUsage,
          duration,
          retryCount
        }
      };

    } catch (rawError) {
      const error = rawError instanceof Error
        ? rawError
        : new Error(typeof rawError === 'object' && rawError !== null ? JSON.stringify(rawError) : String(rawError));

      if (moonshotBreaker.opened) {
        logger.warn(
          { attempt: attempt + 1 },
          'Moonshot API circuit breaker open — returning empty result',
        );
        return null;
      }

      const isRetryable = attempt < retries.maxRetries;

      let errorCode = AIServiceErrorCode.API_ERROR;
      let shouldRetry = isRetryable;

      if (isRateLimitError(error)) {
        errorCode = AIServiceErrorCode.RATE_LIMIT;
        shouldRetry = isRetryable && retries.retryOnRateLimit;
      } else if (isTimeoutError(error)) {
        errorCode = AIServiceErrorCode.TIMEOUT;
      } else if (error instanceof OpenAI.APIError) {
        if (error.status === 429) {
          errorCode = AIServiceErrorCode.RATE_LIMIT;
          shouldRetry = isRetryable && retries.retryOnRateLimit;
        } else if (error.status >= 500) {
          shouldRetry = isRetryable;
        } else if (error.status === 401 || error.status === 403) {
          shouldRetry = false;
        }
      }

      lastError = createAIError(
        errorCode,
        error instanceof Error ? error.message : 'Unknown error',
        error instanceof Error ? error : undefined,
        shouldRetry
      );

      if (!shouldRetry) {
        logger.error({ err: lastError.message }, 'Non-retryable AI error');
        break;
      }

      const delay = calculateBackoffDelay(
        attempt,
        retries.baseDelay,
        retries.maxDelay
      );

      logger.warn(
        { attempt: attempt + 1, errorCode, delayMs: Math.round(delay) },
        'AI attempt failed, retrying',
      );

      retryCount++;
      await sleep(delay);
    }
  }

  const finalError = lastError || createAIError(
    AIServiceErrorCode.API_ERROR,
    'All retry attempts failed',
    undefined,
    false
  );

  logger.error({ retryCount, err: finalError.message }, 'AI matching failed after all retries');
  throw finalError;
}

/**
 * Tests the AI service connection
 * Useful for health checks and initialization verification
 *
 * @returns True if connection is successful
 */
export async function testAIConnection(): Promise<boolean> {
  try {
    const config = getMoonshotConfig();
    const client = createOpenAIClient(config);

    await moonshotBreaker.fire({
      client,
      model: config.model,
      max_tokens: 10,
      messages: [{ role: 'user', content: 'Hello' }],
      temperature: 0,
    });

    return true;
  } catch (error) {
    logger.error({ err: error }, 'AI connection test failed');
    return false;
  }
}

/**
 * Gets AI service status and configuration info
 * Safe to call - doesn't throw errors
 *
 * @returns Status object with configuration details
 */
export function getAIStatus(): {
  configured: boolean;
  model?: string;
  baseURL?: string;
  error?: string;
} {
  try {
    const config = getMoonshotConfig();
    return {
      configured: true,
      model: config.model,
      baseURL: config.baseURL
    };
  } catch (error) {
    return {
      configured: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
