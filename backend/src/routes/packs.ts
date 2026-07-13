import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import { optionalAuth } from '../middleware/auth';
import { getDb } from '../db/sqlite';

const router = Router();

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
 * Returns metadata + visible nodes based on user tier.
 */
router.get('/:packId', optionalAuth, async (req, res, next) => {
  try {
    const packId = req.params.packId;
    const metaPath = path.join(PACKS_DIR, packId, 'metadata.json');
    if (!fs.existsSync(metaPath)) {
      return res.status(404).json({ success: false, error: 'Pack not found' });
    }
    const meta: PackMetadata = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
    
    // Tier-based node visibility (free preview vs paid full)
    const tier = (req.user as any)?.tier ?? 'free';
    const isPaid = tier === 'monthly' || tier === 'yearly';
    const visibleNodes = isPaid ? meta.loadedNodes : Math.min(meta.loadedNodes, meta.previewNodeCount);
    
    res.json({
      success: true,
      data: {
        ...meta,
        canAccess: isPaid || meta.status === 'coming_soon' || meta.previewNodeCount > 0,
        visibleNodes,
        lockedNodes: Math.max(0, meta.totalNodes - visibleNodes),
      }
    });
  } catch (err) { next(err); }
});

export default router;
