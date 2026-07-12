'use client';

import { Navigation } from '@/components/navigation/Navigation';
import { useTheme } from '@/components/theme/ThemeProvider';
import { ShieldAlert } from 'lucide-react';

export default function ParentMonitorPage() {
  const { theme } = useTheme();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <Navigation />
      <div className="mx-auto max-w-2xl px-4 pt-24">
        <div
          className={`rounded-2xl border p-12 text-center backdrop-blur-xl shadow-2xl ${
            theme === 'dark'
              ? 'bg-slate-800/40 border-slate-700/30'
              : 'bg-white/60 border-white/40'
          }`}
        >
          <div
            className={`mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full ${
              theme === 'dark'
                ? 'bg-amber-900/30 border border-amber-700/50'
                : 'bg-amber-50 border border-amber-200'
            }`}
          >
            <ShieldAlert className={`h-10 w-10 ${theme === 'dark' ? 'text-amber-400' : 'text-amber-600'}`} />
          </div>
          <h1 className={`text-2xl font-bold mb-3 ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
            Temporarily Disabled
          </h1>
          <p className={`text-sm leading-relaxed max-w-md mx-auto ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
            The parent monitoring feature is disabled for the initial release. We are implementing additional
            compliance safeguards to protect student data in accordance with privacy regulations.
            This feature will be available in a future update.
          </p>
          <div
            className={`mt-8 rounded-xl p-4 text-left text-xs leading-relaxed ${
              theme === 'dark'
                ? 'bg-slate-900/50 text-slate-500 border border-slate-700/30'
                : 'bg-slate-50 text-slate-500 border border-slate-200/50'
            }`}
          >
            <p className="font-medium mb-1">Compliance Reference:</p>
            <p>
              PIPL Article 31 requires explicit parental consent before processing minors&apos; personal information.
              This feature will ship after implementing a proper consent flow, audit logging, and data protection
              guarantees. See <code className="text-blue-600 dark:text-blue-400">COMPLIANCE.md</code> for details.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
