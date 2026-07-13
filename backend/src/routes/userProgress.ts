import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate } from '../middleware/auth';
import { userProgressService } from '../services/userProgressService';

const router = Router();
router.use(authenticate);

// GET /api/user-progress - Get current progress
router.get('/', asyncHandler(async (req, res) => {
  const userId = req.user!.userId;

  const progress = await userProgressService.loadProgress(userId);
  res.json({ success: true, data: progress });
}));

// POST /api/user-progress/mark-known - Mark nodes as known
router.post('/mark-known', asyncHandler(async (req, res) => {
  const userId = req.user!.userId;

  const { nodeIds } = req.body;
  if (!Array.isArray(nodeIds)) {
    res.status(400).json({ success: false, error: 'nodeIds must be an array' });
    return;
  }
  await userProgressService.markNodesAsKnown(nodeIds, userId);

  res.json({ success: true });
}));

router.post('/increment-mastery', asyncHandler(async (req, res) => {
  const userId = req.user!.userId;

  const { nodeIds, masteryPercentage = 5 } = req.body;
  if (!Array.isArray(nodeIds)) {
    res.status(400).json({ success: false, error: 'nodeIds must be an array' });
    return;
  }
  await userProgressService.markNodesAsKnownWithMastery(nodeIds, masteryPercentage, userId);
  res.json({ success: true });
}));

export default router;