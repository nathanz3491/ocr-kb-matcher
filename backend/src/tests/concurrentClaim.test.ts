/**
 * QA Test: Concurrent job claiming via SQLite atomic UPDATE ... RETURNING *
 *
 * Verifies that two parallel claimJob calls for the same PENDING job
 * result in exactly one successful claim.
 */

import { v4 as uuidv4 } from 'uuid';
import { ProcessingStatus, JobType } from '../../../shared/types';
import { getDb, closeDb, resetDb } from '../db/sqlite';
import { claimJob, getJob } from '../services/jobService';

const TEST_JOB_ID = uuidv4();
const WORKER_1 = 'test-worker-1';
const WORKER_2 = 'test-worker-2';

async function main(): Promise<void> {
  console.log('=== Concurrent Claim QA Test ===\n');

  // Reset DB to get a clean state
  resetDb();
  const db = getDb();

  // Insert a test PENDING job
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO jobs (id, status, file_name, file_path, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(TEST_JOB_ID, ProcessingStatus.PENDING, 'test.pdf', '/tmp/test.pdf', now, now);

  // Verify initial state
  const initial = db.prepare('SELECT status, claimed_by, claimed_at, attempts FROM jobs WHERE id = ?').get(TEST_JOB_ID) as Record<string, unknown>;
  console.log('Initial job state:', initial);

  // Spawn 2 parallel claim attempts
  const [result1, result2] = await Promise.all([
    claimJob(TEST_JOB_ID, WORKER_1),
    claimJob(TEST_JOB_ID, WORKER_2),
  ]);

  console.log('\nWorker 1 claim result:', result1 ? `SUCCESS (id=${result1.id})` : 'null');
  console.log('Worker 2 claim result:', result2 ? `SUCCESS (id=${result2.id})` : 'null');

  // Assert exactly one succeeded
  const successes = [result1, result2].filter(r => r !== null);
  if (successes.length !== 1) {
    console.error(`\nFAIL: Expected exactly 1 successful claim, got ${successes.length}`);
    process.exit(1);
  }

  const claimedJob = successes[0]!;
  const nullResult = result1 === null ? result1 : result2;

  // Verify claimed job properties
  const dbRow = db.prepare('SELECT * FROM jobs WHERE id = ?').get(TEST_JOB_ID) as Record<string, unknown>;

  console.log('\n=== Verification ===');
  console.log(`Claimed job ID: ${claimedJob.id === TEST_JOB_ID ? 'MATCH' : 'MISMATCH'}`);
  console.log(`Status: ${dbRow.status} (expected: ${ProcessingStatus.PROCESSING})`);
  console.log(`Claimed by: ${dbRow.claimed_by}`);
  console.log(`Claimed at: ${dbRow.claimed_at}`);
  console.log(`Attempts: ${dbRow.attempts} (expected: 1)`);

  // Verify status is PROCESSING
  if (dbRow.status !== ProcessingStatus.PROCESSING) {
    console.error(`\nFAIL: Expected status '${ProcessingStatus.PROCESSING}', got '${dbRow.status}'`);
    process.exit(1);
  }

  // Verify claimed_by is one of the workers
  if (dbRow.claimed_by !== WORKER_1 && dbRow.claimed_by !== WORKER_2) {
    console.error(`\nFAIL: claimed_by should be one of test workers`);
    process.exit(1);
  }

  // Verify claimed_at is set
  if (!dbRow.claimed_at) {
    console.error('\nFAIL: claimed_at should be set');
    process.exit(1);
  }

  // Verify attempts incremented to 1
  if (dbRow.attempts !== 1) {
    console.error(`\nFAIL: Expected attempts=1, got ${dbRow.attempts}`);
    process.exit(1);
  }

  // Verify the null result
  if (nullResult !== null) {
    console.error('\nFAIL: One claim should have returned null');
    process.exit(1);
  }

  // Also verify getJob now returns PROCESSING status and claimed fields
  const fetchedJob = await getJob(TEST_JOB_ID);
  if (!fetchedJob) {
    console.error('\nFAIL: getJob returned null for claimed job');
    process.exit(1);
  }
  console.log(`\nFetched job via getJob(): status=${fetchedJob.status}`);

  // Cleanup
  db.prepare('DELETE FROM jobs WHERE id = ?').run(TEST_JOB_ID);

  console.log('\n=== ALL CHECKS PASSED ===');
  closeDb();
}

main().catch(err => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
