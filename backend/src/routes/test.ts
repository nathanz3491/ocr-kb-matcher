/**
 * OCR Test Routes
 * 
 * Temporary test endpoints for OCR functionality.
 * These routes are for development/testing only.
 */

import { Router, Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import path from 'path';
import * as fs from 'fs/promises';
import { extractText, validateImage, cleanupTempFiles } from '../services/ocr';
import { OCROptions } from '../types/ocr';
import { requireAuth, requireAdmin } from '../middleware/auth';

const router = Router();

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'ocr-test');
    // Ensure directory exists
    fs.mkdir(uploadDir, { recursive: true }).then(() => {
      cb(null, uploadDir);
    }).catch((err) => cb(err, uploadDir));
  },
  filename: (_req, file, cb) => {
    const uniqueName = `ocr-${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max
  },
  fileFilter: (_req, file, cb) => {
    // Accept only image files
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/bmp', 'image/gif', 'image/webp', 'image/tiff'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${file.mimetype}. Only images are allowed.`));
    }
  },
});

/**
 * POST /api/test/ocr
 * Test OCR on an uploaded image
 * 
 * Request body (multipart/form-data):
 * - image: Image file to process
 * - language: OCR language (default: 'eng')
 * - timeout: Timeout in milliseconds (default: 60000)
 * - preprocessing: Enable preprocessing (default: 'true')
 * - includeBlocks: Include text block positions (default: 'false')
 */
router.post(
  '/ocr',
  upload.single('image'),
  async (req: Request, res: Response, next: NextFunction) => {
    // Only allow in non-production environments
    if (process.env.NODE_ENV === 'production') {
      return res.status(404).json({
        success: false,
        error: 'Test endpoint not available in production',
      });
    }

    const file = req.file;

    if (!file) {
      return res.status(400).json({
        success: false,
        error: 'No image uploaded. Use field name "image".',
      });
    }

    // Parse options from request
    const options: OCROptions = {
      language: (req.body.language as string) || 'eng',
      timeout: parseInt(req.body.timeout as string, 10) || 60000,
      preprocessing: req.body.preprocessing !== 'false',
      includeBlocks: req.body.includeBlocks === 'true',
    };

    try {
      // Validate the image
      const validation = await validateImage(file.path);
      if (!validation.valid) {
        // Clean up the uploaded file
        await fs.unlink(file.path).catch(() => {});
        return res.status(400).json({
          success: false,
          error: `Image validation failed: ${validation.error}`,
        });
      }

      // Perform OCR
      const result = await extractText(file.path, options);

      // Clean up the uploaded file after processing
      await fs.unlink(file.path).catch(() => {});

      return res.json({
        success: true,
        data: {
          originalName: file.originalname,
          ...result,
        },
      });
    } catch (error) {
      // Clean up the uploaded file on error
      await fs.unlink(file.path).catch(() => {});

      next(error);
    }
  }
);

/**
 * POST /api/test/ocr/validate
 * Validate an image without performing OCR
 */
router.post(
  '/ocr/validate',
  upload.single('image'),
  async (req: Request, res: Response) => {
    // Only allow in non-production environments
    if (process.env.NODE_ENV === 'production') {
      return res.status(404).json({
        success: false,
        error: 'Test endpoint not available in production',
      });
    }

    const file = req.file;

    if (!file) {
      return res.status(400).json({
        success: false,
        error: 'No image uploaded. Use field name "image".',
      });
    }

    try {
      const validation = await validateImage(file.path);

      // Clean up the uploaded file
      await fs.unlink(file.path).catch(() => {});

      return res.json({
        success: validation.valid,
        data: {
          originalName: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
          ...validation,
        },
      });
    } catch (error) {
      // Clean up the uploaded file
      await fs.unlink(file.path).catch(() => {});

      return res.status(500).json({
        success: false,
        error: `Validation error: ${(error as Error).message}`,
      });
    }
  }
);

/**
 * POST /api/test/ocr/cleanup
 * Clean up temporary OCR files
 */
router.post(
  '/ocr/cleanup',
  async (_req: Request, res: Response) => {
    // Only allow in non-production environments
    if (process.env.NODE_ENV === 'production') {
      return res.status(404).json({
        success: false,
        error: 'Test endpoint not available in production',
      });
    }

    try {
      await cleanupTempFiles();
      return res.json({
        success: true,
        message: 'Temporary files cleaned up',
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: `Cleanup error: ${(error as Error).message}`,
      });
    }
  }
);

/**
 * GET /api/test/require-auth
 * Test requireAuth middleware
 */
router.get(
  '/require-auth',
  requireAuth,
  async (_req: Request, res: Response) => {
    if (process.env.NODE_ENV === 'production') {
      return res.status(404).json({
        success: false,
        error: 'Test endpoint not available in production',
      });
    }

    return res.json({
      success: true,
      message: 'Authenticated request passed requireAuth',
    });
  }
);

/**
 * GET /api/test/require-admin
 * Test requireAdmin middleware
 */
router.get(
  '/require-admin',
  requireAdmin,
  async (_req: Request, res: Response) => {
    if (process.env.NODE_ENV === 'production') {
      return res.status(404).json({
        success: false,
        error: 'Test endpoint not available in production',
      });
    }

    return res.json({
      success: true,
      message: 'Admin request passed requireAdmin',
    });
  }
);

export default router;
