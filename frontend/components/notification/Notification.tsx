'use client';

import { useState, useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';

interface NotificationProps {
  message: string;
  type?: 'info' | 'warning' | 'error' | 'success';
  duration?: number;
  onClose?: () => void;
}

export function Notification({ message, type = 'info', duration = 5000, onClose }: NotificationProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        onClose?.();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  if (!isVisible) return null;

  const typeStyles = {
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    success: 'bg-green-50 border-green-200 text-green-800',
  };

  return (
    <div className={`fixed bottom-6 right-6 z-[9999] flex items-center gap-3 rounded-lg border px-4 py-3 shadow-lg transition-all duration-300 ${typeStyles[type]} animate-slide-up`}>
      <AlertCircle className="h-5 w-5 flex-shrink-0" />
      <p className="text-sm font-medium">{message}</p>
      <button
        onClick={() => {
          setIsVisible(false);
          onClose?.();
        }}
        className="ml-2 rounded p-1 hover:bg-black/10"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

// Hook to manage notifications
export function useNotification() {
  const [notification, setNotification] = useState<{
    message: string;
    type: 'info' | 'warning' | 'error' | 'success';
  } | null>(null);

  const showNotification = (message: string, type: 'info' | 'warning' | 'error' | 'success' = 'info') => {
    setNotification({ message, type });
  };

  const hideNotification = () => {
    setNotification(null);
  };

  return { notification, showNotification, hideNotification };
}