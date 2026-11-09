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

function formatTimecodeWithMs(ms) {
  if (!ms || isNaN(ms) || ms < 0) return '00:00.00';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const hundredths = Math.floor((ms % 1000) / 10);
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${hundredths.toString().padStart(2, '0')}`;
}

function formatSpeed(val) {
  if (typeof val !== 'number') return '1.0×';
  return Number.isInteger(val) ? `${val}.0×` : `${val}×`;
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
  isBuffering: propIsBuffering,
  error: propError,
}) {
  const [speed, setSpeed] = useState(1.0);
  const [volume, setVolume] = useState(1.0);
  const [isMuted, setIsMuted] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [followAlong, setFollowAlong] = useState(true);
  const [hoverTimeMs, setHoverTimeMs] = useState(null);
  const [hoverFraction, setHoverFraction] = useState(0);
  const [bufferedFraction, setBufferedFraction] = useState(0);
  const [isBufferingState, setIsBufferingState] = useState(false);
  const isBuffering = propIsBuffering ?? isBufferingState;
  const [localError, setLocalError] = useState(null);
  const error = propError || localError;
  const scrubberTrackRef = useRef(null);

  const progressFraction = totalDurationMs > 0 ? Math.min(1, Math.max(0, currentTimeMs / totalDurationMs)) : 0;

  // Direct scale update to avoid react re-render latency
  const scrubScaleStyle = {
    transform: `scaleX(${progressFraction})`,
    transformOrigin: 'left',
  };

  const bufferedScaleStyle = {
    transform: `scaleX(${bufferedFraction})`,
    transformOrigin: 'left',
  };

  const updateBufferedFraction = useCallback(() => {
    if (!audioRef?.current || totalDurationMs <= 0) return;
    const audio = audioRef.current;
    if (audio.buffered && audio.buffered.length > 0) {
      try {
        const endSec = audio.buffered.end(audio.buffered.length - 1);
        const fraction = Math.min(1, Math.max(0, (endSec * 1000) / totalDurationMs));
        setBufferedFraction(fraction);
      } catch (_) {}
    }
  }, [audioRef, totalDurationMs]);

  useEffect(() => {
    updateBufferedFraction();
  }, [currentTimeMs, updateBufferedFraction]);

  useEffect(() => {
    setLocalError(null);
    setIsBufferingState(false);
    setBufferedFraction(0);
  }, [audioUrl]);

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

  const authorDisplay = currentNovel?.author_username || currentNovel?.author || '';
  const narratorDisplay =
    currentNovel?.narrator ||
    currentNovel?.narrator_name ||
    currentNovel?.narrator_voice_label ||
    '';
  const sublineText =
    authorDisplay && narratorDisplay
      ? `${authorDisplay} • ${narratorDisplay}`
      : authorDisplay || narratorDisplay || currentNovel?.title || 'SyncTone';

  return (
    <footer
      className="audio-player-dock px-3 sm:px-6 flex items-center select-none"
      aria-label="Floating Audio Dock"
    >
      {/* Hidden audio element for audio sync engine */}
      <audio
        ref={audioRef}
        src={audioUrl}
        preload="auto"
        onPlay={(e) => {
          setIsBufferingState(false);
          onPlay?.(e);
        }}
        onPause={(e) => {
          setIsBufferingState(false);
          onPause?.(e);
        }}
        onEnded={onEnded}
        onLoadedMetadata={(e) => {
          setIsBufferingState(false);
          updateBufferedFraction();
          onLoadedMetadata?.(e);
        }}
        onProgress={updateBufferedFraction}
        onWaiting={() => setIsBufferingState(true)}
        onPlaying={() => {
          setIsBufferingState(false);
          setLocalError(null);
        }}
        onCanPlay={() => {
          setIsBufferingState(false);
          updateBufferedFraction();
        }}
        onError={(e) => {
          setIsBufferingState(false);
          if (audioUrl) {
            setLocalError('Audio track unavailable');
          }
          onError?.(e);
        }}
      />

      {/* High-contrast Monochrome Error Alert */}
      {error && (
        <div
          role="alert"
          className="absolute -top-10 left-3 right-3 sm:left-auto sm:right-6 px-3 py-1 bg-[var(--bg-card)] text-[var(--text-main)] border border-[var(--border-strong)] rounded-[1px] text-[11px] font-mono shadow-md flex items-center gap-2 z-50 animate-fadeIn"
        >
          <span className="font-bold text-[var(--text-main)]">[!]</span>
          <span className="truncate">{error}</span>
          <button
            type="button"
            onClick={() => setLocalError(null)}
            className="ml-auto text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer font-bold px-1"
            title="Dismiss error"
            aria-label="Dismiss alert"
          >
            ×
          </button>
        </div>
      )}

      {/* Mobile Top Edge Scrubber Line (Phase 8 Parity) */}
      <div
        className="mobile-top-scrubber"
        onClick={handleScrubberClick}
        role="presentation"
        aria-hidden="true"
      >
        <div className="scrubber-buffered-fill" style={bufferedScaleStyle} />
        <div className="scrubber-played-fill" style={scrubScaleStyle} />
      </div>

      {/* Main 3-zone container */}
      <div className="w-full max-w-7xl mx-auto flex items-center justify-between gap-3 sm:gap-6">
        {/* Left: Track Information */}
        <div className="audio-track-info flex items-center gap-3 min-w-0 max-w-[200px] sm:max-w-[240px] md:max-w-xs shrink-0">
          {/* 48x48 Sharp Book Jacket Artwork */}
          <div className="audio-track-art w-12 h-12 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-[1px] flex items-center justify-center font-mono text-[10px] text-[var(--text-sub)] shrink-0 overflow-hidden">
            {currentNovel?.cover_object ? (
              <img src={currentNovel.cover_object} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="font-mono font-bold tracking-wider text-[var(--text-muted)]">
                VOL.{String(currentChapter?.chapter_number || 1).padStart(2, '0')}
              </span>
            )}
          </div>

          <div className="audio-track-text min-w-0 flex flex-col justify-center">
            <h4 className="audio-track-title text-xs sm:text-[13px] font-semibold text-[var(--text-main)] truncate leading-tight font-sans">
              {currentChapter?.title || 'Chapter Audio Track'}
            </h4>
            <p className="audio-track-sub text-[10px] text-[var(--text-sub)] font-mono truncate mt-0.5 hidden sm:block">
              {sublineText}
            </p>
            <div className="audio-track-timecode text-[10px] font-mono text-[var(--text-muted)] tabular-nums mt-0.5 flex items-center gap-1.5">
              <span>{formatTimecodeWithMs(currentTimeMs)} / {formatTimecodeWithMs(totalDurationMs)}</span>
              {isBuffering && (
                <span className="text-[var(--text-main)] font-semibold tracking-wider animate-pulse">
                  [BUFFERING]
                </span>
              )}
              {error && !isBuffering && (
                <span className="text-[var(--text-main)] font-semibold tracking-wider">
                  [OFFLINE]
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Center: Playback Transport Buttons & Scrubber */}
        <div className="audio-central-cluster hidden sm:flex flex-1 max-w-xl mx-auto flex-col justify-center gap-1 min-w-0">
          {/* Transport Buttons Row */}
          <div className="audio-control-buttons flex items-center justify-center gap-1.5 sm:gap-2">
            {/* Skip -10s */}
            <button
              onClick={() => handleSkip(-10)}
              className="boxed-btn px-2 sm:px-2.5 py-1 text-[11px] font-mono text-[var(--text-main)] hover:bg-[var(--bg-hover)] cursor-pointer"
              title="Skip back 10 seconds (J)"
              aria-label="Skip back 10 seconds"
            >
              <span>◀◀ 10s</span>
            </button>

            {/* Previous Turn */}
            <button
              onClick={() => onSeekSegment && onSeekSegment(-1)}
              className="boxed-btn px-1.5 sm:px-2 py-1 text-[11px] font-mono text-[var(--text-main)] hover:bg-[var(--bg-hover)] cursor-pointer"
              title="Previous dialogue turn"
              aria-label="Previous turn"
            >
              <IconPrev className="w-3.5 h-3.5" />
            </button>

            {/* Play / Pause Toggle Button (Inverted Primary CTA) */}
            <button
              onClick={onToggle}
              className="btn-play-pause boxed-btn-primary px-3 sm:px-4 py-1 text-[11px] font-mono cursor-pointer flex items-center gap-1.5"
              aria-label={isBuffering ? 'Audio buffering' : isPlaying ? 'Pause audio' : 'Play audio'}
            >
              {isBuffering ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-[var(--on-accent)] border-t-transparent animate-spin inline-block" />
                  <span className="hidden sm:inline">BUFFERING</span>
                </>
              ) : isPlaying ? (
                <>
                  <IconPause className="w-3.5 h-3.5 fill-current" />
                  <span className="hidden sm:inline">PAUSE</span>
                </>
              ) : (
                <>
                  <IconPlay className="w-3.5 h-3.5 fill-current ml-0.5" />
                  <span className="hidden sm:inline">PLAY</span>
                </>
              )}
            </button>

            {/* Next Turn */}
            <button
              onClick={() => onSeekSegment && onSeekSegment(1)}
              className="boxed-btn px-1.5 sm:px-2 py-1 text-[11px] font-mono text-[var(--text-main)] hover:bg-[var(--bg-hover)] cursor-pointer"
              title="Next dialogue turn"
              aria-label="Next turn"
            >
              <IconNext className="w-3.5 h-3.5" />
            </button>

            {/* Skip +10s */}
            <button
              onClick={() => handleSkip(10)}
              className="boxed-btn px-2 sm:px-2.5 py-1 text-[11px] font-mono text-[var(--text-main)] hover:bg-[var(--bg-hover)] cursor-pointer"
              title="Skip forward 10 seconds (L)"
              aria-label="Skip forward 10 seconds"
            >
              <span>10s ▶▶</span>
            </button>
          </div>

          {/* Scrubber Track Row */}
          <div className="audio-scrubber-row w-full flex items-center gap-2">
            <span className="scrubber-current-time text-[10px] font-mono text-[var(--text-muted)] w-8 sm:w-10 text-right select-none tabular-nums font-medium">
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
              className="scrubber-track-bar flex-1 py-1.5 cursor-pointer relative flex items-center group focus:outline-none"
            >
              {/* Scrubber timecode hover preview badge */}
              {hoverTimeMs !== null && (
                <div
                  className="absolute -top-7 pointer-events-none transform -translate-x-1/2 px-1.5 py-0.5 rounded-[1px] text-[10px] font-mono font-bold bg-[var(--bg-surface)] text-[var(--text-main)] border border-[var(--border-strong)] shadow-md z-30 transition-transform duration-75"
                  style={{ left: `${hoverFraction * 100}%` }}
                >
                  {formatHoverTime(hoverTimeMs)}
                </div>
              )}

              {/* Background Track Bar */}
              <div className="w-full h-1 bg-[var(--border-subtle)] relative overflow-hidden group-hover:h-1.5 transition-all rounded-[1px]">
                {/* Buffered Fill */}
                <div
                  className="scrubber-buffered-fill absolute left-0 top-0 bottom-0 bg-[var(--border-strong)] will-change-transform"
                  style={{
                    transform: `scaleX(${bufferedFraction})`,
                    transformOrigin: 'left',
                    width: '100%',
                  }}
                />
                {/* Played Fill */}
                <div
                  className="scrubber-played-fill absolute left-0 top-0 bottom-0 bg-[var(--text-main)] will-change-transform"
                  style={{
                    transform: `scaleX(${progressFraction})`,
                    transformOrigin: 'left',
                    width: '100%',
                  }}
                />
              </div>

              {/* Scrubber Thumb Indicator on hover */}
              <div
                className="scrubber-thumb absolute w-2.5 h-2.5 rounded-[1px] bg-[var(--accent)] border border-[var(--border-strong)] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-100 transform -translate-x-1/2"
                style={{ left: `${progressFraction * 100}%` }}
              />
            </div>

            <span className="text-[10px] font-mono text-[var(--text-muted)] w-8 sm:w-10 select-none tabular-nums font-medium">
              {formatTime(totalDurationMs)}
            </span>
          </div>
        </div>

        {/* Right: Signal Dot, Engine Mode, TTS Dropdown, Speed & Volume Controls */}
        <div className="audio-right-cluster flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* Mobile Play/Pause CTA (shown on narrow screens <640px) */}
          <button
            onClick={onToggle}
            className="mobile-play-btn boxed-btn-primary px-3 py-1.5 text-[11px] font-mono sm:hidden cursor-pointer flex items-center gap-1.5"
            aria-label={isBuffering ? 'Audio buffering' : isPlaying ? 'Pause audio' : 'Play audio'}
          >
            {isBuffering ? (
              <span className="w-3 h-3 border-2 border-current border-t-transparent animate-spin inline-block" />
            ) : isPlaying ? (
              <>
                <IconPause className="w-3 h-3 fill-current" />
                <span>PAUSE</span>
              </>
            ) : (
              <>
                <IconPlay className="w-3 h-3 fill-current ml-0.5" />
                <span>PLAY</span>
              </>
            )}
          </button>

          {/* Signal Dot: Active strictly when isPlaying per Section 9.4 on mobile */}
          {followAlong && isPlaying && (
            <span
              className="signal-dot sm:hidden"
              title="Active Audio Playback"
              aria-label="Audio playing visualizer"
            />
          )}

          {/* Follow Along / Live Sync Toggle */}
          <button
            type="button"
            onClick={() => setFollowAlong((prev) => !prev)}
            className={`boxed-btn px-2 sm:px-2.5 py-1 text-[11px] font-mono cursor-pointer hidden md:inline-flex items-center gap-1.5 transition-colors ${
              followAlong && isPlaying
                ? 'text-[var(--text-main)] border-[var(--border-strong)]'
                : 'text-[var(--text-muted)] border-[var(--border-subtle)] hover:border-[var(--border-strong)]'
            }`}
            title={followAlong ? 'Follow Along: Active (click to disable)' : 'Follow Along: Paused (click to enable)'}
            aria-pressed={followAlong}
            aria-label="Toggle Follow Along"
          >
            {followAlong && isPlaying ? (
              <span className="signal-dot" title="Active Audio Playback" />
            ) : (
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)] opacity-40" />
            )}
            <span className="font-bold tracking-wider">FOLLOW ALONG</span>
          </button>

          {/* Multi-Engine Selector Dropdown */}
          {onChangeTtsEngine && (
            <div className="relative hidden lg:flex items-center">
              <select
                value={ttsEngine}
                onChange={(e) => onChangeTtsEngine(e.target.value)}
                className="boxed-btn px-2 py-1 text-[11px] font-mono bg-[var(--bg-card)] text-[var(--text-main)] border border-[var(--border-strong)] cursor-pointer focus:outline-none"
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
              className="boxed-btn px-2 sm:px-2.5 py-1 text-[11px] font-mono cursor-pointer flex items-center gap-1.5"
              title={
                playbackMode === 'tts'
                  ? 'Voice TTS: Playing live character TTS segment-by-segment. Click to switch to Studio Track.'
                  : 'Studio Track: Playing pre-rendered stitched full-chapter audio. Click to switch to Voice TTS.'
              }
              aria-label={`Playback engine: ${playbackMode === 'tts' ? 'Voice TTS' : 'Studio Track'}`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  playbackMode === 'tts' && isPlaying ? 'bg-[var(--signal)]' : 'bg-[var(--text-muted)]'
                }`}
              />
              <span className="hidden sm:inline">
                {playbackMode === 'tts' ? 'VOICE TTS' : 'STUDIO'}
              </span>
              <span className="sm:hidden">
                {playbackMode === 'tts' ? 'TTS' : 'STU'}
              </span>
            </button>
          )}

          {/* Playback Speed Button */}
          <button
            onClick={handleSpeedChange}
            className="boxed-btn px-2 py-1 text-[11px] font-mono text-[var(--text-main)] hover:bg-[var(--bg-hover)] cursor-pointer"
            title="Cycle playback speed"
            aria-label={`Playback speed: ${speed}x`}
          >
            <span>{formatSpeed(speed)}</span>
          </button>

          {/* Expand Reader Button */}
          {currentChapter?.id && (
            <a
              href={`/reader/${currentChapter.id}`}
              onClick={(e) => {
                e.preventDefault();
                if (typeof window !== 'undefined') {
                  window.history.pushState(null, '', `/reader/${currentChapter.id}`);
                  window.dispatchEvent(new PopStateEvent('popstate'));
                }
              }}
              className="boxed-btn px-2 py-1 text-[11px] font-mono text-[var(--text-main)] hover:bg-[var(--bg-hover)] cursor-pointer hidden md:flex items-center gap-1"
              title="Expand Reader"
              aria-label="Expand Reader"
            >
              <span aria-hidden="true">📖</span>
              <span className="hidden xl:inline text-[10px]">READER</span>
            </a>
          )}

          {/* Volume Control */}
          <div
            className="relative flex items-center"
            onMouseEnter={() => setShowVolumeSlider(true)}
            onMouseLeave={() => setShowVolumeSlider(false)}
            onFocus={() => setShowVolumeSlider(true)}
            onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget)) {
                setShowVolumeSlider(false);
              }
            }}
          >
            <button
              onClick={handleVolumeToggle}
              className="boxed-btn p-1.5 text-[var(--text-main)] hover:bg-[var(--bg-hover)] cursor-pointer"
              title={isMuted ? 'Unmute (M)' : 'Mute (M)'}
              aria-label={isMuted ? 'Unmute audio' : 'Mute audio'}
            >
              {isMuted || volume === 0 ? (
                <IconVolumeMute className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              ) : (
                <IconVolume className="w-3.5 h-3.5 text-[var(--text-main)]" />
              )}
            </button>

            {/* Volume Slider Popover */}
            {showVolumeSlider && (
              <div
                className="absolute bottom-full mb-2 right-0 p-2.5 rounded-[1px] bg-[var(--bg-card)] border border-[var(--border-strong)] shadow-xl flex flex-col items-center gap-1.5 z-50 animate-fadeIn"
                role="region"
                aria-label="Volume slider popover"
              >
                <span className="text-[10px] font-mono font-bold text-[var(--text-main)] select-none">
                  {isMuted ? '0%' : `${Math.round(volume * 100)}%`}
                </span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-20 h-1.5 accent-[var(--accent)] cursor-pointer"
                  aria-label="Volume level"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}
