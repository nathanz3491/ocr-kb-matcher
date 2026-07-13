/**
 * Admin API Routes
 * User management and stats — all gated by requireAdmin middleware.
 */

import { Router, Request, Response } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import {
  getAllUsers,
  getUserById,
  saveUser,
  setUserTier,
  updateUser,
} from '../services/userService';
import { Tier, UserRole } from '../../../shared/types';
import { User } from '../types/auth';
import { logger } from '../lib/logger';
import { logAdminAction, getAuditLog } from '../services/auditLog';

const router = Router();
router.use(authenticate);
router.use(requireAdmin);

const VALID_TIERS: readonly Tier[] = ['free', 'monthly', 'yearly'];
const VALID_ROLES: readonly UserRole[] = ['user', 'admin'];

function sanitizeUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    tier: user.tier ?? 'free',
    role: user.role ?? 'user',
    subscriptionStartedAt: user.subscriptionStartedAt ?? null,
    subscriptionExpiresAt: user.subscriptionExpiresAt ?? null,
    usage: user.usage ?? {
      periodStart: '',
      uploads: 0,
      quizGenerated: 0,
      chatMessages: 0,
    },
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

// ──────────────────────────────────────────────
// 1. GET /api/admin/users — list all users
// ──────────────────────────────────────────────
router.get(
  '/users',
  asyncHandler(async (_req: Request, res: Response) => {
    const users = await getAllUsers();
    res.json({ success: true, data: users.map(sanitizeUser) });
  })
);

// ──────────────────────────────────────────────
// 2. GET /api/admin/users/:userId — single user
// ──────────────────────────────────────────────
router.get(
  '/users/:userId',
  asyncHandler(async (req: Request, res: Response) => {
    const user = await getUserById(req.params.userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }
    res.json({ success: true, data: sanitizeUser(user) });
  })
);

// ──────────────────────────────────────────────
// 3. PATCH /api/admin/users/:userId/tier — set tier
// ──────────────────────────────────────────────
router.patch(
  '/users/:userId/tier',
  asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;
    const { tier, durationDays } = req.body as {
      tier?: string;
      durationDays?: number;
    };

    if (!tier || !VALID_TIERS.includes(tier as Tier)) {
      throw new AppError(
        `Invalid tier "${tier}". Must be one of: ${VALID_TIERS.join(', ')}`,
        400
      );
    }

    const validTier = tier as Tier;
    const user = await getUserById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    const before = {
      tier: user.tier ?? 'free',
      subscriptionExpiresAt: user.subscriptionExpiresAt ?? null,
    };

    if (validTier === 'free') {
      await setUserTier(userId, 'free');
      await updateUser(userId, {
        subscriptionExpiresAt: undefined,
        subscriptionStartedAt: undefined,
      } as Partial<User>);
      logger.info({ adminId: req.user?.userId, targetUserId: userId, tier: 'free' }, 'Admin downgraded user to free tier');
    } else {
      const days =
        durationDays && durationDays > 0
          ? durationDays
          : validTier === 'monthly'
            ? 30
            : 365;
      await setUserTier(userId, validTier, days);
      logger.info({ adminId: req.user?.userId, targetUserId: userId, tier: validTier, durationDays: days }, 'Admin set user tier');
    }

    const updated = await getUserById(userId);
    const after = {
      tier: updated?.tier ?? 'free',
      subscriptionExpiresAt: updated?.subscriptionExpiresAt ?? null,
    };
    logAdminAction(req.user?.userId, 'tier_update', userId, before, after, req);

    res.json({ success: true, data: sanitizeUser(updated!) });
  })
);

// ──────────────────────────────────────────────
// 4. PATCH /api/admin/users/:userId/role — set role
// ──────────────────────────────────────────────
router.patch(
  '/users/:userId/role',
  asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;
    const { role } = req.body as { role?: string };

    if (!role || !VALID_ROLES.includes(role as UserRole)) {
      throw new AppError(
        `Invalid role "${role}". Must be one of: ${VALID_ROLES.join(', ')}`,
        400
      );
    }

    const user = await getUserById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    const before = { role: user.role ?? 'user' };

    user.role = role as UserRole;
    await saveUser(user);

    const after = { role: user.role };
    logAdminAction(req.user?.userId, 'role_update', userId, before, after, req);

    res.json({ success: true, data: sanitizeUser(user) });
  })
);

// ──────────────────────────────────────────────
// 5. GET /api/admin/audit-log — compliance audit
// ──────────────────────────────────────────────
router.get(
  '/audit-log',
  asyncHandler(async (req: Request, res: Response) => {
    const { userId, action, limit } = req.query as {
      userId?: string;
      action?: string;
      limit?: string;
    };

    const entries = getAuditLog({
      userId,
      action,
      adminId: undefined, // omit — return all admins unless queried
      limit: limit ? parseInt(limit, 10) : 50,
    });

    res.json({ success: true, data: { entries } });
  })
);

// ──────────────────────────────────────────────
// 6. GET /api/admin/stats — aggregate stats
// ──────────────────────────────────────────────
router.get(
  '/stats',
  asyncHandler(async (_req: Request, res: Response) => {
    const users = await getAllUsers();

    const freeUsers = users.filter((u) => (u.tier ?? 'free') === 'free');
    const monthlyUsers = users.filter((u) => u.tier === 'monthly');
    const yearlyUsers = users.filter((u) => u.tier === 'yearly');

    const totalUsers = users.length;
    const freeCount = freeUsers.length;
    const paidCount = monthlyUsers.length + yearlyUsers.length;
    const estimatedMRR = monthlyUsers.length * 19 + yearlyUsers.length * 198;
    const totalUploadsThisMonth = users.reduce(
      (sum, u) => sum + (u.usage?.uploads ?? 0),
      0
    );

    res.json({
      success: true,
      data: {
        totalUsers,
        freeCount,
        paidCount,
        estimatedMRR,
        totalUploadsThisMonth,
      },
    });
  })
);

export default router;
