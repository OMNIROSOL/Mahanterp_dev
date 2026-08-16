import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-3xl shadow-2xl border border-red-100 max-w-lg w-full text-center">
            <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            </div>
            <h1 className="text-2xl font-black text-slate-900 mb-2 uppercase tracking-tight">System Exception Detected</h1>
            <p className="text-slate-500 text-sm mb-6 font-medium">The application encountered an unexpected error. This has been logged for review.</p>
            
            <div className="bg-slate-50 p-4 rounded-xl text-left mb-8 overflow-auto max-h-32 border border-slate-100">
              <code className="text-xs text-red-600 font-bold">{this.state.error?.message}</code>
            </div>

            <button
              onClick={() => window.location.reload()}
              className="w-full bg-slate-900 text-white px-6 py-3 rounded-xl font-black text-sm uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl"
            >
              Restart Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
