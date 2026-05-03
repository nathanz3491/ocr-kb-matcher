'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Navigation } from '@/components/navigation/Navigation';
import { Loader2, ArrowLeft, BookOpen, RotateCcw, Link as LinkIcon } from 'lucide-react';
import Link from 'next/link';
import axios from 'axios';
import { Button } from '@/components/ui/button';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

interface StudyNotes {
  nodeId: string;
  nodeTitle: string;
  category: string;
  summary: string;
  notes: string;
  relatedNodes: string[];
  createdAt: string;
  updatedAt: string;
}

export default function StudyNotesPage() {
  const params = useParams();
  const nodeId = params.nodeId as string;

  const [notes, setNotes] = useState<StudyNotes | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchNotes();
  }, [nodeId]);

  const fetchNotes = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE_URL}/api/study/notes/${nodeId}`, { timeout: 10000 });
      if (res.data.success) {
        setNotes(res.data.data);
      }
    } catch (err: any) {
      if (err.response?.status === 404) {
        setGenerating(true);
        try {
          const res = await axios.post(`${API_BASE_URL}/api/study/notes/${nodeId}/generate`);
          if (res.data.success) {
            setNotes(res.data.data);
          }
        } catch (genErr) {
          setError('Failed to generate study notes');
        }
      } else {
        setError('Failed to load study notes');
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
              {generating ? 'Generating study notes with AI...' : 'Loading study notes...'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !notes) {
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
            <p className="text-rose-600 dark:text-rose-400">{error || 'Study notes not found'}</p>
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
    };
    return colors[category] || 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <Navigation />

      <main className="mx-auto max-w-7xl px-4 py-8">
        <Link href="/review">
          <Button variant="outline" className="mb-4 bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Review
          </Button>
        </Link>

        <div className="rounded-2xl border border-white/40 dark:border-slate-700/50 bg-white/70 dark:bg-slate-800/70 p-8 shadow-lg dark:shadow-slate-900/30 backdrop-blur-sm">
          {/* Header */}
          <div className="mb-6 flex items-start justify-between">
            <div>
              <span className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${getCategoryColor(notes.category)}`}>
                {notes.category}
              </span>
              <h1 className="mt-3 text-2xl font-bold text-slate-800 dark:text-slate-100">
                {notes.nodeTitle}
              </h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Study Notes • Updated {new Date(notes.updatedAt).toLocaleDateString()}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchNotes}
              className="bg-white/70 dark:bg-slate-700/70 backdrop-blur-sm"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>

          {/* Summary */}
          <div className="mb-6 rounded-xl bg-violet-50 dark:bg-violet-900/30 p-4">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-violet-700 dark:text-violet-300">
              Summary
            </h2>
            <p className="text-violet-800 dark:text-violet-200">{notes.summary}</p>
          </div>

          {/* Detailed Notes */}
          <div className="mb-6">
            <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-slate-800 dark:text-slate-200">
              <BookOpen className="h-5 w-5 text-blue-500" />
              Detailed Notes
            </h2>
            <div className="prose prose-slate dark:prose-invert max-w-none rounded-xl bg-slate-50 dark:bg-slate-700/50 p-4">
              <div className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">
                {notes.notes}
              </div>
            </div>
          </div>

          {/* Related Nodes */}
          {notes.relatedNodes && notes.relatedNodes.length > 0 && (
            <div>
              <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-slate-800 dark:text-slate-200">
                <LinkIcon className="h-5 w-5 text-emerald-500" />
                Related Topics
              </h2>
              <div className="flex flex-wrap gap-2">
                {notes.relatedNodes.map((relatedId) => (
                  <Link
                    key={relatedId}
                    href={`/review/notes/${relatedId}`}
                    className="rounded-full bg-emerald-100 dark:bg-emerald-900 px-3 py-1 text-sm font-medium text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-800"
                  >
                    {relatedId}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="mt-6 flex justify-center gap-4">
          <Link href="/review">
            <Button variant="outline" className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              All Study Materials
            </Button>
          </Link>
          <Link href={`/flashcards/${nodeId}`}>
            <Button variant="outline" className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm">
              View Flashcards
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
