'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { Navigation } from '@/components/navigation/Navigation';
import { Loader2, FileText, BookOpen, ChevronRight, Layers, Moon, Sun, Brain, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import axios from 'axios';
import { usePageLoading } from '@/components/loading/LoadingScreen';
import { LoadingOverlay } from '@/components/loading/MinimalLoader';
import { useTheme } from '@/components/theme/ThemeProvider';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

interface CheatSheet {
  nodeId: string;
  nodeTitle: string;
  category: string;
  keyPoints: string[];
  formulas?: string[];
  examples?: string[];
}

interface StudyNotes {
  nodeId: string;
  nodeTitle: string;
  category: string;
  summary: string;
  notes: string;
}

interface WrongQuestionReview {
  reviewId: string;
  jobId: string;
  questionText: string;
  matchedNodes: Array<{
    kbEntryId: string;
    confidence: number;
    reasoning: string;
    title?: string;
    category?: string;
  }>;
  nextReview: string;
  reviewCount: number;
}

interface ReviewContentProps {
  initialTab?: 'cheat-sheets' | 'notes' | 'due' | 'wrong-questions';
}

function ReviewContent({ initialTab = 'cheat-sheets' }: ReviewContentProps) {
  const [cheatSheets, setCheatSheets] = useState<CheatSheet[]>([]);
  const [studyNotes, setStudyNotes] = useState<StudyNotes[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'cheat-sheets' | 'notes' | 'due' | 'wrong-questions'>(initialTab);
  const [dueReviews, setDueReviews] = useState<any[]>([]);
  const [reviewStats, setReviewStats] = useState<{ totalDue: number; totalReviewed: number; retentionRate: number }>({ totalDue: 0, totalReviewed: 0, retentionRate: 0 });
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [wrongReviews, setWrongReviews] = useState<WrongQuestionReview[]>([]);
  const { isLoading, loadedCount, totalCount, setLoading: setPageLoading } = usePageLoading(1);

  const router = useRouter();

  const handleTabChange = useCallback((tab: typeof activeTab) => {
    setActiveTab(tab);
    router.push(`/review?tab=${tab}`, { scroll: false });
  }, [router]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setPageLoading(0, true);
      const [cheatRes, notesRes, reviewsRes, wrongRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/study/cheat-sheets`, { timeout: 5000 }),
        axios.get(`${API_BASE_URL}/api/study/notes`, { timeout: 5000 }),
        axios.get(`${API_BASE_URL}/api/reviews/due`, { timeout: 5000 }).catch(() => ({ data: { success: false } })),
        axios.get(`${API_BASE_URL}/api/wrong-questions/due`, { timeout: 5000 }).catch(() => ({ data: { success: false } })),
      ]);

      if (cheatRes.data.success) {
        setCheatSheets(cheatRes.data.data.sheets || []);
      }
      if (notesRes.data.success) {
        setStudyNotes(notesRes.data.data.notes || []);
      }
      if (reviewsRes.data.success) {
        setDueReviews(reviewsRes.data.data.reviews || []);
        setReviewStats(reviewsRes.data.data.stats || { totalDue: 0, totalReviewed: 0, retentionRate: 0 });
      }
      if (wrongRes.data.success) {
        setWrongReviews(wrongRes.data.data.reviews || []);
      }
    } catch (err) {
      console.warn('Using offline mode for study materials');
    } finally {
      setLoading(false);
      setPageLoading(0, false);
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'Algebra': 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
      'Geometry': 'bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
      'Functions': 'bg-violet-100 dark:bg-violet-900 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800',
      'Statistics': 'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
      'Vectors': 'bg-rose-100 dark:bg-rose-900 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
      'Analytic Geometry': 'bg-cyan-100 dark:bg-cyan-900 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800',
    };
    return colors[category] || 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <Navigation />
        <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
          <div className="text-center">
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-blue-600 dark:text-blue-400" />
            <p className="mt-4 text-slate-600 dark:text-slate-400">Loading study materials...</p>
          </div>
        </div>
      </div>
    );
  }

  const hasMaterials = cheatSheets.length > 0 || studyNotes.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <Navigation />

      <main className="mx-auto max-w-7xl px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Review</h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400">
            Access cheat sheets and study notes for all your learned topics.
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-2 border-b border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setActiveTab('cheat-sheets')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all border-b-2 ${
              activeTab === 'cheat-sheets'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <FileText className="h-4 w-4" />
            Cheat Sheets ({cheatSheets.length})
          </button>
          <button
            onClick={() => setActiveTab('notes')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all border-b-2 ${
              activeTab === 'notes'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <BookOpen className="h-4 w-4" />
            Study Notes ({studyNotes.length})
          </button>
          <button
            onClick={() => setActiveTab('due')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all border-b-2 ${
              activeTab === 'due'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Brain className="h-4 w-4" />
            Due Reviews ({reviewStats.totalDue})
          </button>
          <button
            onClick={() => handleTabChange('wrong-questions')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all border-b-2 ${
              activeTab === 'wrong-questions'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <AlertCircle className="h-4 w-4" />
            Wrong Questions ({wrongReviews.length})
          </button>
        </div>

        {/* Content */}
        {activeTab === 'wrong-questions' && (
          <div>
            <div className="mb-6 grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-white/40 dark:border-slate-700/50 bg-white/70 dark:bg-slate-800/70 p-4 text-center backdrop-blur-sm">
                <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{wrongReviews.length}</div>
                <div className="text-sm text-slate-500 dark:text-slate-400">Due Now</div>
              </div>
              <div className="rounded-xl border border-white/40 dark:border-slate-700/50 bg-white/70 dark:bg-slate-800/70 p-4 text-center backdrop-blur-sm">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{wrongReviews.reduce((acc, r) => acc + r.reviewCount, 0)}</div>
                <div className="text-sm text-slate-500 dark:text-slate-400">Total Scheduled</div>
              </div>
            </div>
            {wrongReviews.length === 0 ? (
              <div className="rounded-2xl border border-white/40 dark:border-slate-700/50 bg-white/70 dark:bg-slate-800/70 p-12 text-center shadow-lg backdrop-blur-sm">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900">
                  <CheckCircle className="h-8 w-8 text-amber-500" />
                </div>
                <h2 className="mb-2 text-xl font-semibold text-slate-800 dark:text-slate-200">No Wrong Questions Scheduled</h2>
                <p className="text-slate-600 dark:text-slate-400">Keep learning and wrong questions will appear here for spaced repetition review.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {wrongReviews.map((review) => (
                  <div
                    key={review.reviewId}
                    className="group rounded-2xl border border-amber-200/50 dark:border-amber-800/50 bg-white/70 dark:bg-slate-800/70 p-5 shadow-lg dark:shadow-slate-900/30 backdrop-blur-sm transition-all hover:scale-[1.02] hover:shadow-xl"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900 dark:text-amber-300">
                        <Clock className="h-3 w-3" />
                        Due now
                      </span>
                      <span className="text-xs text-slate-400 dark:text-slate-500">#{review.reviewCount} review</span>
                    </div>
                    <p className="mb-3 text-sm font-medium text-slate-700 dark:text-slate-300 line-clamp-2">
                      {review.questionText}
                    </p>
                    <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
                      {review.matchedNodes.length} matched node{review.matchedNodes.length !== 1 ? 's' : ''}
                    </p>
                    <Link
                      href={`/review/wrong-questions/${review.reviewId}`}
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg hover:scale-[1.01] active:scale-[0.99]"
                    >
                      Start Review
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'due' && (
          <div>
            <div className="mb-6 grid grid-cols-3 gap-4">
              <div className="rounded-xl border border-white/40 dark:border-slate-700/50 bg-white/70 dark:bg-slate-800/70 p-4 text-center backdrop-blur-sm">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{reviewStats.totalDue}</div>
                <div className="text-sm text-slate-500 dark:text-slate-400">Due Today</div>
              </div>
              <div className="rounded-xl border border-white/40 dark:border-slate-700/50 bg-white/70 dark:bg-slate-800/70 p-4 text-center backdrop-blur-sm">
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{reviewStats.totalReviewed}</div>
                <div className="text-sm text-slate-500 dark:text-slate-400">Total Reviewed</div>
              </div>
              <div className="rounded-xl border border-white/40 dark:border-slate-700/50 bg-white/70 dark:bg-slate-800/70 p-4 text-center backdrop-blur-sm">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{reviewStats.retentionRate}%</div>
                <div className="text-sm text-slate-500 dark:text-slate-400">Retention</div>
              </div>
            </div>
            {dueReviews.length === 0 ? (
              <div className="rounded-2xl border border-white/40 dark:border-slate-700/50 bg-white/70 dark:bg-slate-800/70 p-12 text-center shadow-lg backdrop-blur-sm">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900">
                  <CheckCircle className="h-8 w-8 text-emerald-500" />
                </div>
                <h2 className="mb-2 text-xl font-semibold text-slate-800 dark:text-slate-200">All Caught Up!</h2>
                <p className="text-slate-600 dark:text-slate-400">No reviews due right now. Great job keeping up with your studies!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {dueReviews.map((review) => (
                  <Link
                    key={review.nodeId}
                    href={`/flashcards/${review.nodeId}`}
                    className="group rounded-2xl border border-white/40 dark:border-slate-700/50 bg-white/70 dark:bg-slate-800/70 p-5 shadow-lg dark:shadow-slate-900/30 backdrop-blur-sm transition-all hover:scale-[1.02] hover:shadow-xl"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                        <Clock className="h-3 w-3" />
                        Due now
                      </span>
                      <span className="text-xs text-slate-400 dark:text-slate-500">#{review.reviewCount} review</span>
                    </div>
                    <h3 className="mb-1 font-semibold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                      {review.nodeId}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Last reviewed: {new Date(review.lastReviewed).toLocaleDateString()}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab !== 'due' && (!hasMaterials ? (
          <div className="rounded-2xl border border-white/40 dark:border-slate-700/50 bg-white/70 dark:bg-slate-800/70 p-12 text-center shadow-lg backdrop-blur-sm">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700">
              <FileText className="h-8 w-8 text-slate-400 dark:text-slate-500" />
            </div>
            <h2 className="mb-2 text-xl font-semibold text-slate-800 dark:text-slate-200">No Study Materials Yet</h2>
            <p className="mb-6 text-slate-600 dark:text-slate-400">
              Upload documents and learn topics to generate cheat sheets and notes.
            </p>
            <Link
              href="/learn"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-3 font-medium text-white shadow-md transition-all hover:from-blue-600 hover:to-indigo-600"
            >
              <Layers className="h-5 w-5" />
              Go to Learning Hub
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {activeTab === 'cheat-sheets' && cheatSheets.map((sheet) => (
              <Link
                key={sheet.nodeId}
                href={`/review/cheat-sheet/${sheet.nodeId}`}
                className="group rounded-2xl border border-white/40 dark:border-slate-700/50 bg-white/70 dark:bg-slate-800/70 p-5 shadow-lg dark:shadow-slate-900/30 backdrop-blur-sm transition-all hover:scale-[1.02] hover:shadow-xl"
              >
                <div className="mb-3 flex items-start justify-between">
                  <span className={`inline-block rounded-full px-3 py-1 text-xs font-medium border ${getCategoryColor(sheet.category)}`}>
                    {sheet.category}
                  </span>
                  <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-blue-500 transition-colors" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                  {sheet.nodeTitle}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {sheet.keyPoints.length} key points
                </p>
                {sheet.formulas && sheet.formulas.length > 0 && (
                  <div className="mt-2 text-xs text-slate-400 dark:text-slate-500">
                    {sheet.formulas.length} formulas
                  </div>
                )}
              </Link>
            ))}

            {activeTab === 'notes' && studyNotes.map((note) => (
              <Link
                key={note.nodeId}
                href={`/review/notes/${note.nodeId}`}
                className="group rounded-2xl border border-white/40 dark:border-slate-700/50 bg-white/70 dark:bg-slate-800/70 p-5 shadow-lg dark:shadow-slate-900/30 backdrop-blur-sm transition-all hover:scale-[1.02] hover:shadow-xl"
              >
                <div className="mb-3 flex items-start justify-between">
                  <span className={`inline-block rounded-full px-3 py-1 text-xs font-medium border ${getCategoryColor(note.category)}`}>
                    {note.category}
                  </span>
                  <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-blue-500 transition-colors" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                  {note.nodeTitle}
                </h3>
                <p className="line-clamp-2 text-sm text-slate-600 dark:text-slate-400">
                  {note.summary}
                </p>
              </Link>
            ))}
          </div>
        ))}
      </main>

      <LoadingOverlay
        isLoading={isLoading}
        message="Loading review materials..."
      />
    </div>
  );
}

function ReviewPageInner() {
  const searchParams = useSearchParams();

  const tabParam = searchParams.get('tab');
  let initialTab: 'cheat-sheets' | 'notes' | 'due' | 'wrong-questions' = 'cheat-sheets';
  if (tabParam === 'cheat-sheets' || tabParam === 'notes' || tabParam === 'due' || tabParam === 'wrong-questions') {
    initialTab = tabParam;
  }

  return <ReviewContent initialTab={initialTab} />;
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <Navigation />
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-blue-600 dark:text-blue-400" />
          <p className="mt-4 text-slate-600 dark:text-slate-400">Loading review...</p>
        </div>
      </div>
    </div>
  );
}

export default function ReviewPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ReviewPageInner />
    </Suspense>
  );
}
