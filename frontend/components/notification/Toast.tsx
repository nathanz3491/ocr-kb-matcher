'use client';

import { useState, useEffect, createContext, useContext, ReactNode, useCallback } from 'react';
import { 
  X, CheckCircle, AlertCircle, AlertTriangle, Info, 
  Bell, Sparkles, Loader2 
} from 'lucide-react';
import { useTheme } from '@/components/theme/ThemeProvider';
import { clsx } from 'clsx';

// Toast types
export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

// Toast context
interface ToastContextType {
  toasts: Toast[];
  addToast: (message: string, type?: ToastType, duration?: number) => void;
  removeToast: (id: string) => void;
  clearAll: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

// Toast Provider
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const { theme } = useTheme();

  const addToast = useCallback((message: string, type: ToastType = 'info', duration = 4000) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type, duration }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setToasts([]);
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, clearAll }}>
      {children}
      <ToastContainer toasts={toasts} theme={theme} removeToast={removeToast} />
    </ToastContext.Provider>
  );
}

// Toast Container - renders all toasts
function ToastContainer({ 
  toasts, 
  theme, 
  removeToast 
}: { 
  toasts: Toast[]; 
  theme: 'light' | 'dark'; 
  removeToast: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[99999] flex flex-col gap-3 pointer-events-none">
      {toasts.map((toast, index) => (
        <ToastItem 
          key={toast.id} 
          toast={toast} 
          theme={theme} 
          onClose={() => removeToast(toast.id)}
          index={index}
        />
      ))}
    </div>
  );
}

// Individual Toast Item
function ToastItem({ 
  toast, 
  theme, 
  onClose,
  index 
}: { 
  toast: Toast; 
  theme: 'light' | 'dark'; 
  onClose: () => void;
  index: number;
}) {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (toast.duration && toast.duration > 0) {
      const timer = setTimeout(() => {
        setIsExiting(true);
        setTimeout(onClose, 300);
      }, toast.duration);
      return () => clearTimeout(timer);
    }
  }, [toast.duration, onClose]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(onClose, 300);
  };

  const icons = {
    success: CheckCircle,
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info,
    loading: Loader2,
  };

  const Icon = icons[toast.type];

  const styles = {
    success: {
      light: 'from-green-50 to-emerald-50 border-green-200 shadow-green-500/10',
      dark: 'from-green-900/40 to-emerald-900/30 border-green-700/30 shadow-green-900/20',
      icon: 'text-green-600 dark:text-green-400',
      text: 'text-green-800 dark:text-green-200',
    },
    error: {
      light: 'from-red-50 to-rose-50 border-red-200 shadow-red-500/10',
      dark: 'from-red-900/40 to-rose-900/30 border-red-700/30 shadow-red-900/20',
      icon: 'text-red-600 dark:text-red-400',
      text: 'text-red-800 dark:text-red-200',
    },
    warning: {
      light: 'from-amber-50 to-orange-50 border-amber-200 shadow-amber-500/10',
      dark: 'from-amber-900/40 to-orange-900/30 border-amber-700/30 shadow-amber-900/20',
      icon: 'text-amber-600 dark:text-amber-400',
      text: 'text-amber-800 dark:text-amber-200',
    },
    info: {
      light: 'from-blue-50 to-indigo-50 border-blue-200 shadow-blue-500/10',
      dark: 'from-blue-900/40 to-indigo-900/30 border-blue-700/30 shadow-blue-900/20',
      icon: 'text-blue-600 dark:text-blue-400',
      text: 'text-blue-800 dark:text-blue-200',
    },
    loading: {
      light: 'from-slate-50 to-gray-50 border-slate-200 shadow-slate-500/10',
      dark: 'from-slate-800/40 to-slate-700/30 border-slate-700/30 shadow-slate-900/20',
      icon: 'text-slate-600 dark:text-slate-400',
      text: 'text-slate-800 dark:text-slate-200',
    },
  };

  const currentStyle = styles[toast.type];

  return (
    <div 
      className={clsx(
        'pointer-events-auto flex items-center gap-3 rounded-2xl border px-4 py-3.5 shadow-xl backdrop-blur-xl transition-all duration-300',
        'bg-gradient-to-r',
        isExiting 
          ? 'translate-x-full opacity-0 scale-95' 
          : 'translate-x-0 opacity-100 scale-100',
        theme === 'dark' ? currentStyle.dark : currentStyle.light
      )}
      style={{ 
        animationDelay: `${index * 50}ms`
      }}
    >
      {toast.type === 'loading' ? (
        <Loader2 className={clsx('h-5 w-5 animate-spin', currentStyle.icon)} />
      ) : (
        <Icon className={clsx('h-5 w-5 shrink-0', currentStyle.icon)} />
      )}
      <p className={clsx('text-sm font-medium max-w-[280px] truncate', currentStyle.text)}>
        {toast.message}
      </p>
      <button
        onClick={handleClose}
        className={clsx(
          'ml-1 shrink-0 rounded-lg p-1.5 transition-all duration-200 hover:scale-110',
          theme === 'dark' 
            ? 'hover:bg-slate-700 text-slate-400' 
            : 'hover:bg-slate-200 text-slate-500'
        )}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

// Individual notification component for simpler usage
interface NotificationProps {
  message: string;
  type?: ToastType;
  duration?: number;
  onClose?: () => void;
}

export function Notification({ message, type = 'info', duration = 4000, onClose }: NotificationProps) {
  const { theme, toggleTheme } = useTheme();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger entrance animation
    setTimeout(() => setIsVisible(true), 10);
    
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => onClose?.(), 300);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  if (!isVisible && duration > 0) return null;

  const icons = {
    success: CheckCircle,
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info,
    loading: Loader2,
  };

  const Icon = icons[type];

  const styles = {
    success: {
      light: 'from-green-50 to-emerald-50 border-green-200',
      dark: 'from-green-900/40 to-emerald-900/30 border-green-700/30',
      icon: 'text-green-600 dark:text-green-400',
    },
    error: {
      light: 'from-red-50 to-rose-50 border-red-200',
      dark: 'from-red-900/40 to-rose-900/30 border-red-700/30',
      icon: 'text-red-600 dark:text-red-400',
    },
    warning: {
      light: 'from-amber-50 to-orange-50 border-amber-200',
      dark: 'from-amber-900/40 to-orange-900/30 border-amber-700/30',
      icon: 'text-amber-600 dark:text-amber-400',
    },
    info: {
      light: 'from-blue-50 to-indigo-50 border-blue-200',
      dark: 'from-blue-900/40 to-indigo-900/30 border-blue-700/30',
      icon: 'text-blue-600 dark:text-blue-400',
    },
    loading: {
      light: 'from-slate-50 to-gray-50 border-slate-200',
      dark: 'from-slate-800/40 to-slate-700/30 border-slate-700/30',
      icon: 'text-slate-600 dark:text-slate-400',
    },
  };

  const currentStyle = styles[type];

  return (
    <div 
      className={clsx(
        'fixed bottom-6 right-6 z-[9999] flex items-center gap-3 rounded-2xl border px-4 py-3.5 shadow-xl backdrop-blur-xl transition-all duration-300',
        'bg-gradient-to-r',
        isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0',
        theme === 'dark' ? currentStyle.dark : currentStyle.light
      )}
    >
      {type === 'loading' ? (
        <Loader2 className={clsx('h-5 w-5 animate-spin', currentStyle.icon)} />
      ) : (
        <Icon className={clsx('h-5 w-5 shrink-0', currentStyle.icon)} />
      )}
      <p className={clsx(
        'text-sm font-medium max-w-[280px] truncate',
        theme === 'dark' ? 'text-white' : 'text-slate-800'
      )}>
        {message}
      </p>
      <button
        onClick={() => {
          setIsVisible(false);
          setTimeout(() => onClose?.(), 300);
        }}
        className={clsx(
          'ml-1 shrink-0 rounded-lg p-1.5 transition-all duration-200 hover:scale-110',
          theme === 'dark' ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-200 text-slate-500'
        )}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

// Legacy hook compatibility
export function useNotification() {
  const { addToast, removeToast, clearAll } = useToast();
  
  const showNotification = (message: string, type: ToastType = 'info', duration?: number) => {
    addToast(message, type, duration);
  };
  
  return { 
    notification: null, 
    showNotification, 
    hideNotification: clearAll 
  };
}