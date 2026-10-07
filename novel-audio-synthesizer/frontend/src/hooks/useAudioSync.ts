/**
 * useAudioSync — requestAnimationFrame-based audio-text synchronization.
 *
 * Runs a 60fps loop that binary-searches the timeline array to find the
 * active segment based on the current audio playback position.
 */

import { useRef, useState, useCallback, useEffect } from 'react';
import type { TimelineEntry } from '../types';

export interface AudioSyncState {
  audioRef: React.RefObject<HTMLAudioElement | null>;
  activeSegmentId: number;
  isPlaying: boolean;
  currentTimeMs: number;
  duration: number;
  seekToSegment: (segmentId: number) => void;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  setPlaybackRate: (rate: number) => void;
}

export function useAudioSync(timeline: TimelineEntry[]): AudioSyncState {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rafRef = useRef<number>(0);
  const [activeSegmentId, setActiveSegmentId] = useState<number>(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [duration, setDuration] = useState(0);

  // Binary search for the active segment at a given timestamp
  const findActiveSegment = useCallback(
    (timeMs: number): number => {
      if (timeline.length === 0) return -1;

      let lo = 0;
      let hi = timeline.length - 1;

      while (lo <= hi) {
        const mid = Math.floor((lo + hi) / 2);
        const entry = timeline[mid];

        if (timeMs < entry.start_ms) {
          hi = mid - 1;
        } else if (timeMs >= entry.end_ms) {
          lo = mid + 1;
        } else {
          return entry.segment_id;
        }
      }

      return -1; // In a gap between segments
    },
    [timeline],
  );

  // The sync loop — runs every animation frame while audio is playing
  const syncLoop = useCallback(() => {
    if (!audioRef.current) return;

    const timeMs = audioRef.current.currentTime * 1000;
    setCurrentTimeMs(timeMs);

    const segId = findActiveSegment(timeMs);
    setActiveSegmentId(segId);

    rafRef.current = requestAnimationFrame(syncLoop);
  }, [findActiveSegment]);

  // Start/stop the sync loop based on play state
  useEffect(() => {
    if (isPlaying) {
      rafRef.current = requestAnimationFrame(syncLoop);
    } else {
      cancelAnimationFrame(rafRef.current);
    }

    return () => cancelAnimationFrame(rafRef.current);
  }, [isPlaying, syncLoop]);

  // Listen for play/pause/ended events on the audio element
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => {
      setIsPlaying(false);
      setActiveSegmentId(-1);
    };
    const onLoadedMetadata = () => setDuration(audio.duration * 1000);

    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);

    return () => {
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
    };
  }, []);

  // Seek to a specific segment (click-to-seek)
  const seekToSegment = useCallback(
    (segmentId: number) => {
      const entry = timeline.find((t) => t.segment_id === segmentId);
      if (entry && audioRef.current) {
        audioRef.current.currentTime = entry.start_ms / 1000;
        setActiveSegmentId(segmentId);

        // Auto-play on seek if not already playing
        if (audioRef.current.paused) {
          audioRef.current.play().catch(() => {});
        }
      }
    },
    [timeline],
  );

  const play = useCallback(() => {
    audioRef.current?.play().catch(() => {});
  }, []);

  const pause = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  const toggle = useCallback(() => {
    if (audioRef.current?.paused) {
      play();
    } else {
      pause();
    }
  }, [play, pause]);

  const setPlaybackRate = useCallback((rate: number) => {
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  }, []);

  return {
    audioRef,
    activeSegmentId,
    isPlaying,
    currentTimeMs,
    duration,
    seekToSegment,
    play,
    pause,
    toggle,
    setPlaybackRate,
  };
}
