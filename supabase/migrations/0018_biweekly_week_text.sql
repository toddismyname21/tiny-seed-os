-- ═══════════════════════════════════════════════════════════════════
-- Migration 0018: biweekly_week INT → TEXT ('A' | 'B' | NULL)
--
-- Why this migration exists
-- ─────────────────────────
-- The 2026-05-08 sheets→Supabase migration silently lost ~225 rows of
-- Biweekly_Week data because the source column held strings ('A',
-- 'BOTH', empty) but the destination column was INT with a CHECK that
-- only permitted (0, 1, NULL). `safe_int()` converted every non-numeric
-- value to NULL, so 100% of members landed in Postgres with
-- biweekly_week = NULL.
--
-- Per Todd (farm owner, 2026-05-11):
--   - EVERY member is bi-weekly. There are no weekly subscribers.
--   - Members get assigned to Week A or Week B as they come through the
--     admin UI; until then they're "unassigned" (NULL).
--   - The legacy 'BOTH' value in the sheet means "subscriber exists but
--     A/B not yet picked" — collapses to NULL on import.
--
-- This migration:
--   1. Drops the INT-valued CHECK
--   2. Converts the column from INT → TEXT, mapping any surviving 0/1
--      values to 'A'/'B' just in case (defensive — current data is all
--      NULL but future-proof anyway)
--   3. Re-adds a CHECK enforcing biweekly_week ∈ ('A','B',NULL)
--   4. Adds a partial index for fast "members on Week X" queries from
--      the admin UI (NULL rows are excluded — sparse index)
--
-- After this runs, re-import biweekly_week from the source sheet using
-- scripts/migrate-csa/fix_biweekly_week.py.
--
-- Forward-only. Apply via Supabase Management API.
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

-- 1. Drop the int CHECK constraint
ALTER TABLE members DROP CONSTRAINT IF EXISTS members_biweekly_week_check;

-- 2. Change column type INT → TEXT, mapping any existing integer
--    values defensively. Current data is 100% NULL so the CASE is a
--    no-op, but we keep it correct in case a later in-flight write
--    landed a 0 or 1 before this migration ran.
ALTER TABLE members
  ALTER COLUMN biweekly_week TYPE TEXT
  USING CASE
    WHEN biweekly_week IS NULL THEN NULL
    WHEN biweekly_week = 0 THEN 'A'
    WHEN biweekly_week = 1 THEN 'B'
    ELSE NULL
  END;

-- 3. Add new CHECK constraint: 'A' / 'B' / NULL only.
ALTER TABLE members ADD CONSTRAINT members_biweekly_week_check
  CHECK (biweekly_week IS NULL OR biweekly_week IN ('A','B'));

-- 4. Partial index for the admin "members on Week A/B" filter.
--    Excludes NULL rows so the index stays tight (only assigned members
--    are indexed — that's the query we care about).
CREATE INDEX IF NOT EXISTS members_biweekly_week_idx ON members(biweekly_week)
  WHERE biweekly_week IS NOT NULL;

-- 5. Document semantics on the column itself so future schema readers
--    (and pgAdmin / supabase studio users) don't need to grep code.
COMMENT ON COLUMN members.biweekly_week IS
  'Bi-weekly schedule assignment: A or B. NULL means not yet assigned (admin should assign via /admin/members/[id]). Every CSA member is bi-weekly; there are no weekly subscribers.';

COMMIT;
