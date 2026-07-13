import { Request, Response, NextFunction } from 'express';
import { Tier, Usage } from '../../../shared/types';
import { requireAuth } from './auth';
import { getDb } from '../db/sqlite';
import * as Sentry from '@sentry/node';
import {
  TIER_LIMITS,
  getCurrentMonthStart,
  isCurrentPeriod,
  nextAnniversaryDate,
} from '../config/tiers';

/**
 * Resource types that can be rate-limited by tier quota.
 * Must match the keys on both TIER_LIMITS[tier] and Usage.
 */
export type QuotaResource = 'uploads' | 'quizGenerated' | 'chatMessages';

declare global {
  namespace Express {
    interface Request {
      /**
       * Attached by enforceQuota middleware for downstream logging.
       * Only present when quota check passes (not on 429 responses).
       */
      quotaInfo?: {
        tier: Tier;
        resource: QuotaResource;
        used: number;
        limit: number;
      };
    }
  }
}

/** Chinese labels shown in 429 error messages. */
const RESOURCE_LABELS: Record<QuotaResource, string> = {
  uploads: '上传',
  quizGenerated: '测验生成',
  chatMessages: 'AI 聊天',
};

/** Factory that produces a fresh default Usage object for the current period. */
function freshUsage(): Usage {
  return {
    periodStart: getCurrentMonthStart(),
    uploads: 0,
    quizGenerated: 0,
    chatMessages: 0,
  };
}

/**
 * Tier-based quota enforcement middleware.
 *
 * ## Concurrency
 *
 * The quota counter increment uses a single atomic SQL UPDATE with a
 * `WHERE json_extract(usage, '$.<resource>') < ?` guard, wrapped in
 * better-sqlite3's synchronous `db.transaction()`.  Two concurrent requests
 * CANNOT both pass the quota gate because SQLite serialises writes — the
 * second UPDATE will see the counter already at the limit and return
 * `changes === 0`.
 *
 * ## Period semantics
 *
 * | Tier    | Period start       | Duration          |
 * |---------|--------------------|-------------------|
 * | free    | 1st of UTC month   | 1 calendar month  |
 * | monthly | subscription start  | 31 days           |
 * | yearly  | subscription start  | 365 days          |
 *
 * @param resource Which usage counter to enforce against.
 * @returns Express middleware — requires `authenticate` (or `optionalAuth`)
 *          to have run beforehand so that `req.user` is populated.
 */
export function enforceQuota(resource: QuotaResource) {
  return (req: Request, res: Response, next: NextFunction): void => {
    requireAuth(req, res, async () => {
      try {
        const userId = req.user!.userId;
        const db = getDb();
        const now = new Date();

        // ── Read user from SQLite ─────────────────────────────
        const row = db.prepare(`
          SELECT tier, subscription_started_at, subscription_expires_at, usage
          FROM users WHERE id = ?
        `).get(userId) as {
          tier: string | null;
          subscription_started_at: string | null;
          subscription_expires_at: string | null;
          usage: string | null;
        } | undefined;

        if (!row) {
          res.status(500).json({ success: false, error: 'Internal error: user not found' });
          return;
        }

        let tier: Tier = (row.tier as Tier) ?? 'free';
        let usage: Usage = row.usage ? (JSON.parse(row.usage) as Usage) : freshUsage();

        // ── Lazy tier downgrade ──────────────────────────────
        // If the user's paid subscription has expired, silently
        // downgrade to 'free' and reset usage counters.
        if (tier !== 'free' && row.subscription_expires_at) {
          if (new Date(row.subscription_expires_at) < now) {
            tier = 'free';
            usage = freshUsage();
            db.prepare(
              'UPDATE users SET tier = ?, subscription_expires_at = NULL, usage = ? WHERE id = ?'
            ).run('free', JSON.stringify(usage), userId);
          }
        }

        // ── Period rollover (Fix 1.2) ───────────────────────
        // Branch on tier: free → 1st of month; paid → subscription anniversary.
        if (!isCurrentPeriod({ tier, usage }, now)) {
          usage.uploads = 0;
          usage.quizGenerated = 0;
          usage.chatMessages = 0;

          if (tier === 'free') {
            usage.periodStart = freshUsage().periodStart;
          } else {
            const subscriptionStartedAt = row.subscription_started_at;
            if (!subscriptionStartedAt) {
              Sentry.captureMessage(
                `Paid user ${userId} missing subscription_started_at; falling back to month-start for period rollover`,
                'warning',
              );
              usage.periodStart = freshUsage().periodStart;
            } else {
              // Advance from the subscription anchor date in period-sized
              // steps (1 month for monthly, 1 year for yearly) until we find
              // the period that contains `now`.
              const anchor = new Date(subscriptionStartedAt);
              const periodStart = new Date(anchor);
              while (true) {
                const periodEnd = new Date(periodStart);
                if (tier === 'monthly') {
                  periodEnd.setUTCMonth(periodEnd.getUTCMonth() + 1);
                } else {
                  // yearly
                  periodEnd.setUTCFullYear(periodEnd.getUTCFullYear() + 1);
                }
                if (now >= periodStart && now < periodEnd) break;
                if (tier === 'monthly') {
                  periodStart.setUTCMonth(periodStart.getUTCMonth() + 1);
                } else {
                  periodStart.setUTCFullYear(periodStart.getUTCFullYear() + 1);
                }
              }
              usage.periodStart = periodStart.toISOString();
            }
          }

          // Persist rolled-over usage to DB before the atomic increment.
          db.prepare('UPDATE users SET usage = ? WHERE id = ?')
            .run(JSON.stringify(usage), userId);
        }

        // ── Atomic quota check + increment (Fix 1.1) ────────
        // Single SQL statement wrapped in a transaction: the WHERE guard
        // ensures the counter is strictly below the limit BEFORE incrementing.
        // SQLite serialises writes, so two concurrent requests for the same
        // user will never both see the counter below the limit.
        const limit = TIER_LIMITS[tier][resource];

        const incrementResult = db.transaction(() => {
          return db.prepare(`
            UPDATE users
            SET usage = json_set(
              usage,
              '$.${resource}',
              COALESCE(json_extract(usage, '$.${resource}'), 0) + 1
            )
            WHERE id = ?
              AND COALESCE(json_extract(usage, '$.${resource}'), 0) < ?
          `).run(userId, limit);
        })();

        if (incrementResult.changes === 0) {
          // Either user not found OR quota exceeded — disambiguate.
          const checkRow = db.prepare(`
            SELECT json_extract(usage, '$.${resource}') as used FROM users WHERE id = ?
          `).get(userId) as { used: number | null } | undefined;

          if (!checkRow) {
            res.status(500).json({ success: false, error: 'Internal error: user not found' });
            return;
          }

          const used = checkRow.used ?? 0;

          // ── Compute resetsAt (Fix 1.4) ─────────────────
          // Free: next 1st of month.  Paid: next subscription anniversary.
          const subscriptionStartedAt = row.subscription_started_at;
          const resetsAt = tier === 'free'
            ? nextAnniversaryDate(usage.periodStart, 'free', now)
            : nextAnniversaryDate(
                subscriptionStartedAt ?? usage.periodStart,
                tier,
                now,
              );

          res.status(429).json({
            success: false,
            error: 'QUOTA_EXCEEDED',
            resource,
            quota: { used, limit, tier, resetsAt },
            message: `本月${RESOURCE_LABELS[resource]}额度已用完（${used}/${limit}）。升级套餐获取更多额度。`,
          });
          return;
        }

        // ── Success — read post-increment counter ──────────────
        const afterRow = db.prepare(`
          SELECT json_extract(usage, '$.${resource}') as used FROM users WHERE id = ?
        `).get(userId) as { used: number };

        req.quotaInfo = { tier, resource, used: afterRow.used, limit };

        next();
      } catch (err) {
        next(err);
      }
    });
  };
}
