/**
 * Worker Types
 * Type definitions for job processing worker and pipeline
 */

import { Job, ProcessingStatus, MatchResult, KnowledgeBaseEntry, GraphData } from '../../../shared/types';
import { OCRResult } from './ocr';

/**
 * Processing step enum
 * Tracks the current step in the processing pipeline
 */
export enum ProcessingStep {
  CLAIM = 'claim',
  VALIDATE = 'validate',
  OCR = 'ocr',
  SAVE_OCR_CHECKPOINT = 'save_ocr_checkpoint',
  QUERY_KB = 'query_kb',
  MATCH = 'match',
  ANALYZE_KNOWLEDGE = 'analyze_knowledge',
  PARSE_QUESTIONS = 'parse_questions',
  BATCH_MATCH = 'batch_match',
  GENERATE_GRAPH = 'generate_graph',
  GENERATE_CARDS = 'generate_cards',
  GENERATE_CHEATSHEET = 'generate_cheatsheet',
  GENERATE_REVIEW = 'generate_review',
  EXTRACT_WRONG_QUESTIONS = 'extract_wrong_questions',
  GENERATE_EXPLANATION = 'generate_explanation',
  GENERATE_PRACTICE = 'generate_practice',
  SAVE_RESULTS = 'save_results',
  COMPLETE = 'complete',
}

/**
 * Job processor interface
 * Defines the contract for job processing implementations
 */
export interface IJobProcessor {
  /**
   * Process a single job through the entire pipeline
   * @param jobId - The job ID to process
   * @returns Promise that resolves when processing is complete
   * @throws Error if processing fails
   */
  processJob(jobId: string): Promise<void>;

  /**
   * Perform OCR on a job's image file
   * @param job - The job to process
   * @returns OCR result with extracted text
   */
  performOCR(job: Job): Promise<OCRResult>;

  /**
   * Perform AI matching between OCR text and knowledge base
   * @param job - The job being processed
   * @param ocrText - The extracted OCR text
   * @param kbNodes - Knowledge base nodes to match against
   * @returns Array of match results
   */
  performMatching(
    job: Job,
    ocrText: string,
    kbNodes: KnowledgeBaseEntry[]
  ): Promise<MatchResult[]>;

  /**
   * Update job with OCR results (checkpoint)
   * @param jobId - The job ID
   * @param ocrResult - The OCR result
   */
  updateJobWithOCRResult(jobId: string, ocrResult: OCRResult): Promise<void>;

  /**
   * Update job with final matching results
   * @param jobId - The job ID
   * @param ocrText - The extracted OCR text
   * @param results - The match results
   * @param graphData - Optional graph data to save
   */
  updateJobWithResults(
    jobId: string,
    ocrText: string,
    results: MatchResult[],
    graphData?: GraphData
  ): Promise<void>;

  /**
   * Handle job processing error
   * @param jobId - The job ID
   * @param error - The error that occurred
   * @param step - The processing step where the error occurred
   */
  handleJobError(
    jobId: string,
    error: Error,
    step: ProcessingStep
  ): Promise<void>;
}

/**
 * Processing context
 * Holds state and data throughout the processing pipeline
 */
export interface ProcessingContext {
  /** The job being processed */
  job: Job;
  /** Current processing step */
  currentStep: ProcessingStep;
  /** OCR result (available after OCR step) */
  ocrResult?: OCRResult;
  /** Knowledge base nodes (available after KB query) */
  kbNodes?: KnowledgeBaseEntry[];
  /** Match results (available after matching step) */
  matchResults?: MatchResult[];
  /** Processing start time */
  startTime: Date;
  /** Step timing information */
  stepTimings: Map<ProcessingStep, number>;
}

/**
 * Processing options
 * Configuration for job processing behavior
 */
export interface ProcessingOptions {
  /** Maximum time allowed for entire job processing (ms) */
  totalTimeoutMs: number;
  /** OCR-specific options */
  ocrTimeoutMs: number;
  /** AI matching-specific options */
  matchingTimeoutMs: number;
  /** Whether to save checkpoint after OCR */
  saveOCRCheckpoint: boolean;
  /** Maximum KB entries to fetch for matching */
  maxKBEntries: number;
}

/**
 * Default processing options
 */
export const DEFAULT_PROCESSING_OPTIONS: ProcessingOptions = {
  totalTimeoutMs: 10 * 60 * 1000, // 10 minutes
  ocrTimeoutMs: 5 * 60 * 1000,    // 5 minutes
  matchingTimeoutMs: 3 * 60 * 1000, // 3 minutes
  saveOCRCheckpoint: true,
  maxKBEntries: 100,
};

/**
 * Processing error
 * Custom error type for processing failures
 */
export class ProcessingError extends Error {
  constructor(
    message: string,
    public readonly step: ProcessingStep,
    public readonly jobId: string,
    public readonly retryable: boolean = false,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'ProcessingError';
    Object.setPrototypeOf(this, ProcessingError.prototype);
  }
}

/**
 * Step result interface
 * Result of a processing step execution
 */
export interface StepResult<T = unknown> {
  /** Whether the step succeeded */
  success: boolean;
  /** Step data if successful */
  data?: T;
  /** Error if step failed */
  error?: Error;
  /** Time taken to execute the step (ms) */
  durationMs: number;
}

/**
 * Job processor events
 */
export interface JobProcessorEvents {
  /** Emitted when processing starts */
  'processing:started': (jobId: string) => void;
  /** Emitted when a step completes */
  'step:completed': (jobId: string, step: ProcessingStep, durationMs: number) => void;
  /** Emitted when a step fails */
  'step:failed': (jobId: string, step: ProcessingStep, error: Error) => void;
  /** Emitted when OCR checkpoint is saved */
  'checkpoint:saved': (jobId: string, ocrText: string) => void;
  /** Emitted when processing completes successfully */
  'processing:completed': (jobId: string, results: MatchResult[]) => void;
  /** Emitted when processing fails */
  'processing:failed': (jobId: string, error: ProcessingError) => void;
  /** Emitted when job times out */
  'processing:timeout': (jobId: string, elapsedMs: number) => void;
}
