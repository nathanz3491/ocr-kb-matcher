/**
 * Knowledge Graph Storage Service - SQLite-based Implementation
 *
 * Per-user isolation via userId column. Atomic writes via SQLite transactions.
 */

import path from 'path';
import fs from 'fs';
import { GraphData, GraphNode, GraphEdge, NodeType } from '../../../shared/types';
import { userProgressService } from './userProgressService';
import { getDb } from '../db/sqlite';

const DATA_DIR = path.join(process.cwd(), 'data');

export interface InternalGraphNode {
  id: string;
  name: string;
  domain: string;
  description?: string;
  prerequisites: string[];
  nextSteps: string[];
  x?: number;
  y?: number;
  sources?: string[];
  unit?: string;
  timePeriod?: string;
}

export interface InternalGraphEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  sources?: string[];
}

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

export interface KnowledgeGraphNode {
  id: string;
  name: string;
  domain: string;
  prerequisites: string[];
  nextSteps: string[];
  x?: number;
  y?: number;
}

export interface MergeResult {
  nodesAdded: number;
  nodesMerged: number;
  edgesAdded: number;
  edgesMerged: number;
  newNodeIds: string[];
}

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

function toGraphEdge(internal: InternalGraphEdge): GraphEdge {
  return {
    id: internal.id,
    source: internal.source,
    target: internal.target,
    data: { relationship: internal.label },
  };
}

function rowToNode(row: Record<string, unknown>): InternalGraphNode {
  return {
    id: row.id as string,
    name: row.name as string,
    domain: row.domain as string,
    description: row.description as string | undefined,
    prerequisites: typeof row.prerequisites === 'string' ? JSON.parse(row.prerequisites as string) : [],
    nextSteps: typeof row.next_steps === 'string' ? JSON.parse(row.next_steps as string) : [],
    x: row.x != null ? Number(row.x) : undefined,
    y: row.y != null ? Number(row.y) : undefined,
    sources: typeof row.sources === 'string' ? JSON.parse(row.sources as string) : undefined,
    unit: row.unit as string | undefined,
    timePeriod: row.time_period as string | undefined,
  };
}

function rowToEdge(row: Record<string, unknown>): InternalGraphEdge {
  return {
    id: row.id as string,
    source: row.source as string,
    target: row.target as string,
    label: row.label as string | undefined,
    sources: typeof row.sources === 'string' ? JSON.parse(row.sources as string) : undefined,
  };
}

export class KnowledgeGraphStorage {
  private initialized = false;
  private userId: string;

  constructor(userId?: string) {
    this.userId = userId || '__global__';
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    getDb();
    this.initialized = true;
  }

  async loadGraph(): Promise<StoredKnowledgeGraph> {
    const db = getDb();
    const nodes = db.prepare('SELECT * FROM graph_nodes WHERE user_id = ?').all(this.userId) as Record<string, unknown>[];
    const edges = db.prepare('SELECT * FROM graph_edges WHERE user_id = ?').all(this.userId) as Record<string, unknown>[];
    const meta = db.prepare('SELECT * FROM graph_metadata WHERE user_id = ?').get(this.userId) as Record<string, unknown> | undefined;

    if (nodes.length === 0 && edges.length === 0 && !meta) {
      const defaultGraph = this.createDefaultGraph();
      await this.saveGraph(defaultGraph);
      return defaultGraph;
    }

    const nodeMap: Record<string, InternalGraphNode> = {};
    for (const n of nodes) {
      nodeMap[n.id as string] = rowToNode(n);
    }

    const edgeMap: Record<string, InternalGraphEdge> = {};
    for (const e of edges) {
      edgeMap[e.id as string] = rowToEdge(e);
    }

    return {
      version: meta ? (meta.version as number) : 1,
      lastUpdated: meta ? (meta.last_updated as string) : new Date().toISOString(),
      nodes: nodeMap,
      edges: edgeMap,
      jobContributions: meta && meta.job_contributions ? JSON.parse(meta.job_contributions as string) : {},
      statistics: meta && meta.statistics ? JSON.parse(meta.statistics as string) : this.createDefaultGraph().statistics,
    };
  }

  async saveGraph(graph: StoredKnowledgeGraph): Promise<void> {
    const db = getDb();
    const lastUpdated = new Date().toISOString();

    const insertNode = db.prepare(`
      INSERT OR REPLACE INTO graph_nodes
        (id, user_id, name, domain, description, prerequisites, next_steps, x, y, sources, unit, time_period)
      VALUES
        (@id, @user_id, @name, @domain, @description, @prerequisites, @next_steps, @x, @y, @sources, @unit, @time_period)
    `);

    const insertEdge = db.prepare(`
      INSERT OR REPLACE INTO graph_edges
        (id, user_id, source, target, label, sources)
      VALUES
        (@id, @user_id, @source, @target, @label, @sources)
    `);

    const upsertMeta = db.prepare(`
      INSERT OR REPLACE INTO graph_metadata
        (user_id, version, last_updated, statistics, job_contributions)
      VALUES
        (@user_id, @version, @last_updated, @statistics, @job_contributions)
    `);

    const tx = db.transaction(() => {
      for (const node of Object.values(graph.nodes)) {
        insertNode.run({
          id: node.id,
          user_id: this.userId,
          name: node.name,
          domain: node.domain,
          description: node.description ?? null,
          prerequisites: JSON.stringify(node.prerequisites),
          next_steps: JSON.stringify(node.nextSteps),
          x: node.x ?? null,
          y: node.y ?? null,
          sources: JSON.stringify(node.sources || []),
          unit: node.unit ?? null,
          time_period: node.timePeriod ?? null,
        });
      }

      for (const edge of Object.values(graph.edges)) {
        insertEdge.run({
          id: edge.id,
          user_id: this.userId,
          source: edge.source,
          target: edge.target,
          label: edge.label ?? null,
          sources: JSON.stringify(edge.sources || []),
        });
      }

      upsertMeta.run({
        user_id: this.userId,
        version: graph.version,
        last_updated: lastUpdated,
        statistics: JSON.stringify(graph.statistics),
        job_contributions: JSON.stringify(graph.jobContributions),
      });
    });

    tx();
  }

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

    for (const edge of jobGraph.edges) {
      const existingEdgeId = this.findDuplicateEdge(graph, edge);

      if (existingEdgeId) {
        const existingEdge = graph.edges[existingEdgeId];
        if (existingEdge.sources && !existingEdge.sources.includes(jobId)) {
          existingEdge.sources.push(jobId);
        } else if (!existingEdge.sources) {
          existingEdge.sources = [jobId];
        }
        result.edgesMerged++;
      } else {
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

    graph.jobContributions[jobId] = contributedNodeIds;
    this.updateStatistics(graph);
    await this.saveGraph(graph);

    return result;
  }

  async getGlobalGraph(): Promise<GraphData> {
    const graph = await this.loadGraph();
    return {
      nodes: Object.values(graph.nodes).map(toGraphNode),
      edges: Object.values(graph.edges).map(toGraphEdge)
    };
  }

  async getGlobalGraphInternal(): Promise<StoredKnowledgeGraph> {
    return this.loadGraph();
  }

  async getJobContribution(jobId: string): Promise<GraphData | null> {
    const graph = await this.loadGraph();
    const nodeIds = graph.jobContributions[jobId];
    if (!nodeIds || nodeIds.length === 0) return null;

    const nodes: GraphNode[] = [];
    for (const nodeId of nodeIds) {
      const node = graph.nodes[nodeId];
      if (node) nodes.push(toGraphNode(node));
    }

    const nodeIdSet = new Set(nodeIds);
    const edges: GraphEdge[] = [];
    for (const edge of Object.values(graph.edges)) {
      if (nodeIdSet.has(edge.source) && nodeIdSet.has(edge.target)) {
        edges.push(toGraphEdge(edge));
      }
    }

    return { nodes, edges };
  }

  async getStatistics(): Promise<StoredKnowledgeGraph['statistics']> {
    const graph = await this.loadGraph();
    return { ...graph.statistics };
  }

  async removeJobContribution(jobId: string): Promise<void> {
    const graph = await this.loadGraph();
    const nodeIds = graph.jobContributions[jobId];
    if (!nodeIds || nodeIds.length === 0) return;

    for (const nodeId of nodeIds) {
      const node = graph.nodes[nodeId];
      if (node && node.sources) {
        node.sources = node.sources.filter(id => id !== jobId);
        if (node.sources.length === 0) {
          delete graph.nodes[nodeId];
        }
      }
    }

    for (const edgeId of Object.keys(graph.edges)) {
      const edge = graph.edges[edgeId];
      if (edge.sources && edge.sources.includes(jobId)) {
        edge.sources = edge.sources.filter(id => id !== jobId);
        if (edge.sources.length === 0) {
          delete graph.edges[edgeId];
        }
      }
    }

    delete graph.jobContributions[jobId];
    this.updateStatistics(graph);
    await this.saveGraph(graph);
  }

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
        nodeTypeDistribution: { concept: 0, entity: 0, process: 0 }
      }
    };
  }

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
        nodeTypeDistribution: { concept: 0, entity: 0, process: 0 }
      }
    };
  }

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

  private findDuplicateNode(graph: StoredKnowledgeGraph, node: GraphNode): string | null {
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

  private findDuplicateEdge(graph: StoredKnowledgeGraph, edge: GraphEdge): string | null {
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

const storageCache: Map<string, KnowledgeGraphStorage> = new Map();

export function getKnowledgeGraphStorage(userId?: string): KnowledgeGraphStorage {
  const cacheKey = userId || '__global__';
  if (!storageCache.has(cacheKey)) {
    storageCache.set(cacheKey, new KnowledgeGraphStorage(userId));
  }
  return storageCache.get(cacheKey)!;
}

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
    return { nodes: nodesWithLayout, edges: validEdges };
  }

  const nodeIdSet = new Set(rawNodes.map(n => n.id));
  const validEdges = rawEdges.filter(e => nodeIdSet.has(e.source) && nodeIdSet.has(e.target));
  return { nodes: rawNodes, edges: validEdges };
}

export interface ViewportBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

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

export function resetStorageInstance(): void {
  storageCache.clear();
}

export async function copyDefaultGraphToUser(userId: string): Promise<void> {
  const db = getDb();
  const defaultUserId = '__global__';
  const defaultMeta = db.prepare('SELECT * FROM graph_metadata WHERE user_id = ?').get(defaultUserId) as Record<string, unknown> | undefined;
  const defaultNodes = db.prepare('SELECT * FROM graph_nodes WHERE user_id = ?').all(defaultUserId) as Record<string, unknown>[];
  const defaultEdges = db.prepare('SELECT * FROM graph_edges WHERE user_id = ?').all(defaultUserId) as Record<string, unknown>[];

  const insertNode = db.prepare(`
    INSERT OR IGNORE INTO graph_nodes
      (id, user_id, name, domain, description, prerequisites, next_steps, x, y, sources, unit, time_period)
    VALUES
      (@id, @user_id, @name, @domain, @description, @prerequisites, @next_steps, @x, @y, @sources, @unit, @time_period)
  `);

  const insertEdge = db.prepare(`
    INSERT OR IGNORE INTO graph_edges
      (id, user_id, source, target, label, sources)
    VALUES
      (@id, @user_id, @source, @target, @label, @sources)
  `);

  const tx = db.transaction(() => {
    for (const node of defaultNodes) {
      insertNode.run({
        id: node.id,
        user_id: userId,
        name: node.name,
        domain: node.domain,
        description: node.description ?? null,
        prerequisites: node.prerequisites,
        next_steps: node.next_steps,
        x: node.x ?? null,
        y: node.y ?? null,
        sources: node.sources,
        unit: node.unit ?? null,
        time_period: node.time_period ?? null,
      });
    }

    for (const edge of defaultEdges) {
      insertEdge.run({
        id: edge.id,
        user_id: userId,
        source: edge.source,
        target: edge.target,
        label: edge.label ?? null,
        sources: edge.sources,
      });
    }

    if (defaultMeta) {
      const stats = typeof defaultMeta.statistics === 'string'
        ? JSON.parse(defaultMeta.statistics as string)
        : { totalJobs: 0, totalNodes: 0, totalEdges: 0, nodeTypeDistribution: { concept: 0, entity: 0, process: 0 } };
      stats.totalJobs = 0;

      db.prepare(`
        INSERT OR REPLACE INTO graph_metadata
          (user_id, version, last_updated, statistics, job_contributions)
        VALUES
          (@user_id, @version, @last_updated, @statistics, @job_contributions)
      `).run({
        user_id: userId,
        version: defaultMeta.version ?? 1,
        last_updated: new Date().toISOString(),
        statistics: JSON.stringify(stats),
        job_contributions: '{}',
      });
    }
  });

  tx();
}
