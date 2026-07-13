/**
 * Migration script: JSON files → SQLite.
 *
 * Idempotent: uses INSERT OR IGNORE so re-runs are safe (no duplicates).
 * Reads existing backend/data/*.json and inserts rows into backend/data/app.db.
 *
 * Usage: npx ts-node backend/scripts/migrate-json-to-sqlite.ts
 */

import path from 'path';
import fs from 'fs';
import { getDb, closeDb } from '../src/db/sqlite';

const DATA_DIR = path.join(process.cwd(), 'data');

function readJsonFile(filePath: string): unknown {
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw);
}

function migrateUsers(): void {
  const db = getDb();
  const data = readJsonFile(path.join(DATA_DIR, 'users.json'));
  if (!Array.isArray(data)) {
    console.log('[migrate] No users.json array found, skipping');
    return;
  }

  const insert = db.prepare(`
    INSERT OR IGNORE INTO users
      (id, email, password_hash, name, account_type, email_verified,
       email_verification_code, email_verification_expires,
       parent_code, parent_code_expires,
       created_at, updated_at, settings, tier,
       subscription_started_at, subscription_expires_at, role, usage)
    VALUES
      (@id, @email, @password_hash, @name, @account_type, @email_verified,
       @email_verification_code, @email_verification_expires,
       @parent_code, @parent_code_expires,
       @created_at, @updated_at, @settings, @tier,
       @subscription_started_at, @subscription_expires_at, @role, @usage)
  `);

  const transaction = db.transaction((users: Record<string, unknown>[]) => {
    for (const u of users) {
      const safeUser = u as Record<string, unknown>;
      insert.run({
        id: safeUser.id,
        email: safeUser.email ?? '',
        password_hash: safeUser.passwordHash ?? '',
        name: safeUser.name ?? '',
        account_type: safeUser.accountType ?? 'student',
        email_verified: safeUser.emailVerified ? 1 : 0,
        email_verification_code: safeUser.emailVerificationCode ?? null,
        email_verification_expires: safeUser.emailVerificationExpires ?? null,
        parent_code: safeUser.parentCode ?? null,
        parent_code_expires: safeUser.parentCodeExpires ?? null,
        created_at: safeUser.createdAt ?? new Date().toISOString(),
        updated_at: safeUser.updatedAt ?? new Date().toISOString(),
        settings: safeUser.settings ? JSON.stringify(safeUser.settings) : '{}',
        tier: safeUser.tier ?? null,
        subscription_started_at: safeUser.subscriptionStartedAt ?? null,
        subscription_expires_at: safeUser.subscriptionExpiresAt ?? null,
        role: safeUser.role ?? 'user',
        usage: safeUser.usage ? JSON.stringify(safeUser.usage) : null,
      });
    }
  });

  transaction(data as Record<string, unknown>[]);
  console.log(`[migrate] Users: migrated ${(data as unknown[]).length} records`);
}

function migrateKnowledgeGraph(): void {
  const db = getDb();

  // Collect all knowledge graph JSON files
  const graphFiles = fs.readdirSync(DATA_DIR).filter(f =>
    f.startsWith('knowledge-graph') && f.endsWith('.json') && !f.includes('.backup') && !f.includes('.tmp')
  );

  for (const file of graphFiles) {
    const filePath = path.join(DATA_DIR, file);
    const graph = readJsonFile(filePath) as Record<string, unknown> | null;
    if (!graph || typeof graph.nodes !== 'object' || typeof graph.edges !== 'object') {
      console.log(`[migrate] Invalid graph structure in ${file}, skipping`);
      continue;
    }

    // Extract userId from filename: knowledge-graph-{userId}.json → userId
    // knowledge-graph.json → '__global__'
    let userId = '__global__';
    const match = file.match(/^knowledge-graph-(.+)\.json$/);
    if (match) {
      userId = match[1];
    }

    const nodes = graph.nodes as Record<string, Record<string, unknown>>;
    const edges = graph.edges as Record<string, Record<string, unknown>>;
    const stats = graph.statistics as Record<string, unknown> | undefined;
    const contribs = graph.jobContributions as Record<string, unknown> | undefined;

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

    const upsertMeta = db.prepare(`
      INSERT OR REPLACE INTO graph_metadata
        (user_id, version, last_updated, statistics, job_contributions)
      VALUES
        (@user_id, @version, @last_updated, @statistics, @job_contributions)
    `);

    const tx = db.transaction(() => {
      for (const [nodeId, node] of Object.entries(nodes)) {
        insertNode.run({
          id: nodeId,
          user_id: userId,
          name: node.name ?? '',
          domain: node.domain ?? 'General',
          description: node.description ?? null,
          prerequisites: node.prerequisites ? JSON.stringify(node.prerequisites) : '[]',
          next_steps: node.nextSteps ? JSON.stringify(node.nextSteps) : '[]',
          x: node.x != null ? Number(node.x) : null,
          y: node.y != null ? Number(node.y) : null,
          sources: node.sources ? JSON.stringify(node.sources) : '[]',
          unit: node.unit ?? null,
          time_period: node.timePeriod ?? null,
        });
      }

      for (const [edgeId, edge] of Object.entries(edges)) {
        insertEdge.run({
          id: edgeId,
          user_id: userId,
          source: edge.source ?? '',
          target: edge.target ?? '',
          label: edge.label ?? null,
          sources: edge.sources ? JSON.stringify(edge.sources) : '[]',
        });
      }

      upsertMeta.run({
        user_id: userId,
        version: graph.version ?? 1,
        last_updated: graph.lastUpdated ?? new Date().toISOString(),
        statistics: stats ? JSON.stringify(stats) : '{}',
        job_contributions: contribs ? JSON.stringify(contribs) : '{}',
      });
    });

    tx();
    console.log(`[migrate] Graph '${file}': ${Object.keys(nodes).length} nodes, ${Object.keys(edges).length} edges → userId=${userId}`);
  }
}

function migrateReviews(): void {
  const db = getDb();
  const reviewFiles = fs.readdirSync(DATA_DIR).filter(f =>
    f.startsWith('reviews') && f.endsWith('.json')
  );

  const insert = db.prepare(`
    INSERT OR IGNORE INTO reviews
      (node_id, user_id, last_reviewed, next_review_date, review_count, interval_days, ease_factor)
    VALUES
      (@node_id, @user_id, @last_reviewed, @next_review_date, @review_count, @interval_days, @ease_factor)
  `);

  for (const file of reviewFiles) {
    const filePath = path.join(DATA_DIR, file);
    const data = readJsonFile(filePath) as { reviews?: Record<string, Record<string, unknown>> } | null;
    if (!data?.reviews) {
      console.log(`[migrate] No reviews in ${file}, skipping`);
      continue;
    }

    let userId = '__global__';
    const match = file.match(/^reviews-(.+)\.json$/);
    if (match) {
      userId = match[1];
    }

    const reviews = data.reviews;
    if (!reviews) {
      console.log(`[migrate] No reviews object in ${file}, skipping`);
      continue;
    }

    const tx = db.transaction(() => {
      for (const [nodeId, review] of Object.entries(reviews)) {
        insert.run({
          node_id: nodeId,
          user_id: userId,
          last_reviewed: review.lastReviewed ?? new Date().toISOString(),
          next_review_date: review.nextReviewDate ?? new Date().toISOString(),
          review_count: review.reviewCount ?? 0,
          interval_days: review.interval ?? 0,
          ease_factor: review.easeFactor ?? 2.5,
        });
      }
    });

    tx();
    console.log(`[migrate] Reviews '${file}': ${Object.keys(reviews).length} items → userId=${userId}`);
  }
}

function migrateChatHistories(): void {
  const db = getDb();
  const chatFile = path.join(DATA_DIR, 'chat-histories.json');
  const data = readJsonFile(chatFile) as Record<string, unknown[]> | null;
  if (!data) {
    console.log('[migrate] No chat-histories.json, skipping');
    return;
  }

  const insert = db.prepare(`
    INSERT OR IGNORE INTO chat_sessions
      (id, user_id, messages, created_at, updated_at)
    VALUES
      (@id, @user_id, @messages, @created_at, @updated_at)
  `);

  const now = new Date().toISOString();

  const tx = db.transaction(() => {
    for (const [key, messages] of Object.entries(data)) {
      const sessionId = `chat-${key}`;
      insert.run({
        id: sessionId,
        user_id: key === 'default' ? '__global__' : key,
        messages: JSON.stringify(messages),
        created_at: now,
        updated_at: now,
      });
    }
  });

  tx();
  console.log(`[migrate] Chat histories: ${Object.keys(data).length} sessions`);
}

function migrateFlashcards(): void {
  const db = getDb();
  const flashDir = path.join(DATA_DIR, 'flashcards');
  if (!fs.existsSync(flashDir)) {
    console.log('[migrate] No flashcards directory, skipping');
    return;
  }

  const files = fs.readdirSync(flashDir).filter(f => f.endsWith('.json'));

  const insertSet = db.prepare(`
    INSERT OR IGNORE INTO flashcard_sets
      (node_id, user_id, node_title, category, created_at, updated_at)
    VALUES
      (@node_id, @user_id, @node_title, @category, @created_at, @updated_at)
  `);

  const insertCard = db.prepare(`
    INSERT OR IGNORE INTO flashcards
      (id, user_id, node_id, front, back, hint)
    VALUES
      (@id, @user_id, @node_id, @front, @back, @hint)
  `);

  for (const file of files) {
    const filePath = path.join(flashDir, file);
    const set = readJsonFile(filePath) as Record<string, unknown> | null;
    if (!set || !Array.isArray(set.cards)) {
      console.log(`[migrate] Invalid flashcard set in ${file}, skipping`);
      continue;
    }

    const nodeId = (set.nodeId as string) || file.replace('.json', '');
    const cards = set.cards as Record<string, unknown>[];

    const tx = db.transaction(() => {
      insertSet.run({
        node_id: nodeId,
        user_id: '__global__',
        node_title: set.nodeTitle ?? nodeId,
        category: set.category ?? 'General',
        created_at: set.createdAt ?? new Date().toISOString(),
        updated_at: set.updatedAt ?? new Date().toISOString(),
      });

      for (const card of cards) {
        insertCard.run({
          id: card.id ?? `${nodeId}-card-${Math.random().toString(36).slice(2, 9)}`,
          user_id: '__global__',
          node_id: nodeId,
          front: card.front ?? '',
          back: card.back ?? '',
          hint: card.hint ?? null,
        });
      }
    });

    tx();
    console.log(`[migrate] Flashcards '${file}': ${cards.length} cards → nodeId=${nodeId}`);
  }
}

// ─── Main ──────────────────────────────────────────────────────────────────

console.log('[migrate] Starting JSON → SQLite migration...');
console.log(`[migrate] DB path: ${path.join(DATA_DIR, 'app.db')}`);

migrateUsers();
migrateKnowledgeGraph();
migrateReviews();
migrateChatHistories();
migrateFlashcards();

closeDb();

console.log('[migrate] Migration complete.');
