---
name: delivery-tracking-rls
description: RLS on delivery_routes/delivery_stops — members read ALL routes but ONLY their own stop; any member tracking that needs route-wide counts/times must use supabaseAdmin for PII-free columns
metadata:
  type: project
---

The delivery tracking tables (migration 0019) have an asymmetric RLS design that
shapes ANY member-facing delivery feature:

- `delivery_routes`: `delivery_routes_member_read USING (true)` — every
  authenticated member can SELECT ALL routes (no PII at route level: driver
  first-name, status, timestamps, paused_at). Admins ALL.
- `delivery_stops`: `delivery_stops_member_read` exposes ONLY the member's OWN
  stop (host stop matching their `pickup_location_id`, OR home-delivery stop
  whose `member_id` is theirs — via `current_customer_id()`). Admins ALL.

**Why it matters:** a member's RLS-scoped cookie client CANNOT see other members'
stops. So "N stops away" / route-wide delay math is impossible from the member
client alone.

**How to apply:** the pattern (see `src/pages/account/track.astro`) is a SPLIT
read: (1) resolve WHICH stop is the member's with the cookie client (RLS proves
ownership), then (2) read ONLY the PII-free scheduling columns
(`stop_order, status, scheduled_time, completed_at`) for the whole route via
`supabaseAdmin` — never names/addresses/phones/photos/notes. Counts + the
member's own ETA are all that leave the server. `lib/delivery.fetchDeliveryStatus`
(the older dashboard widget) documents this same limitation and conservatively
degrades near_you rather than reading other stops.

Migration **0085** added `delivery_routes.paused_at TIMESTAMPTZ` +
`pause_total_sec INTEGER NOT NULL DEFAULT 0` (driver break tracking). Members
read both under the existing `USING(true)` policy — no new RLS. The honest member
ETA folds in only the CURRENTLY-running break (now − paused_at); a finished break
is already in the completed stops' timestamps, so pause_total_sec is NOT re-added.
Pure math lives in `src/lib/track.ts` (`computeTrackingState`), unit-tested via
`npx tsx src/lib/track.test.ts`.

Note: `delivery_routes` has a CHECK `delivery_routes_started_when_in_progress`
(in_progress ⇒ started_at NOT NULL) and stops have arrived_when_arrived /
completed_when_completed / notes_when_exception CHECKs — seed test rows must
satisfy these. See [[migration-runner]] for applying/verifying against live DB.
