/**
 * Knowledge Graph Routes
 * API endpoints for accessing and managing the knowledge graph
 */

import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { getKnowledgeGraphStorage } from '../services/knowledgeGraphStorage';

const router = Router();
router.use(authenticate);

/**
 * GET /api/knowledge-graph
 * Get the full global knowledge graph
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const storage = getKnowledgeGraphStorage(userId);
    await storage.initialize();
    const graph = await storage.getGlobalGraph();
    res.json({ success: true, data: graph });
  } catch (error) {
    console.error('Error loading knowledge graph:', error);
    res.status(500).json({ success: false, error: 'Failed to load knowledge graph' });
  }
});

/**
 * GET /api/knowledge-graph/statistics
 * Get graph statistics
 */
router.get('/statistics', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const storage = getKnowledgeGraphStorage(userId);
    await storage.initialize();
    const stats = await storage.getStatistics();
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error loading statistics:', error);
    res.status(500).json({ success: false, error: 'Failed to load statistics' });
  }
});

/**
 * GET /api/knowledge-graph/jobs/:jobId
 * Get a specific job's contribution to the knowledge graph
 */
router.get('/jobs/:jobId', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const storage = getKnowledgeGraphStorage(userId);
    await storage.initialize();
    const contribution = await storage.getJobContribution(req.params.jobId);
    
    if (!contribution) {
      res.status(404).json({
        success: false,
        error: 'Job contribution not found',
      });
      return;
    }
    
    res.json({ success: true, data: contribution });
  } catch (error) {
    console.error('Error loading job contribution:', error);
    res.status(500).json({ success: false, error: 'Failed to load job contribution' });
  }
});

/**
 * GET /api/knowledge-graph/search
 * Search the knowledge graph (placeholder for future implementation)
 */
router.get('/search', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const storage = getKnowledgeGraphStorage(userId);
    await storage.initialize();
    const { query } = req.query;
    
    if (!query || typeof query !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Query parameter is required',
      });
      return;
    }
    
    // Get global graph and perform simple search
    const graph = await storage.getGlobalGraph();
    const searchTerm = query.toLowerCase();
    
    // Search nodes by label
    const matchingNodes = graph.nodes.filter(node => 
      node.data.label.toLowerCase().includes(searchTerm)
    );
    
    // Get related edges
    const nodeIds = new Set(matchingNodes.map(n => n.id));
    const relatedEdges = graph.edges.filter(edge => 
      nodeIds.has(edge.source) || nodeIds.has(edge.target)
    );
    
    res.json({
      success: true,
      data: {
        nodes: matchingNodes,
        edges: relatedEdges,
        totalResults: matchingNodes.length,
      },
    });
  } catch (error) {
    console.error('Error searching knowledge graph:', error);
    res.status(500).json({ success: false, error: 'Failed to search knowledge graph' });
  }
});

/**
 * DELETE /api/knowledge-graph/jobs/:jobId
 * Remove a job's contribution from the knowledge graph
 */
router.delete('/jobs/:jobId', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const storage = getKnowledgeGraphStorage(userId);
    await storage.initialize();
    await storage.removeJobContribution(req.params.jobId);
    res.json({ success: true, data: { message: 'Job contribution removed successfully' } });
  } catch (error) {
    console.error('Error removing job contribution:', error);
    res.status(500).json({ success: false, error: 'Failed to remove job contribution' });
  }
});

export default router;
