import { Router } from 'express';
import crypto from 'crypto';
import { getDb } from '../db/sqlite';
import { setUserTier } from '../services/userService';
import { logger } from '../lib/logger';
import * as Sentry from '@sentry/node';

const router = Router();

interface WebhookEnvelope {
  id: string;             // Platform event ID (used for dedup)
  provider: string;       // 'wechat' | 'alipay' | 'manual'
  event_type: string;     // 'payment.succeeded' | 'payment.refunded'
  payload: any;           // Vendor-specific payload
  signature: string;      // HMAC-SHA256 of (rawBody + secret)
}

/**
 * Verify HMAC-SHA256 signature using timing-safe compare.
 */
function verifySignature(rawBody: string, signature: string, secret: string): boolean {
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

/**
 * Get provider-specific secret from env.
 */
function getSecret(provider: string): string {
  const envKey = `${provider.toUpperCase()}_WEBHOOK_SECRET`;
  return process.env[envKey] || '';
}

/**
 * POST /api/webhooks/:provider
 * Body: WebhookEnvelope (raw body for HMAC verification)
 *
 * Idempotency: webhook_events.id = platform event ID. INSERT OR IGNORE.
 */
router.post('/:provider', async (req, res, next) => {
  try {
    const provider = req.params.provider;
    const rawBody = JSON.stringify(req.body);  // Verify against original raw body in production
    const envelope: WebhookEnvelope = req.body;

    if (!envelope.id || !envelope.event_type) {
      return res.status(400).json({ success: false, error: 'Invalid envelope' });
    }

    // 1. Signature verify
    const secret = getSecret(provider);
    if (secret && !verifySignature(rawBody, envelope.signature || '', secret)) {
      logger.warn({ provider, eventId: envelope.id }, 'Webhook signature mismatch');
      return res.status(401).json({ success: false, error: 'Invalid signature' });
    }

    const db = getDb();
    const now = new Date().toISOString();

    // 2. Idempotency check via INSERT OR IGNORE on webhook_events
    const insertResult = db.prepare(`
      INSERT OR IGNORE INTO webhook_events (id, provider, event_type, payload, status, created_at)
      VALUES (?, ?, ?, ?, 'pending', ?)
    `).run(envelope.id, provider, envelope.event_type, JSON.stringify(envelope.payload || {}), now);

    if (insertResult.changes === 0) {
      // Already processed — idempotent ack
      logger.info({ provider, eventId: envelope.id }, 'Webhook already processed (duplicate)');
      return res.json({ success: true, duplicate: true });
    }

    // 3. Dispatch by event type
    try {
      if (envelope.event_type === 'payment.succeeded') {
        const { userId, tier, durationDays } = envelope.payload;
        await setUserTier(userId, tier, durationDays);
        logger.info({ provider, eventId: envelope.id, userId, tier }, 'Webhook applied: payment.succeeded');
      } else if (envelope.event_type === 'payment.refunded') {
        const { userId } = envelope.payload;
        await setUserTier(userId, 'free');
        logger.info({ provider, eventId: envelope.id, userId }, 'Webhook applied: payment.refunded');
      }
      // Other events: log + ignore

      // 4. Mark processed
      db.prepare(`UPDATE webhook_events SET status = 'processed' WHERE id = ?`).run(envelope.id);
    } catch (processingErr) {
      db.prepare(`UPDATE webhook_events SET status = 'failed' WHERE id = ?`).run(envelope.id);
      Sentry.captureException(processingErr);
      logger.error({ provider, eventId: envelope.id, err: processingErr }, 'Webhook processing failed');
    }

    res.json({ success: true });
  } catch (err) { next(err); }
});

export default router;
