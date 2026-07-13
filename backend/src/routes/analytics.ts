import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate } from '../middleware/auth';
import { getDashboardStats } from '../services/analyticsService';
import { getTimeline, getWeeklyStats } from '../services/timelineService';
import { analyzeSkillGaps } from '../services/gapAnalysisService';

const router = Router();
router.use(authenticate);

router.get('/dashboard', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const stats = await getDashboardStats(userId);
  res.json({ success: true, data: stats });
}));

router.get('/timeline', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const timelineData = await getTimeline(30, userId);
  res.json({ success: true, data: timelineData });
}));

router.get('/timeline/weekly', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const weeklyStats = await getWeeklyStats(4, userId);
  res.json({ success: true, data: weeklyStats });
}));

router.get('/gap-analysis', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const analysis = await analyzeSkillGaps(userId);
  res.json({ success: true, data: analysis });
}));

export default router;
