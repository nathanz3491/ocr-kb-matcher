'use client';

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Game" };

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';

import { useTheme } from '@/components/theme/ThemeProvider';
import { cn } from '@/lib/utils';
import {
  Users,
  Crown,
  Loader2,
  AlertCircle,
  ArrowLeft,
  Trophy,
  Medal,
  Award,
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
  Gamepad2,
} from 'lucide-react';

type GameState = 'connecting' | 'lobby' | 'countdown' | 'question' | 'leaderboard' | 'results' | 'error';

interface Player {
  playerId: string;
  playerName: string;
  score?: number;
}

interface LeaderboardEntry {
  playerId: string;
  playerName: string;
  score: number;
  rank: number;
}

interface QuestionData {
  id: string;
  text: string;
  options: string[];
  timeLimitMs: number;
}

interface AnswerResult {
  correct: boolean;
  score: number;
  totalScore: number;
  correctIndex: number;
}

export default function GamePage() {
  const { theme } = useTheme();
  const router = useRouter();
  const params = useParams();
  const gameId = params.gameId as string;

  const [gameState, setGameState] = useState<GameState>('connecting');
  const [errorMessage, setErrorMessage] = useState('');
  const [players, setPlayers] = useState<Player[]>([]);
  const [playerId, setPlayerId] = useState('');
  const [playerName, setPlayerName] = useState('');

  const [countdownValue, setCountdownValue] = useState(3);

  const [question, setQuestion] = useState<QuestionData | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [deadlineTs, setDeadlineTs] = useState(0);
  const [serverNow, setServerNow] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [timeLimitMs, setTimeLimitMs] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [answerResult, setAnswerResult] = useState<AnswerResult | null>(null);

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [finalRankings, setFinalRankings] = useState<LeaderboardEntry[]>([]);

  const socketRef = useRef<any>(null);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startLocalTimer = useCallback(
    (deadline: number, serverTime: number, limit: number) => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      setTimeLimitMs(limit);

      const tick = () => {
        const serverTimeDelta = Date.now() - serverTime;
        const actualRemaining = deadline - serverTime - serverTimeDelta;
        const remaining = Math.max(0, actualRemaining);
        setTimeRemaining(remaining);

        if (remaining <= 0 && timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
        }
      };

      tick();
      timerIntervalRef.current = setInterval(tick, 100);
    },
    []
  );

  const stopLocalTimer = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    let socket: any;

    const setup = async () => {
      const { io } = await import('socket.io-client');
      socket = io(
        typeof window !== 'undefined'
          ? window.location.origin
          : 'http://localhost:3001',
        { path: '/ws/game', transports: ['polling', 'websocket'] }
      );
      socketRef.current = socket;

      socket.on('connect', () => {
        socket.on('player:joined', (data: Player & { playerCount: number }) => {
          setPlayers((prev) => {
            if (prev.some((p) => p.playerId === data.playerId)) return prev;
            return [...prev, { playerId: data.playerId, playerName: data.playerName }];
          });
        });

        socket.on('player:left', (data: { playerId: string; playerCount: number }) => {
          setPlayers((prev) => prev.filter((p) => p.playerId !== data.playerId));
        });

        socket.on('host:changed', () => {
          setPlayers((prev) => [...prev]);
        });

        socket.on('game:countdown', (data: { seconds: number }) => {
          setCountdownValue(data.seconds);
          setGameState('countdown');
          stopLocalTimer();
          setHasAnswered(false);
          setSelectedAnswer(null);
          setAnswerResult(null);
        });

        socket.on(
          'game:question',
          (data: {
            questionIndex: number;
            totalQuestions: number;
            question: QuestionData;
            deadlineTs: number;
            serverNow: number;
          }) => {
            setQuestionIndex(data.questionIndex);
            setTotalQuestions(data.totalQuestions);
            setQuestion(data.question);
            setDeadlineTs(data.deadlineTs);
            setServerNow(data.serverNow);
            setHasAnswered(false);
            setSelectedAnswer(null);
            setAnswerResult(null);
            setGameState('question');
            startLocalTimer(data.deadlineTs, data.serverNow, data.question.timeLimitMs);
          }
        );

        socket.on('game:leaderboard', (data: { rankings: LeaderboardEntry[] }) => {
          setLeaderboard(data.rankings);
          setGameState('leaderboard');
          stopLocalTimer();
        });

        socket.on('game:results', (data: { finalRankings: LeaderboardEntry[]; totalQuestions: number }) => {
          setFinalRankings(data.finalRankings);
          setTotalQuestions(data.totalQuestions);
          setGameState('results');
          stopLocalTimer();
        });

        socket.on('answer:result', (data: AnswerResult) => {
          setAnswerResult(data);
        });

        socket.on('error', (data: { message: string }) => {
          setErrorMessage(data.message);
        });

        const storedPlayerId = localStorage.getItem('mq_playerId');
        const storedPlayerName = localStorage.getItem('mq_playerName');
        if (storedPlayerId) {
          setPlayerId(storedPlayerId);
          if (storedPlayerName) setPlayerName(storedPlayerName);

          socket.emit(
            'room:rejoin',
            { playerId: storedPlayerId, roomId: gameId },
            (ack: { success?: boolean; error?: string; status?: string; playerId?: string; players?: Player[] }) => {
              if (ack?.error) {
                setGameState('error');
                setErrorMessage(ack.error);
              } else {
                setPlayers(ack.players || []);
                const status = ack.status || 'lobby';
                if (status === 'lobby') {
                  setGameState('lobby');
                } else if (status === 'countdown') {
                  setCountdownValue(3);
                  setGameState('countdown');
                } else if (status === 'question') {
                  setGameState('question');
                } else if (status === 'answer_reveal') {
                  setGameState('leaderboard');
                } else if (status === 'results') {
                  setGameState('results');
                }
              }
            }
          );
        } else {
          setGameState('error');
          setErrorMessage('No player session found. Please join from the main page.');
        }
      });

      socket.on('connect_error', () => {
        setGameState('error');
        setErrorMessage('Could not connect to game server. Please check your connection and try again.');
      });

      socket.on('disconnect', (reason: string) => {
        if (gameState !== 'results') {
          setGameState('error');
          setErrorMessage('Connection lost. Please check your network and try again.');
        }
      });
    };

    setup();

    return () => {
      stopLocalTimer();
      if (socket) {
        socket.disconnect();
      }
      socketRef.current = null;
    };
  }, [gameId, startLocalTimer, stopLocalTimer, gameState]);

  useEffect(() => {
    if (gameState !== 'countdown') return;
    if (countdownValue <= 0) return;

    const t = setTimeout(() => setCountdownValue((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [gameState, countdownValue]);

  const handleAnswer = (answerIndex: number) => {
    if (hasAnswered || !question || !socketRef.current) return;

    const serverTimeDelta = Date.now() - serverNow;
    const actualRemaining = deadlineTs - serverNow - serverTimeDelta;
    if (actualRemaining <= 0) return;

    setSelectedAnswer(answerIndex);
    setHasAnswered(true);

    socketRef.current.emit('room:answer', {
      questionId: question.id,
      answerIndex,
    });
  };

  const isMe = (id: string) => id === playerId;

  const timerPercent = timeLimitMs > 0 ? Math.max(0, Math.min(100, (timeRemaining / timeLimitMs) * 100)) : 0;

  const timerColor =
    timerPercent > 50
      ? 'bg-emerald-500'
      : timerPercent > 25
        ? 'bg-amber-500'
        : 'bg-red-500';

  const answerColors = [
    theme === 'dark'
      ? 'bg-gradient-to-br from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500'
      : 'bg-gradient-to-br from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400',
    theme === 'dark'
      ? 'bg-gradient-to-br from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500'
      : 'bg-gradient-to-br from-blue-500 to-cyan-500 hover:from-blue-400 hover:to-cyan-400',
    theme === 'dark'
      ? 'bg-gradient-to-br from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500'
      : 'bg-gradient-to-br from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400',
    theme === 'dark'
      ? 'bg-gradient-to-br from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500'
      : 'bg-gradient-to-br from-emerald-500 to-green-500 hover:from-emerald-400 hover:to-green-400',
  ];

  const answerLabels = ['▲', '◆', '●', '■'];

  if (gameState === 'connecting') {
    return (
      <div
        className={cn(
          'min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden',
          'bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50',
          'dark:from-slate-900 dark:via-slate-800 dark:to-slate-900'
        )}
      >
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 blur-3xl" />
        </div>
        <div className="relative z-10 flex flex-col items-center gap-4">
          <Loader2 className={cn('h-10 w-10 animate-spin', theme === 'dark' ? 'text-slate-400' : 'text-slate-500')} />
          <p className={cn('text-sm font-medium', theme === 'dark' ? 'text-slate-400' : 'text-slate-600')}>
            Connecting to game...
          </p>
        </div>
      </div>
    );
  }

  if (gameState === 'error') {
    return (
      <div
        className={cn(
          'min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden',
          'bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50',
          'dark:from-slate-900 dark:via-slate-800 dark:to-slate-900'
        )}
      >
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 blur-3xl" />
        </div>
        <div
          className={cn(
            'w-full max-w-sm relative z-10',
            'rounded-2xl border backdrop-blur-xl p-6 shadow-2xl',
            theme === 'dark' ? 'bg-slate-800/40 border-slate-700/30' : 'bg-white/60 border-white/40'
          )}
        >
          <div className="text-center mb-6">
            <div
              className={cn(
                'mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl',
                theme === 'dark' ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-600'
              )}
            >
              <AlertCircle className="h-7 w-7" />
            </div>
            <h1 className={cn('text-xl font-bold mb-2', theme === 'dark' ? 'text-white' : 'text-slate-800')}>
              Oops!
            </h1>
            <p className={cn('text-sm', theme === 'dark' ? 'text-slate-400' : 'text-slate-600')}>
              {errorMessage || 'Something went wrong.'}
            </p>
          </div>
          <button
            onClick={() => router.push('/play')}
            className={cn(
              'w-full rounded-xl py-3 text-sm font-semibold',
              'flex items-center justify-center gap-2',
              'transition-all duration-300',
              theme === 'dark'
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white'
                : 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white',
              'shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30',
              'hover:scale-[1.01] active:scale-[0.99]'
            )}
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Join</span>
          </button>
        </div>
      </div>
    );
  }

  if (gameState === 'lobby') {
    return (
      <div
        className={cn(
          'min-h-screen flex flex-col items-center justify-center px-4 py-8 relative overflow-hidden',
          'bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50',
          'dark:from-slate-900 dark:via-slate-800 dark:to-slate-900'
        )}
      >
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 blur-3xl" />
        </div>

        <div
          className={cn(
            'w-full max-w-sm relative z-10',
            'rounded-2xl border backdrop-blur-xl p-6 shadow-2xl',
            theme === 'dark' ? 'bg-slate-800/40 border-slate-700/30' : 'bg-white/60 border-white/40'
          )}
        >
          <div className="text-center mb-6">
            <div
              className={cn(
                'mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl',
                theme === 'dark' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-600'
              )}
            >
              <Users className="h-7 w-7" />
            </div>
            <h1 className={cn('text-2xl font-bold mb-1', theme === 'dark' ? 'text-white' : 'text-slate-800')}>
              Lobby
            </h1>
            <p className={cn('text-sm', theme === 'dark' ? 'text-slate-400' : 'text-slate-600')}>
              Waiting for the host to start the game
              <span className="inline-block w-6 text-left">
                <span className="animate-pulse">...</span>
              </span>
            </p>
          </div>

          <div
            className={cn(
              'rounded-xl p-4 mb-6 text-center',
              'bg-blue-50 dark:bg-blue-900/20',
              'border border-blue-200 dark:border-blue-800'
            )}
          >
            <p className={cn('text-sm font-medium', theme === 'dark' ? 'text-blue-300' : 'text-blue-700')}>
              You joined as
            </p>
            <p className={cn('text-lg font-bold mt-1', theme === 'dark' ? 'text-white' : 'text-slate-800')}>
              {playerName}
            </p>
          </div>

          <div className="mb-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className={cn('text-sm font-semibold', theme === 'dark' ? 'text-slate-300' : 'text-slate-700')}>
                Players
              </h3>
              <span
                className={cn(
                  'text-xs font-medium px-2 py-0.5 rounded-full',
                  theme === 'dark' ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'
                )}
              >
                {players.length}
              </span>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {players.map((p) => (
                <div
                  key={p.playerId}
                  className={cn(
                    'flex items-center gap-3 rounded-xl px-3 py-2.5',
                    'border transition-all duration-200',
                    isMe(p.playerId)
                      ? theme === 'dark'
                        ? 'bg-blue-500/10 border-blue-500/30'
                        : 'bg-blue-50 border-blue-200'
                      : theme === 'dark'
                        ? 'bg-slate-800/50 border-slate-700/30'
                        : 'bg-white/50 border-slate-200/50'
                  )}
                >
                  <div
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold',
                      isMe(p.playerId)
                        ? theme === 'dark'
                          ? 'bg-blue-500/20 text-blue-400'
                          : 'bg-blue-100 text-blue-600'
                        : theme === 'dark'
                          ? 'bg-slate-700 text-slate-300'
                          : 'bg-slate-100 text-slate-600'
                    )}
                  >
                    {p.playerName.charAt(0).toUpperCase()}
                  </div>
                  <span
                    className={cn(
                      'text-sm font-medium flex-1 truncate',
                      theme === 'dark' ? 'text-slate-200' : 'text-slate-700'
                    )}
                  >
                    {p.playerName}
                    {isMe(p.playerId) && (
                      <span className={cn('ml-1.5 text-xs', theme === 'dark' ? 'text-blue-400' : 'text-blue-600')}>
                        (You)
                      </span>
                    )}
                  </span>
                  {isMe(p.playerId) && (
                    <Crown className={cn('h-4 w-4', theme === 'dark' ? 'text-yellow-400' : 'text-yellow-500')} />
                  )}
                </div>
              ))}
            </div>
          </div>

          <div
            className={cn(
              'flex items-center justify-center gap-2 py-3',
              'rounded-xl border',
              theme === 'dark' ? 'border-slate-700/30 bg-slate-800/30' : 'border-slate-200/50 bg-white/40'
            )}
          >
            <Loader2 className={cn('h-4 w-4 animate-spin', theme === 'dark' ? 'text-slate-400' : 'text-slate-500')} />
            <span className={cn('text-sm font-medium', theme === 'dark' ? 'text-slate-400' : 'text-slate-500')}>
              Waiting for host...
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (gameState === 'countdown') {
    return (
      <div
        className={cn(
          'min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden',
          'bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50',
          'dark:from-slate-900 dark:via-slate-800 dark:to-slate-900'
        )}
      >
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 blur-3xl" />
        </div>

        <div className="relative z-10 text-center">
          <h2 className={cn('text-xl font-bold mb-8', theme === 'dark' ? 'text-white' : 'text-slate-800')}>
            Game Starting!
          </h2>

          {countdownValue > 0 ? (
            <div
              className={cn(
                'mx-auto flex h-40 w-40 items-center justify-center rounded-full',
                'text-7xl font-black',
                'transition-all duration-300',
                theme === 'dark'
                  ? 'bg-gradient-to-br from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/30'
                  : 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/25'
              )}
            >
              {countdownValue}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className={cn('h-10 w-10 animate-spin', theme === 'dark' ? 'text-blue-400' : 'text-blue-600')} />
              <p className={cn('text-sm font-medium', theme === 'dark' ? 'text-slate-400' : 'text-slate-600')}>
                Get ready...
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (gameState === 'question' && question) {
    return (
      <div
        className={cn(
          'min-h-screen flex flex-col px-4 py-6 relative overflow-hidden',
          'bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50',
          'dark:from-slate-900 dark:via-slate-800 dark:to-slate-900'
        )}
      >
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 blur-3xl" />
        </div>

        <div className="relative z-10 flex flex-col flex-1 max-w-lg mx-auto w-full">
          <div className="flex items-center justify-between mb-4">
            <span
              className={cn(
                'text-xs font-bold px-2.5 py-1 rounded-full',
                theme === 'dark'
                  ? 'bg-slate-700 text-slate-300'
                  : 'bg-slate-100 text-slate-600'
              )}
            >
              {questionIndex + 1} / {totalQuestions}
            </span>
            <div className="flex items-center gap-1.5">
              <Clock className={cn('h-3.5 w-3.5', theme === 'dark' ? 'text-slate-400' : 'text-slate-500')} />
              <span
                className={cn(
                  'text-sm font-bold tabular-nums',
                  timeRemaining < 3000
                    ? 'text-red-500'
                    : theme === 'dark'
                      ? 'text-slate-300'
                      : 'text-slate-700'
                )}
              >
                {Math.ceil(timeRemaining / 1000)}s
              </span>
            </div>
          </div>

          <div
            className={cn(
              'w-full h-2 rounded-full mb-6 overflow-hidden',
              theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'
            )}
          >
            <div
              className={cn('h-full rounded-full transition-all duration-100', timerColor)}
              style={{ width: `${timerPercent}%` }}
            />
          </div>

          <div className="mb-6">
            <h2
              className={cn(
                'text-xl sm:text-2xl font-bold leading-snug',
                theme === 'dark' ? 'text-white' : 'text-slate-800'
              )}
            >
              {question.text}
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-3 flex-1">
            {question.options.map((opt, idx) => {
              const isSelected = selectedAnswer === idx;
              const isDisabled = hasAnswered;

              return (
                <button
                  key={idx}
                  onClick={() => handleAnswer(idx)}
                  disabled={isDisabled}
                  className={cn(
                    'relative flex flex-col items-start justify-center',
                    'rounded-xl p-4 sm:p-5 text-left',
                    'transition-all duration-200',
                    'disabled:opacity-60 disabled:cursor-not-allowed',
                    isSelected
                      ? 'ring-4 ring-white/50 scale-[1.02] shadow-xl'
                      : 'hover:scale-[1.02] active:scale-[0.98] shadow-lg',
                    isDisabled && !isSelected ? 'opacity-50' : '',
                    answerColors[idx],
                    'text-white'
                  )}
                >
                  <span className="text-lg font-bold mb-1 opacity-90">{answerLabels[idx]}</span>
                  <span className="text-sm sm:text-base font-semibold leading-snug">{opt}</span>
                  {isSelected && (
                    <div className="absolute top-2 right-2">
                      <Zap className="h-5 w-5 text-white/80" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {hasAnswered && (
            <div className="mt-4">
              {answerResult ? (
                <div
                  className={cn(
                    'rounded-xl p-4 text-center',
                    'border',
                    answerResult.correct
                      ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
                      : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                  )}
                >
                  <div className="flex items-center justify-center gap-2 mb-1">
                    {answerResult.correct ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                    <span
                      className={cn(
                        'text-sm font-bold',
                        answerResult.correct
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-red-600 dark:text-red-400'
                      )}
                    >
                      {answerResult.correct ? 'Correct!' : 'Wrong!'}
                    </span>
                  </div>
                  <p className={cn('text-xs', theme === 'dark' ? 'text-slate-400' : 'text-slate-600')}>
                    {answerResult.correct ? `+${answerResult.score} points` : 'Better luck next time'}
                  </p>
                </div>
              ) : (
                <div
                  className={cn(
                    'flex items-center justify-center gap-2 py-3 rounded-xl border',
                    theme === 'dark' ? 'border-slate-700/30 bg-slate-800/30' : 'border-slate-200/50 bg-white/40'
                  )}
                >
                  <Loader2 className={cn('h-4 w-4 animate-spin', theme === 'dark' ? 'text-slate-400' : 'text-slate-500')} />
                  <span className={cn('text-sm font-medium', theme === 'dark' ? 'text-slate-400' : 'text-slate-500')}>
                    Waiting for others...
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (gameState === 'leaderboard') {
    const myRank = leaderboard.find((e) => e.playerId === playerId);

    return (
      <div
        className={cn(
          'min-h-screen flex flex-col items-center justify-center px-4 py-8 relative overflow-hidden',
          'bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50',
          'dark:from-slate-900 dark:via-slate-800 dark:to-slate-900'
        )}
      >
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 blur-3xl" />
        </div>

        <div
          className={cn(
            'w-full max-w-sm relative z-10',
            'rounded-2xl border backdrop-blur-xl p-6 shadow-2xl',
            theme === 'dark' ? 'bg-slate-800/40 border-slate-700/30' : 'bg-white/60 border-white/40'
          )}
        >
          <div className="text-center mb-6">
            <div
              className={cn(
                'mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl',
                theme === 'dark' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-yellow-100 text-yellow-600'
              )}
            >
              <Trophy className="h-7 w-7" />
            </div>
            <h1 className={cn('text-2xl font-bold mb-1', theme === 'dark' ? 'text-white' : 'text-slate-800')}>
              Leaderboard
            </h1>
            <p className={cn('text-sm', theme === 'dark' ? 'text-slate-400' : 'text-slate-600')}>
              Question {questionIndex + 1} of {totalQuestions}
            </p>
          </div>

          <div className="space-y-2 mb-6">
            {leaderboard.slice(0, 5).map((entry) => (
              <div
                key={entry.playerId}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 border transition-all duration-200',
                  isMe(entry.playerId)
                    ? theme === 'dark'
                      ? 'bg-blue-500/10 border-blue-500/30'
                      : 'bg-blue-50 border-blue-200'
                    : theme === 'dark'
                      ? 'bg-slate-800/50 border-slate-700/30'
                      : 'bg-white/50 border-slate-200/50'
                )}
              >
                <div
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold',
                    entry.rank === 1
                      ? 'bg-yellow-500/20 text-yellow-500'
                      : entry.rank === 2
                        ? 'bg-slate-400/20 text-slate-400'
                        : entry.rank === 3
                          ? 'bg-orange-500/20 text-orange-500'
                          : theme === 'dark'
                            ? 'bg-slate-700 text-slate-300'
                            : 'bg-slate-100 text-slate-600'
                  )}
                >
                  {entry.rank === 1 ? <Trophy className="h-4 w-4" /> : entry.rank}
                </div>
                <span
                  className={cn(
                    'text-sm font-medium flex-1 truncate',
                    theme === 'dark' ? 'text-slate-200' : 'text-slate-700'
                  )}
                >
                  {entry.playerName}
                  {isMe(entry.playerId) && (
                    <span className={cn('ml-1.5 text-xs', theme === 'dark' ? 'text-blue-400' : 'text-blue-600')}>
                      (You)
                    </span>
                  )}
                </span>
                <span className={cn('text-sm font-bold', theme === 'dark' ? 'text-slate-300' : 'text-slate-700')}>
                  {entry.score}
                </span>
              </div>
            ))}
          </div>

          {myRank && myRank.rank > 5 && (
            <div
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 border',
                theme === 'dark'
                  ? 'bg-blue-500/10 border-blue-500/30'
                  : 'bg-blue-50 border-blue-200'
              )}
            >
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold',
                  theme === 'dark' ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'
                )}
              >
                {myRank.rank}
              </div>
              <span className={cn('text-sm font-medium flex-1', theme === 'dark' ? 'text-slate-200' : 'text-slate-700')}>
                {myRank.playerName}
                <span className={cn('ml-1.5 text-xs', theme === 'dark' ? 'text-blue-400' : 'text-blue-600')}>
                  (You)
                </span>
              </span>
              <span className={cn('text-sm font-bold', theme === 'dark' ? 'text-slate-300' : 'text-slate-700')}>
                {myRank.score}
              </span>
            </div>
          )}

          <div
            className={cn(
              'flex items-center justify-center gap-2 py-3 mt-4',
              'rounded-xl border',
              theme === 'dark' ? 'border-slate-700/30 bg-slate-800/30' : 'border-slate-200/50 bg-white/40'
            )}
          >
            <Loader2 className={cn('h-4 w-4 animate-spin', theme === 'dark' ? 'text-slate-400' : 'text-slate-500')} />
            <span className={cn('text-sm font-medium', theme === 'dark' ? 'text-slate-400' : 'text-slate-500')}>
              Next question coming up...
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (gameState === 'results') {
    const myEntry = finalRankings.find((e) => e.playerId === playerId);
    const topThree = finalRankings.slice(0, 3);

    return (
      <div
        className={cn(
          'min-h-screen flex flex-col items-center justify-center px-4 py-8 relative overflow-hidden',
          'bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50',
          'dark:from-slate-900 dark:via-slate-800 dark:to-slate-900'
        )}
      >
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 blur-3xl" />
        </div>

        <div
          className={cn(
            'w-full max-w-sm relative z-10',
            'rounded-2xl border backdrop-blur-xl p-6 shadow-2xl',
            theme === 'dark' ? 'bg-slate-800/40 border-slate-700/30' : 'bg-white/60 border-white/40'
          )}
        >
          <div className="text-center mb-6">
            <div
              className={cn(
                'mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl',
                theme === 'dark' ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-100 text-purple-600'
              )}
            >
              <Gamepad2 className="h-7 w-7" />
            </div>
            <h1 className={cn('text-2xl font-bold mb-1', theme === 'dark' ? 'text-white' : 'text-slate-800')}>
              Game Over!
            </h1>
            <p className={cn('text-sm', theme === 'dark' ? 'text-slate-400' : 'text-slate-600')}>
              {totalQuestions} questions played
            </p>
          </div>

          {topThree.length > 0 && (
            <div className="flex items-end justify-center gap-3 mb-6">
              {topThree[1] && (
                <div className="flex flex-col items-center gap-2">
                  <div
                    className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-full',
                      'bg-slate-400/20 text-slate-400'
                    )}
                  >
                    <Medal className="h-5 w-5" />
                  </div>
                  <div
                    className={cn(
                      'w-20 rounded-t-xl p-2 text-center',
                      theme === 'dark' ? 'bg-slate-700/50' : 'bg-slate-100/80'
                    )}
                    style={{ height: '80px' }}
                  >
                    <p className={cn('text-xs font-bold truncate', theme === 'dark' ? 'text-slate-300' : 'text-slate-700')}>
                      {topThree[1].playerName}
                    </p>
                    <p className={cn('text-sm font-bold mt-1', theme === 'dark' ? 'text-white' : 'text-slate-800')}>
                      {topThree[1].score}
                    </p>
                  </div>
                </div>
              )}

              {topThree[0] && (
                <div className="flex flex-col items-center gap-2">
                  <div
                    className={cn(
                      'flex h-12 w-12 items-center justify-center rounded-full',
                      'bg-yellow-500/20 text-yellow-500'
                    )}
                  >
                    <Trophy className="h-6 w-6" />
                  </div>
                  <div
                    className={cn(
                      'w-24 rounded-t-xl p-2 text-center',
                      theme === 'dark' ? 'bg-yellow-500/10' : 'bg-yellow-50/80'
                    )}
                    style={{ height: '110px' }}
                  >
                    <p className={cn('text-xs font-bold truncate', theme === 'dark' ? 'text-yellow-300' : 'text-yellow-700')}>
                      {topThree[0].playerName}
                    </p>
                    <p className={cn('text-lg font-bold mt-1', theme === 'dark' ? 'text-white' : 'text-slate-800')}>
                      {topThree[0].score}
                    </p>
                  </div>
                </div>
              )}

              {topThree[2] && (
                <div className="flex flex-col items-center gap-2">
                  <div
                    className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-full',
                      'bg-orange-500/20 text-orange-500'
                    )}
                  >
                    <Award className="h-5 w-5" />
                  </div>
                  <div
                    className={cn(
                      'w-20 rounded-t-xl p-2 text-center',
                      theme === 'dark' ? 'bg-slate-700/50' : 'bg-slate-100/80'
                    )}
                    style={{ height: '60px' }}
                  >
                    <p className={cn('text-xs font-bold truncate', theme === 'dark' ? 'text-slate-300' : 'text-slate-700')}>
                      {topThree[2].playerName}
                    </p>
                    <p className={cn('text-sm font-bold mt-1', theme === 'dark' ? 'text-white' : 'text-slate-800')}>
                      {topThree[2].score}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="space-y-2 mb-6 max-h-64 overflow-y-auto pr-1">
            {finalRankings.map((entry) => (
              <div
                key={entry.playerId}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 border transition-all duration-200',
                  isMe(entry.playerId)
                    ? theme === 'dark'
                      ? 'bg-blue-500/10 border-blue-500/30'
                      : 'bg-blue-50 border-blue-200'
                    : theme === 'dark'
                      ? 'bg-slate-800/50 border-slate-700/30'
                      : 'bg-white/50 border-slate-200/50'
                )}
              >
                <div
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold',
                    entry.rank === 1
                      ? 'bg-yellow-500/20 text-yellow-500'
                      : entry.rank === 2
                        ? 'bg-slate-400/20 text-slate-400'
                        : entry.rank === 3
                          ? 'bg-orange-500/20 text-orange-500'
                          : theme === 'dark'
                            ? 'bg-slate-700 text-slate-300'
                            : 'bg-slate-100 text-slate-600'
                  )}
                >
                  {entry.rank}
                </div>
                <span
                  className={cn(
                    'text-sm font-medium flex-1 truncate',
                    theme === 'dark' ? 'text-slate-200' : 'text-slate-700'
                  )}
                >
                  {entry.playerName}
                  {isMe(entry.playerId) && (
                    <span className={cn('ml-1.5 text-xs', theme === 'dark' ? 'text-blue-400' : 'text-blue-600')}>
                      (You)
                    </span>
                  )}
                </span>
                <span className={cn('text-sm font-bold', theme === 'dark' ? 'text-slate-300' : 'text-slate-700')}>
                  {entry.score}
                </span>
              </div>
            ))}
          </div>

          {myEntry && (
            <div
              className={cn(
                'rounded-xl p-4 mb-6 text-center border',
                theme === 'dark'
                  ? 'bg-blue-500/10 border-blue-500/30'
                  : 'bg-blue-50 border-blue-200'
              )}
            >
              <p className={cn('text-sm font-medium', theme === 'dark' ? 'text-blue-300' : 'text-blue-700')}>
                Your final score
              </p>
              <p className={cn('text-2xl font-black mt-1', theme === 'dark' ? 'text-white' : 'text-slate-800')}>
                {myEntry.score}
              </p>
              <p className={cn('text-xs mt-1', theme === 'dark' ? 'text-slate-400' : 'text-slate-600')}>
                Rank #{myEntry.rank} of {finalRankings.length}
              </p>
            </div>
          )}

          <button
            onClick={() => {
              localStorage.removeItem('mq_playerId');
              localStorage.removeItem('mq_roomId');
              localStorage.removeItem('mq_playerName');
              router.push('/play');
            }}
            className={cn(
              'w-full rounded-xl py-3 text-sm font-semibold',
              'flex items-center justify-center gap-2',
              'transition-all duration-300',
              theme === 'dark'
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white'
                : 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white',
              'shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30',
              'hover:scale-[1.01] active:scale-[0.99]'
            )}
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Play Again</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden',
        'bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50',
        'dark:from-slate-900 dark:via-slate-800 dark:to-slate-900'
      )}
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 blur-3xl" />
      </div>
      <div className="relative z-10">
        <Loader2 className={cn('h-10 w-10 animate-spin', theme === 'dark' ? 'text-slate-400' : 'text-slate-500')} />
      </div>
    </div>
  );
}
