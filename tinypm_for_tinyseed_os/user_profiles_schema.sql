-- TinyPM User Profiles Schema
-- Run this in the Supabase SQL Editor AFTER supabase_schema.sql
--
-- Created: 2026-01-30
-- Purpose: Store user onboarding data and preferences
--
-- Instructions:
-- 1. Go to https://supabase.com/dashboard
-- 2. Select your project
-- 3. Go to SQL Editor
-- 4. Paste this entire file
-- 5. Click "Run"

-- ============================================
-- USER PROFILES TABLE
-- Stores user preferences from onboarding
-- ============================================
CREATE TABLE IF NOT EXISTS user_profiles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    timezone TEXT DEFAULT 'America/New_York',
    wake_time TEXT DEFAULT '07:00',
    sleep_time TEXT DEFAULT '23:00',
    occupation TEXT,
    work_schedule TEXT,
    productivity_challenge TEXT,
    priorities JSONB DEFAULT '[]',
    reminder_method TEXT DEFAULT 'push',
    checkin_frequency TEXT DEFAULT 'daily',
    communication_tone TEXT DEFAULT 'friendly',
    google_connected BOOLEAN DEFAULT FALSE,
    first_goal TEXT,
    onboarding_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for finding active users
CREATE INDEX IF NOT EXISTS idx_user_profiles_onboarding ON user_profiles(onboarding_completed);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Allow all operations for now (single user)
-- TODO: Restrict to authenticated user when adding auth
CREATE POLICY "Allow all user_profiles" ON user_profiles FOR ALL USING (true);

-- ============================================
-- AUTO-UPDATE TIMESTAMP
-- ============================================
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- VERIFICATION
-- ============================================
-- SELECT * FROM user_profiles;
