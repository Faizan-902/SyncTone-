import React, { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'error') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast container - aria-live polite */}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="fixed bottom-24 right-4 z-[9999] flex flex-col gap-2 pointer-events-none"
      >
        {toasts.map(toast => (
          <div
            key={toast.id}
            className="pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl border text-sm font-medium max-w-xs theme-surface border-[var(--border-subtle)]"
            style={{ animation: 'fadeInUp 0.2s ease' }}
          >
            {toast.type === 'error' && (
              <span className="text-[var(--danger)] flex-shrink-0">⚠</span>
            )}
            <span className="theme-heading">{toast.message}</span>
            <button
              onClick={() => dismissToast(toast.id)}
              className="ml-auto theme-muted hover:text-[var(--text-main)] transition flex-shrink-0"
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) return { showToast: () => {} }; // safe fallback
  return ctx;
}
