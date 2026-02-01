-- ============================================================================
-- TinyPM User Profiles Table
-- ============================================================================
-- INSTRUCTIONS: Copy this entire file and paste it into your Supabase SQL Editor
-- Dashboard > SQL Editor > New Query > Paste > Run
--
-- Created: 2026-01-30
-- Purpose: Stores user profile data with Row Level Security (RLS)
-- ============================================================================

-- Drop existing table if it exists (be careful in production!)
-- DROP TABLE IF EXISTS user_profiles;

-- Create the user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  -- Primary key references auth.users
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Basic info
  name TEXT,
  avatar_url TEXT,

  -- Time preferences
  timezone TEXT DEFAULT 'America/New_York',
  wake_time TIME DEFAULT '06:00',
  sleep_time TIME DEFAULT '22:00',

  -- Work preferences
  work_type TEXT,  -- 'farming', 'office', 'hybrid', 'creative', 'other'
  work_hours TEXT, -- '9-5', 'flexible', 'variable', 'early-bird', 'night-owl'

  -- Productivity settings
  productivity_challenge TEXT,  -- Main challenge user wants to address
  life_priorities TEXT[],       -- Array of priorities like ['family', 'health', 'career']

  -- Notification preferences
  notification_preference TEXT DEFAULT 'balanced', -- 'minimal', 'balanced', 'all'
  checkin_frequency TEXT DEFAULT 'daily',          -- 'twice-daily', 'daily', 'weekly'
  tone_preference TEXT DEFAULT 'professional',     -- 'casual', 'professional', 'motivational'

  -- Onboarding
  first_goal TEXT,                          -- User's first stated goal
  google_connected BOOLEAN DEFAULT FALSE,    -- Has connected Google account
  apple_connected BOOLEAN DEFAULT FALSE,     -- Has connected Apple account
  onboarding_completed BOOLEAN DEFAULT FALSE,
  onboarding_step INTEGER DEFAULT 0,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Settings JSON for flexible additional data
  settings JSONB DEFAULT '{}'::jsonb
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_onboarding
  ON user_profiles(onboarding_completed);

-- ============================================================================
-- Row Level Security (RLS) Policies
-- ============================================================================
-- RLS ensures users can only access their own data

-- Enable RLS on the table
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON user_profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON user_profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- Policy: Users can insert their own profile
CREATE POLICY "Users can insert own profile"
  ON user_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Policy: Users can delete their own profile
CREATE POLICY "Users can delete own profile"
  ON user_profiles
  FOR DELETE
  USING (auth.uid() = id);

-- ============================================================================
-- Trigger: Auto-update updated_at timestamp
-- ============================================================================

-- Create function to update timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to call function on update
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Trigger: Auto-create profile on user signup
-- ============================================================================

-- Function to create profile when user signs up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ============================================================================
-- Verification: Check setup was successful
-- ============================================================================

-- This should return the table structure
SELECT
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_name = 'user_profiles'
ORDER BY ordinal_position;

-- This should show RLS is enabled
SELECT
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'user_profiles';

-- This should show the policies
SELECT
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'user_profiles';

-- ============================================================================
-- Done! Your user_profiles table is ready.
-- ============================================================================
