/**
 * SyncTone — MongoDB / Mongoose Chapter Document Model
 * 
 * Stores raw chapter text, dialogue segments with timing offsets, and 
 * derived playback manifests, referenced to PostgreSQL via `pg_chapter_id`.
 */

import { Schema, model, Document, Model } from 'mongoose';

// ==============================================================================
// 1. TypeScript Interfaces & Types
// ==============================================================================

export type SegmentType = 'narration' | 'dialogue';

export type AttributionSource = 
  | 'regex_rule' 
  | 'dependency_tree' 
  | 'llm_fallback' 
  | 'narrator_default' 
  | 'manual';

export interface ISegment {
  order: number;
  type: SegmentType;
  text: string;
  character_id?: string | null;
  voice_id: string;
  start_ms: number;
  end_ms: number;
  text_hash?: string;
  voice_hash?: string;
  confidence?: number;
  source?: AttributionSource;
  needs_review?: boolean;
}

export interface ITimelineEntry {
  order: number;
  start_ms: number;
  end_ms: number;
  character_id?: string | null;
  voice_id: string;
  text: string;
}

export interface IPlaybackManifest {
  total_duration_ms: number;
  audio_url?: string;
  timeline: ITimelineEntry[];
}

export interface IChapter extends Document {
  pg_chapter_id: string;   // Canonical reference to PostgreSQL chapters.id (UUID)
  novel_id: string;        // Canonical reference to PostgreSQL novels.id (UUID)
  chapter_number: number;
  title: string;
  raw_text: string;
  audio_version: number;
  manifest?: IPlaybackManifest;
  segments: ISegment[];
  createdAt: Date;
  updatedAt: Date;
}

// ==============================================================================
// 2. Mongoose Subdocument Schemas
// ==============================================================================

const SegmentSchema = new Schema<ISegment>(
  {
    order: {
      type: Number,
      required: [true, 'Segment order is required'],
      min: [1, 'Segment order must be >= 1'],
    },
    type: {
      type: String,
      enum: ['narration', 'dialogue'],
      required: [true, 'Segment type must be either narration or dialogue'],
    },
    text: {
      type: String,
      required: [true, 'Segment text content is required'],
      trim: true,
      alias: 'text_content',
    },
    character_id: {
      type: String,
      default: null,
      trim: true,
    },
    voice_id: {
      type: String,
      required: [true, 'Voice ID is required for audio playback synthesis'],
      trim: true,
    },
    start_ms: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    end_ms: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    text_hash: {
      type: String,
      default: '',
      trim: true,
    },
    voice_hash: {
      type: String,
      default: '',
      trim: true,
    },
    confidence: {
      type: Number,
      default: 1.0,
      min: 0.0,
      max: 1.0,
      alias: 'confidence_score',
    },
    source: {
      type: String,
      enum: ['regex_rule', 'dependency_tree', 'llm_fallback', 'narrator_default', 'manual'],
      default: 'narrator_default',
      alias: 'attribution_source',
    },
    needs_review: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

const TimelineEntrySchema = new Schema<ITimelineEntry>(
  {
    order: { type: Number, required: true },
    start_ms: { type: Number, required: true },
    end_ms: { type: Number, required: true },
    character_id: { type: String, default: null },
    voice_id: { type: String, required: true },
    text: { type: String, required: true },
  },
  { _id: false }
);

const PlaybackManifestSchema = new Schema<IPlaybackManifest>(
  {
    total_duration_ms: { type: Number, default: 0, min: 0 },
    audio_url: { type: String, default: '' },
    timeline: { type: [TimelineEntrySchema], default: [] },
  },
  { _id: false }
);

// ==============================================================================
// 3. Root Chapter Document Schema
// ==============================================================================

const ChapterSchema = new Schema<IChapter>(
  {
    pg_chapter_id: {
      type: String,
      required: [true, 'PostgreSQL chapter UUID reference is required'],
      unique: true,
      trim: true,
      index: true,
    },
    novel_id: {
      type: String,
      required: [true, 'PostgreSQL novel UUID reference is required'],
      trim: true,
      index: true,
    },
    chapter_number: {
      type: Number,
      required: [true, 'Chapter number is required'],
      min: [1, 'Chapter number must be greater than 0'],
    },
    title: {
      type: String,
      default: '',
      trim: true,
    },
    raw_text: {
      type: String,
      required: [true, 'Raw chapter text is required'],
    },
    audio_version: {
      type: Number,
      default: 1,
      min: 1,
    },
    manifest: {
      type: PlaybackManifestSchema,
      default: () => ({ total_duration_ms: 0, timeline: [] }),
    },
    segments: {
      type: [SegmentSchema],
      default: [],
    },
  },
  {
    timestamps: true,
    collection: 'chapters',
  }
);

// Compound unique index ensuring no duplicate chapter numbers within the same novel
ChapterSchema.index({ novel_id: 1, chapter_number: 1 }, { unique: true });

// ==============================================================================
// 4. Model Export
// ==============================================================================

export const Chapter: Model<IChapter> = model<IChapter>('Chapter', ChapterSchema);
export default Chapter;
