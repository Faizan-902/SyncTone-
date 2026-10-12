-- ==============================================================================
-- SyncTone — PostgreSQL Database Initialization Script
-- ==============================================================================

-- Enable UUID generation support extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Log successful initialization
DO $$
BEGIN
    RAISE NOTICE 'SyncTone PostgreSQL initialized with UUID extensions.';
END $$;
