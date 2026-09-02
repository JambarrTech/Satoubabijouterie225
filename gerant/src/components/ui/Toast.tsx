import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle, AlertCircle, X, Info  } from '../../ui/Icons';;

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  }, []);

  const dismiss = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map(t => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className="pointer-events-auto"
            >
              <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl backdrop-blur-md border text-sm font-medium max-w-sm ${
                t.type === 'success' ? 'bg-emerald-50/90 text-emerald-800 border-emerald-200' :
                t.type === 'error' ? 'bg-red-50/90 text-red-800 border-red-200' :
                'bg-white/90 text-gray-800 border-gray-200'
              }`}>
                {t.type === 'success' && <CheckCircle size={18} className="text-emerald-500 shrink-0" />}
                {t.type === 'error' && <AlertCircle size={18} className="text-red-500 shrink-0" />}
                {t.type === 'info' && <Info size={18} className="text-blue-500 shrink-0" />}
                <span className="flex-1">{t.message}</span>
                <button onClick={() => dismiss(t.id)} className="shrink-0 p-0.5 rounded-full hover:bg-black/5 transition-colors">
                  <X size={14} />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

