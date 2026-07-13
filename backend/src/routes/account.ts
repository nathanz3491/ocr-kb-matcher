import { Router } from 'express';
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import * as Sentry from '@sentry/node';
import { asyncHandler } from '../middleware/errorHandler';
import { requireAuth } from '../middleware/auth';
import { getDb } from '../db/sqlite';
import { logger } from '../lib/logger';
import { verifyPassword } from '../services/userService';

const router = Router();

router.post(
  '/delete',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { password } = req.body;

    if (!password || typeof password !== 'string') {
      res.status(400).json({ success: false, error: 'Password required' });
      return;
    }

    const db = getDb();

    const userRow = db
      .prepare('SELECT password_hash, email FROM users WHERE id = ?')
      .get(userId) as { password_hash: string; email: string } | undefined;

    if (!userRow) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    const isMatch = await verifyPassword(password, userRow.password_hash);
    if (!isMatch) {
      res.status(401).json({ success: false, error: 'Wrong password' });
      return;
    }

    const recentDelete = db
      .prepare(
        `SELECT COUNT(*) as cnt FROM audit_log
         WHERE user_id = ? AND action = 'account_delete'
         AND datetime(created_at) > datetime('now', '-1 hour')`
      )
      .get(userId) as { cnt: number };

    if (recentDelete.cnt > 0) {
      res
        .status(429)
        .json({ success: false, error: 'Too many delete attempts; try again later' });
      return;
    }

    const anonId = `anon-${uuidv4()}`;
    const anonEmail = `${anonId}@deleted.local`;
    const originalEmail = userRow.email;

    db.transaction(() => {
      db.prepare(
        `UPDATE users SET
           email = ?,
           name = ?,
           password_hash = '',
           date_of_birth = NULL,
           parent_code = NULL,
           parent_code_expires = NULL,
           email_verification_code = NULL,
           email_verification_expires = NULL
         WHERE id = ?`
      ).run(anonEmail, '已删除用户', userId);

      db.prepare('UPDATE subscriptions SET user_id = ? WHERE user_id = ?').run(anonId, userId);

      db.prepare('UPDATE audit_log SET user_id = ? WHERE user_id = ?').run(anonId, userId);

      db.prepare(
        `INSERT INTO audit_log (id, user_id, action, resource, resource_id, details, ip, user_agent, created_at)
         VALUES (?, ?, 'account_delete', 'user', ?, ?, ?, ?, ?)`
      ).run(
        uuidv4(),
        userId,
        userId,
        JSON.stringify({ anonEmail, originalEmail }),
        req.ip || '',
        req.get('user-agent') || '',
        new Date().toISOString()
      );
    })();

    logger.info({ userId, anonEmail, originalEmail }, 'PIPL account deletion completed');
    Sentry.captureMessage(
      `PIPL account deletion: userId=${userId}, anonEmail=${anonEmail}`,
      'info'
    );

    res
      .status(200)
      .json({ success: true, message: 'Account anonymized per PIPL Article 47' });
  })
);

export default router;
