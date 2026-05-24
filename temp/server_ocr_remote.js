"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateImage = validateImage;
exports.preprocessImage = preprocessImage;
exports.parseHOCR = parseHOCR;
exports.extractText = extractText;
exports.cleanupTempFiles = cleanupTempFiles;
const tesseract_js_1 = require("tesseract.js");
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const util_1 = require("util");
const child_process_1 = require("child_process");
const ocr_1 = require("../types/ocr");
// Check if ImageMagick's convert command is available
const execAsync = (0, util_1.promisify)(child_process_1.exec);
/**
 * Check if ImageMagick is installed
 */
async function hasImageMagick() {
    try {
        await execAsync('magick --version');
        return true;
    }
    catch {
        try {
            await execAsync('convert --version');
            return true;
        }
        catch {
            return false;
        }
    }
}
/**
 * Validate an image file
 * @param imagePath Path to the image file
 * @returns Validation result
 */
async function validateImage(imagePath) {
    try {
        const stats = await fs.stat(imagePath);
        if (!stats.isFile()) return { valid: false, error: 'Path is not a file' };
        if (stats.size > 100 * 1024 * 1024) return { valid: false, error: 'File too large (max 100MB)' };
        if (stats.size === 0) return { valid: false, error: 'File is empty' };
        const ext = path.extname(imagePath).toLowerCase();
        const knownExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff', '.tif'];
        if (knownExtensions.includes(ext)) {
            return { valid: true, format: ext.replace('.', '') };
        }
        return { valid: false, error: 'Invalid image format: ' + ext };
    } catch (error) {
        return { valid: false, error: 'Validation error: ' + (error.message || 'unknown') };
    }
}
/**
 * Preprocess an image (resize if too large)
 * @param imagePath Path to the image file
 * @param maxDimension Maximum dimension in pixels (default 4000)
 * @returns Path to the preprocessed image (may be same as input)
 */
async function preprocessImage(imagePath, maxDimension = 4000) {
    // Validate image first
    const validation = await validateImage(imagePath);
    if (!validation.valid) {
        throw new ocr_1.OCRError(`Image validation failed: ${validation.error}`, 'INVALID_IMAGE');
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
        await execAsync(`magick "${imagePath}" -resize ${newWidth}x${newHeight} "${tempFile}" 2>/dev/null || ` +
            `convert "${imagePath}" -resize ${newWidth}x${newHeight} "${tempFile}"`);
        console.log(`Preprocessed image: ${width}x${height} -> ${newWidth}x${newHeight}`);
        return tempFile;
    }
    catch (error) {
        // Clean up temp file if it was created
        try {
            await fs.unlink(tempFile);
        }
        catch {
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
function parseHOCR(hocrData) {
    const blocks = [];
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
async function extractText(imagePath, options = {}) {
    const startTime = Date.now();
    const opts = { ...ocr_1.DEFAULT_OCR_OPTIONS, ...options };
    // Validate image
    const validation = await validateImage(imagePath);
    if (!validation.valid) {
        throw new ocr_1.OCRError(`Image validation failed: ${validation.error}`, validation.error?.includes('not found') ? 'FILE_NOT_FOUND' : 'INVALID_IMAGE');
    }
    // Preprocess image if needed
    let processedPath = imagePath;
    let tempFile = null;
    if (opts.preprocessing) {
        processedPath = await preprocessImage(imagePath, opts.maxDimension);
        if (processedPath !== imagePath) {
            tempFile = processedPath;
        }
    }
    let worker = null;
    try {
        // Create worker with options
        // Use longer timeout for initial model download (3 minutes)
        // The first run may need to download the language model from CDN
        const workerTimeout = Math.max(opts.timeout, 180000);
        console.log(`Creating Tesseract worker for language: ${opts.language}...`);
        const workerPromise = (0, tesseract_js_1.createWorker)(opts.language, undefined, {
            logger: (m) => {
                if (m.status === 'recognizing text') {
                    console.log(`OCR Progress: ${(m.progress * 100).toFixed(1)}%`);
                }
            },
            errorHandler: (err) => {
                console.error('Worker error:', err);
            },
        });
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Worker creation timeout')), workerTimeout);
        });
        worker = await Promise.race([workerPromise, timeoutPromise]);
        console.log('Worker created successfully');
        // Perform OCR with timeout
        const recognizePromise = worker.recognize(processedPath);
        const recognizeTimeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('OCR recognition timeout')), opts.timeout);
        });
        const result = await Promise.race([
            recognizePromise,
            recognizeTimeoutPromise,
        ]);
        const processingTime = Date.now() - startTime;
        // Parse blocks if requested
        let blocks;
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
    }
    catch (error) {
        const errorMessage = error.message;
        // Classify error type
        let errorCode = 'PROCESSING_ERROR';
        if (errorMessage.includes('timeout')) {
            errorCode = 'TIMEOUT';
        }
        else if (errorMessage.includes('worker')) {
            errorCode = 'WORKER_ERROR';
        }
        throw new ocr_1.OCRError(`OCR failed: ${errorMessage}`, errorCode, error);
    }
    finally {
        // Terminate worker
        if (worker) {
            try {
                await worker.terminate();
            }
            catch {
                // Ignore termination errors
            }
        }
        // Clean up temporary file
        if (tempFile) {
            try {
                await fs.unlink(tempFile);
                console.log(`Cleaned up temp file: ${tempFile}`);
            }
            catch {
                // Ignore cleanup errors
            }
        }
    }
}
/**
 * Clean up temporary OCR files (emergency cleanup)
 */
async function cleanupTempFiles() {
    const tempDir = os.tmpdir();
    try {
        const files = await fs.readdir(tempDir);
        const ocrFiles = files.filter((f) => f.startsWith('ocr-'));
        for (const file of ocrFiles) {
            try {
                await fs.unlink(path.join(tempDir, file));
                console.log(`Cleaned up: ${file}`);
            }
            catch {
                // Ignore cleanup errors
            }
        }
    }
    catch {
        // Ignore directory read errors
    }
}
