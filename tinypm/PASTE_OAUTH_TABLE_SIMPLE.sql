CREATE TABLE IF NOT EXISTS tinypm_oauth_tokens (
    id TEXT PRIMARY KEY,
    access_token TEXT,
    refresh_token TEXT,
    token_type TEXT DEFAULT 'Bearer',
    scope TEXT,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE tinypm_oauth_tokens IS 'TinyPM OAuth tokens - SEPARATE from Tiny Seed OS. Only calendar/gmail scopes allowed.';

ALTER TABLE tinypm_oauth_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all tinypm_oauth"
    ON tinypm_oauth_tokens
    FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_tinypm_oauth_expires
    ON tinypm_oauth_tokens(expires_at);

CREATE INDEX IF NOT EXISTS idx_tinypm_oauth_updated
    ON tinypm_oauth_tokens(updated_at);

CREATE OR REPLACE FUNCTION update_tinypm_oauth_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tinypm_oauth_updated_at ON tinypm_oauth_tokens;
CREATE TRIGGER tinypm_oauth_updated_at
    BEFORE UPDATE ON tinypm_oauth_tokens
    FOR EACH ROW
    EXECUTE FUNCTION update_tinypm_oauth_updated_at();
