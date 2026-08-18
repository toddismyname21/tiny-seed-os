-- ============================================================================
-- 0092_crew_day_checklist.sql
--
-- THE PACK CREW'S MONDAY RESPONSIBILITY CHECKLIST, LIVE IN THE PORTAL
-- (Todd's ask, 2026-08-17: "I want this institutionalized in the csa portal").
--
-- THE PROBLEM: the pack crew has been missing responsibilities. Todd wrote the
-- Monday list (PACK_CREW_CHECKLISTS.md, approved 2026-08-15) and the point is
-- NOT a printed PDF — it is real-time follow-through visibility and knowing WHO
-- did what. The single highest-value line is the LUNCHTIME checkpoint: "missing
-- any item for a Monday-pack order? Tell Ben AT LUNCH so it gets harvested in
-- time — not discovered at 4pm." That line writes a real flag (note +
-- needed_qty), not just a tick.
--
-- This EXTENDS the existing live check-off table (pick_pack_progress, 0069,
-- extended by 0083) exactly the way 0083 extended it for the pack house — we
-- REUSE its machinery (the /mark + /state endpoints, the browser optimistic
-- controller, the realtime subscription, worked_by, and the is_ops_caller RLS
-- policy) rather than standing up a parallel progress system. ONE change:
--
--   1. ALLOW section='crew_day'. The 0069 section CHECK was an INLINE column
--      constraint (auto-named pick_pack_progress_section_check); 0083 replaced
--      it with an explicitly-named one covering five sections. We drop it
--      (guarded, same as 0083) and re-add it also allowing 'crew_day'.
--
-- Row identity is the EXISTING composite UNIQUE — nothing new:
--   (week_date = that week's Monday, section='crew_day', scope_day='mon',
--    market_id = the all-zero sentinel, line_key = the STABLE task key from
--    src/lib/crew-day.ts, e.g. 'mon.lunch.tell_ben')
--
-- A crew_day line flows todo -> done (enforced in the API, not the DB, exactly
-- like the existing per-section status rules). scope_day is NOT widened: this
-- is MONDAY ONLY and 'mon' is already legal. No new columns: status, note,
-- needed_qty, worked_by and updated_at all already exist —
--   • note       = the flagged missing item(s) for Ben, one per line
--   • needed_qty = the quantity typed on the most recent flag
--   • worked_by  = who ticked / who flagged (the whole reason this is in the
--                  portal instead of on paper)
--
-- No RLS change: pick_pack_progress_ops (is_ops_caller — admin/staff/crew,
-- 0068) already governs every column, so the crew can tick and flag from their
-- phones. No realtime change: the table is already in the supabase_realtime
-- publication (0069), so two people packing see each other's checks live. Zero
-- member PII lands here — a fixed task key, a status, a crop name, and a farm
-- worker's display name.
--
-- Idempotent: guarded constraint swap. Safe to re-run. Ends with a verify
-- SELECT proving the section constraint now allows 'crew_day'.
-- ============================================================================

-- ── 1. Extend the section CHECK to include 'crew_day' ───────────────────────
-- Drop the current constraint (the 0083 explicitly-named one, the 0069
-- auto-named one, or a prior run of this migration — all share the name), then
-- re-add it covering all six sections. Guarded so a re-run never double-adds.
ALTER TABLE pick_pack_progress
  DROP CONSTRAINT IF EXISTS pick_pack_progress_section_check;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pick_pack_progress_section_check'
  ) THEN
    ALTER TABLE pick_pack_progress
      ADD CONSTRAINT pick_pack_progress_section_check
      CHECK (section IN ('harvest', 'csa', 'wholesale', 'market', 'packhouse', 'crew_day'));
  END IF;
END $$;

COMMENT ON COLUMN pick_pack_progress.section IS
  'Which sheet the line belongs to. harvest = the overall PICK sheet (0069); csa/wholesale/market = the per-channel PACK sheets (0069); packhouse = the by-item distribution sheet (0083); crew_day = the pack crew''s daily responsibility checklist (0092, Monday v1) whose line_key is a STABLE task key from src/lib/crew-day.ts.';

-- ── Verify — proves the section constraint now allows 'crew_day' (and still
--    allows every prior section). ─────────────────────────────────────────────
SELECT
  (SELECT pg_get_constraintdef(oid) FROM pg_constraint
    WHERE conname = 'pick_pack_progress_section_check')                    AS section_constraint,
  (SELECT count(*) FROM pg_constraint
    WHERE conname = 'pick_pack_progress_section_check'
      AND pg_get_constraintdef(oid) LIKE '%crew_day%')                     AS allows_crew_day;
