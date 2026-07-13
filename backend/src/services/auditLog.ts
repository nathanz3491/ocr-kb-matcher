/**
 * Admin Action Audit Log
 *
 * Persists admin mutations to the SQLite `audit_log` table for
 * compliance audits and support investigations.
 *
 * Uses better-sqlite3 (sync API) — same DB singleton as all services.
 */

import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/sqlite';
import { logger } from '../lib/logger';
import type { Request } from 'express';

// ── Public types ─────────────────────────────────────────────

export interface AuditLogFilters {
  /** Filter by target user (the user whose data was changed) */
  userId?: string;
  /** Filter by action type (e.g. 'tier_update', 'role_update') */
  action?: string;
  /** Filter by the admin who performed the action */
  adminId?: string;
  /** Max rows to return (default 100) */
  limit?: number;
}

export interface AuditLogEntry {
  id: string;
  adminId: string | null;
  action: string;
  targetUserId: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
}

// ── Column mapping ──────────────────────────────────────────
// SQLite columns map to API fields:
//   user_id    → adminId     (the admin who performed the action)
//   resource   → (internal only — always 'user')
//   resource_id → targetUserId
//   details    → JSON { before, after }

// ── Write ───────────────────────────────────────────────────

/**
 * Log an admin action to the audit_log table.
 *
 * Pass `req` (express Request) to capture ip + user-agent automatically.
 */
export function logAdminAction(
  adminId: string | undefined,
  action: string,
  targetUserId: string,
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  req?: Pick<Request, 'ip' | 'headers'>
): void {
  try {
    const db = getDb();
    const id = uuidv4();
    const now = new Date().toISOString();
    const ip = req?.ip ?? null;
    const userAgent = req?.headers?.['user-agent'] ?? null;

    const stmt = db.prepare(`
      INSERT INTO audit_log (id, user_id, action, resource, resource_id, details, ip, user_agent, created_at)
      VALUES (?, ?, ?, 'user', ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      adminId ?? null,
      action,
      targetUserId,
      JSON.stringify({ before, after }),
      ip,
      userAgent,
      now
    );

    logger.debug(
      { auditId: id, adminId, action, targetUserId },
      'Audit log entry written'
    );
  } catch (err) {
    // Audit failure must never block the primary operation
    logger.error({ err, adminId, action, targetUserId }, 'Failed to write audit log');
  }
}

// ── Read ────────────────────────────────────────────────────

/**
 * Query the audit log with optional filters.
 *
 * @param filters.userId  — target user (the user whose data was changed)
 * @param filters.action  — e.g. 'tier_update', 'role_update'
 * @param filters.adminId — the admin who performed the action
 * @param filters.limit   — max rows (default 100, capped at 500)
 */
export function getAuditLog(filters: AuditLogFilters = {}): AuditLogEntry[] {
  const db = getDb();
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (filters.userId) {
    conditions.push('resource_id = ?');
    params.push(filters.userId);
  }

  if (filters.action) {
    conditions.push('action = ?');
    params.push(filters.action);
  }

  if (filters.adminId) {
    conditions.push('user_id = ?');
    params.push(filters.adminId);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = Math.min(filters.limit ?? 100, 500);

  const rows = db
    .prepare(
      `SELECT * FROM audit_log ${where} ORDER BY created_at DESC LIMIT ?`
    )
    .all(...params, limit) as Array<{
      id: string;
      user_id: string | null;
      action: string;
      resource_id: string | null;
      details: string | null;
      ip: string | null;
      user_agent: string | null;
      created_at: string;
    }>;

  return rows.map((row) => {
    let before: Record<string, unknown> | null = null;
    let after: Record<string, unknown> | null = null;

    if (row.details) {
      try {
        const parsed = JSON.parse(row.details);
        before = parsed.before ?? null;
        after = parsed.after ?? null;
      } catch {
        before = { raw: row.details };
        after = null;
      }
    }

    return {
      id: row.id,
      adminId: row.user_id,
      action: row.action,
      targetUserId: row.resource_id,
      before,
      after,
      ip: row.ip,
      userAgent: row.user_agent,
      createdAt: row.created_at,
    };
  });
}
