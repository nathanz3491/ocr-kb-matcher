import { Request, Response, NextFunction } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { logger } from '../lib/logger';

// Use process.cwd() as the project root — the backend is always started
// from the backend/ directory, so this resolves correctly in dev and prod.
const AUDIT_LOG_PATH = path.join(process.cwd(), 'data', 'audit.log');

/**
 * Ensure the data directory exists before writing the log file.
 */
function ensureLogDirectory(): void {
  const dir = path.dirname(AUDIT_LOG_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

interface AuditEntry {
  id: string;
  timestamp: string;
  event: string;
  ip: string;
  method: string;
  path: string;
  statusCode?: number;
  userId?: string;
  userAgent?: string;
  details?: Record<string, unknown>;
}

/**
 * Append a single JSON line to the audit log.
 * Failures are caught and logged to console.error — never thrown.
 */
function appendToLog(entry: AuditEntry): void {
  try {
    ensureLogDirectory();
    // Strip undefined fields for clean, compact JSON
    const cleaned: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(entry)) {
      if (value !== undefined) {
        cleaned[key] = value;
      }
    }
    fs.appendFileSync(AUDIT_LOG_PATH, JSON.stringify(cleaned) + '\n');
  } catch (err) {
    logger.error({ err }, 'Failed to write audit log entry');
  }
}

/**
 * Extract common fields from the request for any audit entry.
 * NEVER includes request body, passwords, headers, or tokens.
 */
function getBaseFields(req: Request): Pick<AuditEntry, 'ip' | 'method' | 'path' | 'userAgent'> {
  return {
    ip: req.ip || req.socket.remoteAddress || 'unknown',
    method: req.method,
    path: req.originalUrl.split('?')[0],
    userAgent: (req.headers['user-agent'] as string) || 'unknown',
  };
}

/**
 * Audit middleware — logs security-relevant events via `res.on('finish')`.
 *
 * Captured events:
 *  - 401 → "auth_failed"   (unauthenticated requests to protected routes)
 *  - 403 → "authz_failed"  (authenticated but insufficient permissions)
 *  - PUT/DELETE/PATCH on /api/graph, /api/graph-editor, /api/upload → "mutation"
 *
 * Does NOT block the response — logging failures are silently caught.
 */
export function auditMiddleware(req: Request, res: Response, next: NextFunction): void {
  res.on('finish', () => {
    const statusCode = res.statusCode;
    const userId = req.user?.userId;

    // --- 401: authentication failures ---
    if (statusCode === 401) {
      appendToLog({
        id: randomUUID(),
        timestamp: new Date().toISOString(),
        event: 'auth_failed',
        ...getBaseFields(req),
        statusCode,
        userId,
      });
      return;
    }

    // --- 403: authorization failures ---
    if (statusCode === 403) {
      appendToLog({
        id: randomUUID(),
        timestamp: new Date().toISOString(),
        event: 'authz_failed',
        ...getBaseFields(req),
        statusCode,
        userId,
      });
      return;
    }

    // --- Mutations (PUT/DELETE/PATCH) on protected routes ---
    if (['PUT', 'DELETE', 'PATCH'].includes(req.method) && statusCode < 400) {
      const reqPath = req.originalUrl.split('?')[0];
      const protectedPrefixes = ['/api/graph', '/api/graph-editor', '/api/upload'];
      if (protectedPrefixes.some(prefix => reqPath.startsWith(prefix))) {
        appendToLog({
          id: randomUUID(),
          timestamp: new Date().toISOString(),
          event: 'mutation',
          ...getBaseFields(req),
          statusCode,
          userId,
        });
      }
    }
  });

  next();
}

/**
 * Explicitly log an auth-related event from a route handler.
 *
 * Used for login (success + failure) and logout, where the event fires
 * BEFORE the response is sent (so `res.on('finish')` would miss it).
 *
 * IMPORTANT: NEVER pass passwords, tokens, or request bodies to this function.
 * Only include identifiers like userId, email, ip, userAgent.
 */
export function logAuthEvent(
  event: 'login_success' | 'login_failed' | 'logout' | 'login_locked',
  details: {
    userId?: string;
    email?: string;
    ip?: string;
    userAgent?: string;
  }
): void {
  const ip = details.ip || 'unknown';
  const userAgent = details.userAgent || 'unknown';

  const entry: AuditEntry = {
    id: randomUUID(),
    timestamp: new Date().toISOString(),
    event,
    ip,
    method: 'POST',
    path: event === 'logout' ? '/api/auth/logout' : '/api/auth/login',
    userAgent,
    userId: details.userId,
    details: details.email ? { email: details.email } : undefined,
  };

  appendToLog(entry);
}

export default auditMiddleware;
