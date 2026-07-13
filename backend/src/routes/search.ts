/**
 * Universal Search API Routes
 * Search across knowledge nodes, pages, and content
 */

import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate } from '../middleware/auth';
import { getKnowledgeGraph } from '../services/knowledgeGraphStorage';

const router = Router();
router.use(authenticate);

router.get('/', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const query = (req.query.q as string || req.query.query as string || '').toLowerCase().trim();
  
  if (!query || query.length < 1) {
    res.json({ success: true, data: { results: [] } });
    return;
  }

  const results: SearchResult[] = [];

  const graph = await getKnowledgeGraph(userId);
  const nodes = graph.nodes.filter(node => 
    node.id.toLowerCase().includes(query) ||
    (node.name && node.name.toLowerCase().includes(query)) ||
    (node.domain && node.domain.toLowerCase().includes(query))
  );

  nodes.slice(0, 10).forEach(node => {
    results.push({
      id: node.id,
      title: node.name || node.id,
      subtitle: node.domain || 'Knowledge Node',
      type: 'node',
      url: `/learn?search=${encodeURIComponent(node.id)}`,
      icon: 'brain'
    });
  });

  const pages = [
    { title: 'Home', subtitle: 'Main dashboard', url: '/', icon: 'home' },
    { title: 'Learn', subtitle: 'Learning hub', url: '/learn', icon: 'graduation' },
    { title: 'Analytics', subtitle: 'View statistics', url: '/analytics', icon: 'chart' },
    { title: 'Progress', subtitle: 'Track progress', url: '/progress', icon: 'trending' },
    { title: 'Knowledge Graph', subtitle: 'Visualize knowledge', url: '/knowledge-graph', icon: 'network' },
    { title: 'Upload Documents', subtitle: 'Upload files', url: '/', icon: 'upload' },
  ];

  pages.forEach(page => {
    if (page.title.toLowerCase().includes(query) || page.subtitle.toLowerCase().includes(query)) {
      results.push({
        id: page.title.toLowerCase().replace(/\s/g, '-'),
        title: page.title,
        subtitle: page.subtitle,
        type: 'page',
        url: page.url,
        icon: page.icon
      });
    }
  });

  const uniqueDomains = [...new Set(graph.nodes.map(n => n.domain).filter(Boolean))];
  uniqueDomains.forEach(domain => {
    if (domain.toLowerCase().includes(query)) {
      results.push({
        id: `domain-${domain}`,
        title: `${domain} Topics`,
        subtitle: `Browse ${domain} knowledge nodes`,
        type: 'domain',
        url: `/learn?domain=${encodeURIComponent(domain)}`,
        icon: 'folder'
      });
    }
  });

  res.json({
    success: true,
    data: {
      query,
      results: results.slice(0, 15),
      total: results.length
    }
  });
}));

interface SearchResult {
  id: string;
  title: string;
  subtitle: string;
  type: 'node' | 'page' | 'domain';
  url: string;
  icon: string;
}

export default router;
