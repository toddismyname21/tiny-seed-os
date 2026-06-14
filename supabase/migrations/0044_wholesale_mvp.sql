-- 0044 — WHOLESALE MVP (chef portal foundation). Dovetails with CSA delivery_routes/stops.
-- wholesale_orders already exists (empty). Add the rest.

CREATE TABLE IF NOT EXISTS wholesale_pricing_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL, discount_pct numeric NOT NULL DEFAULT 0, created_at timestamptz DEFAULT now());

CREATE TABLE IF NOT EXISTS wholesale_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL, category text, unit text NOT NULL DEFAULT 'unit',
  price_cents int NOT NULL DEFAULT 0,
  description text, photo_url text,
  available_qty int,                       -- this week's availability; 0 = out, null = unlimited
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now());

-- Todd's ask: real-time quality photos + notes per product per week
CREATE TABLE IF NOT EXISTS wholesale_product_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES wholesale_products(id) ON DELETE CASCADE,
  photo_url text, note text, week_starting date,
  created_by text, created_at timestamptz DEFAULT now());

-- chef/restaurant accounts (draft until invited; reuses customers for auth later)
CREATE TABLE IF NOT EXISTS wholesale_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id),
  restaurant_name text NOT NULL, contact_name text, email text, phone text,
  address text, cluster text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','invited','active','paused')),
  pricing_tier_id uuid REFERENCES wholesale_pricing_tiers(id),
  min_order_cents int NOT NULL DEFAULT 0,
  delivery_day text, notes text,
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now());

CREATE TABLE IF NOT EXISTS wholesale_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES wholesale_orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES wholesale_products(id),
  product_name text, qty int NOT NULL DEFAULT 1,
  unit_price_cents int NOT NULL DEFAULT 0, line_total_cents int NOT NULL DEFAULT 0);

CREATE TABLE IF NOT EXISTS wholesale_standing_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid REFERENCES wholesale_accounts(id) ON DELETE CASCADE,
  product_id uuid REFERENCES wholesale_products(id),
  qty int NOT NULL DEFAULT 1, delivery_day text NOT NULL DEFAULT 'Wed',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','cancelled')),
  notes text, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now());

-- RLS: admin/staff full; authenticated may READ active catalog + product updates.
DO $$ DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY['wholesale_pricing_tiers','wholesale_products','wholesale_product_updates','wholesale_accounts','wholesale_order_items','wholesale_standing_orders']) LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I_staff ON %I', t, t);
    EXECUTE format($f$CREATE POLICY %I_staff ON %I FOR ALL USING (EXISTS (SELECT 1 FROM customers c WHERE c.email = auth.jwt()->>'email' AND c.role IN ('admin','staff'))) WITH CHECK (EXISTS (SELECT 1 FROM customers c WHERE c.email = auth.jwt()->>'email' AND c.role IN ('admin','staff')))$f$, t, t);
  END LOOP;
  -- chefs can read the live catalog
  EXECUTE $f$CREATE POLICY products_read ON wholesale_products FOR SELECT USING (is_active = true)$f$;
  EXECUTE $f$CREATE POLICY updates_read ON wholesale_product_updates FOR SELECT USING (true)$f$;
END $$;
