-- ═══════════════════════════════════════════════════════════════════
-- Migration 0085: Driver break tracking on delivery_routes
--
-- Why this migration exists
-- ─────────────────────────
-- The "Track My Box" feature (member-facing delivery tracker) gives the
-- driver a "☕ Start break" button on /admin/route/[id]. When the driver
-- is on a break the whole route's ETAs shift, and the member tracking
-- page needs to (a) know a break is in progress and (b) fold the paused
-- time into the honest ETA it shows.
--
-- Two additive columns:
--   * paused_at        — timestamptz, non-null while a break is IN PROGRESS.
--                         Set to now() on "pause", cleared to NULL on "resume".
--   * pause_total_sec  — integer, accumulated break seconds already taken on
--                         this route (the "resume" action adds the just-ended
--                         break's duration here). Starts at 0.
--
-- The member ETA math treats the current running delay as
--   (latest completed stop's completed_at − its scheduled_time), clamped ≥ 0,
--   PLUS, when paused_at is non-null, (now − paused_at). pause_total_sec is
--   accumulated for admin/analytics and future ETA refinement; the honest
--   member-facing ETA only needs the CURRENTLY-active break on top of the
--   observed delay (a finished break already shows up in the completed
--   stops' timestamps).
--
-- Additive + idempotent (ADD COLUMN IF NOT EXISTS). Safe to run on a LIVE
-- delivery day: no existing column is altered, no data is rewritten, no RLS
-- is touched — delivery_routes already grants members SELECT on all routes
-- (migration 0019, delivery_routes_member_read USING (true)) and admins ALL,
-- so the new columns inherit the exact same access with zero policy change.
--
-- Forward-only. Apply via Supabase Management API.
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

ALTER TABLE delivery_routes
  ADD COLUMN IF NOT EXISTS paused_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pause_total_sec INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN delivery_routes.paused_at IS
  'Non-null WHILE the driver is on a break (set to now() on pause, cleared to NULL on resume). Members see a "driver is on a break" banner and the tracking ETA folds in (now - paused_at) while this is set.';
COMMENT ON COLUMN delivery_routes.pause_total_sec IS
  'Accumulated break seconds already taken on this route. The resume action adds the just-ended break duration ((now - paused_at)) here. Diagnostic/analytics; the honest member ETA relies on observed completed-stop timestamps + the current active break.';

COMMIT;
