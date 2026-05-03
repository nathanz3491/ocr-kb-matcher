/**
 * Flashcard Service
 * Generates and manages AI-powered flashcards for knowledge nodes
 */

import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Flashcard, FlashcardSet, FlashcardProgress } from '../../../shared/types';
import { getKnowledgeGraph } from './knowledgeGraphStorage';
import OpenAI from 'openai';

// Get per-user flashcards directory
function getFlashcardsDir(userId?: string): string {
  return path.join(process.cwd(), 'data', `flashcards${userId ? `-${userId}` : ''}`);
}

// Ensure flashcards directory exists
async function ensureFlashcardsDir(userId?: string): Promise<string> {
  const dir = getFlashcardsDir(userId);
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (error) {
    console.error('[Flashcard] Error creating directory:', error);
  }
  return dir;
}

/**
 * Simple AI call function for flashcard generation
 */
async function generateWithAI(prompt: string): Promise<string> {
  const apiKey = process.env.MINIMAX_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('AI API key not configured');
  }

  const baseURL = process.env.MOONSHOT_BASE_URL;
  const client = new OpenAI({
    apiKey,
    baseURL,
    timeout: 30000,
  });

  const completion = await client.chat.completions.create({
    model: process.env.MOONSHOT_MODEL || 'moonshot-v1-8k',
    max_tokens: 4096,
    messages: [
      { role: 'system', content: 'You are an educational flashcard generator. Create clear, concise flashcards that test understanding. Always respond with valid JSON only.' },
      { role: 'user', content: prompt }
    ],
    temperature: 0.7,
    response_format: { type: 'json_object' },
  });
  const responseText = completion.choices[0]?.message?.content || '';
  return responseText;
}

export async function getAllFlashcards(userId?: string): Promise<FlashcardSet[]> {
  const flashcardsDir = await ensureFlashcardsDir(userId);

  try {
    const files = await fs.readdir(flashcardsDir);
    const sets: FlashcardSet[] = [];

    for (const file of files) {
      if (file.endsWith('.json')) {
        try {
          const content = await fs.readFile(path.join(flashcardsDir, file), 'utf-8');
          const flashcardSet = JSON.parse(content) as FlashcardSet;
          sets.push(flashcardSet);
        } catch (err) {
          console.error(`[Flashcard] Error reading ${file}:`, err);
        }
      }
    }

    return sets;
  } catch (error) {
    console.error('[Flashcard] Error getting all flashcards:', error);
    return [];
  }
}

export async function getFlashcardsByNode(nodeId: string, userId?: string): Promise<FlashcardSet | null> {
  const flashcardsDir = await ensureFlashcardsDir(userId);
  const filePath = path.join(flashcardsDir, `${nodeId}.json`);

  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content) as FlashcardSet;
  } catch {
    return null;
  }
}

export async function generateFlashcards(nodeId: string, userId?: string): Promise<FlashcardSet> {
  const graph = await getKnowledgeGraph(userId);
  const node = graph.nodes.find(n => n.id === nodeId);

  if (!node) {
    throw new Error(`Node ${nodeId} not found`);
  }

  const nodeTitle = node.name || nodeId;
  const nodeCategory = node.domain || 'General';
  const nodeDescription = `${nodeTitle} - A ${nodeCategory} topic in the knowledge graph`;

  const prompt = `Generate 10 educational flashcards for the following knowledge point:

Topic: ${nodeTitle}
Category: ${nodeCategory}
Description: ${nodeDescription}

Create flashcards that test understanding of this topic. Each card should have:
- front: A question or term (keep it concise, max 100 characters)
- back: The answer or definition (clear and accurate, max 200 characters)
- hint: A optional hint to help recall (max 50 characters)

Respond ONLY with a JSON array in this exact format:
[
  { "front": "...", "back": "...", "hint": "..." },
  ...
]

Do NOT include any other text in your response.`;

  let aiResponse = '';
  try {
    aiResponse = await generateWithAI(prompt);
  } catch (error) {
    console.error('[Flashcard] AI generation failed:', error);
    throw new Error('Failed to generate flashcards with AI');
  }

  let cards: Partial<Flashcard>[];
  try {
    const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      cards = JSON.parse(jsonMatch[0]);
    } else {
      cards = JSON.parse(aiResponse);
    }
  } catch (parseError) {
    console.error('[Flashcard] Failed to parse AI response:', aiResponse);
    throw new Error('Failed to parse flashcard generation response');
  }

  const validCards: Flashcard[] = cards
    .filter(card => card.front && card.back)
    .slice(0, 10)
    .map(card => ({
      id: uuidv4(),
      nodeId,
      front: card.front!.substring(0, 100),
      back: card.back!.substring(0, 200),
      hint: card.hint?.substring(0, 50),
    }));

  if (validCards.length === 0) {
    throw new Error('No valid flashcards could be generated');
  }

  const now = new Date().toISOString();
  const flashcardSet: FlashcardSet = {
    nodeId,
    nodeTitle,
    category: nodeCategory,
    cards: validCards,
    createdAt: now,
    updatedAt: now,
  };

  const flashcardsDir = await ensureFlashcardsDir(userId);
  const filePath = path.join(flashcardsDir, `${nodeId}.json`);
  await fs.writeFile(filePath, JSON.stringify(flashcardSet, null, 2), 'utf-8');

  console.log(`[Flashcard] Generated ${validCards.length} flashcards for node ${nodeId}`);

  return flashcardSet;
}

export async function getOrGenerateFlashcards(nodeId: string, userId?: string): Promise<FlashcardSet> {
  const existing = await getFlashcardsByNode(nodeId, userId);

  if (existing) {
    console.log(`[Flashcard] Using existing flashcards for node ${nodeId}`);
    return existing;
  }

  console.log(`[Flashcard] Generating new flashcards for node ${nodeId}`);
  return generateFlashcards(nodeId, userId);
}

export async function getFlashcardProgress(userId?: string): Promise<FlashcardProgress[]> {
  const sets = await getAllFlashcards(userId);

  return sets.map(set => ({
    nodeId: set.nodeId,
    totalCards: set.cards.length,
    masteredCards: 0,
    learningCards: 0,
    newCards: set.cards.length,
    lastReviewed: set.updatedAt,
    reviewStreak: 0,
  }));
}

export async function deleteFlashcards(nodeId: string, userId?: string): Promise<boolean> {
  const flashcardsDir = getFlashcardsDir(userId);
  const filePath = path.join(flashcardsDir, `${nodeId}.json`);

  try {
    await fs.unlink(filePath);
    return true;
  } catch {
    return false;
  }
}
