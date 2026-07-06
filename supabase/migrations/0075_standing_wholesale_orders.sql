-- ═══════════════════════════════════════════════════════════════════
-- Migration 0075: Standing wholesale orders (auto-generate weekly)
--
-- Todd's directive (2026-07-06): recurring wholesale orders (e.g. Mediterra's
-- weekly 50# King Spring Mix) must appear in each week's pick/pack list
-- AUTOMATICALLY, "unless otherwise removed." Until now they were hand-entered
-- as a fresh wholesale_order every week — easy to forget (this week 66# of
-- standing King Spring Mix was missing until caught).
--
-- Model:
--   • standing_orders   — one row per (account, product) that recurs. active=false
--                         removes it permanently; a per-week skip = cancel that
--                         week's generated order.
--   • generate_standing_orders(target_date)  — materializes every ACTIVE standing
--                         row into a real wholesale_order+item for target_date.
--                         DEDUP by (account, delivery_date, product): if the chef
--                         already has that product that week (e.g. emailed it in),
--                         the standing row is SKIPPED — never double-counted.
--   • pg_cron 'csa-standing-orders' — Mon 06:00 ET, targets that week's Wednesday,
--                         so standing demand is in the pick list before Todd works it.
--
-- Idempotent: IF NOT EXISTS / ON CONFLICT / unschedule-guard. Re-running is safe;
-- running the generator twice for the same week is a no-op (dedup).
-- ═══════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 1. Standing-order definitions -------------------------------------------------
CREATE TABLE IF NOT EXISTS standing_orders (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id       uuid NOT NULL REFERENCES wholesale_accounts(id) ON DELETE CASCADE,
  product_id       uuid REFERENCES wholesale_products(id),
  product_name     text NOT NULL,
  qty              numeric NOT NULL CHECK (qty > 0),
  unit_price_cents integer NOT NULL DEFAULT 0,
  active           boolean NOT NULL DEFAULT true,
  delivery_dow     integer NOT NULL DEFAULT 3,  -- 0=Sun..6=Sat; 3=Wed (the wholesale run)
  notes            text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT standing_orders_acct_prod_uniq UNIQUE (account_id, product_id)
);

-- Not member-facing; service-role only (RLS on, no policies = deny all via PostgREST).
ALTER TABLE standing_orders ENABLE ROW LEVEL SECURITY;

-- 2. Seed the four current standing orders (all King Spring Mix per lb @ $10/lb).
--    ON CONFLICT keeps any admin-edited qty/active untouched on re-run.
INSERT INTO standing_orders (account_id, product_id, product_name, qty, unit_price_cents, notes) VALUES
  ('8bb01814-c749-4d3e-b1ff-8c08609bbe40','1c8034fe-78e6-433e-beec-65afd26aaa07','King Spring Mix (per lb)',50,1000,'Mediterra Mt. Lebanon — standing unless directed'),
  ('6d1e3fd6-d801-453e-b9e9-c3cff4b67f19','1c8034fe-78e6-433e-beec-65afd26aaa07','King Spring Mix (per lb)',10,1000,'Butter Joint — standing'),
  ('6c66130e-8026-4fdc-8b7e-193cab9c2038','1c8034fe-78e6-433e-beec-65afd26aaa07','King Spring Mix (per lb)',6,1000,'Cafe Verde — standing'),
  ('4de45452-0db1-44f7-a941-3876cd18b9f7','1c8034fe-78e6-433e-beec-65afd26aaa07','King Spring Mix (per lb)',10,1000,'Black Radish (Sherri) — standing')
ON CONFLICT (account_id, product_id) DO NOTHING;

-- 3. Generator — materialize active standing rows for target_date -----------------
CREATE OR REPLACE FUNCTION generate_standing_orders(target_date date)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s            RECORD;
  v_order_id   uuid;
  v_created    integer := 0;
BEGIN
  FOR s IN SELECT * FROM standing_orders WHERE active LOOP
    -- Dedup: skip if this account already has this product for target_date.
    IF EXISTS (
      SELECT 1
      FROM wholesale_orders wo
      JOIN wholesale_order_items woi ON woi.order_id = wo.id
      WHERE wo.account_id = s.account_id
        AND wo.delivery_date = target_date
        AND wo.status = 'submitted'
        AND ( (s.product_id IS NOT NULL AND woi.product_id = s.product_id)
              OR (s.product_id IS NULL AND woi.product_name = s.product_name) )
    ) THEN
      CONTINUE;
    END IF;

    -- Reuse this account's 'standing' order for the week, else open one.
    SELECT id INTO v_order_id
    FROM wholesale_orders
    WHERE account_id = s.account_id
      AND delivery_date = target_date
      AND source = 'standing'
      AND status = 'submitted'
    LIMIT 1;

    IF v_order_id IS NULL THEN
      INSERT INTO wholesale_orders (account_id, delivery_date, status, source, total_amount, notes)
      VALUES (s.account_id, target_date, 'submitted', 'standing', 0, 'Auto-generated standing order')
      RETURNING id INTO v_order_id;
    END IF;

    INSERT INTO wholesale_order_items (order_id, product_id, product_name, qty, unit_price_cents, line_total_cents)
    VALUES (v_order_id, s.product_id, s.product_name, s.qty, s.unit_price_cents, (s.qty * s.unit_price_cents)::int);

    UPDATE wholesale_orders
    SET total_amount = COALESCE(total_amount, 0) + (s.qty * s.unit_price_cents) / 100.0,
        updated_at = now()
    WHERE id = v_order_id;

    v_created := v_created + 1;
  END LOOP;

  RETURN v_created;
END
$$;

-- Lock the generator down: service-role / cron owner only (Supabase grants anon+
-- authenticated by default on functions — revoke explicitly, per the grant gotcha).
REVOKE ALL ON FUNCTION generate_standing_orders(date) FROM PUBLIC, anon, authenticated;

-- 4. Weekly cron — Mon 10:00 UTC (06:00 ET), target THIS week's Wednesday --------
--    Wednesday-of-week = current_date + ((3 - dow + 7) % 7). On Monday (dow=1)
--    that is +2 days = Wed. Pure-SQL job (no HTTP / no CRON_SECRET needed).
SELECT cron.unschedule('csa-standing-orders')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'csa-standing-orders');

SELECT cron.schedule(
  'csa-standing-orders',
  '0 10 * * 1',
  $body$
  SELECT generate_standing_orders(
    (current_date + ((3 - extract(dow from current_date)::int + 7) % 7))::date
  );
  $body$
);

-- 5. Verification (read-only echo).
SELECT jobname, schedule, active FROM cron.job WHERE jobname = 'csa-standing-orders';
SELECT account_id, product_name, qty, active FROM standing_orders ORDER BY qty DESC;
