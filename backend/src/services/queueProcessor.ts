/**
 * Queue Processor Service
 * Handles polling for pending jobs and processing them sequentially
 */

import { EventEmitter } from 'events';
import { ProcessingStatus, Job } from '../../../shared/types';
import {
  getPendingJobs,
  claimJob,
  updateJobStatus,
  cleanupOldJobs,
  getProcessingJobs,
} from './jobService';
import { JobProcessor } from './jobProcessor';
import { ProcessingStep } from '../types/worker';

// Job timeout in milliseconds (5 minutes)
const DEFAULT_JOB_TIMEOUT_MS = 5 * 60 * 1000;
// Default polling interval in milliseconds (5 seconds)
const DEFAULT_POLLING_INTERVAL_MS = 5000;
// Cleanup interval in milliseconds (1 hour)
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000;

/**
 * Queue processor events
 */
export interface QueueProcessorEvents {
  'job:started': (job: Job) => void;
  'job:completed': (job: Job) => void;
  'job:failed': (job: Job, error: Error) => void;
  'job:timeout': (job: Job) => void;
  'job:status-changed': (job: Job, oldStatus: ProcessingStatus) => void;
  'polling:started': () => void;
  'polling:stopped': () => void;
  'error': (error: Error) => void;
}

/**
 * Queue processor class
 * Manages job polling and processing with event emission
 */
export class QueueProcessor extends EventEmitter {
  private isPolling: boolean = false;
  private pollingIntervalMs: number;
  private jobTimeoutMs: number;
  private pollingTimer: NodeJS.Timeout | null = null;
  private cleanupTimer: NodeJS.Timeout | null = null;
  private isProcessing: boolean = false;
  private currentJob: Job | null = null;
  private currentJobTimeout: NodeJS.Timeout | null = null;
  private jobProcessor: JobProcessor;

  constructor(
    pollingIntervalMs: number = DEFAULT_POLLING_INTERVAL_MS,
    jobTimeoutMs: number = DEFAULT_JOB_TIMEOUT_MS
  ) {
    super();
    this.pollingIntervalMs = pollingIntervalMs;
    this.jobTimeoutMs = jobTimeoutMs;
    this.jobProcessor = new JobProcessor({
      totalTimeoutMs: jobTimeoutMs,
    });
    this.setupJobProcessorListeners();
  }

  /**
   * Setup event listeners to forward job processor events
   */
  private setupJobProcessorListeners(): void {
    // Forward step completion events
    this.jobProcessor.on('step:completed', (jobId: string, step: ProcessingStep, durationMs: number) => {
      console.log(`[QueueProcessor] Step ${step} completed for job ${jobId} in ${durationMs}ms`);
    });

    // Forward checkpoint saved event
    this.jobProcessor.on('checkpoint:saved', (jobId: string, ocrText: string) => {
      console.log(`[QueueProcessor] OCR checkpoint saved for job ${jobId}`);
    });

    // Handle processing completion
    this.jobProcessor.on('processing:completed', async (jobId: string) => {
      console.log(`[QueueProcessor] Job ${jobId} processing completed`);
    });

    // Handle processing failure
    this.jobProcessor.on('processing:failed', (jobId: string, error: Error) => {
      console.error(`[QueueProcessor] Job ${jobId} processing failed:`, error.message);
    });
  }

  /**
   * Start polling for pending jobs
   */
  public startPolling(intervalMs?: number): void {
    if (this.isPolling) {
      console.log('Queue processor already polling');
      return;
    }

    if (intervalMs) {
      this.pollingIntervalMs = intervalMs;
    }

    this.isPolling = true;
    console.log(`🔄 Starting queue polling (interval: ${this.pollingIntervalMs}ms)`);
    this.emit('polling:started');

    // Start cleanup timer
    this.startCleanupTimer();

    // Process immediately, then start interval
    this.processNextJob().catch(error => {
      console.error('Error in initial job processing:', error);
      this.emit('error', error as Error);
    });

    this.pollingTimer = setInterval(() => {
      this.processNextJob().catch(error => {
        console.error('Error in polling job processing:', error);
        this.emit('error', error as Error);
      });
    }, this.pollingIntervalMs);
  }

  /**
   * Stop polling for jobs
   */
  public stopPolling(): void {
    if (!this.isPolling) {
      return;
    }

    console.log('⏹️ Stopping queue polling');
    this.isPolling = false;

    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }

    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    // Clear current job timeout if any
    if (this.currentJobTimeout) {
      clearTimeout(this.currentJobTimeout);
      this.currentJobTimeout = null;
    }

    this.emit('polling:stopped');
  }

  /**
   * Check if processor is currently polling
   */
  public isRunning(): boolean {
    return this.isPolling;
  }

  /**
   * Check if processor is currently processing a job
   */
  public isCurrentlyProcessing(): boolean {
    return this.isProcessing;
  }

  /**
   * Get the currently processing job
   */
  public getCurrentJob(): Job | null {
    return this.currentJob;
  }

  /**
   * Process the next pending job
   * Only processes one job at a time (sequential)
   */
  public async processNextJob(): Promise<boolean> {
    // Skip if already processing a job (sequential processing)
    if (this.isProcessing) {
      return false;
    }

    try {
      // Get pending jobs
      const pendingJobs = await getPendingJobs();

      if (pendingJobs.length === 0) {
        return false;
      }

      // Get the oldest pending job
      const job = pendingJobs[0];

      // Try to claim the job atomically
      const claimedJob = await claimJob(job.id);

      if (!claimedJob) {
        // Job was claimed by another process or status changed
        return false;
      }

      // Process the claimed job
      await this.processJob(claimedJob);
      return true;
    } catch (error) {
      console.error('Error processing next job:', error);
      this.emit('error', error as Error);
      return false;
    }
  }

  /**
   * Process a single job through the pipeline
   * Delegates to jobProcessor for actual processing logic
   */
  private async processJob(job: Job): Promise<void> {
    this.isProcessing = true;
    this.currentJob = job;

    const oldStatus = job.status;
    this.emit('job:status-changed', job, oldStatus);
    this.emit('job:started', job);

    console.log(`📄 Processing job ${job.id} (${job.fileName})`);

    // Set job timeout as a safety net (jobProcessor has its own timeout too)
    this.currentJobTimeout = setTimeout(() => {
      this.handleJobTimeout(job);
    }, this.jobTimeoutMs);

    try {
      // Delegate to jobProcessor for actual processing
      await this.jobProcessor.processJob(job.id);

      // Clear timeout
      if (this.currentJobTimeout) {
        clearTimeout(this.currentJobTimeout);
        this.currentJobTimeout = null;
      }

      // Get the final job state
      const { getJob } = require('./jobService');
      const completedJob = await getJob(job.id);

      if (completedJob) {
        console.log(`✅ Job ${job.id} completed successfully`);
        this.emit('job:completed', completedJob);
        
        // Emit status change from MATCHING to COMPLETED
        this.emit('job:status-changed', completedJob, ProcessingStatus.MATCHING);
      }
    } catch (error) {
      // Clear timeout
      if (this.currentJobTimeout) {
        clearTimeout(this.currentJobTimeout);
        this.currentJobTimeout = null;
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Job ${job.id} failed:`, errorMessage);

      // JobProcessor already updates the job status to FAILED
      // Just get the current state and emit events
      const { getJob } = require('./jobService');
      const failedJob = await getJob(job.id);

      if (failedJob) {
        this.emit('job:failed', failedJob, error as Error);
        this.emit('job:status-changed', failedJob, ProcessingStatus.PROCESSING);
      }
    } finally {
      this.isProcessing = false;
      this.currentJob = null;
    }
  }

  /**
   * Handle job timeout
   */
  private async handleJobTimeout(job: Job): Promise<void> {
    console.error(`⏱️ Job ${job.id} timed out after ${this.jobTimeoutMs}ms`);

    const failedJob = await updateJobStatus(job.id, ProcessingStatus.FAILED, {
      error: `Job timed out after ${this.jobTimeoutMs}ms`,
    });

    if (failedJob) {
      this.emit('job:timeout', failedJob);
      this.emit('job:failed', failedJob, new Error('Job timeout'));
      this.emit('job:status-changed', failedJob, ProcessingStatus.PROCESSING);
    }

    this.isProcessing = false;
    this.currentJob = null;
    this.currentJobTimeout = null;
  }

  /**
   * Start cleanup timer for old jobs
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(async () => {
      try {
        const deletedCount = await cleanupOldJobs(24); // Clean jobs older than 24 hours
        if (deletedCount > 0) {
          console.log(`🧹 Cleaned up ${deletedCount} old jobs`);
        }
      } catch (error) {
        console.error('Error cleaning up old jobs:', error);
        this.emit('error', error as Error);
      }
    }, CLEANUP_INTERVAL_MS);
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check for stale processing jobs (jobs that have been processing too long)
   * This can happen if the server crashes during processing
   */
  public async checkStaleJobs(maxProcessingTimeMs: number = DEFAULT_JOB_TIMEOUT_MS): Promise<number> {
    try {
      const processingJobs = await getProcessingJobs();
      const now = new Date();
      let staleCount = 0;

      for (const job of processingJobs) {
        const processingTime = now.getTime() - job.updatedAt.getTime();

        if (processingTime > maxProcessingTimeMs) {
          console.log(`⚠️ Found stale job ${job.id} (processing for ${processingTime}ms)`);

          await updateJobStatus(job.id, ProcessingStatus.FAILED, {
            error: `Job stuck in processing state for too long (${processingTime}ms)`,
          });

          staleCount++;
        }
      }

      if (staleCount > 0) {
        console.log(`🔄 Reset ${staleCount} stale jobs to FAILED state`);
      }

      return staleCount;
    } catch (error) {
      console.error('Error checking stale jobs:', error);
      this.emit('error', error as Error);
      return 0;
    }
  }
}

// Singleton instance
let queueProcessor: QueueProcessor | null = null;

/**
 * Get or create the queue processor singleton
 */
export function getQueueProcessor(
  pollingIntervalMs?: number,
  jobTimeoutMs?: number
): QueueProcessor {
  if (!queueProcessor) {
    queueProcessor = new QueueProcessor(pollingIntervalMs, jobTimeoutMs);
  }
  return queueProcessor;
}

/**
 * Reset the queue processor singleton (useful for testing)
 */
export function resetQueueProcessor(): void {
  if (queueProcessor) {
    queueProcessor.stopPolling();
    queueProcessor = null;
  }
}
