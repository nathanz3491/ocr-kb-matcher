'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users, BarChart3, Brain, FileText, GraduationCap,
  ChevronRight, Loader2, AlertCircle, TrendingUp,
  Flame, Award, BookOpen, Calendar
} from 'lucide-react';
import { Navigation } from '@/components/navigation/Navigation';
import { cn } from '@/lib/utils';
import { useTheme } from '@/components/theme/ThemeProvider';
import { parentMonitorApi } from '@/lib/auth';

interface LinkedStudent {
  linkId: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  linkedAt: string;
}

interface StudentOverview {
  student: { id: string; name: string; email: string };
  knowledgeGraph: { nodes: any[]; edges: any[] };
  userProgress: {
    totalNodes?: number;
    learnedNodes?: number;
    progressPercentage?: number;
    streakDays?: number;
  };
  reviews: { dueCount?: number; total?: number };
  quizResults: { sessions?: any[]; averageScore?: number };
  certificates: { total?: number; recent?: any[] };
}

export default function ParentMonitorPage() {
  const router = useRouter();
  const { theme } = useTheme();

  const [linkedStudents, setLinkedStudents] = useState<LinkedStudent[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<LinkedStudent | null>(null);
  const [overview, setOverview] = useState<StudentOverview | null>(null);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [loadingOverview, setLoadingOverview] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'graph' | 'reviews' | 'quiz'>('overview');
  const [revokingLinkId, setRevokingLinkId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch linked students on mount
  useEffect(() => {
    const fetchStudents = async () => {
      setLoadingStudents(true);
      try {
        const res = await parentMonitorApi.getLinkedStudents();
        if (res.success && res.data) {
          setLinkedStudents(res.data);
          if (res.data.length > 0) setSelectedStudent(res.data[0]);
        }
      } catch { setError('Failed to load linked students'); }
      finally { setLoadingStudents(false); }
    };
    fetchStudents();
  }, []);

  // Fetch overview when student is selected
  useEffect(() => {
    if (!selectedStudent) return;
    const fetchOverview = async () => {
      setLoadingOverview(true);
      try {
        const res = await parentMonitorApi.getStudentOverview(selectedStudent.studentId);
        if (res.success && res.data) setOverview(res.data);
        else setError(res.error || 'Failed to load student data');
      } catch { setError('Failed to load student data'); }
      finally { setLoadingOverview(false); }
    };
    fetchOverview();
  }, [selectedStudent]);

  const handleRevokeLink = async (linkId: string) => {
    setRevokingLinkId(linkId);
    try {
      const res = await parentMonitorApi.revokeLink(linkId);
      if (res.success) {
        const updated = linkedStudents.filter(s => s.linkId !== linkId);
        setLinkedStudents(updated);
        if (selectedStudent?.linkId === linkId) {
          setSelectedStudent(updated[0] || null);
          setOverview(null);
        }
      }
    } catch { /* non-critical */ }
    finally { setRevokingLinkId(null); }
  };

  if (loadingStudents) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <Navigation />
        <div className="flex items-center justify-center h-[calc(100vh-80px)]">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <Navigation />
      <main className="mx-auto max-w-7xl px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800 dark:text-white">My Students</h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400">
            Monitor your children&apos;s learning progress and achievements
          </p>
        </div>

        {/* Empty state */}
        {linkedStudents.length === 0 && (
          <div className={cn(
            'rounded-2xl border p-12 text-center',
            theme === 'dark' ? 'bg-slate-800/40 border-slate-700/30' : 'bg-white/60 border-white/40'
          )}>
            <Users className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600 mb-4" />
            <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">No Students Linked Yet</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 max-w-md mx-auto">
              Ask your child to generate a monitoring code from their dashboard and enter it during registration to link their account.
            </p>
            <button
              onClick={() => router.push('/auth/register')}
              className={cn(
                'rounded-xl px-6 py-3 text-sm font-semibold',
                theme === 'dark'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                  : 'bg-gradient-to-r from-purple-500 to-pink-600 text-white',
                'shadow-lg hover:scale-[1.01] active:scale-[0.99]'
              )}
            >
              Register as Parent
            </button>
          </div>
        )}

        {/* Main layout */}
        {linkedStudents.length > 0 && (
          <div className="flex gap-6">
            {/* Left sidebar */}
            <div className="w-72 shrink-0">
              <div className={cn(
                'rounded-2xl border p-4 sticky top-4',
                theme === 'dark' ? 'bg-slate-800/40 border-slate-700/30' : 'bg-white/60 border-white/40'
              )}>
                <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 px-2">
                  Linked Students ({linkedStudents.length}/3)
                </h2>
                <div className="space-y-2">
                  {linkedStudents.map(student => (
                    <button
                      key={student.linkId}
                      onClick={() => setSelectedStudent(student)}
                      className={cn(
                        'w-full rounded-xl p-3 text-left transition-all',
                        selectedStudent?.linkId === student.linkId
                          ? theme === 'dark'
                            ? 'bg-gradient-to-r from-purple-600/30 to-blue-600/30 border border-purple-500/40'
                            : 'bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200'
                          : theme === 'dark'
                            ? 'hover:bg-slate-700/50 border border-transparent'
                            : 'hover:bg-slate-50 border border-transparent'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          'h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold',
                          selectedStudent?.linkId === student.linkId
                            ? 'bg-gradient-to-br from-purple-500 to-blue-500 text-white'
                            : theme === 'dark' ? 'bg-slate-700 text-slate-400' : 'bg-slate-200 text-slate-600'
                        )}>
                          {student.studentName.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 dark:text-white truncate">{student.studentName}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{student.studentEmail}</p>
                        </div>
                        <ChevronRight className={cn(
                          'h-4 w-4 transition-transform',
                          selectedStudent?.linkId === student.linkId && 'rotate-90',
                          theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
                        )} />
                      </div>
                    </button>
                  ))}
                </div>

                {selectedStudent && (
                  <button
                    onClick={() => handleRevokeLink(selectedStudent.linkId)}
                    disabled={revokingLinkId === selectedStudent.linkId}
                    className="mt-4 w-full rounded-xl py-2.5 text-xs font-medium text-red-500 dark:text-red-400 border border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center justify-center gap-2"
                  >
                    {revokingLinkId === selectedStudent.linkId
                      ? <Loader2 className="h-3 w-3 animate-spin" />
                      : 'Remove This Student'}
                  </button>
                )}
              </div>
            </div>

            {/* Right content */}
            <div className="flex-1 min-w-0">
              {loadingOverview ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
                </div>
              ) : overview ? (
                <>
                  {/* Student header */}
                  <div className="mb-6 flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center text-white text-lg font-bold">
                      {overview.student.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-800 dark:text-white">{overview.student.name}&apos;s Dashboard</h2>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{overview.student.email}</p>
                    </div>
                  </div>

                  {/* Tabs */}
                  <div className="mb-6 flex flex-wrap gap-2">
                    {[
                      { id: 'overview', label: 'Overview', icon: BarChart3 },
                      { id: 'graph', label: 'Knowledge Graph', icon: Brain },
                      { id: 'reviews', label: 'Reviews', icon: FileText },
                      { id: 'quiz', label: 'Quiz', icon: GraduationCap },
                    ].map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={cn(
                          'flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all',
                          activeTab === tab.id
                            ? theme === 'dark'
                              ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg'
                              : 'bg-gradient-to-r from-purple-500 to-blue-600 text-white shadow-lg'
                            : theme === 'dark'
                              ? 'bg-slate-800/70 text-slate-400 hover:bg-slate-700 border border-slate-700/50'
                              : 'bg-white/70 text-slate-600 hover:bg-white border border-white/40'
                        )}
                      >
                        <tab.icon className="h-4 w-4" />
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* Tab content */}
                  {activeTab === 'overview' && <OverviewTab overview={overview} theme={theme} />}
                  {activeTab === 'graph' && <GraphTab overview={overview} theme={theme} />}
                  {activeTab === 'reviews' && <ReviewsTab overview={overview} theme={theme} />}
                  {activeTab === 'quiz' && <QuizTab overview={overview} theme={theme} />}
                </>
              ) : (
                <div className={cn(
                  'rounded-2xl border p-6 text-center',
                  theme === 'dark' ? 'bg-red-900/20 border-red-800/30' : 'bg-red-50 border-red-200'
                )}>
                  <AlertCircle className="mx-auto h-8 w-8 text-red-500 mb-3" />
                  <p className="text-sm text-red-600 dark:text-red-400">{error || 'Failed to load student data'}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function OverviewTab({ overview, theme }: { overview: StudentOverview; theme: string }) {
  const progress = overview.userProgress;
  const certs = overview.certificates;

  const statCards = [
    { title: 'Topics Learned', value: progress?.learnedNodes ?? 0, subtitle: `of ${progress?.totalNodes ?? 0} total`, icon: <BookOpen className="h-6 w-6 text-blue-600" />, gradient: 'shadow-blue-500/10' },
    { title: 'Progress', value: `${progress?.progressPercentage ?? 0}%`, subtitle: 'Overall completion', icon: <TrendingUp className="h-6 w-6 text-violet-600" />, gradient: 'shadow-violet-500/10' },
    { title: 'Day Streak', value: progress?.streakDays ?? 0, subtitle: progress?.streakDays ? 'Keep it up! 🔥' : 'Start today!', icon: <Flame className="h-6 w-6 text-amber-600" />, gradient: 'shadow-amber-500/10' },
    { title: 'Certificates', value: certs?.total ?? 0, subtitle: 'Earned', icon: <Award className="h-6 w-6 text-yellow-600" />, gradient: 'shadow-yellow-500/10' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card, i) => (
          <div key={i} className={cn(
            'rounded-2xl border bg-white/70 dark:bg-slate-800/70 backdrop-blur-md p-6 shadow-lg',
            theme === 'dark' ? 'border-slate-700/50' : 'border-white/40', card.gradient
          )}>
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-white/80 dark:bg-slate-700/50 shadow-md">{card.icon}</div>
            <div className="text-3xl font-bold text-slate-800 dark:text-white">{card.value}</div>
            <div className="text-sm font-medium text-slate-600 dark:text-slate-400">{card.title}</div>
            {card.subtitle && <div className="mt-1 text-xs text-slate-500 dark:text-slate-500">{card.subtitle}</div>}
          </div>
        ))}
      </div>
      {progress && (
        <div className={cn(
          'rounded-2xl border p-6',
          theme === 'dark' ? 'bg-slate-800/40 border-slate-700/30' : 'bg-white/60 border-white/40'
        )}>
          <div className="mb-2 flex justify-between text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-300">Overall Progress</span>
            <span className="font-bold text-purple-600 dark:text-purple-400">{progress.progressPercentage ?? 0}%</span>
          </div>
          <div className="h-4 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
            <div className="h-full rounded-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all" style={{ width: `${progress.progressPercentage ?? 0}%` }} />
          </div>
        </div>
      )}
    </div>
  );
}

// GraphTab
function GraphTab({ overview, theme }: { overview: StudentOverview; theme: string }) {
  const kg = overview.knowledgeGraph;
  return (
    <div className={cn(
      'rounded-2xl border p-8 text-center',
      theme === 'dark' ? 'bg-slate-800/40 border-slate-700/30' : 'bg-white/60 border-white/40'
    )}>
      <Brain className="mx-auto h-12 w-12 text-blue-500 mb-4" />
      <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Knowledge Graph</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
        {kg?.nodes?.length ?? 0} nodes, {kg?.edges?.length ?? 0} connections
      </p>
      <p className="text-xs text-slate-400 dark:text-slate-500">
        Knowledge graph visualization available in the student&apos;s full dashboard.
      </p>
    </div>
  );
}

// ReviewsTab
function ReviewsTab({ overview, theme }: { overview: StudentOverview; theme: string }) {
  const reviews = overview.reviews;
  return (
    <div className={cn(
      'rounded-2xl border p-6',
      theme === 'dark' ? 'bg-slate-800/40 border-slate-700/30' : 'bg-white/60 border-white/40'
    )}>
      <div className="flex items-center gap-3 mb-4">
        <FileText className="h-5 w-5 text-emerald-500" />
        <h3 className="text-lg font-bold text-slate-800 dark:text-white">Review Stats</h3>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className={cn(
          'rounded-xl p-4 text-center',
          theme === 'dark' ? 'bg-slate-700/50' : 'bg-slate-50'
        )}>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{reviews?.dueCount ?? 0}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">Due Now</div>
        </div>
        <div className={cn(
          'rounded-xl p-4 text-center',
          theme === 'dark' ? 'bg-slate-700/50' : 'bg-slate-50'
        )}>
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{reviews?.total ?? 0}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">Total Reviews</div>
        </div>
      </div>
    </div>
  );
}

// QuizTab
function QuizTab({ overview, theme }: { overview: StudentOverview; theme: string }) {
  const quiz = overview.quizResults;
  const sessions = quiz?.sessions ?? [];
  const avgScore = quiz?.averageScore ?? 0;

  return (
    <div className={cn(
      'rounded-2xl border p-6',
      theme === 'dark' ? 'bg-slate-800/40 border-slate-700/30' : 'bg-white/60 border-white/40'
    )}>
      <div className="flex items-center gap-3 mb-4">
        <GraduationCap className="h-5 w-5 text-violet-500" />
        <h3 className="text-lg font-bold text-slate-800 dark:text-white">Quiz Sessions</h3>
      </div>
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-slate-600 dark:text-slate-400">Average Score</span>
          <span className="font-bold text-violet-600 dark:text-violet-400">{avgScore.toFixed(1)}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
          <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-500" style={{ width: `${avgScore}%` }} />
        </div>
      </div>
      {sessions.length === 0 ? (
        <p className="text-center text-sm text-slate-500 dark:text-slate-400 py-4">No quiz sessions yet</p>
      ) : (
        <div className="space-y-2">
          {sessions.slice(0, 5).map((session: any, i: number) => (
            <div key={i} className={cn(
              'flex items-center justify-between rounded-lg px-3 py-2',
              theme === 'dark' ? 'bg-slate-700/50' : 'bg-slate-50'
            )}>
              <div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Quiz Session #{i + 1}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{session.date || 'Recent'}</p>
              </div>
              <span className="text-sm font-bold text-violet-600 dark:text-violet-400">{session.score ?? 0}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
