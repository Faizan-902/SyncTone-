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
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-bold rounded-xl transition"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
