-- Migration 0062 — customers.routable (manual / not-routable stops)
--
-- The CSA route optimizer (/admin/route-plan → src/lib/route-optimizer.ts
-- gatherDayStops) builds the home-delivery leg of the optimized route from
-- active members that have a delivery_address and NO pickup_location_id, keyed
-- by their customers.id. The owner needs to be able to mark a delivery address
-- as "deliver by hand, NOT optimized" — e.g. an ungeocodable spot, a one-off,
-- or a stop they want to place manually — WITHOUT removing the customer or
-- their membership, and reversibly.
--
-- `routable` is that flag. It is STRICTLY ADDITIVE:
--   - DEFAULT true + NOT NULL → every existing row backfills to true, so the
--     optimizer's stop set is byte-identical to before this migration.
--   - The optimizer excludes ONLY rows explicitly set to routable = false.
--
-- RLS: no policy change needed. `customers` already has admin-all + member-self
-- policies; this is just another column on an existing, already-governed table.
-- Reads/writes of `routable` go through the same is_admin_caller() gate as the
-- rest of the row (admin route planner + admin toggle endpoint).

ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS routable boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.customers.routable IS
  'CSA route optimizer inclusion flag (migration 0062). true (default) = this '
  'customer''s home-delivery address is fed to the route optimizer as before. '
  'false = excluded from the optimizer and shown only as a MANUAL / not-routable '
  'stop on the route planner (deliver by hand). Reversible via /api/admin/route/routable.';
