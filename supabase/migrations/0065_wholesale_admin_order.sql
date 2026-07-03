-- ============================================================================
-- 0065_wholesale_admin_order.sql
--
-- MANUAL WHOLESALE ORDER ENTRY (Todd's call, 2026-07-02).
--
-- Staff need to type in a wholesale order a chef phoned / texted / emailed, or
-- add one past the Tuesday 7 AM cutoff. Today the ONLY write paths into
-- wholesale_orders are (a) the public token RPC place_wholesale_order (0050),
-- which requires a chef's secret token, and (b) the vendor-PDF importer. Neither
-- lets an admin key in a one-off single order by hand. This migration adds a
-- SECURITY DEFINER RPC — place_wholesale_order_admin — that does exactly that.
--
-- ── HOW THIS DIFFERS FROM place_wholesale_order (0050) ──────────────────────
--   * ACCOUNT RESOLUTION: by p_account_id (the caller already picked the chef
--     from a <select>), NOT by a secret order_token. There is no public gate
--     here — the GRANT below is authenticated + service_role ONLY (never anon),
--     and every /admin/* + /api/admin/* route is middleware-gated to admin/staff
--     plus a defensive requireAdmin() check. The trust boundary is the admin
--     session, not a token embedded in the payload.
--
--   * PRICE TRUST — THE KEY DISTINCTION. 0050 NEVER trusts a client price: it
--     re-prices every line from wholesale_products × the account's tier discount,
--     because the public token page is an untrusted anon caller (the old
--     system's P0 bug was trusting client prices). Here the caller is
--     AUTHENTICATED STAFF, so an admin-set price is legitimate business data
--     (a negotiated one-off, a phoned-in "make it $30 flat", an off-catalog
--     item). The rule:
--        - If a line supplies `price_cents`, USE IT VERBATIM (admin override).
--        - Otherwise, for a CATALOG line ({product_id}), server-price it exactly
--          like 0050: product.price_cents × (1 − tier discount).
--        - A CUSTOM / off-catalog line ({product_name, price_cents}, product_id
--          NULL) MUST supply price_cents — there is no catalog price to fall
--          back to. The pack + labels pages render off product_name, so a NULL
--          product_id line is fully supported (same as the importer, 0050 note).
--
--   * LINE SHAPE: each element of p_lines is either
--        catalog:  {"product_id": uuid, "qty": int, "price_cents"?: int}
--        custom:   {"product_name": text, "qty": int, "price_cents": int}
--     (price_cents optional on catalog lines, required on custom lines.)
--
--   * STATUS / SOURCE come from params (default 'confirmed' / 'manual') so the
--     read views + the delete/edit endpoints can tell a hand-keyed order apart
--     from a chef_portal / import one. status is validated against the same
--     CHECK constraint 0050 installed.
--
--   * EDIT PATH: when p_order_id is supplied the RPC REPLACES that order's items
--     (delete + re-insert) and recomputes the total, instead of inserting a new
--     order — so the /update endpoint reuses the IDENTICAL pricing logic as
--     /create (no forked math). The edit path only ever touches a source='manual'
--     order (guarded below); a chef_portal / import order can never be rewritten
--     through here.
--
-- Same guards as 0050: empty / too_many_lines / qty range, and the shell is
-- unwound if zero priced lines survive. All money is computed in CENTS
-- internally; wholesale_orders.total_amount is stored in DOLLARS (legacy numeric)
-- for the admin view, while order ITEMS keep exact integer cents.
--
-- Idempotent: CREATE OR REPLACE FUNCTION + guarded GRANT.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.place_wholesale_order_admin(
  p_account_id    uuid,
  p_lines         jsonb,
  p_delivery_date date,
  p_status        text DEFAULT 'confirmed',
  p_source        text DEFAULT 'manual',
  p_order_id      uuid DEFAULT NULL
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
  v_product_name  text;
  v_qty           int;
  v_prod          public.wholesale_products%ROWTYPE;
  v_unit_cents    int;
  v_line_cents    bigint;
  v_has_price     boolean;
  v_status        text := COALESCE(NULLIF(btrim(p_status), ''), 'confirmed');
  v_source        text := COALESCE(NULLIF(btrim(p_source), ''), 'manual');
  v_is_edit       boolean := p_order_id IS NOT NULL;
BEGIN
  -- 1. Resolve the account (staff already picked it; no token gate here).
  IF p_account_id IS NULL THEN
    RETURN jsonb_build_object('error', 'invalid_account');
  END IF;

  SELECT * INTO v_account
  FROM public.wholesale_accounts
  WHERE id = p_account_id
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'invalid_account');
  END IF;

  -- 2. Validate status against the CHECK 0050 installed.
  IF v_status NOT IN ('draft','submitted','confirmed','packed','delivered','cancelled') THEN
    RETURN jsonb_build_object('error', 'invalid_status');
  END IF;

  -- 3. Validate the lines payload shape.
  IF p_lines IS NULL OR jsonb_typeof(p_lines) <> 'array' OR jsonb_array_length(p_lines) = 0 THEN
    RETURN jsonb_build_object('error', 'empty');
  END IF;
  IF jsonb_array_length(p_lines) > 200 THEN
    RETURN jsonb_build_object('error', 'too_many_lines');
  END IF;

  IF p_delivery_date IS NULL THEN
    RETURN jsonb_build_object('error', 'invalid_delivery_date');
  END IF;

  -- 4. The account's pricing-tier discount (defaults 0% / Standard). Only used
  --    for catalog lines that DON'T carry an admin price override.
  SELECT COALESCE(t.discount_pct, 0) INTO v_discount_pct
  FROM public.wholesale_pricing_tiers t
  WHERE t.id = v_account.pricing_tier_id;
  v_discount_pct := COALESCE(v_discount_pct, 0);

  -- 5. Create the order shell, OR (edit path) claim + wipe an existing manual
  --    order so we can rewrite its items with identical pricing. total_amount
  --    is backfilled after the lines are priced.
  IF v_is_edit THEN
    -- Only a source='manual' order may be rewritten here. A chef_portal / import
    -- order is never editable through the admin manual-entry path.
    IF NOT EXISTS (
      SELECT 1 FROM public.wholesale_orders WHERE id = p_order_id AND source = 'manual'
    ) THEN
      RETURN jsonb_build_object('error', 'not_editable');
    END IF;

    v_order_id := p_order_id;

    -- Wipe the prior items; we re-insert from p_lines below. If nothing valid
    -- survives we RAISE (step 8) so this DELETE + the UPDATE roll back — the RPC
    -- runs in one implicit transaction, so an edit can never leave an order
    -- stripped of its items.
    DELETE FROM public.wholesale_order_items WHERE order_id = v_order_id;

    UPDATE public.wholesale_orders
    SET account_id    = v_account.id,
        customer_id   = v_account.customer_id,
        delivery_date = p_delivery_date,
        status        = v_status,
        source        = 'manual',
        total_amount  = 0,
        updated_at    = now()
    WHERE id = v_order_id;
  ELSE
    INSERT INTO public.wholesale_orders
      (account_id, customer_id, delivery_date, status, total_amount, source)
    VALUES
      (v_account.id, v_account.customer_id, p_delivery_date, v_status, 0, v_source)
    RETURNING id INTO v_order_id;
  END IF;

  -- 6. Price + insert each line.
  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines)
  LOOP
    -- qty is always required and numeric.
    IF jsonb_typeof(v_line->'qty') <> 'number' THEN
      RAISE EXCEPTION 'invalid_line';
    END IF;
    v_qty := floor((v_line->>'qty')::numeric)::int;

    IF v_qty <= 0 THEN
      CONTINUE; -- skip zero/negative-qty lines silently (same as 0050)
    END IF;
    IF v_qty > 100000 THEN
      RAISE EXCEPTION 'qty_out_of_range';
    END IF;

    -- Does this line carry an admin price override?
    v_has_price := (v_line ? 'price_cents') AND jsonb_typeof(v_line->'price_cents') = 'number';

    IF jsonb_typeof(v_line->'product_id') = 'string' THEN
      -- ── CATALOG LINE ─────────────────────────────────────────────────────
      v_product_id := (v_line->>'product_id')::uuid;

      SELECT * INTO v_prod
      FROM public.wholesale_products
      WHERE id = v_product_id AND is_active = true
      LIMIT 1;

      IF NOT FOUND THEN
        -- Product turned off / gone since the page loaded → skip it (as 0050).
        CONTINUE;
      END IF;

      IF v_has_price THEN
        -- Admin override: use the staff-set price verbatim (authenticated).
        v_unit_cents := floor((v_line->>'price_cents')::numeric)::int;
      ELSE
        -- No override: server-price it exactly like 0050 (list × tier discount).
        v_unit_cents := round(v_prod.price_cents * (1 - v_discount_pct / 100.0))::int;
      END IF;

      IF v_unit_cents < 0 THEN
        v_unit_cents := 0;
      END IF;
      v_product_name := v_prod.name;
      v_line_cents := v_unit_cents::bigint * v_qty;

      INSERT INTO public.wholesale_order_items
        (order_id, product_id, product_name, qty, unit_price_cents, line_total_cents)
      VALUES
        (v_order_id, v_prod.id, v_prod.name, v_qty, v_unit_cents, v_line_cents::int);
    ELSE
      -- ── CUSTOM / OFF-CATALOG LINE ────────────────────────────────────────
      -- product_id is NULL; the pack + labels pages render off product_name.
      -- Both a name AND a price are required — there is no catalog fallback.
      IF jsonb_typeof(v_line->'product_name') <> 'string'
         OR length(btrim(v_line->>'product_name')) = 0 THEN
        RAISE EXCEPTION 'custom_line_needs_name';
      END IF;
      IF NOT v_has_price THEN
        RAISE EXCEPTION 'custom_line_needs_price';
      END IF;

      v_product_name := btrim(v_line->>'product_name');
      v_unit_cents   := floor((v_line->>'price_cents')::numeric)::int;
      IF v_unit_cents < 0 THEN
        v_unit_cents := 0;
      END IF;
      v_line_cents := v_unit_cents::bigint * v_qty;

      INSERT INTO public.wholesale_order_items
        (order_id, product_id, product_name, qty, unit_price_cents, line_total_cents)
      VALUES
        (v_order_id, NULL, v_product_name, v_qty, v_unit_cents, v_line_cents::int);
    END IF;

    v_total_cents := v_total_cents + v_line_cents;
    v_item_count  := v_item_count + 1;
  END LOOP;

  -- 7. No priced lines survived → unwind.
  IF v_item_count = 0 THEN
    IF v_is_edit THEN
      -- We already wiped the old items + touched the order row. RAISE so the
      -- whole transaction rolls back and the order keeps its prior items.
      RAISE EXCEPTION 'no_valid_items';
    ELSE
      -- Fresh insert: clean up the empty shell and return a soft error (0050).
      DELETE FROM public.wholesale_orders WHERE id = v_order_id;
      RETURN jsonb_build_object('error', 'no_valid_items');
    END IF;
  END IF;

  -- 8. Store the dollar total (legacy numeric) for the admin view.
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

-- SERVICE ROLE ONLY. The /api/admin/wholesale/orders/* routes call this via the
-- service-role client (supabaseAdmin) AFTER a requireAdmin() check — the admin
-- session is the gate, not anything in the payload. We MUST revoke the Postgres
-- default PUBLIC execute grant first: on a freshly CREATEd function PUBLIC gets
-- EXECUTE automatically, so without this REVOKE any anon OR authenticated caller
-- (e.g. a logged-in CSA member) could invoke this RPC directly through PostgREST
-- and forge/edit wholesale orders, bypassing requireAdmin entirely. This is the
-- same hardening pattern as the swap (0015), vacation/pickup (0016) and IDOR
-- (0053) RPCs. NOT granted to authenticated — no member ever calls this.
-- NOTE (Supabase gotcha, verified empirically 2026-07-02): Supabase ships an
-- ALTER DEFAULT PRIVILEGES that grants EXECUTE on every new public function to
-- anon + authenticated EXPLICITLY (not via PUBLIC). So `REVOKE ... FROM PUBLIC`
-- alone leaves anon=X/authenticated=X in the ACL and the function stays callable
-- by any member through PostgREST. We must revoke from anon + authenticated by
-- name. Confirm after apply: pg_proc.proacl should list only postgres + service_role.
REVOKE ALL ON FUNCTION
  public.place_wholesale_order_admin(uuid, jsonb, date, text, text, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION
  public.place_wholesale_order_admin(uuid, jsonb, date, text, text, uuid)
  TO service_role;

-- Verify (returns the function row so the apply is provably persisted).
SELECT proname, pronargs FROM pg_proc WHERE proname = 'place_wholesale_order_admin';
