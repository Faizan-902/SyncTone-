import { useState, useEffect, useRef, useCallback } from 'react';
import { fitBook } from './fitBook';

/**
 * CONTRACT 2 — FROZEN SPECIFICATION
 * useBookFit(stageRef, opts) -> { ...fitBookResult, ready: boolean }
 *
 * Single source of truth for both Normal and 3D book modes.
 * - Watches stage element dimensions via ResizeObserver.
 * - rAF-throttled to avoid layout thrashing.
 * - Preserves previous layout for hysteresis stability against flapping.
 */
export function useBookFit(stageRef, opts = {}) {
  const [fitState, setFitState] = useState(() => ({
    ...fitBook({ w: 0, h: 0 }),
    ready: false,
  }));

  const prevLayoutRef = useRef('single');
  const rafIdRef = useRef(null);

  const measureAndFit = useCallback(() => {
    if (!stageRef?.current) return;
    const el = stageRef.current;
    const w = el.clientWidth || 0;
    const h = el.clientHeight || 0;

    if (w <= 0 || h <= 0) return;

    const result = fitBook(
      { w, h },
      {
        ...opts,
        prevLayout: prevLayoutRef.current,
      }
    );

    prevLayoutRef.current = result.layout;
    setFitState({
      ...result,
      ready: true,
    });
  }, [stageRef, opts]);

  useEffect(() => {
    const el = stageRef?.current;
    if (!el) return;

    // Initial measurement
    measureAndFit();

    // ResizeObserver throttled via requestAnimationFrame
    let resizeObserver = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = requestAnimationFrame(measureAndFit);
      });
      resizeObserver.observe(el);
    } else {
      const handleWindowResize = () => {
        if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = requestAnimationFrame(measureAndFit);
      };
      window.addEventListener('resize', handleWindowResize);
      return () => {
        window.removeEventListener('resize', handleWindowResize);
        if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      };
    }

    return () => {
      if (resizeObserver) resizeObserver.disconnect();
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, [stageRef, measureAndFit]);

  return fitState;
}

export default useBookFit;

