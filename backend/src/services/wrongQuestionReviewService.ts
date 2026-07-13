import { getDb } from '../db/sqlite';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');

function getLegacyFileName(userId?: string): string {
  return userId
    ? `wrong-question-reviews-${userId}.json`
    : 'wrong-question-reviews.json';
}

export interface WrongQuestionReview {
  reviewId: string;
  questionText: string;
  questionIndex: number;
  matchedNodeIds: string[];
  lastReviewed: string;
  nextReviewDate: string;
  reviewCount: number;
  interval: number;
  easeFactor: number;
  originalJobId: string;
}

interface WrongQuestionReviewData {
  reviews: Record<string, WrongQuestionReview>;
}

export interface WrongQuestionResult {
  questionId: string;
  questionIndex: number;
  questionText: string;
  matchedNodes: Array<{ kbEntryId: string; confidence: number; reasoning: string }>;
}

// ── SM-2 Spacing Algorithm ─────────────────────────────────────────────────

function calculateNextReview(
  reviewCount: number,
  interval: number,
  easeFactor: number,
  quality: number
): { nextInterval: number; nextEaseFactor: number } {
  let newEaseFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (newEaseFactor < 1.3) newEaseFactor = 1.3;

  let newInterval: number;

  if (quality < 3) {
    newInterval = 1;
  } else if (reviewCount === 0) {
    newInterval = 1;
  } else if (reviewCount === 1) {
    newInterval = 6;
  } else {
    newInterval = Math.round(interval * newEaseFactor);
  }

  return { nextInterval: newInterval, nextEaseFactor: newEaseFactor };
}

// ── One-time JSON → SQLite migration ──────────────────────────────────────

let migrated = false;

function migrateWrongQuestionReviews(): void {
  if (migrated) return;
  migrated = true;

  const db = getDb();

  const insertStmt = db.prepare(
    `INSERT OR IGNORE INTO wrong_question_reviews
     (id, user_id, node_id, question, answer, explanation, reviewed_at,
      question_index, matched_node_ids, next_review_date, review_count,
      interval_days, ease_factor, original_job_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  let files: string[];
  try {
    files = fs.readdirSync(DATA_DIR);
  } catch {
    return;
  }

  for (const file of files) {
    if (!file.startsWith('wrong-question-reviews') || !file.endsWith('.json')) continue;

    const filePath = path.join(DATA_DIR, file);
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const data: WrongQuestionReviewData = JSON.parse(content);
      const userIdRaw = file.replace('wrong-question-reviews-', '').replace('.json', '');
      const userId = userIdRaw === 'wrong-question-reviews' ? '' : userIdRaw;

      let count = 0;
      const run = db.transaction(() => {
        for (const review of Object.values(data.reviews || {})) {
          const primaryNodeId = review.matchedNodeIds?.[0] || '';
          insertStmt.run(
            review.reviewId,
            userId,
            primaryNodeId,
            review.questionText,
            '',
            null,
            review.lastReviewed,
            review.questionIndex,
            JSON.stringify(review.matchedNodeIds || []),
            review.nextReviewDate,
            review.reviewCount,
            review.interval,
            review.easeFactor,
            review.originalJobId
          );
          count++;
        }
      });
      run();

      fs.renameSync(filePath, filePath + '.migrated');
      console.log(`[wrongQuestionReview] Migrated ${file} (${count} reviews) → ${file}.migrated`);
    } catch (err) {
      console.warn(`[wrongQuestionReview] Skipping ${file}:`, (err as Error).message);
    }
  }
}

// ── Row → Review Mapping ───────────────────────────────────────────────────

function rowToReview(row: any): WrongQuestionReview {
  return {
    reviewId: row.id,
    questionText: row.question,
    questionIndex: row.question_index,
    matchedNodeIds: JSON.parse(row.matched_node_ids || '[]'),
    lastReviewed: row.reviewed_at,
    nextReviewDate: row.next_review_date,
    reviewCount: row.review_count,
    interval: row.interval_days,
    easeFactor: row.ease_factor,
    originalJobId: row.original_job_id || '',
  };
}

// ── Public API ─────────────────────────────────────────────────────────────

export async function scheduleWrongQuestionReviews(
  wrongResults: WrongQuestionResult[],
  jobId: string,
  userId?: string
): Promise<WrongQuestionReview[]> {
  migrateWrongQuestionReviews();
  const db = getDb();
  const uid = userId ?? '';
  const now = new Date().toISOString();
  const scheduled: WrongQuestionReview[] = [];

  const insertStmt = db.prepare(
    `INSERT INTO wrong_question_reviews
     (id, user_id, node_id, question, answer, explanation, reviewed_at,
      question_index, matched_node_ids, next_review_date, review_count,
      interval_days, ease_factor, original_job_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  const run = db.transaction(() => {
    for (const result of wrongResults) {
      const reviewId = `wq_review_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const matchedNodeIds = result.matchedNodes.map(m => m.kbEntryId);
      const primaryNodeId = matchedNodeIds[0] || '';

      const review: WrongQuestionReview = {
        reviewId,
        questionText: result.questionText,
        questionIndex: result.questionIndex,
        matchedNodeIds,
        lastReviewed: now,
        nextReviewDate: now,
        reviewCount: 0,
        interval: 0,
        easeFactor: 2.5,
        originalJobId: jobId,
      };

      insertStmt.run(
        reviewId, uid, primaryNodeId, result.questionText, '', null, now,
        result.questionIndex, JSON.stringify(matchedNodeIds), now,
        0, 0, 2.5, jobId
      );
      scheduled.push(review);
    }
  });
  run();

  return scheduled;
}

export async function getDueReviews(userId?: string): Promise<WrongQuestionReview[]> {
  migrateWrongQuestionReviews();
  const db = getDb();
  const uid = userId ?? '';

  const rows = db.prepare(
    'SELECT * FROM wrong_question_reviews WHERE user_id = ? ORDER BY next_review_date ASC'
  ).all(uid) as any[];

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const dueReviews = rows
    .map(rowToReview)
    .filter(review => {
      const nextReview = new Date(review.nextReviewDate);
      nextReview.setHours(0, 0, 0, 0);
      return nextReview <= now;
    })
    .sort((a, b) => a.reviewCount - b.reviewCount);

  return dueReviews;
}

export async function submitReview(
  reviewId: string,
  quality: number,
  userId?: string
): Promise<WrongQuestionReview | null> {
  migrateWrongQuestionReviews();
  const db = getDb();
  const uid = userId ?? '';

  const row = db.prepare(
    'SELECT * FROM wrong_question_reviews WHERE id = ? AND user_id = ?'
  ).get(reviewId, uid) as any;

  if (!row) return null;

  const review = rowToReview(row);
  const now = new Date();
  const { nextInterval, nextEaseFactor } = calculateNextReview(
    review.reviewCount,
    review.interval,
    review.easeFactor,
    quality
  );

  const nextReviewDate = new Date(now);
  nextReviewDate.setDate(nextReviewDate.getDate() + nextInterval);

  db.prepare(
    `UPDATE wrong_question_reviews SET
       reviewed_at = ?, next_review_date = ?, review_count = review_count + 1,
       interval_days = ?, ease_factor = ?
     WHERE id = ? AND user_id = ?`
  ).run(now.toISOString(), nextReviewDate.toISOString(), nextInterval, nextEaseFactor, reviewId, uid);

  return {
    ...review,
    lastReviewed: now.toISOString(),
    nextReviewDate: nextReviewDate.toISOString(),
    reviewCount: review.reviewCount + 1,
    interval: nextInterval,
    easeFactor: nextEaseFactor,
  };
}

export async function getReviewById(reviewId: string, userId?: string): Promise<WrongQuestionReview | null> {
  migrateWrongQuestionReviews();
  const db = getDb();
  const uid = userId ?? '';

  const row = db.prepare(
    'SELECT * FROM wrong_question_reviews WHERE id = ? AND user_id = ?'
  ).get(reviewId, uid) as any;

  return row ? rowToReview(row) : null;
}

export async function getReviewStats(userId?: string): Promise<{
  total: number;
  due: number;
  completed: number;
}> {
  migrateWrongQuestionReviews();
  const db = getDb();
  const uid = userId ?? '';

  const totalRow = db.prepare(
    'SELECT COUNT(*) as cnt FROM wrong_question_reviews WHERE user_id = ?'
  ).get(uid) as { cnt: number };

  const completedRow = db.prepare(
    'SELECT COUNT(*) as cnt FROM wrong_question_reviews WHERE user_id = ? AND review_count > 0'
  ).get(uid) as { cnt: number };

  const dueReviews = await getDueReviews(userId);

  return {
    total: totalRow.cnt,
    due: dueReviews.length,
    completed: completedRow.cnt,
  };
}
