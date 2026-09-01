-- Fix: place_flex_order rejected store-credit members (share_type <> 'flex').
-- Built from pg_get_functiondef() of the LIVE function on 2026-09-01 with one
-- surgical edit (the not_flex guard) so no prior migration's logic is lost.
CREATE OR REPLACE FUNCTION public.place_flex_order(p_member_id uuid, p_week_starting date, p_lines jsonb, p_balance_cents integer)
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
  -- 2026-09-01: ANY live member row may carry a flex order. The app layer
  -- (lib/flex.ts resolveFlexEligibility) is the authority on WHO may order:
  -- a live flex share row OR Shopify store credit > 0. This function cannot
  -- see Shopify, so requiring share_type='flex' here wrongly rejected
  -- store-credit members (Anna Phillips 2026-08-30, error 'not_flex').
  -- Ownership + live-status checks below still gate direct callers.
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
$function$
;
