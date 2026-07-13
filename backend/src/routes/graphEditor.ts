import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getEditorNodes,
  getEditorNode,
  createEditorNode,
  updateEditorNode,
  deleteEditorNode,
  createEditorRelationship,
  deleteEditorRelationship,
  CreateEditorNodeInput,
  UpdateEditorNodeInput,
} from '../services/knowledgeGraphEditor';

const router = Router();
router.use(authenticate);

router.get('/nodes', async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user!.userId;
  try {
    const nodes = await getEditorNodes(userId);
    res.json({ success: true, data: nodes });
  } catch (error) {
    next(error);
  }
});

router.post('/nodes', async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user!.userId;
  try {
    const { name, description, domain, prerequisites } = req.body;

    if (!name || typeof name !== 'string') {
      res.status(400).json({ success: false, error: 'name is required and must be a string' });
      return;
    }

    const input: CreateEditorNodeInput = {
      name: name.trim(),
      description: typeof description === 'string' ? description.trim() : undefined,
      domain: typeof domain === 'string' ? domain.trim() : undefined,
      prerequisites: Array.isArray(prerequisites) ? prerequisites : undefined,
    };

    const node = await createEditorNode(input, userId);
    res.status(201).json({ success: true, data: node });
  } catch (error) {
    next(error);
  }
});

router.get('/nodes/:id', async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user!.userId;
  try {
    const { id } = req.params;
    const node = await getEditorNode(id, userId);

    if (!node) {
      res.status(404).json({ success: false, error: 'Node not found' });
      return;
    }

    res.json({ success: true, data: node });
  } catch (error) {
    next(error);
  }
});

router.put('/nodes/:id', async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user!.userId;
  try {
    const { id } = req.params;
    const { name, description, domain, prerequisites, nextSteps } = req.body;

    const updates: UpdateEditorNodeInput = {};
    if (name !== undefined) updates.name = typeof name === 'string' ? name.trim() : undefined;
    if (description !== undefined) updates.description = typeof description === 'string' ? description.trim() : undefined;
    if (domain !== undefined) updates.domain = typeof domain === 'string' ? domain.trim() : undefined;
    if (prerequisites !== undefined && Array.isArray(prerequisites)) updates.prerequisites = prerequisites;
    if (nextSteps !== undefined && Array.isArray(nextSteps)) updates.nextSteps = nextSteps;

    const node = await updateEditorNode(id, updates, userId);

    if (!node) {
      res.status(404).json({ success: false, error: 'Node not found' });
      return;
    }

    res.json({ success: true, data: node });
  } catch (error) {
    next(error);
  }
});

router.delete('/nodes/:id', async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user!.userId;
  try {
    const { id } = req.params;
    const deleted = await deleteEditorNode(id, userId);

    if (!deleted) {
      res.status(404).json({ success: false, error: 'Node not found' });
      return;
    }

    res.json({ success: true, message: 'Node deleted successfully' });
  } catch (error) {
    next(error);
  }
});

router.post('/relationships', async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user!.userId;
  try {
    const { source, target, label } = req.body;

    if (!source || typeof source !== 'string') {
      res.status(400).json({ success: false, error: 'source is required and must be a string' });
      return;
    }

    if (!target || typeof target !== 'string') {
      res.status(400).json({ success: false, error: 'target is required and must be a string' });
      return;
    }

    const relationship = await createEditorRelationship(
      source.trim(),
      target.trim(),
      typeof label === 'string' ? label.trim() : undefined,
      userId
    );

    res.status(201).json({ success: true, data: relationship });
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      res.status(400).json({ success: false, error: error.message });
      return;
    }
    next(error);
  }
});

router.delete('/relationships/:id', async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user!.userId;
  try {
    const { id } = req.params;
    const deleted = await deleteEditorRelationship(id, userId);

    if (!deleted) {
      res.status(404).json({ success: false, error: 'Relationship not found' });
      return;
    }

    res.json({ success: true, message: 'Relationship deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
