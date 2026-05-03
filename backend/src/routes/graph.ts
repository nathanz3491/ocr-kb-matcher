/**
 * Graph API Routes
 * RESTful endpoints for knowledge graph operations
 */

import { Router, Request, Response, NextFunction } from 'express';
import {
  createKnowledgeNode,
  getAllNodes,
  getNodeById,
  searchNodesByText,
  getRelatedNodes,
  createRelationship,
  deleteNode,
  updateKnowledgeNode,
  getNodesByCategory,
  getCategories,
} from '../services/knowledgeGraph';
import { getKnowledgeGraphStorage } from '../services/knowledgeGraphStorage';
import { CreateKnowledgeNodeInput } from '../services/knowledgeGraph';

const router = Router();

/**
 * @route GET /api/graph/health
 * @desc Check knowledge graph storage health
 */
router.get('/health', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    const storage = getKnowledgeGraphStorage(userId);
    const stats = await storage.getStatistics();
    res.json({
      status: 'healthy',
      storage: 'json',
      statistics: stats,
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * @route GET /api/graph/nodes
 * @desc Get all knowledge nodes with pagination
 * @query limit - Maximum number of nodes (default: 50)
 * @query offset - Number of nodes to skip (default: 0)
 */
router.get('/nodes', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);

    const result = await getAllNodes(limit, offset, userId);
    
    res.json({
      success: true,
      data: result.nodes,
      pagination: {
        total: result.total,
        limit: result.limit,
        offset: result.offset,
        hasMore: result.offset + result.nodes.length < result.total,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/graph/nodes
 * @desc Create a new knowledge node
 * @body title - Node title (required)
 * @body description - Node description (required)
 * @body category - Node category (required)
 * @body keywords - Array of keywords (optional)
 * @body metadata - Additional metadata object (optional)
 */
router.post('/nodes', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, description, category, keywords, metadata } = req.body;

    // Validate required fields
    if (!title || typeof title !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Title is required and must be a string',
      });
      return;
    }

    if (!description || typeof description !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Description is required and must be a string',
      });
      return;
    }

    if (!category || typeof category !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Category is required and must be a string',
      });
      return;
    }

    const input: CreateKnowledgeNodeInput = {
      title: title.trim(),
      description: description.trim(),
      category: category.trim(),
      keywords: Array.isArray(keywords) ? keywords : [],
      metadata: typeof metadata === 'object' ? metadata : {},
    };

    const userId = req.user?.userId;
    const node = await createKnowledgeNode(input, userId);
    
    res.status(201).json({
      success: true,
      data: node,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/graph/nodes/:id
 * @desc Get a specific node by ID
 */
router.get('/nodes/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    
    const node = await getNodeById(id, userId);
    
    if (!node) {
      res.status(404).json({
        success: false,
        error: 'Node not found',
      });
      return;
    }
    
    res.json({
      success: true,
      data: node,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route PUT /api/graph/nodes/:id
 * @desc Update a knowledge node
 */
router.put('/nodes/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const userId = req.user?.userId;
    
    const node = await updateKnowledgeNode(id, updates, userId);
    
    if (!node) {
      res.status(404).json({
        success: false,
        error: 'Node not found',
      });
      return;
    }
    
    res.json({
      success: true,
      data: node,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route DELETE /api/graph/nodes/:id
 * @desc Delete a node and all its relationships
 */
router.delete('/nodes/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    
    const deleted = await deleteNode(id, userId);
    
    if (!deleted) {
      res.status(404).json({
        success: false,
        error: 'Node not found or could not be deleted',
      });
      return;
    }
    
    res.json({
      success: true,
      message: 'Node deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/graph/nodes/:id/related
 * @desc Get nodes related to a specific node
 * @query type - Filter by relationship type (optional)
 */
router.get('/nodes/:id/related', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const relationshipType = req.query.type as string | undefined;
    const userId = req.user?.userId;
    
    const nodes = await getRelatedNodes(id, relationshipType, userId);
    
    res.json({
      success: true,
      data: nodes,
      count: nodes.length,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/graph/search
 * @desc Search nodes by text
 * @body searchText - Text to search for (required)
 * @body limit - Maximum results (optional, default: 20)
 */
router.post('/search', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { searchText, limit } = req.body;
    
    if (!searchText || typeof searchText !== 'string') {
      res.status(400).json({
        success: false,
        error: 'searchText is required and must be a string',
      });
      return;
    }
    
    const searchLimit = Math.min(parseInt(limit) || 20, 100);
    const userId = req.user?.userId;
    const nodes = await searchNodesByText(searchText.trim(), searchLimit, userId);
    
    res.json({
      success: true,
      data: nodes,
      count: nodes.length,
      searchText: searchText.trim(),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/graph/relationships
 * @desc Create a relationship between two nodes
 * @body fromId - Source node ID (required)
 * @body toId - Target node ID (required)
 * @body type - Relationship type (optional, default: 'RELATED_TO')
 * @body properties - Relationship properties (optional)
 */
router.post('/relationships', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { fromId, toId, type: relationshipType, properties } = req.body;
    
    if (!fromId || typeof fromId !== 'string') {
      res.status(400).json({
        success: false,
        error: 'fromId is required and must be a string',
      });
      return;
    }
    
    if (!toId || typeof toId !== 'string') {
      res.status(400).json({
        success: false,
        error: 'toId is required and must be a string',
      });
      return;
    }
    
    const created = await createRelationship(
      fromId,
      toId,
      relationshipType || 'RELATED_TO',
      typeof properties === 'object' ? properties : {},
      req.user?.userId
    );
    
    if (!created) {
      res.status(400).json({
        success: false,
        error: 'Failed to create relationship. Nodes may not exist.',
      });
      return;
    }
    
    res.status(201).json({
      success: true,
      message: 'Relationship created successfully',
      data: {
        fromId,
        toId,
        type: relationshipType || 'RELATED_TO',
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/graph/categories
 * @desc Get all categories with node counts
 */
router.get('/categories', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    const categories = await getCategories(userId);
    
    res.json({
      success: true,
      data: categories,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/graph/categories/:category/nodes
 * @desc Get nodes by category
 */
router.get('/categories/:category/nodes', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { category } = req.params;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const userId = req.user?.userId;
    
    const nodes = await getNodesByCategory(category, limit, userId);
    
    res.json({
      success: true,
      data: nodes,
      category,
      count: nodes.length,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
