"""Database module for SyncTone PostgreSQL models and session management."""

from app.db.base import Base
from app.db.session import engine, async_engine, get_db, get_async_db
from app.db.models import (
    User,
    Voice,
    Novel,
    Chapter,
    Character,
    CharacterAlias,
    SynthesisJob,
    SegmentAudioCache,
    PlaybackHistory,
)

__all__ = [
    "Base",
    "engine",
    "async_engine",
    "get_db",
    "get_async_db",
    "User",
    "Voice",
    "Novel",
    "Chapter",
    "Character",
    "CharacterAlias",
    "SynthesisJob",
    "SegmentAudioCache",
    "PlaybackHistory",
]
