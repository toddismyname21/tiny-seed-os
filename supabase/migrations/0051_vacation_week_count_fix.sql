-- ════════════════════════════════════════════════════════════════════
-- Migration 0051 — Vacation WEEKS-USED over-count fix
-- ════════════════════════════════════════════════════════════════════
--
-- THE BUG (real incident, member "Naomi", 2026-06-16):
--   A WEEKLY summer-veg member scheduled ONE 3-day hold,
--   2026-06-15 (Mon) → 2026-06-19 (Fri), covering a SINGLE Wednesday
--   delivery (6/17). Her members.vacation_weeks_used jumped by 2 (should be
--   1) and the portal told her "that's 2 weeks."
--
-- ROOT CAUSE — schedule_vacation_hold() (migrations 0016 + 0041) computed:
--       v_weeks_in_hold := CEIL((p_end_date - p_start_date) / 7) + 1;
--   That is a calendar-SPAN heuristic, not a count of the member's actual
--   deliveries. For Naomi: CEIL(4/7) + 1 = 0 + 1 + 1 = 2.  Any hold that
--   doesn't START on a delivery-week boundary inflates by one, and it ignores
--   biweekly off-weeks entirely (a biweekly member holding their OFF week was
--   still charged ≥ 1). cancel_vacation_hold() (0016) refunded with the same
--   broken heuristic, so cancelling drifted the counter the other way.
--
-- THE CORRECT RULE — count the member's DELIVERY OCCURRENCES in the range:
--   A vacation week is "used" only when the member would actually have
--   RECEIVED a box the hold now suppresses:
--       weeks_used = number of the member's delivery weeks whose
--                    Monday→Sunday window OVERLAPS [start_date, end_date].
--   This is the EXACT mirror of the ops resolver's exclusion test
--   (holdOverlapsWeek in src/lib/cycle.ts) and of the app-layer helper
--   vacationWeeksUsed in src/lib/vacation.ts. Charging the member precisely
--   the weeks the resolver excludes them from keeps the budget honest in BOTH
--   directions (increment AND refund).
--
--     - Weekly member  → counts every season Wednesday whose Mon–Sun week the
--       hold touches. Naomi's Mon–Fri range touches only the week of 6/17 → 1.
--     - Biweekly member → counts ONLY their ON-parity (A/B) delivery weeks the
--       hold touches; a hold landing entirely on their OFF week → 0.
--
-- The count is factored into ONE helper (_vacation_member_weeks_in_range) so
-- the increment (schedule) and the refund (cancel) can never diverge.
--
-- ── SEASON CONFIG (kept in sync with src/lib/season.ts) ────────────────
-- Postgres has no season table, so the schedule is encoded here, mirroring
-- SEASON_SCHEDULE in season.ts. When that map changes, update the CASE below.
--   spring_veg : firstDelivery 2026-05-06, 4 weeks
--   summer_veg : firstDelivery 2026-06-10, 18 weeks
--   flower     : firstDelivery 2026-06-24, 16 weeks
--   flex / add_on / fall_veg : NO season → vacation cost 0 weeks.
--
-- ── BIWEEKLY PARITY (kept in sync with src/lib/cycle.ts) ───────────────
-- Anchor Monday 2026-06-08 = parity 0 = Week A. A delivery Wednesday belongs
-- to Week A when the Monday of its week has parity 0, Week B when parity 1.
-- parity = ((floor((mondayOfWeek - 2026-06-08) / 7)) mod 2), normalised ≥ 0.
-- Week-Monday subtraction is always an exact multiple of 7, so Postgres
-- integer division == JS Math.floor here (no truncation divergence). A member
-- is biweekly when biweekly_week IS NOT NULL, OR total_weeks is a reduced
-- (< full-season) plan; an unassigned biweekly member defaults to A (matches
-- memberIsBiweekly + the resolver's "null = on-week" generosity).
--
-- IDEMPOTENT: CREATE OR REPLACE only — no column/constraint changes. Contract
-- (params, return shape, error codes) UNCHANGED; only the week count changes.
--
-- ⚠️  FILE-LOCATION / ORDER NOTE FOR TODD/DBA  ⚠️
-- Applied migrations live at the REPO ROOT supabase/migrations/ (this file is
-- already there). Apply AFTER 0041 (the 6-arg schedule_vacation_hold must
-- exist; this replaces it). 0016's cancel_vacation_hold is replaced here too.
-- The app layer (src/lib/vacation.ts) already shows correct counts in the UI
-- regardless of whether this migration has landed; this fix corrects the
-- AUTHORITATIVE counter the RPCs write to members.vacation_weeks_used.
-- ════════════════════════════════════════════════════════════════════


-- ── 1. Shared count helper ──────────────────────────────────────────
-- The single source of truth: how many of the member's delivery weeks does
-- the inclusive range [p_start, p_end] overlap? Used by BOTH schedule
-- (increment) and cancel (refund). Mirrors src/lib/vacation.ts.
CREATE OR REPLACE FUNCTION public._vacation_member_weeks_in_range(
  p_member_id UUID,
  p_start     DATE,
  p_end       DATE
) RETURNS INT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_share_type     TEXT;
  v_biweekly_week  TEXT;
  v_total_weeks    INT;
  v_first_delivery DATE;
  v_season_weeks   INT;
  v_is_biweekly    BOOLEAN;
  v_member_parity  INT;
  v_anchor_monday  CONSTANT DATE := DATE '2026-06-08'; -- parity 0 = Week A
  v_count          INT := 0;
  n                INT;
  v_delivery       DATE;        -- a season delivery Wednesday
  v_week_monday    DATE;        -- Monday of that delivery's week
  v_week_sunday    DATE;        -- Sunday of that delivery's week
  v_parity         INT;         -- 0 = Week A, 1 = Week B
BEGIN
  IF p_member_id IS NULL OR p_start IS NULL OR p_end IS NULL OR p_end < p_start THEN
    RETURN 0;
  END IF;

  SELECT share_type, biweekly_week, total_weeks
    INTO v_share_type, v_biweekly_week, v_total_weeks
    FROM members
   WHERE id = p_member_id;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  -- Resolve the share's season (mirrors src/lib/season.ts SEASON_SCHEDULE).
  CASE v_share_type
    WHEN 'spring_veg' THEN v_first_delivery := DATE '2026-05-06'; v_season_weeks := 4;
    WHEN 'summer_veg' THEN v_first_delivery := DATE '2026-06-10'; v_season_weeks := 18;
    WHEN 'flower'     THEN v_first_delivery := DATE '2026-06-24'; v_season_weeks := 16;
    ELSE v_first_delivery := NULL; v_season_weeks := 0;  -- flex / add_on / fall_veg
  END CASE;

  -- No season configured → no delivery calendar → costs 0 weeks (consistent
  -- with the resolver, which never season-excludes these and rides add_ons).
  IF v_first_delivery IS NULL THEN
    RETURN 0;
  END IF;

  -- Biweekly detection (mirrors memberIsBiweekly in src/lib/schedule.ts).
  v_is_biweekly := (v_biweekly_week IN ('A','B'))
    OR (v_total_weeks IS NOT NULL AND v_total_weeks > 0 AND v_total_weeks < v_season_weeks);
  v_member_parity := CASE WHEN v_biweekly_week = 'B' THEN 1 ELSE 0 END;

  -- Walk every season delivery week; count those whose Monday→Sunday window
  -- overlaps [start,end] AND (for biweekly) match the member's parity.
  FOR n IN 0 .. (v_season_weeks - 1) LOOP
    v_delivery := v_first_delivery + (n * 7);                 -- a Wednesday
    -- Monday of the delivery's ISO week. EXTRACT(DOW) → 0=Sun..6=Sat;
    -- days back to Monday = (DOW + 6) % 7.
    v_week_monday := v_delivery - ((EXTRACT(DOW FROM v_delivery)::INT + 6) % 7);
    v_week_sunday := v_week_monday + 6;

    IF v_week_monday <= p_end AND v_week_sunday >= p_start THEN
      IF v_is_biweekly THEN
        v_parity := (((( (v_week_monday - v_anchor_monday) / 7 )::INT % 2) + 2) % 2);
        IF v_parity = v_member_parity THEN
          v_count := v_count + 1;
        END IF;
      ELSE
        v_count := v_count + 1;
      END IF;
    END IF;
  END LOOP;

  RETURN v_count;
END;
$$;

COMMENT ON FUNCTION public._vacation_member_weeks_in_range(UUID, DATE, DATE) IS
  'Count of a member''s delivery weeks (season + biweekly-parity aware) whose Mon–Sun window overlaps [p_start, p_end]. Single source of truth shared by schedule_vacation_hold (increment) + cancel_vacation_hold (refund). Mirrors src/lib/vacation.ts vacationWeeksUsed. (migration 0051)';

REVOKE EXECUTE ON FUNCTION public._vacation_member_weeks_in_range(UUID, DATE, DATE) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public._vacation_member_weeks_in_range(UUID, DATE, DATE) TO authenticated, service_role;


-- ── 2. schedule_vacation_hold — increment via the shared helper ──────
CREATE OR REPLACE FUNCTION public.schedule_vacation_hold(
  p_member_id   UUID,
  p_start_date  DATE,
  p_end_date    DATE,
  p_reason      TEXT DEFAULT NULL,
  p_disposition TEXT DEFAULT 'skip',
  p_move_to_week DATE DEFAULT NULL
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
  v_disposition       TEXT := lower(coalesce(p_disposition, 'skip'));
BEGIN
  -- Defensive input checks.
  IF p_member_id IS NULL OR p_start_date IS NULL OR p_end_date IS NULL THEN
    RETURN json_build_object('error', 'invalid_input');
  END IF;

  -- ── Disposition validation (migration 0041) ─────────────────────
  IF v_disposition NOT IN ('skip', 'move', 'donate') THEN
    RETURN json_build_object('error', 'invalid_disposition');
  END IF;
  IF v_disposition = 'move' AND p_move_to_week IS NULL THEN
    RETURN json_build_object('error', 'move_target_required');
  END IF;
  IF v_disposition <> 'move' AND p_move_to_week IS NOT NULL THEN
    RETURN json_build_object('error', 'move_target_not_allowed');
  END IF;
  IF v_disposition = 'move' AND p_move_to_week <= CURRENT_DATE THEN
    RETURN json_build_object('error', 'move_target_in_past');
  END IF;

  -- Lock the member row to serialize concurrent schedules.
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

  -- ── CORRECTED week count: member's delivery weeks overlapping range ──
  v_weeks_in_hold := public._vacation_member_weeks_in_range(
    p_member_id, p_start_date, p_end_date
  );

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

  -- INCREMENT the counter by the CORRECTED delivery-week count.
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
  'Atomic vacation-hold scheduling with disposition (skip/move/donate). weeks_used = count of the MEMBER''S delivery weeks (season + biweekly-parity aware) whose Mon–Sun window overlaps [start,end], via _vacation_member_weeks_in_range — mirrors src/lib/vacation.ts + the ops resolver exclusion. (migration 0051 fixes the 0016/0041 CEIL((end-start)/7)+1 over-count.)';

-- No grant changes: the 6-arg signature already carries 0041's REVOKE/GRANT.


-- ── 3. cancel_vacation_hold — refund the corrected delivery-week count ─
-- scheduled (not yet started): refund ALL the hold's member-weeks.
-- active (today between start..end): refund only the FUTURE portion — the
--   member-weeks from the day AFTER today through end (today's week is already
--   "spent" on planning, matching 0016's intent). We count [today+1, end].
-- completed / cancelled: refuse.
CREATE OR REPLACE FUNCTION public.cancel_vacation_hold(
  p_member_id UUID,
  p_hold_id   UUID
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_status     TEXT;
  v_start      DATE;
  v_end        DATE;
  v_today      DATE := CURRENT_DATE;
  v_refund     INT;
BEGIN
  IF p_member_id IS NULL OR p_hold_id IS NULL THEN
    RETURN json_build_object('error', 'invalid_input');
  END IF;

  SELECT status, start_date, end_date
    INTO v_status, v_start, v_end
    FROM vacation_holds
   WHERE id = p_hold_id
     AND member_id = p_member_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'hold_not_found');
  END IF;

  IF v_status NOT IN ('scheduled','active') THEN
    RETURN json_build_object('error', 'cannot_cancel', 'status', v_status);
  END IF;

  IF v_status = 'scheduled' OR v_today < v_start THEN
    -- Full refund: every member-week the hold covers.
    v_refund := public._vacation_member_weeks_in_range(p_member_id, v_start, v_end);
  ELSIF v_today >= v_end THEN
    -- Defensive: should be 'completed'. Nothing in the future to refund.
    v_refund := 0;
  ELSE
    -- Mid-active: refund only member-weeks strictly AFTER today (today's week
    -- is already committed). Range starts the day after today.
    v_refund := public._vacation_member_weeks_in_range(p_member_id, v_today + 1, v_end);
  END IF;

  UPDATE vacation_holds
     SET status = 'cancelled',
         cancelled_at = NOW()
   WHERE id = p_hold_id;

  -- GREATEST guard prevents the counter going negative on any inconsistency.
  IF v_refund > 0 THEN
    UPDATE members
       SET vacation_weeks_used = GREATEST(0, vacation_weeks_used - v_refund),
           updated_at = NOW()
     WHERE id = p_member_id;
  END IF;

  RETURN json_build_object(
    'ok', true,
    'weeks_refunded', v_refund,
    'cancelled_status', v_status
  );
END;
$$;

COMMENT ON FUNCTION public.cancel_vacation_hold(UUID, UUID) IS
  'Cancels a scheduled/active vacation hold. Refund = corrected member delivery-week count (via _vacation_member_weeks_in_range); mid-active holds refund only the FUTURE portion [today+1, end]. Symmetric with schedule_vacation_hold''s increment so the counter never drifts. (migration 0051 fixes the 0016 CEIL refund.)';

-- No grant changes: cancel_vacation_hold's grants are unchanged from 0016.
