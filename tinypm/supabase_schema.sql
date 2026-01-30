-- TinyPM Supabase Schema
-- Run this in the Supabase SQL Editor
--
-- Created: 2026-01-30
-- Author: Backend_Agent_7
-- Purpose: Database schema for TinyPM cloud persistence
--
-- Instructions:
-- 1. Go to https://supabase.com/dashboard
-- 2. Select your project
-- 3. Go to SQL Editor
-- 4. Paste this entire file
-- 5. Click "Run"

-- ============================================
-- TASKS TABLE
-- Stores all task board items
-- ============================================
CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'pending',
    priority TEXT DEFAULT 'medium',
    role TEXT DEFAULT 'builder',
    context JSONB DEFAULT '[]',
    notes JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    due_date TIMESTAMPTZ,
    progress INTEGER DEFAULT 0,
    progress_label TEXT,
    agent_id TEXT
);

-- Index for filtering by status (most common query)
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);

-- Index for filtering by priority
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);

-- Index for filtering by role
CREATE INDEX IF NOT EXISTS idx_tasks_role ON tasks(role);

-- Index for sorting by due date
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);

-- ============================================
-- MEMORY TABLE
-- Key-value store for PM memory (Mem0-style)
-- ============================================
CREATE TABLE IF NOT EXISTS memory (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CONVERSATIONS TABLE
-- Stores chat history for PM interactions
-- ============================================
CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    messages JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for sorting conversations by recency
CREATE INDEX IF NOT EXISTS idx_conversations_updated ON conversations(updated_at DESC);

-- ============================================
-- CHECKPOINTS TABLE
-- For LangGraph durable execution
-- Allows resuming from any checkpoint on crash
-- ============================================
CREATE TABLE IF NOT EXISTS checkpoints (
    id TEXT PRIMARY KEY,
    state JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for finding recent checkpoints
CREATE INDEX IF NOT EXISTS idx_checkpoints_created ON checkpoints(created_at DESC);

-- ============================================
-- SUGGESTIONS TABLE
-- Track proactive suggestions and their outcomes
-- Used for confidence calibration
-- ============================================
CREATE TABLE IF NOT EXISTS suggestions (
    id SERIAL PRIMARY KEY,
    suggestion_type TEXT NOT NULL,
    content TEXT NOT NULL,
    confidence REAL,
    action_level TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

-- Index for filtering by status
CREATE INDEX IF NOT EXISTS idx_suggestions_status ON suggestions(status);

-- Index for filtering by type (for accuracy calculation)
CREATE INDEX IF NOT EXISTS idx_suggestions_type ON suggestions(suggestion_type);

-- ============================================
-- STYLE PROFILES TABLE
-- Stores learned user communication styles
-- ============================================
CREATE TABLE IF NOT EXISTS style_profiles (
    id TEXT PRIMARY KEY,
    profile JSONB NOT NULL,
    samples_analyzed INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- Enable for multi-user support later
-- ============================================

-- Enable RLS on all tables
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE style_profiles ENABLE ROW LEVEL SECURITY;

-- Allow all operations for now (single user)
-- TODO: Add user_id column and restrict policies when adding multi-user
CREATE POLICY "Allow all tasks" ON tasks FOR ALL USING (true);
CREATE POLICY "Allow all memory" ON memory FOR ALL USING (true);
CREATE POLICY "Allow all conversations" ON conversations FOR ALL USING (true);
CREATE POLICY "Allow all checkpoints" ON checkpoints FOR ALL USING (true);
CREATE POLICY "Allow all suggestions" ON suggestions FOR ALL USING (true);
CREATE POLICY "Allow all style_profiles" ON style_profiles FOR ALL USING (true);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to tasks table
DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;
CREATE TRIGGER update_tasks_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to memory table
DROP TRIGGER IF EXISTS update_memory_updated_at ON memory;
CREATE TRIGGER update_memory_updated_at
    BEFORE UPDATE ON memory
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to conversations table
DROP TRIGGER IF EXISTS update_conversations_updated_at ON conversations;
CREATE TRIGGER update_conversations_updated_at
    BEFORE UPDATE ON conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to style_profiles table
DROP TRIGGER IF EXISTS update_style_profiles_updated_at ON style_profiles;
CREATE TRIGGER update_style_profiles_updated_at
    BEFORE UPDATE ON style_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- VERIFICATION
-- Run this to check tables were created
-- ============================================

-- Uncomment to verify:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
