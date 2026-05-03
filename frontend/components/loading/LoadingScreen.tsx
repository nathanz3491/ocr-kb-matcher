'use client';

import { useState, useEffect } from 'react';
import { Loader2, Sparkles, Lightbulb, BookOpen, Brain, Trophy, Target, Zap } from 'lucide-react';
import pepTalksData from '@/data/pep-talks.json';

interface LoadingScreenProps {
  isLoading: boolean;
  loadedCount: number;
  totalCount: number;
}

function getRandomPepTalk(): string {
  const pepTalks = pepTalksData.pepTalks;
  return pepTalks[Math.floor(Math.random() * pepTalks.length)];
}

function getRandomIcon() {
  const icons = [Sparkles, Lightbulb, BookOpen, Brain, Trophy, Target, Zap];
  const Icon = icons[Math.floor(Math.random() * icons.length)];
  return <Icon className="h-5 w-5" />;
}

export function LoadingScreen({ isLoading, loadedCount, totalCount }: LoadingScreenProps) {
  const [pepTalk, setPepTalk] = useState<string>('');
  const [icon, setIcon] = useState<React.ReactNode>(null);

  useEffect(() => {
    setPepTalk(getRandomPepTalk());
    setIcon(getRandomIcon());
  }, []);

  if (!isLoading) return null;

  const progress = totalCount > 0 ? (loadedCount / totalCount) * 100 : 0;
  const progressText = totalCount > 0 
    ? `Loading ${loadedCount} of ${totalCount}...`
    : 'Loading...';

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-blue-200/30 blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-indigo-200/30 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-96 w-96 rounded-full bg-violet-200/20 blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      {/* Main Content */}
      <div className="relative z-10 w-[70vw] max-w-md text-center">
        {/* Logo/Icon */}
        <div className="mb-8 flex justify-center">
          <div className="relative">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/30">
              <Loader2 className="h-10 w-10 animate-spin text-white" />
            </div>
            <div className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg">
              <Brain className="h-4 w-4 text-white" />
            </div>
          </div>
        </div>

        {/* Title */}
        <h2 className="mb-2 text-2xl font-bold text-slate-800">
          Preparing Your Learning Experience
        </h2>
        <p className="mb-8 text-slate-600">
          Fetching your data and setting things up...
        </p>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-300">{progressText}</span>
            <span className="font-bold text-blue-600 dark:text-blue-400">{Math.round(progress)}%</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700 shadow-inner">
            <div 
              className="h-full animate-pulse rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500 shadow-lg shadow-indigo-500/50 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Loading Dots */}
        <div className="mb-8 flex justify-center gap-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-2 w-2 animate-bounce rounded-full bg-slate-400 dark:bg-slate-500"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>

        {/* Pep Talk */}
        {pepTalk && (
          <div className="animate-fade-in rounded-2xl border border-white/40 dark:border-slate-700/50 bg-white/70 dark:bg-slate-800/70 p-6 shadow-xl dark:shadow-slate-900/30 backdrop-blur-md">
            <div className="mb-2 flex items-center justify-center gap-2 text-amber-500">
              {icon}
              <span className="text-sm font-medium uppercase tracking-wide">Motivational Moment</span>
            </div>
            <p className="text-lg font-medium text-slate-700 dark:text-slate-300">
              "{pepTalk}"
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Hook to manage multiple loading states
interface UseLoadingOptions {
  count: number;
}

export function usePageLoading(totalItems: number) {
  const [loadingStates, setLoadingStates] = useState<boolean[]>(
    new Array(totalItems).fill(true)
  );

  const setLoading = (index: number, isLoading: boolean) => {
    setLoadingStates(prev => {
      const newStates = [...prev];
      newStates[index] = isLoading;
      return newStates;
    });
  };

  const isLoading = loadingStates.some(state => state);
  const loadedCount = loadingStates.filter(state => !state).length;
  const totalCount = totalItems;

  return {
    isLoading,
    loadedCount,
    totalCount,
    setLoading,
  };
}
