import { Request, Response, NextFunction } from 'express';
import { Tier } from '../../../shared/types';
import { requireAuth } from './auth';
import { getUserById, saveUser } from '../services/userService';
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
function freshUsage() {
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
 * ## RACE CONDITION NOTE
 *
 * This middleware reads from and writes to `users.json` via the in-memory
 * cache without any locking.  Two concurrent requests from the same user
 * may both read `used = N-1`, both increment to N, and both persist —
 * temporarily allowing 1–2 extra operations before the counter stabilises.
 * This is an accepted trade-off for the JSON-backed single-process storage.
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

        // Always re-read from disk — never trust an in-memory cache
        // that may be stale across multiple requests.
        const user = await getUserById(userId);
        if (!user) {
          res.status(500).json({ success: false, error: 'Internal error: user not found' });
          return;
        }

        const now = new Date();
        let tier: Tier = user.tier ?? 'free';

        // ── Lazy tier downgrade ──────────────────────────────────
        // If the user's paid subscription has expired, silently
        // downgrade to 'free' and reset usage counters.
        if (tier !== 'free' && user.subscriptionExpiresAt) {
          if (new Date(user.subscriptionExpiresAt) < now) {
            tier = 'free';
            user.tier = 'free';
            user.subscriptionExpiresAt = undefined;
            user.usage = freshUsage();
            await saveUser(user);
          }
        }

        // ── Ensure a usage object exists ─────────────────────────
        const usage = user.usage ?? freshUsage();
        if (!user.usage) {
          user.usage = usage;
        }

        // ── Period rollover ──────────────────────────────────────
        // If the current date falls outside the usage period window,
        // reset counters and bump periodStart forward.
        if (!isCurrentPeriod({ tier, usage }, now)) {
          const fresh = freshUsage();
          usage.periodStart = fresh.periodStart;
          usage.uploads = 0;
          usage.quizGenerated = 0;
          usage.chatMessages = 0;
          user.usage = usage;
        }

        // ── Quota check ──────────────────────────────────────────
        const limit = TIER_LIMITS[tier][resource];
        const used = usage[resource];

        if (used >= limit) {
          const resetsAt = nextAnniversaryDate(usage.periodStart, tier, now);

          res.status(429).json({
            success: false,
            error: 'QUOTA_EXCEEDED',
            resource,
            quota: { used, limit, tier, resetsAt },
            message: `本月${RESOURCE_LABELS[resource]}额度已用完（${used}/${limit}）。升级套餐获取更多额度。`,
          });
          return;
        }

        // ── Increment & persist ──────────────────────────────────
        usage[resource]++;
        user.usage = usage;
        await saveUser(user);

        // Attach quota snapshot for downstream middleware / logging.
        req.quotaInfo = { tier, resource, used: usage[resource], limit };

        next();
      } catch (err) {
        next(err);
      }
    });
  };
}
