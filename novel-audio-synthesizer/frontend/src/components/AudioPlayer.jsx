import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  IconPlay,
  IconPause,
  IconPrev,
  IconNext,
  IconSkipBack,
  IconSkipForward,
  IconVolume,
  IconVolumeMute,
  IconSoundwave,
} from './icons';

function formatTime(ms) {
  if (!ms || isNaN(ms) || ms < 0) return '0:00';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function formatHoverTime(ms) {
  if (!ms || isNaN(ms) || ms < 0) return '00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

const SPEED_OPTIONS = [0.75, 1.0, 1.25, 1.5, 2.0];

export default function AudioPlayer({
  audioRef,
  audioUrl,
  isPlaying,
  currentTimeMs = 0,
  totalDurationMs = 0,
  onToggle,
  onSetPlaybackRate,
  onSeek,
  onPlay,
  onPause,
  onEnded,
  onLoadedMetadata,
  onError,
  currentNovel,
  currentChapter,
  onSeekSegment,
  playbackMode = 'studio',
  onTogglePlaybackMode,
  ttsEngine = 'msedge-tts',
  onChangeTtsEngine,
}) {
  const [speed, setSpeed] = useState(1.0);
  const [volume, setVolume] = useState(1.0);
  const [isMuted, setIsMuted] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [hoverTimeMs, setHoverTimeMs] = useState(null);
  const [hoverFraction, setHoverFraction] = useState(0);
  const scrubberTrackRef = useRef(null);

  const progressFraction = totalDurationMs > 0 ? Math.min(1, Math.max(0, currentTimeMs / totalDurationMs)) : 0;

  // Direct scale update to avoid react re-render latency
  const scrubScaleStyle = {
    transform: `scaleX(${progressFraction})`,
    transformOrigin: 'left',
  };

  const handleSeekFromClientX = useCallback(
    (clientX) => {
      if (!audioRef?.current || totalDurationMs <= 0 || !scrubberTrackRef.current) return;
      const rect = scrubberTrackRef.current.getBoundingClientRect();
      const fraction = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      const targetMs = Math.round(fraction * totalDurationMs);
      if (onSeek) {
        onSeek(targetMs, isPlaying);
      } else {
        audioRef.current.currentTime = targetMs / 1000;
      }
    },
    [audioRef, totalDurationMs, onSeek, isPlaying]
  );

  const handleScrubberClick = (e) => {
    handleSeekFromClientX(e.clientX);
  };

  const handleScrubberMouseMove = (e) => {
    if (!scrubberTrackRef.current || totalDurationMs <= 0) return;
    const rect = scrubberTrackRef.current.getBoundingClientRect();
    const fraction = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    setHoverFraction(fraction);
    setHoverTimeMs(Math.round(fraction * totalDurationMs));
  };

  const handleScrubberMouseLeave = () => {
    setHoverTimeMs(null);
  };

  const handleKeyDown = (e) => {
    if (!audioRef?.current) return;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 5);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      audioRef.current.currentTime = Math.min(totalDurationMs / 1000, audioRef.current.currentTime + 5);
    } else if (e.key === ' ') {
      e.preventDefault();
      onToggle();
    }
  };

  const handleSkip = useCallback(
    (seconds) => {
      if (playbackMode === 'tts') {
        if (onSeek) {
          const maxMs = totalDurationMs > 0 ? totalDurationMs : Infinity;
          const targetMs = Math.max(0, Math.min(maxMs, currentTimeMs + seconds * 1000));
          onSeek(targetMs, isPlaying);
        } else if (onSeekSegment) {
          onSeekSegment(seconds < 0 ? -1 : 1);
        }
        return;
      }
      if (!audioRef?.current) {
        if (onSeek) {
          const maxMs = totalDurationMs > 0 ? totalDurationMs : Infinity;
          const targetMs = Math.max(0, Math.min(maxMs, currentTimeMs + seconds * 1000));
          onSeek(targetMs, isPlaying);
        } else if (onSeekSegment) {
          onSeekSegment(seconds < 0 ? -1 : 1);
        }
        return;
      }
      if (totalDurationMs <= 0 && onSeekSegment) {
        onSeekSegment(seconds < 0 ? -1 : 1);
        return;
      }
      audioRef.current.currentTime = Math.max(
        0,
        Math.min(totalDurationMs / 1000, audioRef.current.currentTime + seconds)
      );
    },
    [audioRef, totalDurationMs, playbackMode, onSeekSegment, onSeek, currentTimeMs, isPlaying]
  );

  const handleSpeedChange = () => {
    const currentIdx = SPEED_OPTIONS.indexOf(speed);
    const nextIdx = (currentIdx + 1) % SPEED_OPTIONS.length;
    const newSpeed = SPEED_OPTIONS[nextIdx];
    setSpeed(newSpeed);
    if (onSetPlaybackRate) onSetPlaybackRate(newSpeed);
    if (audioRef?.current) audioRef.current.playbackRate = newSpeed;
  };

  const handleVolumeToggle = useCallback(() => {
    if (!audioRef?.current) return;
    if (isMuted) {
      audioRef.current.muted = false;
      setIsMuted(false);
      audioRef.current.volume = volume || 1.0;
    } else {
      audioRef.current.muted = true;
      setIsMuted(true);
    }
  }, [audioRef, isMuted, volume]);

  const handleVolumeChange = (e) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (audioRef?.current) {
      audioRef.current.volume = val;
      if (val === 0) {
        audioRef.current.muted = true;
        setIsMuted(true);
      } else {
        audioRef.current.muted = false;
        setIsMuted(false);
      }
    }
  };

  // Global Keyboard Shortcuts (Space, J, L, M) with strict focus/input guards
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      // 1. Ignore events in editable elements
      const target = e.target;
      const tagName = target?.tagName?.toLowerCase();
      if (
        tagName === 'input' ||
        tagName === 'textarea' ||
        tagName === 'select' ||
        target?.isContentEditable
      ) {
        return;
      }

      // 2. Avoid double-triggering Space on focused buttons or links
      if (e.code === 'Space' || e.key === ' ') {
        if (tagName === 'button' || tagName === 'a') {
          return;
        }
        e.preventDefault();
        onToggle?.();
        return;
      }

      // 3. J: skip back 10s
      if (e.key === 'j' || e.key === 'J') {
        e.preventDefault();
        handleSkip(-10);
        return;
      }

      // 4. L: skip forward 10s
      if (e.key === 'l' || e.key === 'L') {
        e.preventDefault();
        handleSkip(10);
        return;
      }

      // 5. M: mute toggle
      if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        handleVolumeToggle();
        return;
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [onToggle, handleSkip, handleVolumeToggle]);

  // Media Session API integration (hardware media keys & lockscreen controls)
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;

    if (currentNovel && currentChapter) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentChapter.title || 'Chapter Audio Track',
        artist: currentNovel.title || 'SyncTone',
        album: currentNovel.author_username ? `By ${currentNovel.author_username}` : 'SyncTone Audio',
      });
    }

    try {
      navigator.mediaSession.setActionHandler('play', () => {
        if (!isPlaying) onToggle?.();
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        if (isPlaying) onToggle?.();
      });
      navigator.mediaSession.setActionHandler('seekbackward', (details) => {
        handleSkip(-(details?.seekOffset || 10));
      });
      navigator.mediaSession.setActionHandler('seekforward', (details) => {
        handleSkip(details?.seekOffset || 10);
      });
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (audioRef?.current && details?.seekTime !== undefined) {
          audioRef.current.currentTime = details.seekTime;
        }
      });
    } catch (_) {}

    return () => {
      try {
        navigator.mediaSession.setActionHandler('play', null);
        navigator.mediaSession.setActionHandler('pause', null);
        navigator.mediaSession.setActionHandler('seekbackward', null);
        navigator.mediaSession.setActionHandler('seekforward', null);
        navigator.mediaSession.setActionHandler('seekto', null);
      } catch (_) {}
    };
  }, [isPlaying, onToggle, currentNovel, currentChapter, audioRef, handleSkip]);

  return (
    <footer
      className="fixed bottom-0 left-0 md:left-[72px] right-0 z-40 glass-dock border-t px-4 py-2.5 sm:py-3 shadow-2xl transition-colors duration-200"
      aria-label="Floating Audio Dock"
    >
      {/* Hidden audio element for audio sync engine */}
      <audio
        ref={audioRef}
        src={audioUrl}
        preload="auto"
        onPlay={onPlay}
        onPause={onPause}
        onEnded={onEnded}
        onLoadedMetadata={onLoadedMetadata}
        onError={onError}
      />

      <div className="max-w-5xl mx-auto flex flex-col gap-1.5">
        {/* Scrubber Track with 44px Touch Target & Accessible Slider */}
        <div className="w-full flex items-center gap-3">
          <span className="text-[11px] font-mono theme-muted w-10 text-right select-none font-bold">
            {formatTime(currentTimeMs)}
          </span>

          <div
            ref={scrubberTrackRef}
            onClick={handleScrubberClick}
            onMouseMove={handleScrubberMouseMove}
            onMouseLeave={handleScrubberMouseLeave}
            onKeyDown={handleKeyDown}
            tabIndex={0}
            role="slider"
            aria-label="Audio scrubber"
            aria-valuemin={0}
            aria-valuemax={Math.floor(totalDurationMs / 1000)}
            aria-valuenow={Math.floor(currentTimeMs / 1000)}
            className="flex-1 py-3 cursor-pointer relative flex items-center group focus:outline-none"
          >
            {/* Scrubber timecode hover preview badge */}
            {hoverTimeMs !== null && (
              <div
                className="absolute -top-7 pointer-events-none transform -translate-x-1/2 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-[var(--bg-surface)] text-[var(--text-main)] border theme-border shadow-md z-30 transition-transform duration-75"
                style={{
                  left: `${hoverFraction * 100}%`,
                }}
              >
                {formatHoverTime(hoverTimeMs)}
              </div>
            )}

            {/* Background Track */}
            <div className="w-full h-1.5 bg-[var(--bg-surface)] border theme-border rounded-full relative overflow-hidden group-hover:h-2.5 transition-all">
              {/* Progress Bar updated with transform: scaleX (Zero Layout Shift) */}
              <div
                className="h-full w-full bg-gradient-to-r from-[var(--brand-walnut,#5A3E2B)] to-[var(--brand-amber,#D5851F)] rounded-full will-change-transform"
                style={scrubScaleStyle}
              />
            </div>
            {/* Scrubber Thumb Indicator on hover */}
            <div
              className="absolute w-3.5 h-3.5 rounded-full bg-[var(--brand-amber,#D5851F)] ring-2 ring-[var(--brand-walnut,#5A3E2B)] shadow-[0_0_10px_rgba(213,133,31,0.6)] pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-120 transform -translate-x-1/2 group-hover:scale-125 border border-white/50"
              style={{
                left: `${progressFraction * 100}%`,
              }}
            />
          </div>

          <span className="text-[11px] font-mono theme-muted w-10 select-none font-bold">
            {formatTime(totalDurationMs)}
          </span>
        </div>

        {/* Player Controls & Track Metadata Row */}
        <div className="flex items-center justify-between gap-2 sm:gap-3 flex-nowrap min-w-0">
          {/* Left: Track Information */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 max-w-[130px] sm:max-w-[200px] md:max-w-xs flex-shrink">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl theme-card border flex items-center justify-center text-[var(--accent-text)] shadow-xs flex-shrink-0">
              <div
                className={`flex items-end gap-0.5 h-4 w-4 justify-center ${isPlaying ? '' : 'paused eq-paused'}`}
                aria-label={isPlaying ? 'Audio playing visualizer' : 'Audio paused visualizer'}
              >
                <span className="w-1 bg-[var(--accent)] rounded-full eq-bar-1" />
                <span className="w-1 bg-[var(--accent)] rounded-full eq-bar-2" />
                <span className="w-1 bg-[var(--accent)] rounded-full eq-bar-3" />
              </div>
            </div>

            <div className="min-w-0">
              <h4 className="text-xs font-bold theme-heading truncate leading-tight">
                {currentChapter?.title || 'Chapter Audio Track'}
              </h4>
              <p className="text-[10px] theme-muted font-mono truncate mt-0.5 hidden sm:block">
                {currentNovel?.title || 'SyncTone Audio'}
              </p>
            </div>
          </div>

          {/* Center: Playback Transport Buttons (44px Accessible Hit Targets) */}
          <div className="flex items-center gap-0.5 sm:gap-1.5 flex-shrink-0">
            {/* Skip -10s */}
            <button
              onClick={() => handleSkip(-10)}
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl theme-muted hover:text-[var(--text-main)] hover:bg-[var(--bg-hover)] active:scale-90 transition-transform duration-100 ease-out flex items-center justify-center cursor-pointer"
              title="Skip back 10 seconds (J)"
              aria-label="Skip back 10 seconds"
            >
              <IconSkipBack className="w-4 h-4" />
            </button>

            {/* Previous Turn */}
            <button
              onClick={() => onSeekSegment && onSeekSegment(-1)}
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl theme-muted hover:text-[var(--text-main)] hover:bg-[var(--bg-hover)] active:scale-90 transition-transform duration-100 ease-out flex items-center justify-center cursor-pointer"
              title="Previous dialogue turn"
              aria-label="Previous turn"
            >
              <IconPrev className="w-4 h-4" />
            </button>

            {/* Play / Pause Toggle Button */}
            <button
              onClick={onToggle}
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[var(--cta-primary-bg)] hover:bg-[var(--cta-primary-hover)] text-[var(--cta-primary-text)] border border-[var(--brand-amber,#D5851F)]/40 font-bold flex items-center justify-center shadow-lg transition-transform duration-100 ease-out hover:scale-105 active:scale-90 focus:outline-none cursor-pointer"
              aria-label={isPlaying ? 'Pause audio' : 'Play audio'}
            >
              <span className="transition-all duration-120 transform scale-100 opacity-100 flex items-center justify-center">
                {isPlaying ? (
                  <IconPause className="w-5 h-5 fill-current" />
                ) : (
                  <IconPlay className="w-5 h-5 fill-current ml-0.5" />
                )}
              </span>
            </button>

            {/* Next Turn */}
            <button
              onClick={() => onSeekSegment && onSeekSegment(1)}
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl theme-muted hover:text-[var(--text-main)] hover:bg-[var(--bg-hover)] active:scale-90 transition-transform duration-100 ease-out flex items-center justify-center cursor-pointer"
              title="Next dialogue turn"
              aria-label="Next turn"
            >
              <IconNext className="w-4 h-4" />
            </button>

            {/* Skip +10s */}
            <button
              onClick={() => handleSkip(10)}
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl theme-muted hover:text-[var(--text-main)] hover:bg-[var(--bg-hover)] active:scale-90 transition-transform duration-100 ease-out flex items-center justify-center cursor-pointer"
              title="Skip forward 10 seconds (L)"
              aria-label="Skip forward 10 seconds"
            >
              <IconSkipForward className="w-4 h-4" />
            </button>
          </div>

          {/* Right: Audio Speed, Playback Engine Mode & Volume Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            {/* Multi-Engine Selector Pill / Dropdown */}
            {onChangeTtsEngine && (
              <div className="relative flex items-center">
                <select
                  value={ttsEngine}
                  onChange={(e) => onChangeTtsEngine(e.target.value)}
                  className="px-2 py-1 rounded-lg border theme-card hover:border-[var(--border-focus)] text-[11px] font-mono font-bold transition shadow-xs cursor-pointer focus:outline-none appearance-none pr-5 bg-no-repeat bg-[right_0.35rem_center]"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
                  }}
                  title={`TTS Engine: ${
                    ttsEngine === 'msedge-tts'
                      ? 'Microsoft Edge Cloud Neural TTS'
                      : ttsEngine === 'kokoro-tts'
                      ? 'Kokoro-TTS Local ONNX Fallback'
                      : ttsEngine === 'paradee-tts'
                      ? 'Paradee-8M-v1.2 Micro Neural ONNX'
                      : ttsEngine === 'paradee-mixed'
                      ? 'Paradee-8M (Primary 4) + Machine TTS (5th+ Cast)'
                      : 'Machine Local OS Speech Synthesis'
                  }`}
                  aria-label="Select TTS Engine"
                >
                  <option value="msedge-tts">Microsoft TTS</option>
                  <option value="kokoro-tts">Kokoro-TTS</option>
                  <option value="paradee-tts">Paradee-8M</option>
                  <option value="paradee-mixed">Paradee + Machine (Mixed)</option>
                  <option value="machine-tts">Machine TTS</option>
                </select>
              </div>
            )}

            {/* Playback Engine Mode Toggle */}
            {onTogglePlaybackMode && (
              <button
                type="button"
                onClick={() => onTogglePlaybackMode?.()}
                className={`px-2 sm:px-2.5 py-1 rounded-lg border text-xs font-mono font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5 ${
                  playbackMode === 'tts'
                    ? 'bg-[var(--warning)]/20 text-[var(--warning)] border-[var(--warning)]/40 hover:bg-[var(--warning)]/30'
                    : 'theme-card hover:border-[var(--border-focus)] theme-sub'
                }`}
                title={
                  playbackMode === 'tts'
                    ? 'Voice TTS: Playing live character TTS segment-by-segment. Click to switch to Studio Track.'
                    : 'Studio Track: Playing pre-rendered stitched full-chapter audio. Click to switch to Voice TTS.'
                }
                aria-label={`Playback engine: ${playbackMode === 'tts' ? 'Voice TTS' : 'Studio Track'}`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    playbackMode === 'tts' ? 'bg-[var(--warning)] animate-pulse' : 'bg-[var(--text-muted)]'
                  }`}
                />
                <span className="hidden md:inline">
                  {playbackMode === 'tts' ? 'Voice TTS' : 'Studio'}
                </span>
                <span className="md:hidden font-mono">
                  {playbackMode === 'tts' ? 'TTS' : 'Studio'}
                </span>
              </button>
            )}

            {/* Speed Pill Selector */}
            <button
              onClick={handleSpeedChange}
              className="px-2 sm:px-2.5 py-1 rounded-lg theme-card border hover:border-[var(--border-focus)] text-xs font-mono font-bold transition shadow-xs cursor-pointer"
              title="Cycle playback speed"
              aria-label={`Playback speed: ${speed}x`}
            >
              <span>{speed}x</span>
            </button>

            {/* Volume Control */}
            <div
              className="relative flex items-center"
              onMouseEnter={() => setShowVolumeSlider(true)}
              onMouseLeave={() => setShowVolumeSlider(false)}
            >
              <button
                onClick={handleVolumeToggle}
                className="p-2 rounded-lg theme-muted hover:text-[var(--text-main)] hover:bg-[var(--bg-hover)] transition cursor-pointer"
                title={isMuted ? 'Unmute' : 'Mute'}
                aria-label={isMuted ? 'Unmute audio' : 'Mute audio'}
              >
                {isMuted || volume === 0 ? (
                  <IconVolumeMute className="w-4 h-4 text-[var(--danger)]" />
                ) : (
                  <IconVolume className="w-4 h-4 text-[var(--brand-sage,#87A96B)]" />
                )}
              </button>

              {/* Volume Slider Popover */}
              {showVolumeSlider && (
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 p-2.5 rounded-xl theme-card border shadow-xl flex flex-col items-center gap-1 z-50 modal-panel-enter origin-bottom">
                  <span className="text-[10px] font-mono font-bold text-[var(--brand-sage,#87A96B)]">
                    {isMuted ? '0%' : `${Math.round(volume * 100)}%`}
                  </span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="w-20 h-1.5 accent-[var(--brand-sage,#87A96B)] cursor-pointer"
                    aria-label="Volume level"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
