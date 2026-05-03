import { randomUUID } from 'crypto';
import { getKnowledgeGraphStorage, InternalGraphNode, InternalGraphEdge } from './knowledgeGraphStorage';

export interface EditorNode {
  id: string;
  name: string;
  description?: string;
  prerequisites: string[];
  nextSteps: string[];
  domain: string;
}

export interface CreateEditorNodeInput {
  name: string;
  description?: string;
  domain?: string;
  prerequisites?: string[];
}

export interface UpdateEditorNodeInput {
  name?: string;
  description?: string;
  domain?: string;
  prerequisites?: string[];
  nextSteps?: string[];
}

export interface EditorRelationship {
  id: string;
  source: string;
  target: string;
  label?: string;
}

function toEditorNode(internal: InternalGraphNode): EditorNode {
  return {
    id: internal.id,
    name: internal.name,
    description: internal.description,
    prerequisites: internal.prerequisites || [],
    nextSteps: internal.nextSteps || [],
    domain: internal.domain,
  };
}

export async function getEditorNodes(userId?: string): Promise<EditorNode[]> {
  const storage = getKnowledgeGraphStorage(userId);
  await storage.initialize();
  const graph = await storage.getGlobalGraphInternal();
  return Object.values(graph.nodes).map(toEditorNode);
}

export async function getEditorNode(id: string, userId?: string): Promise<EditorNode | null> {
  const storage = getKnowledgeGraphStorage(userId);
  await storage.initialize();
  const graph = await storage.getGlobalGraphInternal();
  const node = graph.nodes[id];
  return node ? toEditorNode(node) : null;
}

export async function createEditorNode(
  input: CreateEditorNodeInput,
  userId?: string
): Promise<EditorNode> {
  const storage = getKnowledgeGraphStorage(userId);
  await storage.initialize();
  const graph = await storage.getGlobalGraphInternal();

  const id = randomUUID();
  
  const existingNodes = Object.values(graph.nodes);
  let maxY = -Infinity, maxX = -Infinity;
  for (const n of existingNodes) {
    if (n.y !== undefined && n.y > maxY) maxY = n.y;
    if (n.x !== undefined && n.x > maxX) maxX = n.x;
  }
  const newY = (isFinite(maxY) ? maxY : 0) + 220;
  const newX = (isFinite(maxX) ? maxX : 0) + 80;
  
  const newNode: InternalGraphNode = {
    id,
    name: input.name,
    description: input.description,
    domain: input.domain || 'General',
    prerequisites: [],
    nextSteps: [],
    x: newX,
    y: newY,
  };

  if (input.prerequisites && input.prerequisites.length > 0) {
    for (const prereqId of input.prerequisites) {
      if (graph.nodes[prereqId]) {
        newNode.prerequisites.push(prereqId);
        if (!graph.nodes[prereqId].nextSteps.includes(id)) {
          graph.nodes[prereqId].nextSteps.push(id);
        }
      }
    }
  }

  graph.nodes[id] = newNode;
  await storage.saveGraph(graph);
  return toEditorNode(newNode);
}

export async function updateEditorNode(
  id: string,
  updates: UpdateEditorNodeInput,
  userId?: string
): Promise<EditorNode | null> {
  const storage = getKnowledgeGraphStorage(userId);
  await storage.initialize();
  const graph = await storage.getGlobalGraphInternal();

  const node = graph.nodes[id];
  if (!node) return null;

  if (updates.name !== undefined) node.name = updates.name;
  if (updates.description !== undefined) node.description = updates.description;
  if (updates.domain !== undefined) node.domain = updates.domain;

  if (updates.prerequisites !== undefined) {
    const removedPrereqs = node.prerequisites.filter(p => !updates.prerequisites!.includes(p));
    for (const removed of removedPrereqs) {
      if (graph.nodes[removed]) {
        graph.nodes[removed].nextSteps = graph.nodes[removed].nextSteps.filter(s => s !== id);
      }
    }
    for (const newPrereq of updates.prerequisites) {
      if (graph.nodes[newPrereq]) {
        if (!graph.nodes[newPrereq].nextSteps.includes(id)) {
          graph.nodes[newPrereq].nextSteps.push(id);
        }
      }
    }
    node.prerequisites = updates.prerequisites;
  }

  if (updates.nextSteps !== undefined) {
    const removedSteps = node.nextSteps.filter(s => !updates.nextSteps!.includes(s));
    for (const removed of removedSteps) {
      if (graph.nodes[removed]) {
        graph.nodes[removed].prerequisites = graph.nodes[removed].prerequisites.filter(p => p !== id);
      }
    }
    for (const newStep of updates.nextSteps) {
      if (graph.nodes[newStep]) {
        if (!graph.nodes[newStep].prerequisites.includes(id)) {
          graph.nodes[newStep].prerequisites.push(id);
        }
      }
    }
    node.nextSteps = updates.nextSteps;
  }

  await storage.saveGraph(graph);
  return toEditorNode(node);
}

export async function deleteEditorNode(id: string, userId?: string): Promise<boolean> {
  const storage = getKnowledgeGraphStorage(userId);
  await storage.initialize();
  const graph = await storage.getGlobalGraphInternal();

  if (!graph.nodes[id]) return false;

  for (const otherNode of Object.values(graph.nodes)) {
    otherNode.prerequisites = otherNode.prerequisites.filter(p => p !== id);
    otherNode.nextSteps = otherNode.nextSteps.filter(s => s !== id);
  }

  for (const edgeId of Object.keys(graph.edges)) {
    const edge = graph.edges[edgeId];
    if (edge.source === id || edge.target === id) {
      delete graph.edges[edgeId];
    }
  }

  delete graph.nodes[id];
  await storage.saveGraph(graph);
  return true;
}

export async function createEditorRelationship(
  source: string,
  target: string,
  label?: string,
  userId?: string
): Promise<EditorRelationship> {
  const storage = getKnowledgeGraphStorage(userId);
  await storage.initialize();
  const graph = await storage.getGlobalGraphInternal();

  if (!graph.nodes[source] || !graph.nodes[target]) {
    throw new Error('Source or target node not found');
  }

  const id = randomUUID();
  const edge: InternalGraphEdge = {
    id,
    source,
    target,
    label,
  };

  if (!graph.nodes[source].nextSteps.includes(target)) {
    graph.nodes[source].nextSteps.push(target);
  }
  if (!graph.nodes[target].prerequisites.includes(source)) {
    graph.nodes[target].prerequisites.push(source);
  }

  graph.edges[id] = edge;
  await storage.saveGraph(graph);

  return { id, source, target, label };
}

export async function deleteEditorRelationship(id: string, userId?: string): Promise<boolean> {
  const storage = getKnowledgeGraphStorage(userId);
  await storage.initialize();
  const graph = await storage.getGlobalGraphInternal();

  const edge = graph.edges[id];
  if (!edge) return false;

  graph.nodes[edge.source].nextSteps = graph.nodes[edge.source].nextSteps.filter(t => t !== edge.target);
  graph.nodes[edge.target].prerequisites = graph.nodes[edge.target].prerequisites.filter(p => p !== edge.source);

  delete graph.edges[id];
  await storage.saveGraph(graph);
  return true;
}
