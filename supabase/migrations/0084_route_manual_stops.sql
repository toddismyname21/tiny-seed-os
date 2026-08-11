-- 0084_route_manual_stops.sql
-- Ad-hoc "manual stops" for the route planner (/admin/route-plan).
--
-- Todd needs to add a one-off delivery stop (name + address + optional note) to
-- Route A or B for a specific delivery date, and have it flow through the WHOLE
-- pipeline: gather -> optimize -> save -> driver view -> pack/load order. This
-- migration adds:
--   1) route_manual_stops — the per-date ad-hoc stops (soft-deleted via is_active).
--   2) delivery_stops.manual_stop_id — a fourth optional target FK, so an
--      optimized+saved route can point a stop at a manual stop.
--   3) EXTENDS the exactly-one-of-three target check (delivery_stops_target_xor)
--      to exactly-one-of-FOUR (pickup_location_id | member_id |
--      wholesale_customer_id | manual_stop_id). No dependent views/rules exist on
--      delivery_stops (verified via pg_depend), and the three triggers on the
--      table are generic (totals/audit/updated_at) — none reference target cols —
--      so replacing the check is safe.
--
-- Strictly additive: with no manual stops created, the stop set + every saved
-- route is byte-identical to before. Idempotent (IF NOT EXISTS / drop-then-add).

-- ── 1) route_manual_stops ────────────────────────────────────────────────────
create table if not exists route_manual_stops (
  id uuid primary key default gen_random_uuid(),
  route_date date not null,
  leg text not null default 'A',
  name text not null,
  address text not null,
  lat double precision,
  lng double precision,
  service_sec integer not null default 180,
  note text,
  is_active boolean not null default true,
  created_at timestamptz default now()
);

-- leg must be A or B (matches delivery_routes.leg semantics on this page).
alter table route_manual_stops drop constraint if exists route_manual_stops_leg_check;
alter table route_manual_stops
  add constraint route_manual_stops_leg_check check (leg in ('A', 'B'));

-- Fast lookup of the active stops for a given delivery date (the gather query).
create index if not exists route_manual_stops_date_active_idx
  on route_manual_stops (route_date, is_active);

-- RLS: admin/staff only — the route planner is admin-gated. Uses the same
-- is_admin_caller() helper every other admin-only route table uses.
alter table route_manual_stops enable row level security;
drop policy if exists route_manual_stops_admin_all on route_manual_stops;
create policy route_manual_stops_admin_all on route_manual_stops
  for all using (is_admin_caller()) with check (is_admin_caller());

-- ── 2) delivery_stops.manual_stop_id (fourth optional target) ────────────────
alter table delivery_stops
  add column if not exists manual_stop_id uuid;

-- FK: if a manual stop is deleted, null the reference (mirrors pickup/member
-- ON DELETE SET NULL; a saved driver route survives, the stop just loses its
-- link — the target check then fails on a future write, never on read).
alter table delivery_stops drop constraint if exists delivery_stops_manual_stop_id_fkey;
alter table delivery_stops
  add constraint delivery_stops_manual_stop_id_fkey
  foreign key (manual_stop_id) references route_manual_stops(id) on delete set null;

-- ── 3) EXTEND the target XOR: exactly one of FOUR ────────────────────────────
alter table delivery_stops drop constraint if exists delivery_stops_target_xor;
alter table delivery_stops
  add constraint delivery_stops_target_xor
  check (
    (
      (case when pickup_location_id   is not null then 1 else 0 end) +
      (case when member_id            is not null then 1 else 0 end) +
      (case when wholesale_customer_id is not null then 1 else 0 end) +
      (case when manual_stop_id        is not null then 1 else 0 end)
    ) = 1
  );
