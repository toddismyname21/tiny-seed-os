-- ════════════════════════════════════════════════════════════════════
-- Migration 0041 — Vacation-hold DISPOSITION (skip / move / donate)
-- ════════════════════════════════════════════════════════════════════
--
-- Adds two member-self-serve dispositions to vacation_holds so members
-- stop emailing Todd to reschedule or donate a week's box:
--
--   skip   (default, today's behaviour) — the week's box is simply not
--          packed. resolveCycle already excludes the member.
--   move   — the member gives up THIS week's box but receives it on a
--          DIFFERENT in-season delivery week (`move_to_week`).
--   donate — the week's box is donated; the farm reallocates it. The
--            member is still excluded from receiving, but the box is
--            surfaced in the pack team's "Donations: N boxes" tally.
--
-- DESIGN NOTE — `move_to_week` stores the MONDAY (week_starting) of the
-- TARGET delivery week, NOT the Wednesday delivery date. This is the same
-- key resolveCycle() uses for `week_starting`, so the resolver can compare
-- `move_to_week = <this cycle's week_starting>` with no date arithmetic.
-- The member UI shows the Wednesday delivery date but submits the Monday.
--
-- IDEMPOTENT: column adds use IF NOT EXISTS. The constraint add is guarded
-- by a DO-block so re-running is a no-op. The function replace is
-- CREATE OR REPLACE.
--
-- RLS: unchanged. Members still write their own holds ONLY through the
-- SECURITY DEFINER function schedule_vacation_hold(); the new params are
-- validated inside it. The base-table RLS policies are untouched.
--
-- ⚠️  FILE-LOCATION NOTE FOR TODD  ⚠️
-- This repo's APPLIED migrations live at the REPO ROOT:
--   supabase/migrations/0001_…0040_pickup_instructions.sql
-- This file was created at apps/csa-portal/migrations/ per the task brief.
-- Before applying, you'll likely want to MOVE it to
--   supabase/migrations/0041_vacation_disposition.sql
-- so it sits in the same numbered sequence the Management-API apply step
-- reads from. (0040 is currently the latest there.)
-- ════════════════════════════════════════════════════════════════════

-- ── 1. Columns ──────────────────────────────────────────────────────
ALTER TABLE vacation_holds
  ADD COLUMN IF NOT EXISTS disposition text NOT NULL DEFAULT 'skip';

ALTER TABLE vacation_holds
  ADD COLUMN IF NOT EXISTS move_to_week date;

-- CHECK constraint on disposition. Guarded so the migration is idempotent
-- (ADD CONSTRAINT has no IF NOT EXISTS in stable Postgres versions).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'vacation_holds_disposition_check'
  ) THEN
    ALTER TABLE vacation_holds
      ADD CONSTRAINT vacation_holds_disposition_check
      CHECK (disposition IN ('skip', 'move', 'donate'));
  END IF;
END $$;

-- Integrity: move REQUIRES a target week; skip/donate must have NONE.
-- Guarded for idempotency.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'vacation_holds_move_target_check'
  ) THEN
    ALTER TABLE vacation_holds
      ADD CONSTRAINT vacation_holds_move_target_check
      CHECK (
        (disposition = 'move'  AND move_to_week IS NOT NULL) OR
        (disposition <> 'move' AND move_to_week IS NULL)
      );
  END IF;
END $$;

-- Helpful partial index for the resolver's "who is moving INTO this week?"
-- lookup. Small table, but free to keep the move-week scan index-backed.
CREATE INDEX IF NOT EXISTS vacation_holds_move_to_week_idx
  ON vacation_holds (move_to_week)
  WHERE disposition = 'move';


-- ── 2. schedule_vacation_hold(...) — accept disposition + move_to_week ─
--
-- RECONCILED against the ACTUAL function body in
--   supabase/migrations/0016_vacation_hold_functions.sql
-- (found in the repo). The body below is migration 0016's
-- schedule_vacation_hold VERBATIM — same CURRENT_DATE checks, same
-- tstzrange '[]' overlap operator, same CEIL weeks formula, same
-- updated_at touch, same search_path — with ONLY the two new params and
-- their validation + the two new INSERT columns added. Nothing else in
-- the original logic is changed.
--
-- ⚠️  SIGNATURE NOTE FOR TODD / DBA  ⚠️
-- The original is a 4-arg function: schedule_vacation_hold(uuid,date,date,text).
-- Adding two DEFAULTED params makes a NEW 6-arg overload. If BOTH the
-- 4-arg and the 6-arg coexist, a 4-arg call becomes AMBIGUOUS. So we DROP
-- the old 4-arg function first, then CREATE the 6-arg version (whose
-- defaults keep any 4-arg caller working). The REVOKE/GRANT at the bottom
-- of 0016 are re-issued here for the new 6-arg signature.
--
-- Contract preserved (unchanged error codes, all returned as JSON):
--   invalid_input, member_not_found, start_date_in_past,
--   invalid_date_range, insufficient_vacation_weeks, overlapping_hold
-- New error codes added by this migration:
--   invalid_disposition       — disposition not in (skip,move,donate)
--   move_target_required      — disposition='move' but move_to_week null
--   move_target_not_allowed   — disposition<>'move' but move_to_week set
--   move_target_in_past       — move_to_week is not a future week
-- ─────────────────────────────────────────────────────────────────────

-- Drop the old 4-arg signature so the new defaulted 6-arg isn't ambiguous.
DROP FUNCTION IF EXISTS public.schedule_vacation_hold(UUID, DATE, DATE, TEXT);

CREATE OR REPLACE FUNCTION public.schedule_vacation_hold(
  p_member_id   UUID,
  p_start_date  DATE,
  p_end_date    DATE,
  p_reason      TEXT DEFAULT NULL,
  p_disposition TEXT DEFAULT 'skip',         -- NEW (migration 0041)
  p_move_to_week DATE DEFAULT NULL           -- NEW (migration 0041): Monday/week_starting
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_total_weeks       INT;
  v_weeks_used        INT;
  v_weeks_in_hold     INT;
  v_weeks_available   INT;
  v_overlap_count     INT;
  v_hold_id           UUID;
  v_disposition       TEXT := lower(coalesce(p_disposition, 'skip'));  -- NEW
BEGIN
  -- Defensive input checks.
  IF p_member_id IS NULL OR p_start_date IS NULL OR p_end_date IS NULL THEN
    RETURN json_build_object('error', 'invalid_input');
  END IF;

  -- ── Disposition validation (NEW, migration 0041) ────────────────
  IF v_disposition NOT IN ('skip', 'move', 'donate') THEN
    RETURN json_build_object('error', 'invalid_disposition');
  END IF;
  IF v_disposition = 'move' AND p_move_to_week IS NULL THEN
    RETURN json_build_object('error', 'move_target_required');
  END IF;
  IF v_disposition <> 'move' AND p_move_to_week IS NOT NULL THEN
    RETURN json_build_object('error', 'move_target_not_allowed');
  END IF;
  -- A move target must be a FUTURE week (the pack cutoff of the current or
  -- a past week has passed). CURRENT_DATE matches the rest of this fn.
  IF v_disposition = 'move' AND p_move_to_week <= CURRENT_DATE THEN
    RETURN json_build_object('error', 'move_target_in_past');
  END IF;

  -- Lock the member row to serialize concurrent schedules. The lock
  -- is held until COMMIT, so a second simultaneous schedule call on
  -- the same member waits here until we decide whether the budget
  -- can accommodate this hold.
  SELECT total_weeks, vacation_weeks_used
    INTO v_total_weeks, v_weeks_used
    FROM members
   WHERE id = p_member_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'member_not_found');
  END IF;

  -- Date validation.
  IF p_start_date < CURRENT_DATE THEN
    RETURN json_build_object('error', 'start_date_in_past');
  END IF;
  IF p_end_date < p_start_date THEN
    RETURN json_build_object('error', 'invalid_date_range');
  END IF;

  -- Compute weeks covered by the requested hold. CEIL((end - start) / 7)
  -- + 1 gives an inclusive count (matches schedule_vacation_hold @0016).
  v_weeks_in_hold := CEIL((p_end_date - p_start_date)::numeric / 7) + 1;

  -- Budget check: weeks_available = total_weeks - vacation_weeks_used.
  v_weeks_available := v_total_weeks - v_weeks_used;
  IF v_weeks_in_hold > v_weeks_available THEN
    RETURN json_build_object(
      'error', 'insufficient_vacation_weeks',
      'requested', v_weeks_in_hold,
      'available', v_weeks_available
    );
  END IF;

  -- Overlap detection (tstzrange '[]' — touching ranges collide).
  SELECT COUNT(*)
    INTO v_overlap_count
    FROM vacation_holds
   WHERE member_id = p_member_id
     AND status IN ('scheduled','active')
     AND tstzrange(start_date::timestamptz, end_date::timestamptz, '[]')
         && tstzrange(p_start_date::timestamptz, p_end_date::timestamptz, '[]');

  IF v_overlap_count > 0 THEN
    RETURN json_build_object('error', 'overlapping_hold');
  END IF;

  -- INSERT the hold (+ disposition / move_to_week, migration 0041).
  INSERT INTO vacation_holds (
    member_id, start_date, end_date, reason, status,
    disposition, move_to_week
  )
  VALUES (
    p_member_id, p_start_date, p_end_date,
    NULLIF(BTRIM(p_reason), ''), 'scheduled',
    v_disposition,
    CASE WHEN v_disposition = 'move' THEN p_move_to_week ELSE NULL END
  )
  RETURNING id INTO v_hold_id;

  -- INCREMENT the counter.
  UPDATE members
     SET vacation_weeks_used = vacation_weeks_used + v_weeks_in_hold,
         updated_at = NOW()
   WHERE id = p_member_id;

  RETURN json_build_object(
    'ok', true,
    'hold_id', v_hold_id,
    'weeks_used', v_weeks_in_hold,
    'disposition', v_disposition
  );
END;
$$;

COMMENT ON FUNCTION public.schedule_vacation_hold(UUID, DATE, DATE, TEXT, TEXT, DATE) IS
  'Atomic vacation-hold scheduling with disposition (skip/move/donate). Locks members row, validates start/end + budget + non-overlap + disposition, INSERTs into vacation_holds and INCREMENTs members.vacation_weeks_used in one transaction. Returns {ok|error, ...}. (migration 0041 extends 0016.)';

-- Re-lock EXECUTE on the new 6-arg signature (mirrors 0016's grants).
REVOKE EXECUTE ON FUNCTION public.schedule_vacation_hold(UUID, DATE, DATE, TEXT, TEXT, DATE) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.schedule_vacation_hold(UUID, DATE, DATE, TEXT, TEXT, DATE) TO authenticated, service_role;
