'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Navigation } from '@/components/navigation/Navigation';
import { useTheme } from '@/components/theme/ThemeProvider';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/notification/Toast';
import { api } from '@/lib/api';
import {
  ArrowLeft,
  Trash2,
  ShieldAlert,
  Loader2,
  Lock,
  AlertTriangle,
  X,
} from 'lucide-react';
import { clsx } from 'clsx';

export default function AccountDeletionPage() {
  const { theme } = useTheme();
  const { logout } = useAuth();
  const { addToast } = useToast();
  const router = useRouter();

  const [showModal, setShowModal] = useState(false);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleDelete = async () => {
    if (!password.trim()) {
      setError('请输入密码');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await api.post('/account/delete', { password });
      const data = await res.json();

      if (!data.success) {
        const errMsg = data.error || '删除失败';
        if (res.status === 429) {
          setError('操作过于频繁，请稍后再试');
        } else if (res.status === 401) {
          setError('密码错误');
        } else {
          setError(errMsg);
        }
        setLoading(false);
        return;
      }

      addToast('账号已按照 PIPL 规定匿名化处理', 'success');
      setShowModal(false);
      await logout();
      router.push('/auth/login?deleted=1');
    } catch {
      setError('网络错误，请稍后再试');
      setLoading(false);
    }
  };

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
            账号管理
          </h1>
        </div>

        <div
          className={clsx(
            'rounded-2xl border p-6 backdrop-blur-xl transition-all duration-300',
            theme === 'dark'
              ? 'bg-slate-800/40 border-red-800/40'
              : 'bg-white/60 border-red-200/60 shadow-xl'
          )}
        >
          <div className="flex items-center gap-3 mb-6">
            <div
              className={clsx(
                'flex h-10 w-10 items-center justify-center rounded-xl',
                theme === 'dark' ? 'bg-red-600/20' : 'bg-red-100'
              )}
            >
              <Trash2
                className={clsx(
                  'h-5 w-5',
                  theme === 'dark' ? 'text-red-400' : 'text-red-600'
                )}
              />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
                删除账号
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                此操作不可撤销
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              删除账号后，您的个人信息将被匿名化处理，符合《个人信息保护法》第
              47 条要求。您的购买记录将保留用于税务和法律目的。
            </p>

            <div
              className={clsx(
                'rounded-xl p-4 border text-sm',
                theme === 'dark'
                  ? 'bg-amber-900/20 border-amber-700/30 text-amber-300'
                  : 'bg-amber-50 border-amber-200 text-amber-700'
              )}
            >
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">⚠ 重要提示</p>
                  <ul className="list-disc list-inside mt-1 space-y-0.5">
                    <li>此操作不可撤销</li>
                    <li>您的账号将被永久匿名化</li>
                    <li>已购买的订阅不可退款</li>
                    <li>学习记录和测验成绩将被保留（匿名化）</li>
                  </ul>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                setPassword('');
                setError('');
                setShowModal(true);
              }}
              className={clsx(
                'w-full rounded-xl py-3 text-sm font-semibold',
                'flex items-center justify-center gap-2',
                'transition-all duration-300',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                theme === 'dark'
                  ? 'bg-red-600 hover:bg-red-500 text-white'
                  : 'bg-red-500 hover:bg-red-400 text-white',
                'shadow-lg shadow-red-500/25 hover:shadow-xl hover:shadow-red-500/30',
                'hover:scale-[1.01] active:scale-[0.99]'
              )}
            >
              <ShieldAlert className="h-5 w-5" />
              删除账号
            </button>
          </div>
        </div>
      </main>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => !loading && setShowModal(false)}
          />

          <div
            className={clsx(
              'relative w-full max-w-md rounded-2xl border p-6 shadow-2xl',
              theme === 'dark'
                ? 'bg-slate-800 border-slate-700/50'
                : 'bg-white border-slate-200/50'
            )}
          >
            <button
              onClick={() => !loading && setShowModal(false)}
              className={clsx(
                'absolute top-4 right-4 rounded-lg p-1 transition-colors',
                theme === 'dark'
                  ? 'text-slate-400 hover:text-white hover:bg-slate-700'
                  : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
              )}
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div
                className={clsx(
                  'flex h-10 w-10 items-center justify-center rounded-xl',
                  theme === 'dark' ? 'bg-red-600/20' : 'bg-red-100'
                )}
              >
                <ShieldAlert
                  className={clsx(
                    'h-5 w-5',
                    theme === 'dark' ? 'text-red-400' : 'text-red-600'
                  )}
                />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-800 dark:text-white">
                  确认删除账号
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  输入密码以确认
                </p>
              </div>
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 leading-relaxed">
              您的账号将按照《个人信息保护法》进行匿名化处理。购买历史将保留用于税务/法律目的。请输入密码以确认此操作。
            </p>

            <div className="relative mb-4">
              <Lock
                className={clsx(
                  'absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5',
                  theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
                )}
              />
              <input
                type="password"
                placeholder="请输入密码"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleDelete();
                }}
                autoFocus
                disabled={loading}
                className={clsx(
                  'w-full rounded-xl border py-3 pl-11 pr-4 text-sm font-medium',
                  'transition-all duration-300',
                  'focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500',
                  theme === 'dark'
                    ? 'bg-slate-800/80 border-slate-600/50 text-white placeholder-slate-500'
                    : 'bg-white/80 border-slate-200/50 text-slate-700 placeholder-slate-400',
                  'disabled:opacity-50'
                )}
              />
            </div>

            {error && (
              <div className="rounded-xl p-3 text-sm font-medium mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => !loading && setShowModal(false)}
                disabled={loading}
                className={clsx(
                  'flex-1 rounded-xl py-3 text-sm font-semibold',
                  'flex items-center justify-center gap-2',
                  'transition-all duration-300',
                  'disabled:opacity-50',
                  theme === 'dark'
                    ? 'bg-slate-700/60 border border-slate-600/50 text-slate-300 hover:bg-slate-700'
                    : 'bg-slate-100 border border-slate-200 text-slate-600 hover:bg-slate-200'
                )}
              >
                取消
              </button>
              <button
                onClick={handleDelete}
                disabled={loading}
                className={clsx(
                  'flex-1 rounded-xl py-3 text-sm font-semibold',
                  'flex items-center justify-center gap-2',
                  'transition-all duration-300',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  theme === 'dark'
                    ? 'bg-red-600 hover:bg-red-500 text-white'
                    : 'bg-red-500 hover:bg-red-400 text-white',
                  'hover:scale-[1.01] active:scale-[0.99]'
                )}
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  '确认删除'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
