'use client';

import type { Metadata } from "next";

export const metadata: Metadata = { title: "New Game" };

'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';

  Users,
  Play,
  Square,
  SkipForward,
import {
  Trophy,
  Loader2,
  Crown,
  ArrowLeft,
  Monitor,
  Copy,
  Check,
  QrCode,
  WifiOff,
  Volume2,
  VolumeX,
  UserPlus,
  Hash,
  Timer,
import {
  BarChart3,
  Flag,
  RotateCcw,
} from 'lucide-react';

type GamePhase = 'loading' | 'connecting' | 'error' | 'lobby' | 'countdown' | 'question' | 'leaderboard' | 'results';

interface Player {
  playerId: string;
  playerName: string;
}

interface QuestionData {
  id: string;
  text: string;
  options: string[];
  timeLimit: number;
}

interface LeaderboardEntry {
  playerId: string;
  playerName: string;
  score: number;
  rank: number;
}

interface RoomCreateAck {
  roomId: string;
  pin: string;
  questionCount: number;
}

function formatPin(pin: string): string {
  if (pin.length === 6) return `${pin.slice(0, 3)} ${pin.slice(3)}`;
  return pin;
}

function getOptionColor(index: number, theme: 'light' | 'dark'): string {
  const colors = [
    theme === 'dark' ? 'bg-rose-600 border-rose-500' : 'bg-rose-500 border-rose-400',
    theme === 'dark' ? 'bg-sky-600 border-sky-500' : 'bg-sky-500 border-sky-400',
    theme === 'dark' ? 'bg-amber-600 border-amber-500' : 'bg-amber-500 border-amber-400',
    theme === 'dark' ? 'bg-emerald-600 border-emerald-500' : 'bg-emerald-500 border-emerald-400',
  ];
  return colors[index % colors.length];
}

function getOptionLabel(index: number): string {
  return ['锟?, '锟?, '锟?, '锟?][index] || String.fromCharCode(65 + index);
}

const BackgroundOrbs = React.memo(function BackgroundOrbs() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 blur-3xl" />
      <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-96 w-96 rounded-full bg-gradient-to-br from-indigo-500/10 to-pink-500/10 blur-3xl" />
    </div>
  );
});

const PinDisplay = React.memo(function PinDisplay({
  pin,
  qrDataUrl,
  theme,
  onCopy,
  copied,
}: {
  pin: string;
  qrDataUrl: string | null;
  theme: 'light' | 'dark';
  onCopy: () => void;
  copied: boolean;
}) {
  const joinUrl = useMemo(() => {
    const base = typeof window !== 'undefined' ? window.location.origin : 'https://mastri.app';
    return `${base}/play?pin=${pin}`;
  }, [pin]);

  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-2xl mx-auto">
      <div
        className={cn(
          'w-full rounded-3xl border p-8 text-center shadow-2xl backdrop-blur-xl',
          theme === 'dark'
            ? 'bg-slate-800/60 border-slate-700/40'
            : 'bg-white/70 border-white/50'
        )}
      >
        <div className={cn('text-sm font-semibold uppercase tracking-widest mb-4', theme === 'dark' ? 'text-slate-400' : 'text-slate-500')}>
          Game PIN
        </div>
        <div className="text-7xl md:text-9xl font-black tracking-wider text-slate-800 dark:text-white tabular-nums">
          {formatPin(pin)}
        </div>
        <button
          onClick={onCopy}
          className={cn(
            'mt-6 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all duration-300',
            theme === 'dark'
              ? 'bg-slate-700/80 text-slate-200 hover:bg-slate-600'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          )}
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? 'Copied!' : 'Copy PIN'}
        </button>
      </div>

      {qrDataUrl ? (
        <div
          className={cn(
            'rounded-2xl border p-6 shadow-xl backdrop-blur-xl',
            theme === 'dark'
              ? 'bg-slate-800/60 border-slate-700/40'
              : 'bg-white/70 border-white/50'
          )}
        >
          <img src={qrDataUrl} alt="QR Code" className="h-48 w-48 md:h-56 md:w-56" />
          <p className={cn('mt-3 text-center text-xs font-medium', theme === 'dark' ? 'text-slate-400' : 'text-slate-500')}>
            Scan to join
          </p>
        </div>
      ) : (
        <div
          className={cn(
            'rounded-2xl border p-6 shadow-xl backdrop-blur-xl flex flex-col items-center justify-center gap-3',
            theme === 'dark'
              ? 'bg-slate-800/60 border-slate-700/40'
              : 'bg-white/70 border-white/50'
          )}
        >
          <QrCode className={cn('h-12 w-12', theme === 'dark' ? 'text-slate-600' : 'text-slate-300')} />
          <p className={cn('text-xs font-medium', theme === 'dark' ? 'text-slate-500' : 'text-slate-400')}>QR loading...</p>
        </div>
      )}

      <p className={cn('text-sm font-medium', theme === 'dark' ? 'text-slate-400' : 'text-slate-500')}>
        Join at <span className="font-bold text-blue-600 dark:text-blue-400">{joinUrl}</span>
      </p>
    </div>
  );
});

const PlayerList = React.memo(function PlayerList({
  players,
  theme,
}: {
  players: Player[];
  theme: 'light' | 'dark';
}) {
  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users className={cn('h-5 w-5', theme === 'dark' ? 'text-slate-400' : 'text-slate-500')} />
          <span className={cn('text-sm font-semibold', theme === 'dark' ? 'text-slate-300' : 'text-slate-700')}>
            Players
          </span>
        </div>
        <span
          className={cn(
            'rounded-full px-3 py-1 text-xs font-bold',
            theme === 'dark' ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'
          )}
        >
          {players.length}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        <AnimatePresence mode="popLayout">
          {players.map((p) => (
            <motion.div
              key={p.playerId}
              layout
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className={cn(
                'flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold shadow-sm',
                theme === 'dark'
                  ? 'bg-slate-700/80 text-slate-200 border border-slate-600/50'
                  : 'bg-white/80 text-slate-700 border border-slate-200/50'
              )}
            >
              <UserPlus className="h-3.5 w-3.5 opacity-60" />
              {p.playerName}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {players.length === 0 && (
        <div
          className={cn(
            'flex flex-col items-center justify-center gap-3 rounded-2xl border py-12',
            theme === 'dark'
              ? 'bg-slate-800/40 border-slate-700/30 text-slate-500'
              : 'bg-white/40 border-white/40 text-slate-400'
          )}
        >
          <Users className="h-10 w-10 opacity-40" />
          <p className="text-sm font-medium">Waiting for players to join...</p>
        </div>
      )}
    </div>
  );
});

const CountdownAnimation = React.memo(function CountdownAnimation({
  seconds,
  theme,
}: {
  seconds: number;
  theme: 'light' | 'dark';
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh]">
      <AnimatePresence mode="wait">
        <motion.div
          key={seconds}
          initial={{ opacity: 0, scale: 2, rotate: -10 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          exit={{ opacity: 0, scale: 0.5, rotate: 10 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className={cn(
            'text-[10rem] md:text-[16rem] font-black leading-none',
            theme === 'dark' ? 'text-white' : 'text-slate-800'
          )}
        >
          {seconds}
        </motion.div>
      </AnimatePresence>
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn('mt-6 text-xl font-semibold', theme === 'dark' ? 'text-slate-400' : 'text-slate-500')}
      >
        Get ready!
      </motion.p>
    </div>
  );
});

const QuestionDisplay = React.memo(function QuestionDisplay({
  question,
  questionIndex,
  totalQuestions,
  timeLeft,
  theme,
}: {
  question: QuestionData;
  questionIndex: number;
  totalQuestions: number;
  timeLeft: number;
  theme: 'light' | 'dark';
}) {
  const progress = question.timeLimit > 0 ? Math.max(0, Math.min(1, timeLeft / (question.timeLimit * 1000))) : 0;
  const timeLeftSeconds = Math.ceil(timeLeft / 1000);
  const isUrgent = timeLeftSeconds <= 5;

  return (
    <div className="flex flex-col h-full w-full max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <span
            className={cn(
              'rounded-full px-4 py-1.5 text-sm font-bold',
              theme === 'dark' ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'
            )}
          >
            {questionIndex + 1} / {totalQuestions}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Timer className={cn('h-5 w-5', isUrgent ? 'text-red-500' : theme === 'dark' ? 'text-slate-400' : 'text-slate-500')} />
          <span
            className={cn(
              'text-2xl font-black tabular-nums',
              isUrgent ? 'text-red-500 animate-pulse' : theme === 'dark' ? 'text-white' : 'text-slate-800'
            )}
          >
            {timeLeftSeconds}s
          </span>
        </div>
      </div>

      <div className="w-full h-3 rounded-full overflow-hidden mb-8 bg-slate-200 dark:bg-slate-700">
        <motion.div
          className={cn('h-full rounded-full', isUrgent ? 'bg-red-500' : 'bg-gradient-to-r from-blue-500 to-purple-500')}
          initial={{ width: '100%' }}
          animate={{ width: `${progress * 100}%` }}
          transition={{ duration: 0.1, ease: 'linear' }}
        />
      </div>

      <div
        className={cn(
          'rounded-2xl border p-8 mb-8 shadow-lg backdrop-blur-xl',
          theme === 'dark'
            ? 'bg-slate-800/60 border-slate-700/40'
            : 'bg-white/70 border-white/50'
        )}
      >
        <h2 className={cn('text-2xl md:text-3xl font-bold leading-relaxed', theme === 'dark' ? 'text-white' : 'text-slate-800')}>
          {question.text}
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
        {question.options.map((opt, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className={cn(
              'flex items-center gap-4 rounded-2xl border-2 p-5 text-lg font-bold text-white shadow-lg',
              getOptionColor(idx, theme)
            )}
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/20 text-xl">
              {getOptionLabel(idx)}
            </span>
            <span className="leading-snug">{opt}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
});

const LeaderboardDisplay = React.memo(function LeaderboardDisplay({
  entries,
  theme,
  onNext,
  onEnd,
  isLastQuestion,
}: {
  entries: LeaderboardEntry[];
  theme: 'light' | 'dark';
  onNext: () => void;
  onEnd: () => void;
  isLastQuestion: boolean;
}) {
  return (
    <div className="flex flex-col items-center w-full max-w-2xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <BarChart3 className={cn('h-6 w-6', theme === 'dark' ? 'text-slate-300' : 'text-slate-700')} />
        <h2 className={cn('text-2xl font-bold', theme === 'dark' ? 'text-white' : 'text-slate-800')}>Leaderboard</h2>
      </div>

      <div className="w-full space-y-3 mb-8">
        <AnimatePresence>
          {entries.map((entry, idx) => (
            <motion.div
              key={entry.playerId}
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.08 }}
              className={cn(
                'flex items-center gap-4 rounded-xl border p-4 shadow-md backdrop-blur-sm',
                idx === 0
                  ? theme === 'dark'
                    ? 'bg-amber-900/30 border-amber-700/50'
                    : 'bg-amber-50 border-amber-200'
                  : theme === 'dark'
                    ? 'bg-slate-800/60 border-slate-700/40'
                    : 'bg-white/70 border-white/50'
              )}
            >
              <div
                className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-black',
                  idx === 0
                    ? 'bg-amber-500 text-white'
                    : idx === 1
                      ? 'bg-slate-400 text-white'
                      : idx === 2
                        ? 'bg-amber-700 text-white'
                        : theme === 'dark'
                          ? 'bg-slate-700 text-slate-400'
                          : 'bg-slate-100 text-slate-500'
                )}
              >
                {entry.rank}
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    'text-sm font-bold truncate',
                    idx === 0
                      ? theme === 'dark'
                        ? 'text-amber-300'
                        : 'text-amber-800'
                      : theme === 'dark'
                        ? 'text-slate-200'
                        : 'text-slate-700'
                  )}
                >
                  {entry.playerName}
                </p>
              </div>
              <div className="text-right">
                <p
                  className={cn(
                    'text-lg font-black tabular-nums',
                    idx === 0
                      ? theme === 'dark'
                        ? 'text-amber-300'
                        : 'text-amber-700'
                      : theme === 'dark'
                        ? 'text-white'
                        : 'text-slate-800'
                  )}
                >
                  {entry.score.toLocaleString()}
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="flex gap-4">
        {isLastQuestion ? (
          <button
            onClick={onEnd}
            className={cn(
              'flex items-center gap-2 rounded-xl px-8 py-3 text-sm font-semibold transition-all duration-300',
              'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white',
              'shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30',
              'hover:scale-[1.01] active:scale-[0.99]'
            )}
          >
            <Flag className="h-4 w-4" />
            Show Final Results
          </button>
        ) : (
          <button
            onClick={onNext}
            className={cn(
              'flex items-center gap-2 rounded-xl px-8 py-3 text-sm font-semibold transition-all duration-300',
              'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white',
              'shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30',
              'hover:scale-[1.01] active:scale-[0.99]'
            )}
          >
            <SkipForward className="h-4 w-4" />
            Next Question
          </button>
        )}
      </div>
    </div>
  );
});

const FinalResults = React.memo(function FinalResults({
  entries,
  totalQuestions,
  theme,
  onEnd,
  onRestart,
}: {
  entries: LeaderboardEntry[];
  totalQuestions: number;
  theme: 'light' | 'dark';
  onEnd: () => void;
  onRestart: () => void;
}) {
  const winner = entries[0];

  return (
    <div className="flex flex-col items-center w-full max-w-2xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 mb-8"
      >
        <Trophy className="h-8 w-8 text-amber-500" />
        <h2 className={cn('text-3xl font-bold', theme === 'dark' ? 'text-white' : 'text-slate-800')}>Final Results</h2>
      </motion.div>

      {winner && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className={cn(
            'w-full rounded-2xl border p-8 mb-8 text-center shadow-2xl backdrop-blur-xl',
            theme === 'dark'
              ? 'bg-amber-900/20 border-amber-700/40'
              : 'bg-amber-50/80 border-amber-200/60'
          )}
        >
          <Crown className="h-12 w-12 text-amber-500 mx-auto mb-3" />
          <p className={cn('text-lg font-semibold', theme === 'dark' ? 'text-amber-300' : 'text-amber-800')}>Winner</p>
          <p className={cn('text-3xl font-black mt-1', theme === 'dark' ? 'text-white' : 'text-slate-800')}>
            {winner.playerName}
          </p>
          <p className={cn('text-xl font-bold mt-1', theme === 'dark' ? 'text-amber-400' : 'text-amber-700')}>
            {winner.score.toLocaleString()} pts
          </p>
        </motion.div>
      )}

      <div className="w-full space-y-2 mb-8">
        {entries.map((entry, idx) => (
          <motion.div
            key={entry.playerId}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + idx * 0.06 }}
            className={cn(
              'flex items-center gap-3 rounded-xl border p-3 shadow-sm',
              theme === 'dark'
                ? 'bg-slate-800/60 border-slate-700/40'
                : 'bg-white/70 border-white/50'
            )}
          >
            <div
              className={cn(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black',
                idx === 0
                  ? 'bg-amber-500 text-white'
                  : idx === 1
                    ? 'bg-slate-400 text-white'
                    : idx === 2
                      ? 'bg-amber-700 text-white'
                      : theme === 'dark'
                        ? 'bg-slate-700 text-slate-400'
                        : 'bg-slate-100 text-slate-500'
              )}
            >
              {entry.rank}
            </div>
            <div className="flex-1 min-w-0">
              <p className={cn('text-sm font-bold truncate', theme === 'dark' ? 'text-slate-200' : 'text-slate-700')}>
                {entry.playerName}
              </p>
            </div>
            <p className={cn('text-sm font-black tabular-nums', theme === 'dark' ? 'text-white' : 'text-slate-800')}>
              {entry.score.toLocaleString()}
            </p>
          </motion.div>
        ))}
      </div>

      <p className={cn('text-sm mb-6', theme === 'dark' ? 'text-slate-400' : 'text-slate-500')}>
        {totalQuestions} questions played
      </p>

      <div className="flex gap-4">
        <button
          onClick={onRestart}
          className={cn(
            'flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold transition-all duration-300',
            'border backdrop-blur-sm',
            theme === 'dark'
              ? 'bg-slate-800/80 border-slate-700/50 text-slate-300 hover:bg-slate-700 hover:border-slate-600'
              : 'bg-white/80 border-slate-200/50 text-slate-600 hover:bg-white hover:border-slate-300'
          )}
        >
          <RotateCcw className="h-4 w-4" />
          New Game
        </button>
        <button
          onClick={onEnd}
          className={cn(
            'flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold transition-all duration-300',
            'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white',
            'shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30',
            'hover:scale-[1.01] active:scale-[0.99]'
          )}
        >
          <Square className="h-4 w-4" />
          End & Close
        </button>
      </div>
    </div>
  );
});

export default function TeacherGameHostPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { theme } = useTheme();

  const [phase, setPhase] = useState<GamePhase>('loading');
  const [error, setError] = useState<string | null>(null);
  const [pin, setPin] = useState<string>('');
  const [roomId, setRoomId] = useState<string>('');
  const [players, setPlayers] = useState<Player[]>([]);
  const [questionCount, setQuestionCount] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState<QuestionData | null>(null);
  const [deadlineTs, setDeadlineTs] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [finalRankings, setFinalRankings] = useState<LeaderboardEntry[]>([]);
  const [countdownValue, setCountdownValue] = useState(3);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const socketRef = useRef<any>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isHostRef = useRef(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/auth/login');
      return;
    }
    if (user.accountType !== 'teacher') {
      router.replace('/dashboard');
      return;
    }
    setPhase('connecting');
  }, [authLoading, user, router]);

  useEffect(() => {
    if (phase !== 'connecting' || !user?.id) return;

    let mounted = true;

    const initSocket = async () => {
      try {
        const { io } = await import('socket.io-client');
        if (!mounted) return;

        const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001';
        const socket = io(`${baseUrl}/ws/game`, {
          path: '/ws/game',
          transports: ['polling', 'websocket'],
          autoConnect: true,
        });

        socketRef.current = socket;

        socket.on('connect', () => {
          if (!mounted) return;
          socket.emit('room:create', { hostId: user.id }, (ack: RoomCreateAck | { error: string }) => {
            if (!mounted) return;
            if ('error' in ack) {
              setError(ack.error);
              setPhase('error');
              return;
            }
            setRoomId(ack.roomId);
            setPin(ack.pin);
            setQuestionCount(ack.questionCount);
            setPhase('lobby');
            generateQR(ack.pin);
          });
        });

        socket.on('connect_error', (err: Error) => {
          if (!mounted) return;
          console.error('[game] Socket connect error:', err.message);
          setError(`Connection failed: ${err.message}. Please check your network and refresh.`);
          setPhase('error');
        });

        socket.on('disconnect', (reason: string) => {
          if (!mounted) return;
          console.warn('[game] Socket disconnected:', reason);
          if (reason === 'io server disconnect') {
            setError('Disconnected by server');
            setPhase('error');
          } else if (reason === 'io client disconnect') {
            setError('Disconnected');
            setPhase('error');
          } else {
            setError(`Connection lost (${reason}). Please refresh.`);
            setPhase('error');
          }
        });

        socket.on('player:joined', (data: { playerId: string; playerName: string; playerCount: number }) => {
          if (!mounted) return;
          setPlayers((prev) => {
            if (prev.some((p) => p.playerId === data.playerId)) return prev;
            return [...prev, { playerId: data.playerId, playerName: data.playerName }];
          });
        });

        socket.on('player:left', (data: { playerId: string; playerName: string; playerCount: number }) => {
          if (!mounted) return;
          setPlayers((prev) => prev.filter((p) => p.playerId !== data.playerId));
        });

        socket.on('game:countdown', (data: { seconds: number }) => {
          if (!mounted) return;
          setCountdownValue(data.seconds);
          setPhase('countdown');
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
            if (!mounted) return;
            setCurrentQuestionIndex(data.questionIndex);
            setCurrentQuestion(data.question);
            setDeadlineTs(data.deadlineTs);

            const now = Date.now();
            const serverOffset = now - data.serverNow;
            const adjustedDeadline = data.deadlineTs + serverOffset;
            const initialTimeLeft = Math.max(0, adjustedDeadline - now);
            setTimeLeft(initialTimeLeft);
            setPhase('question');

            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
            timerIntervalRef.current = setInterval(() => {
              const remaining = Math.max(0, adjustedDeadline - Date.now());
              setTimeLeft(remaining);
              if (remaining <= 0 && timerIntervalRef.current) {
                clearInterval(timerIntervalRef.current);
                timerIntervalRef.current = null;
              }
            }, 100);
          }
        );

        socket.on('game:leaderboard', (data: { rankings: LeaderboardEntry[] }) => {
          if (!mounted) return;
          setLeaderboard(data.rankings);
          setPhase('leaderboard');
          if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
            timerIntervalRef.current = null;
          }
        });

        socket.on('game:results', (data: { finalRankings: LeaderboardEntry[]; totalQuestions: number }) => {
          if (!mounted) return;
          setFinalRankings(data.finalRankings);
          setQuestionCount(data.totalQuestions);
          setPhase('results');
          if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
            timerIntervalRef.current = null;
          }
        });

        socket.on('host:changed', (data: { newHostId: string }) => {
          if (!mounted) return;
          if (user.id && data.newHostId === user.id) {
            isHostRef.current = true;
          } else {
            isHostRef.current = false;
            setError('You are no longer the host');
            setPhase('error');
          }
        });
      } catch (err) {
        if (!mounted) return;
        setError('Failed to initialize game connection. Please refresh.');
        setPhase('error');
      }
    };

    initSocket();

    return () => {
      mounted = false;
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [phase, user?.id]);

  const generateQR = async (gamePin: string) => {
    try {
      const base = typeof window !== 'undefined' ? window.location.origin : 'https://mastri.app';
      const url = `${base}/play?pin=${gamePin}`;
      const QRCode = await import('qrcode');
      const dataUrl = await QRCode.toDataURL(url, {
        width: 256,
        margin: 2,
        color: {
          dark: '#1e293b',
          light: '#ffffff',
        },
      });
      setQrDataUrl(dataUrl);
    } catch {
      setQrDataUrl(null);
    }
  };

  const handleCopyPin = useCallback(() => {
    if (!pin) return;
    navigator.clipboard.writeText(pin).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [pin]);

  const handleStartGame = useCallback(() => {
    if (socketRef.current && isHostRef.current) {
      socketRef.current.emit('room:start');
    }
  }, []);

  const handleNextQuestion = useCallback(() => {
    if (socketRef.current && isHostRef.current) {
      socketRef.current.emit('room:next-question');
    }
  }, []);

  const handleEndGame = useCallback(() => {
    if (socketRef.current && isHostRef.current) {
      socketRef.current.emit('room:end');
    }
    setTimeout(() => {
      router.push('/dashboard');
    }, 500);
  }, [router]);

  const handleRestart = useCallback(() => {
    window.location.reload();
  }, []);

  const isLastQuestion = currentQuestionIndex >= questionCount - 1;

  if (authLoading || phase === 'loading') {
    return (
      <div
        className={cn(
          'min-h-screen flex flex-col items-center justify-center gap-4',
          'bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900'
        )}
      >
        <BackgroundOrbs />
        <div className="relative">
          <Loader2 className="h-10 w-10 animate-spin text-blue-600 dark:text-blue-400" />
        </div>
        <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Loading...</p>
      </div>
    );
  }

  if (phase === 'error' && error) {
    return (
      <div
        className={cn(
          'min-h-screen flex flex-col items-center justify-center gap-6 px-4',
          'bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900'
        )}
      >
        <BackgroundOrbs />
        <div className="relative flex flex-col items-center gap-4">
          <WifiOff className="h-12 w-12 text-red-500" />
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">Connection Error</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 text-center max-w-md">{error}</p>
          <div className="flex gap-3 mt-2">
            <button
              onClick={() => window.location.reload()}
              className={cn(
                'flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all duration-300',
                'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white',
                'shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30'
              )}
            >
              <RotateCcw className="h-4 w-4" />
              Retry
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className={cn(
                'flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all duration-300',
                'border backdrop-blur-sm',
                theme === 'dark'
                  ? 'bg-slate-800/80 border-slate-700/50 text-slate-300 hover:bg-slate-700'
                  : 'bg-white/80 border-slate-200/50 text-slate-600 hover:bg-white'
              )}
            >
              <ArrowLeft className="h-4 w-4" />
              Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'connecting') {
    return (
      <div
        className={cn(
          'min-h-screen flex flex-col items-center justify-center gap-4',
          'bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900'
        )}
      >
        <BackgroundOrbs />
        <div className="relative">
          <Loader2 className="h-10 w-10 animate-spin text-blue-600 dark:text-blue-400" />
        </div>
        <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Connecting to game server...</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'min-h-screen flex flex-col',
        'bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900'
      )}
    >
      <BackgroundOrbs />

      <div className="relative z-10 flex items-center justify-between px-4 md:px-8 py-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/dashboard')}
            className={cn(
              'flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-300',
              'border backdrop-blur-sm',
              theme === 'dark'
                ? 'bg-slate-800/80 border-slate-700/50 text-slate-300 hover:bg-slate-700'
                : 'bg-white/80 border-slate-200/50 text-slate-600 hover:bg-white'
            )}
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Exit</span>
          </button>
          <div className="flex items-center gap-2">
            <Monitor className={cn('h-5 w-5', theme === 'dark' ? 'text-blue-400' : 'text-blue-600')} />
            <span className={cn('text-sm font-bold', theme === 'dark' ? 'text-white' : 'text-slate-800')}>Host</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {pin && phase !== 'countdown' && (
            <div
              className={cn(
                'hidden md:flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold',
                theme === 'dark'
                  ? 'bg-slate-800/80 border border-slate-700/50 text-white'
                  : 'bg-white/80 border border-slate-200/50 text-slate-800'
              )}
            >
              <Hash className="h-4 w-4 text-blue-500" />
              {formatPin(pin)}
            </div>
          )}

          <button
            onClick={() => setSoundEnabled((v) => !v)}
            className={cn(
              'rounded-xl p-2 transition-all duration-300',
              'border backdrop-blur-sm',
              theme === 'dark'
                ? 'bg-slate-800/80 border-slate-700/50 text-slate-300 hover:bg-slate-700'
                : 'bg-white/80 border-slate-200/50 text-slate-600 hover:bg-white'
            )}
          >
            {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 md:px-8 py-6">
        <AnimatePresence mode="wait">
          {phase === 'lobby' && (
            <motion.div
              key="lobby"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full flex flex-col items-center gap-8"
            >
              <PinDisplay pin={pin} qrDataUrl={qrDataUrl} theme={theme} onCopy={handleCopyPin} copied={copied} />

              <PlayerList players={players} theme={theme} />

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleStartGame}
                disabled={players.length === 0}
                className={cn(
                  'flex items-center gap-3 rounded-2xl px-10 py-4 text-lg font-bold transition-all duration-300',
                  'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100',
                  'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white',
                  'shadow-xl shadow-emerald-500/25 hover:shadow-2xl hover:shadow-emerald-500/30'
                )}
              >
                <Play className="h-6 w-6" />
                Start Game
                {players.length > 0 && (
                  <span className="ml-1 text-sm font-semibold opacity-80">({players.length} players)</span>
                )}
              </motion.button>
            </motion.div>
          )}

          {phase === 'countdown' && (
            <motion.div
              key="countdown"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full"
            >
              <CountdownAnimation seconds={countdownValue} theme={theme} />
            </motion.div>
          )}

          {phase === 'question' && currentQuestion && (
            <motion.div
              key={`question-${currentQuestionIndex}`}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="w-full h-full flex flex-col"
            >
              <QuestionDisplay
                question={currentQuestion}
                questionIndex={currentQuestionIndex}
                totalQuestions={questionCount}
                timeLeft={timeLeft}
                theme={theme}
              />
            </motion.div>
          )}

          {phase === 'leaderboard' && (
            <motion.div
              key="leaderboard"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full"
            >
              <LeaderboardDisplay
                entries={leaderboard}
                theme={theme}
                onNext={handleNextQuestion}
                onEnd={handleEndGame}
                isLastQuestion={isLastQuestion}
              />
            </motion.div>
          )}

          {phase === 'results' && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              className="w-full"
            >
              <FinalResults
                entries={finalRankings}
                totalQuestions={questionCount}
                theme={theme}
                onEnd={handleEndGame}
                onRestart={handleRestart}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="relative z-10 flex items-center justify-between px-4 md:px-8 py-3 border-t backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className={cn('h-2 w-2 rounded-full', socketRef.current?.connected ? 'bg-emerald-500' : 'bg-red-500')} />
          <span className={cn('text-xs font-medium', theme === 'dark' ? 'text-slate-400' : 'text-slate-500')}>
            {socketRef.current?.connected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
        <div className="flex items-center gap-4">
          {phase === 'lobby' && (
            <span className={cn('text-xs font-medium', theme === 'dark' ? 'text-slate-400' : 'text-slate-500')}>
              {players.length} player{players.length !== 1 ? 's' : ''} joined
            </span>
          )}
          {phase === 'question' && (
            <span className={cn('text-xs font-medium', theme === 'dark' ? 'text-slate-400' : 'text-slate-500')}>
              Q{currentQuestionIndex + 1} / {questionCount}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
