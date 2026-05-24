'use client';

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Teacher" };

'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

  Gamepad2, ChevronLeft, Loader2, AlertCircle,
import {
  Calendar, Users, Trophy, BarChart3, Target,
  Medal, Crown
} from 'lucide-react';

interface GameResult {
  gameId: string;
  pin: string;
  createdAt: string;
  endedAt?: string;
  playerCount: number;
  status: 'completed' | 'cancelled';
  leaderboard: Array<{
    playerId: string;
    playerName: string;
    score: number;
    rank: number;
    correctAnswers: number;
    totalQuestions: number;
  }>;
  questions: Array<{
    questionId: string;
    text: string;
    correctRate: number;
    averageTimeMs: number;
  }>;
}

export default function TeacherGameDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { theme } = useTheme();
  const { user } = useAuth();
  const gameId = params.id as string;

  const [game, setGame] = useState<GameResult | null>(null);
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
    if (!gameId) return;
    const fetchGame = async () => {
      setLoading(true);
      try {
        const res = await teacherApi.getTeacherGameResults(gameId);
        if (res.success && res.data) {
          setGame(res.data);
        } else {
          setError(res.error || 'Failed to load game results');
        }
      } catch {
        setError('Failed to load game results');
      } finally {
        setLoading(false);
      }
    };
    fetchGame();
  }, [user, router, gameId]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="h-5 w-5 text-yellow-500" />;
    if (rank === 2) return <Medal className="h-5 w-5 text-slate-400" />;
    if (rank === 3) return <Medal className="h-5 w-5 text-amber-600" />;
    return <span className="text-sm font-bold text-slate-500 dark:text-slate-400 w-5 text-center">{rank}</span>;
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
        <button
          onClick={() => router.push('/teacher/games')}
          className={cn(
            'flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium mb-6 transition-all',
            theme === 'dark'
              ? 'text-slate-300 hover:text-white hover:bg-slate-800'
              : 'text-slate-600 hover:text-slate-800 hover:bg-slate-100'
          )}
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Game History
        </button>

        {error && (
          <div className={cn(
            'rounded-2xl border p-6 text-center',
            theme === 'dark' ? 'bg-red-900/20 border-red-800/30' : 'bg-red-50 border-red-200'
          )}>
            <AlertCircle className="mx-auto h-8 w-8 text-red-500 mb-3" />
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {game && (
          <div className="space-y-6">
            <div className={cn(
              'rounded-2xl border p-6',
              theme === 'dark' ? 'bg-slate-800/40 border-slate-700/30' : 'bg-white/60 border-white/40'
            )}>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    'h-14 w-14 rounded-xl flex items-center justify-center',
                    game.status === 'completed'
                      ? 'bg-gradient-to-br from-emerald-500 to-teal-500'
                      : 'bg-gradient-to-br from-slate-500 to-slate-600'
                  )}>
                    <Gamepad2 className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
                        Game #{game.pin}
                      </h1>
                      <span className={cn(
                        'rounded-full px-2.5 py-0.5 text-xs font-medium',
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
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className={cn(
                'rounded-2xl border p-6',
                theme === 'dark' ? 'bg-slate-800/40 border-slate-700/30' : 'bg-white/60 border-white/40'
              )}>
                <div className="flex items-center gap-3 mb-6">
                  <Trophy className="h-5 w-5 text-yellow-500" />
                  <h2 className="text-lg font-bold text-slate-800 dark:text-white">Final Leaderboard</h2>
                </div>

                {game.leaderboard.length === 0 ? (
                  <p className="text-center text-sm text-slate-500 dark:text-slate-400 py-4">
                    No players participated
                  </p>
                ) : (
                  <div className="space-y-3">
                    {game.leaderboard.map((entry) => (
                      <div
                        key={entry.playerId}
                        className={cn(
                          'flex items-center gap-3 rounded-xl p-3',
                          entry.rank === 1
                            ? 'bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 border border-yellow-200 dark:border-yellow-800'
                            : theme === 'dark' ? 'bg-slate-700/50' : 'bg-slate-50'
                        )}
                      >
                        <div className="flex items-center justify-center w-8">
                          {getRankIcon(entry.rank)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-800 dark:text-white truncate">
                            {entry.playerName}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {entry.correctAnswers}/{entry.totalQuestions} correct
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-slate-800 dark:text-white">
                            {entry.score}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">pts</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className={cn(
                'rounded-2xl border p-6',
                theme === 'dark' ? 'bg-slate-800/40 border-slate-700/30' : 'bg-white/60 border-white/40'
              )}>
                <div className="flex items-center gap-3 mb-6">
                  <BarChart3 className="h-5 w-5 text-blue-500" />
                  <h2 className="text-lg font-bold text-slate-800 dark:text-white">Per-Question Stats</h2>
                </div>

                {game.questions.length === 0 ? (
                  <p className="text-center text-sm text-slate-500 dark:text-slate-400 py-4">
                    No question data available
                  </p>
                ) : (
                  <div className="space-y-4">
                    {game.questions.map((q, idx) => (
                      <div
                        key={q.questionId}
                        className={cn(
                          'rounded-xl p-4',
                          theme === 'dark' ? 'bg-slate-700/50' : 'bg-slate-50'
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-800 dark:text-white">
                              Q{idx + 1}. {q.text}
                            </p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 mt-3">
                          <div>
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="text-slate-500 dark:text-slate-400">Correct Rate</span>
                              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                {Math.round(q.correctRate)}%
                              </span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-600">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all"
                                style={{ width: `${q.correctRate}%` }}
                              />
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Target className="h-4 w-4 text-slate-400" />
                            <div>
                              <p className="text-xs text-slate-500 dark:text-slate-400">Avg Response</p>
                              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                {(q.averageTimeMs / 1000).toFixed(1)}s
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
