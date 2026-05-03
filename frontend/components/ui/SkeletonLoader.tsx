'use client';

import { useTheme } from '@/components/theme/ThemeProvider';
import { clsx } from 'clsx';

// Wrapper component that provides theme context
function ThemeWrapper({ children, className }: { children: (theme: 'light' | 'dark') => React.ReactNode, className?: string }) {
  const { theme } = useTheme();
  return <div className={className}>{children(theme)}</div>;
}

/**
 * SkeletonLoader - Animated skeleton loading placeholders
 * Use while data is loading
 */

// Single line skeleton
export function SkeletonLine({ width = '100%', height = '1rem', className }: { width?: string, height?: string, className?: string }) {
  return (
    <ThemeWrapper>
      {(theme) => (
        <div 
          className={clsx(
            'animate-pulse rounded-lg',
            theme === 'dark' ? 'bg-slate-700/50' : 'bg-slate-200/60',
            className
          )}
          style={{ width, height }}
        />
      )}
    </ThemeWrapper>
  );
}

// Circle skeleton (for avatars, icons)
export function SkeletonCircle({ size = 40, className }: { size?: number, className?: string }) {
  return (
    <ThemeWrapper>
      {(theme) => (
        <div 
          className={clsx(
            'animate-pulse rounded-full',
            theme === 'dark' ? 'bg-slate-700/50' : 'bg-slate-200/60',
            className
          )}
          style={{ width: size, height: size }}
        />
      )}
    </ThemeWrapper>
  );
}

// Card skeleton (for content cards)
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <ThemeWrapper>
      {(theme) => (
        <div className={clsx(
          'rounded-2xl border p-4 animate-pulse',
          theme === 'dark'
            ? 'bg-slate-800/40 border-slate-700/30'
            : 'bg-white/60 border-white/40',
          className
        )}>
          <div className="flex items-center gap-3 mb-4">
            <SkeletonCircle size={40} />
            <div className="flex-1">
              <SkeletonLine width="60%" height="0.75rem" className="mb-2" />
              <SkeletonLine width="40%" height="0.5rem" />
            </div>
          </div>
          <SkeletonLine width="100%" height="0.75rem" className="mb-2" />
          <SkeletonLine width="90%" height="0.75rem" className="mb-2" />
          <SkeletonLine width="75%" height="0.75rem" />
        </div>
      )}
    </ThemeWrapper>
  );
}

// List skeleton (for lists of items)
export function SkeletonList({ count = 3, className }: { count?: number, className?: string }) {
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

// Table row skeleton
export function SkeletonTable({ rows = 5, className }: { rows?: number, className?: string }) {
  return (
    <ThemeWrapper>
      {(theme) => (
        <div className={clsx(
          'rounded-2xl border overflow-hidden',
          theme === 'dark'
            ? 'bg-slate-800/40 border-slate-700/30'
            : 'bg-white/60 border-white/40',
          className
        )}>
          {Array.from({ length: rows }).map((_, i) => (
            <div 
              key={i} 
              className={clsx(
                'flex items-center gap-4 p-4 border-b transition-colors',
                theme === 'dark' ? 'border-slate-700/30' : 'border-slate-200/40',
                i === rows - 1 && 'border-b-0'
              )}
            >
              <SkeletonCircle size={32} />
              <div className="flex-1">
                <SkeletonLine width="50%" height="0.75rem" className="mb-2" />
                <SkeletonLine width="30%" height="0.5rem" />
              </div>
              <SkeletonLine width="80px" height="2rem" className="rounded-lg" />
            </div>
          ))}
        </div>
      )}
    </ThemeWrapper>
  );
}

// Graph skeleton (for knowledge graph)
export function SkeletonGraph({ className }: { className?: string }) {
  return (
    <ThemeWrapper>
      {(theme) => (
        <div className={clsx(
          'rounded-2xl border animate-pulse',
          theme === 'dark'
            ? 'bg-slate-800/40 border-slate-700/30'
            : 'bg-white/60 border-white/40',
          className
        )}>
          {/* Header */}
          <div className="p-4 border-b flex items-center justify-between">
            <div className="flex items-center gap-3">
              <SkeletonCircle size={32} />
              <SkeletonLine width="120px" height="1rem" />
            </div>
            <SkeletonLine width="60px" height="2rem" className="rounded-lg" />
          </div>
          
          {/* Graph area */}
          <div className="p-4">
            <div className="flex gap-2 mb-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <SkeletonCircle key={i} size={48} />
              ))}
            </div>
            <SkeletonLine width="100%" height="200px" className="rounded-xl" />
          </div>
        </div>
      )}
    </ThemeWrapper>
  );
}

// Quiz question skeleton
export function SkeletonQuiz({ className }: { className?: string }) {
  return (
    <ThemeWrapper>
      {(theme) => (
        <div className={clsx(
          'rounded-2xl border p-6 animate-pulse',
          theme === 'dark'
            ? 'bg-slate-800/40 border-slate-700/30'
            : 'bg-white/60 border-white/40',
          className
        )}>
          {/* Question */}
          <SkeletonLine width="80%" height="1.5rem" className="mb-4" />
          <SkeletonLine width="100%" height="0.75rem" className="mb-2" />
          <SkeletonLine width="85%" height="0.75rem" className="mb-6" />
          
          {/* Options */}
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <SkeletonCircle size={24} />
                <SkeletonLine width="70%" height="0.75rem" />
              </div>
            ))}
          </div>
        </div>
      )}
    </ThemeWrapper>
  );
}

// Flashcard skeleton
export function SkeletonFlashcard({ className }: { className?: string }) {
  return (
    <ThemeWrapper>
      {(theme) => (
        <div className={clsx(
          'rounded-2xl border p-8 text-center animate-pulse',
          theme === 'dark'
            ? 'bg-slate-800/40 border-slate-700/30'
            : 'bg-white/60 border-white/40',
          className
        )}>
          <SkeletonLine width="60%" height="2rem" className="mx-auto mb-4" />
          <SkeletonLine width="80%" height="1rem" className="mx-auto" />
        </div>
      )}
    </ThemeWrapper>
  );
}

// Stats card skeleton
export function SkeletonStats({ className }: { className?: string }) {
  return (
    <ThemeWrapper>
      {(theme) => (
        <div className={clsx(
          'rounded-2xl border p-4 animate-pulse',
          theme === 'dark'
            ? 'bg-slate-800/40 border-slate-700/30'
            : 'bg-white/60 border-white/40',
          className
        )}>
          <div className="flex items-center gap-3 mb-3">
            <SkeletonCircle size={36} />
            <SkeletonLine width="50%" height="0.75rem" />
          </div>
          <SkeletonLine width="40%" height="1.5rem" />
        </div>
      )}
    </ThemeWrapper>
  );
}

// Dashboard stats row skeleton
export function SkeletonDashboard({ className }: { className?: string }) {
  return (
    <div className={clsx('grid grid-cols-2 md:grid-cols-4 gap-4', className)}>
      <SkeletonStats />
      <SkeletonStats />
      <SkeletonStats />
      <SkeletonStats />
    </div>
  );
}

// Chat message skeleton
export function SkeletonChat({ className }: { className?: string }) {
  return (
    <ThemeWrapper>
      {(theme) => (
        <div className={clsx(
          'flex gap-3 animate-pulse',
          className
        )}>
          <SkeletonCircle size={32} />
          <div className="flex-1">
            <div className={clsx(
              'rounded-2xl px-4 py-3',
              theme === 'dark' ? 'bg-slate-700/50' : 'bg-slate-100/60'
            )}>
              <SkeletonLine width="90%" height="0.75rem" className="mb-2" />
              <SkeletonLine width="70%" height="0.75rem" className="mb-2" />
              <SkeletonLine width="50%" height="0.75rem" />
            </div>
          </div>
        </div>
      )}
    </ThemeWrapper>
  );
}

// Page skeleton (full page loading)
export function SkeletonPage({ className }: { className?: string }) {
  return (
    <ThemeWrapper>
      {(theme) => (
        <div className={clsx(
          'rounded-2xl border p-6 animate-pulse',
          theme === 'dark'
            ? 'bg-slate-800/40 border-slate-700/30'
            : 'bg-white/60 border-white/40',
          className
        )}>
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <SkeletonCircle size={48} />
            <div className="flex-1">
              <SkeletonLine width="40%" height="1.5rem" className="mb-3" />
              <SkeletonLine width="25%" height="0.75rem" />
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
      )}
    </ThemeWrapper>
  );
}

// Certificate skeleton
export function SkeletonCertificate({ className }: { className?: string }) {
  return (
    <ThemeWrapper>
      {(theme) => (
        <div className={clsx(
          'rounded-2xl border p-8 text-center animate-pulse',
          theme === 'dark'
            ? 'bg-slate-800/40 border-slate-700/30'
            : 'bg-white/60 border-white/40',
          className
        )}>
          <SkeletonCircle size={64} className="mx-auto mb-4" />
          <SkeletonLine width="50%" height="1.5rem" className="mx-auto mb-2" />
          <SkeletonLine width="70%" height="1rem" className="mx-auto mb-4" />
          <SkeletonLine width="40%" height="0.75rem" className="mx-auto" />
        </div>
      )}
    </ThemeWrapper>
  );
}

// Analytics chart skeleton
export function SkeletonChart({ className }: { className?: string }) {
  return (
    <ThemeWrapper>
      {(theme) => (
        <div className={clsx(
          'rounded-2xl border p-4 animate-pulse',
          theme === 'dark'
            ? 'bg-slate-800/40 border-slate-700/30'
            : 'bg-white/60 border-white/40',
          className
        )}>
          <div className="flex items-center justify-between mb-4">
            <SkeletonLine width="120px" height="1rem" />
            <SkeletonLine width="60px" height="2rem" className="rounded-lg" />
          </div>
          <div className="flex items-end gap-2 h-32">
            {[55, 70, 45, 85, 60, 40, 75].map((h, i) => (
              <SkeletonLine
                key={i}
                width={`${100/7}%`}
                height={`${h}%`}
                className="rounded-t-lg"
              />
            ))}
          </div>
        </div>
      )}
    </ThemeWrapper>
  );
}