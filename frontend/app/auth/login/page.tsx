'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock, Loader2, AlertCircle } from 'lucide-react';
import { useTheme } from '@/components/theme/ThemeProvider';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

export default function LoginPage() {
  const { theme } = useTheme();
  const { login } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password');
      return;
    }

    setLoading(true);

    try {
      const result = await login(email, password);
      if (result.success) {
        router.push('/dashboard');
      } else {
        setError(result.error || 'Invalid email or password');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn(
      'min-h-screen flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden',
      'bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50',
      'dark:from-slate-900 dark:via-slate-800 dark:to-slate-900'
    )}>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 blur-3xl" />
      </div>

      <div className={cn(
        'w-full max-w-sm sm:max-w-md relative z-10',
        'rounded-2xl border backdrop-blur-xl p-6 sm:p-8 shadow-2xl',
        theme === 'dark'
          ? 'bg-slate-800/40 border-slate-700/30'
          : 'bg-white/60 border-white/40'
      )}>
        <div className="text-center mb-8">
          <h1 className={cn(
            'text-2xl font-bold mb-2',
            theme === 'dark' ? 'text-white' : 'text-slate-800'
          )}>
            Welcome Back
          </h1>
          <p className={cn(
            'text-sm',
            theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
          )}>
            Sign in to your account to continue
          </p>
        </div>

        {error && (
          <div className={cn(
            'rounded-xl p-4 mb-6 text-sm font-medium flex items-center gap-3',
            'bg-red-50 dark:bg-red-900/20',
            'border border-red-200 dark:border-red-800',
            'text-red-600 dark:text-red-400'
          )}>
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label
              htmlFor="email"
              className={cn(
                'text-sm font-medium block',
                theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
              )}
            >
              Email
            </label>
            <div className="relative">
              <Mail className={cn(
                'absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5',
                theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
              )} />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                disabled={loading}
                className={cn(
                  'w-full rounded-xl border py-3 pl-11 pr-4 text-sm font-medium',
                  'transition-all duration-300',
                  'focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  theme === 'dark'
                    ? 'bg-slate-800/80 border-slate-600/50 text-white placeholder-slate-500'
                    : 'bg-white/80 border-slate-200/50 text-slate-700 placeholder-slate-400'
                )}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="password"
              className={cn(
                'text-sm font-medium block',
                theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
              )}
            >
              Password
            </label>
            <div className="relative">
              <Lock className={cn(
                'absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5',
                theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
              )} />
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                disabled={loading}
                className={cn(
                  'w-full rounded-xl border py-3 pl-11 pr-4 text-sm font-medium',
                  'transition-all duration-300',
                  'focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  theme === 'dark'
                    ? 'bg-slate-800/80 border-slate-600/50 text-white placeholder-slate-500'
                    : 'bg-white/80 border-slate-200/50 text-slate-700 placeholder-slate-400'
                )}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={cn(
              'w-full rounded-xl py-3 text-sm font-semibold',
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
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Signing in...</span>
              </>
            ) : (
              <span>Sign In</span>
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className={cn(
            'text-sm',
            theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
          )}>
            Don&apos;t have an account?{' '}
            <Link
              href="/auth/register"
              className={cn(
                'font-semibold transition-colors duration-300',
                theme === 'dark'
                  ? 'text-blue-400 hover:text-blue-300'
                  : 'text-blue-600 hover:text-blue-500'
              )}
            >
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
