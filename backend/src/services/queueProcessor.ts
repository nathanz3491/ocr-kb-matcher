import { EventEmitter } from 'events';
import { ProcessingStatus, Job } from '../../../shared/types';
import {
  getPendingJobs,
  claimJob,
  updateJobStatus,
  cleanupOldJobs,
  reclaimStaleJobs,
} from './jobService';
import { JobProcessor } from './jobProcessor';
import { ProcessingStep } from '../types/worker';
import { logger } from '../lib/logger';

const DEFAULT_JOB_TIMEOUT_MS = 5 * 60 * 1000;
const DEFAULT_POLLING_INTERVAL_MS = 5000;
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000;

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

  private setupJobProcessorListeners(): void {
    this.jobProcessor.on('step:completed', (jobId: string, step: ProcessingStep, durationMs: number) => {
      logger.debug({ jobId, step, durationMs }, 'Processing step completed');
    });

    this.jobProcessor.on('checkpoint:saved', (jobId: string, _ocrText: string) => {
      logger.debug({ jobId }, 'OCR checkpoint saved');
    });

    this.jobProcessor.on('processing:completed', async (jobId: string) => {
      logger.info({ jobId }, 'Job processing completed');
    });

    this.jobProcessor.on('processing:failed', (jobId: string, error: Error) => {
      logger.error({ jobId, err: error }, 'Job processing failed');
    });
  }

  public startPolling(intervalMs?: number): void {
    if (this.isPolling) {
      logger.debug('Queue processor already polling');
      return;
    }

    if (intervalMs) {
      this.pollingIntervalMs = intervalMs;
    }

    this.isPolling = true;
    logger.info({ pollingIntervalMs: this.pollingIntervalMs }, 'Queue polling started');
    this.emit('polling:started');

    this.startCleanupTimer();

    this.processNextJob().catch(error => {
      logger.error({ err: error }, 'Error in initial job processing');
      this.emit('error', error as Error);
    });

    this.pollingTimer = setInterval(() => {
      this.processNextJob().catch(error => {
        logger.error({ err: error }, 'Error in polling job processing');
        this.emit('error', error as Error);
      });
    }, this.pollingIntervalMs);
  }

  public stopPolling(): void {
    if (!this.isPolling) {
      return;
    }

    logger.info('Stopping queue polling');
    this.isPolling = false;

    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }

    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    if (this.currentJobTimeout) {
      clearTimeout(this.currentJobTimeout);
      this.currentJobTimeout = null;
    }

    this.emit('polling:stopped');
  }

  public isRunning(): boolean {
    return this.isPolling;
  }

  public isCurrentlyProcessing(): boolean {
    return this.isProcessing;
  }

  public getCurrentJob(): Job | null {
    return this.currentJob;
  }

  public async processNextJob(): Promise<boolean> {
    if (this.isProcessing) {
      return false;
    }

    try {
      const pendingJobs = await getPendingJobs();

      if (pendingJobs.length === 0) {
        return false;
      }

      const job = pendingJobs[0];
      const workerId = `queue-processor-${process.pid}`;
      const claimedJob = await claimJob(job.id, workerId);

      if (!claimedJob) {
        return false;
      }

      await this.processJob(claimedJob);
      return true;
    } catch (error) {
      logger.error({ err: error }, 'Error processing next job');
      this.emit('error', error as Error);
      return false;
    }
  }

  private async processJob(job: Job): Promise<void> {
    this.isProcessing = true;
    this.currentJob = job;

    const oldStatus = job.status;
    this.emit('job:status-changed', job, oldStatus);
    this.emit('job:started', job);

    logger.info({ jobId: job.id, fileName: job.fileName }, 'Processing job');

    this.currentJobTimeout = setTimeout(() => {
      this.handleJobTimeout(job);
    }, this.jobTimeoutMs);

    try {
      await this.jobProcessor.processJob(job.id);

      if (this.currentJobTimeout) {
        clearTimeout(this.currentJobTimeout);
        this.currentJobTimeout = null;
      }

      const { getJob } = require('./jobService');
      const completedJob = await getJob(job.id);

      if (completedJob) {
        logger.info({ jobId: job.id }, 'Job completed successfully');
        this.emit('job:completed', completedJob);

        this.emit('job:status-changed', completedJob, ProcessingStatus.MATCHING);
      }
    } catch (error) {
      if (this.currentJobTimeout) {
        clearTimeout(this.currentJobTimeout);
        this.currentJobTimeout = null;
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error({ jobId: job.id, err: error }, 'Job failed');

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

  private async handleJobTimeout(job: Job): Promise<void> {
    logger.error({ jobId: job.id, jobTimeoutMs: this.jobTimeoutMs }, 'Job timed out');

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

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(async () => {
      try {
        const deletedCount = await cleanupOldJobs(24);
        if (deletedCount > 0) {
          logger.info({ deletedCount }, 'Cleaned up old jobs');
        }
      } catch (error) {
        logger.error({ err: error }, 'Error cleaning up old jobs');
        this.emit('error', error as Error);
      }
    }, CLEANUP_INTERVAL_MS);
  }

  public async checkStaleJobs(maxProcessingTimeMs: number = DEFAULT_JOB_TIMEOUT_MS): Promise<number> {
    try {
      const reclaimed = await reclaimStaleJobs(
        maxProcessingTimeMs,
        3,
        `queue-processor-${process.pid}`
      );

      if (reclaimed.length > 0) {
        logger.info(
          { staleCount: reclaimed.length, ids: reclaimed.map(j => j.id) },
          `Reclaimed ${reclaimed.length} stale job(s) — reset to PENDING for re-processing`
        );
      }

      return reclaimed.length;
    } catch (error) {
      logger.error({ err: error }, 'Error checking stale jobs');
      this.emit('error', error as Error);
      return 0;
    }
  }
}

let queueProcessor: QueueProcessor | null = null;

export function getQueueProcessor(
  pollingIntervalMs?: number,
  jobTimeoutMs?: number
): QueueProcessor {
  if (!queueProcessor) {
    queueProcessor = new QueueProcessor(pollingIntervalMs, jobTimeoutMs);
  }
  return queueProcessor;
}

export function resetQueueProcessor(): void {
  if (queueProcessor) {
    queueProcessor.stopPolling();
    queueProcessor = null;
  }
}
