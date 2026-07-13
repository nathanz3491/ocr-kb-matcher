'use client';

import { useEffect, useState, useCallback } from 'react';
import { AlertTriangle, X, ExternalLink } from 'lucide-react';
import { clsx } from 'clsx';
import Link from 'next/link';

interface QuotaData {
  resource?: string;
  message?: string;
  quota?: {
    used: number;
    limit: number;
    tier: string;
    resetsAt: string;
  };
}

/**
 * Listens for 'app:quota-exceeded' custom events dispatched by api.ts or auth.ts
 * and shows a Chinese-language upgrade toast with a link to /settings/subscription.
 */
export function QuotaExceededHandler() {
  const [quotaData, setQuotaData] = useState<QuotaData | null>(null);
  const [visible, setVisible] = useState(false);

  const dismiss = useCallback(() => {
    setVisible(false);
    setTimeout(() => setQuotaData(null), 300);
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<QuotaData>).detail;
      setQuotaData(detail);
      setVisible(true);
      setTimeout(dismiss, 8000);
    };
    window.addEventListener('app:quota-exceeded', handler);
    return () => window.removeEventListener('app:quota-exceeded', handler);
  }, [dismiss]);

  if (!quotaData || !visible) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[99999] pointer-events-auto">
      <div
        className={clsx(
          'flex items-center gap-3 rounded-2xl border px-4 py-3.5 shadow-xl backdrop-blur-xl transition-all duration-300',
          'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200 shadow-amber-500/10',
          'dark:from-amber-900/40 dark:to-orange-900/30 dark:border-amber-700/30 dark:shadow-amber-900/20',
          visible
            ? 'translate-x-0 opacity-100 scale-100'
            : 'translate-x-full opacity-0 scale-95',
        )}
      >
        <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />

        <div className="flex flex-col gap-1 max-w-[280px]">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
            {quotaData.message || '本月额度已用完'}
          </p>
          <Link
            href="/settings/subscription"
            className="text-sm font-semibold text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 inline-flex items-center gap-1"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            升级套餐
          </Link>
        </div>

        <button
          onClick={dismiss}
          className="ml-1 shrink-0 rounded-lg p-1.5 transition-all duration-200 hover:scale-110 hover:bg-amber-100 dark:hover:bg-amber-800/30 text-amber-500"
          aria-label="关闭"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
