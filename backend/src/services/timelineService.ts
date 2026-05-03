/**
 * Timeline Service
 * Generates timeline data showing learning activity over time
 */

import { userProgressService } from './userProgressService';

/**
 * Single day entry in the timeline
 */
export interface TimelineEntry {
  date: string; // YYYY-MM-DD
  nodesLearned: string[]; // Array of node IDs learned that day
  count: number;
}

/**
 * Complete timeline data with statistics
 */
export interface TimelineData {
  timeline: TimelineEntry[];
  totalLearned: number;
  dailyAverage: number;
  bestDay: { date: string; count: number } | null;
}

/**
 * Format date to YYYY-MM-DD string
 */
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Get timeline data for the last N days
 * Groups learned nodes by date and calculates statistics
 */
export async function getTimeline(days: number = 30, userId?: string): Promise<TimelineData> {
  // Get all learned nodes with timestamps
  const learnedNodes = await userProgressService.getLearnedNodesWithTimestamps(userId ?? '');

  // Calculate date range
  const endDate = new Date();
  endDate.setHours(0, 0, 0, 0);
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - days + 1);

  // Initialize timeline map with empty entries for all dates in range
  const timelineMap = new Map<string, TimelineEntry>();
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const dateStr = formatDate(date);
    timelineMap.set(dateStr, {
      date: dateStr,
      nodesLearned: [],
      count: 0,
    });
  }

  // Group nodes by date
  for (const { nodeId, learnedAt } of learnedNodes) {
    const learnedDate = new Date(learnedAt);
    const dateStr = formatDate(learnedDate);

    // Only include if within our date range
    if (timelineMap.has(dateStr)) {
      const entry = timelineMap.get(dateStr)!;
      entry.nodesLearned.push(nodeId);
      entry.count = entry.nodesLearned.length;
    }
  }

  // Convert to array and sort chronologically
  const timeline = Array.from(timelineMap.values()).sort(
    (a, b) => a.date.localeCompare(b.date)
  );

  // Calculate statistics
  const totalLearned = timeline.reduce((sum, entry) => sum + entry.count, 0);
  const dailyAverage = days > 0 ? totalLearned / days : 0;

  // Find best day
  let bestDay: { date: string; count: number } | null = null;
  for (const entry of timeline) {
    if (entry.count > 0) {
      if (!bestDay || entry.count > bestDay.count) {
        bestDay = { date: entry.date, count: entry.count };
      }
    }
  }

  return {
    timeline,
    totalLearned,
    dailyAverage,
    bestDay,
  };
}

/**
 * Get weekly aggregated data for charting
 * Returns an array of weekly summaries for the last N weeks
 */
export async function getWeeklyStats(
  weeks: number = 4,
  userId?: string
): Promise<Array<{ week: string; count: number }>> {
  // Get all learned nodes with timestamps
  const learnedNodes = await userProgressService.getLearnedNodesWithTimestamps(userId ?? '');

  // Calculate date range (weeks end on Sunday)
  const endDate = new Date();
  endDate.setHours(0, 0, 0, 0);

  // Adjust to end of current week (Sunday)
  const dayOfWeek = endDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
  endDate.setDate(endDate.getDate() + (7 - dayOfWeek) % 7);

  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - weeks * 7 + 1);

  // Initialize weekly buckets
  const weeklyMap = new Map<string, { weekLabel: string; count: number }>();
  for (let i = 0; i < weeks; i++) {
    const weekEnd = new Date(endDate);
    weekEnd.setDate(weekEnd.getDate() - i * 7);
    const weekStart = new Date(weekEnd);
    weekStart.setDate(weekStart.getDate() - 6);

    const weekLabel = `${formatDate(weekStart)} to ${formatDate(weekEnd)}`;
    const weekKey = formatDate(weekEnd); // Use week end date as key
    weeklyMap.set(weekKey, { weekLabel, count: 0 });
  }

  // Group nodes by week
  for (const { learnedAt } of learnedNodes) {
    const learnedDate = new Date(learnedAt);

    // Only include if within our date range
    if (learnedDate >= startDate && learnedDate <= endDate) {
      // Find which week this date belongs to
      const dayOfWeek = learnedDate.getDay();
      const weekEnd = new Date(learnedDate);
      weekEnd.setDate(learnedDate.getDate() + (7 - dayOfWeek) % 7);
      weekEnd.setHours(0, 0, 0, 0);

      const weekKey = formatDate(weekEnd);
      if (weeklyMap.has(weekKey)) {
        weeklyMap.get(weekKey)!.count++;
      }
    }
  }

  // Convert to array and sort chronologically
  return Array.from(weeklyMap.entries())
    .map(([_, data]) => ({
      week: data.weekLabel,
      count: data.count,
    }))
    .reverse(); // Most recent week last for charting
}
