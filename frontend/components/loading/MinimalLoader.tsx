'use client';

import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { useTheme } from '@/components/theme/ThemeProvider';
import { clsx } from 'clsx';

// Shimmer animation keyframes - added via style tag
const shimmerStyles = `
  @keyframes shimmer {
    0% {
      transform: translateX(-100%);
    }
    100% {
      transform: translateX(100%);
    }
  }
  .skeleton-shimmer {
    position: relative;
    overflow: hidden;
  }
  .skeleton-shimmer::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    animation: shimmer 2s infinite;
  }
`;

// Loading context for global loading state
interface LoadingContextType {
  isLoading: boolean;
  message: string;
  startLoading: (msg?: string) => void;
  stopLoading: () => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export function useLoading() {
  const context = useContext(LoadingContext);
  if (!context) {
    return { isLoading: false, message: '', startLoading: () => {}, stopLoading: () => {} };
  }
  return context;
}

// Skeleton Line - for content placeholders with shimmer
interface SkeletonProps {
  width?: string;
  height?: string;
  className?: string;
}

export function Skeleton({ width = '100%', height = '1rem', className }: SkeletonProps) {
  const { theme } = useTheme();
  
  const baseColor = theme === 'dark' ? 'bg-slate-700/50' : 'bg-slate-200/60';
  const shimmerColor = theme === 'dark' 
    ? 'bg-gradient-to-r from-transparent via-slate-600/40 to-transparent' 
    : 'bg-gradient-to-r from-transparent via-white/60 to-transparent';

  return (
    <div 
      className={clsx(
        'skeleton-shimmer rounded-lg relative overflow-hidden',
        baseColor,
        className
      )}
      style={{ width, height }}
    >
      <div className={clsx(
        'absolute inset-0 z-10',
        shimmerColor
      )} />
    </div>
  );
}

// Skeleton Circle - for avatars
interface SkeletonCircleProps {
  size?: number;
  className?: string;
}

export function SkeletonCircle({ size = 40, className }: SkeletonCircleProps) {
  const { theme } = useTheme();
  
  const baseColor = theme === 'dark' ? 'bg-slate-700/50' : 'bg-slate-200/60';
  const shimmerColor = theme === 'dark' 
    ? 'bg-gradient-to-r from-transparent via-slate-600/40 to-transparent' 
    : 'bg-gradient-to-r from-transparent via-white/60 to-transparent';

  return (
    <div 
      className={clsx(
        'skeleton-shimmer rounded-full relative overflow-hidden',
        baseColor,
        className
      )}
      style={{ width: size, height: size }}
    >
      <div className={clsx(
        'absolute inset-0 z-10',
        shimmerColor
      )} />
    </div>
  );
}

// Skeleton Card - for card placeholders with shimmer
interface SkeletonCardProps {
  className?: string;
}

export function SkeletonCard({ className }: SkeletonCardProps) {
  const { theme } = useTheme();

  return (
    <div className={clsx(
      'rounded-2xl border p-4 skeleton-shimmer relative overflow-hidden',
      theme === 'dark'
        ? 'bg-slate-800/40 border-slate-700/30'
        : 'bg-white/60 border-slate-200/40',
      className
    )}>
      {/* Shimmer overlay */}
      <div className={clsx(
        'absolute inset-0 z-10',
        theme === 'dark' 
          ? 'bg-gradient-to-r from-transparent via-slate-600/30 to-transparent' 
          : 'bg-gradient-to-r from-transparent via-white/50 to-transparent'
      )} />
      
      <div className="flex items-center gap-3 mb-4">
        <SkeletonCircle size={40} />
        <div className="flex-1 space-y-2">
          <Skeleton width="60%" height="0.75rem" />
          <Skeleton width="40%" height="0.5rem" />
        </div>
      </div>
      <Skeleton width="100%" height="0.75rem" className="mb-2" />
      <Skeleton width="90%" height="0.75rem" className="mb-2" />
      <Skeleton width="75%" height="0.75rem" />
    </div>
  );
}

// Skeleton List - for list placeholders
interface SkeletonListProps {
  count?: number;
  className?: string;
}

export function SkeletonList({ count = 3, className }: SkeletonListProps) {
  return (
    <div className={className}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="mb-3">
          <SkeletonCard />
        </div>
      ))}
    </div>
  );
}

// Skeleton Stats Card
interface SkeletonStatsProps {
  className?: string;
}

export function SkeletonStats({ className }: SkeletonStatsProps) {
  const { theme } = useTheme();

  return (
    <div className={clsx(
      'rounded-2xl border p-4 skeleton-shimmer relative overflow-hidden',
      theme === 'dark'
        ? 'bg-slate-800/40 border-slate-700/30'
        : 'bg-white/60 border-slate-200/40',
      className
    )}>
      <div className={clsx(
        'absolute inset-0 z-10',
        theme === 'dark' 
          ? 'bg-gradient-to-r from-transparent via-slate-600/30 to-transparent' 
          : 'bg-gradient-to-r from-transparent via-white/50 to-transparent'
      )} />
      <div className="flex items-center gap-3 mb-3">
        <SkeletonCircle size={36} />
        <Skeleton width="50%" height="0.75rem" />
      </div>
      <Skeleton width="40%" height="1.5rem" />
    </div>
  );
}

// Skeleton Dashboard
interface SkeletonDashboardProps {
  className?: string;
}

export function SkeletonDashboard({ className }: SkeletonDashboardProps) {
  return (
    <div className={clsx('grid grid-cols-2 md:grid-cols-4 gap-4', className)}>
      <SkeletonStats />
      <SkeletonStats />
      <SkeletonStats />
      <SkeletonStats />
    </div>
  );
}

// Skeleton Table Row
interface SkeletonTableRowProps {
  className?: string;
}

export function SkeletonTableRow({ className }: SkeletonTableRowProps) {
  const { theme } = useTheme();

  return (
    <div className={clsx(
      'flex items-center gap-4 p-4 border-b',
      theme === 'dark' ? 'border-slate-700/30' : 'border-slate-200/40',
      className
    )}>
      <SkeletonCircle size={32} />
      <div className="flex-1">
        <Skeleton width="50%" height="0.75rem" className="mb-2" />
        <Skeleton width="30%" height="0.5rem" />
      </div>
      <Skeleton width="80px" height="2rem" className="rounded-lg" />
    </div>
  );
}

// Skeleton Table
interface SkeletonTableProps {
  rows?: number;
  className?: string;
}

export function SkeletonTable({ rows = 5, className }: SkeletonTableProps) {
  const { theme } = useTheme();

  return (
    <div className={clsx(
      'rounded-2xl border overflow-hidden',
      theme === 'dark'
        ? 'bg-slate-800/40 border-slate-700/30'
        : 'bg-white/60 border-slate-200/40',
      className
    )}>
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonTableRow key={i} className={i === rows - 1 ? 'border-b-0' : ''} />
      ))}
    </div>
  );
}

// Skeleton Quiz
interface SkeletonQuizProps {
  className?: string;
}

export function SkeletonQuiz({ className }: SkeletonQuizProps) {
  const { theme } = useTheme();

  return (
    <div className={clsx(
      'rounded-2xl border p-6 skeleton-shimmer relative overflow-hidden',
      theme === 'dark'
        ? 'bg-slate-800/40 border-slate-700/30'
        : 'bg-white/60 border-slate-200/40',
      className
    )}>
      <div className={clsx(
        'absolute inset-0 z-10',
        theme === 'dark' 
          ? 'bg-gradient-to-r from-transparent via-slate-600/30 to-transparent' 
          : 'bg-gradient-to-r from-transparent via-white/50 to-transparent'
      )} />
      
      {/* Question */}
      <Skeleton width="80%" height="1.5rem" className="mb-4" />
      <Skeleton width="100%" height="0.75rem" className="mb-2" />
      <Skeleton width="85%" height="0.75rem" className="mb-6" />
      
      {/* Options */}
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <SkeletonCircle size={24} />
            <Skeleton width="70%" height="0.75rem" />
          </div>
        ))}
      </div>
    </div>
  );
}

// Skeleton Flashcard
interface SkeletonFlashcardProps {
  className?: string;
}

export function SkeletonFlashcard({ className }: SkeletonFlashcardProps) {
  const { theme } = useTheme();

  return (
    <div className={clsx(
      'rounded-2xl border p-8 text-center skeleton-shimmer relative overflow-hidden',
      theme === 'dark'
        ? 'bg-slate-800/40 border-slate-700/30'
        : 'bg-white/60 border-slate-200/40',
      className
    )}>
      <div className={clsx(
        'absolute inset-0 z-10',
        theme === 'dark' 
          ? 'bg-gradient-to-r from-transparent via-slate-600/30 to-transparent' 
          : 'bg-gradient-to-r from-transparent via-white/50 to-transparent'
      )} />
      <Skeleton width="60%" height="2rem" className="mx-auto mb-4" />
      <Skeleton width="80%" height="1rem" className="mx-auto" />
    </div>
  );
}

// Skeleton Chat Message
interface SkeletonChatProps {
  className?: string;
}

export function SkeletonChat({ className }: SkeletonChatProps) {
  const { theme } = useTheme();

  return (
    <div className={clsx('flex gap-3', className)}>
      <SkeletonCircle size={32} />
      <div className={clsx(
        'rounded-2xl px-4 py-3 skeleton-shimmer relative overflow-hidden',
        theme === 'dark' ? 'bg-slate-700/50' : 'bg-slate-100/60'
      )}>
        <div className={clsx(
          'absolute inset-0 z-10',
          theme === 'dark' 
            ? 'bg-gradient-to-r from-transparent via-slate-500/30 to-transparent' 
            : 'bg-gradient-to-r from-transparent via-white/50 to-transparent'
        )} />
        <Skeleton width="90%" height="0.75rem" className="mb-2" />
        <Skeleton width="70%" height="0.75rem" className="mb-2" />
        <Skeleton width="50%" height="0.75rem" />
      </div>
    </div>
  );
}

// Skeleton Page - Full page loader
interface SkeletonPageProps {
  className?: string;
}

export function SkeletonPage({ className }: SkeletonPageProps) {
  const { theme } = useTheme();

  return (
    <div className={clsx(
      'rounded-2xl border p-6 skeleton-shimmer relative overflow-hidden',
      theme === 'dark'
        ? 'bg-slate-800/40 border-slate-700/30'
        : 'bg-white/60 border-slate-200/40',
      className
    )}>
      <div className={clsx(
        'absolute inset-0 z-10',
        theme === 'dark' 
          ? 'bg-gradient-to-r from-transparent via-slate-600/30 to-transparent' 
          : 'bg-gradient-to-r from-transparent via-white/50 to-transparent'
      )} />
      
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <SkeletonCircle size={48} />
        <div className="flex-1">
          <Skeleton width="40%" height="1.5rem" className="mb-3" />
          <Skeleton width="25%" height="0.75rem" />
        </div>
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <SkeletonStats />
        <SkeletonStats />
        <SkeletonStats />
        <SkeletonStats />
      </div>
      
      {/* Content */}
      <SkeletonCard />
    </div>
  );
}

// Skeleton Certificate
interface SkeletonCertificateProps {
  className?: string;
}

export function SkeletonCertificate({ className }: SkeletonCertificateProps) {
  const { theme } = useTheme();

  return (
    <div className={clsx(
      'rounded-2xl border p-8 text-center skeleton-shimmer relative overflow-hidden',
      theme === 'dark'
        ? 'bg-slate-800/40 border-slate-700/30'
        : 'bg-white/60 border-slate-200/40',
      className
    )}>
      <div className={clsx(
        'absolute inset-0 z-10',
        theme === 'dark' 
          ? 'bg-gradient-to-r from-transparent via-slate-600/30 to-transparent' 
          : 'bg-gradient-to-r from-transparent via-white/50 to-transparent'
      )} />
      <SkeletonCircle size={64} className="mx-auto mb-4" />
      <Skeleton width="50%" height="1.5rem" className="mx-auto mb-2" />
      <Skeleton width="70%" height="1rem" className="mx-auto mb-4" />
      <Skeleton width="40%" height="0.75rem" className="mx-auto" />
    </div>
  );
}

// Skeleton Chart
interface SkeletonChartProps {
  className?: string;
}

export function SkeletonChart({ className }: SkeletonChartProps) {
  const { theme } = useTheme();

  return (
    <div className={clsx(
      'rounded-2xl border p-4 skeleton-shimmer relative overflow-hidden',
      theme === 'dark'
        ? 'bg-slate-800/40 border-slate-700/30'
        : 'bg-white/60 border-slate-200/40',
      className
    )}>
      <div className={clsx(
        'absolute inset-0 z-10',
        theme === 'dark' 
          ? 'bg-gradient-to-r from-transparent via-slate-600/30 to-transparent' 
          : 'bg-gradient-to-r from-transparent via-white/50 to-transparent'
      )} />
      <div className="flex items-center justify-between mb-4">
        <Skeleton width="120px" height="1rem" />
        <Skeleton width="60px" height="2rem" className="rounded-lg" />
      </div>
      <div className="flex items-end gap-2 h-32">
        {[55, 70, 45, 85, 60, 40, 75].map((h, i) => (
          <Skeleton
            key={i}
            width={`${100/7}%`}
            height={`${h}%`}
            className="rounded-t-lg"
          />
        ))}
      </div>
    </div>
  );
}

// Loading Overlay with Skeleton
interface LoadingOverlayProps {
  isLoading: boolean;
  message?: string;
  type?: 'page' | 'card' | 'list';
}

export function LoadingOverlay({ isLoading, message = 'Loading...', type = 'page' }: LoadingOverlayProps) {
  const { theme } = useTheme();

  if (!isLoading) return null;

  const content = {
    page: <SkeletonPage />,
    card: <SkeletonCard />,
    list: <SkeletonList count={3} />,
  };

  return (
    <div className={clsx(
      'fixed inset-0 z-50 flex flex-col items-center justify-center backdrop-blur-sm transition-opacity duration-300 p-4',
      theme === 'dark'
        ? 'bg-slate-900/80'
        : 'bg-slate-50/80'
    )}>
      <div className="w-full max-w-4xl">
        {content[type]}
      </div>
    </div>
  );
}

// Minimalist Loading Spinner (still available)
interface MinimalLoaderProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function MinimalLoader({ size = 'md', className }: MinimalLoaderProps) {
  const { theme } = useTheme();
  
  const sizes = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  };

  return (
    <div className={clsx('relative', sizes[size], className)}>
      <div className={clsx(
        'absolute inset-0 rounded-full border-2 animate-ping',
        theme === 'dark' 
          ? 'border-blue-400/30' 
          : 'border-blue-500/30'
      )} />
      <div className={clsx(
        'absolute inset-0 rounded-full border-2 border-transparent animate-spin',
        theme === 'dark'
          ? 'border-t-blue-400 border-r-transparent'
          : 'border-t-blue-500 border-r-transparent'
      )} style={{ animationDuration: '1s' }} />
    </div>
  );
}

// Card Loader (still available)
interface CardLoaderProps {
  className?: string;
}

export function CardLoader({ className }: CardLoaderProps) {
  const { theme } = useTheme();

  return (
    <div className={clsx(
      'flex items-center justify-center gap-3 rounded-2xl border p-8 skeleton-shimmer relative overflow-hidden',
      theme === 'dark'
        ? 'bg-slate-800/40 border-slate-700/30'
        : 'bg-white/60 border-slate-200/40',
      className
    )}>
      <div className={clsx(
        'absolute inset-0 z-10',
        theme === 'dark' 
          ? 'bg-gradient-to-r from-transparent via-slate-600/30 to-transparent' 
          : 'bg-gradient-to-r from-transparent via-white/50 to-transparent'
      )} />
      <MinimalLoader size="md" />
      <span className={clsx(
        'text-sm',
        theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
      )}>
        Loading...
      </span>
    </div>
  );
}

// Page Loader (still available)
interface PageLoaderProps {
  message?: string;
}

export function PageLoader({ message = 'Loading' }: PageLoaderProps) {
  return (
    <div className="w-full">
      <SkeletonPage />
    </div>
  );
}

// Inline loader
interface InlineLoaderProps {
  className?: string;
}

export function InlineLoader({ className }: InlineLoaderProps) {
  const { theme } = useTheme();

  return (
    <div className={clsx('flex items-center gap-2', className)}>
      <div className={clsx(
        'h-4 w-4 animate-spin rounded-full border-2 border-transparent',
        theme === 'dark' ? 'border-t-blue-400' : 'border-t-blue-500'
      )} />
    </div>
  );
}

// Dots Loader
interface DotsLoaderProps {
  className?: string;
}

export function DotsLoader({ className }: DotsLoaderProps) {
  const { theme } = useTheme();

  return (
    <div className={clsx('flex items-center gap-1.5', className)}>
      {[0, 1, 2].map(i => (
        <div
          key={i}
          className={clsx(
            'h-2 w-2 rounded-full',
            theme === 'dark' ? 'bg-blue-400/60' : 'bg-blue-500/60',
            'animate-pulse'
          )}
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}

// Pulse Loader
interface PulseLoaderProps {
  className?: string;
}

export function PulseLoader({ className }: PulseLoaderProps) {
  const { theme } = useTheme();

  return (
    <div className={clsx('relative h-8 w-8', className)}>
      <div className={clsx(
        'absolute inset-0 rounded-full animate-ping',
        theme === 'dark' ? 'bg-blue-400/40' : 'bg-blue-500/40'
      )} />
      <div className={clsx(
        'absolute inset-2 rounded-full',
        theme === 'dark' ? 'bg-blue-500/60' : 'bg-blue-600/60'
      )} />
    </div>
  );
}