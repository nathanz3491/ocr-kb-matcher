import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { requireAuth } from '../middleware/auth';
import { loadPackForUser } from '../services/knowledgeGraphStorage';

const router = Router();

/**
 * POST /api/users/me/load-pack
 * Body: { packId: string }
 * Replaces the user's current graph with the pack's content.
 */
router.post(
  '/me/load-pack',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { packId } = req.body;
    if (!packId || typeof packId !== 'string') {
      res.status(400).json({ success: false, error: 'packId required' });
      return;
    }

    await loadPackForUser(req.user!.userId, packId);

    res.json({ success: true, packId, message: `已加载 ${packId}` });
  })
);

export default router;
