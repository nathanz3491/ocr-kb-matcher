import fs from 'fs/promises';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');

function getReviewsFile(userId?: string): string {
  const fileName = userId
    ? `wrong-question-reviews-${userId}.json`
    : 'wrong-question-reviews.json';
  return path.join(DATA_DIR, fileName);
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

async function loadReviews(userId?: string): Promise<WrongQuestionReviewData> {
  const filePath = getReviewsFile(userId);
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content) as WrongQuestionReviewData;
  } catch {
    return { reviews: {} };
  }
}

async function saveReviews(data: WrongQuestionReviewData, userId?: string): Promise<void> {
  const filePath = getReviewsFile(userId);
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const tempPath = `${filePath}.tmp`;
    await fs.writeFile(tempPath, JSON.stringify(data, null, 2), 'utf-8');
    await fs.rename(tempPath, filePath);
  } catch (error) {
    console.error('[WrongQuestionReviewService] Failed to save reviews:', error);
  }
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

export async function scheduleWrongQuestionReviews(
  wrongResults: WrongQuestionResult[],
  jobId: string,
  userId?: string
): Promise<WrongQuestionReview[]> {
  const reviewData = await loadReviews(userId);
  const now = new Date().toISOString();
  const scheduled: WrongQuestionReview[] = [];

  for (const result of wrongResults) {
    const reviewId = `wq_review_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const matchedNodeIds = result.matchedNodes.map(m => m.kbEntryId);

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

    reviewData.reviews[reviewId] = review;
    scheduled.push(review);
  }

  await saveReviews(reviewData, userId);
  return scheduled;
}

export async function getDueReviews(userId?: string): Promise<WrongQuestionReview[]> {
  const reviewData = await loadReviews(userId);
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const dueReviews = Object.values(reviewData.reviews).filter(review => {
    const nextReview = new Date(review.nextReviewDate);
    nextReview.setHours(0, 0, 0, 0);
    return nextReview <= now;
  });

  return dueReviews.sort((a, b) => a.reviewCount - b.reviewCount);
}

export async function submitReview(
  reviewId: string,
  quality: number,
  userId?: string
): Promise<WrongQuestionReview | null> {
  const reviewData = await loadReviews(userId);
  const review = reviewData.reviews[reviewId];
  if (!review) return null;

  const now = new Date();
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

  reviewData.reviews[reviewId] = review;
  await saveReviews(reviewData, userId);
  return review;
}

export async function getReviewById(reviewId: string, userId?: string): Promise<WrongQuestionReview | null> {
  const reviewData = await loadReviews(userId);
  return reviewData.reviews[reviewId] || null;
}

export async function getReviewStats(userId?: string): Promise<{
  total: number;
  due: number;
  completed: number;
}> {
  const reviewData = await loadReviews(userId);
  const allReviews = Object.values(reviewData.reviews);
  const dueReviews = await getDueReviews(userId);

  return {
    total: allReviews.length,
    due: dueReviews.length,
    completed: allReviews.filter(r => r.reviewCount > 0).length,
  };
}