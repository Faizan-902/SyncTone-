"""REST API endpoints for the Novel Audio Synthesizer.

Endpoints:
  POST /api/upload         — Accept raw text, return chapter_id
  GET  /api/chapters       — List all uploaded chapters
  POST /api/parse/{id}     — Parse & attribute, return ParsedChapter
  POST /api/synthesize/{id} — TTS & stitch, return PlaybackManifest
  GET  /api/stream/{id}    — Stream the audio file
  GET  /api/manifest/{id}  — Get playback manifest
  GET  /api/status/models  — Check model availability
  GET  /api/voices         — List available voices
  POST /api/voices/assign  — Manually reassign a voice
"""

import json
import uuid
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import FileResponse

from ..models.schemas import (
    UploadRequest,
    UploadResponse,
    ParsedChapter,
    PlaybackManifest,
    VoiceAssignment,
    CharacterInfo,
    SegmentType,
)
from ..engine.text_parser import parse_chapter
from ..engine.attribution import AttributionEngine
from ..engine.voice_profiler import VoiceProfiler
from ..engine.tts_engine import TTSEngine
from ..engine.audio_stitcher import AudioStitcher
from ..core.config import settings
from ..core.logger import get_logger

logger = get_logger(__name__)
router = APIRouter()

# ---------------------------------------------------------------------------
# Shared engine instances (initialized lazily)
# ---------------------------------------------------------------------------

_attribution_engine: Optional[AttributionEngine] = None
_voice_profiler: Optional[VoiceProfiler] = None
_tts_engine: Optional[TTSEngine] = None
_audio_stitcher: Optional[AudioStitcher] = None

# In-memory chapter store (for MVP — replace with DB later)
_chapters: dict[str, dict] = {}  # chapter_id -> {text, title, parsed, manifest}


def _get_attribution_engine() -> AttributionEngine:
    global _attribution_engine
    if _attribution_engine is None:
        _attribution_engine = AttributionEngine()
    return _attribution_engine


def _get_voice_profiler() -> VoiceProfiler:
    global _voice_profiler
    if _voice_profiler is None:
        persist_path = settings.resolve_path(settings.output_dir / "voice_registry.json")
        _voice_profiler = VoiceProfiler(persist_path=persist_path)
    return _voice_profiler


def _get_tts_engine() -> TTSEngine:
    global _tts_engine
    if _tts_engine is None:
        _tts_engine = TTSEngine()
    return _tts_engine


def _get_audio_stitcher() -> AudioStitcher:
    global _audio_stitcher
    if _audio_stitcher is None:
        _audio_stitcher = AudioStitcher()
    return _audio_stitcher


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.post("/upload", response_model=UploadResponse)
async def upload_chapter(request: UploadRequest):
    """Upload raw chapter text for processing."""
    chapter_id = str(uuid.uuid4())[:8]

    # Store chapter data
    _chapters[chapter_id] = {
        "text": request.text,
        "title": request.title,
        "parsed": None,
        "manifest": None,
    }

    # Also persist to disk
    chapter_dir = settings.resolve_path(settings.chapters_dir) / chapter_id
    chapter_dir.mkdir(parents=True, exist_ok=True)
    (chapter_dir / "raw.txt").write_text(request.text, encoding="utf-8")
    (chapter_dir / "metadata.json").write_text(
        json.dumps({"title": request.title, "chapter_id": chapter_id}),
        encoding="utf-8",
    )

    logger.info(f"Chapter '{request.title}' uploaded as {chapter_id}")
    return UploadResponse(chapter_id=chapter_id)


@router.get("/chapters")
async def list_chapters():
    """List all uploaded chapters."""
    result = []
    for cid, data in _chapters.items():
        result.append({
            "chapter_id": cid,
            "title": data["title"],
            "has_parsed": data["parsed"] is not None,
            "has_manifest": data["manifest"] is not None,
        })
    return {"chapters": result}


@router.post("/parse/{chapter_id}", response_model=ParsedChapter)
async def parse_chapter_endpoint(chapter_id: str):
    """Parse and attribute a chapter's text."""
    if chapter_id not in _chapters:
        raise HTTPException(status_code=404, detail="Chapter not found")

    chapter_data = _chapters[chapter_id]

    # Try to load spaCy (optional)
    nlp = None
    try:
        import spacy
        nlp = spacy.load(settings.spacy_model)
        logger.info(f"spaCy model '{settings.spacy_model}' loaded")
    except Exception as e:
        logger.warning(f"spaCy not available, using regex-only: {e}")

    # Step 1: Parse text
    parsed = parse_chapter(
        raw_text=chapter_data["text"],
        title=chapter_data["title"],
        chapter_id=chapter_id,
        nlp=nlp,
    )

    # Step 2: LLM attribution for unresolved segments
    engine = _get_attribution_engine()
    known_chars = list(set(
        s.speaker_name for s in parsed.segments
        if s.speaker_name and s.speaker_id != "unresolved"
    ))
    parsed.segments = await engine.resolve_unattributed(
        parsed.segments, known_chars
    )

    # Step 3: Assign voices
    profiler = _get_voice_profiler()
    parsed.segments = profiler.apply_voices_to_segments(parsed.segments)

    # Store parsed result
    _chapters[chapter_id]["parsed"] = parsed

    # Persist to disk
    chapter_dir = settings.resolve_path(settings.chapters_dir) / chapter_id
    (chapter_dir / "parsed.json").write_text(
        parsed.model_dump_json(indent=2), encoding="utf-8"
    )

    logger.info(f"Chapter {chapter_id} parsed with {len(parsed.segments)} segments")
    return parsed


@router.post("/synthesize/{chapter_id}", response_model=PlaybackManifest)
async def synthesize_chapter(chapter_id: str):
    """Synthesize audio for a parsed chapter."""
    if chapter_id not in _chapters:
        raise HTTPException(status_code=404, detail="Chapter not found")

    chapter_data = _chapters[chapter_id]
    parsed: Optional[ParsedChapter] = chapter_data.get("parsed")

    if parsed is None:
        raise HTTPException(
            status_code=400,
            detail="Chapter not yet parsed. Call /parse first.",
        )

    tts = _get_tts_engine()
    stitcher = _get_audio_stitcher()

    # Synthesize each segment
    segment_audio = []
    for i, seg in enumerate(parsed.segments):
        logger.info(
            f"Synthesizing segment {i + 1}/{len(parsed.segments)} "
            f"({seg.type.value}, voice: {seg.assigned_voice_id})"
        )

        pcm_samples, duration_ms = await tts.synthesize_segment(
            text=seg.text,
            voice_id=seg.assigned_voice_id,
        )

        segment_audio.append({
            "segment_id": seg.segment_id,
            "voice_id": seg.assigned_voice_id,
            "speaker_name": seg.speaker_name,
            "pcm_samples": pcm_samples,
        })

    # Stitch and export
    output_dir = settings.resolve_path(settings.output_dir)
    manifest = stitcher.stitch(
        segments=segment_audio,
        output_dir=output_dir,
        chapter_id=chapter_id,
    )

    # Store manifest
    _chapters[chapter_id]["manifest"] = manifest

    # Persist manifest
    chapter_dir = settings.resolve_path(settings.chapters_dir) / chapter_id
    (chapter_dir / "manifest.json").write_text(
        manifest.model_dump_json(indent=2), encoding="utf-8"
    )

    logger.info(f"Chapter {chapter_id} synthesized — {manifest.total_duration_ms}ms")
    return manifest


@router.get("/stream/{chapter_id}")
async def stream_audio(chapter_id: str, format: str = "wav"):
    """Stream the synthesized audio file."""
    output_dir = settings.resolve_path(settings.output_dir)

    # Try requested format first, fall back to WAV
    for ext in [format, "opus", "mp3", "wav"]:
        audio_path = output_dir / f"{chapter_id}.{ext}"
        if audio_path.exists():
            media_types = {
                "opus": "audio/opus",
                "mp3": "audio/mpeg",
                "wav": "audio/wav",
            }
            return FileResponse(
                path=str(audio_path),
                media_type=media_types.get(ext, "audio/wav"),
                filename=f"{chapter_id}.{ext}",
            )

    raise HTTPException(status_code=404, detail="Audio file not found")


@router.get("/manifest/{chapter_id}", response_model=PlaybackManifest)
async def get_manifest(chapter_id: str):
    """Get the playback manifest for a chapter."""
    if chapter_id not in _chapters:
        raise HTTPException(status_code=404, detail="Chapter not found")

    manifest = _chapters[chapter_id].get("manifest")
    if manifest is None:
        raise HTTPException(
            status_code=400,
            detail="Chapter not yet synthesized. Call /synthesize first.",
        )
    return manifest


@router.get("/status/models")
async def check_models():
    """Check availability of required models (TTS, LLM)."""
    tts = _get_tts_engine()
    attr = _get_attribution_engine()

    return {
        "tts": await tts.check_model_available(),
        "llm": {
            "available": await attr.check_availability(),
            "model": attr.model,
            "url": attr.ollama_url,
        },
    }


@router.get("/voices")
async def list_voices():
    """List available voice palette."""
    profiler = _get_voice_profiler()
    return {
        "available_voices": profiler.get_available_voices(),
        "current_assignments": profiler.get_all_assignments(),
    }


@router.post("/voices/assign")
async def assign_voice(assignment: VoiceAssignment):
    """Manually reassign a character's voice."""
    profiler = _get_voice_profiler()
    available = profiler.get_available_voices()

    if assignment.new_voice_id not in available.values():
        raise HTTPException(
            status_code=400,
            detail=f"Invalid voice ID. Available: {list(available.values())}",
        )

    profiler.assign_voice(assignment.character_id, assignment.new_voice_id)
    return {
        "message": f"Voice for '{assignment.character_id}' set to '{assignment.new_voice_id}'",
    }


@router.get("/characters/{chapter_id}")
async def get_characters(chapter_id: str):
    """Get character roster for a parsed chapter."""
    if chapter_id not in _chapters:
        raise HTTPException(status_code=404, detail="Chapter not found")

    parsed = _chapters[chapter_id].get("parsed")
    if parsed is None:
        raise HTTPException(
            status_code=400,
            detail="Chapter not yet parsed.",
        )

    # Build character info
    char_counts: dict[str, int] = {}
    char_names: dict[str, str] = {}
    char_voices: dict[str, str] = {}

    for seg in parsed.segments:
        if seg.speaker_id and seg.speaker_id != "narrator":
            char_counts[seg.speaker_id] = char_counts.get(seg.speaker_id, 0) + 1
            char_names[seg.speaker_id] = seg.speaker_name
            char_voices[seg.speaker_id] = seg.assigned_voice_id

    characters = [
        CharacterInfo(
            character_id=cid,
            character_name=char_names[cid],
            assigned_voice_id=char_voices[cid],
            segment_count=char_counts[cid],
        )
        for cid in char_counts
    ]

    return {"characters": [c.model_dump() for c in characters]}
