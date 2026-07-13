import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { setUserTier } from '../services/userService';
import { getDb } from '../db/sqlite';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../lib/logger';

const router = Router();

// Hardcoded test codes (production: load from codes table or external API)
const REDEEM_CODES: Record<string, { tier: 'monthly' | 'yearly'; durationDays: number }> = {
  'TEST-MONTHLY-2026Q4': { tier: 'monthly', durationDays: 30 },
  'TEST-YEARLY-2026Q4': { tier: 'yearly', durationDays: 365 },
};

// In-memory used-codes tracking (production: codes table)
const usedCodes = new Set<string>();

/**
 * POST /api/subscriptions/redeem
 * Body: { code: string }
 * Activates user tier from a code purchased on the sales platform.
 */
router.post('/redeem', requireAuth, async (req, res, next) => {
  try {
    const { code } = req.body;
    if (!code || typeof code !== 'string') {
      return res.status(400).json({ success: false, error: 'Code required' });
    }

    const codeConfig = REDEEM_CODES[code];
    if (!codeConfig) {
      return res.status(404).json({ success: false, error: 'Code not found' });
    }
    if (usedCodes.has(code)) {
      return res.status(410).json({ success: false, error: 'Code already used' });
    }

    const userId = req.user!.userId;
    const updatedUser = await setUserTier(userId, codeConfig.tier, codeConfig.durationDays);
    if (!updatedUser) {
      return res.status(500).json({ success: false, error: 'Failed to update tier' });
    }

    const db = getDb();
    const now = new Date().toISOString();
    const expiresAt = updatedUser.subscriptionExpiresAt || '';

    // Write subscriptions row
    db.prepare(`
      INSERT INTO subscriptions (id, user_id, tier, started_at, expires_at, payment_provider, payment_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(uuidv4(), userId, codeConfig.tier, now, expiresAt, 'redeem_code', code, now);

    // Write audit_log entry
    db.prepare(`
      INSERT INTO audit_log (id, user_id, action, resource, resource_id, details, ip, user_agent, created_at)
      VALUES (?, ?, 'redeem_code', 'subscription', ?, ?, ?, ?, ?)
    `).run(uuidv4(), userId, code, JSON.stringify({ tier: codeConfig.tier, code }), req.ip || '', req.get('user-agent') || '', now);

    usedCodes.add(code);
    logger.info({ userId, tier: codeConfig.tier, code }, 'Redeem code activated');

    res.json({
      success: true,
      tier: codeConfig.tier,
      expiresAt: expiresAt,
      message: `已升级到${codeConfig.tier === 'monthly' ? '月卡' : '年卡'}`,
    });
  } catch (err) { next(err); }
});

/**
 * GET /api/subscriptions/history
 * Returns the user's subscription history.
 */
router.get('/history', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const db = getDb();
    const rows = db.prepare(`
      SELECT id, tier, started_at, expires_at, payment_provider, created_at
      FROM subscriptions WHERE user_id = ? ORDER BY created_at DESC
    `).all(userId);
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
});

export default router;
