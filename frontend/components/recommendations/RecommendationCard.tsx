'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { Lightbulb, ChevronRight, Sparkles, BookOpen } from 'lucide-react';
import Link from 'next/link';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

interface Recommendation {
  nodeId: string;
  name: string;
  domain: string;
  reason: string;
  prerequisites: string[];
}

interface RecommendationCardProps {
  onLoadingChange?: (isLoading: boolean) => void;
  onError?: () => void;
}

// Fallback recommendations when API is unavailable
const fallbackRecommendations: Recommendation[] = [
  {
    nodeId: 'A01',
    name: 'Real Numbers & Number Line',
    domain: 'Algebra',
    prerequisites: [],
    reason: 'Start your learning journey with fundamental algebra concepts.'
  },
  {
    nodeId: 'G01',
    name: 'Points, Lines & Angles',
    domain: 'Geometry',
    prerequisites: [],
    reason: 'Build a strong foundation in geometric basics.'
  },
  {
    nodeId: 'F01',
    name: 'Introduction to Functions',
    domain: 'Functions',
    prerequisites: ['A01'],
    reason: 'Explore the relationship between variables.'
  }
];

export function RecommendationCard({ onLoadingChange, onError }: RecommendationCardProps) {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/recommendations`, {
          timeout: 5000,
        });
        if (res.data.success) {
          setRecommendations(res.data.data);
          setIsOffline(false);
        }
      } catch (err) {
        console.warn('Using offline recommendations');
        setRecommendations(fallbackRecommendations);
        setIsOffline(true);
      } finally {
        setLoading(false);
        onLoadingChange?.(false);
      }
    };

    fetchRecommendations();
  }, [onLoadingChange]);

  if (loading) {
    return (
      <div className="mb-8 h-40 animate-pulse rounded-2xl border border-white/40 dark:border-slate-700/50 bg-white/50 dark:bg-slate-800/50" />
    );
  }

  if (recommendations.length === 0) {
    return (
      <div className="mb-8 rounded-2xl border border-white/40 dark:border-slate-700/50 bg-gradient-to-br from-emerald-50/70 to-teal-50/70 dark:from-emerald-900/30 dark:to-teal-900/30 p-6 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 shadow-lg">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">Congratulations!</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              You've learned all available topics. Great job!
            </p>
          </div>
        </div>
      </div>
    );
  }

  const topRecommendation = recommendations[0];

  return (
    <div className="mb-8 rounded-2xl border border-white/40 dark:border-slate-700/50 bg-white/70 dark:bg-slate-800/70 p-6 shadow-lg dark:shadow-slate-900/30 backdrop-blur-sm">
      {/* Offline indicator */}
      {isOffline && (
        <div className="mb-4 rounded-lg bg-amber-50 dark:bg-amber-900/30 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
          Showing cached recommendations
        </div>
      )}

      <div className="mb-4 flex items-center gap-2">
        <Lightbulb className="h-5 w-5 text-amber-500" />
        <h2 className="text-xl font-bold text-slate-800 dark:text-white">Recommended For You</h2>
      </div>

      {/* Top Recommendation */}
      <Link href={`/learn?search=${topRecommendation.nodeId}`}>
        <div className="relative overflow-hidden rounded-xl border border-white/40 dark:border-slate-600/50 bg-gradient-to-br from-amber-50/80 to-orange-50/80 dark:from-amber-900/30 dark:to-orange-900/30 p-5 cursor-pointer hover:shadow-md transition-shadow">
          <div className="relative z-10">
            <div className="mb-2 flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <span className="text-xs font-medium text-amber-700 dark:text-amber-300 uppercase tracking-wide">
                {topRecommendation.domain}
              </span>
            </div>
            <h3 className="mb-2 text-lg font-bold text-slate-800 dark:text-white">
              {topRecommendation.nodeId}: {topRecommendation.name}
            </h3>
            <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
              {topRecommendation.reason}
            </p>
            <div className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2 text-sm font-medium text-white shadow-md">
              Start Learning
              <ChevronRight className="h-4 w-4" />
            </div>
          </div>
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gradient-to-br from-amber-200/30 to-orange-200/30 dark:from-amber-500/20 dark:to-orange-500/20" />
        </div>
      </Link>

      {/* More Recommendations */}
      {recommendations.length > 1 && (
        <div className="mt-4">
          <p className="mb-3 text-sm font-medium text-slate-600 dark:text-slate-400">Also recommended:</p>
          <div className="space-y-2">
            {recommendations.slice(1).map((rec) => (
              <Link
                key={rec.nodeId}
                href={`/learn?search=${rec.nodeId}`}
                className="flex items-center justify-between rounded-lg border border-white/40 dark:border-slate-600/50 bg-white/50 dark:bg-slate-700/50 p-3 backdrop-blur-sm transition-all hover:bg-white/70 dark:hover:bg-slate-600/70"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{rec.domain}</span>
                  </div>
                  <p className="font-medium text-slate-800 dark:text-slate-200">{rec.nodeId}: {rec.name}</p>
                </div>
                <div className="rounded-lg bg-slate-100 dark:bg-slate-600 px-3 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-500">
                  Learn
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
