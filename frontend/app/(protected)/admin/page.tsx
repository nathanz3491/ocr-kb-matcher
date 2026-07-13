'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useTheme } from '@/components/theme/ThemeProvider';
import { Navigation } from '@/components/navigation/Navigation';
import { api } from '@/lib/api';
import { clsx } from 'clsx';
import {
  Loader2,
  Shield,
  Users,
  CreditCard,
  TrendingUp,
  ArrowLeft,
  Edit3,
  UserCog,
  X,
  CheckCircle2,
  AlertTriangle,
  Upload,
  HelpCircle,
  Calendar,
} from 'lucide-react';

interface AdminUser {
  id: string;
  email: string;
  name: string;
  tier: 'free' | 'monthly' | 'yearly';
  role: 'user' | 'admin';
  subscriptionStartedAt: string | null;
  subscriptionExpiresAt: string | null;
  usage: {
    periodStart: string;
    uploads: number;
    quizGenerated: number;
    chatMessages: number;
  };
  createdAt: string;
  updatedAt: string;
}

interface AdminStats {
  totalUsers: number;
  freeCount: number;
  paidCount: number;
  estimatedMRR: number;
  totalUploadsThisMonth: number;
}

const TIER_OPTIONS: { value: 'free' | 'monthly' | 'yearly'; label: string; defaultDays: number }[] = [
  { value: 'free', label: 'Free', defaultDays: 0 },
  { value: 'monthly', label: 'Monthly', defaultDays: 30 },
  { value: 'yearly', label: 'Yearly', defaultDays: 365 },
];

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function getTierBadgeClasses(tier: string, theme: string) {
  switch (tier) {
    case 'free':
      return theme === 'dark'
        ? 'bg-slate-700/60 text-slate-300 border-slate-600/50'
        : 'bg-slate-100 text-slate-600 border-slate-200/50';
    case 'monthly':
      return theme === 'dark'
        ? 'bg-blue-900/40 text-blue-300 border-blue-700/40'
        : 'bg-blue-50 text-blue-600 border-blue-200/50';
    case 'yearly':
      return theme === 'dark'
        ? 'bg-emerald-900/40 text-emerald-300 border-emerald-700/40'
        : 'bg-emerald-50 text-emerald-600 border-emerald-200/50';
    default:
      return theme === 'dark'
        ? 'bg-slate-700/60 text-slate-300 border-slate-600/50'
        : 'bg-slate-100 text-slate-600 border-slate-200/50';
  }
}

export default function AdminPage() {
  const { theme } = useTheme();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [editTier, setEditTier] = useState<'free' | 'monthly' | 'yearly'>('free');
  const [editDuration, setEditDuration] = useState<number>(30);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [roleLoadingId, setRoleLoadingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setForbidden(false);
    try {
      const [usersRes, statsRes] = await Promise.all([
        api.get('/api/admin/users'),
        api.get('/api/admin/stats'),
      ]);

      if (usersRes.status === 403 || statsRes.status === 403) {
        setForbidden(true);
        setLoading(false);
        return;
      }

      if (!usersRes.ok) {
        throw new Error(`Failed to load users: ${usersRes.status}`);
      }
      if (!statsRes.ok) {
        throw new Error(`Failed to load stats: ${statsRes.status}`);
      }

      const usersJson = await usersRes.json();
      const statsJson = await statsRes.json();

      if (usersJson.success) {
        setUsers(usersJson.data);
      } else {
        throw new Error(usersJson.error || 'Failed to load users');
      }

      if (statsJson.success) {
        setStats(statsJson.data);
      } else {
        throw new Error(statsJson.error || 'Failed to load stats');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openTierModal = useCallback((user: AdminUser) => {
    setSelectedUser(user);
    setEditTier(user.tier);
    setEditDuration(
      user.tier === 'monthly' ? 30 : user.tier === 'yearly' ? 365 : 0
    );
    setModalError(null);
    setModalOpen(true);
  }, []);

  const closeTierModal = useCallback(() => {
    setModalOpen(false);
    setSelectedUser(null);
    setModalError(null);
  }, []);

  const handleTierChange = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedUser) return;
      setModalLoading(true);
      setModalError(null);
      try {
        const res = await api.patch(`/api/admin/users/${selectedUser.id}/tier`, {
          tier: editTier,
          durationDays: editTier === 'free' ? undefined : editDuration,
        });
        if (res.status === 403) {
          setModalError('无权限执行此操作');
          setModalLoading(false);
          return;
        }
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          throw new Error(json.error || `Update failed: ${res.status}`);
        }
        setModalOpen(false);
        setSelectedUser(null);
        await fetchData();
      } catch (err) {
        setModalError(err instanceof Error ? err.message : 'Update failed');
      } finally {
        setModalLoading(false);
      }
    },
    [selectedUser, editTier, editDuration, fetchData]
  );

  const handleRoleToggle = useCallback(
    async (user: AdminUser) => {
      setRoleLoadingId(user.id);
      try {
        const newRole = user.role === 'admin' ? 'user' : 'admin';
        const res = await api.patch(`/api/admin/users/${user.id}/role`, {
          role: newRole,
        });
        if (res.status === 403) {
          setError('无权限执行此操作');
          return;
        }
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          throw new Error(json.error || `Update failed: ${res.status}`);
        }
        await fetchData();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Role update failed');
      } finally {
        setRoleLoadingId(null);
      }
    },
    [fetchData]
  );

  if (forbidden) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <Navigation />
        <div className="relative flex min-h-screen flex-col items-center justify-center px-4 py-12">
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 blur-3xl" />
            <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 blur-3xl" />
          </div>
          <div className="relative w-full max-w-md">
            <div className={clsx(
              'rounded-2xl border backdrop-blur-xl p-8 shadow-2xl text-center',
              theme === 'dark'
                ? 'bg-slate-800/40 border-slate-700/30'
                : 'bg-white/60 border-white/40'
            )}>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                <Shield className="h-8 w-8 text-red-600 dark:text-red-400" />
              </div>
              <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">
                无权限
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
                您没有管理员权限，无法访问此页面。
              </p>
              <Link
                href="/dashboard"
                className={clsx(
                  'inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition-all duration-300',
                  theme === 'dark'
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white'
                    : 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white'
                )}
              >
                <ArrowLeft className="h-4 w-4" />
                返回仪表盘
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <Navigation />

      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
                Admin Panel
              </h1>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                Manage users, tiers, and view platform statistics
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-xl p-3 text-sm font-medium bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {stats && (
          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className={clsx(
              'rounded-2xl border backdrop-blur-md p-6 shadow-lg transition-all duration-300 hover:scale-105',
              theme === 'dark'
                ? 'bg-slate-800/70 border-slate-700/50'
                : 'bg-white/70 border-white/40'
            )}>
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-white/80 to-white/40 dark:from-slate-700/50 dark:to-slate-600/30 shadow-md">
                <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="text-3xl font-bold text-slate-800 dark:text-white">{stats.totalUsers}</div>
              <div className="text-sm font-medium text-slate-600 dark:text-slate-400">Total Users</div>
            </div>

            <div className={clsx(
              'rounded-2xl border backdrop-blur-md p-6 shadow-lg transition-all duration-300 hover:scale-105',
              theme === 'dark'
                ? 'bg-slate-800/70 border-slate-700/50'
                : 'bg-white/70 border-white/40'
            )}>
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-white/80 to-white/40 dark:from-slate-700/50 dark:to-slate-600/30 shadow-md">
                <CreditCard className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="text-3xl font-bold text-slate-800 dark:text-white">{stats.paidCount}</div>
              <div className="text-sm font-medium text-slate-600 dark:text-slate-400">Paid Users</div>
            </div>

            <div className={clsx(
              'rounded-2xl border backdrop-blur-md p-6 shadow-lg transition-all duration-300 hover:scale-105',
              theme === 'dark'
                ? 'bg-slate-800/70 border-slate-700/50'
                : 'bg-white/70 border-white/40'
            )}>
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-white/80 to-white/40 dark:from-slate-700/50 dark:to-slate-600/30 shadow-md">
                <TrendingUp className="h-6 w-6 text-violet-600 dark:text-violet-400" />
              </div>
              <div className="text-3xl font-bold text-slate-800 dark:text-white">${stats.estimatedMRR}</div>
              <div className="text-sm font-medium text-slate-600 dark:text-slate-400">Est. MRR</div>
            </div>

            <div className={clsx(
              'rounded-2xl border backdrop-blur-md p-6 shadow-lg transition-all duration-300 hover:scale-105',
              theme === 'dark'
                ? 'bg-slate-800/70 border-slate-700/50'
                : 'bg-white/70 border-white/40'
            )}>
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-white/80 to-white/40 dark:from-slate-700/50 dark:to-slate-600/30 shadow-md">
                <Upload className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="text-3xl font-bold text-slate-800 dark:text-white">{stats.totalUploadsThisMonth}</div>
              <div className="text-sm font-medium text-slate-600 dark:text-slate-400">Uploads This Month</div>
            </div>
          </div>
        )}

        <div className={clsx(
          'rounded-2xl border backdrop-blur-md shadow-lg overflow-hidden',
          theme === 'dark'
            ? 'bg-slate-800/70 border-slate-700/50'
            : 'bg-white/70 border-white/40'
        )}>
          <div className="p-6 border-b border-slate-200/50 dark:border-slate-700/50">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              Users
            </h2>
          </div>

          {loading ? (
            <div className="p-12 flex flex-col items-center justify-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
              <p className="text-sm text-slate-500 dark:text-slate-400">Loading users...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="p-12 text-center">
              <HelpCircle className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600" />
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">No users found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className={clsx(
                    'border-b',
                    theme === 'dark'
                      ? 'border-slate-700/50 bg-slate-800/40'
                      : 'border-slate-200/50 bg-slate-50/60'
                  )}>
                    <th className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300">Email</th>
                    <th className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300">Username</th>
                    <th className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300">Tier</th>
                    <th className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300">Role</th>
                    <th className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300 text-center">Uploads</th>
                    <th className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300 text-center">Quiz</th>
                    <th className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300 text-center">Chat</th>
                    <th className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300">Subscription Expires</th>
                    <th className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr
                      key={user.id}
                      className={clsx(
                        'border-b transition-colors',
                        theme === 'dark'
                          ? 'border-slate-700/30 hover:bg-slate-700/30'
                          : 'border-slate-200/30 hover:bg-slate-50/80'
                      )}
                    >
                      <td className="px-4 py-3 text-slate-800 dark:text-slate-200 font-medium">
                        {user.email}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                        {user.name || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={clsx(
                          'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border',
                          getTierBadgeClasses(user.tier, theme)
                        )}>
                          {user.tier.charAt(0).toUpperCase() + user.tier.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={clsx(
                          'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium border',
                          user.role === 'admin'
                            ? theme === 'dark'
                              ? 'bg-purple-900/40 text-purple-300 border-purple-700/40'
                              : 'bg-purple-50 text-purple-600 border-purple-200/50'
                            : theme === 'dark'
                              ? 'bg-slate-700/60 text-slate-300 border-slate-600/50'
                              : 'bg-slate-100 text-slate-600 border-slate-200/50'
                        )}>
                          {user.role === 'admin' && <Shield className="h-3 w-3" />}
                          {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-slate-600 dark:text-slate-400">
                        {user.usage?.uploads ?? 0}
                      </td>
                      <td className="px-4 py-3 text-center text-slate-600 dark:text-slate-400">
                        {user.usage?.quizGenerated ?? 0}
                      </td>
                      <td className="px-4 py-3 text-center text-slate-600 dark:text-slate-400">
                        {user.usage?.chatMessages ?? 0}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-slate-400 dark:text-slate-500" />
                          {formatDate(user.subscriptionExpiresAt)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openTierModal(user)}
                            className={clsx(
                              'inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-300',
                              theme === 'dark'
                                ? 'bg-blue-900/30 text-blue-300 border border-blue-700/40 hover:bg-blue-800/40'
                                : 'bg-blue-50 text-blue-600 border border-blue-200/50 hover:bg-blue-100'
                            )}
                          >
                            <Edit3 className="h-3 w-3" />
                            Edit tier
                          </button>
                          <button
                            onClick={() => handleRoleToggle(user)}
                            disabled={roleLoadingId === user.id}
                            className={clsx(
                              'inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-300',
                              user.role === 'admin'
                                ? theme === 'dark'
                                  ? 'bg-rose-900/30 text-rose-300 border border-rose-700/40 hover:bg-rose-800/40'
                                  : 'bg-rose-50 text-rose-600 border border-rose-200/50 hover:bg-rose-100'
                                : theme === 'dark'
                                  ? 'bg-purple-900/30 text-purple-300 border border-purple-700/40 hover:bg-purple-800/40'
                                  : 'bg-purple-50 text-purple-600 border border-purple-200/50 hover:bg-purple-100',
                              'disabled:opacity-50 disabled:cursor-not-allowed'
                            )}
                          >
                            {roleLoadingId === user.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : user.role === 'admin' ? (
                              <X className="h-3 w-3" />
                            ) : (
                              <UserCog className="h-3 w-3" />
                            )}
                            {user.role === 'admin' ? 'Remove admin' : 'Make admin'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {modalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className={clsx(
            'w-full max-w-md overflow-hidden rounded-2xl border shadow-2xl',
            theme === 'dark'
              ? 'bg-slate-800 border-slate-700/50'
              : 'bg-white border-slate-200/50'
          )}>
            <div className={clsx(
              'flex items-center justify-between px-6 py-4 border-b',
              theme === 'dark' ? 'border-slate-700/50' : 'border-slate-200/50'
            )}>
              <h3 className="text-lg font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                <Edit3 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                Edit Tier
              </h3>
              <button
                onClick={closeTierModal}
                className={clsx(
                  'rounded-lg p-1 transition-colors',
                  theme === 'dark'
                    ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                )}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleTierChange} className="px-6 py-5 space-y-4">
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">
                  User: <span className="font-medium text-slate-800 dark:text-slate-200">{selectedUser.email}</span>
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-500">
                  Current tier: {selectedUser.tier.charAt(0).toUpperCase() + selectedUser.tier.slice(1)}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Select Tier
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {TIER_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setEditTier(option.value);
                        setEditDuration(option.defaultDays);
                      }}
                      className={clsx(
                        'rounded-xl border px-3 py-2.5 text-sm font-medium transition-all duration-300',
                        editTier === option.value
                          ? theme === 'dark'
                            ? 'bg-blue-900/40 border-blue-500/50 text-blue-300 shadow-md'
                            : 'bg-blue-50 border-blue-500/50 text-blue-600 shadow-md'
                          : theme === 'dark'
                            ? 'bg-slate-800/60 border-slate-600/50 text-slate-300 hover:bg-slate-700/60'
                            : 'bg-white/70 border-slate-200/50 text-slate-600 hover:bg-slate-50'
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {editTier !== 'free' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Duration (days)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={editDuration}
                    onChange={(e) => setEditDuration(Number(e.target.value))}
                    className={clsx(
                      'w-full rounded-xl border px-4 py-2.5 text-sm font-medium transition-all duration-300',
                      'focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500',
                      theme === 'dark'
                        ? 'bg-slate-800/80 border-slate-600/50 text-white placeholder-slate-500'
                        : 'bg-white/80 border-slate-200/50 text-slate-700 placeholder-slate-400'
                    )}
                  />
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">
                    Default: {editTier === 'monthly' ? '30' : '365'} days
                  </p>
                </div>
              )}

              {modalError && (
                <div className="rounded-xl p-3 text-sm font-medium bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  {modalError}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeTierModal}
                  className={clsx(
                    'flex-1 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all duration-300',
                    theme === 'dark'
                      ? 'bg-slate-800/80 border-slate-600/50 text-slate-300 hover:bg-slate-700'
                      : 'bg-white/80 border-slate-200/50 text-slate-600 hover:bg-slate-50'
                  )}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className={clsx(
                    'flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-300',
                    'flex items-center justify-center gap-2',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    theme === 'dark'
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white'
                      : 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white'
                  )}
                >
                  {modalLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
