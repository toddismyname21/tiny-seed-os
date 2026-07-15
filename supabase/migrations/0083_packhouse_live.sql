-- ============================================================================
-- 0083_packhouse_live.sql
--
-- MAKE THE PACK-HOUSE SHEET INTERACTIVE (Todd's ask, 2026-07-14).
--
-- THE PROBLEM (Todd's words): the Pack House by-item sheet is a clean paper
-- distribution doc, but the crew needs to (a) record a "still need to pick/pull"
-- figure when they pick short or are pulling from inventory, (b) leave a note the
-- next team can read, and (c) actually cross crops off IN THE APP as they pack —
-- so the Tuesday pack team picks right up where Monday left off. Cross-DAY
-- continuity is the whole point.
--
-- This EXTENDS the existing live-check-off table (pick_pack_progress, 0069) so we
-- REUSE its machinery (the /mark + /state endpoints, the browser optimistic
-- controller, and the realtime subscription) rather than building a parallel
-- system. Three additive changes, all idempotent:
--
--   1. ALLOW section='packhouse'. The 0069 section CHECK was an INLINE column
--      constraint (auto-named pick_pack_progress_section_check) covering only
--      harvest/csa/wholesale/market. We drop it (guarded, like 0068's role swap)
--      and re-add an EXPLICITLY-named constraint that also allows 'packhouse'.
--      A 'packhouse' line flows todo→packed (a PACK-style line), keyed on the
--      SAME (week_date, section, scope_day, market_id, line_key) UNIQUE — so
--      Monday's checked rows render checked for Tuesday's team automatically
--      (same week, same section, same scope_day).
--
--   2. ADD needed_qty numeric (nullable). The crew's editable "still need to
--      pick/pull N more" figure for a crop. NULL = nothing flagged; > 0 renders
--      the amber "⚠ need N more" chip on screen AND print (real pack data the
--      paper crew needs). Distinct from actual_qty (0069), which is the harvested
--      total captured when a PICK line is marked done.
--
--   3. ADD note text (nullable). A free-text pack-team note ("kale short 3"),
--      shown with the crew name who left it, on screen AND print.
--
-- No RLS change: the existing pick_pack_progress_ops policy (is_ops_caller —
-- admin/staff/crew, 0068) already governs every column, so crew can read + write
-- these two new fields from their phones. No realtime change: the table is
-- already in the supabase_realtime publication (0069), so packhouse rows sync
-- live across devices exactly like the harvest view — the new columns ride along
-- in the same change payload. Both new columns hold zero member PII (a pick-short
-- number and a crop note), consistent with the rest of this table.
--
-- Idempotent: guarded constraint swap, ADD COLUMN IF NOT EXISTS. Safe to re-run.
-- Ends with a verify SELECT proving the section constraint now allows 'packhouse'
-- and both new columns exist.
-- ============================================================================

-- ── 1. Extend the section CHECK to include 'packhouse' ──────────────────────
-- The 0069 inline column CHECK is auto-named pick_pack_progress_section_check.
-- Drop it if present (either the auto-named one OR a prior run of this
-- migration), then re-add an explicitly-named constraint covering all five
-- sections. Guarded so a re-run never double-adds.
ALTER TABLE pick_pack_progress
  DROP CONSTRAINT IF EXISTS pick_pack_progress_section_check;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pick_pack_progress_section_check'
  ) THEN
    ALTER TABLE pick_pack_progress
      ADD CONSTRAINT pick_pack_progress_section_check
      CHECK (section IN ('harvest', 'csa', 'wholesale', 'market', 'packhouse'));
  END IF;
END $$;

-- ── 2. The crew's editable "still need to pick/pull" figure ─────────────────
-- NULL = nothing flagged. > 0 → the amber "⚠ need N more" chip (screen + print).
ALTER TABLE pick_pack_progress
  ADD COLUMN IF NOT EXISTS needed_qty numeric;

COMMENT ON COLUMN pick_pack_progress.needed_qty IS
  'Pack-crew editable "still need to pick/pull N more" figure for a line (e.g. picked short, or pulling from inventory). NULL = nothing flagged; > 0 renders the amber need chip on screen + print. Distinct from actual_qty (harvested total on a PICK line marked done).';

-- ── 3. A free-text pack-team note (with the crew name via worked_by) ────────
ALTER TABLE pick_pack_progress
  ADD COLUMN IF NOT EXISTS note text;

COMMENT ON COLUMN pick_pack_progress.note IS
  'Free-text pack-team note for a line ("kale short 3"), shown with worked_by on screen + print so the next day''s crew picks right up. NULL = no note. Zero member PII.';

-- ── Verify — proves the section constraint now allows 'packhouse' and both new
--    columns exist on the table. ─────────────────────────────────────────────
SELECT
  (SELECT pg_get_constraintdef(oid) FROM pg_constraint
    WHERE conname = 'pick_pack_progress_section_check')                     AS section_constraint,
  (SELECT count(*) FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'pick_pack_progress'
      AND column_name = 'needed_qty')                                      AS needed_qty_col,
  (SELECT count(*) FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'pick_pack_progress'
      AND column_name = 'note')                                           AS note_col;
