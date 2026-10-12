-- ==============================================================================
-- SyncTone — PostgreSQL Database Container Pre-Flight Initialization Script
-- Auto-executed by the Postgres official entrypoint during first container boot.
-- ==============================================================================
-- NOTE: Application tables, indexes, views, and seed data are canonically
-- managed and migrated by Alembic (novel-audio-synthesizer/backend/alembic).
-- This script ONLY installs required system extensions prior to Alembic migrations.
-- ==============================================================================

-- 0. Enable UUID generation and cryptographic hashing extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Log readiness for Alembic migrations
DO $$
BEGIN
    RAISE NOTICE 'SyncTone PostgreSQL container initialized with uuid-ossp and pgcrypto extensions. Ready for Alembic migrations.';
END $$;
