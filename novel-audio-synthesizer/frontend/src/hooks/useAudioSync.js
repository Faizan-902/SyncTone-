import { useRef, useState, useCallback, useEffect } from 'react';

/**
 * Binary search (O(log N)) to find active segment based on current playback timestamp in milliseconds.
 */
export function findActiveSegment(timeline, timeMs) {
  if (!timeline || timeline.length === 0 || timeMs < 0) return -1;

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
      return entry.segment_id !== undefined ? entry.segment_id : entry.order;
    }
  }

  return -1;
}

export function useAudioSync(timeline = [], onSegmentChange = null) {
  const audioRef = useRef(null);
  const rafRef = useRef(0);
  const lastActiveSegIdRef = useRef(-1);
  const lastClockUpdateRef = useRef(0);

  const [activeSegmentId, setActiveSegmentId] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [duration, setDuration] = useState(0);

  // Synchronized animation loop (60fps audio clock)
  const syncLoop = useCallback(() => {
    if (!audioRef.current) return;

    const timeSec = audioRef.current.currentTime;
    const timeMs = Math.round(timeSec * 1000);

    // 1. High-speed binary search for active segment
    const segId = findActiveSegment(timeline, timeMs);

    // 2. CRITICAL PERFORMANCE OPTIMIZATION:
    // Only invoke React state updater when active segment boundary actually changes.
    // This prevents 60 full-document DOM re-renders per second!
    if (segId !== lastActiveSegIdRef.current) {
      lastActiveSegIdRef.current = segId;
      setActiveSegmentId(segId);
      if (onSegmentChange && segId !== -1) {
        onSegmentChange(segId, timeMs);
      }
    }

    // 3. Throttle scrubber clock state updates (~5 times per sec) to avoid DOM thrashing
    const now = performance.now();
    if (now - lastClockUpdateRef.current > 200) {
      lastClockUpdateRef.current = now;
      setCurrentTimeMs(timeMs);
    }

    rafRef.current = requestAnimationFrame(syncLoop);
  }, [timeline, onSegmentChange]);

  useEffect(() => {
    if (isPlaying) {
      rafRef.current = requestAnimationFrame(syncLoop);
    } else {
      cancelAnimationFrame(rafRef.current);
    }

    return () => cancelAnimationFrame(rafRef.current);
  }, [isPlaying, syncLoop]);

  const handlePlay = useCallback(() => setIsPlaying(true), []);
  const handlePause = useCallback(() => {
    setIsPlaying(false);
    if (audioRef.current) {
      setCurrentTimeMs(Math.round(audioRef.current.currentTime * 1000));
    }
  }, []);

  const handleEnded = useCallback(() => {
    setIsPlaying(false);
    lastActiveSegIdRef.current = -1;
    setActiveSegmentId(-1);
  }, []);

  const handleLoadedMetadata = useCallback((eOrDur) => {
    const dur = typeof eOrDur === 'number' ? eOrDur : (eOrDur?.currentTarget?.duration || 0);
    if (dur > 0) setDuration(Math.round(dur * 1000));
  }, []);

  // Click-to-seek: seeks audio to (segment.start_ms / 1000)
  const seekToSegment = useCallback(
    (segmentId) => {
      const entry = timeline.find(
        (t) => (t.segment_id !== undefined ? t.segment_id : t.order) === segmentId
      );
      if (entry && audioRef.current) {
        const targetSec = entry.start_ms / 1000;
        audioRef.current.currentTime = targetSec;
        lastActiveSegIdRef.current = segmentId;
        setActiveSegmentId(segmentId);
        setCurrentTimeMs(entry.start_ms);
        audioRef.current.play().catch(() => {});
        setIsPlaying(true);
      }
    },
    [timeline]
  );

  // Seek by explicit millisecond offset (for playback progress resume)
  const seekToTimeMs = useCallback(
    (targetMs, shouldPlay = false) => {
      if (audioRef.current) {
        const targetSec = Math.max(0, targetMs / 1000);
        audioRef.current.currentTime = targetSec;
        const segId = findActiveSegment(timeline, targetMs);
        lastActiveSegIdRef.current = segId;
        setActiveSegmentId(segId);
        setCurrentTimeMs(targetMs);
        if (shouldPlay) {
          audioRef.current.play().catch(() => {});
          setIsPlaying(true);
        }
      }
    },
    [timeline]
  );

  const play = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  }, []);

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  const toggle = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, play, pause]);

  const setPlaybackRate = useCallback((rate) => {
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
    seekToTimeMs,
    play,
    pause,
    toggle,
    setPlaybackRate,
    handlePlay,
    handlePause,
    handleEnded,
    handleLoadedMetadata,
  };
}

export default useAudioSync;
