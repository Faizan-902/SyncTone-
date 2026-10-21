import React, { useState } from 'react';
import {
  IconPlay,
  IconPause,
  IconRotateCcw,
  IconRotateCw,
  IconVolume,
  IconVolumeMute,
} from './icons';

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
  const [isMuted, setIsMuted] = useState(false);

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

  const toggleMute = () => {
    if (!audioRef.current) return;
    const nextMuted = !isMuted;
    audioRef.current.muted = nextMuted;
    setIsMuted(nextMuted);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 px-3 sm:px-6 pb-4 pt-2 pointer-events-none">
      {/* Hidden native audio element */}
      <audio
        ref={audioRef}
        src={audioUrl}
        preload="auto"
        onPlay={onPlay}
        onPause={onPause}
        onEnded={onEnded}
        onLoadedMetadata={onLoadedMetadata}
      />

      {/* Floating Glass Dock */}
      <div className="max-w-3xl mx-auto glass-dock p-3 sm:p-4 rounded-2xl shadow-2xl pointer-events-auto flex flex-col gap-2.5 transition-all">
        {/* Scrubber Progress Bar */}
        <div
          className="w-full h-1.5 hover:h-2 bg-[var(--bg-surface)] rounded-full cursor-pointer relative group transition-all"
          onClick={handleSeek}
          role="slider"
          aria-label="Audio scrubber"
          aria-valuemin="0"
          aria-valuemax="100"
          aria-valuenow={Math.round(progress)}
        >
          <div
            className="h-full bg-indigo-500 rounded-full relative transition-all duration-75"
            style={{ width: `${Math.min(progress, 100)}%` }}
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>

        {/* Controls and Timing Bar */}
        <div className="flex items-center justify-between gap-3 sm:gap-6">
          {/* Left: Time Elapsed & Animated Visualizer */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {isPlaying ? (
              <div className="flex items-end gap-0.5 h-4 w-4">
                <span className="w-1 bg-indigo-400 rounded-full eq-bar-1" />
                <span className="w-1 bg-indigo-400 rounded-full eq-bar-2" />
                <span className="w-1 bg-indigo-400 rounded-full eq-bar-3" />
              </div>
            ) : (
              <div className="flex items-end gap-0.5 h-4 w-4 opacity-40">
                <span className="w-1 h-1 bg-[var(--text-muted)] rounded-full" />
                <span className="w-1 h-2 bg-[var(--text-muted)] rounded-full" />
                <span className="w-1 h-1 bg-[var(--text-muted)] rounded-full" />
              </div>
            )}
            <span className="text-xs font-mono font-medium text-[var(--text-muted)] w-12 text-left">
              {formatTime(currentTimeMs)}
            </span>
          </div>

          {/* Center: Playback Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => handleSkip(-10)}
              className="p-2 text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-surface)] rounded-xl transition"
              title="Rewind 10 seconds"
              aria-label="Rewind 10 seconds"
            >
              <IconRotateCcw className="w-4 h-4" />
            </button>

            <button
              onClick={onToggle}
              className="w-10 h-10 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center shadow-md hover:scale-105 active:scale-95 transition-all"
              title={isPlaying ? 'Pause audio' : 'Play audio'}
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <IconPause className="w-4 h-4 fill-white" />
              ) : (
                <IconPlay className="w-4 h-4 fill-white translate-x-0.5" />
              )}
            </button>

            <button
              onClick={() => handleSkip(10)}
              className="p-2 text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-surface)] rounded-xl transition"
              title="Fast forward 10 seconds"
              aria-label="Forward 10 seconds"
            >
              <IconRotateCw className="w-4 h-4" />
            </button>
          </div>

          {/* Right: Duration, Speed, Mute */}
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <span className="text-xs font-mono font-medium text-[var(--text-muted)] hidden sm:inline">
              {formatTime(totalDurationMs)}
            </span>

            <button
              onClick={handleSpeedChange}
              className="px-2 py-1 bg-[var(--bg-surface)] hover:border-indigo-500/50 border border-[var(--border-subtle)] rounded-lg text-xs font-mono font-semibold text-[var(--text-muted)] hover:text-[var(--text-main)] transition"
              title="Change Speed"
              aria-label="Change Speed"
            >
              {speed}x
            </button>

            <button
              onClick={toggleMute}
              className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-surface)] rounded-lg transition"
              title={isMuted ? 'Unmute' : 'Mute'}
              aria-label={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? (
                <IconVolumeMute className="w-4 h-4 text-rose-400" />
              ) : (
                <IconVolume className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
