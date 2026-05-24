'use client';

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Results" };

'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';

import { io } from 'socket.io-client';
import { useTheme } from '@/components/theme/ThemeProvider';
import { cn } from '@/lib/utils';
import { Trophy, Home, RotateCcw, Medal, Crown, User } from 'lucide-react';

interface PlayerScore {
  playerId: string;
  playerName: string;
  score: number;
  rank: number;
}

interface GameResults {
  finalRankings: PlayerScore[];
  totalQuestions: number;
}

function PodiumPlace({
  rank,
  player,
  isCurrentPlayer,
  theme,
  delay,
}: {
  rank: number;
  player: PlayerScore;
  isCurrentPlayer: boolean;
  theme: string;
  delay: number;
}) {
  const colors = rank === 1
    ? {
        bg: 'bg-gradient-to-b from-yellow-100 to-amber-200 dark:from-yellow-900/40 dark:to-amber-800/40',
        border: 'border-yellow-400/50 dark:border-yellow-600/50',
        text: 'text-amber-700 dark:text-yellow-300',
      }
    : rank === 2
    ? {
        bg: 'bg-gradient-to-b from-slate-100 to-slate-200 dark:from-slate-700/40 dark:to-slate-600/40',
        border: 'border-slate-300/50 dark:border-slate-500/50',
        text: 'text-slate-600 dark:text-slate-300',
      }
    : {
        bg: 'bg-gradient-to-b from-orange-100 to-orange-200 dark:from-orange-900/40 dark:to-orange-800/40',
        border: 'border-orange-400/50 dark:border-orange-600/50',
        text: 'text-orange-700 dark:text-orange-300',
      };

  const heights: Record<number, string> = { 1: 'h-36', 2: 'h-28', 3: 'h-20' };

  const rankBadgeBg = rank === 1
    ? 'bg-gradient-to-br from-yellow-400 to-amber-500'
    : rank === 2
    ? 'bg-gradient-to-br from-slate-300 to-slate-400'
    : 'bg-gradient-to-br from-orange-400 to-orange-500';

  return (
    <div
      className="flex flex-col items-center gap-3 animate-in"
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'both', animationDuration: '600ms' }}
    >
      <div
        className={cn(
          'relative flex h-16 w-16 items-center justify-center rounded-full border-2 shadow-lg',
          rank === 1 && 'ring-4 ring-yellow-400/40 dark:ring-yellow-500/50 ring-offset-2',
          isCurrentPlayer && 'ring-4 ring-blue-500/60 dark:ring-blue-400/60 ring-offset-2',
          colors.border,
          colors.bg,
        )}
      >
        {rank === 1 ? (
          <Crown className={cn('h-7 w-7', colors.text)} />
        ) : (
          <Medal className={cn('h-7 w-7', colors.text)} />
        )}
        <div
          className={cn(
            'absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white shadow-md',
            rankBadgeBg,
          )}
        >
          {rank}
        </div>
      </div>

      <div className="flex flex-col items-center gap-1">
        <span
          className={cn(
            'max-w-[120px] truncate text-sm font-semibold text-center',
            isCurrentPlayer ? 'text-blue-600 dark:text-blue-400' : theme === 'dark' ? 'text-white' : 'text-slate-800',
          )}
        >
          {player.playerName}
          {isCurrentPlayer && ' (You)'}
        </span>
        <span className={cn('text-lg font-bold', colors.text)}>
          {player.score.toLocaleString()}
        </span>
      </div>

      <div
        className={cn(
          'w-24 rounded-t-xl flex flex-col items-center justify-end pb-3 border-t-2 border-l-2 border-r-2 shadow-xl',
          heights[rank],
          colors.bg,
          colors.border,
          rank === 1 && 'shadow-2xl',
        )}
      >
        <span className={cn('text-xs font-bold tracking-widest uppercase', colors.text)}>
          {rank === 1 ? '1st' : rank === 2 ? '2nd' : '3rd'}
        </span>
      </div>
    </div>
  );
}

function LeaderboardRow({
  player,
  rank,
  isCurrentPlayer,
  theme,
  delay,
}: {
  player: PlayerScore;
  rank: number;
  isCurrentPlayer: boolean;
  theme: string;
  delay: number;
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-4 rounded-xl px-4 py-3 transition-all duration-300 animate-in border backdrop-blur-sm',
        isCurrentPlayer
          ? theme === 'dark' ? 'bg-blue-900/30 border-blue-500/40' : 'bg-blue-50 border-blue-300/60'
          : theme === 'dark' ? 'bg-slate-800/40 border-slate-700/30' : 'bg-white/60 border-white/40',
      )}
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'both', animationDuration: '500ms' }}
    >
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center">
        {rank === 1 ? (
          <Crown className="h-5 w-5 text-yellow-500 dark:text-yellow-400" />
        ) : rank === 2 ? (
          <Medal className="h-5 w-5 text-slate-400" />
        ) : rank === 3 ? (
          <Medal className="h-5 w-5 text-orange-500 dark:text-orange-400" />
        ) : (
          <span className={cn('flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold', theme === 'dark' ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-600')}>
            {rank}
          </span>
        )}
      </div>

      <div
        className={cn(
          'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full',
          isCurrentPlayer ? 'bg-blue-500/20 dark:bg-blue-400/20' : theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200',
        )}
      >
        <User
          className={cn(
            'h-4 w-4',
            isCurrentPlayer ? 'text-blue-500 dark:text-blue-400' : theme === 'dark' ? 'text-slate-400' : 'text-slate-500',
          )}
        />
      </div>

      <div className="flex-1 min-w-0">
        <p
          className={cn(
            'truncate text-sm font-semibold',
            isCurrentPlayer ? 'text-blue-600 dark:text-blue-400' : theme === 'dark' ? 'text-white' : 'text-slate-800',
          )}
        >
          {player.playerName}
          {isCurrentPlayer && <span className="ml-2 text-xs font-normal text-blue-500 dark:text-blue-400">You</span>}
        </p>
      </div>

      <div className="flex flex-shrink-0 items-center gap-1">
        <Trophy
          className={cn(
            'h-3.5 w-3.5',
            rank === 1 ? 'text-yellow-500 dark:text-yellow-400' : theme === 'dark' ? 'text-slate-500' : 'text-slate-400',
          )}
        />
        <span
          className={cn(
            'text-sm font-bold',
            isCurrentPlayer
              ? 'text-blue-600 dark:text-blue-400'
              : rank === 1 ? 'text-yellow-600 dark:text-yellow-400'
              : theme === 'dark' ? 'text-slate-300' : 'text-slate-700',
          )}
        >
          {player.score.toLocaleString()}
        </span>
      </div>
    </div>
  );
}

function ConfettiPiece({ index }: { index: number }) {
  const colors = ['bg-yellow-400', 'bg-blue-500', 'bg-purple-500', 'bg-green-400', 'bg-pink-400', 'bg-orange-400'];
  const color = colors[index % colors.length];
  const left = `${(index * 17 + index * 7) % 100}%`;
  const delay = `${(index * 31) % 2000}ms`;
  const duration = `${2000 + (index * 137) % 3000}ms`;
  const size = `${6 + (index % 8)}px`;

  return (
    <div
      className={cn('absolute top-0 rounded-sm opacity-80', color)}
      style={{ left, width: size, height: size, animation: `confetti-fall ${duration} ${delay} ease-in forwards` }}
    />
  );
}

export default function GameResultsPage() {
  const params = useParams();
  const router = useRouter();
  const { theme } = useTheme();
  const gameId = params.gameId as string;

  const [results, setResults] = useState<GameResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);
  const [confettiCount] = useState(50);

  const getApiBase = useCallback(() => {
    if (typeof window !== 'undefined') {
      return (
        (window as unknown as { __NEXT_DATA__?: { props: { pageProps: { env?: { NEXT_PUBLIC_API_BASE_URL?: string } } } } }).__NEXT_DATA__
          ?.props?.pageProps?.env?.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001'
      );
    }
    return process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';
  }, []);

  useEffect(() => {
    const storedPlayerId = sessionStorage.getItem('playerId');

    if (!storedPlayerId) {
      setError('No active game session. Please join a game first.');
      setLoading(false);
      return;
    }

    setCurrentPlayerId(storedPlayerId);

    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001';
    const socket = io(`${origin}/ws/game`, {
      path: '/ws/game',
      transports: ['polling'],
      reconnectionAttempts: 3,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      socket.emit(
        'room:rejoin',
        { roomId: gameId, playerId: storedPlayerId },
        (joinResponse: { success: boolean; message?: string; finalRankings?: PlayerScore[]; totalQuestions?: number }) => {
          if (joinResponse.success && joinResponse.finalRankings) {
            setResults({
              finalRankings: joinResponse.finalRankings,
              totalQuestions: joinResponse.totalQuestions ?? 0,
            });
            setLoading(false);
          } else if (!joinResponse.success) {
            setError(joinResponse.message ?? 'Could not reconnect to game.');
            setLoading(false);
          }
        },
      );
    });

    socket.on(
      'game:results',
      (data: { finalRankings: PlayerScore[]; totalQuestions: number }) => {
        setResults(data);
        setLoading(false);
      },
    );

    socket.on('connect_error', () => {
      setError('Connection lost. Please refresh.');
      setLoading(false);
    });

    return () => { socket.disconnect(); };
  }, [gameId, getApiBase]);

  const handlePlayAgain = () => {
    sessionStorage.removeItem('roomId');
    sessionStorage.removeItem('playerId');
    sessionStorage.removeItem('socketId');
    sessionStorage.removeItem('gamePIN');
    router.push('/play');
  };

  const handleLeave = () => {
    sessionStorage.removeItem('roomId');
    sessionStorage.removeItem('playerId');
    sessionStorage.removeItem('socketId');
    sessionStorage.removeItem('gamePIN');
    router.push('/dashboard');
  };

  const currentRank = results?.finalRankings.find((p) => p.playerId === currentPlayerId)?.rank;
  const isWinner = currentRank === 1;
  const topThree = results?.finalRankings.slice(0, 3) ?? [];
  const restOfLeaderboard = results?.finalRankings.slice(3) ?? [];

  if (loading) {
    return (
      <div
        className={cn(
          'min-h-screen flex flex-col items-center justify-center gap-4',
          theme === 'dark' ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900' : 'bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50',
        )}
      >
        <Trophy className="h-16 w-16 animate-pulse text-yellow-400" />
        <p className={cn('text-lg font-semibold', theme === 'dark' ? 'text-white' : 'text-slate-700')}>
          Calculating results…
        </p>
        <p className={cn('text-sm', theme === 'dark' ? 'text-slate-400' : 'text-slate-500')}>
          Sit tight while scores are tallied!
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={cn(
          'min-h-screen flex flex-col items-center justify-center gap-4 p-6',
          theme === 'dark' ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900' : 'bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50',
        )}
      >
        <div
          className={cn(
            'rounded-2xl border p-6 max-w-md w-full text-center backdrop-blur-xl shadow-2xl',
            theme === 'dark' ? 'bg-slate-800/60 border-slate-700/40' : 'bg-white/60 border-white/40',
          )}
        >
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={() => router.push('/dashboard')}
            className={cn(
              'w-full rounded-xl py-2.5 text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-300',
              theme === 'dark'
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-lg shadow-blue-500/25'
                : 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/25',
            )}
          >
            <Home className="h-4 w-4" />
            Return Home
          </button>
        </div>
      </div>
    );
  }

  if (!results) return null;

  return (
    <div
      className={cn(
        'min-h-screen relative overflow-hidden',
        theme === 'dark' ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900' : 'bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50',
      )}
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-gradient-to-br from-yellow-400/10 to-orange-500/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-gradient-to-br from-purple-500/10 to-blue-500/10 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-96 w-96 rounded-full bg-gradient-to-br from-blue-500/5 to-purple-500/5 blur-3xl" />
      </div>

      {isWinner && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
          {Array.from({ length: confettiCount }).map((_, i) => (
            <ConfettiPiece key={i} index={i} />
          ))}
        </div>
      )}

      <div className="relative z-10 min-h-screen flex flex-col items-center px-4 py-8">
        <div className="text-center mb-8 animate-in" style={{ animationDelay: '0ms', animationFillMode: 'both', animationDuration: '600ms' }}>
          <div className="flex items-center justify-center gap-2 mb-1">
            <Trophy
              className={cn(
                'h-8 w-8',
                isWinner ? 'text-yellow-400 dark:text-yellow-300' : theme === 'dark' ? 'text-slate-400' : 'text-slate-500',
              )}
            />
            <h1 className={cn('text-3xl font-bold', theme === 'dark' ? 'text-white' : 'text-slate-800')}>
              {isWinner ? 'You Won!' : 'Game Over!'}
            </h1>
          </div>
          <p className={cn('text-sm', theme === 'dark' ? 'text-slate-400' : 'text-slate-500')}>
            {results.totalQuestions} questions · {results.finalRankings.length} players
          </p>
          {currentRank && (
            <div
              className={cn(
                'mt-2 inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold border',
                currentRank === 1
                  ? 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700'
                  : currentRank === 2
                  ? 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600'
                  : currentRank === 3
                  ? 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-700'
                  : 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700',
              )}
            >
              {currentRank === 1 ? <Crown className="h-3.5 w-3.5" /> : <Medal className="h-3.5 w-3.5" />}
              Your rank: {currentRank}
              {currentRank === 1 ? 'st' : currentRank === 2 ? 'nd' : currentRank === 3 ? 'rd' : 'th'}
            </div>
          )}
        </div>

        <div className="mb-8 w-full max-w-2xl animate-in" style={{ animationDelay: '200ms', animationFillMode: 'both', animationDuration: '600ms' }}>
          <div className="flex items-end justify-center gap-4">
            {topThree[1] && (
              <PodiumPlace rank={2} player={topThree[1]} isCurrentPlayer={topThree[1].playerId === currentPlayerId} theme={theme} delay={400} />
            )}
            {topThree[0] && (
              <PodiumPlace rank={1} player={topThree[0]} isCurrentPlayer={topThree[0].playerId === currentPlayerId} theme={theme} delay={200} />
            )}
            {topThree[2] && (
              <PodiumPlace rank={3} player={topThree[2]} isCurrentPlayer={topThree[2].playerId === currentPlayerId} theme={theme} delay={600} />
            )}
          </div>
        </div>

        {restOfLeaderboard.length > 0 && (
          <div
            className={cn(
              'w-full max-w-2xl rounded-2xl border p-4 backdrop-blur-xl shadow-2xl mb-6 animate-in',
              theme === 'dark' ? 'bg-slate-800/40 border-slate-700/30' : 'bg-white/60 border-white/40',
            )}
            style={{ animationDelay: '800ms', animationFillMode: 'both', animationDuration: '600ms' }}
          >
            <h2 className={cn('text-sm font-semibold uppercase tracking-widest mb-3 px-1', theme === 'dark' ? 'text-slate-400' : 'text-slate-500')}>
              Full Rankings
            </h2>
            <div className="flex flex-col gap-2">
              {restOfLeaderboard.map((player, index) => (
                <LeaderboardRow
                  key={player.playerId}
                  player={player}
                  rank={index + 4}
                  isCurrentPlayer={player.playerId === currentPlayerId}
                  theme={theme}
                  delay={900 + index * 80}
                />
              ))}
            </div>
          </div>
        )}

        <div
          className="flex flex-col gap-3 w-full max-w-sm animate-in"
          style={{ animationDelay: '1200ms', animationFillMode: 'both', animationDuration: '600ms' }}
        >
          <button
            onClick={handlePlayAgain}
            className={cn(
              'w-full rounded-xl py-3.5 text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-300 hover:scale-[1.01] active:scale-[0.99]',
              theme === 'dark'
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30'
                : 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30',
            )}
          >
            <RotateCcw className="h-4 w-4" />
            Play Again
          </button>
          <button
            onClick={handleLeave}
            className={cn(
              'flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 border backdrop-blur-sm transition-all duration-300',
              theme === 'dark'
                ? 'bg-slate-800/80 border-slate-700/50 text-slate-300 hover:bg-slate-700 hover:border-slate-600'
                : 'bg-white/80 border-slate-200/50 text-slate-600 hover:bg-white hover:border-slate-300',
            )}
          >
            <Home className="h-4 w-4" />
            Leave
          </button>
        </div>

        <p className={cn('mt-6 text-xs', theme === 'dark' ? 'text-slate-600' : 'text-slate-400')}>
          Scores are calculated based on correct answers and response time
        </p>
      </div>

      <style>{`
        @keyframes confetti-fall {
          0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
