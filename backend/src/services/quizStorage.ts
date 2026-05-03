import * as fs from 'fs/promises';
import * as path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');

export interface QuizSession {
  id: string;
  jobId: string;
  questions: QuizQuestion[];
  createdAt: string;
  targetedNodes?: string[];
}

export interface QuizQuestion {
  id: string;
  type: 'multiple_choice' | 'fill_in_blank' | 'true_false' | 'matching';
  question: string;
  options?: string[];
  correctAnswer?: number;
  explanation: string;
  items?: string[];
  matches?: string[];
  correctMatches?: string[];
}

export interface QuizResult {
  sessionId: string;
  jobId: string;
  score: number;
  totalQuestions: number;
  answers: Array<{
    questionId: string;
    selectedAnswer: number;
    correct: boolean;
  }>;
  completedAt: string;
}

type QuizSessionsData = Record<string, QuizSession>;
type QuizResultsData = QuizResult[];

async function ensureDataDir(): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch { /* noop */ }
}

async function atomicWrite(filePath: string, data: string): Promise<void> {
  const tempPath = `${filePath}.tmp`;
  await fs.writeFile(tempPath, data, 'utf-8');
  await fs.rename(tempPath, filePath);
}

export async function loadQuizSessions(userId?: string): Promise<QuizSessionsData> {
  const sessionsFile = path.join(DATA_DIR, `quiz-sessions-${userId ?? ''}.json`);
  try {
    await ensureDataDir();
    const content = await fs.readFile(sessionsFile, 'utf-8');
    return JSON.parse(content) as QuizSessionsData;
  } catch {
    return {};
  }
}

export async function saveQuizSessions(sessions: QuizSessionsData, userId?: string): Promise<void> {
  const sessionsFile = path.join(DATA_DIR, `quiz-sessions-${userId ?? ''}.json`);
  await ensureDataDir();
  await atomicWrite(sessionsFile, JSON.stringify(sessions, null, 2));
}

export async function loadQuizResults(userId?: string): Promise<QuizResultsData> {
  const resultsFile = path.join(DATA_DIR, `quiz-results-${userId ?? ''}.json`);
  try {
    await ensureDataDir();
    const content = await fs.readFile(resultsFile, 'utf-8');
    return JSON.parse(content) as QuizResultsData;
  } catch {
    return [];
  }
}

export async function saveQuizResults(results: QuizResultsData, userId?: string): Promise<void> {
  const resultsFile = path.join(DATA_DIR, `quiz-results-${userId ?? ''}.json`);
  await ensureDataDir();
  await atomicWrite(resultsFile, JSON.stringify(results, null, 2));
}