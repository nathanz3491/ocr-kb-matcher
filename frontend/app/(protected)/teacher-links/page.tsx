'use client';

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Teacher Links" };

'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

  Link2, Users, Clock, RefreshCw, Loader2,
  CheckCircle2, XCircle, Trash2, Shield
} from 'lucide-react';

interface LinkedTeacher {
  linkId: string;
  teacherId: string;
  teacherName: string;
  teacherEmail: string;
  linkedAt: string;
}

function GlassCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const { theme } = useTheme();
  return (
    <div className={clsx(
      'rounded-2xl border backdrop-blur-xl p-6 shadow-2xl',
      theme === 'dark'
        ? 'bg-slate-800/40 border-slate-700/30'
        : 'bg-white/60 border-white/40',
      className
    )}>
      {children}
    </div>
  );
}

function CountdownTimer({ expiresAt, onExpire }: { expiresAt: number; onExpire: () => void }) {
  const [remaining, setRemaining] = useState<number>(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const update = () => {
      const ms = expiresAt - Date.now();
      if (ms <= 0) {
        setRemaining(0);
        if (intervalRef.current) clearInterval(intervalRef.current);
        onExpire();
      } else {
        setRemaining(ms);
      }
    };
    update();
    intervalRef.current = setInterval(update, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [expiresAt, onExpire]);

  const mins = Math.floor(remaining / 60000);
  const secs = Math.floor((remaining % 60000) / 1000);
  return (
    <span className="font-mono text-sm tabular-nums">
      {mins}:{secs.toString().padStart(2, '0')}
    </span>
  );
}

export default function TeacherLinksPage() {
  const { theme } = useTheme();
  const { user } = useAuth();

  const [code, setCode] = useState<string | null>(null);
  const [codeExpires, setCodeExpires] = useState<number | null>(null);
  const [expired, setExpired] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [linkedTeachers, setLinkedTeachers] = useState<LinkedTeacher[]>([]);
  const [loadingTeachers, setLoadingTeachers] = useState(true);
  const [unlinkingId, setUnlinkingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const isStudent = user?.accountType === 'student';

  useEffect(() => {
    if (user && user.accountType !== 'student') {
      router.replace('/');
    }
  }, [user, router]);

  useEffect(() => {
    if (!isStudent) return;
    teacherLinkApi.getMyTeacherLinks().then(res => {
      setLoadingTeachers(false);
      if (res.success && res.data) setLinkedTeachers(res.data);
    });
  }, [isStudent]);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await teacherLinkApi.generateTeacherCode();
      if (res.success && res.data) {
        setCode(res.data.code);
        setCodeExpires(res.data.expiresAt);
        setExpired(false);
      } else {
        setError(res.error || 'Failed to generate code');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const handleExpire = () => {
    setExpired(true);
    setCode(null);
    setCodeExpires(null);
  };

  const handleUnlink = async (linkId: string) => {
    setUnlinkingId(linkId);
    try {
      const res = await teacherLinkApi.unlinkTeacher(linkId);
      if (res.success) {
        setLinkedTeachers(prev => prev.filter(t => t.linkId !== linkId));
      }
    } finally {
      setUnlinkingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 blur-3xl" />
      </div>
      <Navigation />
      <main className="relative max-w-2xl mx-auto px-4 pt-24 pb-12">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-8">Teacher Links</h1>

        <GlassCard>
          {isStudent ? (
            <>
              {code && codeExpires && !expired ? (
                <div className="mb-4">
                  <div className={clsx(
                    'rounded-xl p-4 text-center',
                    theme === 'dark' ? 'bg-slate-700/50' : 'bg-slate-50'
                  )}>
                    <p className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Your Teacher Link Code</p>
                    <p className="text-4xl font-mono font-bold tracking-widest text-blue-600 dark:text-blue-400 mb-2">
                      {code}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1">
                      <Clock className="h-3 w-3" />
                      Expires in <CountdownTimer expiresAt={codeExpires} onExpire={handleExpire} />
                    </p>
                  </div>
                </div>
              ) : (
                <p className={clsx(
                  'rounded-xl p-3 text-sm mb-4',
                  theme === 'dark' ? 'bg-slate-700/30 text-slate-400' : 'bg-slate-50 text-slate-500'
                )}>
                  No active code. Generate one to share with your teacher.
                </p>
              )}

              {error && (
                <div className={clsx(
                  'rounded-xl p-3 text-sm mb-4 flex items-center gap-2',
                  'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800',
                  'text-red-600 dark:text-red-400'
                )}>
                  <XCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              <button
                onClick={handleGenerate}
                disabled={generating}
                className={clsx(
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
                {generating ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : expired || (code && !expired) ? (
                  <RefreshCw className="h-5 w-5" />
                ) : (
                  <Shield className="h-5 w-5" />
                )}
                {generating ? 'Generating�? : expired || (code && !expired) ? 'Regenerate Code' : 'Generate Teacher Link Code'}
              </button>

              {!loadingTeachers && (
                <div className="mt-6 pt-6 border-t border-slate-200/50 dark:border-slate-700/50">
                  <div className="flex items-center gap-2 mb-3">
                    <Users className={clsx('h-4 w-4', theme === 'dark' ? 'text-slate-400' : 'text-slate-500')} />
                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Linked Teachers</h3>
                  </div>
                  {linkedTeachers.length === 0 ? (
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      No teachers linked yet.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {linkedTeachers.map(teacher => (
                        <div key={teacher.linkId} className={clsx(
                          'rounded-xl p-3 flex items-center justify-between',
                          theme === 'dark' ? 'bg-slate-700/30' : 'bg-slate-50'
                        )}>
                          <div>
                            <p className="text-sm font-medium text-slate-800 dark:text-white">{teacher.teacherName}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{teacher.teacherEmail}</p>
                          </div>
                          <button
                            onClick={() => handleUnlink(teacher.linkId)}
                            disabled={unlinkingId === teacher.linkId}
                            className={clsx(
                              'p-2 rounded-lg transition-all duration-200',
                              'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20',
                              'disabled:opacity-50 disabled:cursor-not-allowed'
                            )}
                            title="Unlink teacher"
                          >
                            {unlinkingId === teacher.linkId ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              This feature is only available for student accounts.
            </p>
          )}
        </GlassCard>
      </main>
    </div>
  );
}