-- 0054 — MARKET OFFERINGS (the farmers-market channel of the unified catalog).
--
-- Each week, staff pick which master products (product_library) are sold at the
-- market stall and set the retail UNIT + PRICE. A single product can have
-- MULTIPLE offerings in one week (e.g. Beets by the bunch AND by the pound), so
-- there is NO unique constraint on (week_starting, library_id) — every offering
-- is its own row with its own unit + price.
--
-- Idempotent: this version-controls a table that may already exist live. It is
-- additive + safe to re-run.
CREATE TABLE IF NOT EXISTS market_offerings (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  library_id    uuid NOT NULL REFERENCES product_library(id),
  week_starting date NOT NULL,            -- the cycle Monday this offering is sold
  name          text,                     -- optional display override (else product_library.name)
  unit          text NOT NULL DEFAULT 'each',
  price_cents   integer NOT NULL DEFAULT 0,
  is_active     boolean NOT NULL DEFAULT true,
  sort_order    integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Lookups are by week (the editor loads one week at a time).
CREATE INDEX IF NOT EXISTS market_offerings_week_idx ON market_offerings (week_starting);
CREATE INDEX IF NOT EXISTS market_offerings_library_idx ON market_offerings (library_id);

ALTER TABLE market_offerings ENABLE ROW LEVEL SECURITY;

-- Staff (admin/staff) manage the whole table. Mirrors the admin RLS pattern
-- (SECURITY DEFINER is_admin_caller(), migration 0017).
DROP POLICY IF EXISTS market_offerings_staff ON market_offerings;
CREATE POLICY market_offerings_staff ON market_offerings
  FOR ALL
  USING (is_admin_caller())
  WITH CHECK (is_admin_caller());
