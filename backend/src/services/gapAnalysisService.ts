/**
 * Gap Analysis Service
 * Analyzes skill gaps using local cached graph
 */

import { getKnowledgeGraph } from './knowledgeGraphStorage';
import { userProgressService } from './userProgressService';

export interface DomainMastery {
  domain: string;
  total: number;
  learned: number;
  percentage: number;
  status: 'strong' | 'moderate' | 'weak' | 'empty';
}

export interface GapAnalysis {
  domains: DomainMastery[];
  strongestDomain: DomainMastery | null;
  weakestDomain: DomainMastery | null;
  recommendations: string[];
}

/**
 * Analyze skill gaps across all domains
 */
export async function analyzeSkillGaps(userId?: string): Promise<GapAnalysis> {
  // Get all nodes from local cache and learned nodes from user progress
  const graph = await getKnowledgeGraph();
  const allNodes = graph.nodes;
  const learnedNodeIds = await userProgressService.getKnownNodeIds(userId ?? '');
  const learnedSet = new Set(learnedNodeIds);

  // Group by domain
  const domainStats: Record<string, { total: number; learned: number }> = {};
  
  allNodes.forEach(node => {
    const domain = node.domain || 'Uncategorized';
    if (!domainStats[domain]) {
      domainStats[domain] = { total: 0, learned: 0 };
    }
    domainStats[domain].total++;
    if (learnedSet.has(node.id)) {
      domainStats[domain].learned++;
    }
  });

  // Convert to DomainMastery array
  const domains: DomainMastery[] = Object.entries(domainStats).map(([domain, stats]) => {
    const percentage = stats.total > 0 ? Math.round((stats.learned / stats.total) * 100) : 0;
    let status: DomainMastery['status'];
    
    if (stats.total === 0) status = 'empty';
    else if (percentage >= 70) status = 'strong';
    else if (percentage >= 40) status = 'moderate';
    else status = 'weak';

    return {
      domain,
      total: stats.total,
      learned: stats.learned,
      percentage,
      status
    };
  }).sort((a, b) => b.percentage - a.percentage);

  // Find strongest and weakest
  const nonEmptyDomains = domains.filter(d => d.total > 0);
  const strongestDomain = nonEmptyDomains[0] || null;
  const weakestDomain = nonEmptyDomains[nonEmptyDomains.length - 1] || null;

  // Generate recommendations
  const recommendations: string[] = [];
  
  if (weakestDomain && weakestDomain.status === 'weak') {
    recommendations.push(
      `Focus on ${weakestDomain.domain} - you're at ${weakestDomain.percentage}% mastery. Review the fundamentals first.`
    );
  }
  
  if (strongestDomain && strongestDomain.status === 'strong') {
    recommendations.push(
      `Great progress in ${strongestDomain.domain}! Consider exploring advanced topics in this area.`
    );
  }

  const moderateDomains = domains.filter(d => d.status === 'moderate');
  if (moderateDomains.length > 0) {
    recommendations.push(
      `Keep practicing ${moderateDomains.map(d => d.domain).join(', ')} to improve your mastery.`
    );
  }

  return {
    domains,
    strongestDomain,
    weakestDomain,
    recommendations
  };
}

/**
 * Get a summary of learning progress
 */
export async function getProgressSummary(): Promise<{
  totalDomains: number;
  masteredDomains: number;
  averageMastery: number;
  overallGrade: string;
}> {
  const analysis = await analyzeSkillGaps();
  const nonEmptyDomains = analysis.domains.filter(d => d.total > 0);
  
  const totalDomains = nonEmptyDomains.length;
  const masteredDomains = nonEmptyDomains.filter(d => d.status === 'strong').length;
  const averageMastery = totalDomains > 0
    ? Math.round(nonEmptyDomains.reduce((sum, d) => sum + d.percentage, 0) / totalDomains)
    : 0;
  
  let overallGrade: string;
  if (averageMastery >= 90) overallGrade = 'A+';
  else if (averageMastery >= 80) overallGrade = 'A';
  else if (averageMastery >= 70) overallGrade = 'B';
  else if (averageMastery >= 60) overallGrade = 'C';
  else if (averageMastery >= 50) overallGrade = 'D';
  else overallGrade = 'F';

  return {
    totalDomains,
    masteredDomains,
    averageMastery,
    overallGrade
  };
}
