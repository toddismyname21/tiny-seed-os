---
name: route-manual-stops
description: Ad-hoc "manual stops" on /admin/route-plan (migration 0084) — full pipeline stop kind keyed manual:<id>, delivery_stops target XOR now four-way
metadata:
  type: project
---

`route_manual_stops` (migration 0084) lets Todd add a one-off delivery stop
(name + address + optional note, Route A/B) on `/admin/route-plan` for a specific
`route_date`. It geocodes server-side and flows through the WHOLE pipeline like any
other stop: gather → optimize → save → driver view → pack/load order.

**Why:** wholesale-off-route + not-routable (migration 0062, see [[customers-routable]])
covered *removing* stops from the optimizer; this covers *adding* an ad-hoc one that
isn't a CSA pickup / member / wholesale account (farmers-market table, one-off drop, etc.).

**How to apply:**
- Stop identity across the pipeline is the orderKey/key `manual:<id>` (id =
  route_manual_stops.id), kind `'manual'`. The `delivery_stops` target FK is
  `manual_stop_id` — migration 0084 EXTENDED the `delivery_stops_target_xor` CHECK
  from exactly-one-of-three to **exactly-one-of-FOUR** (pickup_location_id | member_id |
  wholesale_customer_id | manual_stop_id). No views/rules depend on delivery_stops and its
  3 triggers are generic, so dropping+re-adding the check was safe. If you add a 5th
  target, extend that same check.
- Gather lives in `gatherDayStops` (src/lib/route-optimizer.ts) — it merges active
  route_manual_stops for the delivery date. **The SOLVER (`solve`/`orderCost`/
  `optimizeStops`/`computeMatrix`) must stay untouched** — route-optimizer.test.ts guards it;
  I only touched types + gather + exported `geocodeAddress`. A manual RouteStop carries an
  optional `leg` (its own A/B) so the planner pre-assigns it instead of the default-all-A.
- API: `POST/DELETE /api/admin/route-manual-stops` (requireAdmin + same-origin; note
  `isSameOriginPost` only enforces on POST, so the DELETE handler has its OWN any-method
  origin guard). Geocode is fail-soft: an unresolvable address still saves with NULL lat/lng
  and surfaces as a skipped "(manual, no coordinates)" stop for Todd to fix.
- Consumers that resolve/render manual stops: `saved-route.ts` (orderKey `manual:<id>`,
  name/address from the table), `load-order.ts` (`LoadStopKind` includes 'manual';
  pack surfaces number them, loadStopCount returns null, KIND_ICON falls back → 📌),
  driver view `admin/route/[id].astro` (manual branch in stopHeading/Subtitle/Address/
  Kind/Marker; Navigate uses the manual address; no Text button — no phone; amber 📌 badge).
- Schema types are hand-edited (no gen script — see [[migration-runner]]): added
  `route_manual_stops` + `delivery_stops.manual_stop_id` + `delivery_routes.leg` to
  database.types.ts. There is a PRE-EXISTING (not mine) `astro check` error in route/[id].astro
  (`route` used before declaration in the OPEN-route-end block) — leave it.
- Deployed + live-tested 2026-08-11 (dpl_JCp2Mtj2xhvGHwW26y9AZMKLg7NZ). `vercel deploy`
  worked this session (contrary to older [[env-deploy-blocked]]).
