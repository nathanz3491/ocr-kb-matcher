import { getDb } from '../db/sqlite';
import fs from 'fs';
import path from 'path';
import { getKnowledgeGraph } from './knowledgeGraphStorage';

const DATA_DIR = path.join(process.cwd(), 'data');

export interface UserProgress {
  knownNodes: string[];
  unknownNodes: string[];
  lastUpdated: string;
  learnedAt: Record<string, string>;
  nodeMastery: Record<string, number>;
}

// ── One-time JSON → SQLite migration ──────────────────────────────────────

let migrated = false;

function migrateUserProgress(): void {
  if (migrated) return;
  migrated = true;

  const db = getDb();

  const upsertStmt = db.prepare(
    `INSERT INTO user_progress (user_id, node_id, mastery_level, last_reviewed, total_reviews, known, learned_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id, node_id) DO UPDATE SET
       mastery_level = excluded.mastery_level,
       last_reviewed = excluded.last_reviewed,
       total_reviews = excluded.total_reviews,
       known = excluded.known,
       learned_at = excluded.learned_at`
  );

  let files: string[];
  try {
    files = fs.readdirSync(DATA_DIR);
  } catch {
    return;
  }

  for (const file of files) {
    if (!file.startsWith('user-progress-') || !file.endsWith('.json')) continue;

    const filePath = path.join(DATA_DIR, file);
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const progress: UserProgress = JSON.parse(content);
      const userId = file.replace('user-progress-', '').replace('.json', '');

      const now = new Date().toISOString();
      let count = 0;

      const run = db.transaction(() => {
        // Upsert per-node mastery rows
        for (const [nodeId, mastery] of Object.entries(progress.nodeMastery || {})) {
          const isKnown = (progress.knownNodes || []).includes(nodeId) ? 1 : 0;
          const learnedAt = progress.learnedAt?.[nodeId] || null;
          upsertStmt.run(userId, nodeId, mastery, now, 0, isKnown, learnedAt);
          count++;
        }

        // Also insert rows for known nodes that might not have mastery entries
        for (const nodeId of progress.knownNodes || []) {
          if (progress.nodeMastery && progress.nodeMastery[nodeId] !== undefined) continue;
          const learnedAt = progress.learnedAt?.[nodeId] || null;
          upsertStmt.run(userId, nodeId, 0, now, 0, 1, learnedAt);
          count++;
        }
      });
      run();

      fs.renameSync(filePath, filePath + '.migrated');
      console.log(`[userProgress] Migrated ${file} (${count} nodes) → ${file}.migrated`);
    } catch (err) {
      console.warn(`[userProgress] Skipping ${file}:`, (err as Error).message);
    }
  }
}

// ── Public API ─────────────────────────────────────────────────────────────

export class UserProgressService {
  async loadProgress(userId: string): Promise<UserProgress> {
    migrateUserProgress();
    const db = getDb();

    const rows = db.prepare(
      'SELECT node_id, mastery_level, known, learned_at FROM user_progress WHERE user_id = ?'
    ).all(userId) as { node_id: string; mastery_level: number; known: number; learned_at: string | null }[];

    const knownNodes: string[] = [];
    const nodeMastery: Record<string, number> = {};
    const learnedAt: Record<string, string> = {};

    for (const row of rows) {
      nodeMastery[row.node_id] = row.mastery_level;
      if (row.known) {
        knownNodes.push(row.node_id);
        if (row.learned_at) {
          learnedAt[row.node_id] = row.learned_at;
        }
      }
    }

    return {
      knownNodes,
      unknownNodes: [],
      lastUpdated: new Date().toISOString(),
      learnedAt,
      nodeMastery,
    };
  }

  async saveProgress(userId: string, progress: UserProgress): Promise<void> {
    migrateUserProgress();
    const db = getDb();

    // Clear existing progress for user
    db.prepare('DELETE FROM user_progress WHERE user_id = ?').run(userId);

    const insertStmt = db.prepare(
      `INSERT INTO user_progress (user_id, node_id, mastery_level, last_reviewed, total_reviews, known, learned_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    );

    const now = new Date().toISOString();

    const run = db.transaction(() => {
      // Insert all nodes from nodeMastery
      for (const [nodeId, mastery] of Object.entries(progress.nodeMastery || {})) {
        const isKnown = (progress.knownNodes || []).includes(nodeId) ? 1 : 0;
        const learnedAtVal = progress.learnedAt?.[nodeId] || null;
        insertStmt.run(userId, nodeId, mastery, now, 0, isKnown, learnedAtVal);
      }

      // Insert any known nodes not already in nodeMastery
      for (const nodeId of progress.knownNodes || []) {
        if (progress.nodeMastery && progress.nodeMastery[nodeId] !== undefined) continue;
        const learnedAtVal = progress.learnedAt?.[nodeId] || null;
        insertStmt.run(userId, nodeId, 0, now, 0, 1, learnedAtVal);
      }
    });
    run();
  }

  async updateNodeMastery(nodeId: string, masteryChange: number, userId: string): Promise<number> {
    migrateUserProgress();
    const db = getDb();

    const row = db.prepare(
      'SELECT mastery_level FROM user_progress WHERE user_id = ? AND node_id = ?'
    ).get(userId, nodeId) as { mastery_level: number } | undefined;

    const currentMastery = row ? row.mastery_level : 0;
    let newMastery = Math.max(0, Math.min(100, currentMastery + masteryChange));
    newMastery = Math.round(newMastery * 10) / 10;

    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO user_progress (user_id, node_id, mastery_level, last_reviewed, total_reviews, known, learned_at)
       VALUES (?, ?, ?, ?, 1, 0, NULL)
       ON CONFLICT(user_id, node_id) DO UPDATE SET
         mastery_level = excluded.mastery_level,
         last_reviewed = excluded.last_reviewed,
         total_reviews = user_progress.total_reviews + 1`
    ).run(userId, nodeId, newMastery, now);

    return newMastery;
  }

  async setNodeMastery(nodeId: string, mastery: number, userId: string): Promise<void> {
    migrateUserProgress();
    const db = getDb();

    const clampedMastery = Math.max(0, Math.min(100, Math.round(mastery * 10) / 10));
    const now = new Date().toISOString();

    db.prepare(
      `INSERT INTO user_progress (user_id, node_id, mastery_level, last_reviewed, total_reviews, known, learned_at)
       VALUES (?, ?, ?, ?, 0, 0, NULL)
       ON CONFLICT(user_id, node_id) DO UPDATE SET
         mastery_level = excluded.mastery_level,
         last_reviewed = excluded.last_reviewed`
    ).run(userId, nodeId, clampedMastery, now);
  }

  async getNodeMastery(nodeId: string, userId: string): Promise<number> {
    migrateUserProgress();
    const db = getDb();

    const row = db.prepare(
      'SELECT mastery_level FROM user_progress WHERE user_id = ? AND node_id = ?'
    ).get(userId, nodeId) as { mastery_level: number } | undefined;

    return row ? row.mastery_level : 0;
  }

  async getAllNodeMasteries(userId: string): Promise<Record<string, number>> {
    migrateUserProgress();
    const db = getDb();

    const rows = db.prepare(
      'SELECT node_id, mastery_level FROM user_progress WHERE user_id = ?'
    ).all(userId) as { node_id: string; mastery_level: number }[];

    const result: Record<string, number> = {};
    for (const row of rows) {
      result[row.node_id] = row.mastery_level;
    }
    return result;
  }

  async markNodesAsKnown(nodeIds: string[], userId: string): Promise<void> {
    migrateUserProgress();

    const graph = await getKnowledgeGraph(userId);
    const validNodeIds = new Set(graph.nodes.map(n => n.id));

    const db = getDb();
    const now = new Date().toISOString();

    const upsertStmt = db.prepare(
      `INSERT INTO user_progress (user_id, node_id, mastery_level, last_reviewed, total_reviews, known, learned_at)
       VALUES (?, ?, 0, ?, 0, 1, ?)
       ON CONFLICT(user_id, node_id) DO UPDATE SET
         known = 1,
         learned_at = COALESCE(user_progress.learned_at, excluded.learned_at),
         last_reviewed = excluded.last_reviewed`
    );

    const run = db.transaction(() => {
      for (const nodeId of nodeIds) {
        if (!validNodeIds.has(nodeId)) {
          console.warn(`[UserProgress] Skipping invalid node ID: ${nodeId}`);
          continue;
        }
        upsertStmt.run(userId, nodeId, now, now);
      }
    });
    run();
  }

  async markNodesAsKnownWithMastery(nodeIds: string[], masteryPercentage: number, userId: string): Promise<void> {
    migrateUserProgress();

    const graph = await getKnowledgeGraph(userId);
    const validNodeIds = new Set(graph.nodes.map(n => n.id));

    const db = getDb();
    const now = new Date().toISOString();

    const upsertStmt = db.prepare(
      `INSERT INTO user_progress (user_id, node_id, mastery_level, last_reviewed, total_reviews, known, learned_at)
       VALUES (?, ?, ?, ?, 1, 1, ?)
       ON CONFLICT(user_id, node_id) DO UPDATE SET
         mastery_level = MIN(100, user_progress.mastery_level + excluded.mastery_level),
         known = 1,
         learned_at = COALESCE(user_progress.learned_at, excluded.learned_at),
         last_reviewed = excluded.last_reviewed,
         total_reviews = user_progress.total_reviews + 1`
    );

    const run = db.transaction(() => {
      for (const nodeId of nodeIds) {
        if (!validNodeIds.has(nodeId)) {
          console.warn(`[UserProgress] Skipping invalid node ID: ${nodeId}`);
          continue;
        }
        const incoming = Math.max(0, Math.min(100, masteryPercentage));
        upsertStmt.run(userId, nodeId, incoming, now, now);
      }
    });
    run();
  }

  async getKnownNodeIds(userId: string): Promise<string[]> {
    migrateUserProgress();
    const db = getDb();

    const rows = db.prepare(
      'SELECT node_id FROM user_progress WHERE user_id = ? AND known = 1'
    ).all(userId) as { node_id: string }[];

    return rows.map(r => r.node_id);
  }

  async getUnknownNodeIds(allNodeIds: string[], userId: string): Promise<string[]> {
    const knownIds = new Set(await this.getKnownNodeIds(userId));
    return allNodeIds.filter(id => !knownIds.has(id));
  }

  async getLearnedNodesWithTimestamps(userId: string): Promise<Array<{ nodeId: string; learnedAt: string }>> {
    migrateUserProgress();
    const db = getDb();

    const rows = db.prepare(
      'SELECT node_id, learned_at FROM user_progress WHERE user_id = ? AND known = 1 AND learned_at IS NOT NULL'
    ).all(userId) as { node_id: string; learned_at: string }[];

    return rows.map(r => ({ nodeId: r.node_id, learnedAt: r.learned_at }));
  }
}

export const userProgressService = new UserProgressService();
