import { Router, Request, Response } from 'express';
import * as fs from 'fs/promises';
import * as path from 'path';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { authenticate } from '../middleware/auth';

const router = Router();

const DATA_DIR = path.join(process.cwd(), 'data');

router.use(authenticate);

router.use(asyncHandler(async (req: Request, _res: Response, next) => {
  if (req.user?.accountType !== 'teacher') {
    throw new AppError('Only teachers can access game routes', 403);
  }
  next();
}));

interface GameRecord {
  gameId: string;
  startedAt: string;
  endedAt: string;
  playerCount: number;
  finalRankings: Array<{
    playerName: string;
    score: number;
    rank: number;
  }>;
}

function gameHistoryPath(teacherId: string): string {
  return path.join(DATA_DIR, `game-history-${teacherId}.json`);
}

async function readGameHistory(teacherId: string): Promise<GameRecord[]> {
  try {
    const data = await fs.readFile(gameHistoryPath(teacherId), 'utf-8');
    return JSON.parse(data) as GameRecord[];
  } catch {
    return [];
  }
}

router.get(
  '/history',
  asyncHandler(async (req: Request, res: Response) => {
    const teacherId = req.user!.userId;
    const history = await readGameHistory(teacherId);
    const sorted = [...history].sort(
      (a, b) => new Date(b.endedAt).getTime() - new Date(a.endedAt).getTime()
    );
    res.json({ success: true, data: sorted });
  })
);

router.get(
  '/:gameId/results',
  asyncHandler(async (req: Request, res: Response) => {
    const teacherId = req.user!.userId;
    const { gameId } = req.params;

    const history = await readGameHistory(teacherId);
    const game = history.find(g => g.gameId === gameId);

    if (!game) {
      res.status(404).json({ success: false, error: 'Game not found' });
      return;
    }

    res.json({ success: true, data: game });
  })
);

export default router;
