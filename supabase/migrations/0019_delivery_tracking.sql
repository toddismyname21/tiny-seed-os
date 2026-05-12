-- ═══════════════════════════════════════════════════════════════════
-- Migration 0019: Delivery tracking (Day 9 — V2 native Supabase)
--
-- Why this migration exists
-- ─────────────────────────
-- The original Day 9 plan was to bridge member dashboards to the Apps
-- Script `SALES_DeliveryStops` sheet. Live audit on 2026-05-11 found
-- that sheet holds zero rows — the wholesale driver app never landed
-- a write to production. Per Todd's decision (CSA_MIGRATION_PLAN_2026
-- Day 9 V2), we pull the Phase 2 native Supabase work forward and skip
-- the bridge entirely. Apps Script has nothing to bridge to.
--
-- What this builds
-- ────────────────
-- Two new tables, two enums, indexes, a denormalization trigger, and
-- RLS policies that let:
--   * Admins (Todd today, future staff) full read+write
--   * Members read ONLY their own stop on routes they're on
--   * Service role full bypass (already implicit)
--
-- We DO NOT create the `delivery-proofs` Storage bucket here — Storage
-- buckets are provisioned via the Supabase Management API (or Studio),
-- not SQL migrations. The companion script `scripts/migrate-csa/
-- run_migration.py` orchestrates both halves.
--
-- Forward-only. Apply via Supabase Management API.
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

-- ───────────────────────────────────────────────────────────────────
-- 1. Enums
-- ───────────────────────────────────────────────────────────────────

CREATE TYPE route_status AS ENUM (
  'planned',
  'in_progress',
  'completed',
  'cancelled'
);

COMMENT ON TYPE route_status IS
  'Lifecycle of a delivery_routes row. planned → in_progress (admin tap Start) → completed (all stops done OR admin tap Complete). cancelled is a manual override.';

CREATE TYPE stop_status AS ENUM (
  'pending',
  'out_for_delivery',
  'arrived',
  'completed',
  'exception'
);

COMMENT ON TYPE stop_status IS
  'Lifecycle of a delivery_stops row. pending (route not started) → out_for_delivery (route started, this stop not yet visited) → arrived (driver at door) → completed (delivered). exception is a terminal failure state with notes.';

-- ───────────────────────────────────────────────────────────────────
-- 2. delivery_routes — one row per route per day
--
-- Today we run a single Wednesday CSA route. The schema is per-day so
-- future Mon/Thu wholesale routes (Phase 2) can coexist without a
-- composite key change. `route_date` is NOT unique because a future
-- multi-driver day would split into multiple rows.
-- ───────────────────────────────────────────────────────────────────

CREATE TABLE delivery_routes (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_date       DATE NOT NULL,
  driver_id        UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  driver_name      TEXT NOT NULL DEFAULT 'Todd',
  status           route_status NOT NULL DEFAULT 'planned',
  total_stops      INT NOT NULL DEFAULT 0 CHECK (total_stops >= 0),
  completed_stops  INT NOT NULL DEFAULT 0 CHECK (completed_stops >= 0),
  started_at       TIMESTAMPTZ,
  completed_at     TIMESTAMPTZ,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT delivery_routes_completed_le_total
    CHECK (completed_stops <= total_stops),
  CONSTRAINT delivery_routes_started_when_in_progress
    CHECK (
      status = 'planned'
      OR started_at IS NOT NULL
    ),
  CONSTRAINT delivery_routes_completed_when_done
    CHECK (
      status <> 'completed'
      OR completed_at IS NOT NULL
    )
);

COMMENT ON TABLE delivery_routes IS
  'One delivery route per day. Currently single-driver (Todd) — multi-driver Phase 2 will add a routes-per-day fanout.';
COMMENT ON COLUMN delivery_routes.driver_name IS
  'Shown to members ("Todd is on the road"). First-name only by convention — never put a last name here.';
COMMENT ON COLUMN delivery_routes.total_stops IS
  'Denormalized from delivery_stops. Maintained by the auto-update trigger so the member widget can read it cheaply.';

CREATE INDEX delivery_routes_route_date_idx
  ON delivery_routes (route_date DESC);

CREATE INDEX delivery_routes_status_idx
  ON delivery_routes (status)
  WHERE status IN ('planned', 'in_progress');

-- ───────────────────────────────────────────────────────────────────
-- 3. delivery_stops — one row per stop on a route
--
-- A stop is EITHER a pickup-location stop (pickup_location_id set) for
-- the cluster of members at a host, OR a per-member stop (member_id
-- set) for home-delivery. Exactly one of the two FKs is non-null —
-- enforced by the XOR check below.
-- ───────────────────────────────────────────────────────────────────

CREATE TABLE delivery_stops (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id            UUID NOT NULL REFERENCES delivery_routes(id) ON DELETE CASCADE,
  pickup_location_id  UUID REFERENCES pickup_locations(id) ON DELETE SET NULL,
  member_id           UUID REFERENCES members(id) ON DELETE SET NULL,
  stop_order          INT NOT NULL CHECK (stop_order > 0),
  status              stop_status NOT NULL DEFAULT 'pending',
  scheduled_time      TIME,
  eta                 TIMESTAMPTZ,
  arrived_at          TIMESTAMPTZ,
  completed_at        TIMESTAMPTZ,
  proof_photo_url     TEXT,
  exception_notes     TEXT,
  gps_lat             NUMERIC(9, 6),
  gps_lng             NUMERIC(9, 6),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- XOR: exactly one of pickup_location_id / member_id must be set.
  -- The (NOT NULL) <> (NOT NULL) idiom evaluates to TRUE iff the two
  -- booleans differ.
  CONSTRAINT delivery_stops_target_xor
    CHECK ((pickup_location_id IS NOT NULL) <> (member_id IS NOT NULL)),

  -- arrived_at must come after the route started (we don't enforce
  -- the FK timestamp comparison here — the route's started_at can be
  -- null in 'planned' state; defer to app-level checks).
  CONSTRAINT delivery_stops_arrived_before_completed
    CHECK (
      arrived_at IS NULL
      OR completed_at IS NULL
      OR completed_at >= arrived_at
    ),

  -- A stop in 'arrived' or 'completed' must have arrived_at set.
  CONSTRAINT delivery_stops_arrived_when_arrived
    CHECK (
      status NOT IN ('arrived', 'completed')
      OR arrived_at IS NOT NULL
    ),

  -- A stop in 'completed' must have completed_at set.
  CONSTRAINT delivery_stops_completed_when_completed
    CHECK (
      status <> 'completed'
      OR completed_at IS NOT NULL
    ),

  -- A stop in 'exception' must have notes (so members get a why).
  CONSTRAINT delivery_stops_notes_when_exception
    CHECK (
      status <> 'exception'
      OR (exception_notes IS NOT NULL AND length(trim(exception_notes)) > 0)
    ),

  -- One stop_order value per route (so the UI list is well-defined).
  UNIQUE (route_id, stop_order)
);

COMMENT ON TABLE delivery_stops IS
  'One row per stop on a route. Either pickup-location (host cluster) OR member (home delivery), enforced by XOR check.';
COMMENT ON COLUMN delivery_stops.pickup_location_id IS
  'Set for HOST stops — every member at that location shares this row''s status.';
COMMENT ON COLUMN delivery_stops.member_id IS
  'Set for HOME-DELIVERY stops — a per-member stop. The XOR check ensures pickup_location_id is null when this is set.';

CREATE INDEX delivery_stops_route_order_idx
  ON delivery_stops (route_id, stop_order);

CREATE INDEX delivery_stops_pickup_loc_idx
  ON delivery_stops (pickup_location_id, route_id)
  WHERE pickup_location_id IS NOT NULL;

CREATE INDEX delivery_stops_member_idx
  ON delivery_stops (member_id, route_id)
  WHERE member_id IS NOT NULL;

CREATE INDEX delivery_stops_status_idx
  ON delivery_stops (status)
  WHERE status IN ('out_for_delivery', 'arrived');

-- ───────────────────────────────────────────────────────────────────
-- 4. updated_at maintenance (consistent with migration 0010)
-- ───────────────────────────────────────────────────────────────────

CREATE TRIGGER trg_delivery_routes_updated_at
  BEFORE UPDATE ON delivery_routes
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_delivery_stops_updated_at
  BEFORE UPDATE ON delivery_stops
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- ───────────────────────────────────────────────────────────────────
-- 5. Audit trail — capture every change so admin actions are reviewable
-- ───────────────────────────────────────────────────────────────────

CREATE TRIGGER audit_delivery_routes
  AFTER INSERT OR UPDATE OR DELETE ON delivery_routes
  FOR EACH ROW EXECUTE FUNCTION log_audit_event();

CREATE TRIGGER audit_delivery_stops
  AFTER INSERT OR UPDATE OR DELETE ON delivery_stops
  FOR EACH ROW EXECUTE FUNCTION log_audit_event();

-- ───────────────────────────────────────────────────────────────────
-- 6. Route totals denormalization trigger
--
-- Maintains delivery_routes.total_stops and completed_stops as
-- delivery_stops rows are inserted, updated, or deleted. Also auto-
-- advances the route to 'completed' when the last stop finishes.
--
-- We run this AFTER the row change but BEFORE the audit trigger fires
-- (Postgres orders AFTER triggers alphabetically — audit_* comes after
-- recompute_* under our naming, so audit captures the post-recompute
-- state of the route).
-- ───────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION recompute_route_totals(p_route_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_total INT;
  v_done  INT;
  v_status route_status;
BEGIN
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE status IN ('completed', 'exception'))
  INTO v_total, v_done
  FROM delivery_stops
  WHERE route_id = p_route_id;

  -- Read current status — we only auto-transition in_progress → completed.
  -- We never demote completed → in_progress (would lose audit clarity)
  -- and never touch planned/cancelled.
  SELECT status INTO v_status
  FROM delivery_routes
  WHERE id = p_route_id
  FOR UPDATE;

  IF v_status = 'in_progress' AND v_total > 0 AND v_done = v_total THEN
    UPDATE delivery_routes
       SET total_stops = v_total,
           completed_stops = v_done,
           status = 'completed',
           completed_at = COALESCE(completed_at, NOW()),
           updated_at = NOW()
     WHERE id = p_route_id;
  ELSE
    UPDATE delivery_routes
       SET total_stops = v_total,
           completed_stops = v_done,
           updated_at = NOW()
     WHERE id = p_route_id;
  END IF;
END;
$$;

COMMENT ON FUNCTION recompute_route_totals(UUID) IS
  'Idempotent recompute of delivery_routes.total_stops + completed_stops for a given route. Auto-flips status to completed when in_progress + all stops done.';

CREATE OR REPLACE FUNCTION recompute_route_totals_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    PERFORM recompute_route_totals(OLD.route_id);
    RETURN OLD;
  ELSE
    PERFORM recompute_route_totals(NEW.route_id);
    -- On UPDATE of route_id (rare), update both sides.
    IF TG_OP = 'UPDATE' AND OLD.route_id IS DISTINCT FROM NEW.route_id THEN
      PERFORM recompute_route_totals(OLD.route_id);
    END IF;
    RETURN NEW;
  END IF;
END;
$$;

-- "00_" prefix so this trigger fires BEFORE the audit trigger
-- alphabetically. Postgres fires AFTER triggers in name order.
CREATE TRIGGER "00_recompute_route_totals"
  AFTER INSERT OR UPDATE OR DELETE ON delivery_stops
  FOR EACH ROW EXECUTE FUNCTION recompute_route_totals_trigger();

-- ───────────────────────────────────────────────────────────────────
-- 7. RLS — enable on both tables
-- ───────────────────────────────────────────────────────────────────

ALTER TABLE delivery_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_stops  ENABLE ROW LEVEL SECURITY;

-- delivery_routes — members read ALL routes (they need the driver_name
-- and started_at + status for the widget). No PII at the route level.
-- Admins full ALL.
CREATE POLICY delivery_routes_member_read ON delivery_routes
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY delivery_routes_admin_all ON delivery_routes
  FOR ALL
  TO authenticated
  USING (is_admin_caller())
  WITH CHECK (is_admin_caller());

-- delivery_stops — members read ONLY the stop tied to their pickup_
-- location OR to themselves (home delivery). The OR is inclusive: a
-- multi-share member with both a pickup share and a home-delivery
-- share would see both stops on a given route (rare but valid).
CREATE POLICY delivery_stops_member_read ON delivery_stops
  FOR SELECT
  TO authenticated
  USING (
    -- Host stop the member's pickup_location matches
    (
      pickup_location_id IS NOT NULL
      AND pickup_location_id IN (
        SELECT pickup_location_id
        FROM members
        WHERE customer_id = current_customer_id()
          AND pickup_location_id IS NOT NULL
      )
    )
    OR
    -- Home-delivery stop targeting the member themselves
    (
      member_id IS NOT NULL
      AND member_id IN (
        SELECT id
        FROM members
        WHERE customer_id = current_customer_id()
      )
    )
  );

CREATE POLICY delivery_stops_admin_all ON delivery_stops
  FOR ALL
  TO authenticated
  USING (is_admin_caller())
  WITH CHECK (is_admin_caller());

-- ───────────────────────────────────────────────────────────────────
-- 8. Realtime publication
--
-- Members subscribe to delivery_stops changes filtered by their
-- pickup_location_id or member_id. Realtime requires the table to be
-- in the supabase_realtime publication; we add it here.
-- ───────────────────────────────────────────────────────────────────

ALTER PUBLICATION supabase_realtime ADD TABLE delivery_routes;
ALTER PUBLICATION supabase_realtime ADD TABLE delivery_stops;

COMMIT;
