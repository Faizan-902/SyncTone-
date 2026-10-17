-- ==============================================================================
-- SyncTone — Standalone SQL Schema Reference / Manual Alternative (0001)
-- ==============================================================================
-- IMPORTANT NOTICE:
-- The canonical source of schema truth and migration runner for SyncTone is 
-- Alembic (located at: novel-audio-synthesizer/kokoro-tts-backend/alembic).
--
-- This raw SQL file is provided SOLELY as an alternative reference for manual 
-- inspection or standalone psql execution where Python is not available.
--
-- DO NOT RUN THIS SCRIPT IN ADDITION TO ALEMBIC MIGRATIONS.
-- Executing this script alongside `alembic upgrade head` will result in duplicate
-- object conflicts or desynchronized `alembic_version` state.
-- ==============================================================================

-- 0. Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Users Table (Authentication & RBAC)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'reader' CHECK (role IN ('reader', 'writer', 'admin')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_users_username ON users(username);
CREATE INDEX IF NOT EXISTS ix_users_email ON users(email);

-- 2. Voices Table (Kokoro-82M Voice Catalog)
CREATE TABLE IF NOT EXISTS voices (
    id VARCHAR(64) PRIMARY KEY,
    label VARCHAR(100) NOT NULL,
    gender VARCHAR(10) NOT NULL CHECK (gender IN ('male', 'female')),
    age_band VARCHAR(10) NOT NULL DEFAULT 'adult' CHECK (age_band IN ('child', 'young', 'adult', 'elder')),
    language VARCHAR(10) NOT NULL DEFAULT 'en-us',
    reserved_narrator BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Novels Table (Catalog & Portfolio Metadata)
CREATE TABLE IF NOT EXISTS novels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    added_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    synopsis TEXT,
    channel VARCHAR(20) NOT NULL DEFAULT 'verified' CHECK (channel IN ('verified', 'community')),
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'profiling', 'published', 'archived')),
    global_tone VARCHAR(100),
    portfolio_source VARCHAR(20) NOT NULL DEFAULT 'ai' CHECK (portfolio_source IN ('manual', 'ai')),
    cover_object VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_novels_added_by ON novels(added_by);

-- 4. Chapters Table (Metadata & Swift Audio Reference)
CREATE TABLE IF NOT EXISTS chapters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    novel_id UUID NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
    chapter_number INTEGER NOT NULL CHECK (chapter_number > 0),
    title VARCHAR(255) NOT NULL DEFAULT '',
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (
        status IN ('draft', 'parsed', 'synthesizing', 'completed', 'outdated', 'failed')
    ),
    audio_version INTEGER NOT NULL DEFAULT 1,
    swift_audio_object VARCHAR(512),
    total_duration_ms INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_chapters_novel_chapter_number UNIQUE (novel_id, chapter_number)
);

CREATE INDEX IF NOT EXISTS ix_chapters_novel_id ON chapters(novel_id);

-- 5. Characters Table (Grounded Character Cast Portfolio)
CREATE TABLE IF NOT EXISTS characters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    novel_id UUID NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
    canonical_name VARCHAR(100) NOT NULL,
    gender VARCHAR(10) NOT NULL DEFAULT 'unknown' CHECK (gender IN ('male', 'female', 'unknown')),
    age_band VARCHAR(10) NOT NULL DEFAULT 'adult' CHECK (age_band IN ('child', 'young', 'adult', 'elder')),
    temperament VARCHAR(100),
    sample_quote TEXT,
    voice_id VARCHAR(64) REFERENCES voices(id) ON DELETE SET NULL,
    speed_multiplier REAL NOT NULL DEFAULT 1.0 CHECK (speed_multiplier >= 0.5 AND speed_multiplier <= 2.0),
    is_narrator BOOLEAN NOT NULL DEFAULT false,
    needs_review BOOLEAN NOT NULL DEFAULT false,
    source VARCHAR(20) NOT NULL DEFAULT 'ai' CHECK (source IN ('manual', 'ai')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_characters_novel_canonical_name UNIQUE (novel_id, canonical_name)
);

CREATE INDEX IF NOT EXISTS ix_characters_novel_id ON characters(novel_id);
CREATE INDEX IF NOT EXISTS ix_characters_voice_id ON characters(voice_id);

-- Partial Unique Index: At most one narrator per novel
CREATE UNIQUE INDEX IF NOT EXISTS uq_characters_narrator_per_novel 
ON characters(novel_id) WHERE is_narrator = true;

-- 6. Character Aliases Table (Normalization for Attribution Resolution)
CREATE TABLE IF NOT EXISTS character_aliases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    novel_id UUID NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
    character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    alias VARCHAR(100) NOT NULL,
    CONSTRAINT uq_character_aliases_novel_alias UNIQUE (novel_id, alias)
);

CREATE INDEX IF NOT EXISTS ix_character_aliases_character_id ON character_aliases(character_id);
CREATE INDEX IF NOT EXISTS ix_character_aliases_novel_id ON character_aliases(novel_id);

-- 7. Synthesis Jobs Table (Task Queue with SKIP LOCKED)
CREATE TABLE IF NOT EXISTS synthesis_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    novel_id UUID NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
    chapter_id UUID REFERENCES chapters(id) ON DELETE CASCADE,
    requested_by UUID REFERENCES users(id) ON DELETE SET NULL,
    job_type VARCHAR(30) NOT NULL CHECK (job_type IN ('profile_novel', 'synthesize_chapter')),
    status VARCHAR(20) NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
    progress_pct REAL NOT NULL DEFAULT 0.0,
    attempts INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 3,
    run_after TIMESTAMPTZ NOT NULL DEFAULT now(),
    worker_id VARCHAR(100),
    locked_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ,
    CONSTRAINT chk_jobs_type_chapter_match CHECK (
        (job_type = 'profile_novel' AND chapter_id IS NULL) OR
        (job_type = 'synthesize_chapter' AND chapter_id IS NOT NULL)
    )
);

-- Index for atomic FOR UPDATE SKIP LOCKED job worker polling
CREATE INDEX IF NOT EXISTS idx_synthesis_jobs_claim ON synthesis_jobs(status, run_after, attempts);
CREATE INDEX IF NOT EXISTS ix_synthesis_jobs_novel_id ON synthesis_jobs(novel_id);
CREATE INDEX IF NOT EXISTS ix_synthesis_jobs_chapter_id ON synthesis_jobs(chapter_id);
CREATE INDEX IF NOT EXISTS ix_synthesis_jobs_requested_by ON synthesis_jobs(requested_by);

-- 8. Segment Audio Cache Table (LRU Lookup for Synthesized PCM Buffers)
CREATE TABLE IF NOT EXISTS segment_audio_cache (
    text_hash VARCHAR(64) NOT NULL,
    voice_hash VARCHAR(64) NOT NULL,
    local_pcm_path VARCHAR(512) NOT NULL,
    n_samples INTEGER NOT NULL,
    sample_rate INTEGER NOT NULL DEFAULT 24000,
    last_used_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (text_hash, voice_hash)
);

CREATE INDEX IF NOT EXISTS idx_segment_audio_cache_lru ON segment_audio_cache(last_used_at);

-- 9. Playback History Table (User Resume Progress)
CREATE TABLE IF NOT EXISTS playback_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    novel_id UUID NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
    chapter_id UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
    segment_order INTEGER NOT NULL DEFAULT 0,
    position_ms INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_playback_history_user_novel UNIQUE (user_id, novel_id)
);

CREATE INDEX IF NOT EXISTS ix_playback_history_user_id ON playback_history(user_id);
CREATE INDEX IF NOT EXISTS ix_playback_history_novel_id ON playback_history(novel_id);
CREATE INDEX IF NOT EXISTS ix_playback_history_chapter_id ON playback_history(chapter_id);

-- 10. Compatibility View: reading_progress -> playback_history
CREATE OR REPLACE VIEW reading_progress AS SELECT * FROM playback_history;

-- 11. Seed Unified Voice Catalog (Edge Neural + Kokoro Fallback)
INSERT INTO voices (id, label, gender, age_band, language, reserved_narrator) VALUES
('am_adam', 'Adam (Narrator Default)', 'male', 'adult', 'en-us', true),
('af_heart', 'Heart (Warm & Expressive)', 'female', 'adult', 'en-us', false),
('af_bella', 'Bella (Lively & Clear)', 'female', 'adult', 'en-us', false),
('af_nicole', 'Nicole (Youthful)', 'female', 'young', 'en-us', false),
('af_sarah', 'Sarah (Mature)', 'female', 'elder', 'en-us', false),
('am_michael', 'Michael (Strong & Resonant)', 'male', 'adult', 'en-us', false),
('am_george', 'George (Deep & Mature)', 'male', 'elder', 'en-us', false),
('am_onyx', 'Onyx (Deep Male)', 'male', 'adult', 'en-us', false),
('af_sky', 'Sky (Calm Female)', 'female', 'adult', 'en-us', false),
('bm_george', 'George (British Received)', 'male', 'adult', 'en-gb', false),
('bf_emma', 'Emma (British Refined)', 'female', 'young', 'en-gb', false),
('bm_daniel', 'Daniel (British Expressive)', 'male', 'young', 'en-gb', false),
('en-GB-RyanNeural', 'Ryan Neural (British Narrator)', 'male', 'adult', 'en-gb', true),
('en-GB-ThomasNeural', 'Thomas Neural (Harry Potter)', 'male', 'young', 'en-gb', false),
('en-GB-LibbyNeural', 'Libby Neural (Hermione Granger)', 'female', 'young', 'en-gb', false),
('en-GB-AlfieNeural', 'Alfie Neural (Ron Weasley)', 'male', 'young', 'en-gb', false),
('en-GB-ArthurNeural', 'Arthur Neural (Albus Dumbledore)', 'male', 'elder', 'en-gb', false),
('en-GB-NoahNeural', 'Noah Neural (Severus Snape)', 'male', 'adult', 'en-gb', false),
('en-GB-SoniaNeural', 'Sonia Neural (Prof. McGonagall)', 'female', 'adult', 'en-gb', false),
('en-GB-OliverNeural', 'Oliver Neural (Draco Malfoy)', 'male', 'young', 'en-gb', false)
ON CONFLICT (id) DO NOTHING;

