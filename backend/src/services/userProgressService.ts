import * as fs from 'fs/promises';
import * as path from 'path';
import { getKnowledgeGraph } from './knowledgeGraphStorage';

function getProgressFilePath(userId: string): string {
  return `./data/user-progress-${userId}.json`;
}

export interface UserProgress {
  knownNodes: string[];
  unknownNodes: string[];
  lastUpdated: string;
  learnedAt: Record<string, string>; // Map of nodeId -> ISO timestamp when learned
  nodeMastery: Record<string, number>; // Map of nodeId -> mastery percentage (0-100)
}

export class UserProgressService {
  async loadProgress(userId: string): Promise<UserProgress> {
    const filePath = getProgressFilePath(userId);

    try {
      const data = await fs.readFile(filePath, 'utf-8');
      const progress = JSON.parse(data);
      // Ensure learnedAt exists for backward compatibility
      if (!progress.learnedAt) {
        progress.learnedAt = {};
      }
      // Ensure nodeMastery exists for backward compatibility
      if (!progress.nodeMastery) {
        progress.nodeMastery = {};
      }
      return progress;
    } catch {
      return {
        knownNodes: [],
        unknownNodes: [],
        lastUpdated: new Date().toISOString(),
        learnedAt: {},
        nodeMastery: {}
      };
    }
  }

  async saveProgress(userId: string, progress: UserProgress): Promise<void> {
    progress.lastUpdated = new Date().toISOString();
    const filePath = getProgressFilePath(userId);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(progress, null, 2));
  }

  /**
   * Update mastery for a specific node
   * @param nodeId The node to update
   * @param masteryChange Change in mastery percentage (positive or negative)
   * @param userId The user ID
   */
  async updateNodeMastery(nodeId: string, masteryChange: number, userId: string): Promise<number> {
    const progress = await this.loadProgress(userId);

    // Get current mastery (default to 0 if not set)
    const currentMastery = progress.nodeMastery[nodeId] || 0;

    // Calculate new mastery (clamped between 0 and 100)
    let newMastery = Math.max(0, Math.min(100, currentMastery + masteryChange));

    // Round to 1 decimal place
    newMastery = Math.round(newMastery * 10) / 10;

    progress.nodeMastery[nodeId] = newMastery;
    await this.saveProgress(userId, progress);

    return newMastery;
  }

  /**
   * Set absolute mastery for a specific node
   */
  async setNodeMastery(nodeId: string, mastery: number, userId: string): Promise<void> {
    const progress = await this.loadProgress(userId);

    // Clamp between 0 and 100
    const clampedMastery = Math.max(0, Math.min(100, Math.round(mastery * 10) / 10));

    progress.nodeMastery[nodeId] = clampedMastery;
    await this.saveProgress(userId, progress);
  }

  /**
   * Get mastery for a specific node
   */
  async getNodeMastery(nodeId: string, userId: string): Promise<number> {
    const progress = await this.loadProgress(userId);
    return progress.nodeMastery[nodeId] || 0;
  }

  /**
   * Get all node masteries
   */
  async getAllNodeMasteries(userId: string): Promise<Record<string, number>> {
    const progress = await this.loadProgress(userId);
    return progress.nodeMastery;
  }

  async markNodesAsKnown(nodeIds: string[], userId: string): Promise<void> {
    // Get all valid node IDs from knowledge graph
    const graph = await getKnowledgeGraph(userId);
    const validNodeIds = new Set(graph.nodes.map(n => n.id));

    const progress = await this.loadProgress(userId);
    const now = new Date().toISOString();

    for (const nodeId of nodeIds) {
      // Only mark nodes that actually exist in the knowledge graph
      if (!validNodeIds.has(nodeId)) {
        console.warn(`[UserProgress] Skipping invalid node ID: ${nodeId}`);
        continue;
      }

      if (!progress.knownNodes.includes(nodeId)) {
        progress.knownNodes.push(nodeId);
        progress.learnedAt[nodeId] = now;
      }
      progress.unknownNodes = progress.unknownNodes.filter(id => id !== nodeId);
    }

    await this.saveProgress(userId, progress);
  }

  async markNodesAsKnownWithMastery(nodeIds: string[], masteryPercentage: number, userId: string): Promise<void> {
    // Get all valid node IDs from knowledge graph
    const graph = await getKnowledgeGraph(userId);
    const validNodeIds = new Set(graph.nodes.map(n => n.id));

    const progress = await this.loadProgress(userId);
    const now = new Date().toISOString();

    for (const nodeId of nodeIds) {
      // Only mark nodes that actually exist in the knowledge graph
      if (!validNodeIds.has(nodeId)) {
        console.warn(`[UserProgress] Skipping invalid node ID: ${nodeId}`);
        continue;
      }

      if (!progress.knownNodes.includes(nodeId)) {
        progress.knownNodes.push(nodeId);
        progress.learnedAt[nodeId] = now;
      }
      progress.unknownNodes = progress.unknownNodes.filter(id => id !== nodeId);
      const incoming = Math.max(0, Math.min(100, masteryPercentage));
      const existing = progress.nodeMastery[nodeId] || 0;
      progress.nodeMastery[nodeId] = Math.min(100, existing + incoming);
    }

    await this.saveProgress(userId, progress);
  }

  async getKnownNodeIds(userId: string): Promise<string[]> {
    const progress = await this.loadProgress(userId);
    return progress.knownNodes;
  }

  async getUnknownNodeIds(allNodeIds: string[], userId: string): Promise<string[]> {
    const progress = await this.loadProgress(userId);
    return allNodeIds.filter(id => !progress.knownNodes.includes(id));
  }

  async getLearnedNodesWithTimestamps(userId: string): Promise<Array<{ nodeId: string; learnedAt: string }>> {
    const progress = await this.loadProgress(userId);
    return Object.entries(progress.learnedAt).map(([nodeId, learnedAt]) => ({
      nodeId,
      learnedAt
    }));
  }
}

export const userProgressService = new UserProgressService();