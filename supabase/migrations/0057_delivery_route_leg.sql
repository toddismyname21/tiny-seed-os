-- 0057_delivery_route_leg.sql
-- A/B routes: a delivery day can split into two trucks/runs (Route A, Route B).
-- The route planner's "Save & send to driver" writes one delivery_routes row
-- per (route_date, leg). Nullable so legacy single routes (created via the old
-- auto-seed /api/admin/route) keep working with leg = NULL.
alter table public.delivery_routes
  add column if not exists leg text;

comment on column public.delivery_routes.leg is
  'Optimized-route leg: ''A'' or ''B'' (two trucks/runs on one date), or NULL for a legacy single route.';
