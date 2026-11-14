import { useState, useEffect, useRef, useCallback } from 'react';

export function useSynthesisProgress(chapterId) {
  const [progressState, setProgressState] = useState({
    status: 'idle', // 'idle' | 'parsing' | 'synthesizing' | 'stitching' | 'complete' | 'failed'
    percentComplete: 0,
    currentSegment: null,
    totalSegments: null,
    message: '',
    error: null,
    isConnected: false,
    isComplete: false,
    isFailed: false,
  });

  const wsRef = useRef(null);
  const sseRef = useRef(null);
  const pollIntervalRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const pingIntervalRef = useRef(null);
  const isMountedRef = useRef(true);

  const applyProgressPayload = useCallback((data) => {
    if (!isMountedRef.current || !data || typeof data !== 'object') return;
    const status = (data.status || 'synthesizing').toLowerCase();
    const percent = typeof data.percent_complete === 'number' ? data.percent_complete : 0;
    const currentSeg = data.current_segment !== undefined ? data.current_segment : null;
    const totalSegs = data.total_segments !== undefined ? data.total_segments : null;
    const errorMsg = data.error || (status === 'failed' ? 'Synthesis encountered an error' : null);

    let msg = '';
    if (status === 'parsing') {
      msg = 'Parsing text & attributing character voices...';
    } else if (status === 'synthesizing') {
      msg = currentSeg && totalSegs
        ? `Synthesizing audio segment ${currentSeg} of ${totalSegs} (${percent}%)`
        : `Synthesizing audio (${percent}%)`;
    } else if (status === 'stitching') {
      msg = 'Stitching audio segments with 250ms silence frames...';
    } else if (status === 'complete') {
      msg = 'Audio synthesis completed successfully!';
    } else if (status === 'failed') {
      msg = errorMsg || 'Synthesis failed';
    }

    setProgressState({
      status,
      percentComplete: percent,
      currentSegment: currentSeg,
      totalSegments: totalSegs,
      message: msg,
      error: errorMsg,
      isConnected: status !== 'complete' && status !== 'failed',
      isComplete: status === 'complete',
      isFailed: status === 'failed',
    });

    if (status === 'complete' || status === 'failed') {
      clearInterval(pingIntervalRef.current);
      clearInterval(pollIntervalRef.current);
      if (sseRef.current) {
        try { sseRef.current.close(); } catch (_) {}
      }
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        try { wsRef.current.close(); } catch (_) {}
      }
    }
  }, []);

  const startHttpFallback = useCallback((id) => {
    if (!id || typeof window === 'undefined') return;
    const apiBase = (
      (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL) ||
      '/api'
    ).replace(/\/$/, '');

    if (typeof EventSource !== 'undefined' && !sseRef.current) {
      try {
        const es = new EventSource(`${apiBase}/chapters/${id}/progress/sse`, { withCredentials: true });
        sseRef.current = es;
        es.onmessage = (evt) => {
          try {
            const payload = JSON.parse(evt.data);
            applyProgressPayload(payload);
          } catch (_) {}
        };
        es.onerror = () => {
          try { es.close(); } catch (_) {}
          sseRef.current = null;
        };
      } catch (_) {}
    }

    if (!pollIntervalRef.current) {
      pollIntervalRef.current = setInterval(async () => {
        if (!isMountedRef.current) return;
        try {
          const resp = await fetch(`${apiBase}/chapters/${id}/progress`, { credentials: 'include' });
          if (resp.ok) {
            const payload = await resp.json();
            if (payload && payload.status && payload.status !== 'idle' && payload.status !== 'draft') {
              applyProgressPayload(payload);
            }
          }
        } catch (_) {}
      }, 2500);
    }
  }, [applyProgressPayload]);

  const connect = useCallback(() => {
    if (!chapterId || typeof window === 'undefined') return;

    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch (_) {}
    }
    if (sseRef.current) {
      try {
        sseRef.current.close();
      } catch (_) {}
      sseRef.current = null;
    }
    clearInterval(pollIntervalRef.current);
    pollIntervalRef.current = null;

    const envWsBase =
      typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_WS_BASE_URL
        ? String(import.meta.env.VITE_WS_BASE_URL).trim().replace(/\/$/, '')
        : '';
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = envWsBase
      ? `${envWsBase.replace(/^http/i, 'ws')}/api/ws/progress/${chapterId}`
      : `${protocol}//${host}/api/ws/progress/${chapterId}`;

    let openedOnce = false;
    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        openedOnce = true;
        if (!isMountedRef.current) return;
        setProgressState((prev) => ({ ...prev, isConnected: true }));

        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            try {
              ws.send('ping');
            } catch (_) {}
          }
        }, 15000);
      };

      ws.onmessage = (event) => {
        if (!isMountedRef.current) return;
        if (event.data === 'pong') return;

        try {
          const data = JSON.parse(event.data);
          applyProgressPayload(data);
        } catch (_) {}
      };

      ws.onerror = () => {
        if (!isMountedRef.current) return;
        setProgressState((prev) => ({ ...prev, isConnected: false }));
        if (!openedOnce) {
          startHttpFallback(chapterId);
        }
      };

      ws.onclose = () => {
        if (!isMountedRef.current) return;
        clearInterval(pingIntervalRef.current);
        setProgressState((prev) => ({ ...prev, isConnected: false }));
      };
    } catch (_) {
      startHttpFallback(chapterId);
    }
  }, [chapterId, applyProgressPayload, startHttpFallback]);

  useEffect(() => {
    isMountedRef.current = true;
    if (chapterId) {
      connect();
    }

    return () => {
      isMountedRef.current = false;
      clearInterval(pingIntervalRef.current);
      clearInterval(pollIntervalRef.current);
      clearTimeout(reconnectTimeoutRef.current);
      if (sseRef.current) {
        try {
          sseRef.current.close();
        } catch (_) {}
      }
      if (wsRef.current) {
        try {
          wsRef.current.close();
        } catch (_) {}
      }
    };
  }, [chapterId, connect]);

  const reset = useCallback(() => {
    setProgressState({
      status: 'idle',
      percentComplete: 0,
      currentSegment: null,
      totalSegments: null,
      message: '',
      error: null,
      isConnected: false,
      isComplete: false,
      isFailed: false,
    });
  }, []);

  return {
    ...progressState,
    reconnect: connect,
    reset,
  };
}

export default useSynthesisProgress;
