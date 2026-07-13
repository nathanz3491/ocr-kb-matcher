/**
 * SQLite database connection and schema initialization.
 *
 * Uses better-sqlite3 (synchronous, file-based, no separate server).
 * WAL mode for better concurrent read performance.
 * All writes go through prepared statements for SQL injection prevention.
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'app.db');

let db: Database.Database | null = null;

/**
 * Get or create the singleton database connection.
 * Initializes schema on first call.
 */
export function getDb(): Database.Database {
  if (db) return db;

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  db = new Database(DB_PATH);

  // Performance: WAL mode allows concurrent reads during writes
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');

  initializeSchema(db);

  return db;
}

/**
 * Close the database connection. Useful for graceful shutdown and testing.
 */
export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}

/**
 * Run all CREATE TABLE IF NOT EXISTS statements.
 * Idempotent — safe to call multiple times.
 */
function initializeSchema(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      account_type TEXT NOT NULL DEFAULT 'student',
      email_verified INTEGER NOT NULL DEFAULT 0,
      email_verification_code TEXT,
      email_verification_expires INTEGER,
      parent_code TEXT,
      parent_code_expires INTEGER,
      date_of_birth TEXT,
      requires_parental_consent INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      settings TEXT NOT NULL DEFAULT '{}',
      tier TEXT,
      subscription_started_at TEXT,
      subscription_expires_at TEXT,
      role TEXT DEFAULT 'user',
      usage TEXT
    );

    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      current_step TEXT,
      file_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      ocr_text TEXT,
      ocr_confidence REAL,
      results TEXT,
      graph_data TEXT,
      error TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      completed_at TEXT,
      job_type TEXT,
      questions TEXT,
      question_results TEXT,
      wrong_results TEXT,
      wrong_question_indices TEXT,
      claimed_by TEXT,
      claimed_at TEXT,
      attempts INTEGER DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
    CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON jobs(user_id);

    CREATE TABLE IF NOT EXISTS graph_nodes (
      id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      domain TEXT NOT NULL,
      description TEXT,
      prerequisites TEXT DEFAULT '[]',
      next_steps TEXT DEFAULT '[]',
      x REAL,
      y REAL,
      sources TEXT DEFAULT '[]',
      unit TEXT,
      time_period TEXT,
      PRIMARY KEY (id, user_id)
    );

    CREATE INDEX IF NOT EXISTS idx_graph_nodes_user ON graph_nodes(user_id);

    CREATE TABLE IF NOT EXISTS graph_edges (
      id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      source TEXT NOT NULL,
      target TEXT NOT NULL,
      label TEXT,
      sources TEXT DEFAULT '[]',
      PRIMARY KEY (id, user_id)
    );

    CREATE INDEX IF NOT EXISTS idx_graph_edges_user ON graph_edges(user_id);

    CREATE TABLE IF NOT EXISTS graph_metadata (
      user_id TEXT PRIMARY KEY,
      version INTEGER NOT NULL DEFAULT 1,
      last_updated TEXT NOT NULL,
      statistics TEXT NOT NULL DEFAULT '{}',
      job_contributions TEXT NOT NULL DEFAULT '{}'
    );

    CREATE TABLE IF NOT EXISTS flashcard_sets (
      node_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      node_title TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'General',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (node_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS flashcards (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      node_id TEXT NOT NULL,
      front TEXT NOT NULL,
      back TEXT NOT NULL,
      hint TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_flashcards_node ON flashcards(user_id, node_id);

    CREATE TABLE IF NOT EXISTS reviews (
      node_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      last_reviewed TEXT NOT NULL,
      next_review_date TEXT NOT NULL,
      review_count INTEGER NOT NULL DEFAULT 0,
      interval_days INTEGER NOT NULL DEFAULT 0,
      ease_factor REAL NOT NULL DEFAULT 2.5,
      PRIMARY KEY (node_id, user_id)
    );

    CREATE INDEX IF NOT EXISTS idx_reviews_user ON reviews(user_id);

    CREATE TABLE IF NOT EXISTS quiz_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      job_id TEXT NOT NULL,
      questions TEXT NOT NULL,
      created_at TEXT NOT NULL,
      targeted_nodes TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_quiz_sessions_user ON quiz_sessions(user_id);

    CREATE TABLE IF NOT EXISTS quiz_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      user_id TEXT,
      job_id TEXT NOT NULL,
      score REAL NOT NULL,
      total_questions INTEGER NOT NULL,
      answers TEXT NOT NULL,
      completed_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_quiz_results_session ON quiz_results(session_id);

    CREATE TABLE IF NOT EXISTS chat_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      messages TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_chat_sessions_user ON chat_sessions(user_id);

    CREATE TABLE IF NOT EXISTS subscriptions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      tier TEXT NOT NULL,
      started_at TEXT NOT NULL,
      expires_at TEXT,
      payment_provider TEXT,
      payment_id TEXT,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);

    CREATE TABLE IF NOT EXISTS webhook_events (
      id TEXT PRIMARY KEY,
      provider TEXT NOT NULL,
      event_type TEXT NOT NULL,
      payload TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      action TEXT NOT NULL,
      resource TEXT,
      resource_id TEXT,
      details TEXT,
      ip TEXT,
      user_agent TEXT,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id);
    CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);

    CREATE TABLE IF NOT EXISTS trial_attempts (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      device_fingerprint TEXT NOT NULL,
      ip TEXT,
      tier TEXT NOT NULL,
      started_at TEXT NOT NULL,
      expires_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_trial_email ON trial_attempts(email);
    CREATE INDEX IF NOT EXISTS idx_trial_fingerprint ON trial_attempts(device_fingerprint);

    CREATE TABLE IF NOT EXISTS study_materials (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      node_id TEXT NOT NULL,
      job_id TEXT,
      type TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_study_materials_user ON study_materials(user_id);
    CREATE INDEX IF NOT EXISTS idx_study_materials_lookup ON study_materials(user_id, node_id, type);

    CREATE TABLE IF NOT EXISTS user_progress (
      user_id TEXT NOT NULL,
      node_id TEXT NOT NULL,
      mastery_level REAL NOT NULL DEFAULT 0,
      last_reviewed TEXT,
      total_reviews INTEGER NOT NULL DEFAULT 0,
      known INTEGER NOT NULL DEFAULT 0,
      learned_at TEXT,
      PRIMARY KEY (user_id, node_id)
    );
    CREATE INDEX IF NOT EXISTS idx_user_progress_known ON user_progress(user_id, known);

    CREATE TABLE IF NOT EXISTS wrong_question_reviews (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      node_id TEXT NOT NULL,
      question TEXT NOT NULL,
      answer TEXT NOT NULL DEFAULT '',
      explanation TEXT,
      reviewed_at TEXT NOT NULL,
      question_index INTEGER NOT NULL DEFAULT 0,
      matched_node_ids TEXT NOT NULL DEFAULT '[]',
      next_review_date TEXT,
      review_count INTEGER NOT NULL DEFAULT 0,
      interval_days INTEGER NOT NULL DEFAULT 0,
      ease_factor REAL NOT NULL DEFAULT 2.5,
      original_job_id TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_wrong_q_reviews_user ON wrong_question_reviews(user_id);
    CREATE INDEX IF NOT EXISTS idx_wrong_q_reviews_due ON wrong_question_reviews(user_id, next_review_date);
  `);
}

/**
 * Reset the database connection (useful for testing).
 */
export function resetDb(): void {
  closeDb();
}
