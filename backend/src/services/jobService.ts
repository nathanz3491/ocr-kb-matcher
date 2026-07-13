/**
 * Job creation service - SQLite-based implementation
 */

import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { ProcessingStatus, Job, JobType } from '../../../shared/types';
import { getDb } from '../db/sqlite';

export const QUEUE_DIR = path.join(process.cwd(), 'queue');
export const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

export interface FileInfo {
  originalname: string;
  filename: string;
  mimetype: string;
  size: number;
  path: string;
  jobType?: JobType;
  wrongQuestionIndices?: string;
}

function rowToJob(row: Record<string, unknown>): Job {
  return {
    id: row.id as string,
    userId: row.user_id as string | undefined,
    status: row.status as ProcessingStatus,
    currentStep: row.current_step as string | undefined,
    fileName: row.file_name as string,
    filePath: row.file_path as string,
    ocrText: row.ocr_text as string | undefined,
    ocrConfidence: row.ocr_confidence as number | undefined,
    results: row.results ? JSON.parse(row.results as string) : undefined,
    graphData: row.graph_data ? JSON.parse(row.graph_data as string) : undefined,
    error: row.error as string | undefined,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
    completedAt: row.completed_at ? new Date(row.completed_at as string) : undefined,
    jobType: row.job_type as JobType | undefined,
    questions: row.questions ? JSON.parse(row.questions as string) : undefined,
    questionResults: row.question_results ? JSON.parse(row.question_results as string) : undefined,
    wrongResults: row.wrong_results ? JSON.parse(row.wrong_results as string) : undefined,
    wrongQuestionIndices: row.wrong_question_indices as string | undefined,
  };
}

export async function createJob(
  fileInfo: FileInfo,
  jobType?: JobType,
  wrongQuestionIndices?: string,
  userId?: string
): Promise<Job> {
  const db = getDb();
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

  db.prepare(`
    INSERT INTO jobs
      (id, user_id, status, file_name, file_path, created_at, updated_at, job_type, wrong_question_indices)
    VALUES
      (@id, @user_id, @status, @file_name, @file_path, @created_at, @updated_at, @job_type, @wrong_question_indices)
  `).run({
    id: job.id,
    user_id: userId ?? null,
    status: job.status,
    file_name: job.fileName,
    file_path: job.filePath,
    created_at: job.createdAt.toISOString(),
    updated_at: job.updatedAt.toISOString(),
    job_type: job.jobType ?? null,
    wrong_question_indices: job.wrongQuestionIndices ?? null,
  });

  return job;
}

export async function createJobs(
  fileInfos: FileInfo[],
  jobType?: JobType,
  wrongQuestionIndices?: string,
  userId?: string
): Promise<Job[]> {
  const db = getDb();
  const now = new Date();
  const jobs: Job[] = [];

  const stmt = db.prepare(`
    INSERT INTO jobs
      (id, user_id, status, file_name, file_path, created_at, updated_at, job_type, wrong_question_indices)
    VALUES
      (@id, @user_id, @status, @file_name, @file_path, @created_at, @updated_at, @job_type, @wrong_question_indices)
  `);

  const tx = db.transaction(() => {
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

      stmt.run({
        id: job.id,
        user_id: userId ?? null,
        status: job.status,
        file_name: job.fileName,
        file_path: job.filePath,
        created_at: job.createdAt.toISOString(),
        updated_at: job.updatedAt.toISOString(),
        job_type: job.jobType ?? null,
        wrong_question_indices: job.wrongQuestionIndices ?? null,
      });

      jobs.push(job);
    }
  });

  tx();
  return jobs;
}

export async function ensureUploadsDir(): Promise<void> {
  const fs = await import('fs/promises');
  try {
    await fs.access(UPLOADS_DIR);
  } catch {
    await fs.mkdir(UPLOADS_DIR, { recursive: true });
  }
}

export async function ensureQueueDir(): Promise<void> {
  // No-op: queue dir was for JSON files, not needed for SQLite
}

export async function getJob(jobId: string): Promise<Job | null> {
  const db = getDb();
  const row = db.prepare('SELECT * FROM jobs WHERE id = ?').get(jobId) as Record<string, unknown> | undefined;
  return row ? rowToJob(row) : null;
}

export async function updateJobStatus(
  jobId: string,
  status: ProcessingStatus,
  updates?: Partial<Job>
): Promise<Job | null> {
  const db = getDb();
  const job = await getJob(jobId);
  if (!job) return null;

  const updatedJob: Job = {
    ...job,
    status,
    updatedAt: new Date(),
    ...updates,
  };

  if (status === ProcessingStatus.COMPLETED || status === ProcessingStatus.FAILED) {
    updatedJob.completedAt = new Date();
  }

  db.prepare(`
    UPDATE jobs SET
      status = @status,
      current_step = @current_step,
      ocr_text = @ocr_text,
      ocr_confidence = @ocr_confidence,
      results = @results,
      graph_data = @graph_data,
      error = @error,
      updated_at = @updated_at,
      completed_at = @completed_at,
      job_type = @job_type,
      questions = @questions,
      question_results = @question_results,
      wrong_results = @wrong_results,
      wrong_question_indices = @wrong_question_indices
    WHERE id = @id
  `).run({
    id: updatedJob.id,
    status: updatedJob.status,
    current_step: updatedJob.currentStep ?? null,
    ocr_text: updatedJob.ocrText ?? null,
    ocr_confidence: updatedJob.ocrConfidence ?? null,
    results: updatedJob.results ? JSON.stringify(updatedJob.results) : null,
    graph_data: updatedJob.graphData ? JSON.stringify(updatedJob.graphData) : null,
    error: updatedJob.error ?? null,
    updated_at: updatedJob.updatedAt.toISOString(),
    completed_at: updatedJob.completedAt ? updatedJob.completedAt.toISOString() : null,
    job_type: updatedJob.jobType ?? null,
    questions: updatedJob.questions ? JSON.stringify(updatedJob.questions) : null,
    question_results: updatedJob.questionResults ? JSON.stringify(updatedJob.questionResults) : null,
    wrong_results: updatedJob.wrongResults ? JSON.stringify(updatedJob.wrongResults) : null,
    wrong_question_indices: updatedJob.wrongQuestionIndices ?? null,
  });

  return updatedJob;
}

export async function getAllJobs(): Promise<Job[]> {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM jobs ORDER BY created_at ASC').all() as Record<string, unknown>[];
  return rows.map(rowToJob);
}

export async function getPendingJobs(): Promise<Job[]> {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM jobs WHERE status = 'pending' ORDER BY created_at ASC").all() as Record<string, unknown>[];
  return rows.map(rowToJob);
}

export async function getProcessingJobs(): Promise<Job[]> {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM jobs WHERE status = 'processing' ORDER BY created_at ASC").all() as Record<string, unknown>[];
  return rows.map(rowToJob);
}

/**
 * Atomically claim a job for processing.
 *
 * Uses SQLite's UPDATE ... RETURNING * for a single-statement atomic claim:
 * - Only claims jobs with status = 'pending'
 * - Sets claimed_by, claimed_at, increments attempts counter
 * - Returns the claimed job or null if already claimed/missing
 *
 * This eliminates the race condition inherent in the old read-then-write
 * JSON pattern. SQLite's table-level locking ensures only one worker
 * succeeds per job.
 */
export async function claimJob(jobId: string, workerId?: string): Promise<Job | null> {
  const db = getDb();
  const now = new Date().toISOString();

  const row = db.prepare(`
    UPDATE jobs
    SET status = @processing,
        updated_at = @now,
        claimed_at = @now,
        claimed_by = @workerId,
        attempts = attempts + 1
    WHERE id = @id AND status = @pending
    RETURNING *
  `).get({
    id: jobId,
    processing: ProcessingStatus.PROCESSING,
    pending: ProcessingStatus.PENDING,
    now,
    workerId: workerId ?? null,
  }) as Record<string, unknown> | undefined;

  return row ? rowToJob(row) : null;
}

/**
 * Reclaim jobs that were claimed more than `staleThresholdMs` ago
 * and are still in 'processing' state.
 *
 * This handles the crash-recovery case: if a worker dies while holding
 * a job, the job will be stuck in 'processing'. After the threshold,
 * any worker can reclaim it.
 *
 * Uses a single atomic UPDATE with RETURNING * for safe concurrent reclaim.
 */
export async function reclaimStaleJobs(
  staleThresholdMs: number = 60 * 60 * 1000,
  maxAttempts: number = 3,
  reclaimingWorkerId?: string
): Promise<Job[]> {
  const db = getDb();
  const cutoff = new Date(Date.now() - staleThresholdMs).toISOString();
  const now = new Date().toISOString();

  const rows = db.prepare(`
    UPDATE jobs
    SET status = @pending,
        updated_at = @now,
        claimed_at = NULL,
        claimed_by = NULL,
        attempts = attempts + 1,
        error = @error
    WHERE status = @processing
      AND claimed_at IS NOT NULL
      AND claimed_at < @cutoff
      AND attempts < @maxAttempts
    RETURNING *
  `).all({
    processing: ProcessingStatus.PROCESSING,
    pending: ProcessingStatus.PENDING,
    now,
    cutoff,
    maxAttempts,
    error: `Claim timed out — reset to pending for re-claim by ${reclaimingWorkerId ?? 'another worker'}`,
  }) as Record<string, unknown>[];

  return rows.map(rowToJob);
}

export async function deleteJob(jobId: string): Promise<boolean> {
  const db = getDb();
  const result = db.prepare('DELETE FROM jobs WHERE id = ?').run(jobId);
  return result.changes > 0;
}

export async function getQueueStats(): Promise<{
  pending: number;
  processing: number;
  ocrComplete: number;
  matching: number;
  completed: number;
  failed: number;
  total: number;
}> {
  const db = getDb();
  const rows = db.prepare('SELECT status, COUNT(*) as cnt FROM jobs GROUP BY status').all() as { status: string; cnt: number }[];

  const counts: Record<string, number> = {};
  for (const r of rows) { counts[r.status] = r.cnt; }

  return {
    pending: counts[ProcessingStatus.PENDING] || 0,
    processing: counts[ProcessingStatus.PROCESSING] || 0,
    ocrComplete: counts[ProcessingStatus.OCR_COMPLETE] || 0,
    matching: counts[ProcessingStatus.MATCHING] || 0,
    completed: counts[ProcessingStatus.COMPLETED] || 0,
    failed: counts[ProcessingStatus.FAILED] || 0,
    total: rows.reduce((sum, r) => sum + r.cnt, 0),
  };
}

export async function cleanupOldJobs(maxAgeHours: number = 24): Promise<number> {
  const db = getDb();
  const cutoffTime = new Date();
  cutoffTime.setHours(cutoffTime.getHours() - maxAgeHours);
  const cutoff = cutoffTime.toISOString();

  const result = db.prepare(`
    DELETE FROM jobs
    WHERE status IN (@completed, @failed)
    AND (completed_at IS NOT NULL AND completed_at < @cutoff)
  `).run({
    completed: ProcessingStatus.COMPLETED,
    failed: ProcessingStatus.FAILED,
    cutoff,
  });

  return result.changes;
}
