import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { cn } from '../lib/utils';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'success', duration = 3500) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type, duration }]);

    setTimeout(() => {
      removeToast(id);
    }, duration);
  }, [removeToast]);

  const getToastIcon = (type: ToastType) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-rose-500 shrink-0" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />;
      case 'info':
        return <Info className="w-5 h-5 text-indigo-500 shrink-0" />;
    }
  };

  const getToastStyles = (type: ToastType) => {
    switch (type) {
      case 'success':
        return 'border-emerald-100 bg-white/95 shadow-emerald-500/5';
      case 'error':
        return 'border-rose-100 bg-white/95 shadow-rose-500/5';
      case 'warning':
        return 'border-amber-100 bg-white/95 shadow-amber-500/5';
      case 'info':
        return 'border-indigo-100 bg-white/95 shadow-indigo-500/5';
    }
  };

  return (
    <ToastContext.Provider value={{ showToast, removeToast }}>
      {children}
      
      {/* Toast Portal Container */}
      <div 
        id="toast-container" 
        className="fixed bottom-6 right-6 z-[999] flex flex-col gap-3 max-w-sm w-full pointer-events-none"
      >
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.9, transition: { duration: 0.15 } }}
              transition={{ type: 'spring', stiffness: 450, damping: 28 }}
              className={cn(
                "pointer-events-auto flex items-start gap-3.5 p-4 rounded-2xl border bg-white shadow-2xl relative overflow-hidden font-sans border-slate-100/90",
                getToastStyles(toast.type)
              )}
            >
              {/* Decorative side accent tag */}
              <div 
                className={cn(
                  "absolute left-0 top-0 bottom-0 w-1",
                  toast.type === 'success' && 'bg-emerald-500',
                  toast.type === 'error' && 'bg-rose-500',
                  toast.type === 'warning' && 'bg-amber-500',
                  toast.type === 'info' && 'bg-indigo-500'
                )}
              />

              <div className="flex items-center gap-3">
                {getToastIcon(toast.type)}
                <div className="flex-1">
                  <p className="text-xs font-semibold text-slate-800 leading-relaxed pr-6">
                    {toast.message}
                  </p>
                </div>
              </div>

              <button
                onClick={() => removeToast(toast.id)}
                className="absolute right-3 top-3.5 p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all cursor-pointer"
                title="Dismiss"
              >
                <X size={13} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};
