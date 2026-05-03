/**
 * Knowledge Tree Service - JSON-based Implementation
 * 
 * Uses local JSON file via knowledgeGraphStorage instead of Neo4j.
 */

import { getKnowledgeGraph, InternalGraphNode, InternalGraphEdge } from './knowledgeGraphStorage';

export interface KnowledgePoint {
  id: string;
  name: string;
  domain: string;
  prerequisites: string[];
  nextSteps: string[];
}

/**
 * Export tree for LLM
 */
export async function exportTreeForLLM(userId?: string): Promise<string> {
  const graph = await getKnowledgeGraph(userId);
  
  const nodeMap = new Map<string, InternalGraphNode>();
  graph.nodes.forEach(node => nodeMap.set(node.id, node));
  
  let llmContext = "【Knowledge Graph - History Civilizations】\n";
  
  const sortedNodes = [...graph.nodes].sort((a, b) => a.id.localeCompare(b.id));
  
  for (const node of sortedNodes) {
    const prerequisites: string[] = [];
    const nextSteps: string[] = [];
    
    for (const edge of graph.edges) {
      if (edge.target === node.id && edge.label === 'requires') {
        const preNode = nodeMap.get(edge.source);
        if (preNode) {
          prerequisites.push(`${preNode.id} ${preNode.name}`);
        }
      }
      if (edge.source === node.id && edge.label === 'requires') {
        const postNode = nodeMap.get(edge.target);
        if (postNode) {
          nextSteps.push(`${postNode.id} ${postNode.name}`);
        }
      }
    }
    
    let nodeInfo = `- [${node.id}] ${node.name} (Domain: ${node.domain})\n`;
    
    if (prerequisites.length > 0) {
      nodeInfo += `  * Prerequisites: ${prerequisites.join(', ')}\n`;
    }
    if (nextSteps.length > 0) {
      nodeInfo += `  * Next Steps: ${nextSteps.join(', ')}\n`;
    }
    
    llmContext += nodeInfo;
  }
  
  return llmContext;
}

/**
 * Get full knowledge tree as structured data
 */
export async function getFullKnowledgeTree(userId?: string): Promise<KnowledgePoint[]> {
  const graph = await getKnowledgeGraph(userId);
  
  const prerequisitesMap = new Map<string, string[]>();
  const nextStepsMap = new Map<string, string[]>();
  
  for (const edge of graph.edges) {
    if (edge.label === 'requires') {
      if (!prerequisitesMap.has(edge.source)) {
        prerequisitesMap.set(edge.source, []);
      }
      prerequisitesMap.get(edge.source)!.push(edge.target);
      
      if (!nextStepsMap.has(edge.target)) {
        nextStepsMap.set(edge.target, []);
      }
      nextStepsMap.get(edge.target)!.push(edge.source);
    }
  }
  
  return graph.nodes.map(node => ({
    id: node.id,
    name: node.name,
    domain: node.domain,
    prerequisites: prerequisitesMap.get(node.id) || [],
    nextSteps: nextStepsMap.get(node.id) || []
  }));
}

/**
 * Diagnose weakness - get prerequisite chain
 */
export async function diagnoseWeakness(nodeId: string, userId?: string): Promise<KnowledgePoint[]> {
  const graph = await getKnowledgeGraph(userId);
  
  const nodeMap = new Map<string, InternalGraphNode>();
  graph.nodes.forEach(node => nodeMap.set(node.id, node));
  
  const dependsOn = new Map<string, string[]>();
  for (const edge of graph.edges) {
    if (edge.label === 'requires') {
      if (!dependsOn.has(edge.source)) {
        dependsOn.set(edge.source, []);
      }
      dependsOn.set(edge.source, [...dependsOn.get(edge.source)!, edge.target]);
    }
  }
  
  const visited = new Set<string>();
  const queue: string[] = [nodeId];
  const prerequisites: KnowledgePoint[] = [];
  
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);
    
    const deps = dependsOn.get(current) || [];
    for (const dep of deps) {
      const node = nodeMap.get(dep);
      if (node && !visited.has(dep)) {
        prerequisites.push({
          id: node.id,
          name: node.name,
          domain: node.domain,
          prerequisites: [],
          nextSteps: []
        });
        queue.push(dep);
      }
    }
  }
  
  return prerequisites.sort((a, b) => a.id.localeCompare(b.id));
}
