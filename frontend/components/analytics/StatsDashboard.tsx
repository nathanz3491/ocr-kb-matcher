'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { BookOpen, CheckCircle2, TrendingUp, Flame, Loader2 } from 'lucide-react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

interface DashboardStats {
  totalNodes: number;
  learnedNodes: number;
  progressPercentage: number;
  streakDays: number;
  totalUploads: number;
}

interface StatCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ReactNode;
  gradient: string;
  delay?: number;
}

function StatCard({ title, value, subtitle, icon, gradient, delay = 0 }: StatCardProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-white/40 dark:border-slate-700/50 bg-white/70 dark:bg-slate-800/70 backdrop-blur-md p-6 shadow-lg dark:shadow-slate-900/30 transition-all duration-300 hover:scale-105 hover:shadow-xl ${gradient}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="relative z-10">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-white/80 to-white/40 dark:from-slate-700/50 dark:to-slate-600/30 shadow-md">
          {icon}
        </div>
        <div className="text-3xl font-bold text-slate-800 dark:text-white">{value}</div>
        <div className="text-sm font-medium text-slate-600 dark:text-slate-400">{title}</div>
        {subtitle && <div className="mt-1 text-xs text-slate-500 dark:text-slate-500">{subtitle}</div>}
      </div>
      <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-gradient-to-br from-white/20 to-transparent dark:from-white/10" />
    </div>
  );
}

interface StatsDashboardProps {
  onLoadingChange?: (isLoading: boolean) => void;
}

export function StatsDashboard({ onLoadingChange }: StatsDashboardProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/analytics/dashboard`);
        if (res.data.success) {
          setStats(res.data.data);
        } else {
          setError('Failed to load statistics');
        }
      } catch (err) {
        console.error('Error fetching stats:', err);
        setError('Failed to load statistics');
      } finally {
        setLoading(false);
        onLoadingChange?.(false);
      }
    };

    fetchStats();
  }, [onLoadingChange]);

  if (loading) {
    return (
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="h-32 animate-pulse rounded-2xl border border-white/40 dark:border-slate-700/50 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm"
          />
        ))}
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="mb-8 rounded-2xl border border-red-200 dark:border-red-800 bg-red-50/80 dark:bg-red-900/30 p-4 text-center text-red-600 dark:text-red-400">
        {error || 'Unable to load statistics'}
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Topics',
      value: stats.totalNodes,
      subtitle: 'Available to learn',
      icon: <BookOpen className="h-6 w-6 text-blue-600" />,
      gradient: 'shadow-blue-500/10 hover:shadow-blue-500/20',
      delay: 0,
    },
    {
      title: 'Learned',
      value: stats.learnedNodes,
      subtitle: 'Topics mastered',
      icon: <CheckCircle2 className="h-6 w-6 text-emerald-600" />,
      gradient: 'shadow-emerald-500/10 hover:shadow-emerald-500/20',
      delay: 100,
    },
    {
      title: 'Progress',
      value: `${stats.progressPercentage}%`,
      subtitle: 'Overall completion',
      icon: <TrendingUp className="h-6 w-6 text-violet-600" />,
      gradient: 'shadow-violet-500/10 hover:shadow-violet-500/20',
      delay: 200,
    },
    {
      title: 'Day Streak',
      value: stats.streakDays,
      subtitle: stats.streakDays > 0 ? 'Keep it up! 🔥' : 'Start learning today',
      icon: <Flame className="h-6 w-6 text-amber-600" />,
      gradient: 'shadow-amber-500/10 hover:shadow-amber-500/20',
      delay: 300,
    },
  ];

  return (
    <div className="mb-8">
      <h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-slate-800 dark:text-white">
        <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        Learning Analytics
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card, index) => (
          <StatCard key={card.title} {...card} />
        ))}
      </div>
      {/* Progress Bar */}
      <div className="mt-6 rounded-xl border border-white/40 dark:border-slate-700/50 bg-white/70 dark:bg-slate-800/70 p-4 backdrop-blur-sm dark:shadow-slate-900/30">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Overall Progress</span>
          <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{stats.progressPercentage}%</span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500"
            style={{ width: `${stats.progressPercentage}%` }}
          />
        </div>
      </div>
    </div>
  );
}
