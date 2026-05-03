/**
 * AI Service Types
 *
 * Type definitions for Moonshot AI integration and OCR-KB matching
 */

import type { KnowledgeBaseEntry, MatchResult } from '../../../shared/types';

/**
 * Moonshot API Configuration
 */
export interface MoonshotConfig {
  /** Moonshot API key */
  apiKey: string;
  /** Base URL for Moonshot API (OpenAI-compatible) */
  baseURL: string;
  /** Model name to use */
  model: string;
  /** Request timeout in milliseconds */
  timeout: number;
  /** Maximum number of retries */
  maxRetries: number;
}

/**
 * AI Matching Result from Moonshot API
 * Structured output format for matching OCR text to KB entries
 */
export interface AIMatchingResult {
  /** Array of matched entries */
  matches: AIMatchEntry[];
  /** AI's overall analysis summary */
  analysis: string;
}

/**
 * Single AI match entry
 */
export interface AIMatchEntry {
  /** Knowledge base entry ID */
  kbEntryId: string;
  /** Match confidence score (0-1) */
  confidence: number;
  /** Text span in OCR that matched */
  ocrTextSpan: {
    /** Start position in OCR text */
    start: number;
    /** End position in OCR text */
    end: number;
    /** Text excerpt that matched */
    excerpt: string;
  };
  /** AI's reasoning for this match */
  reasoning: string;
}

/**
 * Matching Prompt Configuration
 */
export interface MatchingPrompt {
  /** System prompt for the AI */
  systemPrompt: string;
  /** User prompt template */
  userPromptTemplate: string;
  /** JSON schema for structured output */
  outputSchema: object;
}

/**
 * Retry configuration for API calls
 */
export interface RetryConfig {
  /** Maximum number of retries */
  maxRetries: number;
  /** Base delay in milliseconds (exponential backoff) */
  baseDelay: number;
  /** Maximum delay in milliseconds */
  maxDelay: number;
  /** Whether to retry on rate limit errors */
  retryOnRateLimit: boolean;
}

/**
 * Find matches input parameters
 */
export interface FindMatchesInput {
  /** OCR extracted text to analyze */
  ocrText: string;
  /** Knowledge base entries to match against */
  kbNodes: KnowledgeBaseEntry[];
  /** Optional retry configuration */
  retryConfig?: Partial<RetryConfig>;
}

/**
 * AI Service error types
 */
export enum AIServiceErrorCode {
  API_ERROR = 'API_ERROR',
  TIMEOUT = 'TIMEOUT',
  RATE_LIMIT = 'RATE_LIMIT',
  INVALID_RESPONSE = 'INVALID_RESPONSE',
  CONFIG_ERROR = 'CONFIG_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR'
}

/**
 * AI Service error
 */
export interface AIServiceError {
  /** Error code */
  code: AIServiceErrorCode;
  /** Error message */
  message: string;
  /** Original error if available */
  originalError?: Error;
  /** Whether the error is retryable */
  retryable: boolean;
}

/**
 * Parsed matching response from AI
 */
export interface ParsedMatchingResponse {
  /** Whether parsing was successful */
  success: boolean;
  /** Parsed match results */
  results?: MatchResult[];
  /** Error message if parsing failed */
  error?: string;
}

/**
 * Token usage information from API response
 */
export interface TokenUsage {
  /** Prompt tokens used */
  promptTokens: number;
  /** Completion tokens used */
  completionTokens: number;
  /** Total tokens used */
  totalTokens: number;
}

/**
 * Match with metadata from AI processing
 */
export interface MatchWithMetadata {
  /** The match result */
  match: MatchResult;
  /** Processing metadata */
  metadata: {
    /** Model used */
    model: string;
    /** Token usage */
    tokenUsage: TokenUsage;
    /** Processing duration in milliseconds */
    duration: number;
    /** Retry count */
    retryCount: number;
  };
}

/**
 * Graph node representing a concept, entity, or process in a knowledge graph
 */
export interface AIGraphNode {
  id: string;
  type: 'concept' | 'entity' | 'process';
  position: { x: number; y: number };
  data: {
    label: string;
    description?: string;
    category?: string;
    confidence?: number;
    matchedText?: string;
  };
}

/**
 * Graph edge representing relationships between nodes in a knowledge graph
 */
export interface AIGraphEdge {
  id: string;
  source: string;
  target: string;
  type?: 'default' | 'smoothstep' | 'straight';
  animated?: boolean;
  label?: string;
  data?: { relationship?: string };
}

/**
 * Complete graph data structure containing nodes and edges
 */
export interface AIGraphData {
  nodes: AIGraphNode[];
  edges: AIGraphEdge[];
}
