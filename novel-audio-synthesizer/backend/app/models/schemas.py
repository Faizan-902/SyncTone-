"""Pydantic v2 data models — the shared contracts between backend and frontend."""

from pydantic import BaseModel, Field
from enum import Enum
from typing import Optional


class SegmentType(str, Enum):
    NARRATION = "narration"
    DIALOGUE = "dialogue"


class AttributionSource(str, Enum):
    REGEX_RULE = "regex_rule"
    DEPENDENCY_TREE = "dependency_tree"
    LLM_FALLBACK = "llm_fallback"
    NARRATOR_DEFAULT = "narrator_default"
    UNRESOLVED = "unresolved"


class Segment(BaseModel):
    """A single text segment (narration or dialogue) with speaker attribution."""
    segment_id: int
    type: SegmentType
    speaker_name: str = ""
    speaker_id: str = "narrator"
    assigned_voice_id: str = "af_heart"
    text: str
    attribution_confidence: float = Field(default=1.0, ge=0.0, le=1.0)
    attribution_source: AttributionSource = AttributionSource.NARRATOR_DEFAULT


class ParsedChapter(BaseModel):
    """Full parsed chapter with all segments attributed."""
    chapter_id: str
    title: str
    segments: list[Segment]


class AudioFormat(str, Enum):
    OPUS = "opus"
    MP3 = "mp3"
    WAV = "wav"


class TimelineEntry(BaseModel):
    """A single entry in the audio playback timeline."""
    segment_id: int
    start_ms: int
    end_ms: int
    speaker_name: str = ""
    voice_id: str = ""


class PlaybackManifest(BaseModel):
    """Synchronized audio timeline for the frontend player."""
    chapter_id: str
    audio_stream_url: str
    audio_format: AudioFormat = AudioFormat.OPUS
    total_duration_ms: int
    timeline: list[TimelineEntry]


# --- API Request / Response Models ---

class UploadRequest(BaseModel):
    """Request body for the /upload endpoint."""
    text: str
    title: str = "Untitled Chapter"


class UploadResponse(BaseModel):
    """Response from the /upload endpoint."""
    chapter_id: str
    message: str = "Chapter uploaded successfully"


class SynthesisProgress(BaseModel):
    """WebSocket message for live synthesis progress updates."""
    chapter_id: str
    current_segment: int
    total_segments: int
    percent_complete: float
    status: str  # "parsing", "attributing", "synthesizing", "stitching", "complete"


class VoiceAssignment(BaseModel):
    """Request to reassign a character's voice."""
    character_id: str
    new_voice_id: str


class CharacterInfo(BaseModel):
    """Character info for the roster display."""
    character_id: str
    character_name: str
    assigned_voice_id: str
    segment_count: int
