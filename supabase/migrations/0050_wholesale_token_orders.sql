-- ============================================================================
-- 0050_wholesale_token_orders.sql
--
-- Zero-barrier CHEF WHOLESALE ORDERING (Todd's call, 2026-06-14).
--
-- Each restaurant has a permanent secret `wholesale_accounts.order_token`.
-- A PUBLIC page at /order/<token> lets the chef order with NO login — the
-- token IS the access. This migration makes the existing (admin-only,
-- customer-keyed) `wholesale_orders` table able to carry a TOKEN-keyed chef
-- order, and adds a SECURITY DEFINER RPC that places one atomically with a
-- SERVER-SIDE price lookup (never trusting client prices — the old system's
-- P0 bug).
--
-- Why a migration + RPC (mirrors place_flex_order, migration 0037):
--   * wholesale_orders RLS today = admin-only (is_admin_caller). A public
--     anon submit cannot INSERT through that. The RPC runs as definer so the
--     INSERT happens with the right privileges, but ONLY after the RPC itself
--     validates the caller's token → account. The token is the gate.
--   * wholesale_orders.customer_id is NOT NULL + FKs customers(id), but chef
--     accounts have customer_id = NULL. We add a nullable account_id FK and
--     relax customer_id to nullable so a token order links to the ACCOUNT.
--   * The status CHECK lacked 'submitted'; we add it.
--
-- Idempotent: guarded ADD COLUMN / DROP+ADD CONSTRAINT / CREATE OR REPLACE.
-- ============================================================================

-- ── 1. Link orders to a wholesale ACCOUNT (token order has no customer row) ──
ALTER TABLE public.wholesale_orders
  ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES public.wholesale_accounts(id) ON DELETE SET NULL;

ALTER TABLE public.wholesale_orders
  ADD COLUMN IF NOT EXISTS source text;

-- ── 2. Relax customer_id to nullable (chef token orders have no customer) ────
ALTER TABLE public.wholesale_orders
  ALTER COLUMN customer_id DROP NOT NULL;

-- ── 3. Allow status='submitted' (chef-placed, pre-confirmation) ──────────────
ALTER TABLE public.wholesale_orders
  DROP CONSTRAINT IF EXISTS wholesale_orders_status_check;
ALTER TABLE public.wholesale_orders
  ADD CONSTRAINT wholesale_orders_status_check
  CHECK (status = ANY (ARRAY['draft','submitted','confirmed','packed','delivered','cancelled']));

CREATE INDEX IF NOT EXISTS idx_wholesale_orders_account_delivery
  ON public.wholesale_orders (account_id, delivery_date DESC);

-- ── 4. SECURITY DEFINER RPC: place a token-authenticated chef order ──────────
-- Validates the token, server-side-prices every line from wholesale_products
-- (active only), applies the account's pricing-tier discount, writes the
-- order + items, and returns { order_id, total_cents, item_count, delivery_date,
-- restaurant_name }. On any validation failure returns { error: <code> }.
--
-- All money is computed in CENTS internally; wholesale_orders.total_amount is
-- stored in DOLLARS (legacy numeric) for the admin view, while order ITEMS keep
-- exact integer cents (unit_price_cents / line_total_cents).
--
-- p_lines is a jsonb array: [{"product_id": uuid, "qty": int}, ...]
CREATE OR REPLACE FUNCTION public.place_wholesale_order(
  p_token         text,
  p_lines         jsonb,
  p_delivery_date date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  -- 3. The account's pricing-tier discount (defaults 0% / Standard).
  SELECT COALESCE(t.discount_pct, 0) INTO v_discount_pct
  FROM public.wholesale_pricing_tiers t
  WHERE t.id = v_account.pricing_tier_id;
  v_discount_pct := COALESCE(v_discount_pct, 0);

  -- 4. Create the order shell (status='submitted'). total_amount filled after.
  INSERT INTO public.wholesale_orders (account_id, customer_id, delivery_date, status, total_amount, source)
  VALUES (v_account.id, v_account.customer_id, p_delivery_date, 'submitted', 0, 'chef_portal')
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
$$;

-- Allow the public/anon role to CALL the RPC (the token inside is the gate).
GRANT EXECUTE ON FUNCTION public.place_wholesale_order(text, jsonb, date) TO anon, authenticated;

-- Verify (returns the function row so the apply is provably persisted).
SELECT proname, pronargs FROM pg_proc WHERE proname = 'place_wholesale_order';
