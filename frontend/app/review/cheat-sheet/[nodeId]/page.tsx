'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Navigation } from '@/components/navigation/Navigation';
import { Loader2, ArrowLeft, FileText, ChevronLeft, ChevronRight, Plus, RotateCcw } from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';

interface CheatSheet {
  nodeId: string;
  nodeTitle: string;
  category: string;
  keyPoints: string[];
  formulas?: string[];
  examples?: string[];
  createdAt: string;
  updatedAt: string;
}

export default function CheatSheetPage() {
  const params = useParams();
  const router = useRouter();
  const nodeId = params.nodeId as string;

  const [cheatSheet, setCheatSheet] = useState<CheatSheet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchCheatSheet();
  }, [nodeId]);

  const fetchCheatSheet = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/api/study/cheat-sheets/${nodeId}`);
      const json = await res.json();
      if (json.success) {
        setCheatSheet(json.data);
      }
    } catch (err: any) {
      if (err?.response?.status === 404) {
        // Try to generate
        setGenerating(true);
        try {
          const res = await api.post(`/api/study/cheat-sheets/${nodeId}/generate`, {});
          const json = await res.json();
          if (json.success) {
            setCheatSheet(json.data);
          }
        } catch (genErr) {
          setError('Failed to generate cheat sheet');
        }
      } else {
        setError('Failed to load cheat sheet');
      }
    } finally {
      setLoading(false);
      setGenerating(false);
    }
  };

  if (loading || generating) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <Navigation />
        <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
          <div className="text-center">
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-blue-600 dark:text-blue-400" />
            <p className="mt-4 text-slate-600 dark:text-slate-400">
              {generating ? 'Generating cheat sheet with AI...' : 'Loading cheat sheet...'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !cheatSheet) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <Navigation />
        <div className="mx-auto max-w-7xl px-4 py-8">
          <Link href="/review">
            <Button variant="outline" className="mb-4 bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Review
            </Button>
          </Link>
          <div className="rounded-2xl border border-rose-200/50 dark:border-rose-800/50 bg-rose-50/70 dark:bg-rose-900/30 p-6 shadow-lg backdrop-blur-sm">
            <p className="text-rose-600 dark:text-rose-400">{error || 'Cheat sheet not found'}</p>
          </div>
        </div>
      </div>
    );
  }

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'Algebra': 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300',
      'Geometry': 'bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300',
      'Functions': 'bg-violet-100 dark:bg-violet-900 text-violet-700 dark:text-violet-300',
      'Statistics': 'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300',
      'Vectors': 'bg-rose-100 dark:bg-rose-900 text-rose-700 dark:text-rose-300',
      'Analytic Geometry': 'bg-cyan-100 dark:bg-cyan-900 text-cyan-700 dark:text-cyan-300',
    };
    return colors[category] || 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <Navigation />

      <main className="mx-auto max-w-7xl px-4 py-8">
        {/* Header */}
        <Link href="/review">
          <Button variant="outline" className="mb-4 bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Review
          </Button>
        </Link>

        <div className="rounded-2xl border border-white/40 dark:border-slate-700/50 bg-white/70 dark:bg-slate-800/70 p-8 shadow-lg dark:shadow-slate-900/30 backdrop-blur-sm">
          {/* Title */}
          <div className="mb-6 flex items-start justify-between">
            <div>
              <span className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${getCategoryColor(cheatSheet.category)}`}>
                {cheatSheet.category}
              </span>
              <h1 className="mt-3 text-2xl font-bold text-slate-800 dark:text-slate-100">
                {cheatSheet.nodeTitle}
              </h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Cheat Sheet • Updated {new Date(cheatSheet.updatedAt).toLocaleDateString()}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchCheatSheet}
                className="bg-white/70 dark:bg-slate-700/70 backdrop-blur-sm"
              >
                <RotateCcw className="h-4 w-4" />
                <span className="ml-2">Refresh</span>
              </Button>
            </div>
          </div>

          {/* Key Points */}
          <div className="mb-6">
            <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-slate-800 dark:text-slate-200">
              <FileText className="h-5 w-5 text-blue-500" />
              Key Points
            </h2>
            <ul className="space-y-2">
              {cheatSheet.keyPoints.map((point, index) => (
                <li key={index} className="flex items-start gap-3 rounded-lg bg-slate-50 dark:bg-slate-700/50 p-3">
                  <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900 text-xs font-medium text-blue-600 dark:text-blue-300">
                    {index + 1}
                  </span>
                  <span className="text-slate-700 dark:text-slate-300">{point}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Formulas */}
          {cheatSheet.formulas && cheatSheet.formulas.length > 0 && (
            <div className="mb-6">
              <h2 className="mb-3 text-lg font-semibold text-slate-800 dark:text-slate-200">
                Formulas
              </h2>
              <div className="grid gap-2">
                {cheatSheet.formulas.map((formula, index) => (
                  <div key={index} className="rounded-lg bg-amber-50 dark:bg-amber-900/30 p-3 font-mono text-sm text-amber-800 dark:text-amber-200">
                    {formula}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Examples */}
          {cheatSheet.examples && cheatSheet.examples.length > 0 && (
            <div>
              <h2 className="mb-3 text-lg font-semibold text-slate-800 dark:text-slate-200">
                Examples
              </h2>
              <div className="space-y-2">
                {cheatSheet.examples.map((example, index) => (
                  <div key={index} className="rounded-lg bg-emerald-50 dark:bg-emerald-900/30 p-3 text-emerald-800 dark:text-emerald-200">
                    {example}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="mt-6 flex justify-center gap-4">
          <Link href="/review">
            <Button variant="outline" className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm">
              <ChevronLeft className="mr-2 h-4 w-4" />
              All Study Materials
            </Button>
          </Link>
          <Link href={`/flashcards/${nodeId}`}>
            <Button variant="outline" className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm">
              <Plus className="mr-2 h-4 w-4" />
              View Flashcards
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
