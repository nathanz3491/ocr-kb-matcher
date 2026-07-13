'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Navigation } from '@/components/navigation/Navigation';
import { useTheme } from '@/components/theme/ThemeProvider';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/notification/Toast';
import { api } from '@/lib/api';
import { Tier } from '@shared/types';
import {
  ArrowLeft,
  Crown,
  Gift,
  History,
  RefreshCw,
  ArrowUpRight,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { clsx } from 'clsx';

interface SubscriptionRecord {
  id: string;
  tier: Tier;
  started_at: string;
  expires_at: string;
  payment_provider: string;
  created_at: string;
}

interface UserProfile {
  id: string;
  email: string;
  name: string;
  tier?: Tier;
  subscriptionStartedAt?: string;
  subscriptionExpiresAt?: string;
}

const tierLabels: Record<Tier, string> = {
  free: '免费版',
  monthly: '月度版',
  yearly: '年度版',
};

const tierBadgeColors: Record<Tier, string> = {
  free: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20',
  monthly: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  yearly: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
};

export default function SubscriptionPage() {
  const { theme } = useTheme();
  const { user: authUser } = useAuth();
  const { addToast } = useToast();
  const router = useRouter();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [history, setHistory] = useState<SubscriptionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [code, setCode] = useState('');
  const [redeeming, setRedeeming] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [profileRes, historyRes] = await Promise.all([
        api.get('/auth/me'),
        api.get('/subscriptions/history'),
      ]);

      const profileData = await profileRes.json();
      const historyData = await historyRes.json();

      if (profileData.success && profileData.data?.user) {
        setProfile(profileData.data.user);
      } else {
        setError('无法获取用户信息');
      }

      if (historyData.success && Array.isArray(historyData.data)) {
        setHistory(historyData.data);
      }
    } catch {
      setError('网络错误，请刷新页面重试');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRedeem = async () => {
    const trimmed = code.trim();
    if (!trimmed) {
      addToast('请输入兑换码', 'error');
      return;
    }

    setRedeeming(true);
    try {
      const res = await api.post('/subscriptions/redeem', { code: trimmed });
      const data = await res.json();

      if (!data.success) {
        if (res.status === 404) {
          addToast('兑换码无效', 'error');
        } else if (res.status === 410) {
          addToast('兑换码已被使用', 'error');
        } else {
          addToast(data.error || '兑换失败', 'error');
        }
        setRedeeming(false);
        return;
      }

      addToast(data.message || '兑换成功', 'success');
      setCode('');
      await fetchData();
    } catch {
      addToast('网络错误，请稍后再试', 'error');
    } finally {
      setRedeeming(false);
    }
  };

  const currentTier: Tier = profile?.tier || 'free';
  const isPaid = currentTier !== 'free';
  const expiresAt = profile?.subscriptionExpiresAt;
  const daysRemaining = expiresAt
    ? Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <Navigation />

      <main className="mx-auto max-w-3xl px-4 py-8 mt-20">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/settings">
            <button
              className={clsx(
                'flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all duration-300',
                theme === 'dark'
                  ? 'bg-slate-800/60 border-slate-700/50 text-slate-300 hover:bg-slate-700/60'
                  : 'bg-white/70 border-slate-200/50 text-slate-600 hover:bg-slate-50'
              )}
            >
              <ArrowLeft className="h-4 w-4" />
              返回设置
            </button>
          </Link>
          <h1 className="text-3xl font-bold text-slate-800 dark:text-white">
            订阅管理
          </h1>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        ) : error ? (
          <div
            className={clsx(
              'rounded-xl p-4 text-sm font-medium mb-6',
              'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800',
              'text-red-600 dark:text-red-400'
            )}
          >
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 shrink-0" />
              {error}
            </div>
          </div>
        ) : (
          <>
            <div
              className={clsx(
                'rounded-2xl border p-6 mb-6 backdrop-blur-xl transition-all duration-300',
                theme === 'dark'
                  ? 'bg-slate-800/40 border-slate-700/30'
                  : 'bg-white/60 border-white/40 shadow-xl'
              )}
            >
              <div className="flex items-center gap-3 mb-6">
                <div
                  className={clsx(
                    'flex h-10 w-10 items-center justify-center rounded-xl',
                    theme === 'dark' ? 'bg-amber-600/20' : 'bg-amber-100'
                  )}
                >
                  <Crown
                    className={clsx(
                      'h-5 w-5',
                      theme === 'dark' ? 'text-amber-400' : 'text-amber-600'
                    )}
                  />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
                    当前方案
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    查看您的订阅状态
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 mb-4">
                <span
                  className={clsx(
                    'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium border',
                    tierBadgeColors[currentTier]
                  )}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  {tierLabels[currentTier]}
                </span>
                {isPaid && daysRemaining <= 7 && daysRemaining > 0 && (
                  <span
                    className={clsx(
                      'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
                      'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
                    )}
                  >
                    <Clock className="h-3 w-3" />
                    即将过期
                  </span>
                )}
              </div>

              {isPaid && expiresAt && (
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                    <Calendar className="h-4 w-4 shrink-0" />
                    <span>
                      到期日期：
                      <span className="font-medium text-slate-800 dark:text-white">
                        {new Date(expiresAt).toLocaleDateString('zh-CN')}
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                    <Clock className="h-4 w-4 shrink-0" />
                    <span>
                      剩余天数：
                      <span
                        className={clsx(
                          'font-medium',
                          daysRemaining <= 7
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-slate-800 dark:text-white'
                        )}
                      >
                        {daysRemaining} 天
                      </span>
                    </span>
                  </div>
                </div>
              )}

              {!isPaid && (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  您正在使用免费版，部分功能受限。
                </p>
              )}
            </div>

            <div
              className={clsx(
                'rounded-2xl border p-6 mb-6 backdrop-blur-xl transition-all duration-300',
                theme === 'dark'
                  ? 'bg-slate-800/40 border-slate-700/30'
                  : 'bg-white/60 border-white/40 shadow-xl'
              )}
            >
              <div className="flex items-center gap-3 mb-6">
                <div
                  className={clsx(
                    'flex h-10 w-10 items-center justify-center rounded-xl',
                    theme === 'dark' ? 'bg-emerald-600/20' : 'bg-emerald-100'
                  )}
                >
                  <Gift
                    className={clsx(
                      'h-5 w-5',
                      theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'
                    )}
                  />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
                    兑换码
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    输入购买的兑换码激活订阅
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Gift
                    className={clsx(
                      'absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5',
                      theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
                    )}
                  />
                  <input
                    type="text"
                    placeholder="请输入兑换码"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRedeem();
                    }}
                    disabled={redeeming}
                    className={clsx(
                      'w-full rounded-xl border py-3 pl-11 pr-4 text-sm font-medium',
                      'transition-all duration-300',
                      'focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500',
                      theme === 'dark'
                        ? 'bg-slate-800/80 border-slate-600/50 text-white placeholder-slate-500'
                        : 'bg-white/80 border-slate-200/50 text-slate-700 placeholder-slate-400',
                      'disabled:opacity-50'
                    )}
                  />
                </div>
                <button
                  onClick={handleRedeem}
                  disabled={redeeming || !code.trim()}
                  className={clsx(
                    'rounded-xl px-6 py-3 text-sm font-semibold',
                    'flex items-center justify-center gap-2',
                    'transition-all duration-300',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    theme === 'dark'
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white'
                      : 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white',
                    'shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30',
                    'hover:scale-[1.01] active:scale-[0.99]'
                  )}
                >
                  {redeeming ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    '兑换'
                  )}
                </button>
              </div>
            </div>

            <div
              className={clsx(
                'rounded-2xl border p-6 mb-6 backdrop-blur-xl transition-all duration-300',
                theme === 'dark'
                  ? 'bg-slate-800/40 border-slate-700/30'
                  : 'bg-white/60 border-white/40 shadow-xl'
              )}
            >
              <div className="flex items-center gap-3 mb-6">
                <div
                  className={clsx(
                    'flex h-10 w-10 items-center justify-center rounded-xl',
                    theme === 'dark' ? 'bg-purple-600/20' : 'bg-purple-100'
                  )}
                >
                  <History
                    className={clsx(
                      'h-5 w-5',
                      theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                    )}
                  />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
                    订阅历史
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    您的过往订阅记录
                  </p>
                </div>
              </div>

              {history.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400 py-4 text-center">
                  暂无订阅记录
                </p>
              ) : (
                <div className="space-y-3">
                  {history.map((record) => (
                    <div
                      key={record.id}
                      className={clsx(
                        'flex items-center justify-between py-3 px-4 rounded-xl',
                        'transition-all duration-200',
                        theme === 'dark'
                          ? 'bg-slate-700/30 hover:bg-slate-700/50'
                          : 'bg-slate-50 hover:bg-slate-100'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <CheckCircle2
                          className={clsx(
                            'h-5 w-5',
                            theme === 'dark' ? 'text-green-400' : 'text-green-600'
                          )}
                        />
                        <div>
                          <p className="text-sm font-medium text-slate-800 dark:text-white">
                            {tierLabels[record.tier]}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {record.payment_provider === 'redeem_code'
                              ? '兑换码激活'
                              : record.payment_provider}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {new Date(record.created_at).toLocaleDateString('zh-CN')}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          至 {new Date(record.expires_at).toLocaleDateString('zh-CN')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div
              className={clsx(
                'rounded-2xl border p-6 mb-6 backdrop-blur-xl transition-all duration-300',
                theme === 'dark'
                  ? 'bg-slate-800/40 border-slate-700/30'
                  : 'bg-white/60 border-white/40 shadow-xl'
              )}
            >
              <div className="flex items-center gap-3 mb-6">
                <div
                  className={clsx(
                    'flex h-10 w-10 items-center justify-center rounded-xl',
                    theme === 'dark' ? 'bg-blue-600/20' : 'bg-blue-100'
                  )}
                >
                  <RefreshCw
                    className={clsx(
                      'h-5 w-5',
                      theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                    )}
                  />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
                    续费与兑换说明
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    如何购买和兑换订阅
                  </p>
                </div>
              </div>

              <div className="space-y-4 text-sm text-slate-600 dark:text-slate-400">
                <div className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-bold">
                    1
                  </span>
                  <p>
                    前往购买平台选择月度版或年度版订阅，完成支付后您将收到兑换码。
                  </p>
                </div>
                <div className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-bold">
                    2
                  </span>
                  <p>
                    在本页上方的“兑换码”输入框中填写您的兑换码，点击“兑换”按钮即可激活。
                  </p>
                </div>
                <div className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-bold">
                    3
                  </span>
                  <p>
                    兑换成功后，订阅权益将立即生效，您可以在“当前方案”中查看到期时间。
                  </p>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-200/50 dark:border-slate-700/30">
                <a
                  href="https://example.com/purchase"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={clsx(
                    'inline-flex items-center gap-2 text-sm font-medium transition-colors',
                    theme === 'dark'
                      ? 'text-blue-400 hover:text-blue-300'
                      : 'text-blue-600 hover:text-blue-500'
                  )}
                >
                  前往购买平台
                  <ArrowUpRight className="h-4 w-4" />
                </a>
              </div>
            </div>

            {currentTier === 'free' && (
              <div
                className={clsx(
                  'rounded-2xl border p-6 mb-6 backdrop-blur-xl transition-all duration-300',
                  theme === 'dark'
                    ? 'bg-slate-800/40 border-slate-700/30'
                    : 'bg-white/60 border-white/40 shadow-xl'
                )}
              >
                <div className="flex items-center gap-3 mb-6">
                  <div
                    className={clsx(
                      'flex h-10 w-10 items-center justify-center rounded-xl',
                      theme === 'dark' ? 'bg-pink-600/20' : 'bg-pink-100'
                    )}
                  >
                    <Sparkles
                      className={clsx(
                        'h-5 w-5',
                        theme === 'dark' ? 'text-pink-400' : 'text-pink-600'
                      )}
                    />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
                      升级方案
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      解锁更多功能
                    </p>
                  </div>
                </div>

                <div className="overflow-hidden rounded-xl border border-slate-200/50 dark:border-slate-700/30">
                  <table className="w-full text-sm">
                    <thead>
                      <tr
                        className={clsx(
                          theme === 'dark' ? 'bg-slate-700/40' : 'bg-slate-50'
                        )}
                      >
                        <th className="px-4 py-3 text-left font-medium text-slate-700 dark:text-slate-300">
                          功能
                        </th>
                        <th className="px-4 py-3 text-center font-medium text-slate-700 dark:text-slate-300">
                          免费版
                        </th>
                        <th className="px-4 py-3 text-center font-medium text-slate-700 dark:text-slate-300">
                          付费版
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/50 dark:divide-slate-700/30">
                      {[
                        { feature: '文档处理次数', free: '每月 5 次', paid: '无限' },
                        { feature: '知识图谱节点', free: '100 个', paid: '无限' },
                        { feature: 'AI 测验生成', free: '每月 3 次', paid: '无限' },
                        { feature: '导出 PDF', free: '—', paid: '支持' },
                        { feature: '优先客服', free: '—', paid: '支持' },
                      ].map((row, idx) => (
                        <tr
                          key={idx}
                          className={clsx(
                            'transition-colors',
                            theme === 'dark' ? 'hover:bg-slate-700/20' : 'hover:bg-slate-50'
                          )}
                        >
                          <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                            {row.feature}
                          </td>
                          <td className="px-4 py-3 text-center text-slate-500 dark:text-slate-400">
                            {row.free}
                          </td>
                          <td className="px-4 py-3 text-center font-medium text-emerald-600 dark:text-emerald-400">
                            {row.paid}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <Link href="/pricing" className="mt-4 block">
                  <button
                    className={clsx(
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
                    查看定价详情
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </Link>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
