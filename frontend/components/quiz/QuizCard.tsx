'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { Brain, Play, TrendingUp, Award, Clock } from 'lucide-react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

interface QuizStats {
  totalQuizzes: number;
  averageScore: number;
  highestScore: number;
  recentScores: Array<{ date: string; score: number }>;
}

interface QuizCardProps {
  jobId?: string;
}

export function QuizCard({ jobId }: QuizCardProps) {
  const router = useRouter();
  const [stats, setStats] = useState<QuizStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchQuizStats();
  }, []);

  const fetchQuizStats = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/quiz/stats`);
      if (res.data.success) {
        setStats(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching quiz stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const startQuiz = () => {
    if (jobId) {
      router.push(`/quiz/${jobId}`);
    }
  };

  if (loading) {
    return (
      <div className="mb-8 h-48 animate-pulse rounded-2xl border border-white/40 bg-white/50" />
    );
  }

  const hasQuizzes = stats && stats.totalQuizzes > 0;

  return (
    <div className="mb-8 rounded-2xl border border-white/40 bg-white/70 p-6 shadow-lg backdrop-blur-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-xl font-bold text-slate-800">
          <Brain className="h-5 w-5 text-violet-600" />
          Knowledge Check
        </h2>
        {hasQuizzes && (
          <div className="flex items-center gap-4 text-sm">
            <span className="text-slate-600">
              Taken: <strong className="text-violet-600">{stats?.totalQuizzes}</strong>
            </span>
            <span className="text-slate-600">
              Avg: <strong className="text-green-600">{stats?.averageScore.toFixed(1)}/5</strong>
            </span>
          </div>
        )}
      </div>

      {!hasQuizzes ? (
        <div className="rounded-xl bg-gradient-to-br from-violet-50 to-purple-50 p-6 text-center">
          <Brain className="mx-auto mb-3 h-12 w-12 text-violet-400" />
          <p className="mb-2 font-medium text-slate-800">Test Your Knowledge</p>
          <p className="mb-4 text-sm text-slate-600">
            Take a 5-question quiz to assess your understanding
          </p>
          {jobId ? (
            <button
              onClick={startQuiz}
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-violet-500 to-purple-500 px-4 py-2 text-sm font-medium text-white shadow-md transition-all hover:from-violet-600 hover:to-purple-600"
            >
              <Play className="h-4 w-4" />
              Start Quiz
            </button>
          ) : (
            <p className="text-sm text-slate-500">
              Upload a document to generate a quiz
            </p>
          )}
        </div>
      ) : (
        <>
          {/* Recent Scores Graph */}
          <div className="mb-4">
            <p className="mb-2 text-sm font-medium text-slate-700">Recent Scores</p>
            <div className="flex h-24 items-end gap-2">
              {stats?.recentScores.slice(-7).map((score, idx) => (
                <div
                  key={idx}
                  className="group relative flex-1"
                  style={{ height: `${(score.score / 5) * 100}%` }}
                >
                  <div
                    className={`h-full w-full rounded-t transition-all ${
                      score.score >= 4
                        ? 'bg-gradient-to-t from-green-400 to-green-500'
                        : score.score >= 3
                          ? 'bg-gradient-to-t from-amber-400 to-amber-500'
                          : 'bg-gradient-to-t from-rose-400 to-rose-500'
                    }`}
                  />
                  <div className="absolute -top-8 left-1/2 hidden -translate-x-1/2 rounded bg-slate-800 px-2 py-1 text-xs text-white group-hover:block">
                    {score.score}/5
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-1 flex justify-between text-xs text-slate-400">
              <span>Older</span>
              <span>Recent</span>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="mb-4 grid grid-cols-3 gap-3">
            <div className="rounded-lg bg-violet-50 dark:bg-violet-900/30 p-3 text-center">
              <TrendingUp className="mx-auto mb-1 h-4 w-4 text-violet-600 dark:text-violet-400" />
              <p className="text-lg font-bold text-violet-700 dark:text-violet-300">{stats?.averageScore.toFixed(1)}</p>
              <p className="text-xs text-violet-600 dark:text-violet-400">Average</p>
            </div>
            <div className="rounded-lg bg-amber-50 dark:bg-amber-900/30 p-3 text-center">
              <Award className="mx-auto mb-1 h-4 w-4 text-amber-600 dark:text-amber-400" />
              <p className="text-lg font-bold text-amber-700 dark:text-amber-300">{stats?.highestScore}</p>
              <p className="text-xs text-amber-600 dark:text-amber-400">Best Score</p>
            </div>
            <div className="rounded-lg bg-blue-50 dark:bg-blue-900/30 p-3 text-center">
              <Clock className="mx-auto mb-1 h-4 w-4 text-blue-600 dark:text-blue-400" />
              <p className="text-lg font-bold text-blue-700 dark:text-blue-300">{stats?.totalQuizzes}</p>
              <p className="text-xs text-blue-600 dark:text-blue-400">Quizzes</p>
            </div>
          </div>

          {jobId && (
            <button
              onClick={startQuiz}
              className="w-full rounded-lg bg-gradient-to-r from-violet-500 to-purple-500 py-3 text-sm font-medium text-white shadow-md transition-all hover:from-violet-600 hover:to-purple-600"
            >
              Take Another Quiz
            </button>
          )}
        </>
      )}
    </div>
  );
}
