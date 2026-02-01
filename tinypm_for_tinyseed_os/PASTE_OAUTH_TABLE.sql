-- =============================================================================
-- TinyPM OAuth Tokens Table
-- =============================================================================
-- SECURITY: This table is SEPARATE from Tiny Seed OS
-- - All IDs are prefixed with 'tpm_' to prevent collision
-- - Only stores calendar + gmail tokens (NOT sheets/drive)
-- - Row Level Security enabled
--
-- Created: 2026-01-30
-- Author: Backend_Agent_8
-- =============================================================================

-- Create the OAuth tokens table
CREATE TABLE IF NOT EXISTS tinypm_oauth_tokens (
    -- Primary key: Prefixed user ID (e.g., 'tpm_user123')
    id TEXT PRIMARY KEY,

    -- OAuth tokens
    access_token TEXT,
    refresh_token TEXT,
    token_type TEXT DEFAULT 'Bearer',

    -- Scope string (space-separated)
    -- MUST NOT contain sheets/drive scopes
    scope TEXT,

    -- Token expiration
    expires_at TIMESTAMPTZ,

    -- Audit timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add comment explaining the table's purpose and security boundaries
COMMENT ON TABLE tinypm_oauth_tokens IS 'TinyPM OAuth tokens - SEPARATE from Tiny Seed OS. Only calendar/gmail scopes allowed.';
COMMENT ON COLUMN tinypm_oauth_tokens.id IS 'Prefixed user ID (tpm_xxx) to prevent collision with other systems';
COMMENT ON COLUMN tinypm_oauth_tokens.scope IS 'OAuth scopes - MUST NOT contain sheets/drive scopes';

-- =============================================================================
-- Row Level Security
-- =============================================================================

-- Enable RLS on the table
ALTER TABLE tinypm_oauth_tokens ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all operations for authenticated users
-- Note: In production, you may want more restrictive policies
CREATE POLICY "Allow all tinypm_oauth"
    ON tinypm_oauth_tokens
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- =============================================================================
-- Indexes
-- =============================================================================

-- Index on expiration for cleanup queries
CREATE INDEX IF NOT EXISTS idx_tinypm_oauth_expires
    ON tinypm_oauth_tokens(expires_at);

-- Index on updated_at for sync queries
CREATE INDEX IF NOT EXISTS idx_tinypm_oauth_updated
    ON tinypm_oauth_tokens(updated_at);

-- =============================================================================
-- Trigger: Auto-update updated_at timestamp
-- =============================================================================

-- Create or replace the trigger function
CREATE OR REPLACE FUNCTION update_tinypm_oauth_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS tinypm_oauth_updated_at ON tinypm_oauth_tokens;
CREATE TRIGGER tinypm_oauth_updated_at
    BEFORE UPDATE ON tinypm_oauth_tokens
    FOR EACH ROW
    EXECUTE FUNCTION update_tinypm_oauth_updated_at();

-- =============================================================================
-- Security: Scope validation function (optional but recommended)
-- =============================================================================

-- This function can be used as a check constraint to ensure
-- no forbidden scopes are stored in the database
CREATE OR REPLACE FUNCTION validate_tinypm_oauth_scopes(scope_string TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    forbidden_patterns TEXT[] := ARRAY[
        'spreadsheets',
        'drive',
        'documents'
    ];
    pattern TEXT;
BEGIN
    IF scope_string IS NULL OR scope_string = '' THEN
        RETURN TRUE;
    END IF;

    FOREACH pattern IN ARRAY forbidden_patterns LOOP
        IF scope_string ILIKE '%' || pattern || '%' THEN
            RETURN FALSE;
        END IF;
    END LOOP;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Add check constraint to prevent forbidden scopes
-- (Uncomment if you want database-level enforcement)
-- ALTER TABLE tinypm_oauth_tokens
--     ADD CONSTRAINT chk_tinypm_oauth_no_forbidden_scopes
--     CHECK (validate_tinypm_oauth_scopes(scope));

-- =============================================================================
-- Cleanup: Function to delete expired tokens
-- =============================================================================

CREATE OR REPLACE FUNCTION cleanup_expired_tinypm_oauth_tokens()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM tinypm_oauth_tokens
    WHERE expires_at < NOW() - INTERVAL '7 days'
      AND refresh_token IS NULL;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- Verification Query
-- =============================================================================
-- Run this to verify the table was created correctly:
--
-- SELECT
--     table_name,
--     column_name,
--     data_type,
--     column_default
-- FROM information_schema.columns
-- WHERE table_name = 'tinypm_oauth_tokens'
-- ORDER BY ordinal_position;
