/**
 * Analytics Service
 * Calculates dashboard statistics using local cached graph
 */

import { getKnowledgeGraph } from './knowledgeGraphStorage';
import { userProgressService } from './userProgressService';
import { getAllJobs } from './jobService';
import { ProcessingStatus } from '../../../shared/types';

/**
 * Dashboard statistics interface
 */
export interface DashboardStats {
  totalNodes: number;
  learnedNodes: number;
  progressPercentage: number;
  streakDays: number;
  totalUploads: number;
}

/**
 * Get total count of KnowledgePoint nodes from local cache
 */
async function getTotalKnowledgeNodes(): Promise<number> {
  try {
    const graph = await getKnowledgeGraph();
    return graph.nodes.length;
  } catch (error) {
    console.warn('[Analytics] Failed to get total nodes from cache:', error);
    return 14; // Default node count
  }
}

/**
 * Calculate learning streak from learnedAt timestamps
 * A streak is consecutive days with new learned nodes
 */
function calculateStreak(learnedAt: Record<string, string>): number {
  if (!learnedAt || Object.keys(learnedAt).length === 0) {
    return 0;
  }

  // Extract unique dates from timestamps
  const dates = Object.values(learnedAt)
    .map(timestamp => new Date(timestamp).toDateString())
    .filter((date, index, self) => self.indexOf(date) === index) // unique dates
    .map(dateStr => new Date(dateStr))
    .sort((a, b) => b.getTime() - a.getTime()); // descending order

  if (dates.length === 0) {
    return 0;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  let streak = 0;
  let currentDate = today;

  // Check if there's activity today or yesterday to start the streak
  const mostRecentDate = dates[0];
  mostRecentDate.setHours(0, 0, 0, 0);

  // If most recent activity is older than yesterday, no streak
  if (mostRecentDate < yesterday) {
    return 0;
  }

  // Count consecutive days
  for (const date of dates) {
    date.setHours(0, 0, 0, 0);

    if (date.getTime() === currentDate.getTime()) {
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    } else if (date < currentDate) {
      // Gap in the streak
      break;
    }
  }

  return streak;
}

/**
 * Get total count of completed uploads (jobs)
 */
async function getTotalUploads(): Promise<number> {
  const jobs = await getAllJobs();
  return jobs.filter(job => job.status === ProcessingStatus.COMPLETED).length;
}

/**
 * Get dashboard statistics
 * Calculates all stats needed for the statistics dashboard
 */
export async function getDashboardStats(userId?: string): Promise<DashboardStats> {
  // Get total nodes from Neo4j
  const totalNodes = await getTotalKnowledgeNodes();

  // Get learned nodes from user progress
  const progress = await userProgressService.loadProgress(userId ?? '');
  const learnedNodes = progress.knownNodes.length;

  // Calculate progress percentage
  const progressPercentage = totalNodes > 0
    ? Math.round((learnedNodes / totalNodes) * 100)
    : 0;

  // Calculate streak from learnedAt timestamps
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const learnedAt = (progress as any).learnedAt || {};
  const streakDays = calculateStreak(learnedAt);

  // Get total uploads (completed jobs)
  const totalUploads = await getTotalUploads();

  return {
    totalNodes,
    learnedNodes,
    progressPercentage,
    streakDays,
    totalUploads,
  };
}

/**
 * Get learning activity for the last N days
 * Returns an array of day-by-day learned node counts
 */
export async function getLearningActivity(days: number = 30, userId?: string): Promise<Array<{
  date: string;
  count: number;
}>> {
  const progress = await userProgressService.loadProgress(userId ?? '');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const learnedAt = (progress as any).learnedAt || {};

  const activity: Record<string, number> = {};

  // Initialize last N days with 0
  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    activity[dateStr] = 0;
  }

  // Count learned nodes per day
  for (const [nodeId, timestamp] of Object.entries(learnedAt)) {
    const dateStr = new Date(timestamp as string).toISOString().split('T')[0];
    if (activity[dateStr] !== undefined) {
      activity[dateStr]++;
    }
  }

  // Convert to array and sort by date
  return Object.entries(activity)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Get domain-wise progress breakdown
 */
export async function getDomainProgress(userId?: string): Promise<Array<{
  domain: string;
  total: number;
  learned: number;
  percentage: number;
}>> {
  // Use local cached graph instead of Neo4j
  const graph = await getKnowledgeGraph();
  const nodes = graph.nodes;
  
  // Get learned nodes
  const progress = await userProgressService.loadProgress(userId ?? '');
  const learnedSet = new Set(progress.knownNodes);

  // Group by domain
  const domainStats: Record<string, { total: number; learned: number }> = {};

  for (const node of nodes) {
    if (!domainStats[node.domain]) {
      domainStats[node.domain] = { total: 0, learned: 0 };
    }
    domainStats[node.domain].total++;
    if (learnedSet.has(node.id)) {
      domainStats[node.domain].learned++;
    }
  }

  // Convert to array with percentages
  return Object.entries(domainStats).map(([domain, stats]) => ({
    domain,
    total: stats.total,
    learned: stats.learned,
    percentage: stats.total > 0 ? Math.round((stats.learned / stats.total) * 100) : 0,
  })).sort((a, b) => b.percentage - a.percentage);
}
