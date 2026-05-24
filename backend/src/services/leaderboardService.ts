import type { PlayerScore } from '../types/gameRoom';

/**
 * Kahoot-style score calculation.
 *
 * Formula: correct ? Math.floor((1 - responseTimeMs / timeLimitMs / 2) * 1000) : 0
 *
 * A correct answer with instant response (0ms) earns 1000 points.
 * A correct answer at the halfway mark earns 750 points.
 * A correct answer right at the deadline earns 500 points.
 * An incorrect answer always earns 0 points.
 */
export function calculateScore(
  responseTimeMs: number,
  timeLimitMs: number,
  correct: boolean
): number {
  if (!correct) return 0;

  const raw = (1 - responseTimeMs / timeLimitMs / 2) * 1000;
  const clamped = Math.max(0, Math.min(1000, raw));
  return Math.floor(clamped);
}

/**
 * Determine a player's rank (1-based, ties share the same rank) within a sorted leaderboard.
 * The leaderboard is expected to be sorted by score descending.
 */
export function getRank(
  playerId: string,
  leaderboard: PlayerScore[]
): number {
  const idx = leaderboard.findIndex(p => p.playerId === playerId);
  if (idx === -1) return leaderboard.length + 1;
  return idx + 1;
}

/**
 * Build a sorted leaderboard from player scores.
 * Assigns a rank to each entry (ties share rank).
 */
export function buildLeaderboard(
  entries: { playerId: string; playerName: string; score: number }[]
): PlayerScore[] {
  const sorted = [...entries].sort((a, b) => b.score - a.score);

  const result: PlayerScore[] = [];
  let currentRank = 1;

  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i].score < sorted[i - 1].score) {
      currentRank = i + 1;
    }
    result.push({
      playerId: sorted[i].playerId,
      playerName: sorted[i].playerName,
      score: sorted[i].score,
      rank: currentRank,
    });
  }

  return result;
}
