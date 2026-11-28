import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AirKinMark } from './ui/AirKinMark';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

/**
 * Top-level React error boundary providing an accessible recovery card if any widget fails.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error?.message || 'An unexpected rendering error occurred.',
    };
  }

  componentDidCatch(_error: Error, _info: ErrorInfo): void {
    // Handled via accessible fallback UI without exposing raw stack traces
  }

  render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f3f6f4] p-6">
        <div
          role="alert"
          className="max-w-md w-full rounded-2xl border border-rose-200 bg-white p-6 shadow-md space-y-4"
        >
          <div className="flex items-center gap-3">
            <AirKinMark className="h-9 w-9 shrink-0 rounded-xl shadow-xs" />
            <div>
              <h1 className="text-base font-bold text-slate-900">AirKin paused unexpectedly</h1>
              <p className="text-xs text-slate-600">{this.state.message}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              this.setState({ hasError: false, message: '' });
            }}
            className="inline-flex items-center justify-center rounded-xl bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800 transition cursor-pointer"
          >
            Try recovering view
          </button>
        </div>
      </div>
    );
  }
}
