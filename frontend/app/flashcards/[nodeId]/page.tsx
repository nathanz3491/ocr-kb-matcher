'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Navigation } from '@/components/navigation/Navigation';
import { Loader2, ArrowLeft, RotateCcw, ChevronLeft, ChevronRight, Eye, EyeOff, CheckCircle, XCircle, Layers } from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';

interface Flashcard {
  id: string;
  nodeId: string;
  front: string;
  back: string;
  hint?: string;
}

interface FlashcardSet {
  nodeId: string;
  nodeTitle: string;
  category: string;
  cards: Flashcard[];
  createdAt: string;
  updatedAt: string;
}

export default function FlashcardStudyPage() {
  const params = useParams();
  const router = useRouter();
  const nodeId = params.nodeId as string;

  const [flashcardSet, setFlashcardSet] = useState<FlashcardSet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Study state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showHints, setShowHints] = useState(false);
  const [studiedCards, setStudiedCards] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchFlashcards();
  }, [nodeId]);

  const fetchFlashcards = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/api/flashcards/${nodeId}`);
      const json = await res.json();
      if (json.success) {
        setFlashcardSet(json.data);
      }
    } catch (err: any) {
      if (err?.response?.status === 404) {
        setError('Flashcards not found for this topic. Upload a document that covers this knowledge point.');
      } else {
        setError('Unable to load flashcards. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  const currentCard = flashcardSet?.cards[currentIndex];

  const handleFlip = useCallback(() => {
    setIsFlipped(!isFlipped);
  }, [isFlipped]);

  const handleNext = useCallback(() => {
    if (flashcardSet && currentIndex < flashcardSet.cards.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsFlipped(false);
      // Mark as studied
      if (currentCard) {
        setStudiedCards(prev => new Set([...prev, currentCard.id]));
      }
    }
  }, [flashcardSet, currentIndex, currentCard]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setIsFlipped(false);
    }
  }, [currentIndex]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      handleFlip();
    } else if (e.key === 'ArrowRight') {
      handleNext();
    } else if (e.key === 'ArrowLeft') {
      handlePrev();
    }
  }, [handleFlip, handleNext, handlePrev]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const shuffleCards = () => {
    if (!flashcardSet) return;
    const shuffled = [...flashcardSet.cards].sort(() => Math.random() - 0.5);
    setFlashcardSet({ ...flashcardSet, cards: shuffled });
    setCurrentIndex(0);
    setIsFlipped(false);
  };

  const resetCards = () => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setStudiedCards(new Set());
  };

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

  if (error || !flashcardSet || !currentCard) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <Navigation />
        <div className="mx-auto max-w-7xl px-4 py-8">
          <Link href="/flashcards">
            <Button variant="outline" className="mb-4 bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Flashcards
            </Button>
          </Link>
          <div className="rounded-2xl border border-rose-200/50 dark:border-rose-800/50 bg-rose-50/70 dark:bg-rose-900/30 p-6 shadow-lg dark:shadow-slate-900/30 backdrop-blur-sm">
            <p className="text-rose-600 dark:text-rose-400">{error || 'No flashcards available for this topic'}</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !flashcardSet || !currentCard) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <Navigation />
        <div className="mx-auto max-w-7xl px-4 py-8">
            <Link href="/flashcards">
            <Button variant="outline" className="mb-4 bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Flashcards
            </Button>
          </Link>
          <div className="rounded-2xl border border-rose-200/50 bg-rose-50/70 p-6 shadow-lg backdrop-blur-sm">
            <p className="text-rose-600">{error || 'No flashcards available for this topic'}</p>
          </div>
        </div>
      </div>
    );
  }

  const progress = ((currentIndex + 1) / flashcardSet.cards.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <Navigation />

      <main className="mx-auto max-w-7xl px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Link href="/flashcards" className="inline-flex items-center text-sm text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400">
              <ChevronLeft className="h-4 w-4" />
              All Flashcards
            </Link>
            <h1 className="mt-1 text-2xl font-bold text-slate-800 dark:text-white">{flashcardSet.nodeTitle}</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {flashcardSet.cards.length} cards • {studiedCards.size} studied
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowHints(!showHints)}
              className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm"
            >
              {showHints ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              <span className="ml-2">{showHints ? 'Hide' : 'Show'} Hints</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={shuffleCards}
              className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm"
            >
              <RotateCcw className="h-4 w-4" />
              <span className="ml-2">Shuffle</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={resetCards}
              className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm"
            >
              Reset
            </Button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-slate-500">Card {currentIndex + 1} of {flashcardSet.cards.length}</span>
              <span className="font-medium text-blue-600 dark:text-blue-400">{Math.round(progress)}%</span>
          </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Flashcard */}
        <div className="mb-8">
          <div 
            onClick={handleFlip}
            className="relative cursor-pointer"
            style={{ perspective: '1000px' }}
          >
            <div 
              className="group min-h-[350px] w-full"
              style={{ 
                transformStyle: 'preserve-3d',
                transition: 'transform 0.6s',
                transform: isFlipped ? 'rotateX(180deg)' : 'rotateX(0deg)'
              }}
            >
              {/* Front */}
              <div
                className="absolute inset-0 flex flex-col items-center justify-center rounded-3xl border border-white/40 dark:border-slate-600/50 bg-white/80 dark:bg-slate-800/80 p-8 shadow-xl dark:shadow-slate-900/50 backdrop-blur-sm"
                style={{ backfaceVisibility: 'hidden' }}
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600">
                  <Layers className="h-6 w-6 text-white" />
                </div>
                <p className="text-center text-xl font-medium text-slate-800 dark:text-slate-200">{currentCard.front}</p>
                
                {/* Hint */}
                {showHints && currentCard.hint && (
                  <div className="mt-6 rounded-xl bg-amber-50 dark:bg-amber-900/30 px-4 py-2 text-sm text-amber-700 dark:text-amber-300">
                    💡 {currentCard.hint}
                  </div>
                )}

                <p className="mt-8 text-sm text-slate-400 dark:text-slate-500">Click to flip • Space to flip • ← → to navigate</p>
              </div>

              {/* Back */}
              <div
                className="absolute inset-0 flex flex-col items-center justify-center rounded-3xl border border-white/40 dark:border-slate-600/50 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/30 dark:to-teal-900/30 p-8 shadow-xl dark:shadow-slate-900/50 backdrop-blur-sm"
                style={{ 
                  backfaceVisibility: 'hidden',
                  transform: 'rotateX(180deg)'
                }}
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600">
                  <CheckCircle className="h-6 w-6 text-white" />
                </div>
                <p className="text-center text-xl font-medium text-slate-800 dark:text-slate-200">{currentCard.back}</p>
                
                <p className="mt-8 text-sm text-slate-400 dark:text-slate-500">Click to flip back • Space to flip</p>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-center gap-4">
          <Button
            variant="outline"
            size="lg"
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm disabled:opacity-50"
          >
            <ChevronLeft className="mr-2 h-5 w-5" />
            Previous
          </Button>

          {/* Card dots */}
          <div className="flex gap-1">
            {flashcardSet.cards.map((card, idx) => (
              <button
                key={card.id}
                onClick={() => {
                  setCurrentIndex(idx);
                  setIsFlipped(false);
                }}
                className={`h-2 w-2 rounded-full transition-all ${
                  idx === currentIndex
                    ? 'w-6 bg-blue-600 dark:bg-blue-400'
                    : studiedCards.has(card.id)
                      ? 'bg-emerald-400 dark:bg-emerald-500'
                      : 'bg-slate-300 dark:bg-slate-600 hover:bg-slate-400 dark:hover:bg-slate-500'
                }`}
              />
            ))}
          </div>

          <Button
            variant="outline"
            size="lg"
            onClick={handleNext}
            disabled={currentIndex === flashcardSet.cards.length - 1}
            className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm disabled:opacity-50"
          >
            Next
            <ChevronRight className="ml-2 h-5 w-5" />
          </Button>
        </div>

        {/* Complete Message */}
        {currentIndex === flashcardSet.cards.length - 1 && (
          <div className="mt-8 text-center">
            <div className="inline-flex items-center gap-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 px-6 py-3 text-emerald-700 dark:text-emerald-300">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">You've studied all {flashcardSet.cards.length} cards!</span>
            </div>
            <div className="mt-4 flex justify-center gap-4">
              <Button
                onClick={resetCards}
                className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white"
              >
                Study Again
              </Button>
              <Link href="/flashcards">
                <Button variant="outline">
                  Back to Dashboard
                </Button>
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
