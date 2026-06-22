-- 0055 — MARKET OFFERINGS: per-market tagging + planned/reconciliation qty.
--
-- Extends market_offerings (0054) so each offering is tagged to ONE specific
-- farmers-market and carries a planned harvest quantity. The 4 markets are
-- pickup_locations rows with is_delivery_zone = false AND
-- day_of_week IN ('Tue','Sat','Sun'):
--   Lawrenceville (Tue), Bloomfield (Sat), Sewickley (Sat), South Side (Sun).
--
-- Pack-day mapping (consumed by /admin/harvest): Tue market → Monday pack;
-- Sat/Sun market → Thursday pack.
--
-- planned_qty   — the farmer's estimate of how much to bring (shown on the
--                 harvest list). Nullable: legacy / not-yet-estimated rows.
-- leftover_qty  — post-market reconciliation: unsold amount (set later).
-- donated_qty   — post-market reconciliation: donated amount (set later).
--
-- Idempotent + additive: this version-controls columns that were applied live.
-- Safe to re-run.
ALTER TABLE market_offerings
  ADD COLUMN IF NOT EXISTS market_location_id uuid REFERENCES pickup_locations(id),
  ADD COLUMN IF NOT EXISTS planned_qty  numeric,
  ADD COLUMN IF NOT EXISTS leftover_qty numeric,
  ADD COLUMN IF NOT EXISTS donated_qty  numeric;

-- Harvest splits offerings by market; index the tag for those grouped reads.
CREATE INDEX IF NOT EXISTS market_offerings_market_idx
  ON market_offerings (market_location_id);
