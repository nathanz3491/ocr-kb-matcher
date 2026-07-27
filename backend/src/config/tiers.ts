import { Tier } from '../../../shared/types';

/**
 * Tier limits configuration — single source of truth for feature quotas.
 * Each tier maps to usage caps: uploads, quiz generations, and chat messages
 * per billing period.
 */
export const TIER_LIMITS: Record<Tier, { uploads: number; quizGenerated: number; chatMessages: number; maxFileSizeMB: number }> = {
  free: {
    uploads: 2,
    quizGenerated: 3,
    chatMessages: 20,
    maxFileSizeMB: 20,
  },
  monthly: {
    uploads: 15,
    quizGenerated: 30,
    chatMessages: 100,
    maxFileSizeMB: 100,
  },
  yearly: {
    uploads: 15,
    quizGenerated: 30,
    chatMessages: 100,
    maxFileSizeMB: 100,
  },
};

/**
 * Returns the ISO date string for midnight UTC on the 1st of the current
 * UTC month. Used to reset free-tier usage periods.
 */
export function getCurrentMonthStart(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

/**
 * Determines whether a user's current usage period is still active.
 *
 * Period semantics by tier:
 * - free:    Period covers the current calendar month (resets on the 1st).
 * - monthly: Period runs for 31 days from periodStart.
 * - yearly:  Period runs for 1 year from periodStart.
 *
 * @returns true if now falls within [periodStart, periodStart + period).
 */
export function isCurrentPeriod(
  user: { tier: Tier; usage: { periodStart: string } },
  now: Date,
): boolean {
  const periodStart = new Date(user.usage.periodStart);
  const periodEnd = new Date(periodStart);

  if (user.tier === 'free' || user.tier === 'monthly') {
    periodEnd.setUTCMonth(periodEnd.getUTCMonth() + 1);
  } else {
    // yearly
    periodEnd.setUTCFullYear(periodEnd.getUTCFullYear() + 1);
  }

  return now >= periodStart && now < periodEnd;
}

/**
 * Returns the ISO date string for the start of the next billing/usage period
 * after the given date.
 *
 * For free users the next period always begins on the 1st of the next UTC month.
 * For monthly subscribers it steps forward one month at a time from the
 * original subscription start until the result exceeds `now`.
 * For yearly subscribers it steps forward one year at a time.
 */
export function nextAnniversaryDate(
  subscriptionStartedAt: string,
  tier: Tier,
  now: Date,
): string {
  if (tier === 'free') {
    const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
    return next.toISOString();
  }

  const result = new Date(subscriptionStartedAt);

  if (tier === 'monthly') {
    while (result <= now) {
      result.setUTCMonth(result.getUTCMonth() + 1);
    }
  } else {
    // yearly
    while (result <= now) {
      result.setUTCFullYear(result.getUTCFullYear() + 1);
    }
  }

  return result.toISOString();
}

/**
 * Returns the ISO date string for the START of the usage period that contains
 * `now`, given the user's tier and subscription anchor.
 *
 * - free:    1st of the current UTC month.
 * - monthly: the most recent subscription-anniversary day on/before `now`.
 * - yearly:  the most recent yearly anniversary on/before `now`.
 *
 * This is the single source of truth for period rollover; both the quota
 * enforcement middleware and the /api/user/quota endpoint must use it so the
 * displayed and enforced periods can never drift apart.
 */
export function currentPeriodStart(
  subscriptionStartedAt: string | null | undefined,
  tier: Tier,
  now: Date,
): string {
  if (tier === 'free' || !subscriptionStartedAt) {
    return getCurrentMonthStart();
  }

  const periodStart = new Date(subscriptionStartedAt);
  while (true) {
    const periodEnd = new Date(periodStart);
    if (tier === 'monthly') {
      periodEnd.setUTCMonth(periodEnd.getUTCMonth() + 1);
    } else {
      periodEnd.setUTCFullYear(periodEnd.getUTCFullYear() + 1);
    }
    if (now >= periodStart && now < periodEnd) break;
    if (tier === 'monthly') {
      periodStart.setUTCMonth(periodStart.getUTCMonth() + 1);
    } else {
      periodStart.setUTCFullYear(periodStart.getUTCFullYear() + 1);
    }
  }
  return periodStart.toISOString();
}
