import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastProps {
  id: string;
  message: string;
  type: ToastType;
  onClose: (id: string) => void;
  duration?: number;
}

export default function Toast({ id, message, type, onClose, duration = 4000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(id);
    }, duration);
    return () => clearTimeout(timer);
  }, [id, duration, onClose]);

  const styles = {
    success: {
      bg: 'bg-emerald-500/10 dark:bg-emerald-950/40 border-emerald-500/30 text-emerald-700 dark:text-emerald-300',
      iconBg: 'bg-emerald-500 text-white',
      icon: CheckCircle2,
    },
    error: {
      bg: 'bg-red-500/10 dark:bg-red-950/40 border-red-500/30 text-red-700 dark:text-red-300',
      iconBg: 'bg-red-500 text-white',
      icon: AlertCircle,
    },
    info: {
      bg: 'bg-blue-500/10 dark:bg-blue-950/40 border-blue-500/30 text-blue-700 dark:text-blue-300',
      iconBg: 'bg-blue-500 text-white',
      icon: Info,
    },
    warning: {
      bg: 'bg-amber-500/10 dark:bg-amber-950/40 border-amber-500/30 text-amber-700 dark:text-amber-300',
      iconBg: 'bg-amber-500 text-white',
      icon: AlertTriangle,
    },
  };

  const currentStyle = styles[type];
  const Icon = currentStyle.icon;

  return (
    <div
      className={`flex items-center justify-between p-3.5 rounded-2xl border backdrop-blur-md shadow-xl transition-all duration-300 transform animate-bounce-short ${currentStyle.bg}`}
    >
      <div className="flex items-center space-x-3 pr-2">
        <div className={`p-1.5 rounded-xl ${currentStyle.iconBg} flex-shrink-0 shadow-sm`}>
          <Icon className="w-4 h-4" />
        </div>
        <p className="text-xs sm:text-sm font-medium leading-tight">{message}</p>
      </div>
      <button
        onClick={() => onClose(id)}
        className="p-1 rounded-lg opacity-60 hover:opacity-100 transition-opacity flex-shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
