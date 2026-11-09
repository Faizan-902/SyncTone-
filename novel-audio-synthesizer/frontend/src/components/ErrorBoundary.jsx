import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error('[SyncTone ErrorBoundary]', error, info);
  }
  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex flex-col items-center justify-center min-h-[300px] gap-4 p-8 text-center">
          <div className="text-4xl">📖</div>
          <h2 className="text-base font-bold theme-heading">Something went wrong</h2>
          <p className="text-sm theme-muted max-w-xs">
            {this.props.friendlyMessage || "We hit a snag loading this section. Please try again."}
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="px-6 py-2.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--on-accent)] text-xs font-mono uppercase font-bold rounded-full shadow-md hover:scale-[1.03] active:scale-[0.96] transition-all cursor-pointer"
            >
              Try again
            </button>
            <button
              onClick={() => {
                if (typeof window !== 'undefined') window.location.href = '/';
              }}
              className="px-5 py-2.5 border border-[var(--border-strong)] hover:border-[var(--text-main)] text-[var(--text-main)] text-xs font-mono uppercase rounded-full shadow-xs hover:scale-[1.03] active:scale-[0.96] transition-all cursor-pointer"
            >
              Return Home
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
