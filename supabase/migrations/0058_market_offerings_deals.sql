-- 0058 — MARKET OFFERINGS: multi-buy DEAL pricing ("N for $X").
--
-- A market offering can carry an optional multi-buy deal alongside its single
-- unit price — e.g. "$4 each · 2 for $7". We store it as a quantity + a total
-- price:
--   deal_qty         = the N      (e.g. 2)          -- NULL = no deal
--   deal_price_cents = the total $X in cents (e.g. 700)  -- NULL = no deal
-- Both NULL together → the offering has only its single price_cents. The market
-- price sheet + the per-product market labels read these to render a SEPARATE
-- "deal" sign for any product that has one (Todd 2026-06-26).
--
-- Additive + idempotent (safe to re-run).
ALTER TABLE market_offerings ADD COLUMN IF NOT EXISTS deal_qty integer;
ALTER TABLE market_offerings ADD COLUMN IF NOT EXISTS deal_price_cents integer;
