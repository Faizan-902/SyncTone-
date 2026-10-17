import { useRef, useState, useCallback, useEffect } from 'react';

export function useAudioSync(timeline = []) {
  const audioRef = useRef(null);
  const rafRef = useRef(0);
  const [activeSegmentId, setActiveSegmentId] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [duration, setDuration] = useState(0);

  const findActiveSegment = useCallback(
    (timeMs) => {
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

      return -1;
    },
    [timeline]
  );

  const syncLoop = useCallback(() => {
    if (!audioRef.current) return;

    const timeMs = audioRef.current.currentTime * 1000;
    setCurrentTimeMs(timeMs);

    const segId = findActiveSegment(timeMs);
    setActiveSegmentId(segId);

    rafRef.current = requestAnimationFrame(syncLoop);
  }, [findActiveSegment]);

  useEffect(() => {
    if (isPlaying) {
      rafRef.current = requestAnimationFrame(syncLoop);
    } else {
      cancelAnimationFrame(rafRef.current);
    }

    return () => cancelAnimationFrame(rafRef.current);
  }, [isPlaying, syncLoop]);

  const handlePlay = useCallback(() => setIsPlaying(true), []);
  const handlePause = useCallback(() => setIsPlaying(false), []);
  const handleEnded = useCallback(() => {
    setIsPlaying(false);
    setActiveSegmentId(-1);
  }, []);
  const handleLoadedMetadata = useCallback((eOrDur) => {
    const dur = typeof eOrDur === 'number' ? eOrDur : (eOrDur?.currentTarget?.duration || 0);
    if (dur > 0) setDuration(dur * 1000);
  }, []);


  const seekToSegment = useCallback(
    (segmentId) => {
      const entry = timeline.find((t) => t.segment_id === segmentId);
      if (entry && audioRef.current) {
        audioRef.current.currentTime = entry.start_ms / 1000;
        audioRef.current.play().catch(() => {});
        setIsPlaying(true);
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
