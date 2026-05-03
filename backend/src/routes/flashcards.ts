/**
 * Flashcard API Routes
 * Handles flashcard retrieval (auto-generated on job completion)
 */

import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate } from '../middleware/auth';
import {
  getAllFlashcards,
  getFlashcardsByNode,
  getFlashcardProgress,
  deleteFlashcards,
  generateFlashcards,
} from '../services/flashcardService';

const router = Router();

/**
 * GET /api/flashcards
 * Get all flashcard sets (for dashboard)
 */
router.get('/', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const flashcards = await getAllFlashcards(userId);
  const progress = await getFlashcardProgress(userId);
  res.json({
    success: true,
    data: {
      sets: flashcards,
      progress,
      totalCards: flashcards.reduce((sum, set) => sum + set.cards.length, 0),
    },
  });
}));

/**
 * GET /api/flashcards/:nodeId
 * Get flashcards for a specific node (must exist - auto-generated on job completion)
 */
router.get('/:nodeId', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const { nodeId } = req.params;
  const userId = req.user!.userId;
  const flashcardSet = await getFlashcardsByNode(nodeId, userId);
  if (!flashcardSet) {
    res.status(404).json({ success: false, error: 'Flashcards not found for this node. Upload a document to generate flashcards.' });
    return;
  }
  res.json({ success: true, data: flashcardSet });
}));

/**
 * POST /api/flashcards/:nodeId/generate
 * Manually generate flashcards for a node
 */
router.post('/:nodeId/generate', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const { nodeId } = req.params;
  const userId = req.user!.userId;
  const flashcardSet = await generateFlashcards(nodeId, userId);
  res.json({ success: true, data: flashcardSet });
}));

/**
 * DELETE /api/flashcards/:nodeId
 * Delete flashcard set for a node
 */
router.delete('/:nodeId', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const { nodeId } = req.params;
  const userId = req.user!.userId;
  const deleted = await deleteFlashcards(nodeId, userId);
  res.json({ success: deleted, data: deleted ? { message: 'Flashcards deleted' } : undefined, error: deleted ? undefined : 'Flashcards not found' });
}));

/**
 * GET /api/flashcards/progress/all
 * Get flashcard progress for all nodes
 */
router.get('/progress/all', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const progress = await getFlashcardProgress(userId);
  res.json({ success: true, data: progress });
}));

export default router;
