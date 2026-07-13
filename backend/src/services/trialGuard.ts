/**
 * Trial abuse prevention — device fingerprint + email-based tracking.
 *
 * Prevents a user from starting multiple free trials by checking:
 * 1. Same email already has an active or recent (≤90 days) trial
 * 2. Same device fingerprint already has an active or recent (≤90 days) trial
 *
 * Device fingerprint is a SHA-256 hash of `userAgent + acceptLanguage`.
 * IP is stored for audit purposes only (not used for blocking).
 */

import crypto from 'crypto';
import { getDb } from '../db/sqlite';
import { logger } from '../lib/logger';

/** Trial tier constant used at registration. */
const TRIAL_TIER = 'free';

/** Number of days before a past trial no longer blocks a new one. */
const TRIAL_COOLDOWN_DAYS = 90;

/** Number of blocked attempts in 24h that triggers an abuse alert. */
const ABUSE_THRESHOLD = 3;

/**
 * Compute a device fingerprint from HTTP headers.
 * Uses SHA-256 of `userAgent + acceptLanguage` — no canvas, no external deps.
 */
export function computeFingerprint(userAgent: string | undefined, acceptLanguage: string | undefined): string {
  const raw = (userAgent ?? '') + (acceptLanguage ?? '');
  return crypto.createHash('sha256').update(raw).digest('hex');
}

/**
 * Check whether a new trial can be started for the given email/device.
 * Returns `false` (blocked) if:
 *   - A trial with the same email has `expires_at > now` (active trial)
 *   - A trial with the same email and `started_at` within the last 90 days
 *   - A trial with the same device fingerprint meets either condition above
 */
export function canStartTrial(email: string, fingerprint: string): boolean {
  const db = getDb();
  const now = new Date().toISOString();

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - TRIAL_COOLDOWN_DAYS);
  const cutoff = cutoffDate.toISOString();

  // Check active trial by email: expires_at > now
  const activeByEmail = db
    .prepare('SELECT 1 FROM trial_attempts WHERE email = ? AND expires_at > ? LIMIT 1')
    .get(email, now);
  if (activeByEmail) return false;

  // Check recent trial by email: started_at within cooldown period
  const recentByEmail = db
    .prepare('SELECT 1 FROM trial_attempts WHERE email = ? AND started_at > ? LIMIT 1')
    .get(email, cutoff);
  if (recentByEmail) return false;

  // Fingerprint here is only sha256(user-agent + accept-language) — far too
  // coarse to block on (all users of a common browser/locale share one).
  // Matches are logged as an abuse signal (see logAbuseAttempt) but must NOT
  // block registration until a real client-side device fingerprint exists.
  const recentByFingerprint = db
    .prepare('SELECT COUNT(*) AS cnt FROM trial_attempts WHERE device_fingerprint = ? AND started_at > ?')
    .get(fingerprint, cutoff) as { cnt: number } | undefined;
  if (recentByFingerprint && recentByFingerprint.cnt > 0) {
    logger.info(
      { email, fingerprint, matches: recentByFingerprint.cnt },
      '[Trial] Fingerprint seen before (signal only, not blocking)',
    );
  }

  return true;
}

/**
 * Record a newly started trial in the database.
 * Called AFTER the user is successfully created.
 */
export function recordTrialStart(
  email: string,
  fingerprint: string,
  ip: string | undefined,
  tier: string = TRIAL_TIER,
): void {
  const db = getDb();

  const id = crypto.randomUUID();
  const startedAt = new Date().toISOString();

  // Trial expires in 7 days
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  db.prepare(`
    INSERT INTO trial_attempts (id, email, device_fingerprint, ip, tier, started_at, expires_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, email, fingerprint, ip ?? null, tier, startedAt, expiresAt);

  logger.info({ trialId: id, email, tier }, 'Trial started');
}

/**
 * Log an abuse alert when the same email or fingerprint is blocked too many times in 24h.
 * Currently logs via pino; can be extended to send Sentry events.
 */
export function logAbuseAttempt(email: string, fingerprint: string, ip: string | undefined): void {
  const db = getDb();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  // Count blocked attempts in the last 24h for this email
  // A "blocked attempt" is inferred when canStartTrial returns false repeatedly.
  // We approximate by counting recent trial_attempts with matching email/fingerprint.
  const emailAttempts = db
    .prepare('SELECT COUNT(*) AS cnt FROM trial_attempts WHERE email = ? AND started_at > ?')
    .get(email, since) as { cnt: number } | undefined;

  const fingerprintAttempts = db
    .prepare('SELECT COUNT(*) AS cnt FROM trial_attempts WHERE device_fingerprint = ? AND started_at > ?')
    .get(fingerprint, since) as { cnt: number } | undefined;

  const emailCnt = emailAttempts?.cnt ?? 0;
  const fingerprintCnt = fingerprintAttempts?.cnt ?? 0;

  if (emailCnt >= ABUSE_THRESHOLD || fingerprintCnt >= ABUSE_THRESHOLD) {
    logger.warn(
      { email, fingerprint, ip, emailAttempts: emailCnt, fingerprintAttempts: fingerprintCnt },
      '[ABUSE] Multiple trial attempts detected — possible abuse',
    );
  } else {
    logger.info(
      { email, fingerprint, ip },
      'Trial attempt blocked',
    );
  }
}
