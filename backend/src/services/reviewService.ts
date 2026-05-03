/**
 * Review Service
 * Implements spaced repetition with SM-2 algorithm
 */

import fs from 'fs/promises';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');

function getReviewsFile(userId?: string): string {
  if (userId) {
    return path.join(DATA_DIR, `reviews-${userId}.json`);
  }
  return path.join(DATA_DIR, 'reviews.json');
}

export interface ReviewItem {
  nodeId: string;
  lastReviewed: string;
  nextReviewDate: string;
  reviewCount: number;
  interval: number; // days until next review
  easeFactor: number; // SM-2 ease factor
}

interface UserReviewData {
  reviews: Record<string, ReviewItem>;
}

async function loadReviews(userId?: string): Promise<UserReviewData> {
  const filePath = getReviewsFile(userId);
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content) as UserReviewData;
  } catch {
    return { reviews: {} };
  }
}

async function saveReviews(data: UserReviewData, userId?: string): Promise<void> {
  const filePath = getReviewsFile(userId);
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tempPath = `${filePath}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(data, null, 2), 'utf-8');
  await fs.rename(tempPath, filePath);
}

/**
 * Calculate next review date using SM-2 algorithm
 */
function calculateNextReview(
  reviewCount: number,
  interval: number,
  easeFactor: number,
  quality: number // 0-5 rating of how well user knew the material
): { nextInterval: number; nextEaseFactor: number } {
  // SM-2 algorithm
  let newEaseFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (newEaseFactor < 1.3) newEaseFactor = 1.3;

  let newInterval: number;

  if (quality < 3) {
    // If response was incorrect, start over
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

/**
 * Initialize review tracking for a node
 */
export async function initializeReview(nodeId: string, userId: string): Promise<void> {
  const reviewData = await loadReviews(userId);
  if (!reviewData.reviews[nodeId]) {
    reviewData.reviews[nodeId] = {
      nodeId,
      lastReviewed: new Date().toISOString(),
      nextReviewDate: new Date().toISOString(),
      reviewCount: 0,
      interval: 0,
      easeFactor: 2.5
    };
  }
  await saveReviews(reviewData, userId);
}

/**
 * Mark a topic as reviewed
 */
export async function markAsReviewed(
  nodeId: string,
  quality: number = 4,
  userId: string
): Promise<ReviewItem> {
  const reviewData = await loadReviews(userId);
  const now = new Date();
  let review = reviewData.reviews[nodeId];

  if (!review) {
    // First review
    review = {
      nodeId,
      lastReviewed: now.toISOString(),
      nextReviewDate: now.toISOString(),
      reviewCount: 0,
      interval: 0,
      easeFactor: 2.5
    };
  }

  const { nextInterval, nextEaseFactor } = calculateNextReview(
    review.reviewCount,
    review.interval,
    review.easeFactor,
    quality
  );

  const nextReviewDate = new Date(now);
  nextReviewDate.setDate(nextReviewDate.getDate() + nextInterval);

  review.lastReviewed = now.toISOString();
  review.nextReviewDate = nextReviewDate.toISOString();
  review.reviewCount += 1;
  review.interval = nextInterval;
  review.easeFactor = nextEaseFactor;

  reviewData.reviews[nodeId] = review;
  await saveReviews(reviewData, userId);
  return review;
}

/**
 * Get reviews due today
 */
export async function getDueReviews(userId: string): Promise<ReviewItem[]> {
  const reviewData = await loadReviews(userId);
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const dueReviews = Object.values(reviewData.reviews).filter(review => {
    const nextReview = new Date(review.nextReviewDate);
    nextReview.setHours(0, 0, 0, 0);
    return nextReview <= now;
  });

  // Sort by review count (fewer reviews first = newer items)
  return dueReviews.sort((a, b) => a.reviewCount - b.reviewCount);
}

/**
 * Get all review items
 */
export async function getAllReviews(userId: string): Promise<ReviewItem[]> {
  const reviewData = await loadReviews(userId);
  return Object.values(reviewData.reviews);
}

/**
 * Get review statistics
 */
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