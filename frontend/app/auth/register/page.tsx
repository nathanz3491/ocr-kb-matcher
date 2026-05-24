'use client';

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Register" };

'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';

type AccountType = 'student' | 'parent' | 'teacher';

export default function RegisterPage() {
  const { theme } = useTheme();
  const { register } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState<1 | 2>(1);
  const [accountType, setAccountType] = useState<AccountType | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSelectAccountType = (type: AccountType) => {
    setAccountType(type);
    setStep(2);
  };

  const handleBack = () => {
    setStep(1);
    setError('');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) { setError('Please enter your name'); return; }
    if (!email.trim()) { setError('Please enter your email'); return; }
    if (!password.trim()) { setError('Please enter a password'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }

    setLoading(true);

    try {
      const result = await register(email, password, name, accountType!);
      if (result.success) {
        const dashboardByType: Record<string, string> = {
          teacher: '/teacher/dashboard',
          parent: '/parent-monitor',
          student: '/dashboard',
        };
        router.push(dashboardByType[accountType!] || '/dashboard');
      } else {
        setError(result.error || 'Registration failed');
      }
    } catch {
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
          {step === 2 && (
            <button
              onClick={handleBack}
              className={cn(
                'mb-4 flex items-center gap-1.5 text-sm transition-colors',
                theme === 'dark' ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'
              )}
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
          )}
          <h1 className={cn(
            'text-2xl font-bold mb-2',
            theme === 'dark' ? 'text-white' : 'text-slate-800'
          )}>
            {step === 1 ? 'Create Your Account' : 'Complete Registration'}
          </h1>
          <p className={cn(
            'text-sm',
            theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
          )}>
            {step === 1 ? 'Choose your account type to get started' : accountType === 'student' ? 'Student account �?start learning' : accountType === 'parent' ? 'Parent account �?monitor progress' : 'Teacher account �?manage classes'}
          </p>
        </div>

        {step === 1 && (
          <div className="space-y-4">
            {error && (
              <div className={cn(
                'rounded-xl p-4 text-sm font-medium flex items-center gap-3',
                'bg-red-50 dark:bg-red-900/20',
                'border border-red-200 dark:border-red-800',
                'text-red-600 dark:text-red-400'
              )}>
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="button"
              onClick={() => handleSelectAccountType('student')}
              className={cn(
                'w-full rounded-2xl border-2 p-6 text-left transition-all duration-300',
                'hover:scale-[1.02] active:scale-[0.99]',
                'dark:bg-slate-800/60 dark:border-slate-600/40 dark:hover:border-blue-500/60',
                'bg-white/80 border-slate-200/50 hover:border-blue-400'
              )}
            >
              <div className="flex items-start gap-4">
                <div className={cn(
                  'w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0',
                  'bg-blue-100 dark:bg-blue-900/40'
                )}>
                  <GraduationCap className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className={cn(
                    'font-semibold text-base mb-1',
                    theme === 'dark' ? 'text-white' : 'text-slate-800'
                  )}>
                    Student
                  </div>
                  <div className={cn(
                    'text-sm',
                    theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                  )}>
                    Upload documents, build knowledge graphs, take quizzes
                  </div>
                </div>
                <ChevronIcon theme={theme} />
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleSelectAccountType('teacher')}
              className={cn(
                'w-full rounded-2xl border-2 p-6 text-left transition-all duration-300',
                'hover:scale-[1.02] active:scale-[0.99]',
                'dark:bg-slate-800/60 dark:border-slate-600/40 dark:hover:border-emerald-500/60',
                'bg-white/80 border-slate-200/50 hover:border-emerald-400'
              )}
            >
              <div className="flex items-start gap-4">
                <div className={cn(
                  'w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0',
                  'bg-emerald-100 dark:bg-emerald-900/40'
                )}>
                  <School className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className={cn(
                    'font-semibold text-base mb-1',
                    theme === 'dark' ? 'text-white' : 'text-slate-800'
                  )}>
                    Teacher
                  </div>
                  <div className={cn(
                    'text-sm',
                    theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                  )}>
                    Create quizzes, manage classes, monitor student progress
                  </div>
                </div>
                <ChevronIcon theme={theme} />
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleSelectAccountType('parent')}
              className={cn(
                'w-full rounded-2xl border-2 p-6 text-left transition-all duration-300',
                'hover:scale-[1.02] active:scale-[0.99]',
                'dark:bg-slate-800/60 dark:border-slate-600/40 dark:hover:border-purple-500/60',
                'bg-white/80 border-slate-200/50 hover:border-purple-400'
              )}
            >
              <div className="flex items-start gap-4">
                <div className={cn(
                  'w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0',
                  'bg-purple-100 dark:bg-purple-900/40'
                )}>
                  <Users className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className={cn(
                    'font-semibold text-base mb-1',
                    theme === 'dark' ? 'text-white' : 'text-slate-800'
                  )}>
                    Parent
                  </div>
                  <div className={cn(
                    'text-sm',
                    theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                  )}>
                    Monitor your child's study progress and performance
                  </div>
                </div>
                <ChevronIcon theme={theme} />
              </div>
            </button>

            <div className="mt-6 text-center">
              <p className={cn(
                'text-sm',
                theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
              )}>
                Already have an account?{' '}
                <Link
                  href="/auth/login"
                  className={cn(
                    'font-semibold transition-colors duration-300',
                    theme === 'dark'
                      ? 'text-blue-400 hover:text-blue-300'
                      : 'text-blue-600 hover:text-blue-500'
                  )}
                >
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        )}

        {step === 2 && (
          <>
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

            <div className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium mb-5',
              accountType === 'student'
                ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                : accountType === 'parent'
                ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300'
                : 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
            )}>
              {accountType === 'student' ? (
                <GraduationCap className="h-3.5 w-3.5" />
              ) : accountType === 'parent' ? (
                <Users className="h-3.5 w-3.5" />
              ) : (
                <School className="h-3.5 w-3.5" />
              )}
              {accountType === 'student' ? 'Student Account' : accountType === 'parent' ? 'Parent Account' : 'Teacher Account'}
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label htmlFor="name" className={cn(
                  'text-sm font-medium block',
                  theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                )}>
                  Full Name
                </label>
                <div className="relative">
                  <User className={cn(
                    'absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5',
                    theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
                  )} />
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your full name"
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
                <label htmlFor="email" className={cn(
                  'text-sm font-medium block',
                  theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                )}>
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
                <label htmlFor="password" className={cn(
                  'text-sm font-medium block',
                  theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                )}>
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
                    placeholder="At least 8 characters"
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
                    <span>Creating account...</span>
                  </>
                ) : (
                  <span>Create Account</span>
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className={cn(
                'text-sm',
                theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
              )}>
                Already have an account?{' '}
                <Link
                  href="/auth/login"
                  className={cn(
                    'font-semibold transition-colors duration-300',
                    theme === 'dark'
                      ? 'text-blue-400 hover:text-blue-300'
                      : 'text-blue-600 hover:text-blue-500'
                  )}
                >
                  Sign in
                </Link>
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ChevronIcon({ theme }: { theme: 'light' | 'dark' }) {
  return (
    <svg
      className={cn('w-5 h-5 flex-shrink-0', theme === 'dark' ? 'text-slate-500' : 'text-slate-400')}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}