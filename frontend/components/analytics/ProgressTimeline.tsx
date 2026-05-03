'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { Calendar, TrendingUp, Star, Activity } from 'lucide-react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

interface TimelineEntry {
  date: string;
  nodesLearned: string[];
  count: number;
}

interface TimelineData {
  timeline: TimelineEntry[];
  totalLearned: number;
  dailyAverage: number;
  bestDay: { date: string; count: number } | null;
}

interface ProgressTimelineProps {
  onLoadingChange?: (isLoading: boolean) => void;
  onError?: () => void;
}

export function ProgressTimeline({ onLoadingChange, onError }: ProgressTimelineProps) {
  const [data, setData] = useState<TimelineData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let retries = 0;
    const maxRetries = 3;
    
    const fetchTimeline = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/analytics/timeline`, {
          timeout: 10000,
        });
        if (res.data.success) {
          setData(res.data.data);
        } else {
          setError('Failed to load timeline');
        onError?.();
        }
      } catch (err: unknown) {
        const error = err as { code?: string; message?: string; response?: { status: number } };
        console.error('Error fetching timeline:', error.code || error.message);
        
        // Retry up to 3 times on network errors
        if (retries < maxRetries && (error.code === 'ECONNABORTED' || !error.response)) {
          retries++;
          console.log(`Retrying... attempt ${retries}/${maxRetries}`);
          setTimeout(fetchTimeline, 1000 * retries);
          return;
        }
        
        setError('Failed to load timeline');
        onError?.();
      } finally {
        setLoading(false);
        onLoadingChange?.(false);
      }
    };

    fetchTimeline();
  }, [onLoadingChange]);

  if (loading) {
    return (
      <div className="mb-8 h-48 animate-pulse rounded-2xl border border-white/40 dark:border-slate-700/50 bg-white/50 dark:bg-slate-800/50" />
    );
  }

  if (error || !data) {
    return (
      <div className="mb-8 rounded-2xl border border-red-200 dark:border-red-800 bg-red-50/80 dark:bg-red-900/30 p-4 text-center text-red-600 dark:text-red-400">
        {error || 'Unable to load timeline'}
      </div>
    );
  }

  // Filter days with activity for the timeline
  const activeDays = data.timeline.filter(day => day.count > 0);

  return (
    <div className="mb-8 rounded-2xl border border-white/40 dark:border-slate-700/50 bg-white/70 dark:bg-slate-800/70 p-6 shadow-lg dark:shadow-slate-900/30 backdrop-blur-sm">
      <h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-slate-800 dark:text-white">
        <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        Learning Journey
      </h2>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        <div className="rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/20 p-3">
          <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
            <Activity className="h-4 w-4" />
            <span className="text-xs font-medium">Total</span>
          </div>
          <div className="mt-1 text-2xl font-bold text-blue-800 dark:text-blue-300">
            {data.totalLearned}
          </div>
        </div>
        <div className="rounded-xl bg-gradient-to-br from-violet-50 to-violet-100 dark:from-violet-900/30 dark:to-violet-800/20 p-3">
          <div className="flex items-center gap-2 text-violet-700 dark:text-violet-400">
            <TrendingUp className="h-4 w-4" />
            <span className="text-xs font-medium">Daily Avg</span>
          </div>
          <div className="mt-1 text-2xl font-bold text-violet-800 dark:text-violet-300">
            {data.dailyAverage.toFixed(1)}
          </div>
        </div>
        <div className="rounded-xl bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/30 dark:to-amber-800/20 p-3">
          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
            <Star className="h-4 w-4" />
            <span className="text-xs font-medium">Best Day</span>
          </div>
          <div className="mt-1 text-2xl font-bold text-amber-800 dark:text-amber-300">
            {data.bestDay ? data.bestDay.count : 0}
          </div>
        </div>
      </div>

      {/* Timeline */}
      {activeDays.length === 0 ? (
        <p className="text-center text-slate-500 dark:text-slate-400">
          No learning activity yet. Start by uploading a document!
        </p>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 top-8 bottom-8 w-0.5 bg-gradient-to-b from-blue-400 via-violet-400 to-amber-400" />
          
          {/* Timeline items */}
          <div className="space-y-4">
            {activeDays.slice(-10).map((day, index) => (
              <div
                key={day.date}
                className="relative flex items-start gap-4 pl-2"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* Dot */}
                <div className="relative z-10 mt-1.5 h-4 w-4 rounded-full border-2 border-white dark:border-slate-800 bg-gradient-to-br from-blue-500 to-violet-500 shadow-md" />
                
                {/* Content */}
                <div className="flex-1 rounded-xl border border-white/40 dark:border-slate-600/50 bg-white/50 dark:bg-slate-700/50 p-3 backdrop-blur-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      {new Date(day.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {day.count} topic{day.count !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {day.nodesLearned.slice(0, 5).map(nodeId => (
                      <span
                        key={nodeId}
                        className="inline-flex items-center rounded-full bg-blue-100 dark:bg-blue-900/50 px-2 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-300"
                      >
                        {nodeId}
                      </span>
                    ))}
                    {day.nodesLearned.length > 5 && (
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        +{day.nodesLearned.length - 5} more
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
