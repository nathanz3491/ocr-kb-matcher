/**
 * Reviews API Routes
 * Provides spaced repetition review endpoints
 */

import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { getDueReviews, markAsReviewed, getReviewStats } from '../services/reviewService';

const router = Router();

/**
 * GET /api/reviews/due
 * Get reviews due for today
 */
router.get('/due', asyncHandler(async (req, res) => {
  const userId = req.user?.userId;
  if (!userId) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }

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
  const userId = req.user?.userId;
  if (!userId) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }

  const { nodeId } = req.params;
  const { quality = 4 } = req.body;

  const review = await markAsReviewed(nodeId, quality, userId);

  res.json({
    success: true,
    data: review
  });
}));

export default router;