/**
 * Subjects API Routes
 * Provides endpoints for multi-subject support
 */

import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { getAllSubjects, getCurrentSubject, switchSubject } from '../services/subjectService';

const router = Router();
router.use(authenticate);

/**
 * GET /api/subjects
 * Get all available subjects
 */
router.get('/', async (req, res) => {
  const userId = req.user!.userId;
  try {
    const subjects = await getAllSubjects(userId);
    res.json({
      success: true,
      data: subjects
    });
  } catch (error) {
    console.error('[Subjects] Failed to get subjects:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve subjects'
    });
  }
});

/**
 * GET /api/subjects/current
 * Get the currently active subject
 */
router.get('/current', async (req, res) => {
  const userId = req.user!.userId;
  try {
    const subject = await getCurrentSubject(userId);
    res.json({
      success: true,
      data: subject
    });
  } catch (error) {
    console.error('[Subjects] Failed to get current subject:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve current subject'
    });
  }
});

/**
 * POST /api/subjects/switch
 * Switch to a different subject
 */
router.post('/switch', async (req, res) => {
  const userId = req.user!.userId;
  try {
    const { subjectId } = req.body;
    if (!subjectId) {
      res.status(400).json({
        success: false,
        error: 'subjectId is required'
      });
      return;
    }

    const subject = await switchSubject(subjectId, userId);
    res.json({
      success: true,
      data: subject
    });
  } catch (error) {
    console.error('[Subjects] Failed to switch subject:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to switch subject'
    });
  }
});

export default router;
