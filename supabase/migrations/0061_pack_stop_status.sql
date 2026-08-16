-- Migration 0061 — PACK & LOAD per-stop check-off state
--
-- The live "Pack & Load" view (/admin/pack-load) is the single screen the
-- crew works on pack day. Per stop they confirm the box count and click ONE
-- "stop loaded" toggle. This table persists that toggle so a refresh / second
-- device sees the same state and the live stop board can show "X of Y loaded".
--
-- One row per (week_starting, stop_id). stop_id is the StopTotals.stop_id from
-- the cycle resolver — a pickup_location id, or the literal 'home_delivery'
-- sentinel (HOME_DELIVERY_STOP_ID), or 'no_pickup_set'. We DO NOT FK stop_id to
-- pickup_locations because of those sentinel values; the resolver is the source
-- of truth for which stops exist.
--
-- confirmed_count is the TOTAL boxes (small + large + flex, gated flex) at the
-- click moment. It powers the stale-guard: if the live resolver count later
-- differs (a member added a flex order, a hold landed), the board flags the
-- stop "⚠ changed" so the crew re-confirms rather than shipping a wrong count.
--
-- RLS mirrors the sibling admin tables (market_offerings / member_notices):
-- staff/admin get FULL access via the SECURITY DEFINER is_admin_caller() helper
-- (migration 0017); the service-role bypasses RLS for server writes.
CREATE TABLE IF NOT EXISTS pack_stop_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week_starting date NOT NULL,
  stop_id text NOT NULL,           -- StopTotals.stop_id (incl. 'home_delivery')
  loaded boolean NOT NULL DEFAULT false,
  confirmed_count integer,         -- total boxes confirmed at click time (small+large+flex), for the stale-guard
  confirmed_by text,
  confirmed_at timestamptz,
  updated_at timestamptz DEFAULT now(),
  UNIQUE (week_starting, stop_id)
);

CREATE INDEX IF NOT EXISTS pack_stop_status_week_idx
  ON pack_stop_status (week_starting);

ALTER TABLE pack_stop_status ENABLE ROW LEVEL SECURITY;

-- Staff/admin: FULL access. SECURITY DEFINER is_admin_caller() avoids RLS
-- recursion against customers (migration 0017).
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'pack_stop_status' AND policyname = 'pack_stop_status_staff_all'
  ) THEN
    CREATE POLICY pack_stop_status_staff_all ON pack_stop_status FOR ALL
      USING (is_admin_caller())
      WITH CHECK (is_admin_caller());
  END IF;
END $$;
