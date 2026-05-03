'use client';

import { useState, useEffect } from 'react';

/**
 * Formats a date as a relative time string (e.g., "2 hours ago", "3 days ago")
 */
export function useRelativeTime(dateString: string | undefined | null): string {
  const [relativeTime, setRelativeTime] = useState<string>('');

  useEffect(() => {
    if (!dateString) {
      setRelativeTime('Unknown');
      return;
    }

    const formatRelativeTime = () => {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffSecs = Math.floor(diffMs / 1000);
      const diffMins = Math.floor(diffSecs / 60);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);
      const diffWeeks = Math.floor(diffDays / 7);
      const diffMonths = Math.floor(diffDays / 30);
      const diffYears = Math.floor(diffDays / 365);

      if (diffSecs < 60) {
        return 'Just now';
      } else if (diffMins < 60) {
        return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
      } else if (diffHours < 24) {
        return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
      } else if (diffDays < 7) {
        return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
      } else if (diffWeeks < 4) {
        return `${diffWeeks} week${diffWeeks === 1 ? '' : 's'} ago`;
      } else if (diffMonths < 12) {
        return `${diffMonths} month${diffMonths === 1 ? '' : 's'} ago`;
      } else {
        return `${diffYears} year${diffYears === 1 ? '' : 's'} ago`;
      }
    };

    setRelativeTime(formatRelativeTime());

    // Update every minute
    const interval = setInterval(() => {
      setRelativeTime(formatRelativeTime());
    }, 60000);

    return () => clearInterval(interval);
  }, [dateString]);

  return relativeTime;
}

/**
 * Alternative: Get relative time without hooks (for static rendering)
 */
export function getRelativeTime(dateString: string | undefined | null): string {
  if (!dateString) return 'Unknown';
  
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffSecs < 60) {
    return 'Just now';
  } else if (diffMins < 60) {
    return `${diffMins}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else if (diffDays < 7) {
    return `${diffDays}d ago`;
  } else if (diffWeeks < 4) {
    return `${diffWeeks}w ago`;
  } else if (diffMonths < 12) {
    return `${diffMonths}mo ago`;
  } else {
    return `${diffYears}y ago`;
  }
}

/**
 * Format a date as a short date string
 */
export function formatDate(dateString: string | undefined | null): string {
  if (!dateString) return 'N/A';
  
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Format a date with time
 */
export function formatDateTime(dateString: string | undefined | null): string {
  if (!dateString) return 'N/A';
  
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * RelativeTime Component - for use in JSX
 */
interface RelativeTimeProps {
  date: string | undefined | null;
  className?: string;
}

export function RelativeTime({ date, className }: RelativeTimeProps) {
  const relativeTime = useRelativeTime(date);
  return <span className={className}>{relativeTime}</span>;
}