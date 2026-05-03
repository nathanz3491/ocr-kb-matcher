/**
 * Recommendation Service
 * Provides AI-powered recommendations for next topics to learn
 * Uses local cached graph to avoid Neo4j connection issues
 */

import { getKnowledgeGraph } from './knowledgeGraphStorage';
import { userProgressService } from './userProgressService';

export interface Recommendation {
  nodeId: string;
  name: string;
  domain: string;
  reason: string;
  prerequisites: string[];
}

/**
 * Get personalized recommendations for next topics to learn
 * Returns nodes where all prerequisites are met but not yet learned
 */
export async function getRecommendations(userId?: string): Promise<Recommendation[]> {
  try {
    // Use cached knowledge graph (falls back to local JSON if Neo4j unavailable)
    const allNodes = await getKnowledgeGraph(userId);
    
    // Get learned nodes
    const learnedNodeIds = await userProgressService.getKnownNodeIds(userId ?? '');
    const learnedSet = new Set(learnedNodeIds);
    
    // Find available nodes (not learned, prerequisites met)
    const availableNodes = allNodes.nodes.filter(node => {
      // Skip if already learned
      if (learnedSet.has(node.id)) return false;
      
      // Check if all prerequisites are met
      const prereqsMet = node.prerequisites.every(prereq => learnedSet.has(prereq));
      return prereqsMet;
    });
    
    // Sort by: fewer prerequisites first, then by domain
    availableNodes.sort((a, b) => {
      const prereqDiff = a.prerequisites.length - b.prerequisites.length;
      if (prereqDiff !== 0) return prereqDiff;
      return (a.domain || '').localeCompare(b.domain || '');
    });
    
    // Build recommendations with reasoning
    const recommendations: Recommendation[] = availableNodes.slice(0, 3).map(node => ({
      nodeId: node.id,
      name: node.name,
      domain: node.domain || 'General',
      prerequisites: node.prerequisites,
      reason: buildReason(node, learnedSet)
    }));
    
    return recommendations;
  } catch (error) {
    console.error('[Recommendation] Failed to get recommendations:', error);
    // Return fallback recommendations if graph unavailable
    return getFallbackRecommendations();
  }
}

/**
 * Fallback recommendations when graph is unavailable
 */
function getFallbackRecommendations(): Recommendation[] {
  return [
    {
      nodeId: 'A01',
      name: '实数与数轴 (Real Numbers & Number Line)',
      domain: 'Algebra',
      prerequisites: [],
      reason: 'This is a fundamental topic you can start learning right away.'
    },
    {
      nodeId: 'G01',
      name: '点、线、角基础 (Points, Lines, Angles)',
      domain: 'Geometry', 
      prerequisites: [],
      reason: 'This is a fundamental topic you can start learning right away.'
    },
    {
      nodeId: 'A03',
      name: '一元一次方程 (Linear Equations)',
      domain: 'Algebra',
      prerequisites: ['A02'],
      reason: 'Continue your algebra journey with linear equations.'
    }
  ];
}

/**
 * Build a human-readable reason for the recommendation
 */
function buildReason(node: { id: string; name: string; prerequisites: string[] }, learnedSet: Set<string>): string {
  if (node.prerequisites.length === 0) {
    return "This is a fundamental topic you can start learning right away.";
  }
  
  const learnedPrereqs = node.prerequisites.filter(p => learnedSet.has(p));
  if (learnedPrereqs.length === node.prerequisites.length) {
    if (node.prerequisites.length === 1) {
      return `You've mastered ${learnedPrereqs[0]}. This is the logical next step.`;
    } else {
      const prereqList = learnedPrereqs.slice(0, 2).join(" and ");
      return `You've mastered ${prereqList}. You're ready for this topic.`;
    }
  }
  
  return "You're making good progress. Keep going!";
}

/**
 * Get the single best recommendation
 */
export async function getBestRecommendation(): Promise<Recommendation | null> {
  const recommendations = await getRecommendations();
  return recommendations.length > 0 ? recommendations[0] : null;
}
