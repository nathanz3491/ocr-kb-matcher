'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { TrendingDown, TrendingUp, AlertTriangle, Target, Award } from 'lucide-react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

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

interface SkillGapCardProps {
  onLoadingChange?: (isLoading: boolean) => void;
}

export function SkillGapCard({ onLoadingChange }: SkillGapCardProps) {
  const [analysis, setAnalysis] = useState<GapAnalysis | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalysis = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/analytics/gap-analysis`);
        if (res.data.success) {
          setAnalysis(res.data.data);
        }
      } catch (err) {
        console.error('Error fetching gap analysis:', err);
      } finally {
        setLoading(false);
        onLoadingChange?.(false);
      }
    };

    fetchAnalysis();
  }, [onLoadingChange]);

  if (loading) {
    return (
      <div className="mb-8 h-48 animate-pulse rounded-2xl border border-white/40 dark:border-slate-700/50 bg-white/50 dark:bg-slate-800/50" />
    );
  }

  if (!analysis || analysis.domains.length === 0) {
    return null;
  }

  return (
    <div className="mb-8 rounded-2xl border border-white/40 dark:border-slate-700/50 bg-white/70 dark:bg-slate-800/70 p-6 shadow-lg dark:shadow-slate-900/30 backdrop-blur-sm">
      <h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-slate-800 dark:text-white">
        <Target className="h-5 w-5 text-rose-600 dark:text-rose-400" />
        Skill Gap Analysis
      </h2>

      {/* Strongest vs Weakest */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {analysis.strongestDomain && (
          <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-900/30 dark:to-emerald-800/20 p-4">
            <div className="mb-2 flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
              <TrendingUp className="h-4 w-4" />
              <span className="text-xs font-medium uppercase">Strongest Area</span>
            </div>
            <p className="font-bold text-slate-800 dark:text-white">{analysis.strongestDomain.domain}</p>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {analysis.strongestDomain.percentage}%
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {analysis.strongestDomain.learned}/{analysis.strongestDomain.total} topics mastered
            </p>
          </div>
        )}

        {analysis.weakestDomain && analysis.weakestDomain.status !== 'strong' && (
          <div className="rounded-xl border border-rose-200 dark:border-rose-800 bg-gradient-to-br from-rose-50 to-rose-100/50 dark:from-rose-900/30 dark:to-rose-800/20 p-4">
            <div className="mb-2 flex items-center gap-2 text-rose-700 dark:text-rose-400">
              <TrendingDown className="h-4 w-4" />
              <span className="text-xs font-medium uppercase">Needs Attention</span>
            </div>
            <p className="font-bold text-slate-800 dark:text-white">{analysis.weakestDomain.domain}</p>
            <p className="text-2xl font-bold text-rose-600 dark:text-rose-400">
              {analysis.weakestDomain.percentage}%
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {analysis.weakestDomain.learned}/{analysis.weakestDomain.total} topics mastered
            </p>
          </div>
        )}
      </div>

      {/* Domain Breakdown */}
      <div className="mb-6">
        <h3 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">Domain Progress</h3>
        <div className="space-y-2">
          {analysis.domains.slice(0, 5).map((domain) => (
            <div key={domain.domain} className="flex items-center gap-3">
              <span className="w-24 text-xs text-slate-600 dark:text-slate-400">{domain.domain}</span>
              <div className="flex-1">
                <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      domain.status === 'strong'
                        ? 'bg-emerald-500'
                        : domain.status === 'moderate'
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
                    }`}
                    style={{ width: `${domain.percentage}%` }}
                  />
                </div>
              </div>
              <span className="w-10 text-right text-xs font-medium text-slate-700 dark:text-slate-300">
                {domain.percentage}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Recommendations */}
      {analysis.recommendations.length > 0 && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-900/30 dark:to-amber-800/20 p-4">
          <div className="mb-2 flex items-center gap-2 text-amber-700 dark:text-amber-400">
            <Award className="h-4 w-4" />
            <span className="text-sm font-medium">Recommendations</span>
          </div>
          <ul className="space-y-2">
            {analysis.recommendations.map((rec, index) => (
              <li key={index} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                <AlertTriangle className="mt-0.5 h-3 w-3 flex-shrink-0 text-amber-500" />
                {rec}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
