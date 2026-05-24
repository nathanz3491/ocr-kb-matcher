import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import type { GameRoom, Player, Question, RoomState, PersistedRoom } from '../types/gameRoom';
import { calculateScore, buildLeaderboard, getRank } from './leaderboardService';
import type { PlayerScore } from '../types/gameRoom';

const DATA_DIR = path.join(process.cwd(), 'data');
const ROOMS_FILE = path.join(DATA_DIR, 'game-rooms.json');
const QUESTIONS_FILE = path.join(DATA_DIR, 'game-questions.json');

const MAX_PLAYERS = 30;
const ROOM_EXPIRY_MS = 60 * 60 * 1000; // 60 minutes
const MAX_PIN_ATTEMPTS = 100;

// ─── In-memory storage ──────────────────────────────────────────────────────

const rooms = new Map<string, GameRoom>();

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateUUID(): string {
  return crypto.randomUUID();
}

function generate6DigitPin(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function ensureDataDir(): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch {
    /* directory exists */
  }
}

/** Load questions from the hardcoded JSON file */
async function loadQuestions(): Promise<Question[]> {
  await ensureDataDir();
  try {
    const raw = await fs.readFile(QUESTIONS_FILE, 'utf-8');
    return JSON.parse(raw) as Question[];
  } catch (err) {
    console.error('[gameRoomService] Failed to load game questions:', err);
    return [];
  }
}

/** Convert a room's Maps to plain objects for JSON serialization */
function roomToPersisted(room: GameRoom): PersistedRoom {
  return {
    id: room.id,
    pin: room.pin,
    hostId: room.hostId,
    status: room.status,
    currentQuestionIndex: room.currentQuestionIndex,
    currentDeadline: room.currentDeadline,
    createdAt: room.createdAt,
    playerCount: room.players.size,
  };
}

async function persistRooms(): Promise<void> {
  await ensureDataDir();
  const persisted: PersistedRoom[] = [];
  for (const room of rooms.values()) {
    if (room.status !== 'results') {
      persisted.push(roomToPersisted(room));
    }
  }
  const tempPath = `${ROOMS_FILE}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(persisted, null, 2), 'utf-8');
  await fs.rename(tempPath, ROOMS_FILE);
}

// ─── Auto-expiry cleanup ────────────────────────────────────────────────────

let cleanupInterval: ReturnType<typeof setInterval> | null = null;

function startCleanup(): void {
  if (cleanupInterval) return;
  cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [id, room] of rooms) {
      if (now - room.createdAt > ROOM_EXPIRY_MS) {
        rooms.delete(id);
        console.log(`[gameRoomService] Auto-expired room ${id}`);
      }
    }
    if (rooms.size > 0) {
      persistRooms().catch(err =>
        console.error('[gameRoomService] Persist error during cleanup:', err)
      );
    }
  }, 60_000);
}

function stopCleanup(): void {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
}

startCleanup();

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Create a new game room with a unique 6-digit PIN.
 * Loads questions from the shared JSON file.
 */
export async function createRoom(hostId: string): Promise<GameRoom> {
  const questions = await loadQuestions();
  if (questions.length === 0) {
    throw new Error('No game questions available');
  }

  let pin = generate6DigitPin();
  let attempts = 0;

  while (getRoomByPin(pin) && attempts < MAX_PIN_ATTEMPTS) {
    pin = generate6DigitPin();
    attempts++;
  }

  if (attempts >= MAX_PIN_ATTEMPTS) {
    throw new Error('Unable to generate unique PIN after 100 attempts');
  }

  const room: GameRoom = {
    id: generateUUID(),
    pin,
    hostId,
    status: 'lobby',
    players: new Map(),
    questions,
    currentQuestionIndex: 0,
    currentDeadline: 0,
    createdAt: Date.now(),
  };

  rooms.set(room.id, room);
  await persistRooms();

  console.log(`[gameRoomService] Room created: id=${room.id} pin=${room.pin} host=${hostId}`);
  return room;
}

export function getRoom(roomId: string): GameRoom | undefined {
  return rooms.get(roomId);
}

export function getRoomByPin(pin: string): GameRoom | undefined {
  for (const room of rooms.values()) {
    if (room.pin === pin) return room;
  }
  return undefined;
}

export function addPlayer(roomId: string, player: Player): { success: true } | { success: false; error: string } {
  const room = rooms.get(roomId);
  if (!room) {
    return { success: false, error: 'Room not found' };
  }

  if (room.players.size >= MAX_PLAYERS) {
    return { success: false, error: `Room is full (max ${MAX_PLAYERS} players)` };
  }

  if (room.players.has(player.id)) {
    room.players.set(player.id, player);
    return { success: true };
  }

  room.players.set(player.id, player);
  return { success: true };
}

export function removePlayer(roomId: string, playerId: string): boolean {
  const room = rooms.get(roomId);
  if (!room) return false;
  return room.players.delete(playerId);
}

export function setRoomState(roomId: string, state: RoomState): boolean {
  const room = rooms.get(roomId);
  if (!room) return false;

  room.status = state;

  if (state === 'results') {
    persistRooms().catch(err =>
      console.error('[gameRoomService] Persist error on results:', err)
    );
  }

  return true;
}

export function getCurrentQuestion(roomId: string): Question | null {
  const room = rooms.get(roomId);
  if (!room) return null;
  return room.questions[room.currentQuestionIndex] ?? null;
}

export interface SubmitAnswerResult {
  success: boolean;
  correct: boolean;
  score: number;
  totalScore: number;
  correctIndex: number;
}

export function submitAnswer(
  roomId: string,
  playerId: string,
  questionId: string,
  answerIndex: number,
  responseTimeMs: number
): SubmitAnswerResult | null {
  const room = rooms.get(roomId);
  if (!room) return null;

  const player = room.players.get(playerId);
  if (!player) return null;

  const question = room.questions[room.currentQuestionIndex];
  if (!question || question.id !== questionId) return null;

  const correct = answerIndex === question.correctIndex;

  const points = calculateScore(responseTimeMs, question.timeLimitMs, correct);
  player.score += points;

  player.answers.set(questionId, answerIndex);

  return {
    success: true,
    correct,
    score: points,
    totalScore: player.score,
    correctIndex: question.correctIndex,
  };
}

export function getLeaderboard(roomId: string): PlayerScore[] {
  const room = rooms.get(roomId);
  if (!room) return [];

  const entries: { playerId: string; playerName: string; score: number }[] = [];
  for (const player of room.players.values()) {
    entries.push({
      playerId: player.id,
      playerName: player.name,
      score: player.score,
    });
  }

  return buildLeaderboard(entries);
}

export function getPlayerRank(roomId: string, playerId: string): number {
  const leaderboard = getLeaderboard(roomId);
  return getRank(playerId, leaderboard);
}

export function promoteToHost(roomId: string, playerId: string): boolean {
  const room = rooms.get(roomId);
  if (!room) return false;
  if (!room.players.has(playerId)) return false;

  room.hostId = playerId;

  persistRooms().catch(err =>
    console.error('[gameRoomService] Persist error on host change:', err)
  );

  return true;
}

export function clearRoom(roomId: string): boolean {
  const existed = rooms.delete(roomId);

  persistRooms().catch(err =>
    console.error('[gameRoomService] Persist error on room clear:', err)
  );

  return existed;
}

export function getRoomCount(): number {
  return rooms.size;
}

// ─── Shutdown ────────────────────────────────────────────────────────────────

export function shutdown(): void {
  stopCleanup();
  rooms.clear();
  console.log('[gameRoomService] Shutdown complete');
}
