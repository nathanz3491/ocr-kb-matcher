import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { Request, Response } from 'express';

// ─── Shared helpers ──────────────────────────────────────────

const userOrIpKeyGenerator = (req: Request): string => {
  return req.user?.userId ?? ipKeyGenerator(req.ip ?? 'unknown', 56);
};

/**
 * Standard 429 handler — returns JSON matching the project's error shape.
 */
function rateLimitHandler(_req: Request, res: Response): void {
  res.status(429).json({
    success: false,
    error: 'Too many requests, please try again later.',
  });
}

// ─── Limiters ────────────────────────────────────────────────

/**
 * Auth limiter — per-IP rate limit for login, register, and refresh.
 *
 * 20 requests per 15-minute window per IP address.
 * The per-email account lockout (10 failed attempts → lock) triggers
 * before this per-IP limit, so legitimate users behind NAT are not
 * penalised for failed attempts from other users on the same IP.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: rateLimitHandler,
});

/**
 * Upload limiter — prevents file-upload flooding.
 *
 * 30 requests per 1-hour window, keyed by authenticated user (or IP).
 */
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: userOrIpKeyGenerator,
  handler: rateLimitHandler,
});

/**
 * AI limiter — protects expensive AI-generation endpoints from abuse.
 *
 * 60 requests per 1-hour window, keyed by authenticated user (or IP).
 */
export const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 60,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: userOrIpKeyGenerator,
  handler: rateLimitHandler,
});

/**
 * General limiter — broad protection for all other routes.
 *
 * 300 requests per 1-minute window per IP.
 * Skips the `/health` endpoint.
 */
export const generalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: rateLimitHandler,
  skip: (req: Request): boolean => req.path === '/health',
});
