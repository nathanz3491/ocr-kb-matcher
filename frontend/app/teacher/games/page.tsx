'use client';

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Games" };

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

  Gamepad2, ChevronRight, Loader2, AlertCircle,
import {
  Calendar, Users, Trophy, ArrowRight
} from 'lucide-react';

interface GameHistoryItem {
  gameId: string;
  pin: string;
  createdAt: string;
  playerCount: number;
  topScorer?: { name: string; score: number };
  status: 'completed' | 'cancelled';
}

export default function TeacherGamesPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const { user } = useAuth();

  const [games, setGames] = useState<GameHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      router.push('/');
      return;
    }
    if (user.accountType !== 'teacher') {
      router.push('/');
      return;
    }
    const fetchGames = async () => {
      setLoading(true);
      try {
        const res = await teacherApi.getTeacherGameHistory();
        if (res.success && res.data) {
          setGames(res.data);
        } else {
          setError(res.error || 'Failed to load game history');
        }
      } catch {
        setError('Failed to load game history');
      } finally {
        setLoading(false);
      }
    };
    fetchGames();
  }, [user, router]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!user || user.accountType !== 'teacher') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <Navigation />
        <div className="flex items-center justify-center h-[calc(100vh-80px)]">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <Navigation />
        <div className="flex items-center justify-center h-[calc(100vh-80px)]">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <Navigation />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 dark:text-white">Game History</h1>
            <p className="mt-2 text-slate-600 dark:text-slate-400">
              Review past hosted quiz games and player performance
            </p>
          </div>
          <button
            onClick={() => router.push('/teacher/game/new')}
            className={cn(
              'flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold',
              'transition-all duration-300 hover:scale-[1.01] active:scale-[0.99]',
              theme === 'dark'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white'
                : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white',
              'shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/30'
            )}
          >
            <Gamepad2 className="h-5 w-5" />
            Host New Game
          </button>
        </div>

        {error && (
          <div className={cn(
            'rounded-2xl border p-6 text-center mb-6',
            theme === 'dark' ? 'bg-red-900/20 border-red-800/30' : 'bg-red-50 border-red-200'
          )}>
            <AlertCircle className="mx-auto h-8 w-8 text-red-500 mb-3" />
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {games.length === 0 && !error && (
          <div className={cn(
            'rounded-2xl border p-12 text-center',
            theme === 'dark' ? 'bg-slate-800/40 border-slate-700/30' : 'bg-white/60 border-white/40'
          )}>
            <Gamepad2 className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600 mb-4" />
            <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">No Games Hosted Yet</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 max-w-md mx-auto">
              Host your first quiz game to see results here. Students can join using the game PIN.
            </p>
            <button
              onClick={() => router.push('/teacher/game/new')}
              className={cn(
                'rounded-xl px-6 py-3 text-sm font-semibold',
                theme === 'dark'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white'
                  : 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white',
                'shadow-lg hover:scale-[1.01] active:scale-[0.99]'
              )}
            >
              Host Your First Game
            </button>
          </div>
        )}

        {games.length > 0 && (
          <div className="space-y-4">
            {games.map((game) => (
              <button
                key={game.gameId}
                onClick={() => router.push(`/teacher/games/${game.gameId}`)}
                className={cn(
                  'w-full rounded-2xl border p-6 text-left transition-all duration-300 hover:scale-[1.01]',
                  theme === 'dark'
                    ? 'bg-slate-800/40 border-slate-700/30 hover:bg-slate-800/60'
                    : 'bg-white/60 border-white/40 hover:bg-white/80'
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      'h-12 w-12 rounded-xl flex items-center justify-center',
                      game.status === 'completed'
                        ? 'bg-gradient-to-br from-emerald-500 to-teal-500'
                        : 'bg-gradient-to-br from-slate-500 to-slate-600'
                    )}>
                      <Gamepad2 className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                          Game #{game.pin}
                        </h3>
                        <span className={cn(
                          'rounded-full px-2 py-0.5 text-xs font-medium',
                          game.status === 'completed'
                            ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                        )}>
                          {game.status === 'completed' ? 'Completed' : 'Cancelled'}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {formatDate(game.createdAt)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" />
                          {game.playerCount} players
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {game.topScorer && (
                      <div className={cn(
                        'rounded-xl px-3 py-2 text-center',
                        theme === 'dark' ? 'bg-slate-700/50' : 'bg-slate-50'
                      )}>
                        <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                          <Trophy className="h-3 w-3 text-yellow-500" />
                          Top Scorer
                        </div>
                        <div className="text-sm font-bold text-slate-800 dark:text-white">
                          {game.topScorer.name}
                        </div>
                        <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                          {game.topScorer.score} pts
                        </div>
                      </div>
                    )}
                    <ChevronRight className={cn(
                      'h-5 w-5',
                      theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
                    )} />
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
