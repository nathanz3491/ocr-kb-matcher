/**
 * Shared TypeScript type definitions for OCR-KB-Matcher
 * Used by both frontend and backend
 */

/**
 * User model
 */
export interface User {
  id: string;
  email?: string;
  name?: string;
  createdAt?: string;
}

/**
 * Node type for graph nodes
 */
export type NodeType = 'concept' | 'entity' | 'process';

/**
 * Graph node for visualization
 */
export interface GraphNode {
  id: string;
  type: NodeType;
  position: { x: number; y: number };
  data: {
    label: string;
    description?: string;
    category?: string;
    confidence?: number;
    matchedText?: string;
    sources?: string[];  // Job IDs that contributed this node
  };
}

/**
 * Graph edge for visualization
 */
export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type?: 'default' | 'smoothstep' | 'straight';
  animated?: boolean;
  label?: string;
  data?: { relationship?: string };
}

/**
 * Graph data containing nodes and edges
 */
export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

/**
 * Processing status enum
 * Tracks the state of a job through the OCR and matching pipeline
 */
export enum ProcessingStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  OCR_COMPLETE = 'ocr_complete',
  MATCHING = 'matching',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

/**
 * Job type enum
 * Distinguishes between single-file and multi-question batch jobs
 */
export const JobType = {
  SINGLE: 'SINGLE',
  MULTIPLE: 'MULTIPLE',
  WRONG_SINGLE: 'WRONG_SINGLE',
  WRONG_MULTIPLE: 'WRONG_MULTIPLE'
} as const;
export type JobType = typeof JobType[keyof typeof JobType];

/**
 * Parsed question extracted from input
 */
export interface ParsedQuestion {
  id: string;
  text: string;
  index: number;
}

/**
 * Question match result - result of matching a single question against KB
 */
export interface QuestionMatchResult {
  questionId: string;
  questionText: string;
  matchedNodes: MatchResult[];
  status: 'pending' | 'matched' | 'failed';
  error?: string;
}

export interface WrongQuestionResult {
  questionId: string;
  questionIndex: number;
  questionText: string;
  explanation: string;
  practiceQuestions: {
    id: string;
    type: 'multiple_choice';
    question: string;
    options: string[];
    correctAnswer: number;
    explanation: string;
  }[];
  status: 'pending' | 'explained' | 'failed';
  error?: string;
  matchedNodes?: MatchResult[];
}

/**
 * Job interface
 * Represents a document processing job through the system
 */
export interface Job {
  /** Unique identifier for the job */
  id: string;
  /** User ID who owns this job (optional for backward compatibility) */
  userId?: string;
  /** Current processing status */
  status: ProcessingStatus;
  /** Current step within the pipeline */
  currentStep?: string;
  /** Original file name */
  fileName: string;
  /** File path for processing */
  filePath: string;
  /** OCR extracted text (available after OCR_COMPLETE) */
  ocrText?: string;
  /** OCR confidence score 0-1 (available after OCR_COMPLETE) */
  ocrConfidence?: number;
  /** Match results from AI analysis (available after COMPLETED) */
  results?: MatchResult[];
  /** Graph visualization data (available after COMPLETED) */
  graphData?: GraphData;
  /** Error message if status is FAILED */
  error?: string;
  /** Timestamp when job was created */
  createdAt: Date;
  /** Timestamp of last update */
  updatedAt: Date;
  /** Timestamp when job completed (success or failure) */
  completedAt?: Date;
  /** Type of job (single file or multi-question batch) */
  jobType?: JobType;
  /** Parsed questions for MULTIPLE job type */
  questions?: ParsedQuestion[];
  /** Per-question match results for MULTIPLE job type */
  questionResults?: QuestionMatchResult[];
  wrongResults?: WrongQuestionResult[];
  wrongQuestionIndices?: string;
}

/**
 * Knowledge Base Entry
 * Represents a single entry in the knowledge base for matching
 */
export interface KnowledgeBaseEntry {
  /** Unique identifier for the entry */
  id: string;
  /** Entry title */
  title: string;
  /** Entry description/content */
  description: string;
  /** Category for grouping entries */
  category: string;
  /** Optional metadata for extensibility */
  metadata?: Record<string, unknown>;
}

/**
 * Text span from OCR that matched a knowledge base entry
 */
export interface OCRTextSpan {
  /** Start position in OCR text */
  start: number;
  /** End position in OCR text */
  end: number;
  /** Text excerpt that matched */
  excerpt: string;
}

/**
 * Match Result from AI
 * Represents a match between OCR text and a knowledge base entry
 */
export interface MatchResult {
  /** Reference to the matched knowledge base entry ID */
  kbEntryId: string;
  /** Match confidence score 0-1 */
  confidence: number;
  /** Location of matched text in OCR output */
  ocrTextSpan: OCRTextSpan;
  /** AI reasoning for the match */
  reasoning: string;
  /** Node title for display */
  title?: string;
  /** Node category for coloring/grouping */
  category?: string;
  /** Node description */
  description?: string;
}

/**
 * Job creation request
 * Used when submitting a new job to the system
 */
export interface CreateJobRequest {
  /** Original file name */
  fileName: string;
  /** File path for processing */
  filePath: string;
}

/**
 * API Response wrapper
 * Standard response format for all API endpoints
 */
export interface ApiResponse<T> {
  /** Whether the request was successful */
  success: boolean;
  /** Response data (only present when success is true) */
  data?: T;
  /** Error message (only present when success is false) */
  error?: string;
}

// ===========================================
// FLASHCARD TYPES
// ===========================================

/**
 * Flashcard type - front/back card for learning
 */
export interface Flashcard {
  /** Unique flashcard ID */
  id: string;
  /** Node ID this flashcard belongs to */
  nodeId: string;
  /** Front of the card (question/term) */
  front: string;
  /** Back of the card (answer/definition) */
  back: string;
  /** Optional hint text */
  hint?: string;
}

/**
 * Flashcard set - collection of flashcards for a node
 */
export interface FlashcardSet {
  /** Node ID this set belongs to */
  nodeId: string;
  /** Node title for display */
  nodeTitle: string;
  /** Category for styling */
  category: string;
  /** Array of flashcards */
  cards: Flashcard[];
  /** When the set was generated */
  createdAt: string;
  /** When the set was last updated */
  updatedAt: string;
}

/**
 * Flashcard review session - tracks user progress
 */
export interface FlashcardReview {
  /** Flashcard ID */
  cardId: string;
  /** Node ID */
  nodeId: string;
  /** Quality of recall: 0-5 (spaced repetition scale) */
  quality: number;
  /** When the card was reviewed */
  reviewedAt: string;
  /** Next review date (calculated) */
  nextReview: string;
}

/**
 * User's flashcard progress for a node
 */
export interface FlashcardProgress {
  nodeId: string;
  totalCards: number;
  masteredCards: number;
  learningCards: number;
  newCards: number;
  lastReviewed: string;
  reviewStreak: number;
}

// ===========================================
// CHEAT SHEET & STUDY NOTES TYPES
// ===========================================

/**
 * Cheat Sheet - quick reference for a node
 */
export interface CheatSheet {
  nodeId: string;
  nodeTitle: string;
  category: string;
  content: string;
  keyPoints: string[];
  formulas?: string[];
  examples?: string[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Study Notes - detailed notes for a node
 */
export interface StudyNotes {
  nodeId: string;
  nodeTitle: string;
  category: string;
  notes: string;
  summary: string;
  relatedNodes: string[];
  createdAt: string;
  updatedAt: string;
}
