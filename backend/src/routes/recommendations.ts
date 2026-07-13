/**
 * Recommendations API Routes
 * Provides AI-powered learning recommendations
 */

import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { getRecommendations } from '../services/recommendationService';

const router = Router();
router.use(authenticate);

/**
 * GET /api/recommendations
 * Get personalized recommendations for next topics to learn
 */
router.get('/', async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  try {
    const recommendations = await getRecommendations(userId);
    res.json({ success: true, data: recommendations });
  } catch (error) {
    console.error('[Recommendations] Failed to get recommendations:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve recommendations' });
  }
});

export default router;
