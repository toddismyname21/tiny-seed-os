-- 0097 — Let a chef attach a note to the order they place.
--
-- WHY: John Rezzetano caters. Each order is for a different client, and he
-- collects from the farm on whichever morning suits that job — not the
-- Wednesday/Friday the portal computes. He has asked three times for "multiple
-- orders for the week". He can ALREADY place several (place_wholesale_order
-- plain-INSERTs; EYV has two separate orders on 2026-07-22) — but once they
-- land, nothing distinguishes them: same account, same delivery date, no way to
-- tell which order belongs to which client or which morning he wants it.
--
-- One free-text note per order covers both halves. Deliberately NOT a
-- structured pickup-date column: a human packing the order reads it, and
-- over-modelling a workflow we have not watched yet would be a guess.
--
-- wholesale_orders.notes already exists and the pack sheet already carries a
-- slot for it. This only lets the ORDER PAGE write it at submit time.
--
-- ⚠ This body is the LIVE function definition (pg_get_functiondef) with three
-- surgical edits: the p_notes parameter, the v_note local, and the INSERT.
-- It is NOT retyped from 0050 — doing that would have silently reverted the
-- 0080 CUTOFF ENFORCEMENT and the account lookup, which do not appear in 0050.
--
-- The 3-arg signature is dropped so a 3-named-arg call cannot be ambiguous.
-- Already-deployed code calling with 3 args still resolves here and gets NULL,
-- so this is safe to apply BEFORE the new frontend ships.

DROP FUNCTION IF EXISTS public.place_wholesale_order(text, jsonb, date);

CREATE OR REPLACE FUNCTION public.place_wholesale_order(p_token text, p_lines jsonb, p_delivery_date date, p_notes text DEFAULT NULL)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_account       public.wholesale_accounts%ROWTYPE;
  v_discount_pct  numeric := 0;
  v_order_id      uuid;
  v_total_cents   bigint := 0;
  v_item_count    int := 0;
  v_line          jsonb;
  v_product_id    uuid;
  v_qty           int;
  v_prod          public.wholesale_products%ROWTYPE;
  v_unit_cents    int;
  v_line_cents    bigint;
  v_note          text;
BEGIN
  -- 1. Resolve the account by its permanent secret token.
  IF p_token IS NULL OR length(btrim(p_token)) = 0 THEN
    RETURN jsonb_build_object('error', 'invalid_token');
  END IF;

  SELECT * INTO v_account
  FROM public.wholesale_accounts
  WHERE order_token = p_token
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'invalid_token');
  END IF;

  -- 2. Validate the lines payload shape.
  IF p_lines IS NULL OR jsonb_typeof(p_lines) <> 'array' OR jsonb_array_length(p_lines) = 0 THEN
    RETURN jsonb_build_object('error', 'empty');
  END IF;
  IF jsonb_array_length(p_lines) > 200 THEN
    RETURN jsonb_build_object('error', 'too_many_lines');
  END IF;

  IF p_delivery_date IS NULL THEN
    RETURN jsonb_build_object('error', 'invalid_delivery_date');
  END IF;

  -- 2b. ── 0080 CUTOFF ENFORCEMENT (the ONLY change vs 0050) ──────────────────
  --     Reject orders whose period has closed, plus obviously-bad dates. All
  --     comparisons in America/New_York wall time (DST-safe: the offset used is
  --     the one in effect at `now`).
  DECLARE
    v_now_et  timestamp := now() AT TIME ZONE 'America/New_York';
    v_cutoff  timestamp := (p_delivery_date - 1) + TIME '07:00';
  BEGIN
    -- Past delivery date, or absurdly far out (> 14 days) → invalid.
    IF p_delivery_date < v_now_et::date OR p_delivery_date > v_now_et::date + 14 THEN
      RETURN jsonb_build_object('error', 'invalid_delivery_date');
    END IF;
    -- The period cutoff is 7:00 AM ET the day before delivery (Tue for a Wed
    -- delivery, Thu for a Fri delivery). After it, the window is closed.
    IF v_now_et > v_cutoff THEN
      RETURN jsonb_build_object('error', 'cutoff_passed');
    END IF;
  END;

  -- 3. The account's pricing-tier discount (defaults 0% / Standard).
  SELECT COALESCE(t.discount_pct, 0) INTO v_discount_pct
  FROM public.wholesale_pricing_tiers t
  WHERE t.id = v_account.pricing_tier_id;
  v_discount_pct := COALESCE(v_discount_pct, 0);

  -- 4. Create the order shell (status='submitted'). total_amount filled after.
  -- 0097: chef's own note (which day they want it, which client it is for).
  -- Trim, cap at 500, empty -> NULL so "has a note" stays a NOT NULL test.
  v_note := NULLIF(btrim(COALESCE(p_notes, '')), '');
  IF v_note IS NOT NULL THEN
    v_note := left(v_note, 500);
  END IF;

  INSERT INTO public.wholesale_orders (account_id, customer_id, delivery_date, status, total_amount, source, notes)
  VALUES (v_account.id, v_account.customer_id, p_delivery_date, 'submitted', 0, 'chef_portal', v_note)
  RETURNING id INTO v_order_id;

  -- 5. Price + insert each line SERVER-SIDE (never trust client prices).
  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines)
  LOOP
    -- Validate the line shape.
    IF jsonb_typeof(v_line->'product_id') <> 'string'
       OR jsonb_typeof(v_line->'qty') <> 'number' THEN
      RAISE EXCEPTION 'invalid_line';
    END IF;

    v_product_id := (v_line->>'product_id')::uuid;
    v_qty        := floor((v_line->>'qty')::numeric)::int;

    IF v_qty <= 0 THEN
      CONTINUE; -- skip zero/negative-qty lines silently
    END IF;
    IF v_qty > 100000 THEN
      RAISE EXCEPTION 'qty_out_of_range';
    END IF;

    -- Look up the product; ACTIVE catalog only.
    SELECT * INTO v_prod
    FROM public.wholesale_products
    WHERE id = v_product_id AND is_active = true
    LIMIT 1;

    IF NOT FOUND THEN
      CONTINUE; -- product turned off / gone since the page loaded → skip it
    END IF;

    -- Effective per-unit price after the account's tier discount, in cents.
    v_unit_cents := round(v_prod.price_cents * (1 - v_discount_pct / 100.0))::int;
    IF v_unit_cents < 0 THEN
      v_unit_cents := 0;
    END IF;
    v_line_cents := v_unit_cents::bigint * v_qty;

    INSERT INTO public.wholesale_order_items
      (order_id, product_id, product_name, qty, unit_price_cents, line_total_cents)
    VALUES
      (v_order_id, v_prod.id, v_prod.name, v_qty, v_unit_cents, v_line_cents::int);

    v_total_cents := v_total_cents + v_line_cents;
    v_item_count  := v_item_count + 1;
  END LOOP;

  -- 6. No priced lines survived (everything turned off) → unwind the shell.
  IF v_item_count = 0 THEN
    DELETE FROM public.wholesale_orders WHERE id = v_order_id;
    RETURN jsonb_build_object('error', 'no_available_items');
  END IF;

  -- 7. Store the dollar total on the order (legacy numeric) for the admin view.
  UPDATE public.wholesale_orders
  SET total_amount = round(v_total_cents / 100.0, 2)
  WHERE id = v_order_id;

  RETURN jsonb_build_object(
    'ok', true,
    'order_id', v_order_id,
    'total_cents', v_total_cents,
    'item_count', v_item_count,
    'delivery_date', p_delivery_date,
    'restaurant_name', v_account.restaurant_name
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.place_wholesale_order(text, jsonb, date, text) TO anon, authenticated;
