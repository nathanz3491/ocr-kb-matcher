/**
 * Reviews API Routes
 * Provides spaced repetition review endpoints
 */

import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate } from '../middleware/auth';
import { getDueReviews, markAsReviewed, getReviewStats } from '../services/reviewService';

const router = Router();
router.use(authenticate);

/**
 * GET /api/reviews/due
 * Get reviews due for today
 */
router.get('/due', asyncHandler(async (req, res) => {
  const userId = req.user!.userId;

  const dueReviews = await getDueReviews(userId);
  const stats = await getReviewStats(userId);

  res.json({
    success: true,
    data: {
      reviews: dueReviews,
      stats
    }
  });
}));

/**
 * POST /api/reviews/:nodeId
 * Mark a topic as reviewed
 */
router.post('/:nodeId', asyncHandler(async (req, res) => {
  const userId = req.user!.userId;

  const { nodeId } = req.params;
  const { quality = 4 } = req.body;

  const review = await markAsReviewed(nodeId, quality, userId);

  res.json({
    success: true,
    data: review
  });
}));

export default router;