'use client';

import { useState, useEffect } from 'react';
import { Navigation } from '@/components/navigation/Navigation';
import { Loader2, Layers, BookOpen, Plus, RefreshCw, Play, GraduationCap } from 'lucide-react';
import Link from 'next/link';
import axios from 'axios';
import { usePageLoading } from '@/components/loading/LoadingScreen';
import { LoadingOverlay } from '@/components/loading/MinimalLoader';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

interface FlashcardSet {
  nodeId: string;
  nodeTitle: string;
  category: string;
  cards: Array<{
    id: string;
    front: string;
    back: string;
    hint?: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

interface FlashcardProgress {
  nodeId: string;
  totalCards: number;
  masteredCards: number;
  learningCards: number;
  newCards: number;
  lastReviewed: string;
  reviewStreak: number;
}

export default function FlashcardsPage() {
  const [flashcards, setFlashcards] = useState<FlashcardSet[]>([]);
  const [progress, setProgress] = useState<FlashcardProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const { isLoading, loadedCount, totalCount, setLoading: setPageLoading } = usePageLoading(1);

  useEffect(() => {
    fetchFlashcards();
  }, []);

  const fetchFlashcards = async () => {
    try {
      setPageLoading(0, true);
      const res = await axios.get(`${API_BASE_URL}/api/flashcards`, { timeout: 5000 });
      if (res.data.success) {
        setFlashcards(res.data.data.sets || []);
        setProgress(res.data.data.progress || []);
        setIsOffline(false);
      }
    } catch (err) {
      console.warn('Using offline mode for flashcards');
      setFlashcards([]);
      setProgress([]);
      setIsOffline(true);
    } finally {
      setLoading(false);
      setPageLoading(0, false);
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'Algebra': 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
      'Geometry': 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
      'Functions': 'bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800',
      'Statistics': 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
      'Vectors': 'bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
      'default': 'bg-slate-100 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700',
    };
    return colors[category] || colors['default'];
  };

  const totalCards = flashcards.reduce((sum, set) => sum + set.cards.length, 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <Navigation />
        <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
          <div className="text-center">
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-blue-600 dark:text-blue-400" />
            <p className="mt-4 text-slate-600 dark:text-slate-400">Loading flashcards...</p>
          </div>
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
          <h1 className="text-3xl font-bold text-slate-800 dark:text-white">Flashcards</h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400">
            Master your knowledge with AI-generated flashcards. Each topic has 10 cards.
          </p>
        </div>

        {/* Stats Overview */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-4">
          <div className="rounded-2xl border border-white/40 dark:border-slate-700/50 bg-white/70 dark:bg-slate-800/70 p-5 shadow-lg dark:shadow-slate-900/30 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600">
                <Layers className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800 dark:text-white">{flashcards.length}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Topics</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/40 dark:border-slate-700/50 bg-white/70 dark:bg-slate-800/70 p-5 shadow-lg dark:shadow-slate-900/30 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600">
                <BookOpen className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800 dark:text-white">{totalCards}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Total Cards</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/40 dark:border-slate-700/50 bg-white/70 dark:bg-slate-800/70 p-5 shadow-lg dark:shadow-slate-900/30 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600">
                <RefreshCw className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800 dark:text-white">{progress.reduce((sum, p) => sum + p.newCards, 0)}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">New Cards</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/40 dark:border-slate-700/50 bg-white/70 dark:bg-slate-800/70 p-5 shadow-lg dark:shadow-slate-900/30 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600">
                <Plus className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800 dark:text-white">10</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Cards per Topic</p>
              </div>
            </div>
          </div>
        </div>

        {/* Error / Offline Message */}
        {isOffline && (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-amber-700">
            Using cached data - backend unavailable
          </div>
        )}

        {/* Flashcard Sets Grid */}
        {flashcards.length === 0 ? (
          <div className="rounded-2xl border border-white/40 dark:border-slate-700/50 bg-white/70 dark:bg-slate-800/70 p-12 text-center shadow-lg dark:shadow-slate-900/30 backdrop-blur-sm">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700">
              <Layers className="h-8 w-8 text-slate-400 dark:text-slate-500" />
            </div>
            <h2 className="mb-2 text-xl font-semibold text-slate-800 dark:text-white">No Flashcards Yet</h2>
            <p className="mb-6 text-slate-600 dark:text-slate-400">
              Start by uploading documents or exploring knowledge nodes to generate flashcards.
            </p>
            <Link
              href="/learn"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-3 font-medium text-white shadow-md transition-all hover:from-blue-600 hover:to-indigo-600"
            >
              <GraduationCap className="h-5 w-5" />
              Go to Learning Hub
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {flashcards.map((set) => (
              <Link
                key={set.nodeId}
                href={`/flashcards/${set.nodeId}`}
                className="group rounded-2xl border border-white/40 dark:border-slate-700/50 bg-white/70 dark:bg-slate-800/70 p-5 shadow-lg dark:shadow-slate-900/30 backdrop-blur-sm transition-all hover:scale-[1.02] hover:shadow-xl hover:border-blue-200/50 dark:hover:border-blue-500/50"
              >
                {/* Card Header */}
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex-1">
                    <span className={`inline-block rounded-full px-3 py-1 text-xs font-medium border ${getCategoryColor(set.category)}`}>
                      {set.category}
                    </span>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 opacity-0 transition-opacity group-hover:opacity-100">
                    <Play className="h-5 w-5 text-white" />
                  </div>
                </div>

                {/* Title */}
                <h3 className="mb-2 text-lg font-semibold text-slate-800 dark:text-white line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                  {set.nodeTitle}
                </h3>

                {/* Card Count */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">{set.cards.length} cards</span>
                  <span className="text-slate-400 dark:text-slate-500">
                    {new Date(set.updatedAt).toLocaleDateString()}
                  </span>
                </div>

                {/* Preview dots */}
                <div className="mt-4 flex gap-1">
                  {set.cards.slice(0, 5).map((card, i) => (
                    <div
                      key={i}
                      className="h-1.5 flex-1 rounded-full bg-slate-200 dark:bg-slate-600"
                    />
                  ))}
                  {set.cards.length > 5 && (
                    <span className="text-xs text-slate-400 dark:text-slate-500">+{set.cards.length - 5}</span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      <LoadingOverlay
        isLoading={isLoading}
        message="Loading flashcards..."
      />
    </div>
  );
}
