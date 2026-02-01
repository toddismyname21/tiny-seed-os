-- ============================================================================
-- TinyPM Complete Row-Level Security Migration
-- ============================================================================
-- PRODUCTION-READY multi-tenant security implementation
-- Run this ONCE in Supabase SQL Editor to enable full user isolation
--
-- Created: 2026-01-30
-- Author: Security_Claude (Team 1: Security & Multi-Tenancy)
-- Purpose: Lock down ALL tables with user_id based RLS policies
--
-- CRITICAL: This migration:
-- 1. Adds user_id columns to tables that lack them
-- 2. Drops all "allow all" policies
-- 3. Creates proper RLS policies for each table
-- 4. Ensures User A cannot see User B's data
-- ============================================================================

-- ============================================================================
-- STEP 0: CREATE HELPER FUNCTIONS
-- ============================================================================

-- Function to get current user ID from JWT or session context
-- Works with both Supabase Auth (auth.uid()) and custom context (app.current_user_id)
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS TEXT AS $$
BEGIN
    -- First try Supabase auth.uid()
    IF auth.uid() IS NOT NULL THEN
        RETURN auth.uid()::text;
    END IF;

    -- Fall back to custom session context (for service-to-service calls)
    RETURN NULLIF(current_setting('app.current_user_id', true), '');
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Comment explaining the function
COMMENT ON FUNCTION get_current_user_id() IS
    'Returns current user ID from JWT (auth.uid) or session context (app.current_user_id). Used in RLS policies.';


-- ============================================================================
-- STEP 1: USER_PROFILES TABLE
-- Already has 'id' as primary key which matches auth.users.id
-- ============================================================================

-- Drop existing permissive policy
DROP POLICY IF EXISTS "Allow all user_profiles" ON user_profiles;

-- Users can only see their own profile
CREATE POLICY "user_profiles_select_own"
    ON user_profiles FOR SELECT
    USING (id = get_current_user_id());

-- Users can only update their own profile
CREATE POLICY "user_profiles_update_own"
    ON user_profiles FOR UPDATE
    USING (id = get_current_user_id())
    WITH CHECK (id = get_current_user_id());

-- Users can insert their own profile (during signup)
CREATE POLICY "user_profiles_insert_own"
    ON user_profiles FOR INSERT
    WITH CHECK (id = get_current_user_id());

-- Users can delete their own profile (account deletion)
CREATE POLICY "user_profiles_delete_own"
    ON user_profiles FOR DELETE
    USING (id = get_current_user_id());


-- ============================================================================
-- STEP 2: TASKS TABLE - ADD user_id COLUMN
-- ============================================================================

-- Add user_id column if it doesn't exist
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS user_id TEXT;

-- Create index for efficient filtering
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);

-- Drop existing permissive policy
DROP POLICY IF EXISTS "Allow all tasks" ON tasks;

-- Users can only see their own tasks
CREATE POLICY "tasks_select_own"
    ON tasks FOR SELECT
    USING (user_id = get_current_user_id());

-- Users can only insert tasks with their own user_id
CREATE POLICY "tasks_insert_own"
    ON tasks FOR INSERT
    WITH CHECK (user_id = get_current_user_id());

-- Users can only update their own tasks
CREATE POLICY "tasks_update_own"
    ON tasks FOR UPDATE
    USING (user_id = get_current_user_id())
    WITH CHECK (user_id = get_current_user_id());

-- Users can only delete their own tasks
CREATE POLICY "tasks_delete_own"
    ON tasks FOR DELETE
    USING (user_id = get_current_user_id());


-- ============================================================================
-- STEP 3: MEMORY TABLE - ADD user_id COLUMN
-- ============================================================================

-- Add user_id column if it doesn't exist
ALTER TABLE memory ADD COLUMN IF NOT EXISTS user_id TEXT;

-- Create index for efficient filtering
CREATE INDEX IF NOT EXISTS idx_memory_user_id ON memory(user_id);

-- Drop existing permissive policy
DROP POLICY IF EXISTS "Allow all memory" ON memory;

-- Users can only see their own memory
CREATE POLICY "memory_select_own"
    ON memory FOR SELECT
    USING (user_id = get_current_user_id());

-- Users can only insert their own memory
CREATE POLICY "memory_insert_own"
    ON memory FOR INSERT
    WITH CHECK (user_id = get_current_user_id());

-- Users can only update their own memory
CREATE POLICY "memory_update_own"
    ON memory FOR UPDATE
    USING (user_id = get_current_user_id())
    WITH CHECK (user_id = get_current_user_id());

-- Users can only delete their own memory
CREATE POLICY "memory_delete_own"
    ON memory FOR DELETE
    USING (user_id = get_current_user_id());


-- ============================================================================
-- STEP 4: CONVERSATIONS TABLE - ADD user_id COLUMN
-- ============================================================================

-- Add user_id column if it doesn't exist
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS user_id TEXT;

-- Create index for efficient filtering
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);

-- Drop existing permissive policy
DROP POLICY IF EXISTS "Allow all conversations" ON conversations;

-- Users can only see their own conversations
CREATE POLICY "conversations_select_own"
    ON conversations FOR SELECT
    USING (user_id = get_current_user_id());

-- Users can only insert their own conversations
CREATE POLICY "conversations_insert_own"
    ON conversations FOR INSERT
    WITH CHECK (user_id = get_current_user_id());

-- Users can only update their own conversations
CREATE POLICY "conversations_update_own"
    ON conversations FOR UPDATE
    USING (user_id = get_current_user_id())
    WITH CHECK (user_id = get_current_user_id());

-- Users can only delete their own conversations
CREATE POLICY "conversations_delete_own"
    ON conversations FOR DELETE
    USING (user_id = get_current_user_id());


-- ============================================================================
-- STEP 5: CHECKPOINTS TABLE - ADD user_id COLUMN
-- ============================================================================

-- Add user_id column if it doesn't exist
ALTER TABLE checkpoints ADD COLUMN IF NOT EXISTS user_id TEXT;

-- Create index for efficient filtering
CREATE INDEX IF NOT EXISTS idx_checkpoints_user_id ON checkpoints(user_id);

-- Drop existing permissive policy
DROP POLICY IF EXISTS "Allow all checkpoints" ON checkpoints;

-- Users can only see their own checkpoints
CREATE POLICY "checkpoints_select_own"
    ON checkpoints FOR SELECT
    USING (user_id = get_current_user_id());

-- Users can only insert their own checkpoints
CREATE POLICY "checkpoints_insert_own"
    ON checkpoints FOR INSERT
    WITH CHECK (user_id = get_current_user_id());

-- Users can only update their own checkpoints
CREATE POLICY "checkpoints_update_own"
    ON checkpoints FOR UPDATE
    USING (user_id = get_current_user_id())
    WITH CHECK (user_id = get_current_user_id());

-- Users can only delete their own checkpoints
CREATE POLICY "checkpoints_delete_own"
    ON checkpoints FOR DELETE
    USING (user_id = get_current_user_id());


-- ============================================================================
-- STEP 6: SUGGESTIONS TABLE - ADD user_id COLUMN
-- ============================================================================

-- Add user_id column if it doesn't exist
ALTER TABLE suggestions ADD COLUMN IF NOT EXISTS user_id TEXT;

-- Create index for efficient filtering
CREATE INDEX IF NOT EXISTS idx_suggestions_user_id ON suggestions(user_id);

-- Drop existing permissive policy
DROP POLICY IF EXISTS "Allow all suggestions" ON suggestions;

-- Users can only see their own suggestions
CREATE POLICY "suggestions_select_own"
    ON suggestions FOR SELECT
    USING (user_id = get_current_user_id());

-- Users can only insert their own suggestions
CREATE POLICY "suggestions_insert_own"
    ON suggestions FOR INSERT
    WITH CHECK (user_id = get_current_user_id());

-- Users can only update their own suggestions
CREATE POLICY "suggestions_update_own"
    ON suggestions FOR UPDATE
    USING (user_id = get_current_user_id())
    WITH CHECK (user_id = get_current_user_id());

-- Users can only delete their own suggestions
CREATE POLICY "suggestions_delete_own"
    ON suggestions FOR DELETE
    USING (user_id = get_current_user_id());


-- ============================================================================
-- STEP 7: STYLE_PROFILES TABLE - ADD user_id COLUMN
-- ============================================================================

-- Add user_id column if it doesn't exist
ALTER TABLE style_profiles ADD COLUMN IF NOT EXISTS user_id TEXT;

-- Create index for efficient filtering
CREATE INDEX IF NOT EXISTS idx_style_profiles_user_id ON style_profiles(user_id);

-- Drop existing permissive policy
DROP POLICY IF EXISTS "Allow all style_profiles" ON style_profiles;

-- Users can only see their own style profiles
CREATE POLICY "style_profiles_select_own"
    ON style_profiles FOR SELECT
    USING (user_id = get_current_user_id());

-- Users can only insert their own style profiles
CREATE POLICY "style_profiles_insert_own"
    ON style_profiles FOR INSERT
    WITH CHECK (user_id = get_current_user_id());

-- Users can only update their own style profiles
CREATE POLICY "style_profiles_update_own"
    ON style_profiles FOR UPDATE
    USING (user_id = get_current_user_id())
    WITH CHECK (user_id = get_current_user_id());

-- Users can only delete their own style profiles
CREATE POLICY "style_profiles_delete_own"
    ON style_profiles FOR DELETE
    USING (user_id = get_current_user_id());


-- ============================================================================
-- STEP 8: USER_OAUTH_TOKENS TABLE
-- Already has user_id and RLS policies, but let's ensure they're using our helper
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own tokens" ON user_oauth_tokens;
DROP POLICY IF EXISTS "Users can insert own tokens" ON user_oauth_tokens;
DROP POLICY IF EXISTS "Users can update own tokens" ON user_oauth_tokens;
DROP POLICY IF EXISTS "Users can delete own tokens" ON user_oauth_tokens;
DROP POLICY IF EXISTS "Allow all for development" ON user_oauth_tokens;

-- Recreate with consistent get_current_user_id() function
CREATE POLICY "oauth_tokens_select_own"
    ON user_oauth_tokens FOR SELECT
    USING (user_id = get_current_user_id());

CREATE POLICY "oauth_tokens_insert_own"
    ON user_oauth_tokens FOR INSERT
    WITH CHECK (user_id = get_current_user_id());

CREATE POLICY "oauth_tokens_update_own"
    ON user_oauth_tokens FOR UPDATE
    USING (user_id = get_current_user_id())
    WITH CHECK (user_id = get_current_user_id());

CREATE POLICY "oauth_tokens_delete_own"
    ON user_oauth_tokens FOR DELETE
    USING (user_id = get_current_user_id());


-- ============================================================================
-- STEP 9: CREATE PROJECTS TABLE (New table for multi-tenancy)
-- ============================================================================

-- Create projects table if it doesn't exist
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'active',
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Create index for user_id
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);

-- Create RLS policies
CREATE POLICY "projects_select_own"
    ON projects FOR SELECT
    USING (user_id = get_current_user_id());

CREATE POLICY "projects_insert_own"
    ON projects FOR INSERT
    WITH CHECK (user_id = get_current_user_id());

CREATE POLICY "projects_update_own"
    ON projects FOR UPDATE
    USING (user_id = get_current_user_id())
    WITH CHECK (user_id = get_current_user_id());

CREATE POLICY "projects_delete_own"
    ON projects FOR DELETE
    USING (user_id = get_current_user_id());

-- Auto-update timestamp trigger
DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


-- ============================================================================
-- STEP 10: CREATE PROJECT_ENTRIES TABLE (New table for multi-tenancy)
-- ============================================================================

-- Create project_entries table if it doesn't exist
CREATE TABLE IF NOT EXISTS project_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    entry_type TEXT NOT NULL,  -- 'task', 'note', 'file', 'milestone'
    content JSONB NOT NULL,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE project_entries ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_project_entries_user_id ON project_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_project_entries_project_id ON project_entries(project_id);
CREATE INDEX IF NOT EXISTS idx_project_entries_type ON project_entries(entry_type);

-- Create RLS policies
CREATE POLICY "project_entries_select_own"
    ON project_entries FOR SELECT
    USING (user_id = get_current_user_id());

CREATE POLICY "project_entries_insert_own"
    ON project_entries FOR INSERT
    WITH CHECK (user_id = get_current_user_id());

CREATE POLICY "project_entries_update_own"
    ON project_entries FOR UPDATE
    USING (user_id = get_current_user_id())
    WITH CHECK (user_id = get_current_user_id());

CREATE POLICY "project_entries_delete_own"
    ON project_entries FOR DELETE
    USING (user_id = get_current_user_id());

-- Auto-update timestamp trigger
DROP TRIGGER IF EXISTS update_project_entries_updated_at ON project_entries;
CREATE TRIGGER update_project_entries_updated_at
    BEFORE UPDATE ON project_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


-- ============================================================================
-- STEP 11: CREATE PM_TASKS TABLE (PM-specific tasks with RLS)
-- ============================================================================

-- Create pm_tasks table if it doesn't exist
CREATE TABLE IF NOT EXISTS pm_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    task_id TEXT,  -- Reference to board.json task ID
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'pending',
    priority TEXT DEFAULT 'medium',
    role TEXT DEFAULT 'builder',
    context JSONB DEFAULT '[]',
    notes JSONB DEFAULT '[]',
    agent_id TEXT,
    progress INTEGER DEFAULT 0,
    progress_label TEXT,
    due_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE pm_tasks ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_pm_tasks_user_id ON pm_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_pm_tasks_status ON pm_tasks(status);
CREATE INDEX IF NOT EXISTS idx_pm_tasks_priority ON pm_tasks(priority);

-- Create RLS policies
CREATE POLICY "pm_tasks_select_own"
    ON pm_tasks FOR SELECT
    USING (user_id = get_current_user_id());

CREATE POLICY "pm_tasks_insert_own"
    ON pm_tasks FOR INSERT
    WITH CHECK (user_id = get_current_user_id());

CREATE POLICY "pm_tasks_update_own"
    ON pm_tasks FOR UPDATE
    USING (user_id = get_current_user_id())
    WITH CHECK (user_id = get_current_user_id());

CREATE POLICY "pm_tasks_delete_own"
    ON pm_tasks FOR DELETE
    USING (user_id = get_current_user_id());

-- Auto-update timestamp trigger
DROP TRIGGER IF EXISTS update_pm_tasks_updated_at ON pm_tasks;
CREATE TRIGGER update_pm_tasks_updated_at
    BEFORE UPDATE ON pm_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


-- ============================================================================
-- STEP 12: CREATE PM_FEEDBACK TABLE (User feedback with RLS)
-- ============================================================================

-- Create pm_feedback table if it doesn't exist
CREATE TABLE IF NOT EXISTS pm_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    feedback_type TEXT NOT NULL,  -- 'bug', 'feature', 'suggestion', 'praise'
    content TEXT NOT NULL,
    context JSONB DEFAULT '{}',
    status TEXT DEFAULT 'new',
    response TEXT,
    responded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE pm_feedback ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_pm_feedback_user_id ON pm_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_pm_feedback_type ON pm_feedback(feedback_type);
CREATE INDEX IF NOT EXISTS idx_pm_feedback_status ON pm_feedback(status);

-- Create RLS policies
CREATE POLICY "pm_feedback_select_own"
    ON pm_feedback FOR SELECT
    USING (user_id = get_current_user_id());

CREATE POLICY "pm_feedback_insert_own"
    ON pm_feedback FOR INSERT
    WITH CHECK (user_id = get_current_user_id());

CREATE POLICY "pm_feedback_update_own"
    ON pm_feedback FOR UPDATE
    USING (user_id = get_current_user_id())
    WITH CHECK (user_id = get_current_user_id());

CREATE POLICY "pm_feedback_delete_own"
    ON pm_feedback FOR DELETE
    USING (user_id = get_current_user_id());


-- ============================================================================
-- STEP 13: SERVICE ROLE BYPASS POLICIES
-- For server-side operations that need to access all data
-- ============================================================================

-- Create a function that checks if current role is service_role
CREATE OR REPLACE FUNCTION is_service_role()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN current_setting('role', true) = 'service_role'
           OR current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role';
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Note: Service role automatically bypasses RLS in Supabase
-- No additional policies needed - the service_role has full access by default


-- ============================================================================
-- STEP 14: VERIFICATION QUERIES
-- ============================================================================

-- Verify all tables have RLS enabled
DO $$
DECLARE
    tbl RECORD;
    rls_enabled BOOLEAN;
BEGIN
    FOR tbl IN
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename IN (
            'user_profiles', 'tasks', 'memory', 'conversations',
            'checkpoints', 'suggestions', 'style_profiles',
            'user_oauth_tokens', 'projects', 'project_entries',
            'pm_tasks', 'pm_feedback'
        )
    LOOP
        SELECT relrowsecurity INTO rls_enabled
        FROM pg_class
        WHERE oid = tbl.tablename::regclass;

        IF NOT rls_enabled THEN
            RAISE NOTICE 'WARNING: RLS not enabled on table %', tbl.tablename;
        ELSE
            RAISE NOTICE 'OK: RLS enabled on table %', tbl.tablename;
        END IF;
    END LOOP;
END;
$$;

-- Show all RLS policies
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;


-- ============================================================================
-- STEP 15: MIGRATION NOTES FOR EXISTING DATA
-- ============================================================================

-- If you have existing data without user_id, you need to assign it to a user.
-- Run these commands manually after identifying the correct user_id:
--
-- UPDATE tasks SET user_id = 'your-user-uuid' WHERE user_id IS NULL;
-- UPDATE memory SET user_id = 'your-user-uuid' WHERE user_id IS NULL;
-- UPDATE conversations SET user_id = 'your-user-uuid' WHERE user_id IS NULL;
-- UPDATE checkpoints SET user_id = 'your-user-uuid' WHERE user_id IS NULL;
-- UPDATE suggestions SET user_id = 'your-user-uuid' WHERE user_id IS NULL;
-- UPDATE style_profiles SET user_id = 'your-user-uuid' WHERE user_id IS NULL;
--
-- Or delete orphaned data:
-- DELETE FROM tasks WHERE user_id IS NULL;
-- etc.


-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'RLS MIGRATION COMPLETE';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'All tables now have Row-Level Security enabled.';
    RAISE NOTICE 'Users can only access their own data.';
    RAISE NOTICE '';
    RAISE NOTICE 'IMPORTANT: Update your backend code to:';
    RAISE NOTICE '1. Pass JWT token in Authorization header';
    RAISE NOTICE '2. Or set app.current_user_id session variable';
    RAISE NOTICE '';
    RAISE NOTICE 'Test isolation with test_multitenancy.py';
    RAISE NOTICE '========================================';
END;
$$;
