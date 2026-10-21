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
    audioRef.current.currentTime = (percent * totalDurationMs) / 1000;
  };

  const handleSpeedChange = () => {
    const currentIdx = SPEED_OPTIONS.indexOf(speed);
    const nextIdx = (currentIdx + 1) % SPEED_OPTIONS.length;
    const newSpeed = SPEED_OPTIONS[nextIdx];
    setSpeed(newSpeed);
    onSetPlaybackRate(newSpeed);
  };

  const handleSkip = (seconds) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.max(
      0,
      Math.min(totalDurationMs / 1000, audioRef.current.currentTime + seconds)
    );
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 px-3 sm:px-6 pb-3 pt-1 pointer-events-none">
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

      {/* Floating Glass Dock (Spotify / Linear / Apple Music Style) */}
      <div className="max-w-4xl mx-auto glass-dock p-3 sm:p-4 rounded-3xl shadow-2xl pointer-events-auto flex flex-col gap-2 transition-all duration-300">
        {/* Scrubber Progress Bar */}
        <div
          className="w-full h-2 bg-[var(--bg-surface)] hover:h-2.5 rounded-full cursor-pointer relative group transition-all"
          onClick={handleSeek}
          role="slider"
          aria-label="Audio scrubber"
          aria-valuemin="0"
          aria-valuemax="100"
          aria-valuenow={Math.round(progress)}
        >
          <div
            className="h-full bg-gradient-to-r from-brand-600 to-indigo-500 rounded-full relative transition-all duration-75"
            style={{ width: `${Math.min(progress, 100)}%` }}
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity scale-125" />
          </div>
        </div>

        {/* Controls and Metadata Row */}
        <div className="flex items-center justify-between gap-3 sm:gap-6 pt-1">
          {/* Left: Time Elapsed & Skip Back */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => handleSkip(-10)}
              className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-surface)] rounded-xl transition text-xs"
              title="Rewind 10 seconds"
              aria-label="Rewind 10 seconds"
            >
              ↺ 10s
            </button>
            <span className="text-xs font-mono font-bold text-[var(--text-muted)] w-12 text-right">
              {formatTime(currentTimeMs)}
            </span>
          </div>

          {/* Center: Play/Pause Big Action Button */}
          <div className="flex items-center gap-3">
            <button
              onClick={onToggle}
              className="w-11 h-11 sm:w-12 sm:h-12 flex items-center justify-center bg-gradient-to-tr from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white rounded-2xl shadow-lg shadow-brand-500/30 hover:scale-105 active:scale-95 transition-all duration-200"
              aria-label={isPlaying ? 'Pause audio' : 'Play audio'}
            >
              {isPlaying ? (
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 fill-current ml-0.5" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>
          </div>

          {/* Right: Total Duration, Skip Forward, and Speed Pill */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs font-mono font-bold text-[var(--text-muted)] w-12">
              {formatTime(totalDurationMs)}
            </span>
            <button
              onClick={() => handleSkip(10)}
              className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-surface)] rounded-xl transition text-xs"
              title="Fast forward 10 seconds"
              aria-label="Fast forward 10 seconds"
            >
              10s ↻
            </button>
            <button
              onClick={handleSpeedChange}
              className="px-2.5 py-1 text-xs font-bold bg-[var(--bg-surface)] text-[var(--text-main)] border border-[var(--border-subtle)] hover:border-brand-500 rounded-xl transition"
              title="Playback Speed"
              aria-label="Playback Speed"
            >
              {speed}x
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
