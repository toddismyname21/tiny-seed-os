-- ═══════════════════════════════════════════════════════════════════
-- Migration 0037: place_flex_order() — atomic member flex-order submit
--
-- The member ordering page (POST /api/account/flex-order/submit) calls this
-- SECURITY DEFINER function to place (or replace) a member's flex order for a
-- week. Doing the whole thing in ONE function = ONE transaction is the only
-- race-safe way to:
--   • enforce the server-side OVERSELL GUARD (gap research M2): each line's
--     flex_inventory row is locked FOR UPDATE and remaining_qty is checked +
--     decremented atomically, so two members can't both buy the last unit.
--   • enforce the Phase-1 OVER-BALANCE CAP (spec decision log): the order
--     total may not exceed the member's available flex balance (passed in as
--     cents — Shopify store credit is the source of truth, resolved by the
--     API before the call).
--   • REPLACE the member's prior PENDING order for the week (re-submitting
--     edits the order): restock the old pending lines, then place the new
--     ones — all inside the same txn so a failure rolls back cleanly and
--     never strands decremented stock.
--
-- Auth: SECURITY DEFINER, but it re-checks the CALLER. The caller must own
-- p_member_id (member.customer_id = current_customer_id(), household-aware)
-- AND the member must be share_type='flex' + an active status. is_admin_caller
-- is NOT required — members place their own orders. The function reads the
-- caller's JWT via current_customer_id() (SECURITY DEFINER does not change
-- auth context), so a hand-crafted call for someone else's member_id is
-- rejected with {error:'forbidden'}.
--
-- Cutoff is enforced at the APPLICATION layer (the API checks Tue-8am before
-- calling) AND re-asserted here only loosely: we refuse to write when the
-- target week's items are all inactive. The hard pending→locked transition is
-- a separate cron concern (Phase 1 ships without it; orders stay 'pending').
--
-- Returns JSON:
--   {ok:true,  total_cents, items, lines:[{flex_item_id, qty, unit_price_cents, total_cents}]}
--   {error:'invalid_input'|'forbidden'|'not_flex'|'empty'|'item_unavailable'
--          |'oversold'|'over_balance', ...context}
--
-- Idempotency: CREATE OR REPLACE FUNCTION; safe to re-run.
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.place_flex_order(
  p_member_id     uuid,
  p_week_starting date,
  p_lines         jsonb,     -- [{ "flex_item_id": uuid, "qty": int }, ...]
  p_balance_cents integer    -- member's available flex balance, in cents
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_customer_id   uuid;
  v_share_type    text;
  v_status        text;
  v_line          jsonb;
  v_item_id       uuid;
  v_qty           int;
  v_price_cents   int;
  v_remaining     int;
  v_active        boolean;
  v_total_cents   int := 0;
  v_count         int := 0;
  v_result_lines  jsonb := '[]'::jsonb;
  v_old           record;
BEGIN
  -- ── Basic input validation ────────────────────────────────────────
  IF p_member_id IS NULL OR p_week_starting IS NULL THEN
    RETURN json_build_object('error', 'invalid_input');
  END IF;
  IF p_lines IS NULL OR jsonb_typeof(p_lines) <> 'array' THEN
    RETURN json_build_object('error', 'invalid_input');
  END IF;
  IF jsonb_array_length(p_lines) = 0 THEN
    RETURN json_build_object('error', 'empty');
  END IF;
  IF p_balance_cents IS NULL OR p_balance_cents < 0 THEN
    RETURN json_build_object('error', 'invalid_input');
  END IF;

  -- ── Ownership + flex-membership check (re-assert the caller) ───────
  v_customer_id := current_customer_id();
  IF v_customer_id IS NULL THEN
    RETURN json_build_object('error', 'forbidden');
  END IF;

  SELECT share_type, status INTO v_share_type, v_status
  FROM members
  WHERE id = p_member_id AND customer_id = v_customer_id;

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'forbidden');
  END IF;
  IF v_share_type <> 'flex' THEN
    RETURN json_build_object('error', 'not_flex');
  END IF;
  IF v_status NOT IN ('active', 'paused', 'onboarding') THEN
    RETURN json_build_object('error', 'forbidden');
  END IF;

  -- ── Restock + remove the member's prior PENDING order for this week ─
  -- Lock the existing pending rows, add their qty back to remaining_qty,
  -- then delete them. Locked/fulfilled orders are NOT touched (already paid).
  FOR v_old IN
    SELECT id, flex_item_id, qty
    FROM flex_orders
    WHERE member_id = p_member_id
      AND cycle_code = 'WEEKLY'
      AND week_starting = p_week_starting
      AND status = 'pending'
    FOR UPDATE
  LOOP
    UPDATE flex_inventory
       SET remaining_qty = remaining_qty + v_old.qty
     WHERE id = v_old.flex_item_id;
    DELETE FROM flex_orders WHERE id = v_old.id;
  END LOOP;

  -- ── Validate + place each new line ────────────────────────────────
  FOR v_line IN SELECT jsonb_array_elements(p_lines)
  LOOP
    BEGIN
      v_item_id := (v_line->>'flex_item_id')::uuid;
      v_qty     := (v_line->>'qty')::int;
    EXCEPTION WHEN others THEN
      RETURN json_build_object('error', 'invalid_input');
    END;

    IF v_item_id IS NULL OR v_qty IS NULL OR v_qty <= 0 OR v_qty > 100000 THEN
      RETURN json_build_object('error', 'invalid_input');
    END IF;

    -- Lock the catalog row; read price + remaining + active for THIS week.
    SELECT price_cents, remaining_qty, is_active
      INTO v_price_cents, v_remaining, v_active
    FROM flex_inventory
    WHERE id = v_item_id
      AND cycle_code = 'WEEKLY'
      AND week_starting = p_week_starting
    FOR UPDATE;

    IF NOT FOUND OR v_active IS NOT TRUE THEN
      RETURN json_build_object('error', 'item_unavailable', 'flex_item_id', v_item_id);
    END IF;

    -- OVERSELL GUARD — the line qty must not exceed remaining stock.
    IF v_qty > v_remaining THEN
      RETURN json_build_object(
        'error', 'oversold',
        'flex_item_id', v_item_id,
        'requested', v_qty,
        'remaining', v_remaining
      );
    END IF;

    v_total_cents := v_total_cents + (v_price_cents * v_qty);
    v_count := v_count + 1;
    v_result_lines := v_result_lines || jsonb_build_array(jsonb_build_object(
      'flex_item_id', v_item_id,
      'qty', v_qty,
      'unit_price_cents', v_price_cents,
      'total_cents', v_price_cents * v_qty
    ));
  END LOOP;

  IF v_count = 0 THEN
    RETURN json_build_object('error', 'empty');
  END IF;

  -- ── Phase-1 OVER-BALANCE CAP ──────────────────────────────────────
  -- The whole cart must fit inside the member's flex balance.
  IF v_total_cents > p_balance_cents THEN
    RETURN json_build_object(
      'error', 'over_balance',
      'total_cents', v_total_cents,
      'balance_cents', p_balance_cents
    );
  END IF;

  -- ── Commit: decrement stock + insert the new pending lines ─────────
  FOR v_line IN SELECT jsonb_array_elements(v_result_lines)
  LOOP
    v_item_id     := (v_line->>'flex_item_id')::uuid;
    v_qty         := (v_line->>'qty')::int;
    v_price_cents := (v_line->>'unit_price_cents')::int;

    UPDATE flex_inventory
       SET remaining_qty = remaining_qty - v_qty
     WHERE id = v_item_id;

    INSERT INTO flex_orders
      (cycle_code, week_starting, member_id, flex_item_id, qty,
       unit_price_cents, total_cents, status)
    VALUES
      ('WEEKLY', p_week_starting, p_member_id, v_item_id, v_qty,
       v_price_cents, v_price_cents * v_qty, 'pending');
  END LOOP;

  RETURN json_build_object(
    'ok', true,
    'total_cents', v_total_cents,
    'items', v_count,
    'lines', v_result_lines
  );
END;
$function$;

COMMENT ON FUNCTION public.place_flex_order(uuid, date, jsonb, integer) IS
  'Atomic member flex-order submit: re-asserts caller owns the flex member, restocks + replaces any prior pending order for the week, validates each line FOR UPDATE (oversell guard), enforces the Phase-1 over-balance cap, decrements remaining_qty, and inserts pending flex_orders. Returns {ok:true,...} or {error:...}.';

-- Allow authenticated members (and admins) to call it. The function itself
-- re-checks ownership, so EXECUTE for authenticated is safe.
GRANT EXECUTE ON FUNCTION public.place_flex_order(uuid, date, jsonb, integer) TO authenticated;
