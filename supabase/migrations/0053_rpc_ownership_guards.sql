-- 0053_rpc_ownership_guards.sql
-- ─────────────────────────────────────────────────────────────────────────
-- IDOR FIX (empirical stress audit 2026-06-19).
--
-- schedule_vacation_hold, cancel_vacation_hold, and change_pickup_location are
-- SECURITY DEFINER and EXECUTE-able by `authenticated`. They took a p_member_id
-- but performed NO internal ownership check — migration 0015/0016/0030 left it
-- to the route. Any logged-in member could therefore call these RPCs directly
-- (PostgREST) with ANOTHER member's id and schedule/cancel a vacation hold or
-- change a pickup location on an account they do not own (member→member IDOR).
--
-- Fix: re-assert the caller inside each function, mirroring the idiom that
-- place_flex_order/cancel_flex_order already use. SECURITY DEFINER does NOT
-- change the auth context, so is_admin_caller() and current_customer_id() both
-- read the CALLER's JWT:
--   • Admins (is_admin_caller) may act on any member — admin pickup changes.
--   • Everyone else may act only on a member in their household.
--     current_customer_id() is household-aware (owner + active account_members).
--
-- All 5 app call sites invoke these via locals.supabase (the caller's JWT), so
-- the guard does not break any legitimate path. No service-role caller exists
-- (the make-up-box / cascade paths use direct INSERT/UPDATE, not these RPCs).
--
-- Bodies below are the EXACT current live definitions (pg_get_functiondef
-- 2026-06-19) with ONLY the ownership guard block added near the top.
-- ─────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.schedule_vacation_hold(p_member_id uuid, p_start_date date, p_end_date date, p_reason text DEFAULT NULL::text, p_disposition text DEFAULT 'skip'::text, p_move_to_week date DEFAULT NULL::date)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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

  -- ── Ownership guard (IDOR fix, migration 0053) ───────────────────
  IF NOT (
       public.is_admin_caller()
       OR (public.current_customer_id() IS NOT NULL
           AND EXISTS (SELECT 1 FROM members
                        WHERE id = p_member_id
                          AND customer_id = public.current_customer_id()))
     ) THEN
    RETURN json_build_object('error', 'forbidden');
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
$function$;


CREATE OR REPLACE FUNCTION public.cancel_vacation_hold(p_member_id uuid, p_hold_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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

  -- ── Ownership guard (IDOR fix, migration 0053) ───────────────────
  IF NOT (
       public.is_admin_caller()
       OR (public.current_customer_id() IS NOT NULL
           AND EXISTS (SELECT 1 FROM members
                        WHERE id = p_member_id
                          AND customer_id = public.current_customer_id()))
     ) THEN
    RETURN json_build_object('error', 'forbidden');
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
$function$;


CREATE OR REPLACE FUNCTION public.change_pickup_location(p_member_id uuid, p_new_location_id uuid, p_new_delivery_address text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_member_status     TEXT;
  v_current_location  UUID;
  v_max_capacity      INT;
  v_is_active         BOOLEAN;
  v_is_delivery_zone  BOOLEAN;
  v_current_count     INT;
  v_wants_delivery    BOOLEAN;
BEGIN
  IF p_member_id IS NULL THEN
    RETURN json_build_object('error', 'invalid_input');
  END IF;

  -- ── Ownership guard (IDOR fix, migration 0053) ───────────────────
  IF NOT (
       public.is_admin_caller()
       OR (public.current_customer_id() IS NOT NULL
           AND EXISTS (SELECT 1 FROM members
                        WHERE id = p_member_id
                          AND customer_id = public.current_customer_id()))
     ) THEN
    RETURN json_build_object('error', 'forbidden');
  END IF;

  -- Is the caller trying to SET a (non-empty) delivery address? That's the
  -- only path the revenue-leak gate blocks for members.
  v_wants_delivery := (p_new_delivery_address IS NOT NULL AND BTRIM(p_new_delivery_address) <> '');

  -- Mutually exclusive inputs.
  IF (p_new_location_id IS NULL AND NOT v_wants_delivery)
     OR (p_new_location_id IS NOT NULL AND v_wants_delivery) THEN
    RETURN json_build_object('error', 'invalid_input');
  END IF;

  -- ── ADMIN GATE on the delivery branch ──────────────────────────────
  -- Setting a delivery_address = opting into PAID ($15/wk), admin-approved
  -- home delivery. Members may NOT do this themselves. is_admin_caller()
  -- reads the CALLER's JWT (SECURITY DEFINER does not change auth context).
  IF v_wants_delivery AND NOT is_admin_caller() THEN
    RETURN json_build_object('error', 'delivery_admin_only');
  END IF;

  -- Lock the member row.
  SELECT status, pickup_location_id
    INTO v_member_status, v_current_location
    FROM members
   WHERE id = p_member_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'member_not_found');
  END IF;

  IF p_new_location_id IS NOT NULL THEN
    -- ── Switch to a PICKUP stop (open to members + admins) ────────────
    -- This BRANCH also CLEARS any delivery_address — moving a member OFF
    -- delivery onto a stop is always allowed (it closes the leak).
    SELECT max_capacity, is_active, is_delivery_zone
      INTO v_max_capacity, v_is_active, v_is_delivery_zone
      FROM pickup_locations
     WHERE id = p_new_location_id;

    IF NOT FOUND OR v_is_active = false THEN
      RETURN json_build_object('error', 'location_not_found');
    END IF;

    -- Capacity check. Count existing live members at this location,
    -- excluding the current caller (so re-saving to the same location
    -- doesn't falsely fail).
    IF v_max_capacity IS NOT NULL AND p_new_location_id <> v_current_location THEN
      SELECT COUNT(*) INTO v_current_count
        FROM members
       WHERE pickup_location_id = p_new_location_id
         AND status IN ('active','paused','onboarding')
         AND id <> p_member_id;

      IF v_current_count + 1 > v_max_capacity THEN
        RETURN json_build_object(
          'error', 'location_full',
          'max_capacity', v_max_capacity,
          'current', v_current_count
        );
      END IF;
    END IF;

    -- Apply: set pickup, clear delivery. When a member (or admin) moves
    -- onto a stop we also clear any pending home-delivery REQUEST — the
    -- member chose a stop instead, so a stale "request pending" marker
    -- would be misleading.
    UPDATE members
       SET pickup_location_id              = p_new_location_id,
           delivery_address                = NULL,
           home_delivery_requested_at      = NULL,
           home_delivery_requested_address = NULL,
           updated_at                      = NOW()
     WHERE id = p_member_id;
  ELSE
    -- ── Home-delivery branch (ADMIN-ONLY, gated above) ────────────────
    -- Setting delivery clears the pickup AND satisfies any pending request
    -- (admin has now approved + set the address).
    UPDATE members
       SET pickup_location_id              = NULL,
           delivery_address                = BTRIM(p_new_delivery_address),
           home_delivery_requested_at      = NULL,
           home_delivery_requested_address = NULL,
           updated_at                      = NOW()
     WHERE id = p_member_id;
  END IF;

  RETURN json_build_object('ok', true);
END;
$function$;
