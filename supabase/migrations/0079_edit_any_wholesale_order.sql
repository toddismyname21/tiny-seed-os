-- ============================================================================
-- 0079_edit_any_wholesale_order.sql
--
-- EDIT ANY WHOLESALE ORDER — relax the admin edit guard (Todd's call, 2026-07-06).
--
-- Background: place_wholesale_order_admin (0065) added a manual single-order
-- entry RPC that doubles as the EDIT path (pass p_order_id → it replaces that
-- order's items with identical pricing math). But 0065 only let an admin edit a
-- source='manual' order — a chef_portal / harvie / market_wagon / email order
-- was frozen. Todd needs accuracy edits on ALL of them: a chef phones a
-- correction after submitting through the portal, an imported vendor PDF has a
-- wrong qty, an email order was keyed by another vendor code, etc. The pack crew
-- was packing off wrong sheets because the numbers couldn't be fixed at source.
--
-- ── WHAT CHANGES vs 0065 (everything else is byte-for-byte identical) ────────
--   1. EDIT GUARD RELAXED: p_order_id may now target ANY existing
--      wholesale_orders row (the old guard required source='manual'). We still
--      require the row to EXIST — a bogus id returns 'not_editable'.
--
--   2. SOURCE IS PRESERVED ON EDIT: 0065's edit UPDATE stamped source='manual',
--      which would have rewritten the provenance of a chef_portal / import order
--      the moment an admin touched it. That destroys the very records/accuracy
--      Todd is editing FOR. This version does NOT touch `source` on edit — a
--      harvie order stays 'harvie', a chef_portal order stays 'chef_portal',
--      etc. updated_at is stamped so the edit is auditable.
--
--   Pricing rules, the txn-safe delete+re-insert replace, the RAISE-on-zero-
--   valid-items rollback, the CENTS math, and the status validation are all
--   UNCHANGED from 0065. The create (INSERT) path is untouched.
--
-- ── SAFETY: can an edit be silently clobbered? ──────────────────────────────
--   * HARVIE AUTO-INGEST (0074/0077/0078) commits with onExisting='skip'
--     (wholesale-import-commit.ts): if an order already exists for
--     (account_id, delivery_date, external_ref) it returns skipped and NEVER
--     rewrites items. So the nightly auto-ingest can never clobber an admin
--     accuracy edit. Safe.
--   * MANUAL /import RE-UPLOAD is a DELIBERATE replace (onExisting='replace'):
--     re-uploading the same vendor PDF WILL overwrite the order's items and
--     re-stamp source=<vendor>, wiping an edit. This is documented, intended
--     behavior — the admin chose to re-import the source-of-truth file. Not a
--     regression; the same was true before this migration for manual re-import.
--
-- Idempotent: CREATE OR REPLACE FUNCTION + guarded GRANT. CREATE OR REPLACE
-- preserves the existing ACL, but we re-state the REVOKE/GRANT block below
-- verbatim from 0065 for clarity and to keep the service-role-only guarantee
-- self-evident in this migration.
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

  -- 5. Create the order shell, OR (edit path) claim + wipe an existing order so
  --    we can rewrite its items with identical pricing. total_amount is
  --    backfilled after the lines are priced.
  IF v_is_edit THEN
    -- ANY existing order may be edited now (0079: accuracy edits on imported /
    -- chef-portal orders, not just manual). We still require the row to EXIST.
    IF NOT EXISTS (
      SELECT 1 FROM public.wholesale_orders WHERE id = p_order_id
    ) THEN
      RETURN jsonb_build_object('error', 'not_editable');
    END IF;

    v_order_id := p_order_id;

    -- Wipe the prior items; we re-insert from p_lines below. If nothing valid
    -- survives we RAISE (step 7) so this DELETE + the UPDATE roll back — the RPC
    -- runs in one implicit transaction, so an edit can never leave an order
    -- stripped of its items.
    DELETE FROM public.wholesale_order_items WHERE order_id = v_order_id;

    -- NOTE (0079): `source` is deliberately NOT set here — an edit preserves the
    -- order's provenance (harvie / chef_portal / market_wagon / manual). Only
    -- account/date/status/total change, plus an updated_at audit stamp.
    UPDATE public.wholesale_orders
    SET account_id    = v_account.id,
        customer_id   = v_account.customer_id,
        delivery_date = p_delivery_date,
        status        = v_status,
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

-- SERVICE ROLE ONLY. Re-stated verbatim from 0065 (CREATE OR REPLACE preserves
-- the ACL, but we keep the guard self-evident in this migration). The
-- /api/admin/wholesale/orders/* routes call this via the service-role client
-- (supabaseAdmin) AFTER a requireAdmin() check — the admin session is the gate,
-- not anything in the payload. We MUST revoke the Postgres default PUBLIC
-- execute grant first: on a freshly CREATEd function PUBLIC gets EXECUTE
-- automatically, so without this REVOKE any anon OR authenticated caller (e.g. a
-- logged-in CSA member) could invoke this RPC directly through PostgREST and
-- forge/edit wholesale orders, bypassing requireAdmin entirely. NOTE (Supabase
-- gotcha, verified empirically 2026-07-02): Supabase ships an ALTER DEFAULT
-- PRIVILEGES that grants EXECUTE on every new public function to anon +
-- authenticated EXPLICITLY (not via PUBLIC), so `REVOKE ... FROM PUBLIC` alone
-- leaves anon=X/authenticated=X in the ACL. We must revoke from anon +
-- authenticated by name. Confirm after apply: pg_proc.proacl should list only
-- postgres + service_role.
REVOKE ALL ON FUNCTION
  public.place_wholesale_order_admin(uuid, jsonb, date, text, text, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION
  public.place_wholesale_order_admin(uuid, jsonb, date, text, text, uuid)
  TO service_role;

-- Verify (returns the function row so the apply is provably persisted).
SELECT proname, pronargs FROM pg_proc WHERE proname = 'place_wholesale_order_admin';
