import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertOctagon, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in UI:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-space-850 border border-threat-crimson/40 rounded-2xl p-6 text-center shadow-2xl">
            <div className="w-12 h-12 rounded-xl bg-threat-crimson/15 text-threat-crimson flex items-center justify-center mx-auto mb-4 border border-threat-crimson/30">
              <AlertOctagon className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-heading font-bold text-white mb-2">
              Orbital Telemetry Interface Error
            </h2>
            <p className="text-xs font-mono text-slate-400 mb-4 break-words">
              {this.state.error?.message || 'An unexpected error occurred while rendering the space situational radar.'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-orbital-cyan text-space-950 font-bold text-xs rounded-lg hover:brightness-110 transition shadow-orbital-glow"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reload Radar Telemetry</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
