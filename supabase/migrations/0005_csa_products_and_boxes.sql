-- ═══════════════════════════════════════════════════════════════════
-- Migration 0005: CSA Products (share types catalog) + Box Contents
-- Replaces CSA_Products + CSA_BoxContents sheets
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE csa_products (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id           TEXT UNIQUE,
  shopify_product_id  TEXT UNIQUE,
  name                TEXT NOT NULL,
  category            TEXT NOT NULL,
  size                TEXT,
  season              TEXT,
  frequency           TEXT,                                   -- weekly, biweekly, etc.
  price               DECIMAL(10,2),
  veg_code            TEXT,
  floral_code         TEXT,
  start_date          DATE,
  end_date            DATE,
  total_weeks         INT,
  max_members         INT,
  is_active           BOOLEAN DEFAULT true,
  description         TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX csa_products_active_idx ON csa_products(is_active, season) WHERE is_active = true;

COMMENT ON TABLE csa_products IS 'Catalog of CSA share types (Spring Full, Summer Half, Flower, Flex, etc.)';

-- ───────────────────────────────────────────────────────────────────

CREATE TABLE box_contents (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id     TEXT UNIQUE,
  week_date     DATE NOT NULL,
  share_type    TEXT NOT NULL,
  product_name  TEXT NOT NULL,
  variety       TEXT,
  quantity      DECIMAL(10,2) NOT NULL CHECK (quantity > 0),
  unit          TEXT NOT NULL,
  is_swappable  BOOLEAN DEFAULT false,
  swap_options  TEXT[],                                       -- e.g. {'lettuce','spinach','arugula'}
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (week_date, share_type, product_name)
);

CREATE INDEX box_contents_week_share_idx ON box_contents(week_date, share_type);
CREATE INDEX box_contents_swappable_idx  ON box_contents(week_date) WHERE is_swappable = true;

COMMENT ON TABLE box_contents IS 'Per-week × share-type box composition. Admin sets these weekly.';
