-- 0059 — VENDOR PRODUCT MAP (wholesale order importer).
-- Lets an admin upload a vendor order PDF (Harvie / Market Wagon), parse it into
-- a wholesale_orders row, and remember how each vendor SKU / product name maps
-- onto our wholesale_products catalog so future imports auto-resolve.
--
-- vendor_product_map: (vendor, vendor_key) → wholesale_products.id (+ a display
--   fallback name so an unmapped line still has a label). UNIQUE(vendor,vendor_key)
--   so re-imports upsert rather than duplicate.
-- wholesale_orders.external_ref: the vendor's own order id (Harvie PO #, Market
--   Wagon pick-ticket id) — drives idempotency on re-import.

CREATE TABLE IF NOT EXISTS vendor_product_map (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor text NOT NULL,            -- 'harvie' | 'market_wagon'
  vendor_key text NOT NULL,        -- Harvie SKU, or normalized MW product name
  product_id uuid REFERENCES wholesale_products(id) ON DELETE SET NULL,
  product_name text,               -- display/fallback name
  created_at timestamptz DEFAULT now(),
  UNIQUE (vendor, vendor_key)
);

ALTER TABLE wholesale_orders ADD COLUMN IF NOT EXISTS external_ref text;

-- Imported Market Wagon pick tickets carry NO prices, so an imported line may
-- legitimately have an unknown unit price / line total. Relax the NOT NULL on
-- the price/qty columns (defaults remain, so existing inserts that omit them
-- still get 0/1 — this only ADDS the ability to store NULL = "unknown").
ALTER TABLE wholesale_order_items ALTER COLUMN qty DROP NOT NULL;
ALTER TABLE wholesale_order_items ALTER COLUMN unit_price_cents DROP NOT NULL;
ALTER TABLE wholesale_order_items ALTER COLUMN line_total_cents DROP NOT NULL;

-- RLS: admin/staff full access only (mirrors the wholesale_* tables in 0044).
-- No public read — vendor mapping is an internal admin concern.
DO $$
BEGIN
  EXECUTE 'ALTER TABLE vendor_product_map ENABLE ROW LEVEL SECURITY';
  EXECUTE 'DROP POLICY IF EXISTS vendor_product_map_staff ON vendor_product_map';
  EXECUTE $f$CREATE POLICY vendor_product_map_staff ON vendor_product_map FOR ALL USING (EXISTS (SELECT 1 FROM customers c WHERE c.email = auth.jwt()->>'email' AND c.role IN ('admin','staff'))) WITH CHECK (EXISTS (SELECT 1 FROM customers c WHERE c.email = auth.jwt()->>'email' AND c.role IN ('admin','staff')))$f$;
END $$;
