/**
 * Multer upload configuration middleware
 * Handles multipart/form-data uploads with validation
 */

import multer, { FileFilterCallback, StorageEngine } from 'multer';
import path from 'path';
import { Request } from 'express';
import { v4 as uuidv4 } from 'uuid';

// Allowed MIME types
const ALLOWED_MIME_TYPES = [
  // Images
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/bmp',
  // Documents
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/markdown',
];

// Allowed file extensions
const ALLOWED_EXTENSIONS = [
  // Images
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff',
  // Documents
  '.pdf', '.docx', '.pptx', '.txt', '.md',
];

// Maximum file size: 50MB (for larger PDFs and PPTs)
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB in bytes

// Maximum number of files per upload
export const MAX_FILES_COUNT = 20;

// Upload directory
export const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

/**
 * Generate a unique filename for uploaded files
 * Format: {jobId}-{timestamp}-{random}
 * Note: Use random ID to avoid encoding issues on disk, preserve original name separately
 */
function generateFilename(
  req: Request,
  file: Express.Multer.File,
  jobId: string
): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const ext = path.extname(file.originalname);
  return `${jobId}-${timestamp}-${random}${ext}`;
}

/**
 * Configure multer disk storage
 */
function createStorage(jobId: string): StorageEngine {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, UPLOAD_DIR);
    },
    filename: (req, file, cb) => {
      const filename = generateFilename(req, file, jobId);
      // Fix encoding: try to recover UTF-8 from mis-interpreted Latin1
      (file as any).originalname = fixFilenameEncoding(file.originalname);
      cb(null, filename);
    },
  });
}

/**
 * Fix filename encoding when Chinese/non-ASCII chars are misinterpreted as Latin1
 * Common mojibake patterns:
 * - 中文文件名 -> ä¸­æ–‡æ–‡ä»¶å
 * - 测试.jpg -> æµ‹è¯•.jpg
 */
function fixFilenameEncoding(filename: string): string {
  try {
    // Common UTF-8 Chinese chars misinterpreted as Latin1 produce specific patterns
    // Try: Latin1 -> UTF-8
    const reencoded = Buffer.from(filename, 'latin1').toString('utf8');
    
    // Check if reencoding produces valid UTF-8 (contains Chinese chars)
    const hasChineseChars = /[\u4e00-\u9fff]/.test(reencoded);
    const hasOriginalChineseChars = /[\u4e00-\u9fff]/.test(filename);
    
    // If original has no Chinese but reencoded does, the original was already correct
    // If original has no Chinese and reencoded has no Chinese, return as-is
    // If original has Chinese, return original
    // If reencoded has Chinese but original doesn't, use reencoded
    if (hasChineseChars && !hasOriginalChineseChars) {
      return reencoded;
    }
    
    return filename;
  } catch {
    return filename;
  }
}

function fileFilter(
  req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
): void {
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype.toLowerCase())) {
    return cb(
      new Error(
        `Invalid file type: ${file.mimetype}. Allowed: images (jpg, jpeg, png, gif, webp, bmp), documents (pdf, docx, pptx), text (txt, md).`
      )
    );
  }

  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return cb(
      new Error(
        `Invalid file extension: ${ext}. Allowed extensions: .jpg, .jpeg, .png, .gif, .webp, .bmp, .tiff, .pdf, .docx, .pptx, .txt, .md.`
      )
    );
  }

  cb(null, true);
}

/**
 * Create multer upload middleware for a single file
 * @param jobId - The unique job ID to use in filename
 */
export function createSingleUploadMiddleware(jobId: string) {
  return multer({
    storage: createStorage(jobId),
    fileFilter,
    limits: {
      fileSize: MAX_FILE_SIZE,
      files: 1,
    },
  });
}

/**
 * Create multer upload middleware for multiple files
 * @param jobId - The unique job ID to use in filename
 */
export function createMultipleUploadMiddleware(jobId: string) {
  return multer({
    storage: createStorage(jobId),
    fileFilter,
    limits: {
      fileSize: MAX_FILE_SIZE,
      files: MAX_FILES_COUNT,
    },
  });
}

/**
 * Multer error handler middleware
 * Converts multer errors to proper API responses
 */
export function handleMulterError(
  err: any,
  req: Request,
  res: any,
  next: any
): void {
  if (err instanceof multer.MulterError) {
    // Multer-specific errors
    let message = 'Upload error';
    
    switch (err.code) {
      case 'LIMIT_FILE_SIZE':
        message = `File too large. Maximum file size is 50MB.`;
        break;
      case 'LIMIT_FILE_COUNT':
        message = `Too many files. Maximum ${MAX_FILES_COUNT} files allowed per request.`;
        break;
      case 'LIMIT_UNEXPECTED_FILE':
        message = 'Unexpected file field.';
        break;
      case 'LIMIT_PART_COUNT':
        message = 'Too many parts in multipart form.';
        break;
      default:
        message = `Upload error: ${err.message}`;
    }

    return res.status(400).json({
      success: false,
      error: message,
    });
  }

  // Pass other errors to next handler
  if (err) {
    return res.status(400).json({
      success: false,
      error: err.message || 'Upload failed',
    });
  }

  next();
}

// Export constants for use in other modules
export { MAX_FILE_SIZE, ALLOWED_MIME_TYPES, ALLOWED_EXTENSIONS };
