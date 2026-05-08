-- ═══════════════════════════════════════════════════════════════════
-- Migration 0002: Customers (source of truth for all customer types)
-- Replaces SALES_Customers sheet (1,694 rows × 19 cols → relational)
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE customers (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id             TEXT UNIQUE,                          -- maps to SALES_Customers.Customer_ID
  customer_type         TEXT NOT NULL CHECK (customer_type IN ('csa','market','wholesale','chef','employee')),
  company_name          TEXT,
  contact_name          TEXT NOT NULL,
  email                 CITEXT UNIQUE NOT NULL,
  phone                 TEXT,
  address               TEXT,
  city                  TEXT,
  state                 TEXT,
  zip                   TEXT,
  delivery_instructions TEXT,
  payment_terms         TEXT,
  price_tier            TEXT,
  shopify_customer_id   TEXT UNIQUE,
  is_active             BOOLEAN DEFAULT true,
  last_order_date       DATE,
  total_orders          INT DEFAULT 0,
  total_spent           DECIMAL(10,2) DEFAULT 0,
  notes                 TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX customers_email_idx     ON customers(email);
CREATE INDEX customers_type_idx      ON customers(customer_type) WHERE is_active = true;
CREATE INDEX customers_legacy_id_idx ON customers(legacy_id);

COMMENT ON TABLE  customers IS 'All customer types — CSA, market, wholesale, chef, employee. Source of truth.';
COMMENT ON COLUMN customers.legacy_id IS 'Maps to old SALES_Customers.Customer_ID for migration traceability';
