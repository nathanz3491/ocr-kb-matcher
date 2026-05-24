/**
 * Multiplayer Quiz Game Room Types
 * Shared type definitions for game room service and Socket.IO gateway (T7).
 */

export type RoomState = 'lobby' | 'countdown' | 'question' | 'answer_reveal' | 'results';

export interface Player {
  /** Unique player identifier (user ID or anonymous session ID) */
  id: string;
  /** Active socket ID for real-time communication */
  socketId: string;
  /** Display name shown in lobby and leaderboard */
  name: string;
  /** Cumulative score across all answered questions */
  score: number;
  /** Latest answer per question: questionId → answerIndex (0-3) */
  answers: Map<string, number>;
  /** Timestamp (ms) when the player joined the room */
  joinedAt: number;
}

export interface Question {
  /** Unique question identifier */
  id: string;
  /** The question text displayed to players */
  text: string;
  /** Four answer options */
  options: string[];
  /** Index (0-3) of the correct option */
  correctIndex: number;
  /** Time limit in milliseconds for this question */
  timeLimitMs: number;
}

export interface GameRoom {
  /** Unique room identifier (UUID) */
  id: string;
  /** 6-digit numeric PIN for lobby joining */
  pin: string;
  /** Player ID of the room host */
  hostId: string;
  /** Current room state in the lifecycle */
  status: RoomState;
  /** All players in the room, keyed by player ID */
  players: Map<string, Player>;
  /** Loaded question set for the game session */
  questions: Question[];
  /** Index into the questions array for the active question */
  currentQuestionIndex: number;
  /** Server-authoritative deadline timestamp (ms) for current question */
  currentDeadline: number;
  /** Timestamp (ms) when the room was created */
  createdAt: number;
}

export interface PlayerScore {
  /** Player ID */
  playerId: string;
  /** Player display name */
  playerName: string;
  /** Cumulative score */
  score: number;
  /** Rank position (1-based, ties share rank) */
  rank: number;
}

/** Serializable snapshot of room state for JSON persistence (recovery) */
export interface PersistedRoom {
  id: string;
  pin: string;
  hostId: string;
  status: RoomState;
  currentQuestionIndex: number;
  currentDeadline: number;
  createdAt: number;
  /** Player count (for display only — player details are NOT persisted) */
  playerCount: number;
}
