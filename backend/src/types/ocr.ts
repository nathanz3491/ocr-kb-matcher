/**
 * OCR Types
 * 
 * TypeScript interfaces and types for OCR (Optical Character Recognition) functionality.
 */

/**
 * Represents a block of text with position information
 */
export interface TextBlock {
  /** The extracted text content */
  text: string;
  /** Bounding box coordinates */
  bbox: {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  };
  /** Confidence score for this block (0-100) */
  confidence: number;
}

/**
 * Result of OCR text extraction
 */
export interface OCRResult {
  /** The extracted text content */
  text: string;
  /** Overall confidence score (0-100) */
  confidence: number;
  /** Individual text blocks with positions (optional) */
  blocks?: TextBlock[];
  /** Processing time in milliseconds */
  processingTime?: number;
  /** Language used for recognition */
  language: string;
}

/**
 * Options for OCR processing
 */
export interface OCROptions {
  /** Language code (e.g., 'eng', 'chi_sim') - defaults to 'eng' */
  language?: string;
  /** Timeout in milliseconds - defaults to 60000 (60 seconds) */
  timeout?: number;
  /** Enable image preprocessing - defaults to true */
  preprocessing?: boolean;
  /** Maximum image dimension in pixels - defaults to 4000 */
  maxDimension?: number;
  /** Return text block positions - defaults to false */
  includeBlocks?: boolean;
}

/**
 * OCR service error codes
 */
export type OCRErrorCode =
  | 'FILE_NOT_FOUND'
  | 'INVALID_IMAGE'
  | 'TIMEOUT'
  | 'PROCESSING_ERROR'
  | 'WORKER_ERROR';

/**
 * Custom error class for OCR operations
 */
export class OCRError extends Error {
  constructor(
    message: string,
    public code: OCRErrorCode,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'OCRError';
    Object.setPrototypeOf(this, OCRError.prototype);
  }
}

/**
 * Image validation result
 */
export interface ImageValidationResult {
  /** Whether the image is valid */
  valid: boolean;
  /** Error message if invalid */
  error?: string;
  /** Image dimensions if valid */
  dimensions?: {
    width: number;
    height: number;
  };
  /** Image format if valid */
  format?: string;
}

/**
 * Preprocessing options
 */
export interface PreprocessingOptions {
  /** Maximum dimension in pixels */
  maxDimension: number;
  /** Output quality (0-100) for lossy formats */
  quality?: number;
  /** Convert to grayscale */
  grayscale?: boolean;
}

/**
 * Default OCR options
 */
export const DEFAULT_OCR_OPTIONS: Required<OCROptions> = {
  language: 'eng',
  timeout: 60000,
  preprocessing: true,
  maxDimension: 4000,
  includeBlocks: false,
};

/**
 * Supported image MIME types
 */
export const SUPPORTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/bmp',
  'image/gif',
  'image/webp',
  'image/tiff',
] as const;

export type SupportedImageType = typeof SUPPORTED_IMAGE_TYPES[number];
