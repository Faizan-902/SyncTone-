"""SQLAlchemy 2.0 ORM models for SyncTone PostgreSQL relational core."""

import uuid
from datetime import datetime
from typing import Optional, List

from sqlalchemy import (
    String,
    Text,
    Boolean,
    Integer,
    Float,
    ForeignKey,
    DateTime,
    UniqueConstraint,
    CheckConstraint,
    Index,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.db.base import Base


# ==============================================================================
# 1. Users Table (Authentication & RBAC)
# ==============================================================================
class User(Base):
    """Registered user accounts with role-based access control."""
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=func.gen_random_uuid(),
    )
    username: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="reader",
        server_default="reader",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    __table_args__ = (
        CheckConstraint("role IN ('reader', 'writer', 'admin')", name="chk_users_role"),
    )

    # Relationships
    novels: Mapped[List["Novel"]] = relationship("Novel", back_populates="uploader", cascade="all, delete-orphan")
    synthesis_jobs: Mapped[List["SynthesisJob"]] = relationship("SynthesisJob", back_populates="requester")
    playback_history: Mapped[List["PlaybackHistory"]] = relationship("PlaybackHistory", back_populates="user", cascade="all, delete-orphan")


# ==============================================================================
# 2. Voices Table (Kokoro-82M Voice Catalog)
# ==============================================================================
class Voice(Base):
    """Neural voice models and acoustic profile metadata."""
    __tablename__ = "voices"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    label: Mapped[str] = mapped_column(String(100), nullable=False)
    gender: Mapped[str] = mapped_column(String(10), nullable=False)
    age_band: Mapped[str] = mapped_column(
        String(10),
        nullable=False,
        default="adult",
        server_default="adult",
    )
    language: Mapped[str] = mapped_column(
        String(10),
        nullable=False,
        default="en-us",
        server_default="en-us",
    )
    reserved_narrator: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default="false",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    __table_args__ = (
        CheckConstraint("gender IN ('male', 'female')", name="chk_voices_gender"),
        CheckConstraint("age_band IN ('child', 'young', 'adult', 'elder')", name="chk_voices_age_band"),
    )

    # Relationships
    characters: Mapped[List["Character"]] = relationship("Character", back_populates="voice")


# ==============================================================================
# 3. Novels Table (Catalog & Portfolio Metadata)
# ==============================================================================
class Novel(Base):
    """Novels ingested into the library catalog."""
    __tablename__ = "novels"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=func.gen_random_uuid(),
    )
    added_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    synopsis: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    channel: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="verified",
        server_default="verified",
    )
    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="draft",
        server_default="draft",
    )
    global_tone: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    portfolio_source: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="ai",
        server_default="ai",
    )
    cover_object: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    __table_args__ = (
        CheckConstraint("channel IN ('verified', 'community')", name="chk_novels_channel"),
        CheckConstraint("status IN ('draft', 'profiling', 'published', 'archived')", name="chk_novels_status"),
        CheckConstraint("portfolio_source IN ('manual', 'ai')", name="chk_novels_portfolio_source"),
    )

    # Relationships
    uploader: Mapped["User"] = relationship("User", back_populates="novels")
    chapters: Mapped[List["Chapter"]] = relationship("Chapter", back_populates="novel", cascade="all, delete-orphan")
    characters: Mapped[List["Character"]] = relationship("Character", back_populates="novel", cascade="all, delete-orphan")
    aliases: Mapped[List["CharacterAlias"]] = relationship("CharacterAlias", back_populates="novel", cascade="all, delete-orphan")
    synthesis_jobs: Mapped[List["SynthesisJob"]] = relationship("SynthesisJob", back_populates="novel", cascade="all, delete-orphan")
    playback_history: Mapped[List["PlaybackHistory"]] = relationship("PlaybackHistory", back_populates="novel", cascade="all, delete-orphan")


# ==============================================================================
# 4. Chapters Table (Metadata & Swift Audio Reference)
# ==============================================================================
class Chapter(Base):
    """Chapter metadata, audio versioning, and Swift audio object pointer."""
    __tablename__ = "chapters"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=func.gen_random_uuid(),
    )
    novel_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("novels.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    chapter_number: Mapped[int] = mapped_column(Integer, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False, default="", server_default="")
    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="draft",
        server_default="draft",
    )
    audio_version: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=1,
        server_default="1",
    )
    swift_audio_object: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    total_duration_ms: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        server_default="0",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    __table_args__ = (
        UniqueConstraint("novel_id", "chapter_number", name="uq_chapters_novel_chapter_number"),
        CheckConstraint("chapter_number > 0", name="chk_chapters_chapter_number"),
        CheckConstraint(
            "status IN ('draft', 'parsed', 'synthesizing', 'completed', 'outdated', 'failed')",
            name="chk_chapters_status",
        ),
    )

    # Relationships
    novel: Mapped["Novel"] = relationship("Novel", back_populates="chapters")
    synthesis_jobs: Mapped[List["SynthesisJob"]] = relationship("SynthesisJob", back_populates="chapter", cascade="all, delete-orphan")
    playback_history: Mapped[List["PlaybackHistory"]] = relationship("PlaybackHistory", back_populates="chapter", cascade="all, delete-orphan")


# ==============================================================================
# 5. Characters Table (Grounded Character Cast Portfolio)
# ==============================================================================
class Character(Base):
    """Discovered or manually specified character personas and assigned voices."""
    __tablename__ = "characters"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=func.gen_random_uuid(),
    )
    novel_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("novels.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    canonical_name: Mapped[str] = mapped_column(String(100), nullable=False)
    gender: Mapped[str] = mapped_column(
        String(10),
        nullable=False,
        default="unknown",
        server_default="unknown",
    )
    age_band: Mapped[str] = mapped_column(
        String(10),
        nullable=False,
        default="adult",
        server_default="adult",
    )
    temperament: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    sample_quote: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    voice_id: Mapped[Optional[str]] = mapped_column(
        String(64),
        ForeignKey("voices.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    speed_multiplier: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        default=1.0,
        server_default="1.0",
    )
    is_narrator: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default="false",
    )
    needs_review: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default="false",
    )
    source: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="ai",
        server_default="ai",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    __table_args__ = (
        UniqueConstraint("novel_id", "canonical_name", name="uq_characters_novel_canonical_name"),
        CheckConstraint("gender IN ('male', 'female', 'unknown')", name="chk_characters_gender"),
        CheckConstraint("age_band IN ('child', 'young', 'adult', 'elder')", name="chk_characters_age_band"),
        CheckConstraint("source IN ('manual', 'ai')", name="chk_characters_source"),
        CheckConstraint("speed_multiplier >= 0.5 AND speed_multiplier <= 2.0", name="chk_characters_speed_multiplier"),
        # Partial unique index: at most one narrator per novel
        Index(
            "uq_characters_narrator_per_novel",
            "novel_id",
            unique=True,
            postgresql_where=(is_narrator.is_(True)),
        ),
    )

    # Relationships
    novel: Mapped["Novel"] = relationship("Novel", back_populates="characters")
    voice: Mapped[Optional["Voice"]] = relationship("Voice", back_populates="characters")
    aliases: Mapped[List["CharacterAlias"]] = relationship("CharacterAlias", back_populates="character", cascade="all, delete-orphan")


# ==============================================================================
# 6. Character Aliases Table (Normalization for Attribution Resolution)
# ==============================================================================
class CharacterAlias(Base):
    """Maps name variations (e.g., 'Harry', 'Potter', 'Mr Potter') to canonical character."""
    __tablename__ = "character_aliases"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=func.gen_random_uuid(),
    )
    novel_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("novels.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    character_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("characters.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    alias: Mapped[str] = mapped_column(String(100), nullable=False)

    __table_args__ = (
        UniqueConstraint("novel_id", "alias", name="uq_character_aliases_novel_alias"),
    )

    # Relationships
    novel: Mapped["Novel"] = relationship("Novel", back_populates="aliases")
    character: Mapped["Character"] = relationship("Character", back_populates="aliases")


# ==============================================================================
# 7. Synthesis Jobs Table (PostgreSQL Task Queue with SKIP LOCKED)
# ==============================================================================
class SynthesisJob(Base):
    """Task queue broker table for asynchronous AI profiling and TTS chapter synthesis."""
    __tablename__ = "synthesis_jobs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=func.gen_random_uuid(),
    )
    novel_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("novels.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    chapter_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("chapters.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    requested_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    job_type: Mapped[str] = mapped_column(String(30), nullable=False)
    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="queued",
        server_default="queued",
    )
    progress_pct: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        default=0.0,
        server_default="0.0",
    )
    attempts: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        server_default="0",
    )
    max_attempts: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=3,
        server_default="3",
    )
    run_after: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    worker_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    locked_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        CheckConstraint("job_type IN ('profile_novel', 'synthesize_chapter')", name="chk_jobs_job_type"),
        CheckConstraint("status IN ('queued', 'processing', 'completed', 'failed')", name="chk_jobs_status"),
        CheckConstraint(
            "(job_type = 'profile_novel' AND chapter_id IS NULL) OR "
            "(job_type = 'synthesize_chapter' AND chapter_id IS NOT NULL)",
            name="chk_jobs_type_chapter_match",
        ),
        # Composite index powering high-concurrency FOR UPDATE SKIP LOCKED job claims
        Index("idx_synthesis_jobs_claim", "status", "run_after", "attempts"),
    )

    # Relationships
    novel: Mapped["Novel"] = relationship("Novel", back_populates="synthesis_jobs")
    chapter: Mapped[Optional["Chapter"]] = relationship("Chapter", back_populates="synthesis_jobs")
    requester: Mapped[Optional["User"]] = relationship("User", back_populates="synthesis_jobs")


# ==============================================================================
# 8. Segment Audio Cache Table (LRU Lookup for Synthesized PCM Chunks)
# ==============================================================================
class SegmentAudioCache(Base):
    """Metadata index for cached raw PCM audio buffers on local worker volume."""
    __tablename__ = "segment_audio_cache"

    text_hash: Mapped[str] = mapped_column(String(64), primary_key=True)
    voice_hash: Mapped[str] = mapped_column(String(64), primary_key=True)
    local_pcm_path: Mapped[str] = mapped_column(String(512), nullable=False)
    n_samples: Mapped[int] = mapped_column(Integer, nullable=False)
    sample_rate: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=24000,
        server_default="24000",
    )
    last_used_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    __table_args__ = (
        Index("idx_segment_audio_cache_lru", "last_used_at"),
    )


# ==============================================================================
# 9. Playback History Table (User Resume Progress)
# ==============================================================================
class PlaybackHistory(Base):
    """Persistent playback state and reading progress tracked per user per novel."""
    __tablename__ = "playback_history"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=func.gen_random_uuid(),
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    novel_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("novels.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    chapter_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("chapters.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    segment_order: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        server_default="0",
    )
    position_ms: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        server_default="0",
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    __table_args__ = (
        # Unique constraint on (user_id, novel_id) guarantees clean atomic upserts
        UniqueConstraint("user_id", "novel_id", name="uq_playback_history_user_novel"),
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="playback_history")
    novel: Mapped["Novel"] = relationship("Novel", back_populates="playback_history")
    chapter: Mapped["Chapter"] = relationship("Chapter", back_populates="playback_history")
