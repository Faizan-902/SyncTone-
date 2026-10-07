/**
 * TypeScript interfaces mirroring the backend Pydantic models.
 * These must stay in sync with backend/app/models/schemas.py.
 */

export type SegmentType = 'narration' | 'dialogue';

export type AttributionSource =
  | 'regex_rule'
  | 'dependency_tree'
  | 'llm_fallback'
  | 'narrator_default'
  | 'unresolved';

export interface Segment {
  segment_id: number;
  type: SegmentType;
  speaker_name: string;
  speaker_id: string;
  assigned_voice_id: string;
  text: string;
  attribution_confidence: number;
  attribution_source: AttributionSource;
}

export interface ParsedChapter {
  chapter_id: string;
  title: string;
  segments: Segment[];
}

export interface TimelineEntry {
  segment_id: number;
  start_ms: number;
  end_ms: number;
  speaker_name: string;
  voice_id: string;
}

export interface PlaybackManifest {
  chapter_id: string;
  audio_stream_url: string;
  audio_format: 'opus' | 'mp3' | 'wav';
  total_duration_ms: number;
  timeline: TimelineEntry[];
}

export interface SynthesisProgress {
  chapter_id: string;
  current_segment: number;
  total_segments: number;
  percent_complete: number;
  status: 'parsing' | 'attributing' | 'synthesizing' | 'stitching' | 'complete';
}

export interface CharacterInfo {
  character_id: string;
  character_name: string;
  assigned_voice_id: string;
  segment_count: number;
}

export interface VoiceInfo {
  [archetype: string]: string; // e.g., { narrator: 'af_heart', ... }
}

export interface ModelStatus {
  tts: {
    model_exists: boolean;
    voices_exists: boolean;
    model_path: string;
    voices_path: string;
    initialized: boolean;
  };
  llm: {
    available: boolean;
    model: string;
    url: string;
  };
}
