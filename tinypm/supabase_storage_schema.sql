-- TinyPM Supabase Storage Schema for Photo Upload
-- ===================================================
-- Run this in the Supabase SQL Editor to set up photo storage
--
-- Created: 2026-01-30
-- Author: Team 6 - Photo Upload & Storage
--
-- Instructions:
-- 1. Go to https://supabase.com/dashboard/project/<your-project>
-- 2. Go to SQL Editor
-- 3. Paste this entire file
-- 4. Click "Run"
--
-- IMPORTANT: After running this SQL, you also need to:
-- 1. Go to Storage in the Supabase dashboard
-- 2. Create a bucket named "photos" (or verify it was created)
-- 3. Set the bucket to PUBLIC if you want direct URL access

-- ============================================
-- STORAGE BUCKET CREATION
-- ============================================

-- Note: Storage buckets are typically created via the dashboard,
-- but we can also insert into storage.buckets directly
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'photos',
    'photos',
    true,  -- Public bucket for easy access
    5242880,  -- 5MB max file size
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================
-- PHOTOS METADATA TABLE
-- ============================================
-- Stores metadata about uploaded photos
-- The actual files are in Supabase Storage

CREATE TABLE IF NOT EXISTS photos (
    id SERIAL PRIMARY KEY,

    -- File information
    filename TEXT NOT NULL,
    thumb_filename TEXT,
    original_name TEXT,
    storage_path TEXT NOT NULL,

    -- Ownership
    user_id TEXT NOT NULL,
    project_id TEXT NOT NULL,  -- 'wine', 'dinner', etc.
    entry_id TEXT,             -- Links to specific entry

    -- File metadata
    size INTEGER NOT NULL DEFAULT 0,
    thumb_size INTEGER DEFAULT 0,
    mime_type TEXT DEFAULT 'image/jpeg',
    width INTEGER,
    height INTEGER,

    -- Compression metadata
    original_size INTEGER,
    compression_quality INTEGER,

    -- EXIF data (useful for wine labels)
    exif_data JSONB DEFAULT '{}',
    capture_date TIMESTAMPTZ,
    device_make TEXT,
    device_model TEXT,
    location JSONB,  -- {lat: float, lon: float}

    -- Additional metadata
    metadata JSONB DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',

    -- URLs (cached for quick access)
    url TEXT,
    thumb_url TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_photos_user_id ON photos(user_id);
CREATE INDEX IF NOT EXISTS idx_photos_project_id ON photos(project_id);
CREATE INDEX IF NOT EXISTS idx_photos_entry_id ON photos(entry_id);
CREATE INDEX IF NOT EXISTS idx_photos_created_at ON photos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_photos_tags ON photos USING GIN(tags);

-- ============================================
-- PROJECT ENTRIES TABLE
-- ============================================
-- Stores wine/dinner log entries that photos attach to

CREATE TABLE IF NOT EXISTS project_entries (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,

    -- Entry type
    project_id TEXT NOT NULL,  -- 'wine', 'dinner', etc.
    user_id TEXT NOT NULL,

    -- Entry content
    title TEXT,
    notes TEXT,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),

    -- Wine-specific fields (null for other project types)
    wine_name TEXT,
    wine_type TEXT,  -- 'red', 'white', 'rose', 'sparkling', etc.
    wine_region TEXT,
    wine_year INTEGER,
    wine_price DECIMAL(10,2),

    -- Dinner-specific fields
    restaurant_name TEXT,
    cuisine_type TEXT,
    meal_type TEXT,  -- 'breakfast', 'lunch', 'dinner'

    -- Location
    location_name TEXT,
    location_coords JSONB,  -- {lat: float, lon: float}

    -- Tags and categorization
    tags TEXT[] DEFAULT '{}',

    -- Timestamps
    entry_date TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_project_entries_user ON project_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_project_entries_project ON project_entries(project_id);
CREATE INDEX IF NOT EXISTS idx_project_entries_date ON project_entries(entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_project_entries_tags ON project_entries USING GIN(tags);

-- ============================================
-- PHOTO-ENTRY JUNCTION TABLE
-- ============================================
-- Allows multiple photos per entry

CREATE TABLE IF NOT EXISTS entry_photos (
    entry_id TEXT REFERENCES project_entries(id) ON DELETE CASCADE,
    photo_id INTEGER REFERENCES photos(id) ON DELETE CASCADE,
    position INTEGER DEFAULT 0,  -- Order of photos in entry
    is_primary BOOLEAN DEFAULT false,  -- Primary/cover photo
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (entry_id, photo_id)
);

CREATE INDEX IF NOT EXISTS idx_entry_photos_entry ON entry_photos(entry_id);
CREATE INDEX IF NOT EXISTS idx_entry_photos_photo ON entry_photos(photo_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE entry_photos ENABLE ROW LEVEL SECURITY;

-- Photos policies
-- Allow users to view all photos (for now - can restrict later)
CREATE POLICY "Photos are viewable by everyone"
ON photos FOR SELECT
USING (true);

-- Allow users to insert their own photos
CREATE POLICY "Users can upload photos"
ON photos FOR INSERT
WITH CHECK (true);

-- Allow users to update their own photos
CREATE POLICY "Users can update own photos"
ON photos FOR UPDATE
USING (true)
WITH CHECK (true);

-- Allow users to delete their own photos
CREATE POLICY "Users can delete own photos"
ON photos FOR DELETE
USING (true);

-- Project entries policies
CREATE POLICY "Entries are viewable by everyone"
ON project_entries FOR SELECT
USING (true);

CREATE POLICY "Users can create entries"
ON project_entries FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can update entries"
ON project_entries FOR UPDATE
USING (true);

CREATE POLICY "Users can delete entries"
ON project_entries FOR DELETE
USING (true);

-- Entry photos junction policies
CREATE POLICY "Entry photos viewable by everyone"
ON entry_photos FOR SELECT
USING (true);

CREATE POLICY "Entry photos can be created"
ON entry_photos FOR INSERT
WITH CHECK (true);

CREATE POLICY "Entry photos can be deleted"
ON entry_photos FOR DELETE
USING (true);

-- ============================================
-- STORAGE POLICIES
-- ============================================
-- Allow authenticated and anonymous users to upload/view

-- Allow anyone to view photos
CREATE POLICY "Public photo access"
ON storage.objects FOR SELECT
USING (bucket_id = 'photos');

-- Allow anyone to upload photos
CREATE POLICY "Allow photo uploads"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'photos');

-- Allow anyone to update their photos
CREATE POLICY "Allow photo updates"
ON storage.objects FOR UPDATE
USING (bucket_id = 'photos');

-- Allow anyone to delete photos
CREATE POLICY "Allow photo deletions"
ON storage.objects FOR DELETE
USING (bucket_id = 'photos');

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to photos table
DROP TRIGGER IF EXISTS update_photos_updated_at ON photos;
CREATE TRIGGER update_photos_updated_at
    BEFORE UPDATE ON photos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Apply to project_entries table
DROP TRIGGER IF EXISTS update_project_entries_updated_at ON project_entries;
CREATE TRIGGER update_project_entries_updated_at
    BEFORE UPDATE ON project_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- USEFUL VIEWS
-- ============================================

-- View: Entries with photo counts
CREATE OR REPLACE VIEW entries_with_photos AS
SELECT
    pe.*,
    COUNT(ep.photo_id) as photo_count,
    (
        SELECT p.thumb_url
        FROM entry_photos ep2
        JOIN photos p ON p.id = ep2.photo_id
        WHERE ep2.entry_id = pe.id
        AND ep2.is_primary = true
        LIMIT 1
    ) as primary_thumb_url
FROM project_entries pe
LEFT JOIN entry_photos ep ON ep.entry_id = pe.id
GROUP BY pe.id;

-- View: Photos with entry info
CREATE OR REPLACE VIEW photos_with_entries AS
SELECT
    p.*,
    pe.title as entry_title,
    pe.rating as entry_rating,
    pe.entry_date
FROM photos p
LEFT JOIN entry_photos ep ON ep.photo_id = p.id
LEFT JOIN project_entries pe ON pe.id = ep.entry_id;

-- ============================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================

-- Uncomment to insert test data:

-- INSERT INTO project_entries (id, project_id, user_id, title, notes, rating, wine_name, wine_type, wine_region, wine_year)
-- VALUES
-- ('test-entry-1', 'wine', 'test-user', 'Great Cabernet', 'Smooth with blackberry notes', 4, 'Silver Oak', 'red', 'Napa Valley', 2019),
-- ('test-entry-2', 'wine', 'test-user', 'Nice Pinot', 'Light and fruity', 3, 'La Crema', 'red', 'Sonoma Coast', 2021);

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Uncomment to verify setup:

-- Check tables exist
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public'
-- AND table_name IN ('photos', 'project_entries', 'entry_photos');

-- Check storage bucket
-- SELECT * FROM storage.buckets WHERE id = 'photos';

-- Check policies
-- SELECT tablename, policyname FROM pg_policies
-- WHERE schemaname = 'public'
-- AND tablename IN ('photos', 'project_entries', 'entry_photos');
