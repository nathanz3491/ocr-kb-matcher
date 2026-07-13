'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTheme } from '@/components/theme/ThemeProvider';
import { api } from '@/lib/api';
import { clsx } from 'clsx';
import { Upload, MessageSquare, HelpCircle, Clock, Crown, ArrowRight } from 'lucide-react';
import type { Tier } from '@shared/types';

interface QuotaData {
  tier: Tier;
  role: string;
  usage: {
    periodStart: string;
    uploads: number;
    quizGenerated: number;
    chatMessages: number;
  };
  limits: {
    uploads: number;
    quizGenerated: number;
    chatMessages: number;
  };
  subscriptionStartedAt?: string;
  subscriptionExpiresAt?: string;
  resetsAt: string;
}

interface QuotaResponse {
  success: boolean;
  data?: QuotaData;
  error?: string;
}

function getTierLabel(tier: Tier): string {
  switch (tier) {
    case 'free':
      return '免费';
    case 'monthly':
      return '月卡';
    case 'yearly':
      return '年卡';
    default:
      return '免费';
  }
}

function getTierBadgeClasses(tier: Tier, theme: 'light' | 'dark'): string {
  const base = 'rounded-full px-3 py-1 text-xs font-semibold';
  switch (tier) {
    case 'free':
      return clsx(
        base,
        theme === 'dark'
          ? 'bg-slate-700/60 text-slate-300 border border-slate-600/50'
          : 'bg-slate-100 text-slate-600 border border-slate-200/50'
      );
    case 'monthly':
      return clsx(
        base,
        theme === 'dark'
          ? 'bg-blue-900/40 text-blue-300 border border-blue-700/50'
          : 'bg-blue-50 text-blue-600 border border-blue-200/50'
      );
    case 'yearly':
      return clsx(
        base,
        theme === 'dark'
          ? 'bg-purple-900/40 text-purple-300 border border-purple-700/50'
          : 'bg-purple-50 text-purple-600 border border-purple-200/50'
      );
  }
}

function getProgressColor(ratio: number, theme: 'light' | 'dark'): string {
  if (ratio >= 0.8) {
    return theme === 'dark' ? 'bg-red-500' : 'bg-red-500';
  }
  if (ratio >= 0.5) {
    return theme === 'dark' ? 'bg-amber-500' : 'bg-amber-500';
  }
  return theme === 'dark' ? 'bg-emerald-500' : 'bg-emerald-500';
}

function getProgressTrackColor(theme: 'light' | 'dark'): string {
  return theme === 'dark' ? 'bg-slate-700/50' : 'bg-slate-200/60';
}

function formatTimeUntil(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();

  if (diffMs <= 0) {
    return '即将重置';
  }

  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);

  if (diffMonths >= 1) {
    return `${diffMonths} 个月后重置`;
  }
  if (diffWeeks >= 1) {
    return `${diffWeeks} 周后重置`;
  }
  if (diffDays >= 1) {
    return `${diffDays} 天后重置`;
  }
  if (diffHours >= 1) {
    return `${diffHours} 小时后重置`;
  }
  if (diffMins >= 1) {
    return `${diffMins} 分钟后重置`;
  }
  return '即将重置';
}

interface ProgressBarProps {
  icon: React.ReactNode;
  label: string;
  used: number;
  limit: number;
  theme: 'light' | 'dark';
}

function ProgressBar({ icon, label, used, limit, theme }: ProgressBarProps) {
  const ratio = limit > 0 ? used / limit : 0;
  const percentage = Math.min(Math.round(ratio * 100), 100);
  const barColor = getProgressColor(ratio, theme);
  const trackColor = getProgressTrackColor(theme);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <span className={clsx(
            'text-sm font-medium',
            theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
          )}>
            {label}
          </span>
        </div>
        <span className={clsx(
          'text-sm font-semibold',
          ratio >= 0.8
            ? 'text-red-500'
            : ratio >= 0.5
              ? 'text-amber-500'
              : theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'
        )}>
          {used} / {limit}
        </span>
      </div>
      <div className={clsx('h-2.5 w-full rounded-full overflow-hidden', trackColor)}>
        <div
          className={clsx('h-full rounded-full transition-all duration-500', barColor)}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function SkeletonBar({ theme }: { theme: 'light' | 'dark' }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={clsx(
            'h-4 w-4 rounded animate-pulse',
            theme === 'dark' ? 'bg-slate-700/50' : 'bg-slate-200/60'
          )} />
          <div className={clsx(
            'h-4 w-20 rounded animate-pulse',
            theme === 'dark' ? 'bg-slate-700/50' : 'bg-slate-200/60'
          )} />
        </div>
        <div className={clsx(
          'h-4 w-16 rounded animate-pulse',
          theme === 'dark' ? 'bg-slate-700/50' : 'bg-slate-200/60'
        )} />
      </div>
      <div className={clsx(
        'h-2.5 w-full rounded-full animate-pulse',
        theme === 'dark' ? 'bg-slate-700/50' : 'bg-slate-200/60'
      )} />
    </div>
  );
}

export function UsageWidget() {
  const { theme } = useTheme();
  const [quota, setQuota] = useState<QuotaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchQuota = useCallback(async (attempt = 1) => {
    try {
      const response = await api.get('/api/user/quota');
      const result: QuotaResponse = await response.json();

      if (result.success && result.data) {
        setQuota(result.data);
        setError(null);
      } else {
        throw new Error(result.error || 'Failed to load quota');
      }
    } catch {
      if (attempt === 1) {
        setTimeout(() => fetchQuota(2), 1000);
        return;
      }
      setError('无法加载用量数据');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQuota();
  }, [fetchQuota]);

  const showUpgrade = quota && (
    (quota.limits.uploads > 0 && quota.usage.uploads / quota.limits.uploads >= 0.8) ||
    (quota.limits.quizGenerated > 0 && quota.usage.quizGenerated / quota.limits.quizGenerated >= 0.8) ||
    (quota.limits.chatMessages > 0 && quota.usage.chatMessages / quota.limits.chatMessages >= 0.8)
  );

  return (
    <div className={clsx(
      'rounded-2xl border backdrop-blur-xl p-6 shadow-2xl',
      theme === 'dark'
        ? 'bg-slate-800/40 border-slate-700/30'
        : 'bg-white/60 border-white/40'
    )}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={clsx(
            'flex h-10 w-10 items-center justify-center rounded-xl',
            theme === 'dark'
              ? 'bg-gradient-to-br from-blue-600 to-purple-600'
              : 'bg-gradient-to-br from-blue-500 to-indigo-600'
          )}>
            <Crown className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className={clsx(
              'text-lg font-bold',
              theme === 'dark' ? 'text-white' : 'text-slate-800'
            )}>
              用量统计
            </h3>
            {quota && (
              <span className={getTierBadgeClasses(quota.tier, theme)}>
                {getTierLabel(quota.tier)}
              </span>
            )}
          </div>
        </div>
        {quota && (
          <div className="flex items-center gap-1.5 text-xs">
            <Clock className={clsx(
              'h-3.5 w-3.5',
              theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
            )} />
            <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}>
              {formatTimeUntil(quota.resetsAt)}
            </span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="space-y-5">
          <SkeletonBar theme={theme} />
          <SkeletonBar theme={theme} />
          <SkeletonBar theme={theme} />
        </div>
      ) : error ? (
        <div className={clsx(
          'rounded-xl p-3 text-sm font-medium text-center',
          theme === 'dark'
            ? 'bg-red-900/20 border border-red-800 text-red-400'
            : 'bg-red-50 border border-red-200 text-red-600'
        )}>
          {error}
        </div>
      ) : quota ? (
        <div className="space-y-5">
          <ProgressBar
            icon={
              <Upload className={clsx(
                'h-4 w-4',
                theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
              )} />
            }
            label="文档上传"
            used={quota.usage.uploads}
            limit={quota.limits.uploads}
            theme={theme}
          />
          <ProgressBar
            icon={
              <HelpCircle className={clsx(
                'h-4 w-4',
                theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
              )} />
            }
            label="测验生成"
            used={quota.usage.quizGenerated}
            limit={quota.limits.quizGenerated}
            theme={theme}
          />
          <ProgressBar
            icon={
              <MessageSquare className={clsx(
                'h-4 w-4',
                theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
              )} />
            }
            label="AI 对话"
            used={quota.usage.chatMessages}
            limit={quota.limits.chatMessages}
            theme={theme}
          />

          {showUpgrade && (
            <button
              className={clsx(
                'w-full rounded-xl py-2.5 text-sm font-semibold',
                'flex items-center justify-center gap-2',
                'transition-all duration-300',
                theme === 'dark'
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white'
                  : 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white',
                'shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30',
                'hover:scale-[1.01] active:scale-[0.99]'
              )}
              onClick={() => {
                window.location.href = '/settings/subscription';
              }}
            >
              升级套餐
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}
