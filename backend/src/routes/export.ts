/**
 * Export API Routes
 * Provides endpoints for exporting graph and progress data
 */

import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { exportGraphAsPNG, exportProgressAsPDF, exportKnowledgeGraphAsText } from '../services/exportService';
import { generateCheatSheetPDF, generateNotesPDF, generateFlashcardsPDF } from '../services/pdfExportService';

const router = Router();
router.use(authenticate);

/**
 * GET /api/export/graph-png
 * Export knowledge graph as PNG/SVG image
 */
router.get('/graph-png', async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  try {
    const imageBuffer = await exportGraphAsPNG(userId);
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Content-Disposition', 'attachment; filename="knowledge-graph.svg"');
    res.send(imageBuffer);
  } catch (error) {
    console.error('[Export] Failed to export graph as PNG:', error);
    res.status(500).json({ success: false, error: 'Failed to export graph' });
  }
});

/**
 * GET /api/export/progress-pdf
 * Export progress report as PDF
 */
router.get('/progress-pdf', async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  try {
    const pdfBuffer = await exportProgressAsPDF();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="progress-report.pdf"');
    res.send(pdfBuffer);
  } catch (error) {
    console.error('[Export] Failed to export progress as PDF:', error);
    res.status(500).json({ success: false, error: 'Failed to export progress report' });
  }
});

/**
 * GET /api/export/ai-text
 * Export knowledge graph as AI-friendly text format
 */
router.get('/ai-text', async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  try {
    const text = await exportKnowledgeGraphAsText(userId);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="knowledge-graph-ai.txt"');
    res.send(text);
  } catch (error) {
    console.error('[Export] Failed to export AI text:', error);
    res.status(500).json({ success: false, error: 'Failed to export AI text' });
  }
});

router.get('/cheat-sheet/:nodeId', async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  try {
    const nodeId = req.params.nodeId;
    const buffer = await generateCheatSheetPDF(nodeId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="cheat-sheet-${nodeId}.pdf"`);
    res.send(buffer);
  } catch (error) {
    console.error('[Export] Failed to export cheat sheet PDF:', error);
    const message = error instanceof Error ? error.message : 'Failed to export cheat sheet';
    res.status(message.includes('not found') ? 404 : 500).json({ success: false, error: message });
  }
});

router.get('/notes/:nodeId', async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  try {
    const nodeId = req.params.nodeId;
    const buffer = await generateNotesPDF(nodeId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="notes-${nodeId}.pdf"`);
    res.send(buffer);
  } catch (error) {
    console.error('[Export] Failed to export notes PDF:', error);
    const message = error instanceof Error ? error.message : 'Failed to export notes';
    res.status(message.includes('not found') ? 404 : 500).json({ success: false, error: message });
  }
});

router.get('/flashcards/:nodeId', async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  try {
    const nodeId = req.params.nodeId;
    const buffer = await generateFlashcardsPDF(nodeId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="flashcards-${nodeId}.pdf"`);
    res.send(buffer);
  } catch (error) {
    console.error('[Export] Failed to export flashcards PDF:', error);
    const message = error instanceof Error ? error.message : 'Failed to export flashcards';
    res.status(message.includes('not found') ? 404 : 500).json({ success: false, error: message });
  }
});

export default router;
