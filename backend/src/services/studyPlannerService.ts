import OpenAI from 'openai';
import { userProgressService } from './userProgressService';
import { getKnowledgeGraph } from './knowledgeGraphStorage';
import { getDueReviews as getDueFlashcardReviews } from './reviewService';
import { getDueReviews as getDueWrongQuestionReviews } from './wrongQuestionReviewService';

export interface StudyTask {
  nodeId: string;
  nodeName: string;
  currentMastery: number;
  method: 'flashcard' | 'wrong-question' | 'notes' | 'quiz';
  reason: string;
  priority: number;
}

export interface DailyPlan {
  day: string;
  date: string;
  tasks: StudyTask[];
  focusTopic?: string;
}

export interface WeeklyStudyPlan {
  weekStartDate: string;
  weekEndDate: string;
  days: DailyPlan[];
  summary: string;
  weakNodes: Array<{ nodeId: string; name: string; mastery: number }>;
  streak: number;
  totalDueReviews: number;
}

async function callStudyPlanAI(prompt: string): Promise<string> {
  const apiKey = process.env.MOONSHOT_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('AI API key not configured');

  const client = new OpenAI({
    apiKey,
    baseURL: process.env.MOONSHOT_BASE_URL,
    timeout: 120000,
  });

  const completion = await client.chat.completions.create({
    model: process.env.MOONSHOT_MODEL || 'moonshot-v1-8k',
    max_tokens: 3072,
    messages: [
      { role: 'system', content: '你是学习规划专家。始终只返回有效的JSON，不要markdown格式或其他文本。' },
      { role: 'user', content: prompt }
    ],
    temperature: 0.7,
  });
  return completion.choices[0]?.message?.content || '';
}

async function callStudyPlanAIStream(prompt: string): Promise<string> {
  const apiKey = process.env.MOONSHOT_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('AI API key not configured');

  const client = new OpenAI({
    apiKey,
    baseURL: process.env.MOONSHOT_BASE_URL,
    timeout: 120000,
  });

  const stream = await client.chat.completions.create({
    model: process.env.MOONSHOT_MODEL || 'moonshot-v1-8k',
    max_tokens: 3072,
    messages: [
      { role: 'system', content: '你是学习规划专家。始终只返回有效的JSON，不要markdown格式或其他文本。' },
      { role: 'user', content: prompt }
    ],
    temperature: 0.7,
    stream: true,
  });

  let fullContent = '';
  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content || '';
    fullContent += content;
  }
  return fullContent;
}

function stripMarkdownFences(text: string): string {
  const fenceMatch = text.match(/```json\s*([\s\S]*?)```/);
  if (fenceMatch) return fenceMatch[1].trim();
  const braceMatch = text.match(/\{[\s\S]*\}/);
  return braceMatch ? braceMatch[0].trim() : text.trim();
}

function computeStreak(learnedNodes: Array<{ nodeId: string; learnedAt: string }>): number {
  if (learnedNodes.length === 0) return 0;

  const dates = learnedNodes
    .map(n => new Date(n.learnedAt).toISOString().split('T')[0])
    .filter((v, i, arr) => arr.indexOf(v) === i)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  if (dates.length === 0) return 0;

  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  if (dates[0] !== today && dates[0] !== yesterday) return 0;

  let streak = 1;
  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i - 1]);
    const curr = new Date(dates[i]);
    const diffDays = Math.round((prev.getTime() - curr.getTime()) / 86400000);
    if (diffDays === 1) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

function getWeekBounds(): { start: string; end: string } {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return {
    start: monday.toISOString().split('T')[0],
    end: sunday.toISOString().split('T')[0],
  };
}

export async function generateWeeklyStudyPlan(userId?: string): Promise<WeeklyStudyPlan> {
  const [masteryMap, learnedNodes, graph, dueFlashcards, dueWrongQuestions] = await Promise.all([
    userProgressService.getAllNodeMasteries(userId ?? ''),
    userProgressService.getLearnedNodesWithTimestamps(userId ?? ''),
    getKnowledgeGraph(),
    getDueFlashcardReviews(userId ?? ''),
    getDueWrongQuestionReviews(),
  ]);

  const nodeNameMap = new Map<string, string>();
  for (const node of graph.nodes) {
    nodeNameMap.set(node.id, node.name);
  }

  const totalDueReviews = dueFlashcards.length + dueWrongQuestions.length;

  const weakNodes: Array<{ nodeId: string; name: string; mastery: number }> = [];
  for (const [nodeId, mastery] of Object.entries(masteryMap)) {
    if (mastery < 50) {
      weakNodes.push({
        nodeId,
        name: nodeNameMap.get(nodeId) || nodeId,
        mastery,
      });
    }
  }
  weakNodes.sort((a, b) => a.mastery - b.mastery);

  const streak = computeStreak(learnedNodes);

  const allNodesList = graph.nodes
    .map(n => `${n.id}: ${n.name} (领域: ${n.domain}, 熟练度: ${masteryMap[n.id] ?? 0})`)
    .join('\n');

  const weakNodeList = weakNodes
    .map(n => `${n.name} (熟练度: ${n.mastery}%)`)
    .join(', ');

  const weekBounds = getWeekBounds();
  const prompt = `你是学习规划专家。根据以下用户数据生成本周学习计划：

用户学习数据：
- 当前 streak: ${streak} 天
- 待复习项目: ${totalDueReviews} 个
- 薄弱知识点 (${weakNodes.length}个): ${weakNodeList || '无'}

知识图谱节点:
${allNodesList || '暂无节点'}

请生成7天学习计划，返回JSON格式：
{
  "summary": "计划概述",
  "weakNodes": [{"nodeId": "C01", "name": "...", "mastery": 25}],
  "streak": ${streak},
  "totalDueReviews": ${totalDueReviews},
  "days": [
    {
      "day": "周一",
      "date": "${weekBounds.start}",
      "tasks": [
        {
          "nodeId": "C01",
          "nodeName": "...",
          "currentMastery": 25,
          "method": "flashcard|wrong-question|notes|quiz",
          "reason": "...",
          "priority": 1
        }
      ]
    }
  ]
}

要求：
- 每天安排2-4个任务
- 优先安排薄弱知识点
- 结合flashcard、错题复习、笔记复习、quiz等多种方式
- 每天的任务要覆盖不同类型的知识点
- 只返回JSON，不要其他文字`;

  let response = '';
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      if (attempt === 0) {
        response = await callStudyPlanAIStream(prompt);
      } else {
        response = stripMarkdownFences(response);
      }
      JSON.parse(response);
      break;
    } catch {
      if (attempt === 2) {
        throw new Error('Failed to generate study plan after 3 attempts');
      }
      response = await callStudyPlanAIStream(prompt + '\n\n只返回有效JSON，不要markdown fences，不要其他文字。');
    }
  }

  response = stripMarkdownFences(response);
  const parsed = JSON.parse(response) as WeeklyStudyPlan;

  parsed.weekStartDate = weekBounds.start;
  parsed.weekEndDate = weekBounds.end;
  parsed.streak = streak;
  parsed.totalDueReviews = totalDueReviews;
  parsed.weakNodes = weakNodes;

  if (!parsed.days || !Array.isArray(parsed.days)) {
    parsed.days = [];
  }

  return parsed;
}
