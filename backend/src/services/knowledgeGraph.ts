/**
 * Knowledge Graph Service - JSON-based Implementation
 * 
 * CRUD operations for knowledge nodes using local JSON file storage
 * instead of Neo4j database.
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Types (reusing from neo4j types for compatibility)
export interface KnowledgeNode {
  id: string;
  title: string;
  description: string;
  category: string;
  keywords: string[];
  metadata: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateKnowledgeNodeInput {
  title: string;
  description: string;
  category: string;
  keywords?: string[];
  metadata?: Record<string, unknown>;
}

export interface PaginatedNodesResult {
  nodes: KnowledgeNode[];
  total: number;
  limit: number;
  offset: number;
}

export interface SearchResult {
  nodes: KnowledgeNode[];
  total: number;
}

interface KnowledgeGraphData {
  nodes: Record<string, KnowledgeNode>;
  edges: Record<string, KnowledgeEdge>;
  lastUpdated: string;
}

interface KnowledgeEdge {
  source: string;
  target: string;
  label: string;
}

// Path to the knowledge graph JSON file
function getGraphFile(userId?: string): string {
  if (userId) {
    return path.join(__dirname, '..', '..', '..', 'data', `knowledge-graph-${userId}.json`);
  }
  return path.join(__dirname, '..', '..', '..', 'data', 'knowledge-graph.json');
}

/**
 * Load knowledge graph from JSON file
 */
async function loadGraph(userId?: string): Promise<KnowledgeGraphData> {
  const graphFile = getGraphFile(userId);
  try {
    const data = await fs.readFile(graphFile, 'utf-8');
    const graph = JSON.parse(data);
    
    // Handle both old format (array) and new format (object with nodes/edges)
    if (Array.isArray(graph.nodes)) {
      // Old format - convert to new format
      const nodes: Record<string, KnowledgeNode> = {};
      const edges: Record<string, KnowledgeEdge> = {};
      
      for (const node of graph.nodes) {
        nodes[node.id] = node;
      }
      
      if (Array.isArray(graph.edges)) {
        for (const edge of graph.edges) {
          edges[edge.id] = edge;
        }
      }
      
      return { nodes, edges, lastUpdated: graph.lastUpdated || new Date().toISOString() };
    }
    
    return graph;
  } catch {
    // Return empty graph if file doesn't exist
    return {
      nodes: {},
      edges: {},
      lastUpdated: new Date().toISOString()
    };
  }
}

/**
 * Save knowledge graph to JSON file
 */
async function saveGraph(graph: KnowledgeGraphData, userId?: string): Promise<void> {
  const graphFile = getGraphFile(userId);
  graph.lastUpdated = new Date().toISOString();
  await fs.mkdir(path.dirname(graphFile), { recursive: true });
  await fs.writeFile(graphFile, JSON.stringify(graph, null, 2));
}

/**
 * Create a new knowledge node
 */
export async function createKnowledgeNode(
  input: CreateKnowledgeNodeInput,
  userId?: string
): Promise<KnowledgeNode> {
  const graph = await loadGraph(userId);
  const now = new Date().toISOString();
  
  const node: KnowledgeNode = {
    id: uuidv4(),
    title: input.title,
    description: input.description,
    category: input.category,
    keywords: input.keywords || [],
    metadata: input.metadata || {},
    createdAt: now,
    updatedAt: now,
  };
  
  graph.nodes[node.id] = node;
  await saveGraph(graph, userId);
  
  return node;
}

/**
 * Get all knowledge nodes with pagination
 */
export async function getAllNodes(
  limit: number = 50,
  offset: number = 0,
  userId?: string
): Promise<PaginatedNodesResult> {
  const graph = await loadGraph(userId);
  const allNodes = Object.values(graph.nodes);
  
  // Sort by createdAt descending
  allNodes.sort((a, b) => {
    const aTime = a.createdAt || '';
    const bTime = b.createdAt || '';
    return bTime.localeCompare(aTime);
  });
  
  const total = allNodes.length;
  const nodes = allNodes.slice(offset, offset + limit);
  
  return {
    nodes,
    total,
    limit,
    offset,
  };
}

/**
 * Get a specific node by ID
 */
export async function getNodeById(id: string, userId?: string): Promise<KnowledgeNode | null> {
  const graph = await loadGraph(userId);
  return graph.nodes[id] || null;
}

/**
 * Search nodes by text in title or description
 * Uses case-insensitive partial matching
 */
export async function searchNodesByText(
  searchText: string,
  limit: number = 20,
  userId?: string
): Promise<KnowledgeNode[]> {
  const graph = await loadGraph(userId);
  const searchLower = searchText.toLowerCase();
  
  const results: KnowledgeNode[] = [];
  
  for (const node of Object.values(graph.nodes)) {
    const titleMatch = node.title.toLowerCase().includes(searchLower);
    const descMatch = node.description.toLowerCase().includes(searchLower);
    const keywordMatch = node.keywords.some(k => k.toLowerCase().includes(searchLower));
    
    if (titleMatch || descMatch || keywordMatch) {
      results.push(node);
    }
  }
  
  // Sort by relevance: title starts with search first, then title contains, then others
  results.sort((a, b) => {
    const aTitle = a.title.toLowerCase();
    const bTitle = b.title.toLowerCase();
    
    if (aTitle.startsWith(searchLower) && !bTitle.startsWith(searchLower)) return -1;
    if (!aTitle.startsWith(searchLower) && bTitle.startsWith(searchLower)) return 1;
    if (aTitle.includes(searchLower) && !bTitle.includes(searchLower)) return -1;
    if (!aTitle.includes(searchLower) && bTitle.includes(searchLower)) return 1;
    
    // Then by createdAt
    const aTime = a.createdAt || '';
    const bTime = b.createdAt || '';
    return bTime.localeCompare(aTime);
  });
  
  return results.slice(0, limit);
}

/**
 * Get nodes related to a specific node
 * Returns nodes connected by RELATED_TO or requires relationship
 */
export async function getRelatedNodes(
  nodeId: string,
  relationshipType?: string,
  userId?: string
): Promise<KnowledgeNode[]> {
  const graph = await loadGraph(userId);
  const relatedIds = new Set<string>();
  
  for (const edge of Object.values(graph.edges)) {
    if (relationshipType && edge.label !== relationshipType) continue;
    
    if (edge.source === nodeId) {
      relatedIds.add(edge.target);
    }
    if (edge.target === nodeId) {
      relatedIds.add(edge.source);
    }
  }
  
  return Array.from(relatedIds)
    .map(id => graph.nodes[id])
    .filter(Boolean);
}

/**
 * Create a relationship between two nodes
 */
export async function createRelationship(
  fromId: string,
  toId: string,
  relationshipType: string = 'RELATED_TO',
  properties?: Record<string, unknown>,
  userId?: string
): Promise<boolean> {
  const graph = await loadGraph(userId);
  
  // Verify both nodes exist
  if (!graph.nodes[fromId] || !graph.nodes[toId]) {
    return false;
  }
  
  const edgeId = `${fromId}-${toId}`;
  graph.edges[edgeId] = {
    source: fromId,
    target: toId,
    label: relationshipType,
  };
  
  await saveGraph(graph, userId);
  return true;
}

/**
 * Update a knowledge node
 */
export async function updateKnowledgeNode(
  id: string,
  updates: Partial<CreateKnowledgeNodeInput>,
  userId?: string
): Promise<KnowledgeNode | null> {
  const graph = await loadGraph(userId);
  const node = graph.nodes[id];
  
  if (!node) {
    return null;
  }
  
  const now = new Date().toISOString();
  
  if (updates.title !== undefined) node.title = updates.title;
  if (updates.description !== undefined) node.description = updates.description;
  if (updates.category !== undefined) node.category = updates.category;
  if (updates.keywords !== undefined) node.keywords = updates.keywords;
  if (updates.metadata !== undefined) node.metadata = updates.metadata;
  node.updatedAt = now;
  
  graph.nodes[id] = node;
  await saveGraph(graph, userId);
  
  return node;
}

/**
 * Delete a node and all its relationships
 */
export async function deleteNode(id: string, userId?: string): Promise<boolean> {
  const graph = await loadGraph(userId);
  
  if (!graph.nodes[id]) {
    return false;
  }
  
  // Delete the node
  delete graph.nodes[id];
  
  // Delete all edges connected to this node
  for (const edgeId of Object.keys(graph.edges)) {
    const edge = graph.edges[edgeId];
    if (edge.source === id || edge.target === id) {
      delete graph.edges[edgeId];
    }
  }
  
  await saveGraph(graph, userId);
  return true;
}

/**
 * Create constraints (no-op for JSON storage)
 * Kept for API compatibility
 */
export async function createConstraints(): Promise<void> {
  // No-op for JSON storage
  console.log('[KnowledgeGraph] Constraints check passed (JSON storage)');
}

/**
 * Get nodes by category
 */
export async function getNodesByCategory(
  category: string,
  limit: number = 50,
  userId?: string
): Promise<KnowledgeNode[]> {
  const graph = await loadGraph(userId);
  
  const results = Object.values(graph.nodes)
    .filter(node => node.category.toLowerCase() === category.toLowerCase())
    .sort((a, b) => {
      const aTime = a.createdAt || '';
      const bTime = b.createdAt || '';
      return bTime.localeCompare(aTime);
    });
  
  return results.slice(0, limit);
}

/**
 * Get all categories with counts
 */
export async function getCategories(userId?: string): Promise<{ category: string; count: number }[]> {
  const graph = await loadGraph(userId);
  const categoryCount: Record<string, number> = {};
  
  for (const node of Object.values(graph.nodes)) {
    const cat = node.category || 'Unknown';
    categoryCount[cat] = (categoryCount[cat] || 0) + 1;
  }
  
  return Object.entries(categoryCount)
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);
}
