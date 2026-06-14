-- ═══════════════════════════════════════════════════════════════════
-- Migration 0036: Flex ordering — coming-soon + featured flags,
-- teaser items, week-1 box_contents, South Side pickup, flex-images bucket
--
-- Backs the Phase-1 flex/extras weekly ordering feature
-- (docs/specs/FLEX_ORDERING_BUILD_SPEC.md + FLEX_ORDERING_GAP_RESEARCH.md).
--
-- Adds to flex_inventory:
--   • coming_soon BOOLEAN — greyed "Coming Soon" teaser, NOT orderable.
--   • is_featured BOOLEAN — "Week's featured extra" hero (gap research P2).
--
-- Loads (idempotently):
--   • 5 coming-soon teaser items for week 2026-06-08 (is_active=false,
--     coming_soon=true). Members read these via a SERVER service-role read
--     (RLS flex_inventory_member_read requires is_active=true, so teasers
--     are intentionally invisible to the member RLS path and surfaced only
--     by the SSR page, which gates on share_type='flex').
--   • box_contents for week 2026-06-08, share_type 'small' + 'family' —
--     these drive the CSA-share flex item's displayed contents.
--   • South Side Market pickup location (2120 Jane St, Pittsburgh PA 15203,
--     Sun 10–2). is_active=true so it appears in the member pickup picker
--     and change_pickup_location accepts it (it validates is_active).
--
-- Creates:
--   • flex-images PUBLIC storage bucket (mirrors campaign-images / 0035) for
--     admin-uploaded item photos. Public read (photos shown in-portal +
--     could be embedded in member email); admin-only write.
--
-- ── Apply note (see migration 0025 / 0035) ──────────────────────────
--   The Management API runs as `postgres`, NOT a member of
--   supabase_storage_admin. Bundling the storage.buckets upsert AND the
--   storage.objects policy DDL in ONE submission trips a transient
--   "42501 must be owner of relation objects" rollback. When applying via
--   the Management API, submit each statement (or coherent block) SEPARATELY:
--     1. ALTER TABLE flex_inventory (the two ADD COLUMNs)
--     2. the coming-soon teaser INSERT block
--     3. the box_contents INSERT block
--     4. the South Side pickup INSERT
--     5. the storage.buckets upsert
--     6. DROP+CREATE flex_images_public_read
--     7. DROP+CREATE flex_images_admin_write
--   This file is the authoritative record of the live state and is safe to
--   re-run statement-by-statement (every write is ON CONFLICT / NOT EXISTS
--   guarded; every policy is DROP IF EXISTS first).
-- ═══════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────
-- 1. flex_inventory: coming_soon + is_featured flags.
-- ───────────────────────────────────────────────────────────────────
ALTER TABLE flex_inventory
  ADD COLUMN IF NOT EXISTS coming_soon BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE flex_inventory
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN flex_inventory.coming_soon IS
  'Greyed "Coming Soon" teaser — shown to flex members but NOT orderable. Pair with is_active=false so it is excluded from the RLS member-read path and surfaced only by the SSR ordering page.';
COMMENT ON COLUMN flex_inventory.is_featured IS
  'Marks the week''s featured extra (hero treatment on the member ordering page). At most one is intended per week, but not DB-enforced.';

-- ───────────────────────────────────────────────────────────────────
-- 2. Coming-soon teaser items for week 2026-06-08.
--    is_active=false (not orderable, hidden from member RLS read),
--    coming_soon=true (rendered as a greyed teaser by the SSR page).
--    available_qty/remaining_qty 0 — nothing to sell yet.
--    Guarded against duplicates by name+week (no natural unique key exists).
-- ───────────────────────────────────────────────────────────────────
INSERT INTO flex_inventory
  (week_starting, name, category, unit, price_cents, available_qty, remaining_qty, is_active, coming_soon)
SELECT * FROM (VALUES
  ('2026-06-08'::date, 'Broccolini',              'Coming Soon', 'bunch', 500, 0, 0, false, true),
  ('2026-06-08'::date, 'Fennel',                  'Coming Soon', 'each',  500, 0, 0, false, true),
  ('2026-06-08'::date, 'Radicchio',               'Coming Soon', 'head',  500, 0, 0, false, true),
  ('2026-06-08'::date, 'Petite Kale Mix (4oz)',   'Coming Soon', 'bag',   400, 0, 0, false, true),
  ('2026-06-08'::date, 'Something Fresh Mix (4oz)','Coming Soon','bag',   400, 0, 0, false, true)
) AS v(week_starting, name, category, unit, price_cents, available_qty, remaining_qty, is_active, coming_soon)
WHERE NOT EXISTS (
  SELECT 1 FROM flex_inventory fi
  WHERE fi.week_starting = v.week_starting AND fi.name = v.name
);

-- ───────────────────────────────────────────────────────────────────
-- 3. box_contents for week 2026-06-08 (drives the CSA-share flex item's
--    displayed contents). share_type 'small' + 'family'. Idempotent via
--    the UNIQUE (week_date, share_type, product_name) constraint.
--
--    Small : Salad Turnips, Bok Choy, 2 heads lettuce, Cilantro, Radishes,
--            Herb Seedling.
--    Family: Small + Potatoes, Dill, Swiss Chard.
-- ───────────────────────────────────────────────────────────────────
INSERT INTO box_contents (week_date, share_type, product_name, quantity, unit)
VALUES
  -- Small share
  ('2026-06-08', 'small',  'Salad Turnips', 1, 'bunch'),
  ('2026-06-08', 'small',  'Bok Choy',      1, 'each'),
  ('2026-06-08', 'small',  'Lettuce',       2, 'head'),
  ('2026-06-08', 'small',  'Cilantro',      1, 'bunch'),
  ('2026-06-08', 'small',  'Radishes',      1, 'bunch'),
  ('2026-06-08', 'small',  'Herb Seedling', 1, 'each'),
  -- Family share = small + extras
  ('2026-06-08', 'family', 'Salad Turnips', 1, 'bunch'),
  ('2026-06-08', 'family', 'Bok Choy',      1, 'each'),
  ('2026-06-08', 'family', 'Lettuce',       2, 'head'),
  ('2026-06-08', 'family', 'Cilantro',      1, 'bunch'),
  ('2026-06-08', 'family', 'Radishes',      1, 'bunch'),
  ('2026-06-08', 'family', 'Herb Seedling', 1, 'each'),
  ('2026-06-08', 'family', 'Potatoes',      1, 'bag'),
  ('2026-06-08', 'family', 'Dill',          1, 'bunch'),
  ('2026-06-08', 'family', 'Swiss Chard',   1, 'bunch')
ON CONFLICT (week_date, share_type, product_name) DO NOTHING;

-- ───────────────────────────────────────────────────────────────────
-- 4. South Side Market pickup location. Available to ALL members.
--    is_delivery_zone=false (it's a market stop, not a home-delivery zone).
--    Guarded by name (no unique constraint on name exists, so NOT EXISTS).
-- ───────────────────────────────────────────────────────────────────
INSERT INTO pickup_locations
  (name, address, city, state, zip, day_of_week, time_start, time_end, is_delivery_zone, is_active, notes)
SELECT
  'South Side Market', '2120 Jane St', 'Pittsburgh', 'PA', '15203',
  'Sun', '10:00', '14:00', false, true, 'Seasonal: May–September.'
WHERE NOT EXISTS (
  SELECT 1 FROM pickup_locations WHERE name = 'South Side Market'
);
-- If a row already exists (re-run / prior partial), ensure it is active
-- with the correct window — defensive, no-op when already correct.
UPDATE pickup_locations
   SET address = '2120 Jane St', city = 'Pittsburgh', state = 'PA', zip = '15203',
       day_of_week = 'Sun', time_start = '10:00', time_end = '14:00',
       is_delivery_zone = false, is_active = true,
       notes = 'Seasonal: May–September.'
 WHERE name = 'South Side Market';

-- ───────────────────────────────────────────────────────────────────
-- 5. flex-images PUBLIC storage bucket (mirrors campaign-images / 0035).
--    Item photos uploaded by admin; shown in-portal and may be embedded
--    in member email. PUBLIC read so an <img src> with no auth header
--    resolves. 5 MB, image MIME allow-list.
-- ───────────────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'flex-images',
  'flex-images',
  true,
  5242880,  -- 5 MB
  ARRAY['image/png','image/jpeg','image/gif','image/webp']
)
ON CONFLICT (id) DO UPDATE
  SET public             = EXCLUDED.public,
      file_size_limit    = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ── Public read — anyone may read flex item photos. ──
DROP POLICY IF EXISTS flex_images_public_read ON storage.objects;
CREATE POLICY flex_images_public_read ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'flex-images');

COMMENT ON POLICY flex_images_public_read ON storage.objects IS
  'Public read for flex-images: item photos shown in-portal and possibly embedded in member email. No privacy expectation.';

-- ── Admin write — defense-in-depth behind the app-layer requireAdmin gate
--    on /api/admin/flex-inventory/image (service role bypasses RLS). ──
DROP POLICY IF EXISTS flex_images_admin_write ON storage.objects;
CREATE POLICY flex_images_admin_write ON storage.objects
  FOR ALL
  TO authenticated
  USING (bucket_id = 'flex-images' AND is_admin_caller())
  WITH CHECK (bucket_id = 'flex-images' AND is_admin_caller());

COMMENT ON POLICY flex_images_admin_write ON storage.objects IS
  'Admin/staff may write/update/delete flex-images objects. The API uploader uses service role (bypasses RLS); this is defense-in-depth.';

-- ───────────────────────────────────────────────────────────────────
-- 6. Verification (read-only).
-- ───────────────────────────────────────────────────────────────────
SELECT column_name FROM information_schema.columns
WHERE table_name='flex_inventory' AND column_name IN ('coming_soon','is_featured')
ORDER BY column_name;

SELECT name, is_active, coming_soon FROM flex_inventory
WHERE week_starting='2026-06-08' AND coming_soon=true ORDER BY name;

SELECT share_type, count(*) FROM box_contents WHERE week_date='2026-06-08' GROUP BY share_type;

SELECT name, address, day_of_week, time_start, time_end, is_active FROM pickup_locations WHERE name='South Side Market';

SELECT id, public FROM storage.buckets WHERE id='flex-images';
