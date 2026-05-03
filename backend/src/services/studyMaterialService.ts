/**
 * Cheat Sheet & Study Notes Service
 * Generates AI-powered study materials for knowledge nodes
 */

import fs from 'fs/promises';
import path from 'path';
import { CheatSheet, StudyNotes } from '../../../shared/types';
import { getKnowledgeGraph } from './knowledgeGraphStorage';
import OpenAI from 'openai';

async function ensureDir(dir: string): Promise<void> {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (error) {
    console.error(`[Study] Error creating directory ${dir}:`, error);
  }
}

/**
 * Simple AI call function
 */
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

// ===========================================
// CHEAT SHEETS
// ===========================================

/**
 * Get all cheat sheets
 */
export async function getAllCheatSheets(userId?: string): Promise<CheatSheet[]> {
  const CHEAT_SHEETS_DIR = path.join(process.cwd(), 'data', `cheat-sheets-${userId ?? ''}`);
  await ensureDir(CHEAT_SHEETS_DIR);

  try {
    const files = await fs.readdir(CHEAT_SHEETS_DIR);
    const sheets: CheatSheet[] = [];

    for (const file of files) {
      if (file.endsWith('.json')) {
        try {
          const content = await fs.readFile(path.join(CHEAT_SHEETS_DIR, file), 'utf-8');
          sheets.push(JSON.parse(content));
        } catch (err) {
          console.error(`[CheatSheet] Error reading ${file}:`, err);
        }
      }
    }
    return sheets;
  } catch (error) {
    console.error('[CheatSheet] Error getting all sheets:', error);
    return [];
  }
}

/**
 * Get cheat sheet for a node
 */
export async function getCheatSheetByNode(nodeId: string, userId?: string): Promise<CheatSheet | null> {
  const CHEAT_SHEETS_DIR = path.join(process.cwd(), 'data', `cheat-sheets-${userId ?? ''}`);
  await ensureDir(CHEAT_SHEETS_DIR);
  const filePath = path.join(CHEAT_SHEETS_DIR, `${nodeId}.json`);

  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/**
 * Generate cheat sheet for a node using AI
 */
export async function generateCheatSheet(nodeId: string, userId?: string): Promise<CheatSheet> {
  const graph = await getKnowledgeGraph();
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

  const CHEAT_SHEETS_DIR = path.join(process.cwd(), 'data', `cheat-sheets-${userId ?? ''}`);
  await ensureDir(CHEAT_SHEETS_DIR);
  await fs.writeFile(
    path.join(CHEAT_SHEETS_DIR, `${nodeId}.json`),
    JSON.stringify(cheatSheet, null, 2),
    'utf-8'
  );

  return cheatSheet;
}

/**
 * Get or generate cheat sheet
 */
export async function getOrGenerateCheatSheet(nodeId: string, userId?: string): Promise<CheatSheet> {
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
  const STUDY_NOTES_DIR = path.join(process.cwd(), 'data', `study-notes-${userId ?? ''}`);
  await ensureDir(STUDY_NOTES_DIR);

  try {
    const files = await fs.readdir(STUDY_NOTES_DIR);
    const notes: StudyNotes[] = [];

    for (const file of files) {
      if (file.endsWith('.json')) {
        try {
          const content = await fs.readFile(path.join(STUDY_NOTES_DIR, file), 'utf-8');
          notes.push(JSON.parse(content));
        } catch (err) {
          console.error(`[StudyNotes] Error reading ${file}:`, err);
        }
      }
    }
    return notes;
  } catch (error) {
    console.error('[StudyNotes] Error getting all notes:', error);
    return [];
  }
}

/**
 * Get study notes for a node
 */
export async function getStudyNotesByNode(nodeId: string, userId?: string): Promise<StudyNotes | null> {
  const STUDY_NOTES_DIR = path.join(process.cwd(), 'data', `study-notes-${userId ?? ''}`);
  await ensureDir(STUDY_NOTES_DIR);
  const filePath = path.join(STUDY_NOTES_DIR, `${nodeId}.json`);

  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/**
 * Generate study notes for a node using AI
 */
export async function generateStudyNotes(nodeId: string, userId?: string): Promise<StudyNotes> {
  const graph = await getKnowledgeGraph();
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

  const STUDY_NOTES_DIR = path.join(process.cwd(), 'data', `study-notes-${userId ?? ''}`);
  await ensureDir(STUDY_NOTES_DIR);
  await fs.writeFile(
    path.join(STUDY_NOTES_DIR, `${nodeId}.json`),
    JSON.stringify(studyNotes, null, 2),
    'utf-8'
  );

  return studyNotes;
}

/**
 * Get or generate study notes
 */
export async function getOrGenerateStudyNotes(nodeId: string, userId?: string): Promise<StudyNotes> {
  const existing = await getStudyNotesByNode(nodeId, userId);
  if (existing) {
    return existing;
  }
  return generateStudyNotes(nodeId, userId);
}
