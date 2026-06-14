-- 0045 — Shared PRODUCE LIBRARY (one row per real product: canonical category + photo + description).
-- Wholesale, flex, and CSA box link to it so a photo set once shows everywhere. Additive + nullable — no behavior change.
CREATE TABLE IF NOT EXISTS product_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,            -- canonical base name e.g. 'Arugula', 'King Spring Mix'
  slug text,
  category text,                        -- from the shared produce category list
  photo_url text, description text,
  quality_note text, quality_week date, -- latest "today's quality" carried across surfaces
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now());
ALTER TABLE wholesale_products ADD COLUMN IF NOT EXISTS library_id uuid REFERENCES product_library(id);
ALTER TABLE flex_inventory     ADD COLUMN IF NOT EXISTS library_id uuid REFERENCES product_library(id);
ALTER TABLE box_contents       ADD COLUMN IF NOT EXISTS library_id uuid REFERENCES product_library(id);
ALTER TABLE wholesale_accounts ADD COLUMN IF NOT EXISTS order_token text;
ALTER TABLE product_library ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS lib_staff ON product_library;
CREATE POLICY lib_staff ON product_library FOR ALL USING (EXISTS (SELECT 1 FROM customers c WHERE c.email = auth.jwt()->>'email' AND c.role IN ('admin','staff'))) WITH CHECK (EXISTS (SELECT 1 FROM customers c WHERE c.email = auth.jwt()->>'email' AND c.role IN ('admin','staff')));
DROP POLICY IF EXISTS lib_read ON product_library;
CREATE POLICY lib_read ON product_library FOR SELECT USING (true);
