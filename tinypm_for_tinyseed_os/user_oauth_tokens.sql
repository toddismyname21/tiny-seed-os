-- =============================================================================
-- TinyPM User OAuth Tokens Table
-- =============================================================================
-- Stores OAuth tokens for Google Calendar + Gmail integration.
--
-- ONE-CLICK OAuth Flow:
-- 1. User clicks "Connect Google"
-- 2. Authorizes Calendar + Gmail
-- 3. Tokens stored here
-- 4. Calendar and Email start working immediately
--
-- SECURITY:
-- - Row Level Security enabled
-- - Users can only access their own tokens
-- - Tokens are encrypted at rest (Supabase default)
-- - Only calendar/gmail scopes allowed (enforced in code)
--
-- Created: 2026-01-30
-- Author: Backend_Agent
-- =============================================================================

-- Create the user OAuth tokens table
CREATE TABLE IF NOT EXISTS user_oauth_tokens (
    -- UUID primary key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- User ID (references Supabase auth.users if using Supabase Auth)
    -- For local dev, can be any string identifier
    user_id TEXT NOT NULL,

    -- OAuth provider (e.g., 'google')
    provider TEXT NOT NULL DEFAULT 'google',

    -- OAuth tokens
    access_token TEXT,
    refresh_token TEXT,

    -- Token expiration timestamp
    token_expiry TIMESTAMPTZ,

    -- Granted scopes (array of scope strings)
    scopes TEXT[] DEFAULT '{}',

    -- Audit timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Unique constraint: one token set per user per provider
    UNIQUE(user_id, provider)
);

-- =============================================================================
-- Comments
-- =============================================================================

COMMENT ON TABLE user_oauth_tokens IS
    'OAuth tokens for external services (Google Calendar, Gmail). One row per user per provider.';

COMMENT ON COLUMN user_oauth_tokens.user_id IS
    'User identifier - can be Supabase auth.users UUID or custom ID';

COMMENT ON COLUMN user_oauth_tokens.provider IS
    'OAuth provider name (google, microsoft, etc.)';

COMMENT ON COLUMN user_oauth_tokens.access_token IS
    'Short-lived access token for API calls (~1 hour)';

COMMENT ON COLUMN user_oauth_tokens.refresh_token IS
    'Long-lived refresh token for getting new access tokens';

COMMENT ON COLUMN user_oauth_tokens.token_expiry IS
    'When the access_token expires (refresh before this time)';

COMMENT ON COLUMN user_oauth_tokens.scopes IS
    'Array of OAuth scopes granted by user';

-- =============================================================================
-- Row Level Security
-- =============================================================================

-- Enable RLS
ALTER TABLE user_oauth_tokens ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own tokens
-- (For Supabase Auth users - auth.uid() returns the logged-in user's ID)
CREATE POLICY "Users can view own tokens"
    ON user_oauth_tokens
    FOR SELECT
    USING (
        auth.uid()::text = user_id
        OR user_id = current_setting('app.current_user_id', true)
    );

-- Policy: Users can insert their own tokens
CREATE POLICY "Users can insert own tokens"
    ON user_oauth_tokens
    FOR INSERT
    WITH CHECK (
        auth.uid()::text = user_id
        OR user_id = current_setting('app.current_user_id', true)
    );

-- Policy: Users can update their own tokens
CREATE POLICY "Users can update own tokens"
    ON user_oauth_tokens
    FOR UPDATE
    USING (
        auth.uid()::text = user_id
        OR user_id = current_setting('app.current_user_id', true)
    )
    WITH CHECK (
        auth.uid()::text = user_id
        OR user_id = current_setting('app.current_user_id', true)
    );

-- Policy: Users can delete their own tokens
CREATE POLICY "Users can delete own tokens"
    ON user_oauth_tokens
    FOR DELETE
    USING (
        auth.uid()::text = user_id
        OR user_id = current_setting('app.current_user_id', true)
    );

-- =============================================================================
-- Alternative: Simple allow-all policy for development
-- =============================================================================
-- Uncomment this and comment out the above policies for easier development:
--
-- CREATE POLICY "Allow all for development"
--     ON user_oauth_tokens
--     FOR ALL
--     USING (true)
--     WITH CHECK (true);

-- =============================================================================
-- Indexes
-- =============================================================================

-- Index for looking up tokens by user and provider
CREATE INDEX IF NOT EXISTS idx_user_oauth_tokens_user_provider
    ON user_oauth_tokens(user_id, provider);

-- Index for finding expired tokens (for cleanup jobs)
CREATE INDEX IF NOT EXISTS idx_user_oauth_tokens_expiry
    ON user_oauth_tokens(token_expiry);

-- Index for updated_at (for sync queries)
CREATE INDEX IF NOT EXISTS idx_user_oauth_tokens_updated
    ON user_oauth_tokens(updated_at);

-- =============================================================================
-- Trigger: Auto-update updated_at timestamp
-- =============================================================================

-- Create or replace the trigger function
CREATE OR REPLACE FUNCTION update_user_oauth_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS user_oauth_tokens_updated_at ON user_oauth_tokens;
CREATE TRIGGER user_oauth_tokens_updated_at
    BEFORE UPDATE ON user_oauth_tokens
    FOR EACH ROW
    EXECUTE FUNCTION update_user_oauth_tokens_updated_at();

-- =============================================================================
-- Helper Functions
-- =============================================================================

-- Function to check if a user has connected a provider
CREATE OR REPLACE FUNCTION is_provider_connected(p_user_id TEXT, p_provider TEXT DEFAULT 'google')
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_oauth_tokens
        WHERE user_id = p_user_id
        AND provider = p_provider
        AND refresh_token IS NOT NULL
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get token expiry status
CREATE OR REPLACE FUNCTION get_token_expiry_status(p_user_id TEXT, p_provider TEXT DEFAULT 'google')
RETURNS TABLE(
    is_expired BOOLEAN,
    expires_in_minutes INTEGER,
    needs_refresh BOOLEAN
) AS $$
DECLARE
    v_expiry TIMESTAMPTZ;
BEGIN
    SELECT token_expiry INTO v_expiry
    FROM user_oauth_tokens
    WHERE user_id = p_user_id AND provider = p_provider;

    IF v_expiry IS NULL THEN
        RETURN QUERY SELECT NULL::BOOLEAN, NULL::INTEGER, NULL::BOOLEAN;
        RETURN;
    END IF;

    RETURN QUERY SELECT
        v_expiry < NOW() AS is_expired,
        EXTRACT(EPOCH FROM (v_expiry - NOW()))::INTEGER / 60 AS expires_in_minutes,
        v_expiry < NOW() + INTERVAL '5 minutes' AS needs_refresh;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up expired tokens (without refresh tokens)
CREATE OR REPLACE FUNCTION cleanup_expired_oauth_tokens()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete tokens that are expired and have no refresh token
    DELETE FROM user_oauth_tokens
    WHERE token_expiry < NOW() - INTERVAL '1 day'
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
--     column_name,
--     data_type,
--     is_nullable,
--     column_default
-- FROM information_schema.columns
-- WHERE table_name = 'user_oauth_tokens'
-- ORDER BY ordinal_position;
--
-- Check RLS policies:
-- SELECT * FROM pg_policies WHERE tablename = 'user_oauth_tokens';
