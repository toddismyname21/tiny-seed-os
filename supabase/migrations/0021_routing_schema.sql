-- Migration 0021: Routing Engine schema
-- Date: 2026-05-13
-- Per docs/specs/ROUTING_ENGINE_SPEC.md
--
-- Adds:
--   1. coordinates + time-window fields on pickup_locations
--   2. coordinates + wholesale operational fields on customers
--   3. wholesale_customer_id + segment + sequencing fields on delivery_stops
--   4. route_optimization_runs audit table
--   5. wholesale_orders table
--   6. RLS policies for new tables
--   7. Postgres function: members_receiving_on_date(target_date)
--
-- Builder note: this is foundation only. Mapbox client + UI come in Phase 2+.

BEGIN;

-- ────────────────────────────────────────────────────────────────────
-- 1. pickup_locations — add coordinates + time windows
-- ────────────────────────────────────────────────────────────────────

ALTER TABLE pickup_locations
  ADD COLUMN IF NOT EXISTS coordinates_lat numeric(10, 7),
  ADD COLUMN IF NOT EXISTS coordinates_lng numeric(10, 7),
  ADD COLUMN IF NOT EXISTS service_duration_minutes int DEFAULT 5,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

COMMENT ON COLUMN pickup_locations.coordinates_lat IS 'Latitude (WGS84). NULL = not yet geocoded.';
COMMENT ON COLUMN pickup_locations.coordinates_lng IS 'Longitude (WGS84). NULL = not yet geocoded.';
COMMENT ON COLUMN pickup_locations.service_duration_minutes IS 'Average minutes spent dropping the box at this stop. Default 5.';

-- Generic updated_at trigger (idempotent install — function may exist from prior migrations)
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS pickup_locations_updated_at ON pickup_locations;
CREATE TRIGGER pickup_locations_updated_at
  BEFORE UPDATE ON pickup_locations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ────────────────────────────────────────────────────────────────────
-- 2. customers — add coordinates + wholesale operational fields
-- ────────────────────────────────────────────────────────────────────

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS coordinates_lat numeric(10, 7),
  ADD COLUMN IF NOT EXISTS coordinates_lng numeric(10, 7),
  ADD COLUMN IF NOT EXISTS time_window_start time,        -- nullable: NULL means "no preferred window"
  ADD COLUMN IF NOT EXISTS time_window_end time,
  ADD COLUMN IF NOT EXISTS service_duration_minutes int DEFAULT 10,
  ADD COLUMN IF NOT EXISTS delivery_days_of_week text[] DEFAULT ARRAY[]::text[],  -- e.g. ['Mon','Wed','Thu']
  ADD COLUMN IF NOT EXISTS delivery_instructions_short text;

COMMENT ON COLUMN customers.time_window_start IS 'Earliest acceptable delivery time. NULL = flexible all day.';
COMMENT ON COLUMN customers.time_window_end IS 'Latest acceptable delivery time. NULL = flexible all day.';
COMMENT ON COLUMN customers.service_duration_minutes IS 'Avg time at stop. Default 10 min (wholesale takes longer than CSA hosts).';
COMMENT ON COLUMN customers.delivery_days_of_week IS 'Days this wholesale customer receives orders. Empty = no scheduled deliveries.';


-- ────────────────────────────────────────────────────────────────────
-- 3. delivery_stops — wholesale support + segment + sequencing
-- ────────────────────────────────────────────────────────────────────

ALTER TABLE delivery_stops
  ADD COLUMN IF NOT EXISTS wholesale_customer_id uuid REFERENCES customers(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS optimized_eta timestamptz,
  ADD COLUMN IF NOT EXISTS optimized_distance_meters int,
  ADD COLUMN IF NOT EXISTS optimization_run_id uuid;

-- New constraint: exactly ONE of pickup_location_id, member_id, wholesale_customer_id must be set
ALTER TABLE delivery_stops DROP CONSTRAINT IF EXISTS delivery_stops_target_xor;
ALTER TABLE delivery_stops ADD CONSTRAINT delivery_stops_target_xor CHECK (
  (CASE WHEN pickup_location_id IS NOT NULL THEN 1 ELSE 0 END
 + CASE WHEN member_id IS NOT NULL THEN 1 ELSE 0 END
 + CASE WHEN wholesale_customer_id IS NOT NULL THEN 1 ELSE 0 END) = 1
);

CREATE INDEX IF NOT EXISTS delivery_stops_wholesale_idx
  ON delivery_stops(wholesale_customer_id, route_id) WHERE wholesale_customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS delivery_stops_optimization_idx
  ON delivery_stops(optimization_run_id) WHERE optimization_run_id IS NOT NULL;


-- ────────────────────────────────────────────────────────────────────
-- 4. route_optimization_runs — audit trail
-- ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS route_optimization_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id uuid NOT NULL REFERENCES delivery_routes(id) ON DELETE CASCADE,
  triggered_by_user_id uuid,
  triggered_at timestamptz NOT NULL DEFAULT now(),
  triggered_reason text NOT NULL,
  provider text NOT NULL,  -- 'mapbox_v2' | 'fallback_heuristic' | 'manual'
  api_request_json jsonb,
  api_response_json jsonb,
  duration_ms int,
  stops_optimized int,
  total_distance_meters int,
  total_duration_seconds int,
  error_message text,
  success boolean NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS route_optimization_runs_route_idx
  ON route_optimization_runs(route_id, triggered_at DESC);

CREATE INDEX IF NOT EXISTS route_optimization_runs_provider_success_idx
  ON route_optimization_runs(provider, success, triggered_at DESC);

COMMENT ON TABLE route_optimization_runs IS
  'Every optimizer invocation is logged here for debugging + cost monitoring + audit.';


-- ────────────────────────────────────────────────────────────────────
-- 5. wholesale_orders — order surface (replaces SALES_ORDERS sheet)
-- ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS wholesale_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  delivery_date date NOT NULL,
  status text NOT NULL CHECK (status IN ('draft', 'confirmed', 'packed', 'delivered', 'cancelled')),
  total_lbs numeric,
  total_amount numeric,
  invoice_number text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(customer_id, delivery_date)
);

CREATE INDEX IF NOT EXISTS wholesale_orders_date_status_idx
  ON wholesale_orders(delivery_date, status);

DROP TRIGGER IF EXISTS wholesale_orders_updated_at ON wholesale_orders;
CREATE TRIGGER wholesale_orders_updated_at
  BEFORE UPDATE ON wholesale_orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE wholesale_orders IS
  'One row per wholesale customer per delivery date. Drives dynamic route seeding.';


-- ────────────────────────────────────────────────────────────────────
-- 6. RLS policies (new tables only)
-- ────────────────────────────────────────────────────────────────────

ALTER TABLE route_optimization_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS route_optimization_runs_admin_all ON route_optimization_runs;
CREATE POLICY route_optimization_runs_admin_all ON route_optimization_runs
  FOR ALL TO authenticated
  USING (is_admin_caller())
  WITH CHECK (is_admin_caller());

ALTER TABLE wholesale_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS wholesale_orders_admin_all ON wholesale_orders;
CREATE POLICY wholesale_orders_admin_all ON wholesale_orders
  FOR ALL TO authenticated
  USING (is_admin_caller())
  WITH CHECK (is_admin_caller());

-- Future: wholesale_orders_customer_read policy for the wholesale customer portal
-- comes in the wholesale migration (~Day 30+). Admin-only for now.


-- ────────────────────────────────────────────────────────────────────
-- 7. members_receiving_on_date(target_date) function
-- ────────────────────────────────────────────────────────────────────
--
-- Returns members eligible to receive a delivery on the given date.
-- Used by route seeding to determine WHO needs a stop (host or home).
--
-- Filters applied:
--   • status = 'active'
--   • date is within season (start_date ≤ target_date ≤ end_date)
--   • No vacation_hold covering target_date
--   • For BIWEEKLY shares: biweekly_week matches week parity from start_date
--
-- Returns:
--   member_id, share_type, share_size, biweekly_week,
--   delivery_method ('host_pickup' | 'home_delivery'),
--   pickup_location_id (if host),
--   delivery_address (if home)

CREATE OR REPLACE FUNCTION members_receiving_on_date(target_date date)
RETURNS TABLE (
  member_id uuid,
  customer_id uuid,
  share_type text,
  share_size text,
  biweekly_week text,
  delivery_method text,
  pickup_location_id uuid,
  delivery_address text
)
LANGUAGE sql
STABLE
AS $$
  WITH active_members AS (
    SELECT m.*
    FROM members m
    WHERE m.status = 'active'
      AND (m.start_date IS NULL OR m.start_date <= target_date)
      AND (m.end_date IS NULL OR m.end_date >= target_date)
  ),
  vacation_skips AS (
    SELECT vh.member_id
    FROM vacation_holds vh
    WHERE target_date BETWEEN vh.start_date AND vh.end_date
      AND vh.status = 'active'
  ),
  biweekly_eligible AS (
    -- Weekly shares (biweekly_week IS NULL): always receive
    -- Biweekly shares: receive when week parity matches their A/B assignment
    -- Week parity rule: count weeks since first Wednesday of season.
    --   Week A receives in even weeks (0, 2, 4, ...) from season start
    --   Week B receives in odd weeks (1, 3, 5, ...) from season start
    SELECT a.id AS member_id
    FROM active_members a
    WHERE a.biweekly_week IS NULL
       OR (
         a.biweekly_week = 'A'
         AND (FLOOR((target_date - a.start_date) / 7.0)::int % 2) = 0
       )
       OR (
         a.biweekly_week = 'B'
         AND (FLOOR((target_date - a.start_date) / 7.0)::int % 2) = 1
       )
  )
  SELECT
    a.id AS member_id,
    a.customer_id,
    a.share_type,
    a.share_size,
    a.biweekly_week,
    CASE
      WHEN a.pickup_location_id IS NOT NULL THEN 'host_pickup'
      WHEN a.delivery_address IS NOT NULL THEN 'home_delivery'
      ELSE 'unassigned'
    END AS delivery_method,
    a.pickup_location_id,
    a.delivery_address
  FROM active_members a
  WHERE a.id IN (SELECT member_id FROM biweekly_eligible)
    AND a.id NOT IN (SELECT member_id FROM vacation_skips);
$$;

COMMENT ON FUNCTION members_receiving_on_date(date) IS
  'Returns members eligible for delivery on target_date — filters by active status, season, biweekly week parity, and vacation holds. Use for dynamic route seeding.';


-- ────────────────────────────────────────────────────────────────────
-- 8. wholesale_orders_for_date(target_date) — companion query
-- ────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION wholesale_orders_for_date(target_date date)
RETURNS TABLE (
  customer_id uuid,
  company_name text,
  contact_name text,
  address text,
  coordinates_lat numeric,
  coordinates_lng numeric,
  time_window_start time,
  time_window_end time,
  service_duration_minutes int,
  order_id uuid,
  status text,
  total_amount numeric
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    c.id AS customer_id,
    c.company_name,
    c.contact_name,
    c.address,
    c.coordinates_lat,
    c.coordinates_lng,
    c.time_window_start,
    c.time_window_end,
    c.service_duration_minutes,
    wo.id AS order_id,
    wo.status,
    wo.total_amount
  FROM wholesale_orders wo
  JOIN customers c ON c.id = wo.customer_id
  WHERE wo.delivery_date = target_date
    AND wo.status IN ('confirmed', 'packed')
    AND c.is_active = true;
$$;

COMMENT ON FUNCTION wholesale_orders_for_date(date) IS
  'Returns confirmed wholesale orders for a given date with full customer + coords info. Use for dynamic route seeding.';


COMMIT;
