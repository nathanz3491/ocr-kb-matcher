/**
 * Cheat Sheet & Study Notes Service
 * Generates AI-powered study materials for knowledge nodes
 */

import { getDb } from '../db/sqlite';
import fs from 'fs';
import path from 'path';
import { CheatSheet, StudyNotes } from '../../../shared/types';
import { getKnowledgeGraph } from './knowledgeGraphStorage';
import OpenAI from 'openai';

// ── AI Generation ─────────────────────────────────────────────────────────

async function generateWithAI(prompt: string): Promise<string> {
  const apiKey = process.env.MINIMAX_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('AI API key not configured');
  }

  const client = new OpenAI({
    apiKey,
    baseURL: process.env.MOONSHOT_BASE_URL,
    timeout: 30000,
  });

  const completion = await client.chat.completions.create({
    model: process.env.MOONSHOT_MODEL || 'moonshot-v1-8k',
    max_tokens: 4096,
    temperature: 0.7,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: 'You are an educational content generator. Always respond with valid JSON.' },
      { role: 'user', content: prompt }
    ],
  });
  const responseText = completion.choices[0]?.message?.content || '';
  return responseText;
}

// ── One-time JSON → SQLite migration ──────────────────────────────────────

const DATA_DIR = path.join(process.cwd(), 'data');

let migrated = false;

function migrateStudyMaterials(): void {
  if (migrated) return;
  migrated = true;

  const db = getDb();

  const insertStmt = db.prepare(
    'INSERT OR IGNORE INTO study_materials (id, user_id, node_id, job_id, type, content, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(DATA_DIR, { withFileTypes: true });
  } catch {
    return; // data dir doesn't exist yet — nothing to migrate
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const dirName = entry.name;

    let type: string;
    let userId: string;

    if (dirName.startsWith('cheat-sheets-')) {
      type = 'cheat_sheet';
      userId = dirName.replace('cheat-sheets-', '');
    } else if (dirName.startsWith('study-notes-')) {
      type = 'study_notes';
      userId = dirName.replace('study-notes-', '');
    } else {
      continue;
    }

    if (dirName.endsWith('.migrated')) continue;

    const dirPath = path.join(DATA_DIR, dirName);
    let files: string[];
    try {
      files = fs.readdirSync(dirPath);
    } catch {
      continue;
    }

    let migratedCount = 0;
    const run = db.transaction(() => {
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        const nodeId = file.replace('.json', '');
        try {
          const content = fs.readFileSync(path.join(dirPath, file), 'utf-8');
          const obj = JSON.parse(content);
          const id = `${type}_${userId}_${nodeId}`;
          insertStmt.run(
            id,
            userId,
            nodeId,
            null,
            type,
            JSON.stringify(obj),
            obj.createdAt || new Date().toISOString()
          );
          migratedCount++;
        } catch (err) {
          console.warn(`[studyMaterial] Skipping ${file} in ${dirName}:`, (err as Error).message);
        }
      }
    });
    run();

    // Rename directory to .migrated
    const newPath = dirPath + '.migrated';
    try {
      fs.renameSync(dirPath, newPath);
      console.log(`[studyMaterial] Migrated ${dirName} (${migratedCount} items) → ${dirName}.migrated`);
    } catch (renameErr) {
      console.warn(`[studyMaterial] Could not rename ${dirName}:`, (renameErr as Error).message);
    }
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────

function dbAllCheatSheets(userId: string): CheatSheet[] {
  const db = getDb();
  const rows = db.prepare(
    'SELECT content FROM study_materials WHERE user_id = ? AND type = ?'
  ).all(userId, 'cheat_sheet') as { content: string }[];
  return rows.map(r => JSON.parse(r.content) as CheatSheet);
}

function dbGetCheatSheet(nodeId: string, userId: string): CheatSheet | null {
  const db = getDb();
  const row = db.prepare(
    'SELECT content FROM study_materials WHERE user_id = ? AND node_id = ? AND type = ?'
  ).get(userId, nodeId, 'cheat_sheet') as { content: string } | undefined;
  return row ? (JSON.parse(row.content) as CheatSheet) : null;
}

function dbSaveCheatSheet(nodeId: string, userId: string, sheet: CheatSheet): void {
  const db = getDb();
  const id = `cheat_sheet_${userId}_${nodeId}`;
  db.prepare(
    'INSERT OR REPLACE INTO study_materials (id, user_id, node_id, job_id, type, content, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(id, userId, nodeId, null, 'cheat_sheet', JSON.stringify(sheet), sheet.createdAt || new Date().toISOString());
}

function dbAllStudyNotes(userId: string): StudyNotes[] {
  const db = getDb();
  const rows = db.prepare(
    'SELECT content FROM study_materials WHERE user_id = ? AND type = ?'
  ).all(userId, 'study_notes') as { content: string }[];
  return rows.map(r => JSON.parse(r.content) as StudyNotes);
}

function dbGetStudyNotes(nodeId: string, userId: string): StudyNotes | null {
  const db = getDb();
  const row = db.prepare(
    'SELECT content FROM study_materials WHERE user_id = ? AND node_id = ? AND type = ?'
  ).get(userId, nodeId, 'study_notes') as { content: string } | undefined;
  return row ? (JSON.parse(row.content) as StudyNotes) : null;
}

function dbSaveStudyNotes(nodeId: string, userId: string, notes: StudyNotes): void {
  const db = getDb();
  const id = `study_notes_${userId}_${nodeId}`;
  db.prepare(
    'INSERT OR REPLACE INTO study_materials (id, user_id, node_id, job_id, type, content, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(id, userId, nodeId, null, 'study_notes', JSON.stringify(notes), notes.createdAt || new Date().toISOString());
}

// ===========================================
// CHEAT SHEETS
// ===========================================

/**
 * Get all cheat sheets
 */
export async function getAllCheatSheets(userId?: string): Promise<CheatSheet[]> {
  migrateStudyMaterials();
  return dbAllCheatSheets(userId ?? '');
}

/**
 * Get cheat sheet for a node
 */
export async function getCheatSheetByNode(nodeId: string, userId?: string): Promise<CheatSheet | null> {
  migrateStudyMaterials();
  return dbGetCheatSheet(nodeId, userId ?? '');
}

/**
 * Generate cheat sheet for a node using AI
 */
export async function generateCheatSheet(nodeId: string, userId?: string): Promise<CheatSheet> {
  migrateStudyMaterials();
  const uid = userId ?? '';

  const graph = await getKnowledgeGraph(userId);
  const node = graph.nodes.find(n => n.id === nodeId);

  if (!node) {
    throw new Error(`Node ${nodeId} not found`);
  }

  const nodeTitle = node.name || nodeId;
  const nodeCategory = node.domain || 'General';

  const prompt = `Generate a concise cheat sheet for the following knowledge point:

Topic: ${nodeTitle}
Category: ${nodeCategory}

Create a JSON object with:
{
  "keyPoints": ["3-5 bullet points covering the essential concepts"],
  "formulas": ["any important formulas or equations"],
  "examples": ["1-2 brief examples"]
}

Keep content concise and educational. Focus on what students need to remember.`;

  let aiResponse = '';
  try {
    aiResponse = await generateWithAI(prompt);
  } catch (error) {
    console.error('[CheatSheet] AI generation failed:', error);
    throw new Error('Failed to generate cheat sheet');
  }

  let data: any;
  try {
    const jsonMatch = aiResponse.match(/\{\s*[\s\S]*\}/);
    if (jsonMatch) {
      data = JSON.parse(jsonMatch[0]);
    } else {
      data = JSON.parse(aiResponse);
    }
  } catch (parseError) {
    console.error('[CheatSheet] Failed to parse AI response:', aiResponse);
    throw new Error('Failed to parse cheat sheet response');
  }

  const now = new Date().toISOString();
  const cheatSheet: CheatSheet = {
    nodeId,
    nodeTitle,
    category: nodeCategory,
    content: `Key concepts for ${nodeTitle}`,
    keyPoints: data.keyPoints || [],
    formulas: data.formulas || [],
    examples: data.examples || [],
    createdAt: now,
    updatedAt: now,
  };

  dbSaveCheatSheet(nodeId, uid, cheatSheet);

  return cheatSheet;
}

/**
 * Get or generate cheat sheet
 */
export async function getOrGenerateCheatSheet(nodeId: string, userId?: string): Promise<CheatSheet> {
  migrateStudyMaterials();
  const existing = await getCheatSheetByNode(nodeId, userId);
  if (existing) {
    return existing;
  }
  return generateCheatSheet(nodeId, userId);
}

// ===========================================
// STUDY NOTES
// ===========================================

/**
 * Get all study notes
 */
export async function getAllStudyNotes(userId?: string): Promise<StudyNotes[]> {
  migrateStudyMaterials();
  return dbAllStudyNotes(userId ?? '');
}

/**
 * Get study notes for a node
 */
export async function getStudyNotesByNode(nodeId: string, userId?: string): Promise<StudyNotes | null> {
  migrateStudyMaterials();
  return dbGetStudyNotes(nodeId, userId ?? '');
}

/**
 * Generate study notes for a node using AI
 */
export async function generateStudyNotes(nodeId: string, userId?: string): Promise<StudyNotes> {
  migrateStudyMaterials();
  const uid = userId ?? '';

  const graph = await getKnowledgeGraph(userId);
  const node = graph.nodes.find(n => n.id === nodeId);

  if (!node) {
    throw new Error(`Node ${nodeId} not found`);
  }

  const nodeTitle = node.name || nodeId;
  const nodeCategory = node.domain || 'General';

  const prompt = `Generate detailed study notes for the following knowledge point:

Topic: ${nodeTitle}
Category: ${nodeCategory}

Create a JSON object with:
{
  "summary": "A 2-3 sentence overview of this topic",
  "notes": "Detailed study notes - explain concepts thoroughly, include definitions, theorems, and explanations",
  "relatedNodes": ["list of related node IDs from the knowledge graph if applicable"]
}

Write in clear, educational language suitable for students.`;

  let aiResponse = '';
  try {
    aiResponse = await generateWithAI(prompt);
  } catch (error) {
    console.error('[StudyNotes] AI generation failed:', error);
    throw new Error('Failed to generate study notes');
  }

  let data: any;
  try {
    const jsonMatch = aiResponse.match(/\{\s*[\s\S]*\}/);
    if (jsonMatch) {
      data = JSON.parse(jsonMatch[0]);
    } else {
      data = JSON.parse(aiResponse);
    }
  } catch (parseError) {
    console.error('[StudyNotes] Failed to parse AI response:', aiResponse);
    throw new Error('Failed to parse study notes response');
  }

  const now = new Date().toISOString();
  const studyNotes: StudyNotes = {
    nodeId,
    nodeTitle,
    category: nodeCategory,
    notes: data.notes || '',
    summary: data.summary || '',
    relatedNodes: data.relatedNodes || [],
    createdAt: now,
    updatedAt: now,
  };

  dbSaveStudyNotes(nodeId, uid, studyNotes);

  return studyNotes;
}

/**
 * Get or generate study notes
 */
export async function getOrGenerateStudyNotes(nodeId: string, userId?: string): Promise<StudyNotes> {
  migrateStudyMaterials();
  const existing = await getStudyNotesByNode(nodeId, userId);
  if (existing) {
    return existing;
  }
  return generateStudyNotes(nodeId, userId);
}
