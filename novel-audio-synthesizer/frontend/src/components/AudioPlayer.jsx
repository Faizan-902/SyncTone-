import React, { useState } from 'react';

function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

const SPEED_OPTIONS = [0.75, 1.0, 1.25, 1.5, 1.75, 2.0];

export default function AudioPlayer({
  audioRef,
  audioUrl,
  isPlaying,
  currentTimeMs,
  totalDurationMs,
  onToggle,
  onSetPlaybackRate,
  onSeek,
  onPlay,
  onPause,
  onEnded,
  onLoadedMetadata,
}) {
  const [speed, setSpeed] = useState(1.0);

  const progress = totalDurationMs > 0 ? (currentTimeMs / totalDurationMs) * 100 : 0;

  const handleSeek = (e) => {
    if (!audioRef.current || totalDurationMs === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const targetMs = Math.round(percent * totalDurationMs);
    if (onSeek) {
      onSeek(targetMs, isPlaying);
    } else {
      audioRef.current.currentTime = targetMs / 1000;
    }
  };

  const handleSpeedChange = () => {
    const currentIdx = SPEED_OPTIONS.indexOf(speed);
    const nextIdx = (currentIdx + 1) % SPEED_OPTIONS.length;
    const newSpeed = SPEED_OPTIONS[nextIdx];
    setSpeed(newSpeed);
    onSetPlaybackRate(newSpeed);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg px-4 py-3">
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        src={audioUrl}
        preload="auto"
        onPlay={onPlay}
        onPause={onPause}
        onEnded={onEnded}
        onLoadedMetadata={onLoadedMetadata}
      />

      <div className="max-w-4xl mx-auto flex items-center gap-4">
        {/* Play/Pause button */}
        <button
          onClick={onToggle}
          className="w-10 h-10 flex items-center justify-center bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition flex-shrink-0"
        >
          {isPlaying ? (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" />
            </svg>
          )}
        </button>

        {/* Time display */}
        <span className="text-xs text-gray-500 w-12 text-right flex-shrink-0">
          {formatTime(currentTimeMs)}
        </span>

        {/* Progress bar */}
        <div
          className="flex-1 h-2 bg-gray-200 rounded-full cursor-pointer group"
          onClick={handleSeek}
        >
          <div
            className="h-full bg-indigo-600 rounded-full relative transition-all duration-100 group-hover:bg-indigo-500"
            style={{ width: `${Math.min(progress, 100)}%` }}
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-indigo-600 rounded-full opacity-0 group-hover:opacity-100 transition" />
          </div>
        </div>

        {/* Duration display */}
        <span className="text-xs text-gray-500 w-12 flex-shrink-0">
          {formatTime(totalDurationMs)}
        </span>

        {/* Speed button */}
        <button
          onClick={handleSpeedChange}
          className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition flex-shrink-0"
        >
          {speed}x
        </button>
      </div>
    </div>
  );
}
