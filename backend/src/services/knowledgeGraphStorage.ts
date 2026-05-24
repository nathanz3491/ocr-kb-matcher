/**
 * Knowledge Graph Storage Service - JSON-based Implementation
 * 
 * Persistent storage service for the global knowledge graph.
 * Uses local JSON file for storage instead of Neo4j.
 * Supports per-user isolation via userId parameter.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { GraphData, GraphNode, GraphEdge, NodeType } from '../../../shared/types';
import { userProgressService } from './userProgressService';

// Data directory - use process.cwd() which points to backend folder in dev
const DATA_DIR = path.join(process.cwd(), 'data');

/**
 * Get the graph file path for a given userId
 * Returns knowledge-graph-{userId}.json for defined userId, or knowledge-graph.json for undefined (backward compat)
 */
function getGraphFile(userId?: string): string {
  if (userId) {
    return path.join(DATA_DIR, `knowledge-graph-${userId}.json`);
  }
  return path.join(DATA_DIR, 'knowledge-graph.json');
}

/**
 * Internal representation of a knowledge graph node
 * This has the flat structure with name, domain, prerequisites directly on the node
 */
export interface InternalGraphNode {
  id: string;
  name: string;
  domain: string;
  description?: string;  // Detailed description for AI matching, quiz generation, etc.
  prerequisites: string[];
  nextSteps: string[];
  x?: number;
  y?: number;
  sources?: string[];
}

/**
 * Internal representation of a knowledge graph edge
 */
export interface InternalGraphEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  sources?: string[];
}

/**
 * Stored knowledge graph structure with metadata and source tracking
 */
export interface StoredKnowledgeGraph {
  version: number;
  lastUpdated: string;
  nodes: Record<string, InternalGraphNode>;
  edges: Record<string, InternalGraphEdge>;
  jobContributions: Record<string, string[]>;
  statistics: {
    totalJobs: number;
    totalNodes: number;
    totalEdges: number;
    nodeTypeDistribution: Record<NodeType, number>;
  };
}

/**
 * KnowledgeGraphNode type for internal use
 * Exported for compatibility with code that expects this type name
 */
export interface KnowledgeGraphNode {
  id: string;
  name: string;
  domain: string;
  prerequisites: string[];
  nextSteps: string[];
  x?: number;
  y?: number;
}

/**
 * Result of merging a job graph into the global knowledge graph
 */
export interface MergeResult {
  nodesAdded: number;
  nodesMerged: number;
  edgesAdded: number;
  edgesMerged: number;
  newNodeIds: string[];
}

/**
 * Convert internal node to GraphNode for visualization
 */
function toGraphNode(internal: InternalGraphNode): GraphNode {
  return {
    id: internal.id,
    type: 'concept',
    position: { x: internal.x || 0, y: internal.y || 0 },
    data: {
      label: internal.name,
      category: internal.domain,
      description: internal.description,
      sources: internal.sources,
    },
  };
}

/**
 * Convert internal edge to GraphEdge for visualization
 */
function toGraphEdge(internal: InternalGraphEdge): GraphEdge {
  return {
    id: internal.id,
    source: internal.source,
    target: internal.target,
    data: { relationship: internal.label },
  };
}

/**
 * Storage service for persistent knowledge graph
 * Supports per-user isolation via userId constructor parameter
 */
export class KnowledgeGraphStorage {
  private initialized = false;
  private userId?: string;

  constructor(userId?: string) {
    this.userId = userId;
  }

  /**
   * Initialize the storage - loads or creates default graph
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    try {
      // Create data directory if it doesn't exist
      await fs.mkdir(DATA_DIR, { recursive: true });
      
      // Try to load existing graph
      await this.loadGraph();
      this.initialized = true;
      console.log(`[KnowledgeGraphStorage] Initialized successfully for userId: ${this.userId || 'global'}`);
    } catch (error) {
      console.error('[KnowledgeGraphStorage] Failed to initialize:', error);
      throw error;
    }
  }

  /**
   * Loads the knowledge graph from disk with caching
   */
  async loadGraph(): Promise<StoredKnowledgeGraph> {
    const graphFile = getGraphFile(this.userId);
    try {
      await fs.access(graphFile);
      const data = await fs.readFile(graphFile, 'utf-8');
      const graph: StoredKnowledgeGraph = JSON.parse(data);
      
      // Validate graph structure
      if (!this.isValidGraph(graph)) {
        console.warn('[KnowledgeGraphStorage] Invalid graph structure, creating new graph');
        return this.createDefaultGraph();
      }
      
      return graph;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        console.log(`[KnowledgeGraphStorage] No existing graph found for userId: ${this.userId || 'global'}, creating default graph`);
      } else {
        console.warn('[KnowledgeGraphStorage] Error loading graph:', error);
      }
      const defaultGraph = this.createDefaultGraph();
      await this.saveGraph(defaultGraph);
      return defaultGraph;
    }
  }

  /**
   * Saves the knowledge graph to disk atomically
   */
  async saveGraph(graph: StoredKnowledgeGraph): Promise<void> {
    const graphFile = getGraphFile(this.userId);
    try {
      // Update metadata
      graph.lastUpdated = new Date().toISOString();
      
      // Create backup of existing file if it exists
      const backupPath = `${graphFile}.backup`;
      try {
        await fs.access(graphFile);
        await fs.copyFile(graphFile, backupPath);
      } catch {
        // No existing file to backup
      }
      
      // Write to temporary file first (atomic write)
      const tempPath = `${graphFile}.tmp`;
      await fs.writeFile(tempPath, JSON.stringify(graph, null, 2), 'utf-8');
      
      // Rename temp file to actual file (atomic operation)
      await fs.rename(tempPath, graphFile);
      
      // Remove backup after successful write
      try {
        await fs.unlink(backupPath);
      } catch {
        // Backup might not exist
      }
    } catch (error) {
      console.error('[KnowledgeGraphStorage] Failed to save graph:', error);
      
      // Try to restore from backup
      const backupPath = `${graphFile}.backup`;
      try {
        await fs.access(backupPath);
        await fs.copyFile(backupPath, graphFile);
        console.log('[KnowledgeGraphStorage] Restored from backup');
      } catch {
        // No backup available
      }
      
      throw error;
    }
  }

  /**
   * Merges a job graph into the global knowledge graph
   */
  async mergeJobGraph(jobId: string, jobGraph: GraphData): Promise<MergeResult> {
    const graph = await this.loadGraph();
    const result: MergeResult = {
      nodesAdded: 0,
      nodesMerged: 0,
      edgesAdded: 0,
      edgesMerged: 0,
      newNodeIds: []
    };
    
    const contributedNodeIds: string[] = [];
    
    const existingNodes = Object.values(graph.nodes);
    let maxX = -Infinity, maxY = -Infinity;
    for (const n of existingNodes) {
      if (n.x !== undefined && n.x > maxX) maxX = n.x;
      if (n.y !== undefined && n.y > maxY) maxY = n.y;
    }
    const nextRowY = (isFinite(maxY) ? maxY : 0) + 300;
    
    const COLS = 4;
    const SPACING_X = 280;
    const SPACING_Y = 180;
    
    let autoLayoutIdx = 0;
    
    for (const node of jobGraph.nodes) {
      let x = node.position.x;
      let y = node.position.y;
      if (x === 0 && y === 0) {
        x = 80 + (autoLayoutIdx % COLS) * SPACING_X;
        y = nextRowY + Math.floor(autoLayoutIdx / COLS) * SPACING_Y;
        autoLayoutIdx++;
      }

      const existingNodeId = this.findDuplicateNode(graph, node);
      
      if (existingNodeId) {
        const existingNode = graph.nodes[existingNodeId];
        if (existingNode.sources && !existingNode.sources.includes(jobId)) {
          existingNode.sources.push(jobId);
        } else if (!existingNode.sources) {
          existingNode.sources = [jobId];
        }
        result.nodesMerged++;
        contributedNodeIds.push(existingNodeId);
      } else {
        const newNode: InternalGraphNode = {
          id: node.id,
          name: node.data.label,
          domain: node.data.category || 'General',
          prerequisites: [],
          nextSteps: [],
          x,
          y,
          sources: [jobId],
        };
        graph.nodes[node.id] = newNode;
        result.nodesAdded++;
        result.newNodeIds.push(node.id);
        contributedNodeIds.push(node.id);
      }
    }
    
    if (autoLayoutIdx > 0) {
      console.log(`[KnowledgeGraphStorage] Auto-layout applied to ${autoLayoutIdx} nodes (placed below existing graph)`);
    }
    
    for (const edge of jobGraph.edges) {
      const existingEdgeId = this.findDuplicateEdge(graph, edge);
      
      if (existingEdgeId) {
        // Edge already exists, merge sources
        const existingEdge = graph.edges[existingEdgeId];
        if (existingEdge.sources && !existingEdge.sources.includes(jobId)) {
          existingEdge.sources.push(jobId);
        } else if (!existingEdge.sources) {
          existingEdge.sources = [jobId];
        }
        result.edgesMerged++;
      } else {
        // New edge, add to graph
        const newEdge: InternalGraphEdge = {
          id: edge.id,
          source: edge.source,
          target: edge.target,
          label: edge.label,
          sources: [jobId],
        };
        graph.edges[edge.id] = newEdge;
        result.edgesAdded++;
      }
    }
    
    // Update job contributions
    graph.jobContributions[jobId] = contributedNodeIds;
    
    // Update statistics
    this.updateStatistics(graph);
    
    // Save updated graph
    await this.saveGraph(graph);
    
    console.log(
      `[KnowledgeGraphStorage] Merged job ${jobId} for userId ${this.userId || 'global'}: +${result.nodesAdded} nodes, +${result.edgesAdded} edges`
    );
    
    return result;
  }

  /**
   * Gets the global knowledge graph as GraphData (for visualization)
   */
  async getGlobalGraph(): Promise<GraphData> {
    const graph = await this.loadGraph();
    
    return {
      nodes: Object.values(graph.nodes).map(toGraphNode),
      edges: Object.values(graph.edges).map(toGraphEdge)
    };
  }

  /**
   * Gets the global knowledge graph with internal node structure
   * (for backward compatibility with code expecting name, domain, prerequisites directly)
   */
  async getGlobalGraphInternal(): Promise<StoredKnowledgeGraph> {
    return this.loadGraph();
  }

  /**
   * Gets the nodes and edges contributed by a specific job
   */
  async getJobContribution(jobId: string): Promise<GraphData | null> {
    const graph = await this.loadGraph();
    
    const nodeIds = graph.jobContributions[jobId];
    if (!nodeIds || nodeIds.length === 0) {
      return null;
    }
    
    // Get nodes contributed by this job
    const nodes: GraphNode[] = [];
    for (const nodeId of nodeIds) {
      const node = graph.nodes[nodeId];
      if (node) {
        nodes.push(toGraphNode(node));
      }
    }
    
    // Get edges where both source and target nodes are in the contribution
    const nodeIdSet = new Set(nodeIds);
    const edges: GraphEdge[] = [];
    for (const edge of Object.values(graph.edges)) {
      if (nodeIdSet.has(edge.source) && nodeIdSet.has(edge.target)) {
        edges.push(toGraphEdge(edge));
      }
    }
    
    return { nodes, edges };
  }

  /**
   * Gets current statistics of the knowledge graph
   */
  async getStatistics(): Promise<StoredKnowledgeGraph['statistics']> {
    const graph = await this.loadGraph();
    return { ...graph.statistics };
  }

  /**
   * Removes all contributions from a specific job
   */
  async removeJobContribution(jobId: string): Promise<void> {
    const graph = await this.loadGraph();
    
    const nodeIds = graph.jobContributions[jobId];
    if (!nodeIds || nodeIds.length === 0) {
      console.log(`[KnowledgeGraphStorage] No contributions found for job ${jobId}`);
      return;
    }
    
    // Remove nodes that were contributed only by this job
    for (const nodeId of nodeIds) {
      const node = graph.nodes[nodeId];
      if (node && node.sources) {
        // Remove this job from sources
        node.sources = node.sources.filter(id => id !== jobId);
        
        // If no other sources, remove the node entirely
        if (node.sources.length === 0) {
          delete graph.nodes[nodeId];
        }
      }
    }
    
    // Remove edges that were contributed only by this job
    for (const edgeId of Object.keys(graph.edges)) {
      const edge = graph.edges[edgeId];
      if (edge.sources && edge.sources.includes(jobId)) {
        // Remove this job from sources
        edge.sources = edge.sources.filter(id => id !== jobId);
        
        // If no other sources, remove the edge entirely
        if (edge.sources.length === 0) {
          delete graph.edges[edgeId];
        }
      }
    }
    
    // Remove job contribution record
    delete graph.jobContributions[jobId];
    
    // Update statistics
    this.updateStatistics(graph);
    
    // Save updated graph
    await this.saveGraph(graph);
    
    console.log(`[KnowledgeGraphStorage] Removed contributions from job ${jobId} for userId ${this.userId || 'global'}`);
  }

  /**
   * Creates an empty knowledge graph structure
   */
  private createEmptyGraph(): StoredKnowledgeGraph {
    return {
      version: 1,
      lastUpdated: new Date().toISOString(),
      nodes: {},
      edges: {},
      jobContributions: {},
      statistics: {
        totalJobs: 0,
        totalNodes: 0,
        totalEdges: 0,
        nodeTypeDistribution: {
          concept: 0,
          entity: 0,
          process: 0
        }
      }
    };
  }

  /**
   * Creates empty knowledge graph
   * Data is loaded from JSON file on disk
   */
  private createDefaultGraph(): StoredKnowledgeGraph {
    return {
      version: 1,
      lastUpdated: new Date().toISOString(),
      nodes: {},
      edges: {},
      jobContributions: {},
      statistics: {
        totalJobs: 0,
        totalNodes: 0,
        totalEdges: 0,
        nodeTypeDistribution: {
          concept: 0,
          entity: 0,
          process: 0
        }
      }
    };
  }

  /**
   * Validates the structure of a stored graph
   */
  private isValidGraph(graph: unknown): graph is StoredKnowledgeGraph {
    if (!graph || typeof graph !== 'object') return false;
    
    const g = graph as Partial<StoredKnowledgeGraph>;
    return (
      typeof g.version === 'number' &&
      typeof g.lastUpdated === 'string' &&
      typeof g.nodes === 'object' &&
      typeof g.edges === 'object' &&
      typeof g.jobContributions === 'object' &&
      typeof g.statistics === 'object'
    );
  }

  /**
   * Finds a duplicate node by label and type
   */
  private findDuplicateNode(
    graph: StoredKnowledgeGraph,
    node: GraphNode
  ): string | null {
    for (const [id, existingNode] of Object.entries(graph.nodes)) {
      if (
        existingNode.name === node.data.label &&
        existingNode.domain === (node.data.category || 'General')
      ) {
        return id;
      }
    }
    return null;
  }

  /**
   * Finds a duplicate edge by source, target, and label
   */
  private findDuplicateEdge(
    graph: StoredKnowledgeGraph,
    edge: GraphEdge
  ): string | null {
    for (const [id, existingEdge] of Object.entries(graph.edges)) {
      if (
        existingEdge.source === edge.source &&
        existingEdge.target === edge.target &&
        existingEdge.label === edge.label
      ) {
        return id;
      }
    }
    return null;
  }

  /**
   * Updates statistics based on current graph state
   */
  private updateStatistics(graph: StoredKnowledgeGraph): void {
    const nodeDomains = Object.values(graph.nodes).map(n => n.domain);
    const distribution: Record<string, number> = {};
    
    for (const domain of nodeDomains) {
      distribution[domain] = (distribution[domain] || 0) + 1;
    }
    
    graph.statistics = {
      totalJobs: Object.keys(graph.jobContributions).length,
      totalNodes: Object.keys(graph.nodes).length,
      totalEdges: Object.keys(graph.edges).length,
      nodeTypeDistribution: {
        concept: Object.keys(graph.nodes).length,
        entity: 0,
        process: 0
      }
    };
  }
}

// Cache of KnowledgeGraphStorage instances per userId
const storageCache: Map<string, KnowledgeGraphStorage> = new Map();

/**
 * Gets or creates a KnowledgeGraphStorage instance for the given userId
 * Uses a cache to avoid creating multiple instances for the same userId
 */
export function getKnowledgeGraphStorage(userId?: string): KnowledgeGraphStorage {
  const cacheKey = userId || '__global__';
  if (!storageCache.has(cacheKey)) {
    storageCache.set(cacheKey, new KnowledgeGraphStorage(userId));
  }
  return storageCache.get(cacheKey)!;
}

/**
 * Get the global knowledge graph
 * Returns internal node structure for backward compatibility
 * Note: The returned nodes have name, domain, prerequisites directly (not nested in data)
 */
export async function getKnowledgeGraph(userId?: string): Promise<{ 
  nodes: InternalGraphNode[]; 
  edges: InternalGraphEdge[];
}> {
  const storage = getKnowledgeGraphStorage(userId);
  await storage.initialize();
  const graph = await storage.getGlobalGraphInternal();
  
  const rawNodes = Object.values(graph.nodes);
  const rawEdges = Object.values(graph.edges);

  const hasRealPositions = rawNodes.some(n => n.x !== undefined && n.y !== undefined && !(n.x === 0 && n.y === 0));
  if (!hasRealPositions) {
    const nodeCount = rawNodes.length;
    const cols = Math.ceil(Math.sqrt(nodeCount * 1.5));
    const nodesWithLayout = rawNodes.map((n, i) => ({
      ...n,
      x: 80 + (i % cols) * 280,
      y: 80 + Math.floor(i / cols) * 160,
    }));
    const nodeIdSet = new Set(nodesWithLayout.map(n => n.id));
    const validEdges = rawEdges.filter(e => nodeIdSet.has(e.source) && nodeIdSet.has(e.target));
    return {
      nodes: nodesWithLayout,
      edges: validEdges,
    };
  }
  
  const nodeIdSet = new Set(rawNodes.map(n => n.id));
  const validEdges = rawEdges.filter(e => nodeIdSet.has(e.source) && nodeIdSet.has(e.target));
  return {
    nodes: rawNodes,
    edges: validEdges,
  };
}

export interface ViewportBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Get nodes and edges within a viewport bounds
 * Used for culling - only returns visible elements
 */
export async function getKnowledgeGraphByViewport(bounds: ViewportBounds, userId?: string): Promise<{
  nodes: InternalGraphNode[];
  edges: InternalGraphEdge[];
  totalNodes: number;
  totalEdges: number;
}> {
  const storage = getKnowledgeGraphStorage(userId);
  await storage.initialize();
  const graph = await storage.getGlobalGraphInternal();
  
  const allNodes = Object.values(graph.nodes);
  const allEdges = Object.values(graph.edges);
  
  const x1 = bounds.x;
  const y1 = bounds.y;
  const x2 = bounds.x + bounds.width;
  const y2 = bounds.y + bounds.height;
  
  const visibleNodes = allNodes.filter(node => {
    const nx = node.x ?? 0;
    const ny = node.y ?? 0;
    return nx >= x1 && nx <= x2 && ny >= y1 && ny <= y2;
  });
  
  const visibleNodeIds = new Set(visibleNodes.map(n => n.id));
  
  const visibleEdges = allEdges.filter(edge => 
    visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target)
  );
  
  return {
    nodes: visibleNodes,
    edges: visibleEdges,
    totalNodes: allNodes.length,
    totalEdges: allEdges.length
  };
}

/**
 * Resets all storage instances (useful for testing)
 */
export function resetStorageInstance(): void {
  storageCache.clear();
}

// ============================================================
// STANDALONE JOB GRAPHS
// Job graphs are stored separately from the main knowledge graph.
// They do NOT appear in the main graph — only retrievable by jobId.
// ============================================================

const JOB_GRAPHS_DIR = path.join(DATA_DIR, 'job-graphs');

/**
 * Get the file path for a job's standalone graph
 */
function getJobGraphFile(jobId: string): string {
  return path.join(JOB_GRAPHS_DIR, `${jobId}.json`);
}

/**
 * Save a job's graph as a standalone file (does NOT merge into main graph).
 * This ensures job-generated nodes/edges only appear in the job's own view,
 * not in the user's main knowledge graph.
 */
export async function saveStandaloneJobGraph(jobId: string, jobGraph: GraphData): Promise<void> {
  await fs.mkdir(JOB_GRAPHS_DIR, { recursive: true });
  const filePath = getJobGraphFile(jobId);
  const data = {
    jobId,
    savedAt: new Date().toISOString(),
    nodes: jobGraph.nodes,
    edges: jobGraph.edges,
  };
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`[KnowledgeGraphStorage] Saved standalone job graph for job ${jobId}: ${jobGraph.nodes.length} nodes, ${jobGraph.edges.length} edges`);
}

/**
 * Load a standalone job graph by jobId.
 * Returns null if the job graph doesn't exist.
 */
export async function getStandaloneJobGraph(jobId: string): Promise<GraphData | null> {
  const filePath = getJobGraphFile(jobId);
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    const parsed = JSON.parse(data) as { nodes: GraphNode[]; edges: GraphEdge[] };
    return { nodes: parsed.nodes, edges: parsed.edges };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

/**
 * Delete a standalone job graph.
 */
export async function deleteStandaloneJobGraph(jobId: string): Promise<void> {
  const filePath = getJobGraphFile(jobId);
  try {
    await fs.unlink(filePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }
}

/**
 * Copies the default knowledge graph to a new user's personal graph file.
 * Reads knowledge-graph-default.json, deep-copies nodes/edges/statistics (stripping jobContributions),
 * resets totalJobs to 0, and saves to knowledge-graph-{userId}.json atomically.
 */
export async function copyDefaultGraphToUser(userId: string): Promise<void> {
  const defaultFile = path.join(DATA_DIR, 'knowledge-graph-default.json');
  const userGraphFile = path.join(DATA_DIR, `knowledge-graph-${userId}.json`);

  const data = await fs.readFile(defaultFile, 'utf-8');
  const graph: StoredKnowledgeGraph = JSON.parse(data);

  const userGraph: StoredKnowledgeGraph = {
    ...graph,
    nodes: { ...graph.nodes },
    edges: { ...graph.edges },
    jobContributions: {},
    statistics: {
      ...graph.statistics,
      totalJobs: 0,
    },
  };

  const tempPath = `${userGraphFile}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(userGraph, null, 2), 'utf-8');
  await fs.rename(tempPath, userGraphFile);

  console.log(`[KnowledgeGraphStorage] Copied default graph to user ${userId}`);
}
