/**
 * Local Graph API Routes
 * Serves the knowledge graph from local JSON file (fast, no Neo4j needed)
 */

import { Router } from 'express';
import { getKnowledgeGraph, getKnowledgeGraphByViewport } from '../services/knowledgeGraphStorage';
import { userProgressService } from '../services/userProgressService';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const userId = req.user?.userId;
    const graph = await getKnowledgeGraph();
    const knownNodes = await userProgressService.getKnownNodeIds(userId ?? '');
    const nodeMasteries = await userProgressService.getAllNodeMasteries(userId ?? '');
    const nodeCount = graph.nodes.length;
    const knownCount = knownNodes.length;
    const etag = `"graph-${nodeCount}-${knownCount}-v2"`;
    
    console.log('[Local Graph] DEBUG: First node position:', graph.nodes[0]?.id, 'x=', graph.nodes[0]?.x, 'y=', graph.nodes[0]?.y);
    console.log('[Local Graph] DEBUG: Total nodes:', graph.nodes.length);
    
    const clientEtag = req.headers['if-none-match'];
    if (clientEtag === etag) {
      return res.status(304).end();
    }
    
    res.setHeader('Cache-Control', 'public, max-age=10, s-maxage=10');
    res.setHeader('ETag', etag);
    res.setHeader('X-Debug-Node-Pos', `${graph.nodes[0]?.id}:${graph.nodes[0]?.x},${graph.nodes[0]?.y}`);
    res.setHeader('X-Debug-Path', process.cwd());
    
    res.json({
      success: true,
      data: {
        ...graph,
        knownNodes,
        nodeMasteries
      }
    });
  } catch (error) {
    console.error('[Local Graph] Failed to load graph:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load knowledge graph'
    });
  }
});

router.get('/viewport', async (req, res) => {
  try {
    const userId = req.user?.userId;
    const x = parseInt(req.query.x as string) || 0;
    const y = parseInt(req.query.y as string) || 0;
    const width = parseInt(req.query.width as string) || 1920;
    const height = parseInt(req.query.height as string) || 1080;
    
    const result = await getKnowledgeGraphByViewport({ x, y, width, height });
    const knownNodes = await userProgressService.getKnownNodeIds(userId ?? '');
    const nodeMasteries = await userProgressService.getAllNodeMasteries(userId ?? '');
    
    res.json({
      success: true,
      data: {
        ...result,
        knownNodes,
        nodeMasteries
      }
    });
  } catch (error) {
    console.error('[Local Graph] Viewport query failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to query viewport'
    });
  }
});

router.post('/sync', async (req, res) => {
  try {
    const graph = await getKnowledgeGraph();
    res.json({
      success: true,
      data: graph
    });
  } catch (error) {
    console.error('[Local Graph] Failed to reload graph:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reload knowledge graph'
    });
  }
});

export default router;
