/**
 * Recommendations API Routes
 * Provides AI-powered learning recommendations
 */

import { Router, Request, Response } from 'express';
import { getRecommendations } from '../services/recommendationService';

const router = Router();

/**
 * GET /api/recommendations
 * Get personalized recommendations for next topics to learn
 */
router.get('/', async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) {
    res.status(401).json({ success: false, error: 'Unauthorized' });
    return;
  }
  try {
    const recommendations = await getRecommendations(userId);
    res.json({ success: true, data: recommendations });
  } catch (error) {
    console.error('[Recommendations] Failed to get recommendations:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve recommendations' });
  }
});

export default router;
