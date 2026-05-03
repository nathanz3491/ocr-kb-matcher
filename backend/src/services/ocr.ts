/**
 * OCR Service
 * 
 * Provides text extraction from images using Tesseract.js.
 * Features:
 * - Image preprocessing (resize large images)
 * - Timeout handling
 * - Confidence scoring
 * - Temporary file cleanup
 */

import { createWorker, RecognizeResult, Worker } from 'tesseract.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { promisify } from 'util';
import { exec } from 'child_process';
import {
  OCRResult,
  OCROptions,
  OCRError,
  OCRErrorCode,
  ImageValidationResult,
  TextBlock,
  DEFAULT_OCR_OPTIONS,
  SUPPORTED_IMAGE_TYPES,
} from '../types/ocr';

// Check if ImageMagick's convert command is available
const execAsync = promisify(exec);

/**
 * Check if ImageMagick is installed
 */
async function hasImageMagick(): Promise<boolean> {
  try {
    await execAsync('magick --version');
    return true;
  } catch {
    try {
      await execAsync('convert --version');
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Validate an image file
 * @param imagePath Path to the image file
 * @returns Validation result
 */
export async function validateImage(imagePath: string): Promise<ImageValidationResult> {
  try {
    // Check if file exists
    const stats = await fs.stat(imagePath);
    if (!stats.isFile()) {
      return { valid: false, error: 'Path is not a file' };
    }

    // Check file size (max 100MB)
    const maxSize = 100 * 1024 * 1024;
    if (stats.size > maxSize) {
      return { valid: false, error: 'File too large (max 100MB)' };
    }

    // Check if file is empty
    if (stats.size === 0) {
      return { valid: false, error: 'File is empty' };
    }

    // Check file signature (magic bytes)
    const buffer = await fs.readFile(imagePath, { encoding: null, flag: 'r' });
    const signature = buffer.slice(0, 8).toString('hex');

    // JPEG: FF D8 FF
    // PNG: 89 50 4E 47
    // GIF: 47 49 46 38
    // BMP: 42 4D
    // WebP: 52 49 46 46 ... 57 45 42 50
    // TIFF: 49 49 2A 00 or 4D 4D 00 2A
    const isJPEG = signature.startsWith('ffd8ff');
    const isPNG = signature.startsWith('89504e47');
    const isGIF = signature.startsWith('47494638');
    const isBMP = signature.startsWith('424d');
    const isWebP = signature.startsWith('52494646') && buffer.slice(8, 12).toString('hex') === '57454250';
    const isTIFF = signature.startsWith('49492a00') || signature.startsWith('4d4d002a');

    if (!isJPEG && !isPNG && !isGIF && !isBMP && !isWebP && !isTIFF) {
      return { valid: false, error: 'Invalid image format' };
    }

    // Get dimensions using ImageMagick if available
    if (await hasImageMagick()) {
      try {
        const { stdout } = await execAsync(
          `magick identify -format "%w %h" "${imagePath}" 2>/dev/null || identify -format "%w %h" "${imagePath}"`
        );
        const [width, height] = stdout.trim().split(' ').map(Number);
        return {
          valid: true,
          dimensions: { width, height },
          format: path.extname(imagePath).toLowerCase().replace('.', '') || 'unknown',
        };
      } catch {
        // If identify fails, still consider valid if signature matches
      }
    }

    return {
      valid: true,
      format: path.extname(imagePath).toLowerCase().replace('.', '') || 'unknown',
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return { valid: false, error: 'File not found' };
    }
    return { valid: false, error: `Validation error: ${(error as Error).message}` };
  }
}

/**
 * Preprocess an image (resize if too large)
 * @param imagePath Path to the image file
 * @param maxDimension Maximum dimension in pixels (default 4000)
 * @returns Path to the preprocessed image (may be same as input)
 */
export async function preprocessImage(
  imagePath: string,
  maxDimension: number = 4000
): Promise<string> {
  // Validate image first
  const validation = await validateImage(imagePath);
  if (!validation.valid) {
    throw new OCRError(
      `Image validation failed: ${validation.error}`,
      'INVALID_IMAGE'
    );
  }

  // If no dimensions available, return original
  if (!validation.dimensions) {
    return imagePath;
  }

  const { width, height } = validation.dimensions;
  const maxDim = Math.max(width, height);

  // If image is within limits, return original
  if (maxDim <= maxDimension) {
    return imagePath;
  }

  // Check if ImageMagick is available
  if (!(await hasImageMagick())) {
    console.warn('ImageMagick not available, skipping preprocessing');
    return imagePath;
  }

  // Calculate new dimensions while maintaining aspect ratio
  const ratio = maxDimension / maxDim;
  const newWidth = Math.round(width * ratio);
  const newHeight = Math.round(height * ratio);

  // Create temporary file for resized image
  const tempDir = os.tmpdir();
  const ext = path.extname(imagePath);
  const tempFile = path.join(tempDir, `ocr-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);

  try {
    // Resize image using ImageMagick
    await execAsync(
      `magick "${imagePath}" -resize ${newWidth}x${newHeight} "${tempFile}" 2>/dev/null || ` +
      `convert "${imagePath}" -resize ${newWidth}x${newHeight} "${tempFile}"`
    );
    console.log(`Preprocessed image: ${width}x${height} -> ${newWidth}x${newHeight}`);
    return tempFile;
  } catch (error) {
    // Clean up temp file if it was created
    try {
      await fs.unlink(tempFile);
    } catch {
      // Ignore cleanup errors
    }
    console.warn('Image preprocessing failed, using original:', error);
    return imagePath;
  }
}

/**
 * Parse HOCR data to extract text blocks with positions
 * @param hocrData HOCR XML data
 * @returns Array of text blocks
 */
export function parseHOCR(hocrData: string): TextBlock[] {
  const blocks: TextBlock[] = [];
  
  // Simple regex-based parser for HOCR format
  // HOCR format: <span class='ocr_line' title="bbox x0 y0 x1 y1">...text...</span>
  const lineRegex = /<span[^>]*class=['"]ocr_line['"][^>]*title=['"]bbox\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)['"][^>]*>(.*?)<\/span>/gi;
  
  let match;
  while ((match = lineRegex.exec(hocrData)) !== null) {
    const [, x0, y0, x1, y1, htmlText] = match;
    // Strip HTML tags and decode entities
    const text = htmlText
      .replace(/<[^>]+>/g, '')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();
    
    if (text) {
      blocks.push({
        text,
        bbox: {
          x0: parseInt(x0, 10),
          y0: parseInt(y0, 10),
          x1: parseInt(x1, 10),
          y1: parseInt(y1, 10),
        },
        confidence: 0, // HOCR doesn't always include confidence per line
      });
    }
  }

  return blocks;
}

/**
 * Extract text from an image using OCR
 * @param imagePath Path to the image file
 * @param options OCR options
 * @returns OCR result with text and confidence
 */
export async function extractText(
  imagePath: string,
  options: OCROptions = {}
): Promise<OCRResult> {
  const startTime = Date.now();
  const opts = { ...DEFAULT_OCR_OPTIONS, ...options };

  // Validate image
  const validation = await validateImage(imagePath);
  if (!validation.valid) {
    throw new OCRError(
      `Image validation failed: ${validation.error}`,
      validation.error?.includes('not found') ? 'FILE_NOT_FOUND' : 'INVALID_IMAGE'
    );
  }

  // Preprocess image if needed
  let processedPath = imagePath;
  let tempFile: string | null = null;

  if (opts.preprocessing) {
    processedPath = await preprocessImage(imagePath, opts.maxDimension);
    if (processedPath !== imagePath) {
      tempFile = processedPath;
    }
  }

  let worker: Worker | null = null;

  try {
    // Create worker with options
    // Use longer timeout for initial model download (3 minutes)
    // The first run may need to download the language model from CDN
    const workerTimeout = Math.max(opts.timeout, 180000);
    
    console.log(`Creating Tesseract worker for language: ${opts.language}...`);
    
    const workerPromise = createWorker(opts.language, undefined, {
      logger: (m: { status: string; progress: number }) => {
        if (m.status === 'recognizing text') {
          console.log(`OCR Progress: ${(m.progress * 100).toFixed(1)}%`);
        }
      },
      errorHandler: (err: Error) => {
        console.error('Worker error:', err);
      },
    });
    
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Worker creation timeout')), workerTimeout);
    });

    worker = await Promise.race([workerPromise, timeoutPromise]);
    console.log('Worker created successfully');

    // Perform OCR with timeout
    const recognizePromise = worker.recognize(processedPath);
    const recognizeTimeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('OCR recognition timeout')), opts.timeout);
    });

    const result: RecognizeResult = await Promise.race([
      recognizePromise,
      recognizeTimeoutPromise,
    ]);

    const processingTime = Date.now() - startTime;

    // Parse blocks if requested
    let blocks: TextBlock[] | undefined;
    if (opts.includeBlocks && result.data.blocks) {
      blocks = result.data.blocks.map((block) => ({
        text: block.text,
        bbox: {
          x0: block.bbox.x0,
          y0: block.bbox.y0,
          x1: block.bbox.x1,
          y1: block.bbox.y1,
        },
        confidence: block.confidence,
      }));
    }

    return {
      text: result.data.text,
      confidence: result.data.confidence,
      blocks,
      processingTime,
      language: opts.language,
    };
  } catch (error) {
    const errorMessage = (error as Error).message;

    // Classify error type
    let errorCode: OCRErrorCode = 'PROCESSING_ERROR';
    if (errorMessage.includes('timeout')) {
      errorCode = 'TIMEOUT';
    } else if (errorMessage.includes('worker')) {
      errorCode = 'WORKER_ERROR';
    }

    throw new OCRError(
      `OCR failed: ${errorMessage}`,
      errorCode,
      error as Error
    );
  } finally {
    // Terminate worker
    if (worker) {
      try {
        await worker.terminate();
      } catch {
        // Ignore termination errors
      }
    }

    // Clean up temporary file
    if (tempFile) {
      try {
        await fs.unlink(tempFile);
        console.log(`Cleaned up temp file: ${tempFile}`);
      } catch {
        // Ignore cleanup errors
      }
    }
  }
}

/**
 * Clean up temporary OCR files (emergency cleanup)
 */
export async function cleanupTempFiles(): Promise<void> {
  const tempDir = os.tmpdir();
  try {
    const files = await fs.readdir(tempDir);
    const ocrFiles = files.filter((f) => f.startsWith('ocr-'));

    for (const file of ocrFiles) {
      try {
        await fs.unlink(path.join(tempDir, file));
        console.log(`Cleaned up: ${file}`);
      } catch {
        // Ignore cleanup errors
      }
    }
  } catch {
    // Ignore directory read errors
  }
}
