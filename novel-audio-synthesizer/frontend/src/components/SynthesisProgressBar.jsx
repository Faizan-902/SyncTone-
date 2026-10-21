import React from 'react';

export default function SynthesisProgressBar({
  status = 'idle',
  percentComplete = 0,
  currentSegment = null,
  totalSegments = null,
  message = '',
  error = null,
  isConnected = false,
  onDismiss = null,
}) {
  if (status === 'idle') return null;

  const isComplete = status === 'complete';
  const isFailed = status === 'failed';

  let statusIcon = '🎙️';
  let badgeColor = 'bg-brand-500/10 text-brand-400 border-brand-500/30';
  let barColor = 'bg-brand-500';

  if (status === 'parsing') {
    statusIcon = '📝';
    badgeColor = 'bg-blue-500/10 text-blue-400 border-blue-500/30';
    barColor = 'bg-blue-500';
  } else if (status === 'stitching') {
    statusIcon = '🎵';
    badgeColor = 'bg-purple-500/10 text-purple-400 border-purple-500/30';
    barColor = 'bg-purple-500';
  } else if (isComplete) {
    statusIcon = '🎉';
    badgeColor = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    barColor = 'bg-emerald-500';
  } else if (isFailed) {
    statusIcon = '⚠️';
    badgeColor = 'bg-rose-500/10 text-rose-400 border-rose-500/30';
    barColor = 'bg-rose-500';
  }

  return (
    <div
      className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-subtle)] p-5 shadow-xl space-y-3 animate-fadeIn transition-colors duration-300"
      role="region"
      aria-label="Live Synthesis Progress"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{statusIcon}</span>
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${badgeColor}`}>
                {status}
              </span>
              {isConnected && !isComplete && !isFailed && (
                <span className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                  Live WebSocket
                </span>
              )}
            </div>
            <p className="text-xs font-semibold text-[var(--text-main)] mt-1 font-serif">
              {error || message || 'Processing audio chapter with neural TTS...'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-brand-400 font-mono">
            {Math.round(percentComplete)}%
          </span>
          {(isComplete || isFailed) && onDismiss && (
            <button
              onClick={onDismiss}
              className="text-[var(--text-muted)] hover:text-[var(--text-main)] p-1 rounded-lg hover:bg-[var(--bg-surface)] transition"
              aria-label="Dismiss progress"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar Container */}
      <div
        className="w-full bg-[var(--bg-surface)] rounded-full h-2.5 overflow-hidden border border-[var(--border-subtle)]"
        role="progressbar"
        aria-valuenow={Math.round(percentComplete)}
        aria-valuemin="0"
        aria-valuemax="100"
      >
        <div
          className={`h-full rounded-full transition-all duration-300 ${barColor} ${
            !isComplete && !isFailed ? 'animate-pulse' : ''
          }`}
          style={{ width: `${Math.max(3, Math.min(100, percentComplete))}%` }}
        />
      </div>

      {/* Segment Counter */}
      {currentSegment !== null && totalSegments !== null && (
        <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] pt-0.5">
          <span>
            Processing segment <strong className="text-[var(--text-main)]">{currentSegment}</strong> of {totalSegments}
          </span>
          <span>{totalSegments - currentSegment} remaining</span>
        </div>
      )}
    </div>
  );
}
