/**
 * Socket.IO Game Gateway
 *
 * Real-time multiplayer quiz game event bridge between the frontend and
 * the game room service. All 7 client events + all 8 server broadcast events,
 * state machine transitions, host disconnect handling, and reconnect recovery.
 *
 * Namespace: /ws/game
 * Architecture: Server-authoritative timing, in-memory state, no Redis.
 */

import { Server, Namespace, Socket } from 'socket.io';
import type { Server as HTTPServer } from 'http';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as gameRoomService from './services/gameRoomService';
import type { Player, Question } from './types/gameRoom';

// ═══════════════════════════════════════════════════════════════════════════
// In-memory tracking maps
// ═══════════════════════════════════════════════════════════════════════════

/** socketId → { playerId, roomId } for player identification */
const socketPlayerMap = new Map<string, { playerId: string; roomId: string }>();

/** roomId → deadline setTimeout handle (cleared on early all-answered) */
const deadlineTimers = new Map<string, ReturnType<typeof setTimeout>>();

/** roomId → countdown setTimeout handle (cleared if room ends early) */
const countdownTimers = new Map<string, ReturnType<typeof setTimeout>>();

/** `${playerId}:${roomId}` → disconnect grace period timer (30s) */
const disconnectTimers = new Map<string, ReturnType<typeof setTimeout>>();

/** roomId → auto-advance setTimeout handle after leaderboard display */
const advanceTimers = new Map<string, ReturnType<typeof setTimeout>>();

// ═══════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════

const DATA_DIR = path.join(process.cwd(), 'data');

function gameHistoryFile(hostId: string): string {
  return path.join(DATA_DIR, `game-history-${hostId}.json`);
}

/** Write game results to the host's history file (used by teacherGames route). */
async function writeGameHistory(roomId: string): Promise<void> {
  const room = gameRoomService.getRoom(roomId);
  if (!room) return;

  const leaderboard = gameRoomService.getLeaderboard(roomId);

  const gameRecord = {
    gameId: room.id,
    roomId: room.id,
    pin: room.pin,
    hostId: room.hostId,
    playerCount: room.players.size,
    players: Array.from(room.players.values()).map((p) => ({
      id: p.id,
      name: p.name,
      score: p.score,
    })),
    leaderboard,
    totalQuestions: room.questions.length,
    questionsAnswered: room.currentQuestionIndex + 1,
    questions: room.questions.map((q) => ({
      id: q.id,
      text: q.text,
      options: q.options,
      correctIndex: q.correctIndex,
    })),
    startedAt: room.createdAt,
    endedAt: Date.now(),
    status: 'completed' as const,
  };

  try {
    await fs.mkdir(DATA_DIR, { recursive: true });

    const historyFile = gameHistoryFile(room.hostId);
    let existing: unknown[] = [];
    try {
      const raw = await fs.readFile(historyFile, 'utf-8');
      existing = JSON.parse(raw);
    } catch {
      /* file doesn't exist yet */
    }

    existing.push(gameRecord);

    const tempPath = `${historyFile}.tmp`;
    await fs.writeFile(tempPath, JSON.stringify(existing, null, 2), 'utf-8');
    await fs.rename(tempPath, historyFile);

    console.log(
      `[gameGateway] Game history saved: room=${roomId} host=${room.hostId} players=${room.players.size}`
    );
  } catch (err) {
    console.error('[gameGateway] Failed to write game history:', err);
  }
}

/** Sanitize question for broadcast (strip correctIndex from client payload). */
function sanitizeQuestion(q: Question) {
  return {
    id: q.id,
    text: q.text,
    options: q.options,
    timeLimitMs: q.timeLimitMs,
  };
}

/** Build player list for ack responses (Maps don't serialize). */
function serializePlayers(room: ReturnType<typeof gameRoomService.getRoom>) {
  if (!room) return [];
  return Array.from(room.players.values()).map((p) => ({
    id: p.id,
    name: p.name,
    score: p.score,
  }));
}

// ═══════════════════════════════════════════════════════════════════════════
// Question lifecycle helpers
// ═══════════════════════════════════════════════════════════════════════════

/** Broadcast the current question and set a deadline timeout. */
function broadcastQuestion(
  roomId: string,
  ns: Namespace
): void {
  const room = gameRoomService.getRoom(roomId);
  if (!room) return;

  const question = gameRoomService.getCurrentQuestion(roomId);
  if (!question) {
    endGame(roomId, ns);
    return;
  }

  gameRoomService.setRoomState(roomId, 'question');

  const deadlineTs = Date.now() + question.timeLimitMs;
  room.currentDeadline = deadlineTs;

  // Set deadline timeout — when it fires, force-close the question
  const timer = setTimeout(() => {
    handleDeadlineExpiry(roomId, ns);
  }, question.timeLimitMs);
  deadlineTimers.set(roomId, timer);
  advanceTimers.delete(roomId);

  ns.to(roomId).emit('game:question', {
    questionIndex: room.currentQuestionIndex,
    totalQuestions: room.questions.length,
    question: sanitizeQuestion(question),
    deadlineTs,
    serverNow: Date.now(),
  });

  console.log(
    `[gameGateway] Question ${room.currentQuestionIndex + 1}/${room.questions.length} broadcast to room ${roomId}, deadline=${deadlineTs}`
  );
}

/** Called when the question deadline expires. Shows leaderboard, then advances. */
function handleDeadlineExpiry(roomId: string, ns: Namespace): void {
  const room = gameRoomService.getRoom(roomId);
  if (!room) return;
  if (room.status !== 'question') return;

  deadlineTimers.delete(roomId);

  gameRoomService.setRoomState(roomId, 'answer_reveal');
  ns.to(roomId).emit('game:leaderboard', {
    rankings: gameRoomService.getLeaderboard(roomId),
  });

  // Auto-advance to next question after 1s
  const timer = setTimeout(() => {
    advanceTimers.delete(roomId);
    const r = gameRoomService.getRoom(roomId);
    if (!r || r.status !== 'answer_reveal') return;
    r.currentQuestionIndex++;
    broadcastQuestion(roomId, ns);
  }, 1000);
  advanceTimers.set(roomId, timer);
}

/** Called when ALL players have answered before the deadline. */
function handleAllAnswered(roomId: string, ns: Namespace): void {
  const room = gameRoomService.getRoom(roomId);
  if (!room) return;

  // Cancel the deadline timer — all answered early
  const deadlineTimer = deadlineTimers.get(roomId);
  if (deadlineTimer) {
    clearTimeout(deadlineTimer);
    deadlineTimers.delete(roomId);
  }

  // Wait 1s, then show leaderboard
  setTimeout(() => {
    const r = gameRoomService.getRoom(roomId);
    if (!r || r.status !== 'question') return;

    gameRoomService.setRoomState(roomId, 'answer_reveal');
    ns.to(roomId).emit('game:leaderboard', {
      rankings: gameRoomService.getLeaderboard(roomId),
    });

    // Wait 1s, then advance to next question or results
    const timer = setTimeout(() => {
      advanceTimers.delete(roomId);
      const r2 = gameRoomService.getRoom(roomId);
      if (!r2 || r2.status !== 'answer_reveal') return;
      r2.currentQuestionIndex++;
      broadcastQuestion(roomId, ns);
    }, 1000);
    advanceTimers.set(roomId, timer);
  }, 1000);
}

/** End the game, write history, broadcast results, clean up. */
function endGame(roomId: string, ns: Namespace): void {
  const room = gameRoomService.getRoom(roomId);
  if (!room) return;

  // Clear any pending timers
  const dt = deadlineTimers.get(roomId);
  if (dt) { clearTimeout(dt); deadlineTimers.delete(roomId); }

  const ct = countdownTimers.get(roomId);
  if (ct) { clearTimeout(ct); countdownTimers.delete(roomId); }

  const at = advanceTimers.get(roomId);
  if (at) { clearTimeout(at); advanceTimers.delete(roomId); }

  gameRoomService.setRoomState(roomId, 'results');

  const leaderboard = gameRoomService.getLeaderboard(roomId);

  ns.to(roomId).emit('game:results', {
    finalRankings: leaderboard,
    totalQuestions: room.questions.length,
  });

  // Write game history (fire-and-forget)
  writeGameHistory(roomId).catch((err) =>
    console.error('[gameGateway] writeGameHistory error:', err)
  );

  console.log(
    `[gameGateway] Game ended: room=${roomId} questions=${room.currentQuestionIndex + 1}/${room.questions.length}`
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Disconnect helpers
// ═══════════════════════════════════════════════════════════════════════════

/** Handle a player disconnecting (starts 30s grace timer, handles host promotion). */
function handlePlayerDisconnect(
  socket: Socket,
  ns: Namespace
): void {
  const mapping = socketPlayerMap.get(socket.id);
  if (!mapping) return;

  const room = gameRoomService.getRoom(mapping.roomId);
  if (!room) {
    socketPlayerMap.delete(socket.id);
    return;
  }

  const wasHost = room.hostId === mapping.playerId;
  const isCountdown = room.status === 'countdown';

  // If host disconnects during countdown, promote next player immediately
  // (can't wait 30s — the game is starting)
  if (wasHost && isCountdown) {
    const remainingPlayers = Array.from(room.players.values()).filter(
      (p) => p.id !== mapping.playerId
    );
    if (remainingPlayers.length > 0) {
      gameRoomService.promoteToHost(room.id, remainingPlayers[0].id);
      ns.to(room.id).emit('host:changed', { newHostId: remainingPlayers[0].id });
      console.log(`[gameGateway] Host changed during countdown: ${remainingPlayers[0].id}`);
    }
    // Don't allow reconnect during countdown — player is gone
    gameRoomService.removePlayer(mapping.roomId, mapping.playerId);
    socketPlayerMap.delete(socket.id);

    ns.to(mapping.roomId).emit('player:left', {
      playerId: mapping.playerId,
      playerName: room.players.get(mapping.playerId)?.name || 'Unknown',
      playerCount: room.players.size,
    });
    return;
  }

  // For non-countdown disconnects: start 30s reconnect grace period
  const timerKey = `${mapping.playerId}:${mapping.roomId}`;
  const disconnectTimer = setTimeout(() => {
    disconnectTimers.delete(timerKey);
    socketPlayerMap.delete(socket.id);

    const r = gameRoomService.getRoom(mapping.roomId);
    if (!r) return;

    const player = r.players.get(mapping.playerId);
    if (!player) return;

    const playerName = player.name;

    // If disconnected player was host, promote next player
    if (r.hostId === mapping.playerId) {
      const remaining = Array.from(r.players.values()).filter(
        (p) => p.id !== mapping.playerId
      );
      if (remaining.length > 0) {
        gameRoomService.promoteToHost(r.id, remaining[0].id);
        ns.to(mapping.roomId).emit('host:changed', { newHostId: remaining[0].id });
      }
    }

    gameRoomService.removePlayer(mapping.roomId, mapping.playerId);

    ns.to(mapping.roomId).emit('player:left', {
      playerId: mapping.playerId,
      playerName,
      playerCount: r.players.size,
    });

    // If room is empty, clear it
    if (r.players.size === 0) {
      gameRoomService.clearRoom(mapping.roomId);
      console.log(`[gameGateway] Room cleared (empty): ${mapping.roomId}`);
    }
  }, 30_000);

  disconnectTimers.set(timerKey, disconnectTimer);

  console.log(
    `[gameGateway] Player disconnected (grace period started): ${mapping.playerId} room=${mapping.roomId}`
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Public init function
// ═══════════════════════════════════════════════════════════════════════════

export function initGameGateway(httpServer: HTTPServer): Server {
  const io = new Server(httpServer, {
    path: '/ws/game',
    cors: { origin: '*', methods: ['GET', 'POST'] },
    pingTimeout: 30_000,
    pingInterval: 10_000,
  });

  const gameNamespace: Namespace = io.of('/ws/game');

  gameNamespace.on('connection', (socket: Socket) => {
    console.log(`[gameGateway] Socket connected: ${socket.id}`);

    // ── room:create ──────────────────────────────────────────────
    socket.on(
      'room:create',
      async (data: { hostId: string; quizId?: string }, ack?: (res: unknown) => void) => {
        try {
          const room = await gameRoomService.createRoom(data.hostId);

          // Auto-add host as a player so they appear in the player list
          const hostPlayer: Player = {
            id: data.hostId,
            socketId: socket.id,
            name: data.hostId,
            score: 0,
            answers: new Map(),
            joinedAt: Date.now(),
          };
          gameRoomService.addPlayer(room.id, hostPlayer);

          socket.join(room.id);
          socketPlayerMap.set(socket.id, { playerId: data.hostId, roomId: room.id });

          ack?.({
            roomId: room.id,
            pin: room.pin,
            questionCount: room.questions.length,
          });

          console.log(`[gameGateway] Room created: ${room.id} pin=${room.pin} host=${data.hostId}`);
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Failed to create room';
          ack?.({ error: message });
        }
      }
    );

    // ── room:join ────────────────────────────────────────────────
    socket.on(
      'room:join',
      (data: { pin: string; playerName: string }, ack?: (res: unknown) => void) => {
        const room = gameRoomService.getRoomByPin(data.pin);
        if (!room) {
          ack?.({ error: 'Room not found' });
          return;
        }

        if (room.status !== 'lobby') {
          ack?.({ error: 'Game has already started' });
          return;
        }

        const duplicateName = Array.from(room.players.values()).some(
          (p) => p.name === data.playerName
        );

        const playerId = `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
        const player: Player = {
          id: playerId,
          socketId: socket.id,
          name: duplicateName ? `${data.playerName} (2)` : data.playerName,
          score: 0,
          answers: new Map(),
          joinedAt: Date.now(),
        };

        const result = gameRoomService.addPlayer(room.id, player);
        if (!result.success) {
          ack?.({ error: result.error });
          return;
        }

        socket.join(room.id);
        socketPlayerMap.set(socket.id, { playerId, roomId: room.id });

        // Clear any stale disconnect timer for this player
        const timerKey = `${playerId}:${room.id}`;
        const existingTimer = disconnectTimers.get(timerKey);
        if (existingTimer) {
          clearTimeout(existingTimer);
          disconnectTimers.delete(timerKey);
        }

        ack?.({
          roomId: room.id,
          playerId,
          players: serializePlayers(room),
          status: room.status,
        });

        // Broadcast to all in room
        gameNamespace.to(room.id).emit('player:joined', {
          playerId,
          playerName: player.name,
          playerCount: room.players.size,
        });

        console.log(
          `[gameGateway] Player joined: ${player.name} (${playerId}) room=${room.id} count=${room.players.size}`
        );
      }
    );

    // ── room:start ───────────────────────────────────────────────
    socket.on('room:start', () => {
      const mapping = socketPlayerMap.get(socket.id);
      if (!mapping) return;

      const room = gameRoomService.getRoom(mapping.roomId);
      if (!room) return;

      // Only host can start
      if (room.hostId !== mapping.playerId) {
        socket.emit('error', { message: 'Only the host can start the game' });
        return;
      }

      if (room.status !== 'lobby') return;

      // Transition: lobby → countdown
      gameRoomService.setRoomState(room.id, 'countdown');
      gameNamespace.to(room.id).emit('game:countdown', { seconds: 3 });

      console.log(`[gameGateway] Countdown started: room=${room.id}`);

      // After 3s: start first question
      const timer = setTimeout(() => {
        countdownTimers.delete(room.id);

        const r = gameRoomService.getRoom(mapping.roomId);
        if (!r || r.status !== 'countdown') return;

        broadcastQuestion(room.id, gameNamespace);
      }, 3000);
      countdownTimers.set(room.id, timer);
    });

    // ── room:answer ──────────────────────────────────────────────
    socket.on('room:answer', (data: { questionId: string; answerIndex: number }) => {
      const mapping = socketPlayerMap.get(socket.id);
      if (!mapping) return;

      const room = gameRoomService.getRoom(mapping.roomId);
      if (!room) return;

      // Reject if question phase is over
      if (room.status !== 'question') {
        socket.emit('error', { message: 'Not accepting answers right now' });
        return;
      }

      // Reject if past deadline
      if (Date.now() > room.currentDeadline) {
        socket.emit('error', { message: 'Time is up for this question' });
        return;
      }

      const question = gameRoomService.getCurrentQuestion(room.id);
      if (!question) return;

      // Calculate response time from question start
      const questionStartTime = room.currentDeadline - question.timeLimitMs;
      const responseTimeMs = Math.max(0, Date.now() - questionStartTime);

      const result = gameRoomService.submitAnswer(
        room.id,
        mapping.playerId,
        data.questionId,
        data.answerIndex,
        responseTimeMs
      );

      if (!result) return;

      // Send individual result to the answering player only
      socket.emit('answer:result', {
        correct: result.correct,
        score: result.score,
        totalScore: result.totalScore,
        correctIndex: result.correctIndex,
      });

      // Check if all players have answered
      const allAnswered = Array.from(room.players.values()).every((p) =>
        p.answers.has(data.questionId)
      );

      if (allAnswered) {
        console.log(`[gameGateway] All players answered: room=${room.id} question=${data.questionId}`);
        handleAllAnswered(room.id, gameNamespace);
      }
    });

    // ── room:next-question ───────────────────────────────────────
    socket.on('room:next-question', () => {
      const mapping = socketPlayerMap.get(socket.id);
      if (!mapping) return;

      const room = gameRoomService.getRoom(mapping.roomId);
      if (!room) return;

      // Only host can trigger
      if (room.hostId !== mapping.playerId) return;

      // Clear pending deadline timer if active
      const dt = deadlineTimers.get(room.id);
      if (dt) {
        clearTimeout(dt);
        deadlineTimers.delete(room.id);
      }

      // Clear pending advance timer
      const at = advanceTimers.get(room.id);
      if (at) {
        clearTimeout(at);
        advanceTimers.delete(room.id);
      }

      // Advance question index
      room.currentQuestionIndex++;

      broadcastQuestion(room.id, gameNamespace);
    });

    // ── room:end ─────────────────────────────────────────────────
    socket.on('room:end', () => {
      const mapping = socketPlayerMap.get(socket.id);
      if (!mapping) return;

      const room = gameRoomService.getRoom(mapping.roomId);
      if (!room) return;

      // Only host can end
      if (room.hostId !== mapping.playerId) return;

      endGame(room.id, gameNamespace);
      gameRoomService.clearRoom(room.id);

      console.log(`[gameGateway] Room ended by host: ${room.id}`);
    });

    // ── room:rejoin ──────────────────────────────────────────────
    socket.on(
      'room:rejoin',
      (data: { playerId: string; roomId: string }, ack?: (res: unknown) => void) => {
        const room = gameRoomService.getRoom(data.roomId);
        if (!room) {
          ack?.({ error: 'Room not found' });
          return;
        }

        const player = room.players.get(data.playerId);
        if (!player) {
          ack?.({ error: 'Player not found in room' });
          return;
        }

        player.socketId = socket.id;
        socket.join(data.roomId);
        socketPlayerMap.set(socket.id, {
          playerId: data.playerId,
          roomId: data.roomId,
        });

        // Clear disconnect timer
        const timerKey = `${data.playerId}:${data.roomId}`;
        const existingTimer = disconnectTimers.get(timerKey);
        if (existingTimer) {
          clearTimeout(existingTimer);
          disconnectTimers.delete(timerKey);
        }

        // Send current game state to reconnected player
        if (room.status === 'countdown') {
          socket.emit('game:countdown', { seconds: 3 });
        } else if (room.status === 'question') {
          const question = gameRoomService.getCurrentQuestion(room.id);
          if (question) {
            socket.emit('game:question', {
              questionIndex: room.currentQuestionIndex,
              totalQuestions: room.questions.length,
              question: sanitizeQuestion(question),
              deadlineTs: room.currentDeadline,
              serverNow: Date.now(),
            });
          }
        } else if (room.status === 'answer_reveal') {
          socket.emit('game:leaderboard', {
            rankings: gameRoomService.getLeaderboard(room.id),
          });
        } else if (room.status === 'results') {
          socket.emit('game:results', {
            finalRankings: gameRoomService.getLeaderboard(room.id),
            totalQuestions: room.questions.length,
          });
        }

        ack?.({
          success: true,
          status: room.status,
          playerId: data.playerId,
          players: serializePlayers(room),
        });

        console.log(`[gameGateway] Player reconnected: ${data.playerId} room=${data.roomId}`);
      }
    );

    // ── Disconnect handler ───────────────────────────────────────
    socket.on('disconnect', () => {
      handlePlayerDisconnect(socket, gameNamespace);
    });
  });

  console.log('[gameGateway] Socket.IO game gateway initialized on /ws/game');
  return io;
}
