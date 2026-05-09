-- ═══════════════════════════════════════════════════════════════════
-- Migration 0016: Vacation hold + cancel + pickup-change functions
--
-- Adds three PL/pgSQL functions used by the Day-8 /account routes:
--
--   schedule_vacation_hold(member_id, start_date, end_date, reason)
--     - Atomically validates + INSERTs a row into vacation_holds and
--       INCREMENTs members.vacation_weeks_used in a single transaction.
--     - SELECT ... FOR UPDATE on the members row serializes concurrent
--       schedule attempts (so two parallel requests can't both squeeze
--       past a tight weeks-available budget).
--     - Validates: start_date >= today; end_date >= start_date; weeks
--       in hold ≤ (total_weeks - vacation_weeks_used); no overlap with
--       existing scheduled/active holds.
--     - Returns:
--         { ok: true, hold_id: UUID, weeks_used: INT }       on success
--         { error: '<code>', ...details }                    on failure
--
--   cancel_vacation_hold(member_id, hold_id)
--     - Cancels a scheduled OR active hold and refunds vacation_weeks_used.
--     - For 'scheduled' holds: full refund of weeks_in_hold.
--     - For 'active' holds (already started): refund only the FUTURE
--       portion. Past + today are not refundable — Todd already factored
--       this week's planning around the absence. CEILing the
--       (end_date - today) range gives us "weeks remaining counting today".
--     - Refuses to cancel 'completed' or already-'cancelled' holds.
--     - Returns { ok: true, weeks_refunded: INT } or { error: '<code>' }.
--
--   change_pickup_location(member_id, new_location_id, new_delivery_address)
--     - Atomically swaps members.pickup_location_id with capacity check.
--     - If new_location_id is non-NULL, counts current members with that
--       location whose status is in ('active','paused','onboarding') and
--       refuses if (count + 1) > max_capacity (when max_capacity is set).
--     - Special case: if a member is *already* at the new location it's
--       a no-op (we don't want to falsely report "full" when reassigning
--       to the same stop after editing a typo, etc.).
--     - When new_delivery_address is non-NULL, sets that and clears
--       pickup_location_id (member opted into home delivery).
--     - Returns { ok: true } or { error: 'location_full', max_capacity, current }.
--
-- All three:
--   - Run as SECURITY DEFINER so they can update members rows even when
--     the calling RLS context wouldn't permit it. The API routes are
--     responsible for verifying the caller owns the member row before
--     invoking these (look up via cookie-aware RLS-scoped client first,
--     then pass verified UUID).
--   - REVOKE EXECUTE FROM PUBLIC; GRANT to authenticated + service_role.
--   - SET search_path = public, pg_temp to harden against role-mutable
--     search paths.
-- ═══════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────
-- schedule_vacation_hold
-- ───────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.schedule_vacation_hold(
  p_member_id  UUID,
  p_start_date DATE,
  p_end_date   DATE,
  p_reason     TEXT
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
BEGIN
  -- Defensive input checks.
  IF p_member_id IS NULL OR p_start_date IS NULL OR p_end_date IS NULL THEN
    RETURN json_build_object('error', 'invalid_input');
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
  -- + 1 gives an inclusive count: a same-day hold (Mon-Mon) is 1 week,
  -- a 7-day hold (Mon-Sun) is 1 week, an 8-day hold (Mon-next Mon)
  -- straddles 2 calendar weeks → 2 weeks. The formula matches what we
  -- bill the member on swap_box_item-style accounting.
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

  -- Overlap detection. Two date ranges overlap iff start_a <= end_b
  -- AND end_a >= start_b. Postgres tstzrange with the [] inclusive-
  -- both-ends form gives us this via the && overlap operator.
  --
  -- We cast DATE to timestamptz at midnight so a hold ending May 22
  -- and a new hold starting May 22 collide (same calendar day cannot
  -- simultaneously be the last day of one hold and the first of
  -- another). Use of [] is critical here — () would let touching
  -- ranges slip through.
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

  -- INSERT the hold.
  INSERT INTO vacation_holds (member_id, start_date, end_date, reason, status)
  VALUES (p_member_id, p_start_date, p_end_date, NULLIF(BTRIM(p_reason), ''), 'scheduled')
  RETURNING id INTO v_hold_id;

  -- INCREMENT the counter.
  UPDATE members
     SET vacation_weeks_used = vacation_weeks_used + v_weeks_in_hold,
         updated_at = NOW()
   WHERE id = p_member_id;

  RETURN json_build_object(
    'ok', true,
    'hold_id', v_hold_id,
    'weeks_used', v_weeks_in_hold
  );
END;
$$;

COMMENT ON FUNCTION public.schedule_vacation_hold(UUID, DATE, DATE, TEXT) IS
  'Atomic vacation-hold scheduling. Locks members row, validates start/end + budget + non-overlap, INSERTs into vacation_holds and INCREMENTs members.vacation_weeks_used in one transaction. Returns {ok|error, ...}.';

-- ───────────────────────────────────────────────────────────────────
-- cancel_vacation_hold
-- ───────────────────────────────────────────────────────────────────

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
  v_orig_weeks INT;
BEGIN
  IF p_member_id IS NULL OR p_hold_id IS NULL THEN
    RETURN json_build_object('error', 'invalid_input');
  END IF;

  -- Lock the hold row.
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

  -- Compute refund.
  --   scheduled (not yet started): refund the FULL hold (start..end).
  --   active (today is between start..end): refund only the future-week
  --     portion. The "future portion" runs from today..end and we round
  --     up exactly the same way schedule_vacation_hold does.
  v_orig_weeks := CEIL((v_end - v_start)::numeric / 7) + 1;

  IF v_status = 'scheduled' OR v_today < v_start THEN
    v_refund := v_orig_weeks;
  ELSIF v_today > v_end THEN
    -- Defensive: should be 'completed' not 'active'. Refund nothing.
    v_refund := 0;
  ELSE
    -- Mid-active. (v_end - v_today) days remain *in addition to today*.
    -- We don't refund today (it's already "spent" on planning).
    -- If today == end_date, no future refund.
    IF v_today >= v_end THEN
      v_refund := 0;
    ELSE
      v_refund := CEIL((v_end - v_today)::numeric / 7);
    END IF;
  END IF;

  -- Mark cancelled.
  UPDATE vacation_holds
     SET status = 'cancelled',
         cancelled_at = NOW()
   WHERE id = p_hold_id;

  -- Refund. GREATEST guard prevents the count from going negative if
  -- a row was somehow already debited inconsistently.
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
  'Cancels a scheduled or active vacation hold. Mid-active holds refund only the future-week portion. Returns {ok|error, weeks_refunded}.';

-- ───────────────────────────────────────────────────────────────────
-- change_pickup_location
--
-- new_location_id non-NULL + new_delivery_address NULL: switch to a
-- pickup stop. Capacity check applies.
--
-- new_location_id NULL + new_delivery_address non-NULL: switch to home
-- delivery. No capacity check (delivery is per-route, not capped here).
--
-- Both non-NULL or both NULL: invalid_input.
-- ───────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.change_pickup_location(
  p_member_id            UUID,
  p_new_location_id      UUID,
  p_new_delivery_address TEXT
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_member_status     TEXT;
  v_current_location  UUID;
  v_max_capacity      INT;
  v_is_active         BOOLEAN;
  v_is_delivery_zone  BOOLEAN;
  v_current_count     INT;
BEGIN
  IF p_member_id IS NULL THEN
    RETURN json_build_object('error', 'invalid_input');
  END IF;

  -- Mutually exclusive inputs.
  IF (p_new_location_id IS NULL AND (p_new_delivery_address IS NULL OR BTRIM(p_new_delivery_address) = ''))
     OR (p_new_location_id IS NOT NULL AND p_new_delivery_address IS NOT NULL AND BTRIM(p_new_delivery_address) <> '') THEN
    RETURN json_build_object('error', 'invalid_input');
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
    -- Look up the new location.
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

    -- Apply.
    UPDATE members
       SET pickup_location_id = p_new_location_id,
           delivery_address   = NULL,
           updated_at         = NOW()
     WHERE id = p_member_id;
  ELSE
    -- Home delivery branch.
    UPDATE members
       SET pickup_location_id = NULL,
           delivery_address   = BTRIM(p_new_delivery_address),
           updated_at         = NOW()
     WHERE id = p_member_id;
  END IF;

  RETURN json_build_object('ok', true);
END;
$$;

COMMENT ON FUNCTION public.change_pickup_location(UUID, UUID, TEXT) IS
  'Atomically changes a member''s pickup_location_id (with capacity check) or sets delivery_address for home delivery. Returns {ok|error, ...}.';

-- ───────────────────────────────────────────────────────────────────
-- Lock down EXECUTE
-- ───────────────────────────────────────────────────────────────────

REVOKE EXECUTE ON FUNCTION public.schedule_vacation_hold(UUID, DATE, DATE, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cancel_vacation_hold(UUID, UUID)               FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.change_pickup_location(UUID, UUID, TEXT)       FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.schedule_vacation_hold(UUID, DATE, DATE, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cancel_vacation_hold(UUID, UUID)               TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.change_pickup_location(UUID, UUID, TEXT)       TO authenticated, service_role;
