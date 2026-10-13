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
  };
}
