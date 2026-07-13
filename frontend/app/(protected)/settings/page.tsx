'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Navigation } from '@/components/navigation/Navigation';
import { useTheme } from '@/components/theme/ThemeProvider';
import { 
  ArrowLeft, Moon, Sun, Monitor, Palette, Bell, Shield, 
  Database, Clock, ChevronRight, Check, Info, Crown
} from 'lucide-react';
import { clsx } from 'clsx';

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [saved, setSaved] = useState(false);

  // Settings state
  const [defaultTheme, setDefaultTheme] = useState(theme);
  const [notifications, setNotifications] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('notifications') !== 'false';
    }
    return true;
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('notifications', String(notifications));
    }
  }, [notifications]);

  const handleSave = () => {
    setTheme(defaultTheme);
    localStorage.setItem('theme', defaultTheme);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const themeOptions = [
    { value: 'light', label: 'Light', icon: Sun, description: 'Classic light theme' },
    { value: 'dark', label: 'Dark', icon: Moon, description: 'Easy on the eyes' },
    { value: 'system', label: 'System', icon: Monitor, description: 'Follow your device' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <Navigation />
      
      <main className="mx-auto max-w-3xl px-4 py-8 mt-20">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/">
            <button className={clsx(
              'flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all duration-300',
              theme === 'dark'
                ? 'bg-slate-800/60 border-slate-700/50 text-slate-300 hover:bg-slate-700/60'
                : 'bg-white/70 border-slate-200/50 text-slate-600 hover:bg-slate-50'
            )}>
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
          </Link>
          <h1 className="text-3xl font-bold text-slate-800 dark:text-white">Settings</h1>
        </div>

        {/* Theme Section */}
        <div className={clsx(
          'rounded-2xl border p-6 mb-6 backdrop-blur-xl transition-all duration-300',
          theme === 'dark'
            ? 'bg-slate-800/40 border-slate-700/30'
            : 'bg-white/60 border-white/40 shadow-xl'
        )}>
          <div className="flex items-center gap-3 mb-6">
            <div className={clsx(
              'flex h-10 w-10 items-center justify-center rounded-xl',
              theme === 'dark' ? 'bg-blue-600/20' : 'bg-blue-100'
            )}>
              <Palette className={clsx('h-5 w-5', theme === 'dark' ? 'text-blue-400' : 'text-blue-600')} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-800 dark:text-white">Appearance</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Customize how the app looks</p>
            </div>
          </div>

          {/* Default Theme */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
              Default Theme
            </label>
            <div className="grid grid-cols-3 gap-3">
              {themeOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.value}
                    onClick={() => setDefaultTheme(option.value as 'light' | 'dark')}
                    className={clsx(
                      'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-300',
                      defaultTheme === option.value
                        ? theme === 'dark'
                          ? 'border-blue-500 bg-blue-500/10'
                          : 'border-blue-500 bg-blue-50'
                        : theme === 'dark'
                          ? 'border-slate-700/50 hover:border-slate-600/50'
                          : 'border-slate-200/50 hover:border-slate-300/50'
                    )}
                  >
                    <Icon className={clsx(
                      'h-6 w-6',
                      defaultTheme === option.value
                        ? 'text-blue-500'
                        : theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                    )} />
                    <span className={clsx(
                      'text-sm font-medium',
                      defaultTheme === option.value
                        ? 'text-blue-500'
                        : theme === 'dark' ? 'text-white' : 'text-slate-700'
                    )}>
                      {option.label}
                    </span>
                    <span className={clsx(
                      'text-xs',
                      theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
                    )}>
                      {option.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Notifications Section */}
        <div className={clsx(
          'rounded-2xl border p-6 mb-6 backdrop-blur-xl transition-all duration-300',
          theme === 'dark'
            ? 'bg-slate-800/40 border-slate-700/30'
            : 'bg-white/60 border-white/40 shadow-xl'
        )}>
          <div className="flex items-center gap-3 mb-6">
            <div className={clsx(
              'flex h-10 w-10 items-center justify-center rounded-xl',
              theme === 'dark' ? 'bg-purple-600/20' : 'bg-purple-100'
            )}>
              <Bell className={clsx('h-5 w-5', theme === 'dark' ? 'text-purple-400' : 'text-purple-600')} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-800 dark:text-white">Notifications</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Manage your notification preferences</p>
            </div>
          </div>

          {/* Toggle */}
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium text-slate-800 dark:text-white">Push Notifications</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">Get daily study reminders</p>
            </div>
            <button
              onClick={() => { setNotifications(!notifications); setSaved(true); setTimeout(() => setSaved(false), 2000); }}
              className={clsx(
                'relative h-7 w-12 rounded-full transition-colors duration-300',
                notifications
                  ? 'bg-blue-600'
                  : theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'
              )}
            >
              <div className={clsx(
                'absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform duration-300',
                notifications ? 'translate-x-6' : 'translate-x-1'
              )} />
            </button>
          </div>
        </div>

        {/* Data & Sync Section */}
        <div className={clsx(
          'rounded-2xl border p-6 mb-6 backdrop-blur-xl transition-all duration-300',
          theme === 'dark'
            ? 'bg-slate-800/40 border-slate-700/30'
            : 'bg-white/60 border-white/40 shadow-xl'
        )}>
          <div className="flex items-center gap-3 mb-6">
            <div className={clsx(
              'flex h-10 w-10 items-center justify-center rounded-xl',
              theme === 'dark' ? 'bg-green-600/20' : 'bg-green-100'
            )}>
              <Database className={clsx('h-5 w-5', theme === 'dark' ? 'text-green-400' : 'text-green-600')} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-800 dark:text-white">Data & Sync</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Manage your data and synchronization</p>
            </div>
          </div>

          {/* Sync Status */}
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium text-slate-800 dark:text-white">Sync Status</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">Automatically syncs with Neo4j</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-sm font-medium text-green-600 dark:text-green-400">Connected</span>
            </div>
          </div>
        </div>

        {/* About Section */}
        <div className={clsx(
          'rounded-2xl border p-6 mb-6 backdrop-blur-xl transition-all duration-300',
          theme === 'dark'
            ? 'bg-slate-800/40 border-slate-700/30'
            : 'bg-white/60 border-white/40 shadow-xl'
        )}>
          <div className="flex items-center gap-3 mb-4">
            <div className={clsx(
              'flex h-10 w-10 items-center justify-center rounded-xl',
              theme === 'dark' ? 'bg-orange-600/20' : 'bg-orange-100'
            )}>
              <Info className={clsx('h-5 w-5', theme === 'dark' ? 'text-orange-400' : 'text-orange-600')} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-800 dark:text-white">About</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Application information</p>
            </div>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2">
              <span className="text-slate-500 dark:text-slate-400">Version</span>
              <span className="text-slate-800 dark:text-white font-medium">1.0.0</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-slate-500 dark:text-slate-400">Build</span>
              <span className="text-slate-800 dark:text-white font-medium">Latest</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-slate-500 dark:text-slate-400">Framework</span>
              <span className="text-slate-800 dark:text-white font-medium">Next.js + Express + Neo4j</span>
            </div>
          </div>
        </div>

        <div className={clsx(
          'rounded-2xl border p-6 mb-6 backdrop-blur-xl transition-all duration-300',
          theme === 'dark'
            ? 'bg-slate-800/40 border-slate-700/30'
            : 'bg-white/60 border-white/40 shadow-xl'
        )}>
          <div className="flex items-center gap-3 mb-4">
            <div className={clsx(
              'flex h-10 w-10 items-center justify-center rounded-xl',
              theme === 'dark' ? 'bg-amber-600/20' : 'bg-amber-100'
            )}>
              <Crown className={clsx('h-5 w-5', theme === 'dark' ? 'text-amber-400' : 'text-amber-600')} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-800 dark:text-white">订阅管理</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">查看订阅状态、兑换码和历史记录</p>
            </div>
          </div>

          <Link href="/settings/subscription">
            <button className={clsx(
              'w-full flex items-center justify-between py-3 px-4 rounded-xl',
              'transition-all duration-300',
              theme === 'dark'
                ? 'hover:bg-slate-700/40 text-slate-300'
                : 'hover:bg-slate-50 text-slate-600'
            )}>
              <div className="flex items-center gap-3">
                <span className="font-medium">订阅详情</span>
              </div>
              <ChevronRight className="h-4 w-4" />
            </button>
          </Link>
        </div>

        {/* Privacy & Account */}
        <div className={clsx(
          'rounded-2xl border p-6 mb-6 backdrop-blur-xl transition-all duration-300',
          theme === 'dark'
            ? 'bg-slate-800/40 border-slate-700/30'
            : 'bg-white/60 border-white/40 shadow-xl'
        )}>
          <div className="flex items-center gap-3 mb-4">
            <div className={clsx(
              'flex h-10 w-10 items-center justify-center rounded-xl',
              theme === 'dark' ? 'bg-red-600/20' : 'bg-red-100'
            )}>
              <Shield className={clsx('h-5 w-5', theme === 'dark' ? 'text-red-400' : 'text-red-600')} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-800 dark:text-white">Privacy & Account</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Manage your account and data</p>
            </div>
          </div>

          <Link href="/settings/account">
            <button className={clsx(
              'w-full flex items-center justify-between py-3 px-4 rounded-xl',
              'transition-all duration-300',
              theme === 'dark'
                ? 'hover:bg-slate-700/40 text-slate-300'
                : 'hover:bg-slate-50 text-slate-600'
            )}>
              <div className="flex items-center gap-3">
                <span className="font-medium">Account Deletion</span>
              </div>
              <ChevronRight className="h-4 w-4" />
            </button>
          </Link>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          className={clsx(
            'w-full py-4 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-2',
            saved
              ? 'bg-green-600 text-white'
              : theme === 'dark'
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white'
                : 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white'
          )}
        >
          {saved ? (
            <>
              <Check className="h-5 w-5" />
              Saved Successfully!
            </>
          ) : (
            'Save Settings'
          )}
        </button>
      </main>
    </div>
  );
}