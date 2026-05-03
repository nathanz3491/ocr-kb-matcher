'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import Link from 'next/link';
import {
  Award, Trophy, GraduationCap, ChevronRight, Loader2, Clock,
  Star, Download
} from 'lucide-react';
import { Navigation } from '@/components/navigation/Navigation';

// Types
interface Certificate {
  id: string;
  topicId: string;
  topicName: string;
  earnedDate: string;
  score: number;
  totalQuestions: number;
  completed: boolean;
}

interface CertificateStats {
  totalCertificates: number;
  totalTopics: number;
  completionPercentage: number;
  recentCertificates: number;
}

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

const StarRating = ({ score, total }: { score: number; total: number }) => {
  const rating = total > 0 ? (score / total) * 5 : 0;
  return (
    <div className="flex items-center gap-0.5">
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${
            i < Math.round(rating)
              ? 'fill-amber-400 text-amber-400'
              : 'fill-slate-200 text-slate-300 dark:fill-slate-700 dark:text-slate-600'
          }`}
        />
      ))}
      <span className="ml-2 text-sm font-medium text-slate-600 dark:text-slate-400">
        {score}/{total}
      </span>
    </div>
  );
};

const CertificateCard = ({ cert }: { cert: Certificate }) => (
  <div className="group relative overflow-hidden rounded-2xl border border-amber-200/60 dark:border-amber-700/40 bg-gradient-to-br from-amber-50/80 via-white/70 to-orange-50/60 dark:from-amber-950/30 dark:via-slate-800/70 dark:to-orange-950/20 p-6 shadow-lg backdrop-blur-md transition-all duration-300 hover:shadow-amber-500/20 hover:scale-[1.02] hover:border-amber-300">
    {/* Decorative glow */}
    <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-gradient-to-br from-amber-300/30 to-orange-400/10 blur-xl transition-all duration-300 group-hover:from-amber-400/40 group-hover:to-orange-500/20" />
    <div className="absolute -bottom-4 -left-4 h-20 w-20 rounded-full bg-orange-300/20 blur-lg" />

    <div className="relative">
      {/* Award icon header */}
      <div className="mb-4 flex items-start justify-between">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 via-yellow-400 to-orange-400 shadow-lg shadow-amber-500/30">
          <Award className="h-7 w-7 text-white" />
        </div>
        <button
          onClick={() => {/* download handler placeholder */}}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/60 dark:border-slate-700/60 bg-white/60 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 backdrop-blur-sm transition-all hover:border-amber-300 hover:text-amber-600 dark:hover:text-amber-400"
        >
          <Download className="h-4 w-4" />
        </button>
      </div>

      {/* Topic name */}
      <h3 className="text-lg font-bold text-slate-800 dark:text-white leading-tight">
        {cert.topicName}
      </h3>

      {/* Earned date */}
      <div className="mt-2 flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
        <Clock className="h-3.5 w-3.5" />
        Earned {formatDate(cert.earnedDate)}
      </div>

      {/* Score stars */}
      <div className="mt-3">
        <StarRating score={cert.score} total={cert.totalQuestions} />
      </div>

      {/* Bottom accent bar */}
      <div className="mt-4 h-1 w-12 rounded-full bg-gradient-to-r from-amber-400 to-orange-400" />
    </div>
  </div>
);

const EmptyState = () => (
  <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-white/40 dark:bg-slate-800/40 p-16 backdrop-blur-sm">
    <div className="relative mb-6">
      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30">
        <Award className="h-12 w-12 text-amber-400 dark:text-amber-500" />
      </div>
      <div className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-orange-400 shadow-md">
        <Trophy className="h-4 w-4 text-white" />
      </div>
    </div>
    <h3 className="text-xl font-bold text-slate-700 dark:text-white">No Certificates Yet</h3>
    <p className="mt-2 max-w-sm text-center text-sm text-slate-500 dark:text-slate-400">
      Complete quizzes and learn topics to earn beautiful certificates showcasing your achievements.
    </p>
    <Link
      href="/learn"
      className="mt-6 flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-3 text-sm font-medium text-white shadow-lg shadow-amber-500/30 transition-all hover:from-amber-600 hover:to-orange-600 hover:shadow-xl hover:scale-105"
    >
      <GraduationCap className="h-4 w-4" />
      Start Learning
    </Link>
  </div>
);

export default function CertificatesPage() {
  const [loading, setLoading] = useState(true);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [stats, setStats] = useState<CertificateStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      try {
        const [certsRes, statsRes] = await Promise.all([
          api.get('/api/certificates'),
          api.get('/api/certificates/stats/summary')
        ]);
        const [certsJson, statsJson] = await Promise.all([certsRes.json(), statsRes.json()]);
        if (cancelled) return;
        if (certsJson.success) setCertificates(certsJson.data);
        if (statsJson.success) setStats(statsJson.data);
      } catch {
        if (!cancelled) setError('Failed to load certificates');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchData();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <Navigation />
        <main className="mx-auto max-w-7xl px-4 py-8 space-y-8">
          {/* Hero skeleton */}
          <div className="h-40 rounded-2xl border border-white/40 dark:border-slate-700/50 bg-white/70 dark:bg-slate-800/70 p-8 animate-pulse">
            <div className="h-8 w-48 rounded bg-slate-200 dark:bg-slate-700 mb-3" />
            <div className="h-4 w-80 rounded bg-slate-200 dark:bg-slate-700" />
          </div>
          {/* Stats skeleton */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 rounded-2xl border border-white/40 dark:border-slate-700/50 bg-white/70 dark:bg-slate-800/70 p-6 animate-pulse">
                <div className="h-4 w-24 rounded bg-slate-200 dark:bg-slate-700 mb-3" />
                <div className="h-7 w-16 rounded bg-slate-200 dark:bg-slate-700" />
              </div>
            ))}
          </div>
          {/* Grid skeleton */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-52 rounded-2xl border border-amber-200/40 dark:border-amber-700/30 bg-white/70 dark:bg-slate-800/70 p-6 animate-pulse">
                <div className="h-14 w-14 rounded-2xl bg-amber-200 dark:bg-amber-800 mb-4" />
                <div className="h-5 w-32 rounded bg-slate-200 dark:bg-slate-700 mb-2" />
                <div className="h-3 w-24 rounded bg-slate-200 dark:bg-slate-700 mb-3" />
                <div className="h-4 w-20 rounded bg-slate-200 dark:bg-slate-700" />
              </div>
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <Navigation />

      <main className="mx-auto max-w-7xl px-4 py-8 space-y-8">
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-2xl border border-amber-200/40 dark:border-amber-800/30 bg-gradient-to-br from-amber-50/60 via-white/70 to-orange-50/40 dark:from-slate-800/80 dark:via-slate-800/70 dark:to-slate-900 p-8 shadow-lg backdrop-blur-md">
          {/* Background decoration */}
          <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-amber-300/20 blur-2xl" />
          <div className="absolute -bottom-6 -left-6 h-32 w-32 rounded-full bg-orange-300/20 blur-2xl" />

          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 via-yellow-400 to-orange-400 shadow-xl shadow-amber-500/30">
                <Trophy className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-800 dark:text-white">
                  Certificates
                </h1>
                <p className="mt-1 text-slate-600 dark:text-slate-400">
                  Achievements you&apos;ve earned through your learning journey
                </p>
              </div>
            </div>
            {certificates.length > 0 && (
              <div className="flex items-center gap-2 rounded-xl bg-white/60 dark:bg-slate-700/60 border border-amber-200/40 dark:border-amber-800/40 px-4 py-2 backdrop-blur-sm">
                <Award className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {certificates.length} earned
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Stats Bar */}
        {stats && (
          <div className="grid gap-4 sm:grid-cols-3">
            {/* Total Earned */}
            <div className="rounded-2xl border border-white/40 dark:border-slate-700/50 bg-white/70 dark:bg-slate-800/70 p-6 shadow-lg backdrop-blur-md transition-all hover:shadow-xl">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/40 dark:to-orange-900/40">
                  <Award className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <div className="text-3xl font-bold text-slate-800 dark:text-white">
                    {stats.totalCertificates}
                  </div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">Total Earned</div>
                </div>
              </div>
            </div>

            {/* Topics Completed */}
            <div className="rounded-2xl border border-white/40 dark:border-slate-700/50 bg-white/70 dark:bg-slate-800/70 p-6 shadow-lg backdrop-blur-md transition-all hover:shadow-xl">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/40 dark:to-indigo-900/40">
                  <GraduationCap className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <div className="text-3xl font-bold text-slate-800 dark:text-white">
                    {stats.totalTopics}
                  </div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">Topics Completed</div>
                </div>
              </div>
            </div>

            {/* Completion Percentage */}
            <div className="rounded-2xl border border-white/40 dark:border-slate-700/50 bg-white/70 dark:bg-slate-800/70 p-6 shadow-lg backdrop-blur-md transition-all hover:shadow-xl">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-100 to-green-100 dark:from-emerald-900/40 dark:to-green-900/40">
                  <Trophy className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <div className="text-3xl font-bold text-slate-800 dark:text-white">
                    {stats.completionPercentage}%
                  </div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">Completion Rate</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Completion Progress Bar */}
        {stats && stats.totalTopics > 0 && (
          <div className="rounded-2xl border border-white/40 dark:border-slate-700/50 bg-white/70 dark:bg-slate-800/70 p-6 shadow-lg backdrop-blur-sm">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Overall Progress</span>
              <span className="text-sm font-bold text-amber-600 dark:text-amber-400">{stats.completionPercentage}%</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-400 via-yellow-400 to-orange-400 transition-all duration-700 shadow-amber-500/30"
                style={{ width: `${stats.completionPercentage}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              {stats.totalTopics - stats.totalCertificates} topics remaining to earn more certificates.
            </p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="rounded-2xl border border-red-200/40 dark:border-red-800/40 bg-red-50/60 dark:bg-red-900/20 p-6 text-center">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Certificates Grid or Empty State */}
        {certificates.length === 0 && !error ? (
          <EmptyState />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {certificates.map((cert) => (
              <CertificateCard key={cert.id} cert={cert} />
            ))}
          </div>
        )}

        {/* CTA footer if some completed */}
        {certificates.length > 0 && (
          <div className="text-center">
            <Link
              href="/learn"
              className="inline-flex items-center gap-2 rounded-xl bg-white/60 dark:bg-slate-800/60 border border-white/40 dark:border-slate-700/50 px-6 py-3 text-sm font-medium text-slate-700 dark:text-slate-300 backdrop-blur-sm transition-all hover:bg-white dark:hover:bg-slate-700 hover:scale-105"
            >
              <GraduationCap className="h-4 w-4" />
              Continue Learning
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
