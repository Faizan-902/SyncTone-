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
  let badgeColor = 'bg-indigo-50 text-indigo-700 border-indigo-200';
  let barColor = 'bg-indigo-600';

  if (status === 'parsing') {
    statusIcon = '📝';
    badgeColor = 'bg-blue-50 text-blue-700 border-blue-200';
    barColor = 'bg-blue-600';
  } else if (status === 'stitching') {
    statusIcon = '🎵';
    badgeColor = 'bg-purple-50 text-purple-700 border-purple-200';
    barColor = 'bg-purple-600';
  } else if (isComplete) {
    statusIcon = '🎉';
    badgeColor = 'bg-emerald-50 text-emerald-800 border-emerald-200';
    barColor = 'bg-emerald-500';
  } else if (isFailed) {
    statusIcon = '⚠️';
    badgeColor = 'bg-red-50 text-red-700 border-red-200';
    barColor = 'bg-red-500';
  }

  return (
    <div
      className="bg-white rounded-2xl border border-gray-200 p-4 shadow-md space-y-3 animate-fadeIn"
      role="region"
      aria-label="Live Synthesis Progress"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="text-xl">{statusIcon}</span>
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${badgeColor}`}>
                {status}
              </span>
              {isConnected && !isComplete && !isFailed && (
                <span className="flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                  Live WebSocket
                </span>
              )}
            </div>
            <p className="text-xs font-semibold text-gray-800 mt-1">
              {error || message || 'Processing audio chapter...'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-gray-700 font-mono">
            {Math.round(percentComplete)}%
          </span>
          {(isComplete || isFailed) && onDismiss && (
            <button
              onClick={onDismiss}
              className="text-gray-400 hover:text-gray-600 text-xs p-1 rounded"
              aria-label="Dismiss progress"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar Container */}
      <div
        className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden"
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
        <div className="flex items-center justify-between text-[11px] text-gray-400 pt-0.5">
          <span>
            Processing segment <strong className="text-gray-600">{currentSegment}</strong> of {totalSegments}
          </span>
          <span>{totalSegments - currentSegment} remaining</span>
        </div>
      )}
    </div>
  );
}
