-- 0040_pickup_instructions.sql
--
-- MEMBER-FACING per-site pickup instructions (Todd directive, 2026-06-08).
--
-- Each pickup site needs its own custom instructions the member MUST see —
-- e.g. "Boxes are on the covered porch around the left side of the house, in
-- the green cooler. Please re-close the lid." These vary site to site and are
-- the difference between a smooth pickup and a confused member texting the
-- host. They are shown to members on /account/confirm-pickup (the required
-- acknowledgment gate), /account/pickup, and the dashboard pickup card.
--
-- CRITICAL: this is SEPARATE from the existing `notes` column. `notes` is
-- ADMIN-ONLY internal content (e.g. "host not confirmed", "key under mat —
-- staff only") and must NEVER be shown to members. `pickup_instructions` is
-- the member-safe, member-facing field. Keeping them distinct prevents leaking
-- internal operational notes to customers.
--
-- Nullable with NO default: a NULL value means "no custom instructions for
-- this site" and the member UI falls back to its existing generic copy
-- (text-on-arrival / time-window language) rather than showing an empty block.
--
-- Idempotent: ADD COLUMN IF NOT EXISTS. No backfill required.

ALTER TABLE public.pickup_locations
  ADD COLUMN IF NOT EXISTS pickup_instructions text;

COMMENT ON COLUMN public.pickup_locations.pickup_instructions IS
  'MEMBER-FACING per-site pickup instructions, shown to members on '
  '/account/confirm-pickup, /account/pickup, and the dashboard pickup card '
  '(Todd directive 2026-06-08). Editable by admins via /admin/pickup-locations. '
  'NULL = no custom instructions → member UI falls back to generic copy. '
  'DISTINCT from `notes`, which is admin-only internal content never shown to '
  'members.';
