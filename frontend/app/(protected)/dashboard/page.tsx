'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  BarChart3, TrendingUp, Award, BookOpen, CheckCircle2, Flame,
  Calendar, Trophy, Star, Target, TrendingDown, TrendingUp as TrendingUpIcon,
  AlertTriangle, Activity, Brain, Loader2, Gift, Download, Share2,
  CheckCircle, ChevronRight, Users, Copy, UserMinus
} from 'lucide-react';
import { Navigation } from '@/components/navigation/Navigation';
import { useTheme } from '@/components/theme/ThemeProvider';
import { useAuth } from '@/contexts/AuthContext';
import { parentMonitorApi, authApi, User } from '@/lib/auth';
import { api } from '@/lib/api';

// Types
interface DashboardStats {
  totalNodes: number;
  learnedNodes: number;
  progressPercentage: number;
  streakDays: number;
  totalUploads: number;
}

interface DomainMastery {
  domain: string;
  total: number;
  learned: number;
  percentage: number;
  status: 'strong' | 'moderate' | 'weak' | 'empty';
}

interface GapAnalysis {
  domains: DomainMastery[];
  strongestDomain: DomainMastery | null;
  weakestDomain: DomainMastery | null;
  recommendations: string[];
}

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

// Stat Card Component
interface StatCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ReactNode;
  gradient: string;
  delay?: number;
}

const StatCard = React.memo(({ title, value, subtitle, icon, gradient }: StatCardProps) => (
    <div className={`relative overflow-hidden rounded-2xl border border-white/40 dark:border-slate-700/50 bg-white/70 dark:bg-slate-800/70 backdrop-blur-md p-6 shadow-lg dark:shadow-slate-900/30 transition-all duration-300 hover:scale-105 hover:shadow-xl ${gradient}`}>
      <div className="relative z-10">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-white/80 to-white/40 dark:from-slate-700/50 dark:to-slate-600/30 shadow-md">
          {icon}
        </div>
        <div className="text-3xl font-bold text-slate-800 dark:text-white">{value}</div>
        <div className="text-sm font-medium text-slate-600 dark:text-slate-400">{title}</div>
        {subtitle && <div className="mt-1 text-xs text-slate-500 dark:text-slate-500">{subtitle}</div>}
      </div>
      <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-gradient-to-br from-white/20 to-transparent dark:from-white/10" />
    </div>
  ));

// Main Page Component
export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'progress' | 'certificates' | 'family'>('overview');
  const [selectedCert, setSelectedCert] = useState<Certificate | null>(null);

  const { theme } = useTheme();
  const { user: authUser } = useAuth();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [parentLinks, setParentLinks] = useState<Array<{ linkId: string; parentId: string; parentName: string; parentEmail: string; linkedAt: string }>>([]);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [unlinkingId, setUnlinkingId] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [copied, setCopied] = useState(false);

  // Data states
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [gapAnalysis, setGapAnalysis] = useState<GapAnalysis | null>(null);
  const [timelineData, setTimelineData] = useState<TimelineData | null>(null);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [certStats, setCertStats] = useState<CertificateStats | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchAllData = async () => {
      try {
        const [statsRes, gapRes, timelineRes, certsRes, certStatsRes] = await Promise.all([
          api.get('/api/analytics/dashboard'),
          api.get('/api/analytics/gap-analysis'),
          api.get('/api/analytics/timeline'),
          api.get('/api/certificates'),
          api.get('/api/certificates/stats/summary')
        ]);
        if (cancelled) return;
        const [statsJson, gapJson, timelineJson, certsJson, certStatsJson] = await Promise.all([
          statsRes.json(), gapRes.json(), timelineRes.json(), certsRes.json(), certStatsRes.json()
        ]);
        if (statsJson.success) setStats(statsJson.data);
        if (gapJson.success) setGapAnalysis(gapJson.data);
        if (timelineJson.success) setTimelineData(timelineJson.data);
        if (certsJson.success) setCertificates(certsJson.data || []);
        if (certStatsJson.success) setCertStats(certStatsJson.data);
      } catch {
        if (cancelled) return;
        setStats({ totalNodes: 50, learnedNodes: 15, progressPercentage: 30, streakDays: 3, totalUploads: 5 });
        setGapAnalysis({ domains: [], strongestDomain: null, weakestDomain: null, recommendations: [] });
        setTimelineData({ timeline: [], totalLearned: 0, dailyAverage: 0, bestDay: null });
        setCertificates([]);
        setCertStats({ totalCertificates: 0, totalTopics: 0, completionPercentage: 0, recentCertificates: 0 });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchAllData();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (activeTab === 'family' && authUser) {
      authApi.getMe().then(res => {
        if (res.success && res.data?.user) {
          setCurrentUser(res.data.user);
        }
      });
      parentMonitorApi.getMyParentLinks().then(res => {
        if (res.success && res.data) {
          setParentLinks(res.data);
        }
      });
    }
  }, [activeTab, authUser]);

  useEffect(() => {
    if (!currentUser?.parentCode || !currentUser?.parentCodeExpires) {
      setTimeLeft(0);
      return;
    }

    const calculateTimeLeft = () => {
      const now = Date.now();
      const expires = currentUser.parentCodeExpires!;
      const remaining = Math.max(0, expires - now);
      setTimeLeft(remaining);
      if (remaining === 0 && currentUser.parentCode) {
        setCurrentUser(prev => prev ? { ...prev, parentCode: null, parentCodeExpires: null } : null);
      }
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(interval);
  }, [currentUser?.parentCode, currentUser?.parentCodeExpires]);

  const formatDate = useCallback((dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  }, []);

  const formatTimeLeft = useCallback((ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  const handleGenerateCode = useCallback(async () => {
    setGeneratingCode(true);
    const res = await parentMonitorApi.generateCode();
    if (res.success && res.data) {
      setCurrentUser(prev => prev ? { ...prev, parentCode: res.data!.code, parentCodeExpires: res.data!.expiresAt } : null);
      setTimeLeft(res.data.expiresAt - Date.now());
    }
    setGeneratingCode(false);
  }, []);

  const handleCopyCode = useCallback(() => {
    if (currentUser?.parentCode) {
      navigator.clipboard.writeText(currentUser.parentCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [currentUser?.parentCode]);

  const handleUnlinkParent = useCallback(async (linkId: string) => {
    setUnlinkingId(linkId);
    const res = await parentMonitorApi.unlinkParent(linkId);
    if (res.success) {
      setParentLinks(prev => prev.filter(link => link.linkId !== linkId));
    }
    setUnlinkingId(null);
  }, []);

  const activeDays = timelineData?.timeline.filter(day => day.count > 0) || [];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <Navigation />
        <main className="mx-auto max-w-7xl px-4 py-8 space-y-8">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 rounded-2xl border border-white/40 dark:border-slate-700/50 bg-white/70 dark:bg-slate-800/70 p-6 animate-pulse">
                <div className="h-4 w-20 rounded bg-slate-200 dark:bg-slate-700 mb-3" />
                <div className="h-8 w-16 rounded bg-slate-200 dark:bg-slate-700" />
              </div>
            ))}
          </div>
          <div className="h-16 rounded-2xl border border-white/40 dark:border-slate-700/50 bg-white/70 dark:bg-slate-800/70 animate-pulse" />
          <div className="grid gap-6 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-48 rounded-2xl border border-white/40 dark:border-slate-700/50 bg-white/70 dark:bg-slate-800/70 p-6 animate-pulse" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <Navigation />
      
      <main className="mx-auto max-w-7xl px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-800 dark:text-white">Learning Dashboard</h1>
              <p className="mt-2 text-slate-600 dark:text-slate-400">
                Track your progress, analytics, and achievements all in one place
              </p>
            </div>
            <Link
              href="/knowledge-graph"
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 px-5 py-3 text-sm font-medium text-white shadow-lg transition-all hover:from-blue-600 hover:to-indigo-600 hover:shadow-xl hover:scale-105"
            >
              <Brain className="h-5 w-5" />
              View Knowledge Graph
            </Link>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mb-8 flex flex-wrap gap-2">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'analytics', label: 'Analytics', icon: TrendingUp },
            { id: 'progress', label: 'Progress', icon: Activity },
            { id: 'certificates', label: 'Certificates', icon: Award },
            ...(authUser?.accountType === 'student' ? [{ id: 'family' as const, label: 'Family', icon: Users }] : []),
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-medium transition-all duration-300 ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg'
                  : 'bg-white/70 dark:bg-slate-800/70 text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700 border border-white/40 dark:border-slate-700/50'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Quick Stats */}
            {stats && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  title="Total Topics"
                  value={stats.totalNodes}
                  subtitle="Available to learn"
                  icon={<BookOpen className="h-6 w-6 text-blue-600" />}
                  gradient="shadow-blue-500/10 hover:shadow-blue-500/20"
                />
                <StatCard
                  title="Learned"
                  value={stats.learnedNodes}
                  subtitle="Topics mastered"
                  icon={<CheckCircle2 className="h-6 w-6 text-emerald-600" />}
                  gradient="shadow-emerald-500/10 hover:shadow-emerald-500/20"
                />
                <StatCard
                  title="Progress"
                  value={`${stats.progressPercentage}%`}
                  subtitle="Overall completion"
                  icon={<TrendingUp className="h-6 w-6 text-violet-600" />}
                  gradient="shadow-violet-500/10 hover:shadow-violet-500/20"
                />
                <StatCard
                  title="Day Streak"
                  value={stats.streakDays}
                  subtitle={stats.streakDays > 0 ? 'Keep it up!' : 'Start learning today'}
                  icon={<Flame className="h-6 w-6 text-amber-600" />}
                  gradient="shadow-amber-500/10 hover:shadow-amber-500/20"
                />
              </div>
            )}

            {/* Progress Bar */}
            <div className="rounded-2xl border border-white/40 dark:border-slate-700/50 bg-white/70 dark:bg-slate-800/70 p-6 shadow-lg backdrop-blur-sm">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Overall Progress</span>
                <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{stats?.progressPercentage || 0}%</span>
              </div>
              <div className="h-4 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 via-violet-500 to-indigo-500 transition-all duration-700"
                  style={{ width: `${stats?.progressPercentage || 0}%` }}
                />
              </div>
            </div>

            {/* Quick Links Grid */}
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Certificates Preview */}
              <div className="rounded-2xl border border-white/40 dark:border-slate-700/50 bg-white/70 dark:bg-slate-800/70 p-6 shadow-lg backdrop-blur-sm">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500">
                    <Trophy className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 dark:text-white">Certificates</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{certStats?.totalCertificates || 0} earned</p>
                  </div>
                </div>
                {certificates.length > 0 ? (
                  <div className="space-y-3">
                    {certificates.slice(0, 3).map((cert) => (
                      <div key={cert.id} className="flex items-center gap-3 rounded-xl bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 p-3">
                        <Award className="h-5 w-5 text-yellow-600" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 dark:text-white truncate">{cert.topicName}</p>
                          <p className="text-xs text-slate-500">{cert.score}/{cert.totalQuestions} correct</p>
                        </div>
                      </div>
                    ))}
                    <button
                      onClick={() => setActiveTab('certificates')}
                      className="w-full mt-3 flex items-center justify-center gap-2 rounded-lg bg-slate-100 dark:bg-slate-700 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 transition-colors hover:bg-slate-200 dark:hover:bg-slate-600"
                    >
                      View All <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <Gift className="mx-auto h-10 w-10 text-slate-300" />
                    <p className="mt-2 text-sm text-slate-500">No certificates yet</p>
                  </div>
                )}
              </div>

              {/* Skill Gap Preview */}
              {gapAnalysis && gapAnalysis.domains.length > 0 && (
                <div className="rounded-2xl border border-white/40 dark:border-slate-700/50 bg-white/70 dark:bg-slate-800/70 p-6 shadow-lg backdrop-blur-sm">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-rose-400 to-pink-500">
                      <Target className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 dark:text-white">Skill Gap</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Areas to improve</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {gapAnalysis.domains.slice(0, 3).map((domain) => (
                      <div key={domain.domain} className="flex items-center gap-3">
                        <span className="w-20 text-xs text-slate-600 dark:text-slate-400 truncate">{domain.domain}</span>
                        <div className="flex-1">
                          <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                domain.status === 'strong' ? 'bg-emerald-500' : domain.status === 'moderate' ? 'bg-amber-500' : 'bg-rose-500'
                              }`}
                              style={{ width: `${domain.percentage}%` }}
                            />
                          </div>
                        </div>
                        <span className="w-8 text-xs font-medium text-slate-700 dark:text-slate-300">{domain.percentage}%</span>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => setActiveTab('analytics')}
                    className="w-full mt-4 flex items-center justify-center gap-2 rounded-lg bg-slate-100 dark:bg-slate-700 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 transition-colors hover:bg-slate-200 dark:hover:bg-slate-600"
                  >
                    Full Analysis <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}

              {/* Timeline Preview */}
              {timelineData && (
                <div className="rounded-2xl border border-white/40 dark:border-slate-700/50 bg-white/70 dark:bg-slate-800/70 p-6 shadow-lg backdrop-blur-sm">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-400 to-indigo-500">
                      <Calendar className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 dark:text-white">Activity</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Recent learning</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="rounded-xl bg-blue-50 dark:bg-blue-900/30 p-3 text-center">
                      <div className="text-xl font-bold text-blue-600 dark:text-blue-400">{timelineData.totalLearned}</div>
                      <div className="text-xs text-slate-600 dark:text-slate-400">Total</div>
                    </div>
                    <div className="rounded-xl bg-violet-50 dark:bg-violet-900/30 p-3 text-center">
                      <div className="text-xl font-bold text-violet-600 dark:text-violet-400">{timelineData.dailyAverage.toFixed(1)}</div>
                      <div className="text-xs text-slate-600 dark:text-slate-400">Daily Avg</div>
                    </div>
                    <div className="rounded-xl bg-amber-50 dark:bg-amber-900/30 p-3 text-center">
                      <div className="text-xl font-bold text-amber-600 dark:text-amber-400">{timelineData.bestDay?.count || 0}</div>
                      <div className="text-xs text-slate-600 dark:text-slate-400">Best Day</div>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab('progress')}
                    className="w-full flex items-center justify-center gap-2 rounded-lg bg-slate-100 dark:bg-slate-700 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 transition-colors hover:bg-slate-200 dark:hover:bg-slate-600"
                  >
                    Full Timeline <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="space-y-8">
            {/* Stats Grid */}
            {stats && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  title="Total Topics"
                  value={stats.totalNodes}
                  subtitle="Available to learn"
                  icon={<BookOpen className="h-6 w-6 text-blue-600" />}
                  gradient="shadow-blue-500/10 hover:shadow-blue-500/20"
                />
                <StatCard
                  title="Learned"
                  value={stats.learnedNodes}
                  subtitle="Topics mastered"
                  icon={<CheckCircle2 className="h-6 w-6 text-emerald-600" />}
                  gradient="shadow-emerald-500/10 hover:shadow-emerald-500/20"
                />
                <StatCard
                  title="Progress"
                  value={`${stats.progressPercentage}%`}
                  subtitle="Overall completion"
                  icon={<TrendingUp className="h-6 w-6 text-violet-600" />}
                  gradient="shadow-violet-500/10 hover:shadow-violet-500/20"
                />
                <StatCard
                  title="Day Streak"
                  value={stats.streakDays}
                  subtitle={stats.streakDays > 0 ? 'Keep it up!' : 'Start learning today'}
                  icon={<Flame className="h-6 w-6 text-amber-600" />}
                  gradient="shadow-amber-500/10 hover:shadow-amber-500/20"
                />
              </div>
            )}

            {/* Skill Gap Analysis */}
            {gapAnalysis && gapAnalysis.domains.length > 0 && (
              <div className="rounded-2xl border border-white/40 dark:border-slate-700/50 bg-white/70 dark:bg-slate-800/70 p-6 shadow-lg backdrop-blur-sm">
                <h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-slate-800 dark:text-white">
                  <Target className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                  Skill Gap Analysis
                </h2>

                {/* Strongest vs Weakest */}
                <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {gapAnalysis.strongestDomain && (
                    <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-900/30 dark:to-emerald-800/20 p-4">
                      <div className="mb-2 flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                        <TrendingUpIcon className="h-4 w-4" />
                        <span className="text-xs font-medium uppercase">Strongest Area</span>
                      </div>
                      <p className="font-bold text-slate-800 dark:text-white">{gapAnalysis.strongestDomain.domain}</p>
                      <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{gapAnalysis.strongestDomain.percentage}%</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        {gapAnalysis.strongestDomain.learned}/{gapAnalysis.strongestDomain.total} topics mastered
                      </p>
                    </div>
                  )}

                  {gapAnalysis.weakestDomain && gapAnalysis.weakestDomain.status !== 'strong' && (
                    <div className="rounded-xl border border-rose-200 dark:border-rose-800 bg-gradient-to-br from-rose-50 to-rose-100/50 dark:from-rose-900/30 dark:to-rose-800/20 p-4">
                      <div className="mb-2 flex items-center gap-2 text-rose-700 dark:text-rose-400">
                        <TrendingDown className="h-4 w-4" />
                        <span className="text-xs font-medium uppercase">Needs Attention</span>
                      </div>
                      <p className="font-bold text-slate-800 dark:text-white">{gapAnalysis.weakestDomain.domain}</p>
                      <p className="text-2xl font-bold text-rose-600 dark:text-rose-400">{gapAnalysis.weakestDomain.percentage}%</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        {gapAnalysis.weakestDomain.learned}/{gapAnalysis.weakestDomain.total} topics mastered
                      </p>
                    </div>
                  )}
                </div>

                {/* Domain Breakdown */}
                <div className="mb-6">
                  <h3 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">Domain Progress</h3>
                  <div className="space-y-2">
                    {gapAnalysis.domains.map((domain) => (
                      <div key={domain.domain} className="flex items-center gap-3">
                        <span className="w-32 text-xs text-slate-600 dark:text-slate-400">{domain.domain}</span>
                        <div className="flex-1">
                          <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                domain.status === 'strong' ? 'bg-emerald-500' : domain.status === 'moderate' ? 'bg-amber-500' : 'bg-rose-500'
                              }`}
                              style={{ width: `${domain.percentage}%` }}
                            />
                          </div>
                        </div>
                        <span className="w-10 text-right text-xs font-medium text-slate-700 dark:text-slate-300">{domain.percentage}%</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recommendations */}
                {gapAnalysis.recommendations.length > 0 && (
                  <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-900/30 dark:to-amber-800/20 p-4">
                    <div className="mb-2 flex items-center gap-2 text-amber-700 dark:text-amber-400">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="text-sm font-medium">Recommendations</span>
                    </div>
                    <ul className="space-y-2">
                      {gapAnalysis.recommendations.map((rec, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                          <AlertTriangle className="mt-0.5 h-3 w-3 flex-shrink-0 text-amber-500" />
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Progress Tab */}
        {activeTab === 'progress' && (
          <div className="space-y-8">
            {/* Timeline Stats */}
            {timelineData && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/40 dark:border-slate-700/50 bg-white/70 dark:bg-slate-800/70 p-6 shadow-lg backdrop-blur-sm">
                  <div className="flex items-center gap-3 text-blue-700 dark:text-blue-400">
                    <Activity className="h-5 w-5" />
                    <span className="text-sm font-medium">Total Learned</span>
                  </div>
                  <div className="mt-2 text-3xl font-bold text-blue-800 dark:text-blue-300">{timelineData.totalLearned}</div>
                </div>
                <div className="rounded-2xl border border-white/40 dark:border-slate-700/50 bg-white/70 dark:bg-slate-800/70 p-6 shadow-lg backdrop-blur-sm">
                  <div className="flex items-center gap-3 text-violet-700 dark:text-violet-400">
                    <TrendingUpIcon className="h-5 w-5" />
                    <span className="text-sm font-medium">Daily Average</span>
                  </div>
                  <div className="mt-2 text-3xl font-bold text-violet-800 dark:text-violet-300">{timelineData.dailyAverage.toFixed(1)}</div>
                </div>
                <div className="rounded-2xl border border-white/40 dark:border-slate-700/50 bg-white/70 dark:bg-slate-800/70 p-6 shadow-lg backdrop-blur-sm">
                  <div className="flex items-center gap-3 text-amber-700 dark:text-amber-400">
                    <Star className="h-5 w-5" />
                    <span className="text-sm font-medium">Best Day</span>
                  </div>
                  <div className="mt-2 text-3xl font-bold text-amber-800 dark:text-amber-300">{timelineData.bestDay ? timelineData.bestDay.count : 0}</div>
                </div>
              </div>
            )}

            {/* Timeline */}
            {timelineData && (
              <div className="rounded-2xl border border-white/40 dark:border-slate-700/50 bg-white/70 dark:bg-slate-800/70 p-6 shadow-lg backdrop-blur-sm">
                <h2 className="mb-6 flex items-center gap-2 text-xl font-bold text-slate-800 dark:text-white">
                  <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  Learning Timeline
                </h2>

                {activeDays.length === 0 ? (
                  <p className="text-center py-8 text-slate-500 dark:text-slate-400">
                    No learning activity yet. Start by uploading a document!
                  </p>
                ) : (
                  <div className="relative">
                    {/* Timeline line */}
                    <div className="absolute left-4 top-8 bottom-8 w-0.5 bg-gradient-to-b from-blue-400 via-violet-400 to-amber-400" />
                    
                    {/* Timeline items */}
                    <div className="space-y-4">
                      {activeDays.slice(-15).reverse().map((day, index) => (
                        <div
                          key={day.date}
                          className="relative flex items-start gap-4 pl-2"
                          style={{ animationDelay: `${index * 50}ms` }}
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
                                  year: 'numeric',
                                })}
                              </span>
                              <span className="text-xs text-slate-500 dark:text-slate-400">
                                {day.count} topic{day.count !== 1 ? 's' : ''}
                              </span>
                            </div>
                            <div className="mt-2 flex flex-wrap gap-1">
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
            )}
          </div>
        )}

        {/* Certificates Tab */}
        {activeTab === 'certificates' && (
          <div className="space-y-8">
            {/* Certificate Stats */}
            {certStats && (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-white/40 dark:border-slate-700/50 bg-white/70 dark:bg-slate-800/70 p-5 shadow-lg backdrop-blur-sm">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
                      <Award className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-slate-800 dark:text-white">{certStats.totalCertificates}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Certificates Earned</p>
                    </div>
                  </div>
                </div>
                
                <div className="rounded-xl border border-white/40 dark:border-slate-700/50 bg-white/70 dark:bg-slate-800/70 p-5 shadow-lg backdrop-blur-sm">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                      <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-slate-800 dark:text-white">{certStats.totalTopics}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Total Topics</p>
                    </div>
                  </div>
                </div>
                
                <div className="rounded-xl border border-white/40 dark:border-slate-700/50 bg-white/70 dark:bg-slate-800/70 p-5 shadow-lg backdrop-blur-sm">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
                      <Star className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-slate-800 dark:text-white">{certStats.completionPercentage}%</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Completion Rate</p>
                    </div>
                  </div>
                </div>
                
                <div className="rounded-xl border border-white/40 dark:border-slate-700/50 bg-white/70 dark:bg-slate-800/70 p-5 shadow-lg backdrop-blur-sm">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
                      <CheckCircle className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-slate-800 dark:text-white">{certStats.totalTopics - certStats.totalCertificates}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Topics Remaining</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Progress Bar */}
            {certStats && (
              <div className="rounded-xl border border-white/40 dark:border-slate-700/50 bg-white/70 dark:bg-slate-800/70 p-5 shadow-lg backdrop-blur-sm">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Overall Progress</span>
                  <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{certStats.completionPercentage}%</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                  <div 
                    className="h-full rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 transition-all duration-500"
                    style={{ width: `${certStats.completionPercentage}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  Complete more topics to earn certificates!
                </p>
              </div>
            )}

            {/* Certificate Grid */}
            {certificates.length === 0 ? (
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-12 text-center">
                <Gift className="mx-auto mb-4 h-12 w-12 text-slate-400" />
                <h3 className="text-lg font-semibold text-slate-800 dark:text-white">No Certificates Yet</h3>
                <p className="mt-2 text-slate-600 dark:text-slate-400">
                  Complete quizzes and learn topics to earn certificates!
                </p>
                <Link 
                  href="/learn"
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                >
                  Start Learning
                </Link>
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {certificates.map((cert) => (
                  <button
                    key={cert.id}
                    onClick={() => setSelectedCert(cert)}
                    className="group relative overflow-hidden rounded-2xl border border-yellow-200 dark:border-yellow-800 bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 p-6 text-left shadow-lg transition-all hover:shadow-xl hover:scale-[1.02]"
                  >
                    {/* Decorative elements */}
                    <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-yellow-400/20" />
                    <div className="absolute -bottom-4 -left-4 h-16 w-16 rounded-full bg-orange-400/20" />
                    
                    <div className="relative">
                      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 shadow-md">
                        <Trophy className="h-6 w-6 text-white" />
                      </div>
                      
                      <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                        {cert.topicName}
                      </h3>
                      
                      <div className="mt-3 flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {formatDate(cert.earnedDate)}
                        </div>
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 text-yellow-500" />
                          {cert.score}/{cert.totalQuestions}
                        </div>
                      </div>
                      
                      <div className="mt-4 flex items-center gap-2 text-xs font-medium text-yellow-600 dark:text-yellow-400">
                        <Award className="h-4 w-4" />
                        Certificate of Completion
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'family' && (
          <div className="space-y-8">
            <div className="rounded-2xl border border-white/40 dark:border-slate-700/50 bg-white/70 dark:bg-slate-800/70 p-8 shadow-lg backdrop-blur-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 shadow-md">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800 dark:text-white">Parent Monitoring Code</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Share this code with your parents to let them monitor your progress</p>
                </div>
              </div>

              {currentUser?.parentCode && timeLeft > 0 ? (
                <div className="space-y-4">
                  <div className="relative">
                    <div className="rounded-xl border-2 border-dashed border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-900/20 p-8 text-center">
                      <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">Your Monitoring Code</p>
                      <div className="flex items-center justify-center gap-3">
                        <code className="text-4xl font-bold tracking-wider text-slate-800 dark:text-white font-mono">
                          {currentUser.parentCode}
                        </code>
                        <button
                          onClick={handleCopyCode}
                          className="flex items-center justify-center h-10 w-10 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
                          title="Copy code"
                        >
                          {copied ? <CheckCircle className="h-5 w-5 text-emerald-500" /> : <Copy className="h-5 w-5" />}
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 dark:bg-amber-900/30 px-3 py-1.5">
                      <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                      Expires in {formatTimeLeft(timeLeft)}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-slate-600 dark:text-slate-400 mb-4">
                    Generate a new code to share with your parents. Codes expire after 30 minutes.
                  </p>
                  <button
                    onClick={handleGenerateCode}
                    disabled={generatingCode}
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-3 text-sm font-medium text-white shadow-lg transition-all hover:from-emerald-600 hover:to-teal-600 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {generatingCode ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Users className="h-5 w-5" />
                    )}
                    Generate Code
                  </button>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-white/40 dark:border-slate-700/50 bg-white/70 dark:bg-slate-800/70 p-6 shadow-lg backdrop-blur-sm">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Linked Parents</h3>
              
              {parentLinks.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600 mb-3" />
                  <p className="text-slate-600 dark:text-slate-400">
                    No parents linked yet. Share your monitoring code with a parent to get started.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {parentLinks.map((link) => (
                    <div
                      key={link.linkId}
                      className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 p-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                          <Users className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-800 dark:text-white">{link.parentName}</p>
                          <p className="text-sm text-slate-500 dark:text-slate-400">{link.parentEmail}</p>
                          <p className="text-xs text-slate-400 dark:text-slate-500">
                            Linked {formatDate(link.linkedAt)}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleUnlinkParent(link.linkId)}
                        disabled={unlinkingId === link.linkId}
                        className="flex items-center gap-2 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50"
                      >
                        {unlinkingId === link.linkId ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <UserMinus className="h-4 w-4" />
                        )}
                        Unlink
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Certificate Modal */}
        {selectedCert && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white dark:bg-slate-800 shadow-2xl">
              {/* Certificate Design */}
              <div className="relative bg-gradient-to-br from-yellow-50 via-white to-orange-50 dark:from-slate-800 dark:via-slate-800 dark:to-slate-900 p-8">
                {/* Border decoration */}
                <div className="absolute inset-2 rounded-xl border-2 border-yellow-400/30" />
                <div className="absolute inset-4 rounded-lg border border-yellow-200/20" />
                
                {/* Content */}
                <div className="relative text-center">
                  {/* Header */}
                  <div className="mb-6">
                    <Trophy className="mx-auto mb-3 h-12 w-12 text-yellow-500" />
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Certificate of Achievement</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">OCR Knowledge Base Matcher</p>
                  </div>
                  
                  {/* Recipient */}
                  <div className="mb-6">
                    <p className="text-sm text-slate-500 dark:text-slate-400">This certifies that you have successfully completed</p>
                    <h3 className="mt-2 text-xl font-bold text-slate-800 dark:text-white">
                      {selectedCert.topicName}
                    </h3>
                  </div>
                  
                  {/* Details */}
                  <div className="mb-6 flex items-center justify-center gap-6 text-sm text-slate-600 dark:text-slate-400">
                    <div>
                      <p className="font-medium text-slate-800 dark:text-white">{selectedCert.score}/{selectedCert.totalQuestions}</p>
                      <p className="text-xs">Questions Correct</p>
                    </div>
                    <div className="h-10 w-px bg-slate-300 dark:bg-slate-600" />
                    <div>
                      <p className="font-medium text-slate-800 dark:text-white">{formatDate(selectedCert.earnedDate)}</p>
                      <p className="text-xs">Date Earned</p>
                    </div>
                  </div>
                  
                  {/* Footer */}
                  <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
                    <Award className="h-4 w-4" />
                    Learning Achievement Certificate
                  </div>
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex gap-3 bg-slate-50 dark:bg-slate-700/50 p-4">
                <button
                  onClick={() => setSelectedCert(null)}
                  className="flex-1 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 transition-colors hover:bg-slate-50 dark:hover:bg-slate-600"
                >
                  Close
                </button>
                <button className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700">
                  <Download className="h-4 w-4" />
                  Download
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
