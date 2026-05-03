'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Loader2, ArrowLeft, CheckCircle, AlertCircle, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { Navigation } from '@/components/navigation/Navigation';
import { usePageLoading } from '@/components/loading/LoadingScreen';
import { LoadingOverlay } from '@/components/loading/MinimalLoader';

interface PracticeQuestion {
  id: string;
  type: 'multiple_choice';
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

interface WrongQuestionData {
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
  practiceQuestions: PracticeQuestion[];
  nextReview: string;
  reviewCount: number;
}

interface ReviewResult {
  reviewId: string;
  nextReview: string;
  quality: number;
}

export default function WrongQuestionReviewPage({ params }: { params: Promise<{ reviewId: string }> }) {
  const { reviewId } = use(params);
  const [review, setReview] = useState<WrongQuestionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [nextReview, setNextReview] = useState<string>('');
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [revealedAnswers, setRevealedAnswers] = useState<Set<string>>(new Set());
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { isLoading, setLoading: setPageLoading } = usePageLoading(1);

  useEffect(() => {
    fetchReview();
  }, [reviewId]);

  const fetchReview = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/wrong-questions/due');
      const json = await res.json();
      if (json.success) {
        const reviews: WrongQuestionData[] = json.data.reviews || [];
        const found = reviews.find(r => r.reviewId === reviewId);
        setReview(found || null);
      }
    } catch {
      setReview(null);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = (practiceId: string, optionIndex: number, isCorrect: boolean) => {
    setSelectedAnswers(prev => ({ ...prev, [practiceId]: optionIndex }));
    setRevealedAnswers(prev => new Set(prev).add(practiceId));
  };

  const handleSubmit = async (quality: number) => {
    if (!review) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await api.post(`/api/wrong-questions/${review.reviewId}/submit`, { quality });
      const json = await res.json();
      if (json.success) {
        setNextReview(json.data.nextReview || '');
        setCompleted(true);
      } else {
        setSubmitError(json.error || 'Failed to submit review');
      }
    } catch {
      setSubmitError('Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
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

  if (!review) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <Navigation />
        <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
          <div className="text-center max-w-md mx-auto px-4">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900">
              <AlertCircle className="h-8 w-8 text-amber-500" />
            </div>
            <h2 className="mb-2 text-xl font-semibold text-slate-800 dark:text-slate-200">Review Not Found</h2>
            <p className="mb-6 text-slate-600 dark:text-slate-400">This review may have already been completed or does not exist.</p>
            <Link
              href="/review?tab=wrong-questions"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-3 font-medium text-white shadow-md transition-all hover:from-blue-600 hover:to-indigo-600"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Reviews
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <Navigation />
        <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
          <div className="text-center max-w-md mx-auto px-4">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900">
              <CheckCircle className="h-8 w-8 text-emerald-500" />
            </div>
            <h2 className="mb-2 text-xl font-semibold text-slate-800 dark:text-slate-200">Review Complete</h2>
            <p className="mb-2 text-slate-600 dark:text-slate-400">Great work! Your next review is scheduled for:</p>
            <p className="mb-6 text-lg font-semibold text-blue-600 dark:text-blue-400">
              {nextReview ? new Date(nextReview).toLocaleDateString() : 'Sometime soon'}
            </p>
            <Link
              href="/review?tab=wrong-questions"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-3 font-medium text-white shadow-md transition-all hover:from-blue-600 hover:to-indigo-600"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Reviews
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const allPracticeIds = (review.practiceQuestions || []).map(pq => pq.id);
  const allRevealed = allPracticeIds.length > 0 && allPracticeIds.every(id => revealedAnswers.has(id));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <Navigation />

      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6 flex items-center gap-4">
          <Link
            href="/review?tab=wrong-questions"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/40 dark:border-slate-700/50 bg-white/70 dark:bg-slate-800/70 shadow-md backdrop-blur-sm transition-all hover:scale-105"
          >
            <ArrowLeft className="h-5 w-5 text-slate-600 dark:text-slate-300" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Wrong Question Review</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Review #{review.reviewCount}</p>
          </div>
        </div>

        <div className="mb-6 rounded-xl border border-amber-200/50 dark:border-amber-800/50 bg-white/70 dark:bg-slate-800/70 p-5 shadow-md backdrop-blur-sm">
          <div className="mb-3 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Original Question</span>
          </div>
          <p className="text-base font-medium text-slate-800 dark:text-white">{review.questionText}</p>
          <div className="mt-3 flex items-center gap-4">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {review.matchedNodes.length} matched node{review.matchedNodes.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {review.practiceQuestions && review.practiceQuestions.length > 0 && (
          <div className="space-y-4">
            {review.practiceQuestions.map((pq, pqIndex) => {
              const selectedOption = selectedAnswers[pq.id];
              const revealed = revealedAnswers.has(pq.id);
              const isCorrect = selectedOption === pq.correctAnswer;

              return (
                <div key={pq.id} className="relative overflow-hidden rounded-xl border border-slate-200/50 dark:border-slate-600/50 bg-white/80 dark:bg-slate-700/50 shadow-sm hover:shadow-md transition-all duration-300">
                  <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-gradient-to-br from-blue-200/20 to-indigo-200/10 dark:from-blue-900/10 dark:to-indigo-900/5" />
                  <div className="relative z-10 p-4">
                    <div className="flex items-start gap-3 mb-3">
                      <span className="flex-shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/40 dark:to-indigo-900/40 text-blue-600 dark:text-blue-400 text-xs font-bold">
                        {pqIndex + 1}
                      </span>
                      <p className="text-sm font-medium text-slate-800 dark:text-white leading-relaxed flex-1">
                        {pq.question}
                      </p>
                    </div>

                    <div className="space-y-2">
                      {pq.options.map((option, optIndex) => {
                        const isSelected = selectedOption === optIndex;
                        const isCorrectOption = optIndex === pq.correctAnswer;
                        const showResult = revealed && isSelected;

                        let optionClass = 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 hover:border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-slate-700 dark:text-slate-200';
                        if (showResult) {
                          optionClass = isCorrect
                            ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200'
                            : 'border-rose-400 bg-rose-50 dark:bg-rose-900/30 text-rose-800 dark:text-rose-200';
                        }

                        return (
                          <button
                            key={optIndex}
                            onClick={() => !revealed && handleAnswerSelect(pq.id, optIndex, isCorrectOption)}
                            disabled={revealed}
                            className={`w-full flex items-center gap-3 rounded-lg border p-3 text-left text-sm transition-all duration-200 ${optionClass} ${!revealed ? 'cursor-pointer' : 'cursor-default'}`}
                          >
                            <span className={`flex-shrink-0 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                              showResult
                                ? isCorrect
                                  ? 'bg-emerald-500 text-white'
                                  : 'bg-rose-500 text-white'
                                : isSelected
                                  ? 'bg-blue-500 text-white'
                                  : 'bg-slate-100 dark:bg-slate-600 text-slate-600 dark:text-slate-400'
                            }`}>
                              {String.fromCharCode(65 + optIndex)}
                            </span>
                            <span className="flex-1">{option}</span>
                            {showResult && (
                              <span className="flex-shrink-0">
                                {isCorrect ? (
                                  <CheckCircle className="h-5 w-5 text-emerald-500" />
                                ) : (
                                  <span className="flex items-center gap-1 text-xs font-medium text-rose-600 dark:text-rose-400">
                                    <span>Correct: {String.fromCharCode(65 + pq.correctAnswer)}</span>
                                  </span>
                                )}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {revealed && (
                      <div className="mt-3 p-3 rounded-lg bg-gradient-to-br from-slate-50/80 to-slate-100/80 dark:from-slate-600/40 dark:to-slate-500/40 border border-slate-200/40 dark:border-slate-500/30">
                        <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                          <span className="font-medium text-slate-700 dark:text-slate-300 not-italic">Explanation: </span>
                          {pq.explanation}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {allRevealed && (
          <div className="mt-6 space-y-3">
            {submitError && (
              <div className="rounded-lg border border-rose-200/50 dark:border-rose-800/50 bg-rose-50/50 dark:bg-rose-900/20 p-3 text-sm text-rose-600 dark:text-rose-400">
                {submitError}
              </div>
            )}
            <button
              onClick={() => handleSubmit(4)}
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/40 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Complete Review
                </>
              )}
            </button>
          </div>
        )}
      </main>

      <LoadingOverlay
        isLoading={isLoading}
        message="Loading review..."
      />
    </div>
  );
}
