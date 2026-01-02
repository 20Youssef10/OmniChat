
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { logger } from '../../utils/logger';
import { trackError } from '../../services/analyticsService';

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error("Uncaught error in component tree", { error, errorInfo });
    // Ensure componentStack matches expected string | undefined type
    trackError(error, errorInfo.componentStack || undefined);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full w-full p-6 text-center bg-background text-slate-300 min-h-[400px]">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4 animate-pulse">
            <AlertTriangle size={32} className="text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Something went wrong</h2>
          <p className="text-sm text-slate-400 max-w-md mb-6">
            We encountered an unexpected error. Please try reloading the page to recover the application.
          </p>
          <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-800 font-mono text-xs text-red-400 mb-6 max-w-lg overflow-auto text-left w-full">
            {this.state.error?.message || "Unknown Error"}
          </div>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors"
          >
            <RefreshCw size={16} />
            Reload Application
          </button>
        </div>
      );
    }

    return (this as any).props.children;
  }
}
