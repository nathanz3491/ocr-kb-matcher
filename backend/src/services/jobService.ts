/**
 * Job creation service
 * Handles job record creation and directory management
 */

import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { ProcessingStatus, Job, JobType } from '../../../shared/types';

// Queue directory for job status files
export const QUEUE_DIR = path.join(process.cwd(), 'queue');

// Uploads directory
export const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

/**
 * File information from multer upload
 */
export interface FileInfo {
  originalname: string;
  filename: string;
  mimetype: string;
  size: number;
  path: string;
  jobType?: JobType;
  wrongQuestionIndices?: string;
}

/**
 * Create job record for a single file
 */
export async function createJob(
  fileInfo: FileInfo,
  jobType?: JobType,
  wrongQuestionIndices?: string,
  userId?: string
): Promise<Job> {
  const now = new Date();
  const jobTypeValue = jobType ?? fileInfo.jobType ?? JobType.SINGLE;
  const job: Job = {
    id: uuidv4(),
    status: ProcessingStatus.PENDING,
    fileName: fileInfo.originalname,
    filePath: fileInfo.path,
    createdAt: now,
    updatedAt: now,
    jobType: jobTypeValue,
    wrongQuestionIndices: wrongQuestionIndices ?? fileInfo.wrongQuestionIndices,
    userId,
  };

  await ensureQueueDir();

  const jobFilePath = path.join(QUEUE_DIR, `${job.id}.json`);
  await fs.writeFile(jobFilePath, JSON.stringify(job, null, 2), 'utf-8');

  return job;
}

/**
 * Create job records for multiple files
 */
export async function createJobs(
  fileInfos: FileInfo[],
  jobType?: JobType,
  wrongQuestionIndices?: string,
  userId?: string
): Promise<Job[]> {
  await ensureQueueDir();

  const now = new Date();
  const jobs: Job[] = [];

  for (const fileInfo of fileInfos) {
    const jobTypeValue = jobType ?? fileInfo.jobType ?? JobType.SINGLE;
    const job: Job = {
      id: uuidv4(),
      status: ProcessingStatus.PENDING,
      fileName: fileInfo.originalname,
      filePath: fileInfo.path,
      createdAt: now,
      updatedAt: now,
      jobType: jobTypeValue,
      wrongQuestionIndices: wrongQuestionIndices ?? fileInfo.wrongQuestionIndices,
      userId,
    };

    const jobFilePath = path.join(QUEUE_DIR, `${job.id}.json`);
    await fs.writeFile(jobFilePath, JSON.stringify(job, null, 2), 'utf-8');

    jobs.push(job);
  }

  return jobs;
}

/**
 * Ensure uploads directory exists
 */
export async function ensureUploadsDir(): Promise<void> {
  try {
    await fs.access(UPLOADS_DIR);
  } catch {
    await fs.mkdir(UPLOADS_DIR, { recursive: true });
  }
}

/**
 * Ensure queue directory exists
 */
export async function ensureQueueDir(): Promise<void> {
  try {
    await fs.access(QUEUE_DIR);
  } catch {
    await fs.mkdir(QUEUE_DIR, { recursive: true });
  }
}

/**
 * Get job by ID
 */
export async function getJob(jobId: string): Promise<Job | null> {
  const jobFilePath = path.join(QUEUE_DIR, `${jobId}.json`);

  try {
    const content = await fs.readFile(jobFilePath, 'utf-8');
    return JSON.parse(content) as Job;
  } catch {
    return null;
  }
}

/**
 * Update job status
 */
export async function updateJobStatus(
  jobId: string,
  status: ProcessingStatus,
  updates?: Partial<Job>
): Promise<Job | null> {
  const job = await getJob(jobId);
  if (!job) {
    return null;
  }

  const updatedJob: Job = {
    ...job,
    status,
    updatedAt: new Date(),
    ...updates,
  };

  if (status === ProcessingStatus.COMPLETED || status === ProcessingStatus.FAILED) {
    updatedJob.completedAt = new Date();
  }

  const jobFilePath = path.join(QUEUE_DIR, `${job.id}.json`);
  await fs.writeFile(jobFilePath, JSON.stringify(updatedJob, null, 2), 'utf-8');

  return updatedJob;
}

/**
 * Get all jobs from queue directory
 */
export async function getAllJobs(): Promise<Job[]> {
  try {
    await ensureQueueDir();
    const files = await fs.readdir(QUEUE_DIR);
    const jobFiles = files.filter(file => file.endsWith('.json'));

    const jobs: Job[] = [];
    for (const file of jobFiles) {
      const jobFilePath = path.join(QUEUE_DIR, file);
      try {
        const content = await fs.readFile(jobFilePath, 'utf-8');
        const job = JSON.parse(content) as Job;
        job.createdAt = new Date(job.createdAt);
        job.updatedAt = new Date(job.updatedAt);
        if (job.completedAt) {
          job.completedAt = new Date(job.completedAt);
        }
        jobs.push(job);
      } catch (error) {
        console.error(`Error reading job file ${file}:`, error);
      }
    }

    return jobs.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  } catch (error) {
    console.error('Error reading jobs:', error);
    return [];
  }
}

/**
 * Get all pending jobs
 */
export async function getPendingJobs(): Promise<Job[]> {
  const jobs = await getAllJobs();
  return jobs.filter(job => job.status === ProcessingStatus.PENDING);
}

/**
 * Get all processing jobs
 */
export async function getProcessingJobs(): Promise<Job[]> {
  const jobs = await getAllJobs();
  return jobs.filter(job => job.status === ProcessingStatus.PROCESSING);
}

/**
 * Atomically claim a job for processing
 * Returns the job if successfully claimed, null if job is not pending or doesn't exist
 */
export async function claimJob(jobId: string): Promise<Job | null> {
  const jobFilePath = path.join(QUEUE_DIR, `${jobId}.json`);

  try {
    const content = await fs.readFile(jobFilePath, 'utf-8');
    const job = JSON.parse(content) as Job;

    if (job.status !== ProcessingStatus.PENDING) {
      return null;
    }

    const updatedJob: Job = {
      ...job,
      status: ProcessingStatus.PROCESSING,
      updatedAt: new Date(),
    };

    await fs.writeFile(jobFilePath, JSON.stringify(updatedJob, null, 2), 'utf-8');
    return updatedJob;
  } catch (error) {
    console.error(`Error claiming job ${jobId}:`, error);
    return null;
  }
}

/**
 * Delete a job by ID
 */
export async function deleteJob(jobId: string): Promise<boolean> {
  const jobFilePath = path.join(QUEUE_DIR, `${jobId}.json`);

  try {
    await fs.unlink(jobFilePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get queue statistics
 */
export async function getQueueStats(): Promise<{
  pending: number;
  processing: number;
  ocrComplete: number;
  matching: number;
  completed: number;
  failed: number;
  total: number;
}> {
  const jobs = await getAllJobs();

  return {
    pending: jobs.filter(j => j.status === ProcessingStatus.PENDING).length,
    processing: jobs.filter(j => j.status === ProcessingStatus.PROCESSING).length,
    ocrComplete: jobs.filter(j => j.status === ProcessingStatus.OCR_COMPLETE).length,
    matching: jobs.filter(j => j.status === ProcessingStatus.MATCHING).length,
    completed: jobs.filter(j => j.status === ProcessingStatus.COMPLETED).length,
    failed: jobs.filter(j => j.status === ProcessingStatus.FAILED).length,
    total: jobs.length,
  };
}

/**
 * Clean up old completed/failed jobs
 * @param maxAgeHours - Maximum age in hours (default: 24)
 */
export async function cleanupOldJobs(maxAgeHours: number = 24): Promise<number> {
  const jobs = await getAllJobs();
  const cutoffTime = new Date();
  cutoffTime.setHours(cutoffTime.getHours() - maxAgeHours);

  let deletedCount = 0;

  for (const job of jobs) {
    if (job.status !== ProcessingStatus.COMPLETED && job.status !== ProcessingStatus.FAILED) {
      continue;
    }

    const jobTime = job.completedAt || job.updatedAt;
    if (jobTime < cutoffTime) {
      const success = await deleteJob(job.id);
      if (success) {
        deletedCount++;
      }
    }
  }

  return deletedCount;
}
