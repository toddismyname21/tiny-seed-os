-- ============================================================================
-- 0080_wholesale_period_fixes.sql
--
-- WHOLESALE PER-PERIOD FIXES (Todd's ask, 2026-07-09; from
-- docs/audits/WHOLESALE_PORTAL_AUDIT_2026-07.md).
--
-- Two things in this migration:
--
--   B. SERVER-SIDE CUTOFF ENFORCEMENT — CREATE OR REPLACE place_wholesale_order
--      (the 0050 token RPC) so a chef can no longer submit past the period's
--      cutoff. The audit found cutoffs are DISPLAY-ONLY: fetched Thursday
--      afternoon (past the Thu 7 AM Friday cutoff), `?day=fri` still SOLD next-
--      morning Friday delivery. The ONLY change vs 0050 is a date-validation
--      block; pricing, the token gate, the server-side price lookup, the
--      skip-inactive rule, the CENTS math, and the anon+authenticated GRANT are
--      all byte-for-byte identical to 0050 (the public token RPC MUST stay
--      anon-callable — the token inside is the gate).
--
--   A. PER-PERIOD AVAILABILITY-LIST cron schedules + deploy-safe gate flags for
--      the two new endpoints (/api/cron/wholesale-list-wed, -fri). Same Vault /
--      pg_cron / pg_net pattern as migrations 0033 + 0074. Both flags seed
--      'false' so nothing sends until Todd approves the copy and arms them.
--
-- ── CUTOFF MATH (DST-safe) ───────────────────────────────────────────────────
--   v_now_et := now() AT TIME ZONE 'America/New_York'   -- ET wall-clock NOW
--                                                          (offset is the one in
--                                                           effect at `now`, so
--                                                           EDT/EST is automatic)
--   v_cutoff := (p_delivery_date - 1) + TIME '07:00'    -- 7:00 AM ET the day
--                                                          before delivery
--   reject cutoff_passed          when  v_now_et > v_cutoff
--   reject invalid_delivery_date  when  date is in the past OR > 14 days out
--   A Wed delivery cuts off Tue 07:00 ET; a Fri delivery cuts off Thu 07:00 ET —
--   both are exactly "the day before at 7 AM", so one rule covers both periods.
--
-- ── Idempotency ──────────────────────────────────────────────────────────────
-- CREATE OR REPLACE FUNCTION (preserves the ACL; GRANT re-stated verbatim from
-- 0050 for clarity); portal_settings seeds ON CONFLICT DO NOTHING; cron jobs
-- unschedule-guarded then re-scheduled. The Management API runner wraps each
-- submission in one implicit transaction with no trailing ROLLBACK, so the DDL
-- persists.
-- ============================================================================

-- ── B. SERVER-SIDE CUTOFF ENFORCEMENT — place_wholesale_order (0050 + cutoff) ──
-- Restated in full from 0050. The ONLY difference is the "0080 CUTOFF" nested
-- block added after the existing p_delivery_date NULL check (step 2b). Diff this
-- against 0050 to confirm: nothing else changed.
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
-- Re-stated VERBATIM from 0050 — the public token page submits as anon, so the
-- RPC must stay anon-callable. CREATE OR REPLACE preserves the ACL; this keeps
-- the grant self-evident in the migration that touched the function.
GRANT EXECUTE ON FUNCTION public.place_wholesale_order(text, jsonb, date) TO anon, authenticated;

-- ── A. AVAILABILITY-LIST gate flags (deploy-safe; seed 'false') ───────────────
-- portal_settings created in migration 0070. ON CONFLICT DO NOTHING leaves any
-- pre-existing / admin-edited value untouched. Nothing sends until Todd arms
-- these after approving the email copy.
INSERT INTO portal_settings (key, value) VALUES
  ('wholesale_list_wed_enabled', 'false'),
  ('wholesale_list_fri_enabled', 'false')
ON CONFLICT (key) DO NOTHING;

-- ── A. AVAILABILITY-LIST cron schedules (Vault pattern, identical to 0074) ────
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Clean prior definitions (cron.unschedule throws if the job is absent).
SELECT cron.unschedule('csa-wholesale-list-wed')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'csa-wholesale-list-wed');
SELECT cron.unschedule('csa-wholesale-list-fri')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'csa-wholesale-list-fri');

-- (Re)schedule both inside a DO block that defers on a missing Vault secret
-- (NOTICE, not error) — identical guard to migrations 0033 / 0074.
DO $$
DECLARE
  has_secret BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM vault.decrypted_secrets WHERE name = 'cron_secret'
  ) INTO has_secret;

  IF NOT has_secret THEN
    RAISE NOTICE
      'cron_secret not present in Supabase Vault — skipping cron.schedule for the wholesale-list jobs. '
      'Store it with:  select vault.create_secret(''<THE_SECRET>'', ''cron_secret'');  '
      'then run the cron.schedule blocks from this migration manually.';
    RETURN;
  END IF;

  -- WEDNESDAY-period availability list — Sundays 21:10 UTC (~5:10 PM ET), the
  -- day BEFORE the Monday 9:05 chef reminder. They dedupe naturally by content:
  -- this is the full "list is open" announcement; the Monday cron is the bare
  -- last-call nudge to accounts still not ordered.
  PERFORM cron.schedule(
    'csa-wholesale-list-wed',
    '10 21 * * 0',
    $body$
    SELECT net.http_post(
      url     := 'https://csa.tinyseedfarm.com/api/cron/wholesale-list-wed',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (
          SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret'
        )
      ),
      body    := jsonb_build_object('source', 'pg_cron')
    );
    $body$
  );

  -- FRIDAY-period availability list — Wednesdays 15:00 UTC (~11:00 AM ET),
  -- cutoff Thursday 7 AM ET. Links carry ?day=fri.
  PERFORM cron.schedule(
    'csa-wholesale-list-fri',
    '0 15 * * 3',
    $body$
    SELECT net.http_post(
      url     := 'https://csa.tinyseedfarm.com/api/cron/wholesale-list-fri',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (
          SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret'
        )
      ),
      body    := jsonb_build_object('source', 'pg_cron')
    );
    $body$
  );

  RAISE NOTICE
    'Scheduled csa-wholesale-list-wed (Sun 21:10 UTC) and csa-wholesale-list-fri '
    '(Wed 15:00 UTC). Both GATED behind portal_settings flags (seeded false). '
    'Verify with the SELECTs below.';
END
$$;

-- Verification (read-only echoes the cron API runner returns as confirmation).
SELECT proname, pronargs FROM pg_proc WHERE proname = 'place_wholesale_order';
SELECT key, value FROM portal_settings
WHERE key IN ('wholesale_list_wed_enabled', 'wholesale_list_fri_enabled')
ORDER BY key;
SELECT jobname, schedule, active FROM cron.job
WHERE jobname IN ('csa-wholesale-list-wed', 'csa-wholesale-list-fri')
ORDER BY jobname;
