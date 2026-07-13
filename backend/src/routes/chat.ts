/**
 * AI Chat Route
 * Provides chat functionality with knowledge graph context
 */

import { Router, Request, Response } from 'express';
import { authenticate, requireAuth } from '../middleware/auth';
import { getKnowledgeGraphStorage } from '../services/knowledgeGraphStorage';
import OpenAI from 'openai';
import fs from 'fs/promises';
import path from 'path';
import { aiLimiter } from '../middleware/rateLimit';
import { enforceQuota } from '../middleware/quota';

const router = Router();
router.use(authenticate);

const DATA_DIR = path.join(process.cwd(), 'data');

function getChatHistoriesFile(userId: string): string {
  return path.join(DATA_DIR, `chat-histories-${userId}.json`);
}

function getAIClient() {
  const apiKey = process.env.MOONSHOT_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('AI API key not configured');
  }

  return new OpenAI({
    apiKey,
    baseURL: process.env.MOONSHOT_BASE_URL || 'https://api.moonshot.cn/v1',
    timeout: 60000,
  });
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

let chatHistories: Map<string, ChatMessage[]> = new Map();
let historiesLoaded = false;

async function loadHistories(userId: string): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const content = await fs.readFile(getChatHistoriesFile(userId), 'utf-8');
    const parsed = JSON.parse(content) as Record<string, ChatMessage[]>;
    chatHistories = new Map(Object.entries(parsed));
    historiesLoaded = true;
  } catch {
    chatHistories = new Map();
    historiesLoaded = true;
  }
}

async function saveHistories(userId: string): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const obj = Object.fromEntries(chatHistories.entries());
    const chatFile = getChatHistoriesFile(userId);
    const tempPath = `${chatFile}.tmp`;
    await fs.writeFile(tempPath, JSON.stringify(obj, null, 2), 'utf-8');
    await fs.rename(tempPath, chatFile);
  } catch (error) {
    console.error('[Chat] Failed to save histories:', error);
  }
}

function getHistoryKey(userId: string, sessionId: string): string {
  return `${userId}:${sessionId}`;
}

async function buildKnowledgeGraphContext(userId?: string): Promise<string> {
  try {
    const storage = getKnowledgeGraphStorage(userId);
    await storage.initialize();
    const graph = await storage.getGlobalGraph();

    const nodes = graph.nodes.map(n => {
      return `[${n.id}] ${n.data.label}${n.data.category ? ` (${n.data.category})` : ''}: ${n.data.description || '(no description)'}`;
    }).join('\n');

    const edges = graph.edges.map(e => {
      return `${e.source} → ${e.target}${e.data?.relationship ? ` [${e.data.relationship}]` : ''}`;
    }).join('\n');

    return `KNOWLEDGE GRAPH:\nNodes (${graph.nodes.length}):\n${nodes}\n\nEdges (${graph.edges.length}):\n${edges}`;
  } catch (error) {
    console.warn('[Chat] Failed to load knowledge graph:', error);
    return 'KNOWLEDGE GRAPH: (not available)';
  }
}

/**
 * POST /api/chat
 * Send a message to the AI with knowledge graph context
 */
router.post('/', aiLimiter, requireAuth, enforceQuota('chatMessages'), async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    await loadHistories(userId);

    const { message, sessionId = 'default' } = req.body;

    if (!message) {
      res.status(400).json({ success: false, error: 'Message is required' });
      return;
    }

    const kgContext = await buildKnowledgeGraphContext(userId);

    const systemPrompt = `You are Kimi, an AI learning assistant by Moonshot AI. You help users learn by answering questions, explaining concepts, and connecting ideas using the knowledge graph below.

${kgContext}

RESPONSE FORMAT GUIDELINES:
- Use **bold text** for key terms and important concepts
- Use numbered lists (1., 2., 3.) for steps, facts, or multiple items
- Use bullet points (•) for shorter lists
- Use ## Headings for major sections
- Keep explanations clear, concise, and easy to understand
- Break complex topics into digestible parts
- Be encouraging and supportive in tone
- If something isn't in the knowledge graph, say so honestly
- Reference specific nodes from the knowledge graph using [NodeId] notation when applicable`;

    const historyKey = getHistoryKey(userId, sessionId);
    const history = chatHistories.get(historyKey) || [];

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...history.map((m: ChatMessage) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content
      })),
      { role: 'user', content: message }
    ];

    const client = getAIClient();
    const response = await client.chat.completions.create({
      model: 'kimi-k2.5',
      messages,
      max_tokens: 4096,
      temperature: 0.7,
      prompt_cache_key: sessionId,
    } as any);

    const assistantMessage = response.choices[0]?.message?.content || 'Sorry, I could not generate a response.';

    history.push({ role: 'user', content: message });
    history.push({ role: 'assistant', content: assistantMessage });

    if (history.length > 40) {
      chatHistories.set(historyKey, history.slice(-40));
    } else {
      chatHistories.set(historyKey, history);
    }

    await saveHistories(userId);

    const usage = response.usage;
    const cachedTokens = (usage as any)?.cached_tokens;

    res.json({
      success: true,
      data: {
        message: assistantMessage,
        sessionId,
        cachedTokens: cachedTokens ?? null,
        usage: {
          promptTokens: usage?.prompt_tokens,
          completionTokens: usage?.completion_tokens,
          totalTokens: usage?.total_tokens,
        },
      },
    });
  } catch (error) {
    console.error('Error in AI chat:', error);
    res.status(500).json({ success: false, error: 'Failed to get AI response' });
  }
});

router.post('/stream', aiLimiter, requireAuth, enforceQuota('chatMessages'), async (req: Request, res: Response) => {
  const userId = req.user!.userId;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  const { message, sessionId = 'default' } = req.body;

  if (!message) {
    res.write('event: error\ndata: {"error":"Message is required"}\n\n');
    res.end();
    return;
  }

  req.on('close', () => {});

  try {
    await loadHistories(userId);

    const kgContext = await buildKnowledgeGraphContext(userId);

    const systemPrompt = `You are Kimi, an AI learning assistant by Moonshot AI. You help users learn by answering questions, explaining concepts, and connecting ideas using the knowledge graph below.

${kgContext}

RESPONSE FORMAT GUIDELINES:
- Use **bold text** for key terms and important concepts
- Use numbered lists (1., 2., 3.) for steps, facts, or multiple items
- Use bullet points (•) for shorter lists
- Use ## Headings for major sections
- Keep explanations clear, concise, and easy to understand
- Break complex topics into digestible parts
- Be encouraging and supportive in tone
- If something isn't in the knowledge graph, say so honestly
- Reference specific nodes from the knowledge graph using [NodeId] notation when applicable`;

    const historyKey = getHistoryKey(userId, sessionId);
    const history = chatHistories.get(historyKey) || [];

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...history.map((m: ChatMessage) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content
      })),
      { role: 'user', content: message }
    ];

    const client = getAIClient();
    const stream = await (client.chat.completions.create({
      model: 'kimi-k2.5',
      messages,
      max_tokens: 4096,
      prompt_cache_key: sessionId,
      stream: true,
    } as any) as unknown as AsyncIterable<OpenAI.Chat.ChatCompletionChunk>);

    let fullResponse = '';

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        fullResponse += content;
        res.write(`data: ${JSON.stringify({ content, done: false })}\n\n`);
        (res as any).socket?.uncork();
      }
    }

    history.push({ role: 'user', content: message });
    history.push({ role: 'assistant', content: fullResponse });

    if (history.length > 40) {
      chatHistories.set(historyKey, history.slice(-40));
    } else {
      chatHistories.set(historyKey, history);
    }

    await saveHistories(userId);

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (error: any) {
    console.error('Error in AI chat stream:', error);
    res.write(`data: ${JSON.stringify({ error: error.message || 'Failed' })}\n\n`);
    res.end();
  }
});

/**
 * GET /api/chat/history/:sessionId
 * Get chat history for a session
 */
router.get('/history/:sessionId', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    await loadHistories(userId);

    const { sessionId } = req.params;
    const historyKey = getHistoryKey(userId, sessionId);
    const history = chatHistories.get(historyKey) || [];

    res.json({
      success: true,
      data: {
        sessionId,
        messages: history,
      },
    });
  } catch (error) {
    console.error('Error getting chat history:', error);
    res.status(500).json({ success: false, error: 'Failed to get chat history' });
  }
});

/**
 * DELETE /api/chat/history/:sessionId
 * Clear chat history for a session
 */
router.delete('/history/:sessionId', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    await loadHistories(userId);

    const { sessionId } = req.params;
    const historyKey = getHistoryKey(userId, sessionId);
    chatHistories.delete(historyKey);

    await saveHistories(userId);

    res.json({
      success: true,
      data: { message: 'Chat history cleared' },
    });
  } catch (error) {
    console.error('Error clearing chat history:', error);
    res.status(500).json({ success: false, error: 'Failed to clear chat history' });
  }
});

/**
 * GET /api/chat/knowledge-context
 * Get the current knowledge graph context (for display)
 */
router.get('/knowledge-context', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    await loadHistories(userId);

    const kgContext = await buildKnowledgeGraphContext(userId);

    // Structured counts for the UI header (frontend reads totalNodes/totalEdges/categories).
    const storage = getKnowledgeGraphStorage(userId);
    await storage.initialize();
    const graph = await storage.getGlobalGraph();
    const categories = Array.from(
      new Set(graph.nodes.map(n => n.data.category).filter((c): c is string => !!c)),
    );

    res.json({
      success: true,
      data: {
        context: kgContext,
        totalNodes: graph.nodes.length,
        totalEdges: graph.edges.length,
        categories,
      },
    });
  } catch (error) {
    console.error('Error getting knowledge context:', error);
    res.status(500).json({ success: false, error: 'Failed to get knowledge context' });
  }
});

export default router;
