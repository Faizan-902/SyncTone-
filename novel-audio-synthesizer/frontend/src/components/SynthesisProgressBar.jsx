import React from 'react';
import {
  IconMic,
  IconScroll,
  IconSoundwave,
  IconCheck,
  IconX,
} from './icons';

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

  let StatusIcon = IconMic;
  let badgeColor = 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
  let barColor = 'bg-indigo-500';

  if (status === 'parsing') {
    StatusIcon = IconScroll;
    badgeColor = 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    barColor = 'bg-blue-500';
  } else if (status === 'stitching') {
    StatusIcon = IconSoundwave;
    badgeColor = 'bg-purple-500/10 text-purple-400 border-purple-500/20';
    barColor = 'bg-purple-500';
  } else if (isComplete) {
    StatusIcon = IconCheck;
    badgeColor = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    barColor = 'bg-emerald-500';
  } else if (isFailed) {
    StatusIcon = IconX;
    badgeColor = 'bg-rose-500/10 text-rose-400 border-rose-500/20';
    barColor = 'bg-rose-500';
  }

  return (
    <div
      className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-subtle)] p-4 shadow-md space-y-3 animate-fadeIn"
      role="region"
      aria-label="Live Synthesis Progress"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex items-center justify-center text-indigo-400">
            <StatusIcon className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded border ${badgeColor}`}>
                {status}
              </span>
              {isConnected && !isComplete && !isFailed && (
                <span className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live Sync
                </span>
              )}
            </div>
            <p className="text-xs text-[var(--text-main)] mt-1 font-serif">
              {error || message || 'Processing audio chapter with neural TTS...'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-mono font-bold text-indigo-400">
            {Math.round(percentComplete)}%
          </span>
          {(isComplete || isFailed) && onDismiss && (
            <button
              onClick={onDismiss}
              className="text-[var(--text-muted)] hover:text-[var(--text-main)] p-1 rounded-lg hover:bg-[var(--bg-surface)] transition"
              aria-label="Dismiss progress"
            >
              <IconX className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar Container */}
      <div
        className="w-full bg-[var(--bg-surface)] rounded-full h-1.5 overflow-hidden border border-[var(--border-subtle)]"
        role="progressbar"
        aria-valuenow={Math.round(percentComplete)}
        aria-valuemin="0"
        aria-valuemax="100"
      >
        <div
          className={`h-full rounded-full transition-all duration-300 ${barColor}`}
          style={{ width: `${Math.max(3, Math.min(100, percentComplete))}%` }}
        />
      </div>

      {/* Segment Counter */}
      {currentSegment !== null && totalSegments !== null && (
        <div className="flex items-center justify-between text-[10px] font-mono text-[var(--text-muted)]">
          <span>
            Processing segment <strong className="text-[var(--text-main)]">{currentSegment}</strong> of {totalSegments}
          </span>
          <span>{totalSegments - currentSegment} remaining</span>
        </div>
      )}
    </div>
  );
}
