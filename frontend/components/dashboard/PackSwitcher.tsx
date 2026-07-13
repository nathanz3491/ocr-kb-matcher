'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/components/theme/ThemeProvider';
import { useToast } from '@/components/notification/Toast';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { PackMetadata, Tier } from '@shared/types';
import {
  BookCopy,
  X,
  Loader2,
  Lock,
  CheckCircle,
  ArrowRight,
  RefreshCcw,
  Sparkles,
  Clock,
  Package,
} from 'lucide-react';

interface PackWithAccess extends PackMetadata {
  canAccess?: boolean;
  visibleNodes?: number;
  lockedNodes?: number;
}

interface PacksResponse {
  success: boolean;
  data?: PackMetadata[];
  error?: string;
}

interface QuotaResponse {
  success: boolean;
  data?: {
    tier: Tier;
  };
  error?: string;
}

const STATUS_LABELS: Record<PackMetadata['status'], string> = {
  coming_soon: '即将上线',
  partial: '部分完成',
  complete: '已完成',
  preview: '预览版',
};

const STATUS_BADGE_CLASSES: Record<
  PackMetadata['status'],
  { light: string; dark: string }
> = {
  coming_soon: {
    light: 'bg-slate-100 text-slate-600 border-slate-200',
    dark: 'bg-slate-800 text-slate-400 border-slate-700',
  },
  partial: {
    light: 'bg-amber-50 text-amber-600 border-amber-200',
    dark: 'bg-amber-900/30 text-amber-400 border-amber-800',
  },
  complete: {
    light: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    dark: 'bg-emerald-900/30 text-emerald-400 border-emerald-800',
  },
  preview: {
    light: 'bg-blue-50 text-blue-600 border-blue-200',
    dark: 'bg-blue-900/30 text-blue-400 border-blue-800',
  },
};

function getCurrentPack(): { id: string; name: string } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('currentPack');
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

function setCurrentPack(id: string, name: string) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('currentPack', JSON.stringify({ id, name }));
  } catch {}
}

export function PackSwitcher() {
  const { theme } = useTheme();
  const { addToast } = useToast();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [packs, setPacks] = useState<PackWithAccess[]>([]);
  const [tier, setTier] = useState<Tier>('free');
  const [loading, setLoading] = useState(false);
  const [switchingPackId, setSwitchingPackId] = useState<string | null>(null);
  const [currentPack, setCurrentPackState] = useState<{ id: string; name: string } | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const isPaid = tier === 'monthly' || tier === 'yearly';

  useEffect(() => {
    setCurrentPackState(getCurrentPack());
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [packsRes, quotaRes] = await Promise.all([
        api.get('/api/packs'),
        api.get('/api/user/quota'),
      ]);

      const packsJson: PacksResponse = await packsRes.json();
      const quotaJson: QuotaResponse = await quotaRes.json();

      if (packsJson.success && packsJson.data) {
        setPacks(packsJson.data);
      }

      if (quotaJson.success && quotaJson.data) {
        setTier(quotaJson.data.tier);
      }
    } catch {
      addToast('加载教材列表失败', 'error', 4000);
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open, fetchData]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement;
      const isModal = modalRef.current?.contains(target);
      const isButton = buttonRef.current?.contains(target);
      if (!isModal && !isButton) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleSwitchPack = async (pack: PackWithAccess) => {
    if (isPackLocked(pack)) {
      addToast('该教材需要付费订阅才能使用', 'warning', 5000);
      setOpen(false);
      router.push('/pricing');
      return;
    }

    setSwitchingPackId(pack.id);
    try {
      const res = await api.post('/api/users/me/load-pack', { packId: pack.id });
      const json = await res.json();

      if (json.success) {
        setCurrentPack(pack.id, pack.name);
        setCurrentPackState({ id: pack.id, name: pack.name });
        addToast(`已切换到「${pack.name}」`, 'success', 4000);
        setOpen(false);
        window.location.reload();
      } else {
        addToast(json.error || '切换教材失败', 'error', 4000);
      }
    } catch {
      addToast('切换教材失败，请重试', 'error', 4000);
    } finally {
      setSwitchingPackId(null);
    }
  };

  const isPackLocked = (pack: PackWithAccess): boolean => {
    if (isPaid) return false;
    return pack.status !== 'preview' && pack.status !== 'coming_soon';
  };

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => setOpen(!open)}
        className={cn(
          'group flex items-center gap-2 rounded-xl px-3 py-2 transition-all duration-300',
          'border backdrop-blur-sm',
          theme === 'dark'
            ? 'bg-slate-800/60 border-slate-700/50 text-slate-300 hover:bg-slate-700/80 hover:border-slate-600'
            : 'bg-white/70 border-slate-200/50 text-slate-600 hover:bg-white hover:border-slate-300'
        )}
        title="切换教材"
      >
        <BookCopy className="h-4 w-4 shrink-0" />
        <span className="text-sm font-medium hidden sm:inline">切换教材</span>
        {currentPack && (
          <span
            className={cn(
              'ml-1 rounded-full px-2 py-0.5 text-[10px] font-semibold',
              theme === 'dark'
                ? 'bg-blue-900/40 text-blue-300 border border-blue-800/50'
                : 'bg-blue-50 text-blue-600 border border-blue-200/50'
            )}
          >
            当前：{currentPack.name}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-[99997] flex items-center justify-center p-4">
          <div
            className={cn(
              'absolute inset-0 transition-opacity duration-300',
              theme === 'dark' ? 'bg-slate-950/80' : 'bg-slate-900/40'
            )}
            onClick={() => setOpen(false)}
          />

          <div
            ref={modalRef}
            className={cn(
              'relative w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden transition-all duration-300',
              'max-h-[80vh] flex flex-col',
              theme === 'dark'
                ? 'bg-slate-900 border-slate-700/50'
                : 'bg-white border-slate-200/50'
            )}
          >
            <div
              className={cn(
                'flex items-center justify-between px-6 py-4 border-b',
                theme === 'dark' ? 'border-slate-700/50' : 'border-slate-100'
              )}
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-xl',
                    theme === 'dark'
                      ? 'bg-gradient-to-br from-blue-600 to-purple-600'
                      : 'bg-gradient-to-br from-blue-500 to-indigo-600'
                  )}
                >
                  <Package className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className={cn('text-lg font-bold', theme === 'dark' ? 'text-white' : 'text-slate-800')}>
                    切换教材
                  </h2>
                  <p className={cn('text-xs', theme === 'dark' ? 'text-slate-400' : 'text-slate-500')}>
                    {isPaid ? '付费用户可使用全部教材' : '免费用户可使用预览版教材'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-200 hover:scale-110',
                  theme === 'dark'
                    ? 'hover:bg-slate-700 text-slate-400'
                    : 'hover:bg-slate-100 text-slate-500'
                )}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <Loader2 className={cn('h-8 w-8 animate-spin', theme === 'dark' ? 'text-slate-400' : 'text-slate-500')} />
                  <span className={cn('text-sm', theme === 'dark' ? 'text-slate-400' : 'text-slate-500')}>
                    加载教材列表...
                  </span>
                </div>
              ) : packs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <Package className={cn('h-10 w-10', theme === 'dark' ? 'text-slate-600' : 'text-slate-300')} />
                  <span className={cn('text-sm', theme === 'dark' ? 'text-slate-400' : 'text-slate-500')}>
                    暂无可用教材
                  </span>
                </div>
              ) : (
                packs.map((pack) => {
                  const locked = isPackLocked(pack);
                  const isCurrent = currentPack?.id === pack.id;
                  const statusStyle = STATUS_BADGE_CLASSES[pack.status];

                  return (
                    <div
                      key={pack.id}
                      className={cn(
                        'group relative rounded-xl border p-4 transition-all duration-300',
                        locked
                          ? theme === 'dark'
                            ? 'bg-slate-800/30 border-slate-700/30 opacity-70'
                            : 'bg-slate-50/50 border-slate-200/30 opacity-70'
                          : theme === 'dark'
                            ? 'bg-slate-800/40 border-slate-700/40 hover:bg-slate-700/40 hover:border-slate-600'
                            : 'bg-white/60 border-slate-200/40 hover:bg-slate-50 hover:border-slate-300',
                        !locked && 'cursor-pointer hover:scale-[1.01]'
                      )}
                      onClick={() => {
                        if (switchingPackId !== pack.id) {
                          handleSwitchPack(pack);
                        }
                      }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3
                              className={cn(
                                'text-sm font-semibold',
                                theme === 'dark' ? 'text-white' : 'text-slate-800'
                              )}
                            >
                              {pack.name}
                            </h3>
                            <span
                              className={cn(
                                'rounded-full px-2 py-0.5 text-[10px] font-medium border',
                                theme === 'dark' ? statusStyle.dark : statusStyle.light
                              )}
                            >
                              {STATUS_LABELS[pack.status]}
                            </span>
                            {isCurrent && (
                              <span
                                className={cn(
                                  'rounded-full px-2 py-0.5 text-[10px] font-semibold border flex items-center gap-1',
                                  theme === 'dark'
                                    ? 'bg-blue-900/40 text-blue-300 border-blue-800/50'
                                    : 'bg-blue-50 text-blue-600 border-blue-200/50'
                                )}
                              >
                                <CheckCircle className="h-3 w-3" />
                                当前
                              </span>
                            )}
                          </div>
                          <p
                            className={cn(
                              'mt-1 text-xs truncate',
                              theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                            )}
                          >
                            {pack.subject} · {pack.grade} · {pack.totalNodes} 个知识点
                          </p>
                          {pack.description && (
                            <p
                              className={cn(
                                'mt-1 text-xs line-clamp-2',
                                theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
                              )}
                            >
                              {pack.description}
                            </p>
                          )}
                        </div>

                        <div className="shrink-0">
                          {locked ? (
                            <div className="flex flex-col items-end gap-2">
                              <div
                                className={cn(
                                  'flex h-8 w-8 items-center justify-center rounded-full',
                                  theme === 'dark' ? 'bg-slate-700/60' : 'bg-slate-200/60'
                                )}
                              >
                                <Lock className={cn('h-4 w-4', theme === 'dark' ? 'text-slate-400' : 'text-slate-500')} />
                              </div>
                              <Link
                                href="/pricing"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpen(false);
                                }}
                                className={cn(
                                  'inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-semibold transition-all duration-200 hover:scale-105',
                                  theme === 'dark'
                                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                                    : 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white'
                                )}
                              >
                                <Sparkles className="h-3 w-3" />
                                升级解锁
                              </Link>
                            </div>
                          ) : switchingPackId === pack.id ? (
                            <Loader2 className={cn('h-5 w-5 animate-spin', theme === 'dark' ? 'text-blue-400' : 'text-blue-600')} />
                          ) : (
                            <div
                              className={cn(
                                'flex h-8 w-8 items-center justify-center rounded-full transition-all duration-300',
                                theme === 'dark'
                                  ? 'bg-slate-700/60 group-hover:bg-blue-500/20'
                                  : 'bg-slate-100 group-hover:bg-blue-100'
                              )}
                            >
                              <RefreshCcw
                                className={cn(
                                  'h-4 w-4 transition-all duration-300',
                                  theme === 'dark'
                                    ? 'text-slate-400 group-hover:text-blue-400'
                                    : 'text-slate-500 group-hover:text-blue-600'
                                )}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div
              className={cn(
                'px-6 py-3 border-t flex items-center justify-between',
                theme === 'dark' ? 'border-slate-700/50' : 'border-slate-100'
              )}
            >
              <span className={cn('text-xs', theme === 'dark' ? 'text-slate-500' : 'text-slate-400')}>
                共 {packs.length} 个教材包
              </span>
              {!isPaid && (
                <Link
                  href="/pricing"
                  onClick={() => setOpen(false)}
                  className={cn(
                    'inline-flex items-center gap-1 text-xs font-medium transition-colors',
                    theme === 'dark'
                      ? 'text-blue-400 hover:text-blue-300'
                      : 'text-blue-600 hover:text-blue-700'
                  )}
                >
                  升级解锁全部教材
                  <ArrowRight className="h-3 w-3" />
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
