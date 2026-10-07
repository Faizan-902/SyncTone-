/**
 * useChapterData — Fetches and caches chapter data from the backend API.
 */

import { useState, useCallback } from 'react';
import type { ParsedChapter, PlaybackManifest, ModelStatus } from '../types';

const API_BASE = '/api';

export interface ChapterState {
  chapterId: string | null;
  parsed: ParsedChapter | null;
  manifest: PlaybackManifest | null;
  isLoading: boolean;
  error: string | null;
  progress: string;
}

export interface ChapterActions {
  uploadText: (text: string, title?: string) => Promise<string | null>;
  parseChapter: (chapterId: string) => Promise<ParsedChapter | null>;
  synthesizeChapter: (chapterId: string) => Promise<PlaybackManifest | null>;
  checkModels: () => Promise<ModelStatus | null>;
  reset: () => void;
}

export function useChapterData(): [ChapterState, ChapterActions] {
  const [state, setState] = useState<ChapterState>({
    chapterId: null,
    parsed: null,
    manifest: null,
    isLoading: false,
    error: null,
    progress: '',
  });

  const setLoading = (progress: string) =>
    setState((prev) => ({ ...prev, isLoading: true, error: null, progress }));

  const setError = (error: string) =>
    setState((prev) => ({ ...prev, isLoading: false, error, progress: '' }));

  const uploadText = useCallback(async (text: string, title = 'Untitled Chapter') => {
    setLoading('Uploading chapter...');
    try {
      const res = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, title }),
      });

      if (!res.ok) throw new Error(`Upload failed: ${res.statusText}`);

      const data = await res.json();
      setState((prev) => ({
        ...prev,
        chapterId: data.chapter_id,
        isLoading: false,
        progress: '',
      }));
      return data.chapter_id as string;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      return null;
    }
  }, []);

  const parseChapter = useCallback(async (chapterId: string) => {
    setLoading('Parsing text & attributing dialogue...');
    try {
      const res = await fetch(`${API_BASE}/parse/${chapterId}`, {
        method: 'POST',
      });

      if (!res.ok) throw new Error(`Parse failed: ${res.statusText}`);

      const parsed: ParsedChapter = await res.json();
      setState((prev) => ({ ...prev, parsed, isLoading: false, progress: '' }));
      return parsed;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Parse failed');
      return null;
    }
  }, []);

  const synthesizeChapter = useCallback(async (chapterId: string) => {
    setLoading('Synthesizing audio...');
    try {
      const res = await fetch(`${API_BASE}/synthesize/${chapterId}`, {
        method: 'POST',
      });

      if (!res.ok) throw new Error(`Synthesis failed: ${res.statusText}`);

      const manifest: PlaybackManifest = await res.json();
      setState((prev) => ({ ...prev, manifest, isLoading: false, progress: '' }));
      return manifest;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Synthesis failed');
      return null;
    }
  }, []);

  const checkModels = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/status/models`);
      if (!res.ok) return null;
      return (await res.json()) as ModelStatus;
    } catch {
      return null;
    }
  }, []);

  const reset = useCallback(() => {
    setState({
      chapterId: null,
      parsed: null,
      manifest: null,
      isLoading: false,
      error: null,
      progress: '',
    });
  }, []);

  return [state, { uploadText, parseChapter, synthesizeChapter, checkModels, reset }];
}
