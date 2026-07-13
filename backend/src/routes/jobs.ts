/**
 * Job Management Routes
 * API endpoints for managing and monitoring jobs
 */

import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate } from '../middleware/auth';
import { ProcessingStatus } from '../../../shared/types';
import {
  getJob,
  getAllJobs,
  getPendingJobs,
  getProcessingJobs,
  getQueueStats,
  deleteJob,
  updateJobStatus,
  createJob,
} from '../services/jobService';
import { getQueueProcessor } from '../services/queueProcessor';

const router = Router();
router.use(authenticate);

/**
 * GET /api/jobs
 * List all jobs with optional filtering
 * Query params:
 *   - status: Filter by status (pending, processing, ocr_complete, matching, completed, failed)
 *   - limit: Maximum number of jobs to return (default: 100)
 *   - offset: Number of jobs to skip (default: 0)
 */
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;

  const { status, limit, offset } = req.query;

  // Get all jobs and filter by userId
  let jobs = await getAllJobs();
  jobs = jobs.filter(job => job.userId === userId);

  // Apply status filter if provided
  if (status && typeof status === 'string') {
    const statusLower = status.toLowerCase();
    const validStatuses = Object.values(ProcessingStatus);
    if (validStatuses.includes(statusLower as ProcessingStatus)) {
      jobs = jobs.filter(job => job.status === statusLower);
    }
  }

    // Get total count before pagination
    const total = jobs.length;

    // Apply pagination
    const limitNum = parseInt(limit as string, 10) || 100;
    const offsetNum = parseInt(offset as string, 10) || 0;
    jobs = jobs.slice(offsetNum, offsetNum + limitNum);

    res.json({
      success: true,
      data: {
        jobs,
        pagination: {
          total,
          limit: limitNum,
          offset: offsetNum,
          hasMore: offsetNum + limitNum < total,
        },
      },
    });
  }));

/**
 * GET /api/jobs/pending
 * List all pending jobs
 */
router.get('/pending', async (_req: Request, res: Response) => {
  try {
    const jobs = await getPendingJobs();
    res.json({
      success: true,
      data: { jobs, count: jobs.length },
    });
  } catch (error) {
    console.error('Error getting pending jobs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get pending jobs',
    });
  }
});

/**
 * GET /api/jobs/stats
 * Get queue statistics
 */
router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const stats = await getQueueStats();
    const processor = getQueueProcessor();

    res.json({
      success: true,
      data: {
        ...stats,
        processor: {
          isRunning: processor.isRunning(),
          isProcessing: processor.isCurrentlyProcessing(),
          currentJob: processor.getCurrentJob(),
        },
      },
    });
  } catch (error) {
    console.error('Error getting queue stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get queue statistics',
    });
  }
});

/**
 * GET /api/jobs/:id
 * Get a specific job by ID
 */
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;

  const { id } = req.params;
  const job = await getJob(id);

  if (!job) {
    res.status(404).json({ success: false, error: 'Job not found' });
    return;
  }
  if (job.userId !== userId) {
    res.status(404).json({ success: false, error: 'Job not found' });
    return;
  }

  res.json({ success: true, data: job });
}));

/**
 * GET /api/jobs/:id/status
 * Get job status only (lightweight endpoint for polling)
 */
router.get('/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const job = await getJob(id);

    if (!job) {
      res.status(404).json({
        success: false,
        error: 'Job not found',
      });
      return;
    }

    res.json({
      success: true,
      data: {
        id: job.id,
        status: job.status,
        currentStep: job.currentStep,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
        completedAt: job.completedAt,
        error: job.error,
      },
    });
  } catch (error) {
    console.error('Error getting job status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get job status',
    });
  }
});

/**
 * DELETE /api/jobs/:id
 * Delete a job
 */
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;

  const { id } = req.params;
  const job = await getJob(id);
  if (!job) {
    res.status(404).json({ success: false, error: 'Job not found' });
    return;
  }
  if (job.userId !== userId) {
    res.status(403).json({ success: false, error: 'Forbidden' });
    return;
  }
  if (job.status === ProcessingStatus.PROCESSING) {
    res.status(409).json({ success: false, error: 'Cannot delete a job that is currently being processed' });
    return;
  }

  const success = await deleteJob(id);
  if (success) {
    res.json({ success: true, data: { message: 'Job deleted successfully' } });
  } else {
    res.status(500).json({ success: false, error: 'Failed to delete job' });
  }
}));

/**
 * POST /api/jobs/:id/retry
 * Retry a failed job
 */
router.post('/:id/retry', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if job exists
    const job = await getJob(id);
    if (!job) {
      res.status(404).json({
        success: false,
        error: 'Job not found',
      });
      return;
    }

    // Only allow retry of failed jobs
    if (job.status !== ProcessingStatus.FAILED) {
      res.status(409).json({
        success: false,
        error: `Cannot retry job with status "${job.status}". Only failed jobs can be retried.`,
      });
      return;
    }

    // Reset job to pending state
    const updatedJob = await updateJobStatus(job.id, ProcessingStatus.PENDING, {
      error: undefined,
      completedAt: undefined,
      ocrText: undefined,
      ocrConfidence: undefined,
      results: undefined,
    });

    if (updatedJob) {
      res.json({
        success: true,
        data: updatedJob,
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to retry job',
      });
    }
  } catch (error) {
    console.error('Error retrying job:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retry job',
    });
  }
});

/**
 * POST /api/jobs/:id/cancel
 * Cancel a pending job
 */
router.post('/:id/cancel', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if job exists
    const job = await getJob(id);
    if (!job) {
      res.status(404).json({
        success: false,
        error: 'Job not found',
      });
      return;
    }

    // Only allow cancellation of pending jobs
    if (job.status !== ProcessingStatus.PENDING) {
      res.status(409).json({
        success: false,
        error: `Cannot cancel job with status "${job.status}". Only pending jobs can be cancelled.`,
      });
      return;
    }

    // Mark as failed with cancellation reason
    const updatedJob = await updateJobStatus(job.id, ProcessingStatus.FAILED, {
      error: 'Job cancelled by user',
    });

    if (updatedJob) {
      res.json({
        success: true,
        data: updatedJob,
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to cancel job',
      });
    }
  } catch (error) {
    console.error('Error cancelling job:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cancel job',
    });
  }
});

export default router;
