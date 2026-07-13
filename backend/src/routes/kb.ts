/**
 * Knowledge Base API Routes
 * 
 * Provides endpoints for retrieving knowledge base entries:
 * - GET /api/kb - Returns all entries (limited to 100)
 * - GET /api/kb/:id - Returns specific entry by ID
 */

import { Router, Request, Response } from 'express';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { authenticate } from '../middleware/auth';
import { getAllEntries, getEntryById } from '../services/knowledgeBase';
import type { ApiResponse, KnowledgeBaseEntry } from '../../../shared/types';

const router = Router();
router.use(authenticate);

/**
 * @route   GET /api/kb
 * @desc    Get all knowledge base entries (max 100)
 * @access  Public
 */
router.get(
  '/',
  asyncHandler(async (_req: Request, res: Response) => {
    const { entries, warnings } = await getAllEntries();
    
    const response: ApiResponse<{ 
      entries: KnowledgeBaseEntry[]; 
      count: number;
      warnings?: string[];
    }> = {
      success: true,
      data: {
        entries,
        count: entries.length,
        ...(warnings.length > 0 && { warnings })
      }
    };
    
    res.json(response);
  })
);

/**
 * @route   GET /api/kb/:id
 * @desc    Get a specific knowledge base entry by ID
 * @access  Public
 */
router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    
    if (!id) {
      throw new AppError('Entry ID is required', 400);
    }
    
    const entry = await getEntryById(id);
    
    if (!entry) {
      throw new AppError(`Knowledge base entry not found: ${id}`, 404);
    }
    
    const response: ApiResponse<{ entry: KnowledgeBaseEntry }> = {
      success: true,
      data: { entry }
    };
    
    res.json(response);
  })
);

export default router;
