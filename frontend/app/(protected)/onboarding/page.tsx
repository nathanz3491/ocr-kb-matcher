'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/components/theme/ThemeProvider';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import {
  Loader2,
  ChevronRight,
  ChevronLeft,
  BookOpen,
  GraduationCap,
  Library,
  Check,
  Sparkles,
} from 'lucide-react';

type Grade = '小学' | '初中' | '高中';
type Subject = '语文' | '数学' | '英语' | '物理' | '化学' | '生物' | '历史' | '地理' | '政治';
type Edition = '人教版' | '部编版' | '北师大版';

const GRADES: Grade[] = ['小学', '初中', '高中'];

const SUBJECTS: Subject[] = [
  '语文', '数学', '英语', '物理', '化学', '生物', '历史', '地理', '政治',
];

const EDITIONS: Edition[] = ['人教版', '部编版', '北师大版'];

function getPackId(grade: Grade, subject: Subject, _edition: Edition): string {
  if (grade === '高中' && subject === '语文') return 'gushiwen-72';
  if (grade === '高中' && subject === '数学') return 'shuxue-bixiu-1';
  return 'default';
}

export default function OnboardingPage() {
  const { theme } = useTheme();
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [grade, setGrade] = useState<Grade | null>(null);
  const [subject, setSubject] = useState<Subject | null>(null);
  const [edition, setEdition] = useState<Edition | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLoadPack = async (packId: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/api/users/me/load-pack', { packId });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem('pack-loaded', 'yes');
        router.push('/dashboard');
      } else {
        setError(data.error || '加载失败，请重试');
      }
    } catch {
      setError('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    handleLoadPack('default');
  };

  const handleSelectEdition = (ed: Edition) => {
    setEdition(ed);
    if (grade && subject) {
      const packId = getPackId(grade, subject, ed);
      handleLoadPack(packId);
    }
  };

  const stepLabels = ['选择学段', '选择科目', '选择版本'];

  return (
    <div className={cn(
      'min-h-screen flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden',
      'bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50',
      'dark:from-slate-900 dark:via-slate-800 dark:to-slate-900'
    )}>
      {/* Decorative orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 blur-3xl" />
      </div>

      <div className={cn(
        'w-full max-w-lg relative z-10',
        'rounded-2xl border backdrop-blur-xl p-6 sm:p-8 shadow-2xl',
        theme === 'dark'
          ? 'bg-slate-800/40 border-slate-700/30'
          : 'bg-white/60 border-white/40'
      )}>
        {/* Header */}
        <div className="text-center mb-8">
          <div className={cn(
            'inline-flex items-center justify-center h-12 w-12 rounded-xl mb-4',
            theme === 'dark' ? 'bg-blue-600/20' : 'bg-blue-100'
          )}>
            <Sparkles className={cn(
              'h-6 w-6',
              theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
            )} />
          </div>
          <h1 className={cn(
            'text-2xl font-bold mb-2',
            theme === 'dark' ? 'text-white' : 'text-slate-800'
          )}>
            欢迎使用
          </h1>
          <p className={cn(
            'text-sm',
            theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
          )}>
            选择你的学习内容，开始智能学习之旅
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {stepLabels.map((label, idx) => {
            const s = idx + 1;
            const isActive = s === step;
            const isDone = s < step;
            return (
              <div key={label} className="flex items-center gap-2">
                <div className={cn(
                  'flex items-center justify-center h-8 w-8 rounded-full text-sm font-semibold transition-all duration-300',
                  isDone
                    ? 'bg-green-500 text-white'
                    : isActive
                      ? theme === 'dark'
                        ? 'bg-blue-600 text-white'
                        : 'bg-blue-500 text-white'
                      : theme === 'dark'
                        ? 'bg-slate-700 text-slate-400'
                        : 'bg-slate-200 text-slate-500'
                )}>
                  {isDone ? <Check className="h-4 w-4" /> : s}
                </div>
                <span className={cn(
                  'text-xs font-medium hidden sm:inline',
                  isActive
                    ? theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                    : theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
                )}>
                  {label}
                </span>
                {idx < stepLabels.length - 1 && (
                  <div className={cn(
                    'h-px w-6 sm:w-10',
                    s < step
                      ? 'bg-green-500'
                      : theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'
                  )} />
                )}
              </div>
            );
          })}
        </div>

        {/* Error */}
        {error && (
          <div className={cn(
            'rounded-xl p-3 mb-6 text-sm font-medium',
            'bg-red-50 dark:bg-red-900/20',
            'border border-red-200 dark:border-red-800',
            'text-red-600 dark:text-red-400'
          )}>
            {error}
          </div>
        )}

        {/* Step 1: Grade */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className={cn(
              'text-lg font-semibold mb-4',
              theme === 'dark' ? 'text-white' : 'text-slate-800'
            )}>
              你目前在哪个学段？
            </h2>
            <div className="grid grid-cols-1 gap-3">
              {GRADES.map((g) => (
                <button
                  key={g}
                  onClick={() => { setGrade(g); setStep(2); }}
                  className={cn(
                    'flex items-center gap-4 p-4 rounded-xl border-2 transition-all duration-300',
                    grade === g
                      ? theme === 'dark'
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-blue-500 bg-blue-50'
                      : theme === 'dark'
                        ? 'border-slate-700/50 hover:border-slate-600/50'
                        : 'border-slate-200/50 hover:border-slate-300/50'
                  )}
                >
                  <div className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-xl',
                    grade === g
                      ? theme === 'dark' ? 'bg-blue-600/20' : 'bg-blue-100'
                      : theme === 'dark' ? 'bg-slate-700/50' : 'bg-slate-100'
                  )}>
                    <GraduationCap className={cn(
                      'h-5 w-5',
                      grade === g
                        ? theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                        : theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                    )} />
                  </div>
                  <div className="flex-1 text-left">
                    <p className={cn(
                      'font-semibold',
                      grade === g
                        ? theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                        : theme === 'dark' ? 'text-white' : 'text-slate-800'
                    )}>
                      {g}
                    </p>
                  </div>
                  <ChevronRight className={cn(
                    'h-5 w-5',
                    grade === g
                      ? theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                      : theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
                  )} />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Subject */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <button
                onClick={() => setStep(1)}
                className={cn(
                  'flex items-center gap-1 text-sm font-medium transition-colors duration-300',
                  theme === 'dark'
                    ? 'text-slate-400 hover:text-slate-300'
                    : 'text-slate-500 hover:text-slate-700'
                )}
              >
                <ChevronLeft className="h-4 w-4" />
                返回
              </button>
              <h2 className={cn(
                'text-lg font-semibold',
                theme === 'dark' ? 'text-white' : 'text-slate-800'
              )}>
                选择科目
              </h2>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {SUBJECTS.map((s) => (
                <button
                  key={s}
                  onClick={() => { setSubject(s); setStep(3); }}
                  className={cn(
                    'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-300',
                    subject === s
                      ? theme === 'dark'
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-blue-500 bg-blue-50'
                      : theme === 'dark'
                        ? 'border-slate-700/50 hover:border-slate-600/50'
                        : 'border-slate-200/50 hover:border-slate-300/50'
                  )}
                >
                  <BookOpen className={cn(
                    'h-5 w-5',
                    subject === s
                      ? theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                      : theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                  )} />
                  <span className={cn(
                    'text-sm font-medium',
                    subject === s
                      ? theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                      : theme === 'dark' ? 'text-white' : 'text-slate-700'
                  )}>
                    {s}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Edition */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <button
                onClick={() => setStep(2)}
                className={cn(
                  'flex items-center gap-1 text-sm font-medium transition-colors duration-300',
                  theme === 'dark'
                    ? 'text-slate-400 hover:text-slate-300'
                    : 'text-slate-500 hover:text-slate-700'
                )}
              >
                <ChevronLeft className="h-4 w-4" />
                返回
              </button>
              <h2 className={cn(
                'text-lg font-semibold',
                theme === 'dark' ? 'text-white' : 'text-slate-800'
              )}>
                选择教材版本
              </h2>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {EDITIONS.map((e) => (
                <button
                  key={e}
                  onClick={() => handleSelectEdition(e)}
                  disabled={loading}
                  className={cn(
                    'flex items-center gap-4 p-4 rounded-xl border-2 transition-all duration-300',
                    edition === e
                      ? theme === 'dark'
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-blue-500 bg-blue-50'
                      : theme === 'dark'
                        ? 'border-slate-700/50 hover:border-slate-600/50'
                        : 'border-slate-200/50 hover:border-slate-300/50',
                    'disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                >
                  <div className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-xl',
                    edition === e
                      ? theme === 'dark' ? 'bg-blue-600/20' : 'bg-blue-100'
                      : theme === 'dark' ? 'bg-slate-700/50' : 'bg-slate-100'
                  )}>
                    <Library className={cn(
                      'h-5 w-5',
                      edition === e
                        ? theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                        : theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                    )} />
                  </div>
                  <div className="flex-1 text-left">
                    <p className={cn(
                      'font-semibold',
                      edition === e
                        ? theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                        : theme === 'dark' ? 'text-white' : 'text-slate-800'
                    )}>
                      {e}
                    </p>
                  </div>
                  {loading && edition === e ? (
                    <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                  ) : (
                    <ChevronRight className={cn(
                      'h-5 w-5',
                      edition === e
                        ? theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                        : theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
                    )} />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Skip */}
        <div className="mt-8 text-center">
          <button
            onClick={handleSkip}
            disabled={loading}
            className={cn(
              'text-sm font-medium transition-colors duration-300',
              theme === 'dark'
                ? 'text-slate-400 hover:text-slate-300'
                : 'text-slate-500 hover:text-slate-700'
            )}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                加载中...
              </span>
            ) : (
              '跳过，使用默认内容'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
