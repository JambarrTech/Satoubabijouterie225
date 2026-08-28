import React, { useState, useCallback, useEffect, ReactNode } from 'react';

interface ErrorFallbackProps {
  error: Error;
  onRetry: () => void;
}

function ErrorFallback({ error, onRetry }: ErrorFallbackProps) {
  return (
    <div className="min-h-[400px] flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-4">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h2 className="font-serif text-xl font-bold text-gray-900 mb-2">Une erreur est survenue</h2>
        <p className="text-sm text-gray-600 mb-4">
          Nous nous excusons pour ce désagrément. Veuillez réessayer ou contacter notre support.
        </p>
        <details className="text-xs text-gray-400 mb-4">
          <summary>Détails de l'erreur</summary>
          <p className="mt-1 font-mono">{error.message}</p>
        </details>
        <button
          onClick={onRetry}
          className="px-6 py-2 bg-[#0B5D1E] text-white rounded-xl font-semibold text-sm hover:bg-[#064A15] transition-colors"
        >
          Réessayer
        </button>
      </div>
    </div>
  );
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function ErrorBoundary({ children, fallback }: ErrorBoundaryProps) {
  const [error, setError] = useState<Error | null>(null);

  const handleRetry = useCallback(() => {
    setError(null);
    window.location.reload();
  }, []);

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      event.preventDefault();
      setError(event.error || new Error('Erreur inconnue'));
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      event.preventDefault();
      setError(new Error(String(event.reason)));
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  if (error) {
    return fallback || <ErrorFallback error={error} onRetry={handleRetry} />;
  }

  return <>{children}</>;
}
