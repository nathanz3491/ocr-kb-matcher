import { getDb } from '../db/sqlite';
import * as fs from 'fs';
import * as path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');

export interface QuizSession {
  id: string;
  jobId: string;
  questions: QuizQuestion[];
  createdAt: string;
  targetedNodes?: string[];
}

export interface QuizQuestion {
  id: string;
  type: 'multiple_choice' | 'fill_in_blank' | 'true_false' | 'matching';
  question: string;
  options?: string[];
  correctAnswer?: number;
  explanation: string;
  items?: string[];
  matches?: string[];
  correctMatches?: string[];
}

export interface QuizResult {
  sessionId: string;
  jobId: string;
  score: number;
  totalQuestions: number;
  answers: Array<{
    questionId: string;
    selectedAnswer: number;
    correct: boolean;
  }>;
  completedAt: string;
}

// ── One-time JSON → SQLite migration ──────────────────────────────────────

let migrated = false;

function migrateFromJson(): void {
  if (migrated) return;
  migrated = true;

  const db = getDb();

  const insertSession = db.prepare(
    'INSERT OR IGNORE INTO quiz_sessions (id, user_id, job_id, questions, created_at, targeted_nodes) VALUES (?, ?, ?, ?, ?, ?)'
  );

  const insertResult = db.prepare(
    'INSERT OR IGNORE INTO quiz_results (session_id, user_id, job_id, score, total_questions, answers, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );

  let files: string[];
  try {
    files = fs.readdirSync(DATA_DIR);
  } catch {
    return; // data dir doesn't exist yet — nothing to migrate
  }

  for (const file of files) {
    // ── Quiz sessions ──
    if (file.startsWith('quiz-sessions-') && file.endsWith('.json')) {
      const filePath = path.join(DATA_DIR, file);
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const sessions: Record<string, QuizSession> = JSON.parse(content);
        const userIdRaw = file.replace('quiz-sessions-', '').replace('.json', '');
        const userId = userIdRaw || null;

        const run = db.transaction(() => {
          for (const [id, session] of Object.entries(sessions)) {
            insertSession.run(
              id, userId, session.jobId,
              JSON.stringify(session.questions),
              session.createdAt,
              session.targetedNodes ? JSON.stringify(session.targetedNodes) : null
            );
          }
        });
        run();

        fs.renameSync(filePath, filePath + '.migrated');
        console.log(`[quizStorage] Migrated quiz sessions: ${file} → ${file}.migrated`);
      } catch (err) {
        console.warn(`[quizStorage] Skipping sessions file ${file}:`, (err as Error).message);
      }
    }

    // ── Quiz results ──
    if (file.startsWith('quiz-results-') && file.endsWith('.json')) {
      const filePath = path.join(DATA_DIR, file);
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const results: QuizResult[] = JSON.parse(content);
        const userIdRaw = file.replace('quiz-results-', '').replace('.json', '');
        const userId = userIdRaw || null;

        const run = db.transaction(() => {
          for (const result of results) {
            insertResult.run(
              result.sessionId, userId, result.jobId,
              result.score, result.totalQuestions,
              JSON.stringify(result.answers),
              result.completedAt
            );
          }
        });
        run();

        fs.renameSync(filePath, filePath + '.migrated');
        console.log(`[quizStorage] Migrated quiz results: ${file} → ${file}.migrated`);
      } catch (err) {
        console.warn(`[quizStorage] Skipping results file ${file}:`, (err as Error).message);
      }
    }
  }
}

// ── Public API (signatures identical to original json-based module) ────────

/** Load all quiz sessions for a user. Returns empty object if none exist. */
export async function loadQuizSessions(userId?: string): Promise<Record<string, QuizSession>> {
  migrateFromJson();
  const db = getDb();
  const uid = userId || null;

  const rows = uid
    ? db.prepare('SELECT * FROM quiz_sessions WHERE user_id = ?').all(uid) as any[]
    : db.prepare('SELECT * FROM quiz_sessions WHERE user_id IS NULL').all() as any[];

  const sessions: Record<string, QuizSession> = {};
  for (const row of rows) {
    sessions[row.id] = {
      id: row.id,
      jobId: row.job_id,
      questions: JSON.parse(row.questions),
      createdAt: row.created_at,
      targetedNodes: row.targeted_nodes ? JSON.parse(row.targeted_nodes) : undefined,
    };
  }
  return sessions;
}

/**
 * Bulk-save all quiz sessions for a user.
 * Existing sessions for this user are deleted first (full replacement).
 */
export async function saveQuizSessions(sessions: Record<string, QuizSession>, userId?: string): Promise<void> {
  migrateFromJson();
  const db = getDb();
  const uid = userId || null;

  const deleteStmt = uid
    ? db.prepare('DELETE FROM quiz_sessions WHERE user_id = ?')
    : db.prepare('DELETE FROM quiz_sessions WHERE user_id IS NULL');

  const insertStmt = db.prepare(
    'INSERT INTO quiz_sessions (id, user_id, job_id, questions, created_at, targeted_nodes) VALUES (?, ?, ?, ?, ?, ?)'
  );

  const run = db.transaction(() => {
    if (uid) {
      deleteStmt.run(uid);
    } else {
      deleteStmt.run();
    }
    for (const [id, session] of Object.entries(sessions)) {
      insertStmt.run(
        id, uid, session.jobId,
        JSON.stringify(session.questions),
        session.createdAt,
        session.targetedNodes ? JSON.stringify(session.targetedNodes) : null
      );
    }
  });
  run();
}

/** Load all quiz results for a user. Returns empty array if none exist. */
export async function loadQuizResults(userId?: string): Promise<QuizResult[]> {
  migrateFromJson();
  const db = getDb();
  const uid = userId || null;

  const rows = uid
    ? db.prepare('SELECT * FROM quiz_results WHERE user_id = ? ORDER BY id').all(uid) as any[]
    : db.prepare('SELECT * FROM quiz_results WHERE user_id IS NULL ORDER BY id').all() as any[];

  return rows.map(row => ({
    sessionId: row.session_id,
    jobId: row.job_id,
    score: row.score,
    totalQuestions: row.total_questions,
    answers: JSON.parse(row.answers),
    completedAt: row.completed_at,
  }));
}

/**
 * Bulk-save all quiz results for a user.
 * Existing results for this user are deleted first (full replacement).
 */
export async function saveQuizResults(results: QuizResult[], userId?: string): Promise<void> {
  migrateFromJson();
  const db = getDb();
  const uid = userId || null;

  const deleteStmt = uid
    ? db.prepare('DELETE FROM quiz_results WHERE user_id = ?')
    : db.prepare('DELETE FROM quiz_results WHERE user_id IS NULL');

  const insertStmt = db.prepare(
    'INSERT INTO quiz_results (session_id, user_id, job_id, score, total_questions, answers, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );

  const run = db.transaction(() => {
    if (uid) {
      deleteStmt.run(uid);
    } else {
      deleteStmt.run();
    }
    for (const result of results) {
      insertStmt.run(
        result.sessionId, uid, result.jobId,
        result.score, result.totalQuestions,
        JSON.stringify(result.answers),
        result.completedAt
      );
    }
  });
  run();
}
