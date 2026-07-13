/**
 * Study Materials API Routes
 * Handles cheat sheets and study notes
 */

import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getAllCheatSheets,
  getCheatSheetByNode,
  getOrGenerateCheatSheet,
  getAllStudyNotes,
  getStudyNotesByNode,
  getOrGenerateStudyNotes,
} from '../services/studyMaterialService';
import { aiLimiter } from '../middleware/rateLimit';

const router = Router();
router.use(authenticate);

// ===========================================
// CHEAT SHEETS
// ===========================================

router.get('/cheat-sheets', async (req: Request, res: Response) => {
  const userId = req.user!.userId;

  try {
    const sheets = await getAllCheatSheets(userId);
    res.json({
      success: true,
      data: {
        sheets,
        total: sheets.length,
      },
    });
  } catch (error) {
    console.error('[Study] Error getting cheat sheets:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve cheat sheets',
    });
  }
});

router.get('/cheat-sheets/:nodeId', async (req: Request, res: Response) => {
  const userId = req.user!.userId;

  try {
    const { nodeId } = req.params;
    const sheet = await getCheatSheetByNode(nodeId, userId);

    if (!sheet) {
      res.status(404).json({
        success: false,
        error: 'Cheat sheet not found',
      });
      return;
    }

    res.json({
      success: true,
      data: sheet,
    });
  } catch (error) {
    console.error(`[Study] Error getting cheat sheet for ${req.params.nodeId}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve cheat sheet',
    });
  }
});

router.post('/cheat-sheets/:nodeId/generate', aiLimiter, async (req: Request, res: Response) => {
  const userId = req.user!.userId;

  try {
    const { nodeId } = req.params;
    const sheet = await getOrGenerateCheatSheet(nodeId, userId);

    res.json({
      success: true,
      data: sheet,
    });
  } catch (error) {
    console.error(`[Study] Error generating cheat sheet for ${req.params.nodeId}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate cheat sheet',
    });
  }
});

// ===========================================
// STUDY NOTES
// ===========================================

router.get('/notes', async (req: Request, res: Response) => {
  const userId = req.user!.userId;

  try {
    const notes = await getAllStudyNotes(userId);
    res.json({
      success: true,
      data: {
        notes,
        total: notes.length,
      },
    });
  } catch (error) {
    console.error('[Study] Error getting study notes:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve study notes',
    });
  }
});

router.get('/notes/:nodeId', async (req: Request, res: Response) => {
  const userId = req.user!.userId;

  try {
    const { nodeId } = req.params;
    const notes = await getStudyNotesByNode(nodeId, userId);

    if (!notes) {
      res.status(404).json({
        success: false,
        error: 'Study notes not found',
      });
      return;
    }

    res.json({
      success: true,
      data: notes,
    });
  } catch (error) {
    console.error(`[Study] Error getting study notes for ${req.params.nodeId}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve study notes',
    });
  }
});

router.post('/notes/:nodeId/generate', aiLimiter, async (req: Request, res: Response) => {
  const userId = req.user!.userId;

  try {
    const { nodeId } = req.params;
    const notes = await getOrGenerateStudyNotes(nodeId, userId);

    res.json({
      success: true,
      data: notes,
    });
  } catch (error) {
    console.error(`[Study] Error generating study notes for ${req.params.nodeId}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate study notes',
    });
  }
});

export default router;
