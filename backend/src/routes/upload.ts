/**
 * Upload routes
 * Handles file upload endpoints
 */

import { Router, Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs/promises';
import * as path from 'path';
import axios from 'axios';
import { BlockList, isIP } from 'node:net';
import dns from 'node:dns/promises';
import * as cheerio from 'cheerio';
import { ProcessingStatus, JobType, Tier } from '../../../shared/types';
import { TIER_LIMITS } from '../config/tiers';
import { logger } from '../lib/logger';
import {
  createSingleUploadMiddleware,
  createMultipleUploadMiddleware,
  handleMulterError,
  MAX_FILES_COUNT,
} from '../middleware/upload';
import {
  createJob,
  createJobs,
  ensureUploadsDir,
  FileInfo,
} from '../services/jobService';
import { UPLOAD_DIR } from '../middleware/upload';
import { authenticate, requireAuth } from '../middleware/auth';
import { uploadLimiter } from '../middleware/rateLimit';
import { enforceQuota } from '../middleware/quota';

const router = Router();

// Apply upload rate limiter to all upload routes (30 req/hour per user)
router.use(uploadLimiter);
router.use(authenticate);

// ── SSRF Protection ──────────────────────────────────────────────
const DNS_TIMEOUT_MS = 3000;

const ssrfBlockList = new BlockList();
ssrfBlockList.addAddress('127.0.0.1', 'ipv4');
ssrfBlockList.addAddress('0.0.0.0', 'ipv4');
ssrfBlockList.addAddress('255.255.255.255', 'ipv4');
ssrfBlockList.addRange('10.0.0.0', '10.255.255.255', 'ipv4');
ssrfBlockList.addRange('172.16.0.0', '172.31.255.255', 'ipv4');
ssrfBlockList.addRange('192.168.0.0', '192.168.255.255', 'ipv4');
ssrfBlockList.addAddress('169.254.169.254', 'ipv4');
ssrfBlockList.addRange('169.254.0.0', '169.254.255.255', 'ipv4');
ssrfBlockList.addAddress('::1', 'ipv6');
ssrfBlockList.addRange('fc00::', 'fdff:ffff:ffff:ffff:ffff:ffff:ffff:ffff', 'ipv6');
ssrfBlockList.addRange('fe80::', 'febf:ffff:ffff:ffff:ffff:ffff:ffff:ffff', 'ipv6');

async function isHostnameBlocked(hostname: string): Promise<string | null> {
  // IP literal — check directly
  const ipVersion = isIP(hostname);
  if (ipVersion) {
    if (ssrfBlockList.check(hostname, ipVersion === 4 ? 'ipv4' : 'ipv6')) {
      return hostname;
    }
    return null;
  }

  // Domain name — resolve DNS and check every resolved IP
  try {
    const dnsPromise = dns.lookup(hostname, { all: true, family: 0 });
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('DNS lookup timed out')), DNS_TIMEOUT_MS);
    });
    const addresses = await Promise.race([dnsPromise, timeoutPromise]);
    for (const addr of addresses) {
      const family = (addr.family === 4 ? 'ipv4' : 'ipv6') as 'ipv4' | 'ipv6';
      if (ssrfBlockList.check(addr.address, family)) {
        return `${hostname} → ${addr.address}`;
      }
    }
  } catch {
    // DNS resolution failed or timed out — fail closed
    return `${hostname} (DNS resolution failed)`;
  }

  return null;
}
// ── End SSRF Protection ──────────────────────────────────────────

router.post(
  '/',
  requireAuth,
  enforceQuota('uploads'),
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user!.userId;

    const batchJobId = uuidv4();
    await ensureUploadsDir();
    const isMultiple = req.headers['x-upload-multiple'] === 'true';

    try {
      if (isMultiple) {
        const uploadMiddleware = createMultipleUploadMiddleware(batchJobId).array(
          'files',
          MAX_FILES_COUNT
        );

        uploadMiddleware(req, res, async (err: any) => {
          if (err) return handleMulterError(err, req, res, next);
          const files = req.files as Express.Multer.File[];
          if (!files || files.length === 0) {
            return res.status(400).json({ success: false, error: 'No files uploaded' });
          }
          // ── Tier-based size cap ──────────────────────────────
          const userTier = (req.user?.tier as Tier) || 'free';
          const maxSizeMB = TIER_LIMITS[userTier].maxFileSizeMB;
          const oversizedFile = files.find(f => f.size > maxSizeMB * 1024 * 1024);
          if (oversizedFile) {
            logger.warn(
              { userId, fileName: oversizedFile.originalname, fileSize: oversizedFile.size, tier: userTier, limitMB: maxSizeMB },
              `Upload rejected: file size ${oversizedFile.size} exceeds ${maxSizeMB}MB tier limit`
            );
            return res.status(413).json({
              success: false,
              error: `文件大小超过 ${userTier}套餐限制 (${maxSizeMB}MB)`,
            });
          }
          // ── End size cap ─────────────────────────────────────
          try {
            const fileInfos: FileInfo[] = files.map((file) => ({
              originalname: file.originalname,
              filename: file.filename,
              mimetype: file.mimetype,
              size: file.size,
              path: file.path,
            }));
            const jobType = req.body.jobType as JobType | undefined;
            const wrongQuestionIndices = req.body.wrongQuestionIndices as string | undefined;
            const jobs = await createJobs(fileInfos, jobType, wrongQuestionIndices, userId);
            return res.status(201).json({
              success: true,
              data: {
                batchId: batchJobId,
                count: jobs.length,
                jobs: jobs.map((job) => ({
                  jobId: job.id,
                  status: job.status,
                  fileName: job.fileName,
                  message: 'File uploaded successfully and queued for processing',
                })),
              },
            });
          } catch (error) {
            next(error);
          }
        });
      } else {
        const uploadMiddleware = createSingleUploadMiddleware(batchJobId).single('file');
        uploadMiddleware(req, res, async (err: any) => {
          if (err) return handleMulterError(err, req, res, next);
          const file = req.file;
          if (!file) {
            return res.status(400).json({ success: false, error: 'No file uploaded' });
          }
          // ── Tier-based size cap ──────────────────────────────
          const userTier = (req.user?.tier as Tier) || 'free';
          const maxSizeMB = TIER_LIMITS[userTier].maxFileSizeMB;
          if (file.size > maxSizeMB * 1024 * 1024) {
            logger.warn(
              { userId, fileName: file.originalname, fileSize: file.size, tier: userTier, limitMB: maxSizeMB },
              `Upload rejected: file size ${file.size} exceeds ${maxSizeMB}MB tier limit`
            );
            return res.status(413).json({
              success: false,
              error: `文件大小超过 ${userTier}套餐限制 (${maxSizeMB}MB)`,
            });
          }
          // ── End size cap ─────────────────────────────────────
          try {
            const fileInfo: FileInfo = {
              originalname: file.originalname,
              filename: file.filename,
              mimetype: file.mimetype,
              size: file.size,
              path: file.path,
            };
            const jobType = req.body.jobType as JobType | undefined;
            const wrongQuestionIndices = req.body.wrongQuestionIndices as string | undefined;
            const job = await createJob(fileInfo, jobType, wrongQuestionIndices, userId);
            return res.status(201).json({
              success: true,
              data: {
                jobId: job.id,
                status: job.status,
                fileName: job.fileName,
                message: 'File uploaded successfully and queued for processing',
              },
            });
          } catch (error) {
            next(error);
          }
        });
      }
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/single',
  requireAuth,
  enforceQuota('uploads'),
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user!.userId;

    const jobId = uuidv4();
    await ensureUploadsDir();
    const uploadMiddleware = createSingleUploadMiddleware(jobId).single('file');

    uploadMiddleware(req, res, async (err: any) => {
      if (err) return handleMulterError(err, req, res, next);
      const file = req.file;
      if (!file) {
        return res.status(400).json({ success: false, error: 'No file uploaded. Use field name "file".' });
      }
      // ── Tier-based size cap ──────────────────────────────
      const userTier = (req.user?.tier as Tier) || 'free';
      const maxSizeMB = TIER_LIMITS[userTier].maxFileSizeMB;
      if (file.size > maxSizeMB * 1024 * 1024) {
        logger.warn(
          { userId, fileName: file.originalname, fileSize: file.size, tier: userTier, limitMB: maxSizeMB },
          `Upload rejected: file size ${file.size} exceeds ${maxSizeMB}MB tier limit`
        );
        return res.status(413).json({
          success: false,
          error: `文件大小超过 ${userTier}套餐限制 (${maxSizeMB}MB)`,
        });
      }
      // ── End size cap ─────────────────────────────────────
      try {
        const fileInfo: FileInfo = {
          originalname: file.originalname,
          filename: file.filename,
          mimetype: file.mimetype,
          size: file.size,
          path: file.path,
        };
        const jobType = req.body.jobType as JobType | undefined;
        const wrongQuestionIndices = req.body.wrongQuestionIndices as string | undefined;
        const job = await createJob(fileInfo, jobType, wrongQuestionIndices, userId);
        return res.status(201).json({
          success: true,
          data: {
            jobId: job.id,
            status: job.status,
            fileName: job.fileName,
            message: 'File uploaded successfully and queued for processing',
          },
        });
      } catch (error) {
        next(error);
      }
    });
  }
);

router.post(
  '/multiple',
  requireAuth,
  enforceQuota('uploads'),
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user!.userId;

    const batchJobId = uuidv4();
    await ensureUploadsDir();
    const uploadMiddleware = createMultipleUploadMiddleware(batchJobId).array(
      'files',
      MAX_FILES_COUNT
    );

    uploadMiddleware(req, res, async (err: any) => {
      if (err) return handleMulterError(err, req, res, next);
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ success: false, error: 'No files uploaded. Use field name "files".' });
      }
      // ── Tier-based size cap ──────────────────────────────
      const userTier = (req.user?.tier as Tier) || 'free';
      const maxSizeMB = TIER_LIMITS[userTier].maxFileSizeMB;
      const oversizedFile = files.find(f => f.size > maxSizeMB * 1024 * 1024);
      if (oversizedFile) {
        logger.warn(
          { userId, fileName: oversizedFile.originalname, fileSize: oversizedFile.size, tier: userTier, limitMB: maxSizeMB },
          `Upload rejected: file size ${oversizedFile.size} exceeds ${maxSizeMB}MB tier limit`
        );
        return res.status(413).json({
          success: false,
          error: `文件大小超过 ${userTier}套餐限制 (${maxSizeMB}MB)`,
        });
      }
      // ── End size cap ─────────────────────────────────────
      try {
        const fileInfos: FileInfo[] = files.map((file) => ({
          originalname: file.originalname,
          filename: file.filename,
          mimetype: file.mimetype,
          size: file.size,
          path: file.path,
        }));
        const jobType = req.body.jobType as JobType | undefined;
        const wrongQuestionIndices = req.body.wrongQuestionIndices as string | undefined;
        const jobs = await createJobs(fileInfos, jobType, wrongQuestionIndices, userId);
        return res.status(201).json({
          success: true,
          data: {
            batchId: batchJobId,
            count: jobs.length,
            jobs: jobs.map((job) => ({
              jobId: job.id,
              status: job.status,
              fileName: job.fileName,
              message: 'File uploaded successfully and queued for processing',
            })),
          },
        });
      } catch (error) {
        next(error);
      }
    });
  }
);

router.post(
  '/text',
  requireAuth,
  enforceQuota('uploads'),
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user!.userId;

    const { content, title } = req.body;
    if (!content || typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Content is required and must be a non-empty string',
      });
    }

    try {
      await ensureUploadsDir();
      const jobId = uuidv4();
      const safeTitle = (title || 'text-import').replace(/[^a-zA-Z0-9_-]/g, '_');
      const filename = `${jobId}-${safeTitle}.txt`;
      const filePath = path.join(UPLOAD_DIR, filename);
      await fs.writeFile(filePath, content.trim(), 'utf-8');

      const fileInfo: FileInfo = {
        originalname: `${safeTitle}.txt`,
        filename,
        mimetype: 'text/plain',
        size: Buffer.byteLength(content.trim(), 'utf-8'),
        path: filePath,
      };
      const jobType = req.body.jobType as JobType | undefined;
      const wrongQuestionIndices = req.body.wrongQuestionIndices as string | undefined;
      const job = await createJob(fileInfo, jobType, wrongQuestionIndices, userId);

      return res.status(201).json({
        success: true,
        data: {
          jobId: job.id,
          status: job.status,
          fileName: job.fileName,
          message: 'Text content imported successfully and queued for processing',
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/url',
  requireAuth,
  enforceQuota('uploads'),
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user!.userId;

    const { url } = req.body;
    if (!url || typeof url !== 'string' || !url.trim()) {
      return res.status(400).json({ success: false, error: 'URL is required' });
    }

    let normalizedUrl: string;
    let targetHostname: string;
    try {
      const urlObj = new URL(url.trim());
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        throw new Error('Only HTTP(S) URLs are supported');
      }
      normalizedUrl = urlObj.href;
      targetHostname = urlObj.hostname;
    } catch {
      return res.status(400).json({ success: false, error: 'Invalid URL format' });
    }

    // SSRF protection: block requests to internal/private networks
    const ssrfBlocked = await isHostnameBlocked(targetHostname);
    if (ssrfBlocked) {
      return res.status(400).json({
        success: false,
        error: `URL not allowed: ${ssrfBlocked}`,
      });
    }

    try {
      await ensureUploadsDir();
      const response = await axios.get(normalizedUrl, {
        timeout: 30000,
        maxContentLength: 50 * 1024 * 1024,
        responseType: 'text',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; OCR-KB-Matcher/1.0)',
        },
      });

      let textContent: string;
      const contentType = String(response.headers['content-type'] || '');

      if (contentType.includes('text/html')) {
        const $ = cheerio.load(response.data as string);
        $('script, style, noscript, iframe, nav, footer, header').remove();
        textContent = $('body').text().replace(/\s+/g, ' ').trim();
      } else if (contentType.includes('application/pdf')) {
        const jobId = uuidv4();
        const filename = `${jobId}-url-import.pdf`;
        const filePath = path.join(UPLOAD_DIR, filename);
        await fs.writeFile(filePath, response.data);
        const fileInfo: FileInfo = {
          originalname: filename,
          filename,
          mimetype: 'application/pdf',
          size: Buffer.byteLength(response.data),
          path: filePath,
        };
        const jobType = req.body.jobType as JobType | undefined;
        const wrongQuestionIndices = req.body.wrongQuestionIndices as string | undefined;
        const job = await createJob(fileInfo, jobType, wrongQuestionIndices, userId);
        return res.status(201).json({
          success: true,
          data: {
            jobId: job.id,
            status: job.status,
            fileName: job.fileName,
            message: 'PDF from URL imported and queued for processing',
          },
        });
      } else {
        textContent = typeof response.data === 'string'
          ? response.data.replace(/\s+/g, ' ').trim()
          : JSON.stringify(response.data);
      }

      if (!textContent || textContent.length < 10) {
        return res.status(422).json({
          success: false,
          error: 'Could not extract meaningful content from the URL',
        });
      }

      const jobId = uuidv4();
      const hostname = new URL(normalizedUrl).hostname.replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `${jobId}-${hostname}.txt`;
      const filePath = path.join(UPLOAD_DIR, filename);
      await fs.writeFile(filePath, textContent, 'utf-8');

      const fileInfo: FileInfo = {
        originalname: `${hostname}.txt`,
        filename,
        mimetype: 'text/plain',
        size: Buffer.byteLength(textContent, 'utf-8'),
        path: filePath,
      };
      const jobType = req.body.jobType as JobType | undefined;
      const wrongQuestionIndices = req.body.wrongQuestionIndices as string | undefined;
      const job = await createJob(fileInfo, jobType, wrongQuestionIndices, userId);

      return res.status(201).json({
        success: true,
        data: {
          jobId: job.id,
          status: job.status,
          fileName: job.fileName,
          message: 'URL content imported and queued for processing',
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch URL';
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED' || message.includes('timeout')) {
          return res.status(408).json({ success: false, error: 'URL fetch timed out' });
        }
        if (error.response?.status === 403) {
          return res.status(403).json({ success: false, error: 'Access forbidden by the target website' });
        }
        if (error.response?.status === 404) {
          return res.status(404).json({ success: false, error: 'URL not found (404)' });
        }
      }
      next(error);
    }
  }
);

export default router;
