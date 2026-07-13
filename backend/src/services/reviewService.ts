/**
 * Review Service - SQLite-based implementation
 * Implements spaced repetition with SM-2 algorithm
 */

import { getDb } from '../db/sqlite';

export interface ReviewItem {
  nodeId: string;
  lastReviewed: string;
  nextReviewDate: string;
  reviewCount: number;
  interval: number;
  easeFactor: number;
}

function rowToReview(row: Record<string, unknown>): ReviewItem {
  return {
    nodeId: row.node_id as string,
    lastReviewed: row.last_reviewed as string,
    nextReviewDate: row.next_review_date as string,
    reviewCount: row.review_count as number,
    interval: row.interval_days as number,
    easeFactor: row.ease_factor as number,
  };
}

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

export async function initializeReview(nodeId: string, userId: string): Promise<void> {
  const db = getDb();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT OR IGNORE INTO reviews
      (node_id, user_id, last_reviewed, next_review_date, review_count, interval_days, ease_factor)
    VALUES
      (@node_id, @user_id, @last_reviewed, @next_review_date, 0, 0, 2.5)
  `).run({
    node_id: nodeId,
    user_id: userId,
    last_reviewed: now,
    next_review_date: now,
  });
}

export async function markAsReviewed(
  nodeId: string,
  quality: number = 4,
  userId: string
): Promise<ReviewItem> {
  const db = getDb();
  const now = new Date();

  const existing = db.prepare(
    'SELECT * FROM reviews WHERE node_id = ? AND user_id = ?'
  ).get(nodeId, userId) as Record<string, unknown> | undefined;

  const review = existing ? rowToReview(existing) : {
    nodeId,
    lastReviewed: now.toISOString(),
    nextReviewDate: now.toISOString(),
    reviewCount: 0,
    interval: 0,
    easeFactor: 2.5,
  };

  const { nextInterval, nextEaseFactor } = calculateNextReview(
    review.reviewCount,
    review.interval,
    review.easeFactor,
    quality
  );

  const nextReviewDate = new Date(now);
  nextReviewDate.setDate(nextReviewDate.getDate() + nextInterval);

  const updated: ReviewItem = {
    nodeId,
    lastReviewed: now.toISOString(),
    nextReviewDate: nextReviewDate.toISOString(),
    reviewCount: review.reviewCount + 1,
    interval: nextInterval,
    easeFactor: nextEaseFactor,
  };

  db.prepare(`
    INSERT INTO reviews
      (node_id, user_id, last_reviewed, next_review_date, review_count, interval_days, ease_factor)
    VALUES
      (@node_id, @user_id, @last_reviewed, @next_review_date, @review_count, @interval_days, @ease_factor)
    ON CONFLICT(node_id, user_id) DO UPDATE SET
      last_reviewed = excluded.last_reviewed,
      next_review_date = excluded.next_review_date,
      review_count = excluded.review_count,
      interval_days = excluded.interval_days,
      ease_factor = excluded.ease_factor
  `).run({
    node_id: updated.nodeId,
    user_id: userId,
    last_reviewed: updated.lastReviewed,
    next_review_date: updated.nextReviewDate,
    review_count: updated.reviewCount,
    interval_days: updated.interval,
    ease_factor: updated.easeFactor,
  });

  return updated;
}

export async function getDueReviews(userId: string): Promise<ReviewItem[]> {
  const db = getDb();
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const nowStr = now.toISOString().split('T')[0];

  const rows = db.prepare(`
    SELECT * FROM reviews
    WHERE user_id = ? AND next_review_date <= ?
    ORDER BY review_count ASC
  `).all(userId, nowStr) as Record<string, unknown>[];

  return rows.map(rowToReview);
}

export async function getAllReviews(userId: string): Promise<ReviewItem[]> {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM reviews WHERE user_id = ?').all(userId) as Record<string, unknown>[];
  return rows.map(rowToReview);
}

export async function getReviewStats(userId: string): Promise<{
  totalDue: number;
  totalReviewed: number;
  retentionRate: number;
}> {
  const dueReviews = await getDueReviews(userId);
  const allReviews = await getAllReviews(userId);

  return {
    totalDue: dueReviews.length,
    totalReviewed: allReviews.length,
    retentionRate: allReviews.length > 0
      ? Math.round((allReviews.filter(r => r.reviewCount > 1).length / allReviews.length) * 100)
      : 0
  };
}
