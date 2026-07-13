import { Request, Response, NextFunction } from 'express';
import * as Sentry from '@sentry/node';
import { verifyAccessToken } from '../services/jwtService';
import { isAccessTokenRevoked } from '../services/tokenRevocation';
import { logger } from '../lib/logger';

export interface AuthenticatedUser {
  userId: string;
  email: string;
  accountType: 'student' | 'parent';
  tier?: string;
  role?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  // DEV FALLBACK: frontend AuthContext sets a client-only DEV_USER in dev mode
  // and never sends a real token. Without this fallback, every protected route
  // returns 401 and the dashboard appears empty. In production this never fires.
  // Note: req.user is left UNDEFINED (not synthetic) so downstream storage
  // routes through the global knowledge-graph.json instead of looking for a
  // non-existent per-user file like knowledge-graph-dev-user.json.
  if (process.env.NODE_ENV !== 'production' && !authHeader) {
    next();
    return;
  }

  if (!authHeader) {
    res.status(401).json({ success: false, error: 'No authorization header provided' });
    return;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    res.status(401).json({ success: false, error: 'Invalid authorization header format' });
    return;
  }

  const token = parts[1];

  try {
    const payload = verifyAccessToken(token);

    if (payload.jti && isAccessTokenRevoked(payload.jti)) {
      // Dev fallback: treat revoked tokens as guest so stale localStorage tokens
      // don't lock the developer out of their own app
      if (process.env.NODE_ENV !== 'production') {
        next();
        return;
      }
      res.status(401).json({ success: false, error: 'Token has been revoked' });
      return;
    }

    req.user = { userId: payload.userId, email: payload.email, accountType: payload.accountType || 'student', role: payload.role || 'user' };
    next();
  } catch (error) {
    // Dev fallback: treat invalid/expired tokens as guest
    if (process.env.NODE_ENV !== 'production') {
      next();
      return;
    }
    const message = error instanceof Error ? error.message : 'Invalid token';
    res.status(401).json({ success: false, error: message });
  }
}

export function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    next();
    return;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    next();
    return;
  }

  const token = parts[1];

  try {
    const payload = verifyAccessToken(token);

    if (payload.jti && isAccessTokenRevoked(payload.jti)) {
      next();
      return;
    }

    req.user = { userId: payload.userId, email: payload.email, accountType: payload.accountType || 'student', role: payload.role || 'user' };
  } catch {
    // Token invalid but optional - continue without user
  }

  next();
}

export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.user?.userId) {
    res.status(401).json({
      success: false,
      error: 'AUTH_REQUIRED',
      message: '请登录后使用此功能',
    });
    return;
  }
  next();
}

export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.user?.userId) {
    res.status(401).json({
      success: false,
      error: 'AUTH_REQUIRED',
      message: '请登录后使用此功能',
    });
    return;
  }

  if (req.user.role === 'admin') {
    next();
    return;
  }

  const adminEmails = process.env.ADMIN_EMAILS;
  if (adminEmails && req.user.email) {
    const adminList = adminEmails.split(',').map(e => e.trim().toLowerCase());
    if (adminList.includes(req.user.email.toLowerCase())) {
      next();
      return;
    }
  }

  res.status(403).json({
    success: false,
    error: 'FORBIDDEN',
  });
}

// ─── Brute-force protection (per-email tracking) ────────────

interface LoginAttemptEntry {
  count: number;
  lastAttempt: number;
  lockedUntil?: number;
}

/** In-memory store for failed login attempts. Redis in Wave 4. */
const loginAttempts = new Map<string, LoginAttemptEntry>();

const LOCK_DURATION_MS = 3600 * 1000; // 1 hour
const CLEANUP_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
let lastCleanup = Date.now();

function cleanupLoginAttempts(): void {
  const now = Date.now();
  for (const [key, entry] of loginAttempts.entries()) {
    // Remove expired locks or stale entries (no activity in 24h)
    if (
      (entry.lockedUntil !== undefined && now >= entry.lockedUntil) ||
      (entry.lockedUntil === undefined && now - entry.lastAttempt > 24 * 60 * 60 * 1000)
    ) {
      loginAttempts.delete(key);
    }
  }
}

/**
 * Pre-computed bcrypt hash for constant-time password comparison.
 * Used when the email doesn't exist, so that "no user" and
 * "wrong password" take indistinguishable time.
 */
export const DUMMY_PASSWORD_HASH = '$2a$12$LJ3m4ys3Lk0TSwHJqppmwO9kq4jGMmS3Yq3/TY1zY3Lm5nqz7q7uK';

/**
 * Check if the given email is currently locked out.
 * Returns `{ locked: true, retryAfter }` or `{ locked: false }`.
 */
export function checkLoginLock(email: string): { locked: boolean; retryAfter?: number } {
  const now = Date.now();

  // Periodic cleanup of stale entries
  if (now - lastCleanup > CLEANUP_INTERVAL_MS) {
    cleanupLoginAttempts();
    lastCleanup = now;
  }

  const normalizedEmail = email.toLowerCase().trim();
  const entry = loginAttempts.get(normalizedEmail);

  if (entry?.lockedUntil !== undefined && now < entry.lockedUntil) {
    const retryAfter = Math.ceil((entry.lockedUntil - now) / 1000);
    return { locked: true, retryAfter };
  }

  return { locked: false };
}

/**
 * Record a failed login attempt with progressive delay:
 *   - 3rd  attempt → 1 second delay
 *   - 5th  attempt → 5 second delay
 *   - 10th attempt → lock for 1 hour + Sentry warning
 *
 * The delay is applied BEFORE returning, so the caller
 * can immediately send the error response afterward.
 */
export async function recordFailedAttempt(email: string): Promise<void> {
  const now = Date.now();
  const normalizedEmail = email.toLowerCase().trim();

  let entry = loginAttempts.get(normalizedEmail);
  if (!entry) {
    entry = { count: 0, lastAttempt: now };
    loginAttempts.set(normalizedEmail, entry);
  }

  entry.count++;
  entry.lastAttempt = now;

  if (entry.count >= 10) {
    entry.lockedUntil = now + LOCK_DURATION_MS;
    logger.warn({ email, attemptCount: entry.count }, 'Account locked due to too many failed login attempts');
    Sentry.captureMessage(`Account locked: ${email} (${entry.count} failed attempts)`, 'warning');
  } else if (entry.count >= 5) {
    await new Promise((resolve) => setTimeout(resolve, 5000));
  } else if (entry.count >= 3) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

/**
 * Clear login attempt tracking on successful login.
 */
export function clearLoginAttempts(email: string): void {
  const normalizedEmail = email.toLowerCase().trim();
  loginAttempts.delete(normalizedEmail);
}

export const authMiddleware = {
  authenticate,
  optionalAuth,
  requireAuth,
  requireAdmin,
};

export default authMiddleware;
