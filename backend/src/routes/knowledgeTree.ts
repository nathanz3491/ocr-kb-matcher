import { Router, Request, Response } from 'express';
import { exportTreeForLLM, getFullKnowledgeTree, diagnoseWeakness } from '../services/knowledgeTreeService';

const router = Router();

// GET /api/knowledge-tree - Full tree as structured data
router.get('/', async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) {
    res.status(401).json({ success: false, error: 'Unauthorized' });
    return;
  }
  try {
    const tree = await getFullKnowledgeTree(userId);
    res.json({ success: true, data: tree });
  } catch (error) {
    console.error('Error fetching knowledge tree:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch knowledge tree' });
  }
});

// GET /api/knowledge-tree/export-for-llm - Tree in LLM-friendly format
router.get('/export-for-llm', async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) {
    res.status(401).json({ success: false, error: 'Unauthorized' });
    return;
  }
  try {
    const context = await exportTreeForLLM(userId);
    res.json({ success: true, data: context });
  } catch (error) {
    console.error('Error exporting tree:', error);
    res.status(500).json({ success: false, error: 'Failed to export tree' });
  }
});

// GET /api/knowledge-tree/diagnose/:nodeId - Get prerequisites for a node
router.get('/diagnose/:nodeId', async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) {
    res.status(401).json({ success: false, error: 'Unauthorized' });
    return;
  }
  try {
    const prerequisites = await diagnoseWeakness(req.params.nodeId, userId);
    res.json({ success: true, data: prerequisites });
  } catch (error) {
    console.error('Error diagnosing:', error);
    res.status(500).json({ success: false, error: 'Failed to diagnose' });
  }
});

export default router;
