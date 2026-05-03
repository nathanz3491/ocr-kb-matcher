'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { Brain, Clock, CheckCircle, XCircle, AlertCircle, RotateCcw } from 'lucide-react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

interface ReviewItem {
  nodeId: string;
  lastReviewed: string;
  nextReviewDate: string;
  reviewCount: number;
  interval: number;
  easeFactor: number;
}

interface ReviewStats {
  totalDue: number;
  totalReviewed: number;
  retentionRate: number;
}

interface ReviewQueueProps {
  onLoadingChange?: (isLoading: boolean) => void;
}

export function ReviewQueue({ onLoadingChange }: ReviewQueueProps) {
  const [dueReviews, setDueReviews] = useState<ReviewItem[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState<string | null>(null);

  useEffect(() => {
    fetchDueReviews();
  }, []);

  const fetchDueReviews = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/reviews/due`);
      if (res.data.success) {
        setDueReviews(res.data.data.reviews);
        setStats(res.data.data.stats);
      }
    } catch (err) {
      console.error('Error fetching reviews:', err);
    } finally {
      setLoading(false);
      onLoadingChange?.(false);
    }
  };

  const handleReview = async (nodeId: string, quality: number) => {
    setReviewing(nodeId);
    try {
      await axios.post(`${API_BASE_URL}/api/reviews/${nodeId}`, { quality });
      // Remove from due list
      setDueReviews(prev => prev.filter(r => r.nodeId !== nodeId));
      // Refresh stats
      fetchDueReviews();
    } catch (err) {
      console.error('Error marking review:', err);
    } finally {
      setReviewing(null);
    }
  };

  if (loading) {
    return (
      <div className="mb-8 h-40 animate-pulse rounded-2xl border border-white/40 dark:border-slate-700/50 bg-white/50 dark:bg-slate-800/50" />
    );
  }

  return (
    <div className="mb-8 rounded-2xl border border-white/40 dark:border-slate-700/50 bg-white/70 dark:bg-slate-800/70 p-6 shadow-lg dark:shadow-slate-900/30 backdrop-blur-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-xl font-bold text-slate-800 dark:text-white">
          <Brain className="h-5 w-5 text-violet-600 dark:text-violet-400" />
          Spaced Repetition
        </h2>
        {stats && (
          <div className="flex items-center gap-4 text-sm">
            <span className="text-slate-600 dark:text-slate-400">
              Due: <strong className="text-violet-600 dark:text-violet-400">{stats.totalDue}</strong>
            </span>
            <span className="text-slate-600 dark:text-slate-400">
              Retention: <strong className="text-green-600 dark:text-green-400">{stats.retentionRate}%</strong>
            </span>
          </div>
        )}
      </div>

      {dueReviews.length === 0 ? (
        <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/30 dark:to-teal-900/30 p-6 text-center">
          <CheckCircle className="mx-auto mb-2 h-10 w-10 text-emerald-500" />
          <p className="font-medium text-slate-800 dark:text-white">All caught up!</p>
          <p className="text-sm text-slate-600 dark:text-slate-400">No topics due for review today.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Review these topics to maintain mastery:
          </p>
          {dueReviews.slice(0, 3).map((review) => (
            <div
              key={review.nodeId}
              className="rounded-xl border border-white/40 dark:border-slate-600/50 bg-white/50 dark:bg-slate-700/50 p-4 backdrop-blur-sm"
            >
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{review.nodeId}</span>
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <RotateCcw className="h-3 w-3" />
                    <span>Reviewed {review.reviewCount} times</span>
                    <span>•</span>
                    <span>Interval: {review.interval} days</span>
                  </div>
                </div>
                <Clock className="h-4 w-4 text-amber-500" />
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => handleReview(review.nodeId, 1)}
                  disabled={reviewing === review.nodeId}
                  className="flex-1 rounded-lg bg-red-100 dark:bg-red-900/30 px-3 py-2 text-xs font-medium text-red-700 dark:text-red-400 transition-colors hover:bg-red-200 dark:hover:bg-red-900/50 disabled:opacity-50"
                >
                  <XCircle className="mx-auto mb-1 h-4 w-4" />
                  Hard
                </button>
                <button
                  onClick={() => handleReview(review.nodeId, 3)}
                  disabled={reviewing === review.nodeId}
                  className="flex-1 rounded-lg bg-amber-100 dark:bg-amber-900/30 px-3 py-2 text-xs font-medium text-amber-700 dark:text-amber-400 transition-colors hover:bg-amber-200 dark:hover:bg-amber-900/50 disabled:opacity-50"
                >
                  <AlertCircle className="mx-auto mb-1 h-4 w-4" />
                  Good
                </button>
                <button
                  onClick={() => handleReview(review.nodeId, 5)}
                  disabled={reviewing === review.nodeId}
                  className="flex-1 rounded-lg bg-green-100 dark:bg-green-900/30 px-3 py-2 text-xs font-medium text-green-700 dark:text-green-400 transition-colors hover:bg-green-200 dark:hover:bg-green-900/50 disabled:opacity-50"
                >
                  <CheckCircle className="mx-auto mb-1 h-4 w-4" />
                  Easy
                </button>
              </div>
            </div>
          ))}
          {dueReviews.length > 3 && (
            <p className="text-center text-sm text-slate-500 dark:text-slate-400">
              +{dueReviews.length - 3} more topics due
            </p>
          )}
        </div>
      )}
    </div>
  );
}
