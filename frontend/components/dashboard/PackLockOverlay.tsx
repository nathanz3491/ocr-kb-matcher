'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTheme } from '@/components/theme/ThemeProvider';
import { api } from '@/lib/api';
import { Lock, Sparkles, ArrowRight } from 'lucide-react';

interface AccessResponse {
  success: boolean;
  data?: {
    tier: string;
    canAccess: boolean;
    previewNodes: number;
    totalNodes: number;
    loadedNodes: number;
    lockedReason: string | null;
  };
}

function getCurrentPackId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('currentPack');
    if (raw) {
      const parsed = JSON.parse(raw);
      return parsed?.id || null;
    }
  } catch {}
  return null;
}

export function PackLockOverlay({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  const [locked, setLocked] = useState(false);
  const [lockReason, setLockReason] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const packId = getCurrentPackId();
    if (!packId || packId === 'default') {
      setChecked(true);
      return;
    }

    let cancelled = false;
    api.get(`/api/packs/${encodeURIComponent(packId)}/access`)
      .then(async (res) => {
        if (cancelled) return;
        const json: AccessResponse = await res.json();
        if (json.success && json.data) {
          if (!json.data.canAccess) {
            setLocked(true);
            setLockReason(json.data.lockedReason);
          }
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setChecked(true);
      });

    return () => { cancelled = true; };
  }, []);

  if (!checked || !locked) {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      {children}
      <div className="absolute inset-0 z-50 flex flex-col items-center justify-center rounded-lg overflow-hidden">
        <div
          className={
            theme === 'dark'
              ? 'absolute inset-0 bg-slate-950/85 backdrop-blur-sm'
              : 'absolute inset-0 bg-white/85 backdrop-blur-sm'
          }
        />
        <div className="relative z-10 flex flex-col items-center gap-4 px-6 py-8 text-center max-w-sm">
          <div
            className={
              theme === 'dark'
                ? 'flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-800 border border-slate-700'
                : 'flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 border border-slate-200'
            }
          >
            <Lock className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-white">
            内容已锁定
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {lockReason || '升级订阅以解锁全部知识点'}
          </p>
          <Link
            href="/pricing"
            className={
              theme === 'dark'
                ? 'inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:from-blue-500 hover:to-purple-500 hover:scale-105'
                : 'inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:from-blue-400 hover:to-indigo-500 hover:scale-105'
            }
          >
            <Sparkles className="h-4 w-4" />
            升级解锁
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
