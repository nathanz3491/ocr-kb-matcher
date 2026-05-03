'use client';

import { ReactNode } from 'react';
import { useTheme } from '@/components/theme/ThemeProvider';
import { clsx } from 'clsx';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

/**
 * GlassCard - Frosted glass effect card component
 * Provides consistent glassmorphism styling across all pages
 */
export function GlassCard({ 
  children, 
  className, 
  hover = false,
  padding = 'md'
}: GlassCardProps) {
  const { theme } = useTheme();
  
  const paddingClasses = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  };

  return (
    <div className={clsx(
      'rounded-2xl border transition-all duration-300 backdrop-blur-xl',
      paddingClasses[padding],
      // Base glass effect
      theme === 'dark'
        ? 'bg-slate-900/40 border-slate-700/30 shadow-xl shadow-black/10'
        : 'bg-white/60 border-white/40 shadow-xl shadow-black/5',
      // Hover effect
      hover && (
        theme === 'dark'
          ? 'hover:bg-slate-800/50 hover:border-slate-600/50 hover:shadow-2xl hover:scale-[1.01]'
          : 'hover:bg-white/80 hover:border-slate-200/50 hover:shadow-2xl hover:scale-[1.01]'
      ),
      className
    )}>
      {children}
    </div>
  );
}

/**
 * GlassButton - Glass effect button component
 */
interface GlassButtonProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
}

export function GlassButton({ 
  children, 
  onClick, 
  className,
  variant = 'primary',
  disabled = false,
  type = 'button'
}: GlassButtonProps) {
  const { theme } = useTheme();

  const variants = {
    primary: theme === 'dark'
      ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white border-transparent'
      : 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white border-transparent',
    secondary: theme === 'dark'
      ? 'bg-slate-800/60 border-slate-600/50 text-slate-200 hover:bg-slate-700/60 hover:border-slate-500/50'
      : 'bg-white/70 border-slate-200/50 text-slate-700 hover:bg-slate-50 hover:border-slate-300/50',
    ghost: 'border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        'rounded-xl border px-4 py-2.5 font-medium transition-all duration-300 backdrop-blur-sm',
        'flex items-center justify-center gap-2',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        className
      )}
    >
      {children}
    </button>
  );
}

/**
 * GlassInput - Glass effect input component
 */
interface GlassInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  type?: 'text' | 'email' | 'password' | 'search';
}

export function GlassInput({
  value,
  onChange,
  placeholder,
  className,
  type = 'text'
}: GlassInputProps) {
  const { theme } = useTheme();

  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={clsx(
        'w-full rounded-xl border px-4 py-3 text-sm font-medium transition-all duration-300',
        'backdrop-blur-sm',
        theme === 'dark'
          ? 'bg-slate-800/60 border-slate-600/50 text-white placeholder-slate-500 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20'
          : 'bg-white/70 border-slate-200/50 text-slate-700 placeholder-slate-400 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20',
        className
      )}
    />
  );
}