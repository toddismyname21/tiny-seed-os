-- Live van position for Track My Box (Todd 2026-09-28): the driver page
-- heartbeats GPS onto the route row while a route is in_progress; the member
-- tracker renders the van on a map when the fix is fresh. Additive, nullable.
alter table delivery_routes add column if not exists driver_lat double precision;
alter table delivery_routes add column if not exists driver_lng double precision;
alter table delivery_routes add column if not exists driver_loc_at timestamptz;
