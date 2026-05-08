-- ═══════════════════════════════════════════════════════════════════
-- Migration 0003: Pickup Locations
-- Replaces CSA_Pickup_Locations sheet (1,000 rows × 14 cols → relational)
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE pickup_locations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id         TEXT UNIQUE,
  name              TEXT NOT NULL,
  address           TEXT,
  city              TEXT,
  state             TEXT DEFAULT 'PA',
  zip               TEXT,
  day_of_week       TEXT CHECK (day_of_week IN ('Sun','Mon','Tue','Wed','Thu','Fri','Sat')),
  time_start        TIME,
  time_end          TIME,
  is_delivery_zone  BOOLEAN DEFAULT false,
  max_capacity      INT,
  host_name         TEXT,
  host_phone        TEXT,
  notes             TEXT,
  is_active         BOOLEAN DEFAULT true,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX pickup_locations_active_idx ON pickup_locations(is_active) WHERE is_active = true;

COMMENT ON TABLE pickup_locations IS '12 known stops: 9 Wednesday CSA + 3 markets (Bloomfield, Sewickley, Phipps).';
