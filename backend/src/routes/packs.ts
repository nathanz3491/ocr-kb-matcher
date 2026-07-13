import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import { optionalAuth } from '../middleware/auth';
import { getUserById } from '../services/userService';
import { Tier } from '../../../shared/types';

const router = Router();

/** Resolve user tier from req.user or DB fallback */
async function resolveTier(req: any): Promise<Tier> {
  // 1) JWT-based (req.user.tier is NOT in JWT — see jwtService.ts — but future-proof)
  if (req.user?.tier === 'monthly' || req.user?.tier === 'yearly') return req.user.tier;
  // 2) DB lookup for authenticated users
  if (req.user?.userId) {
    try {
      const user = await getUserById(req.user.userId);
      if (user?.tier === 'monthly' || user?.tier === 'yearly') return user.tier;
    } catch { /* DB error → fall through to free */ }
  }
  return 'free';
}

const PACKS_DIR = path.join(__dirname, '../../data/packs');
const PACK_STATUSES = ['coming_soon', 'partial', 'complete', 'preview'] as const;
type PackStatus = typeof PACK_STATUSES[number];

interface PackMetadata {
  id: string;
  name: string;
  subject: string;
  grade: string;
  status: PackStatus;
  totalNodes: number;
  loadedNodes: number;
  previewNodeCount: number;
  price: string;
  description: string;
}

/**
 * GET /api/packs
 * Returns metadata for all available packs. No full node content.
 */
router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const packs: PackMetadata[] = [];
    if (!fs.existsSync(PACKS_DIR)) {
      return res.json({ success: true, data: [] });
    }
    const dirs = fs.readdirSync(PACKS_DIR);
    for (const dir of dirs) {
      const metaPath = path.join(PACKS_DIR, dir, 'metadata.json');
      if (fs.existsSync(metaPath)) {
        const meta: PackMetadata = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
        packs.push(meta);
      }
    }
    res.json({ success: true, data: packs });
  } catch (err) { next(err); }
});

/**
 * GET /api/packs/:packId
 * Returns metadata + node content. Node count gated by user tier.
 */
router.get('/:packId', optionalAuth, async (req, res, next) => {
  try {
    const packId = req.params.packId;
    const metaPath = path.join(PACKS_DIR, packId, 'metadata.json');
    if (!fs.existsSync(metaPath)) {
      return res.status(404).json({ success: false, error: 'Pack not found' });
    }
    const meta: PackMetadata = JSON.parse(fs.readFileSync(metaPath, 'utf8'));

    const tier = await resolveTier(req);
    const isPaid = tier === 'monthly' || tier === 'yearly';
    const nodeLimit = isPaid ? meta.loadedNodes : Math.min(meta.loadedNodes, meta.previewNodeCount);

    let nodes: any[] = [];
    if (nodeLimit > 0) {
      const nodesPath = path.join(PACKS_DIR, packId, 'nodes.json');
      if (fs.existsSync(nodesPath)) {
        const allNodes = JSON.parse(fs.readFileSync(nodesPath, 'utf8'));
        nodes = (Array.isArray(allNodes) ? allNodes : []).slice(0, nodeLimit);
      }
    }

    res.json({
      success: true,
      data: {
        ...meta,
        canAccess: isPaid || meta.status === 'coming_soon' || meta.previewNodeCount > 0,
        visibleNodes: nodes.length,
        lockedNodes: Math.max(0, meta.totalNodes - nodes.length),
        nodes,
      }
    });
  } catch (err) { next(err); }
});

/**
 * GET /api/packs/:packId/access
 * Lightweight tier-based access info — no node loading.
 * Used by UI to decide whether to show a lock overlay.
 */
router.get('/:packId/access', optionalAuth, async (req, res, next) => {
  try {
    const packId = req.params.packId;
    const metaPath = path.join(PACKS_DIR, packId, 'metadata.json');
    if (!fs.existsSync(metaPath)) {
      return res.status(404).json({ success: false, error: 'Pack not found' });
    }
    const meta: PackMetadata = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
    const tier = await resolveTier(req);
    const isPaid = tier === 'monthly' || tier === 'yearly';

    res.json({
      success: true,
      data: {
        tier,
        canAccess: isPaid,
        previewNodes: meta.previewNodeCount,
        totalNodes: meta.totalNodes,
        loadedNodes: meta.loadedNodes,
        lockedReason: isPaid ? null : 'Upgrade to monthly or yearly to unlock all nodes',
      }
    });
  } catch (err) { next(err); }
});

export default router;
