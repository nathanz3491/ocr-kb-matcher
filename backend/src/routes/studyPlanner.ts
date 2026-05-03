import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate } from '../middleware/auth';
import fs from 'fs/promises';
import path from 'path';
import { generateWeeklyStudyPlan, WeeklyStudyPlan } from '../services/studyPlannerService';

const router = Router();

const DATA_DIR = path.join(process.cwd(), 'data');

function studyPlanPath(userId: string): string {
  return path.join(DATA_DIR, `study-plan-${userId}.json`);
}

async function loadStudyPlan(userId: string): Promise<WeeklyStudyPlan | null> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const content = await fs.readFile(studyPlanPath(userId), 'utf-8');
    return JSON.parse(content) as WeeklyStudyPlan;
  } catch {
    return null;
  }
}

async function saveStudyPlan(plan: WeeklyStudyPlan, userId: string): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(studyPlanPath(userId), JSON.stringify(plan, null, 2), 'utf-8');
  } catch (error) {
    console.error('[StudyPlanner] Failed to save study plan:', error);
  }
}

router.get('/', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const plan = await loadStudyPlan(userId);
  if (plan) {
    res.json({ success: true, data: plan });
  } else {
    const defaultPlan: WeeklyStudyPlan = {
      weekStartDate: new Date().toISOString().split('T')[0],
      weekEndDate: new Date(Date.now() + 6 * 86400000).toISOString().split('T')[0],
      days: [],
      summary: 'No study plan generated yet. Click "Generate Your Plan" to create one.',
      weakNodes: [],
      streak: 0,
      totalDueReviews: 0,
    };
    res.json({ success: true, data: defaultPlan });
  }
}));

router.post('/generate', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const plan = await generateWeeklyStudyPlan(userId);
  await saveStudyPlan(plan, userId);
  res.json({ success: true, data: plan });
}));

export default router;
