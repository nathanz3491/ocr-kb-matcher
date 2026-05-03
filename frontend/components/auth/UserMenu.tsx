'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/components/theme/ThemeProvider';
import {
  User,
  Settings,
  LogOut,
  LayoutDashboard,
  ChevronDown,
  Loader2
} from 'lucide-react';
import { clsx } from 'clsx';

export function UserMenu() {
  const { user, logout } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setLoggingOut(true);
    await logout();
    router.push('/auth/login');
    router.refresh();
  };

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (!user) return null;

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        className={clsx(
          'flex items-center gap-3 rounded-xl px-3 py-2 transition-all duration-300',
          'border backdrop-blur-sm',
          open
            ? theme === 'dark'
              ? 'bg-slate-700 border-blue-500/50'
              : 'bg-white border-blue-300'
            : theme === 'dark'
              ? 'bg-slate-800/80 border-slate-600/50 hover:bg-slate-700 hover:border-slate-500'
              : 'bg-white/80 border-slate-200/50 hover:bg-white hover:border-slate-300'
        )}
      >
        <div className={clsx(
          'flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold',
          'bg-gradient-to-br from-blue-500 to-purple-600 text-white'
        )}>
          {getInitials(user.name)}
        </div>
        <div className="hidden md:block text-left">
          <p className={clsx(
            'text-sm font-medium truncate max-w-[120px]',
            theme === 'dark' ? 'text-white' : 'text-slate-700'
          )}>
            {user.name}
          </p>
          <p className={clsx(
            'text-xs truncate max-w-[120px]',
            theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
          )}>
            {user.email}
          </p>
        </div>
        <ChevronDown className={clsx(
          'h-4 w-4 transition-transform duration-200',
          open ? 'rotate-180' : 'rotate-0',
          theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
        )} />
      </button>

      {open && (
        <div className={clsx(
          'absolute right-0 top-full mt-2 w-56 rounded-xl border overflow-hidden',
          'backdrop-blur-xl shadow-2xl z-50',
          'animate-in fade-in slide-in-from-top-2 duration-200',
          theme === 'dark'
            ? 'bg-slate-800/95 border-slate-700'
            : 'bg-white/95 border-slate-200'
        )}>
          <div className={clsx(
            'p-3 border-b',
            theme === 'dark' ? 'border-slate-700' : 'border-slate-100'
          )}>
            <p className={clsx(
              'text-sm font-medium truncate',
              theme === 'dark' ? 'text-white' : 'text-slate-700'
            )}>
              {user.name}
            </p>
            <p className={clsx(
              'text-xs truncate',
              theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
            )}>
              {user.email}
            </p>
            {!user.emailVerified && (
              <p className={clsx(
                'text-xs mt-1 font-medium',
                theme === 'dark' ? 'text-amber-400' : 'text-amber-600'
              )}>
                Email not verified
              </p>
            )}
          </div>

          <div className="p-2">
            <Link
              href="/dashboard"
              onClick={() => setOpen(false)}
              className={clsx(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                theme === 'dark'
                  ? 'text-slate-300 hover:bg-slate-700 hover:text-white'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
              )}
            >
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </Link>
            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              className={clsx(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                theme === 'dark'
                  ? 'text-slate-300 hover:bg-slate-700 hover:text-white'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
              )}
            >
              <Settings className="h-4 w-4" />
              Settings
            </Link>
          </div>

          <div className={clsx(
            'p-2 border-t',
            theme === 'dark' ? 'border-slate-700' : 'border-slate-100'
          )}>
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className={clsx(
                'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                'text-red-600 dark:text-red-400',
                'hover:bg-red-50 dark:hover:bg-red-900/20',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {loggingOut ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LogOut className="h-4 w-4" />
              )}
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
