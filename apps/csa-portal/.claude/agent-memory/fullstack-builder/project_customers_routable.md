---
name: customers-routable
description: customers.routable flag (migration 0062) gates the optimizer's home-delivery leg; manual/not-routable stops surface on the route planner
metadata:
  type: project
---

`customers.routable boolean NOT NULL DEFAULT true` (migration 0062) lets the owner take a home-delivery customer OFF the CSA route optimizer ("deliver by hand") without removing them. Default true = no behavior change.

**Why:** owner needs wholesale drops / one-offs / ungeocodable spots visible to the driver as MANUAL stops but excluded from the optimizer. Built strictly additive while the owner was mid-optimizing a live route (so output had to stay byte-identical at default).

**How to apply:**
- The optimizer (`src/lib/route-optimizer.ts`) does NOT route from `customers` wholesale. Its three legs are: CSA pickup_locations (from `cycle.activeStops`), home-delivery members (from `cycle.byStop.get('home_delivery')`, keyed by `customer_id`), and wholesale accounts that have a `wholesale_orders` row on the delivery date. The `routable` filter gates ONLY the home-delivery leg (keyed on customers.id) — it's applied IN `gatherDayStops`, NOT in `cycle.ts` (cycle.ts is the shared single source of truth for pack/harvest/label/manifest; never add optimizer-only filters there).
- `gatherManualStops()` (same file) is a SEPARATE read that never feeds `optimizeStops`: returns (a) routable=false customers who are active home-delivery members (toggleable) and (b) all `wholesale_accounts` with an address (EYV @ 424 E Ohio St; off the optimizer by design, not toggleable).
- Toggle endpoint: `POST /api/admin/route/routable` (isSameOriginPost + requireAdmin, form POST, 303 back to /admin/route-plan). UI: "📌 Not routable" button on home rows in the assign list + "↩︎ Make routable" in the manual-stops Card on `/admin/route-plan`.
- Live data: 16 active home-delivery customers, 13 wholesale-with-address. On a parity week some home customers are legitimately off (e.g. 2026-06-29 Wed → 13 of 16 in the optimizer set) — see [[resolvecycle-distribution-days]].
- `customers` has untyped-in-types columns the live DB carries: `coordinates_lat/lng` (all NULL — optimizer geocodes on the fly, doesn't use them), `address`, `phone`. After migration, hand-edit `src/lib/database.types.ts` (no gen-types script — see [[migration-runner]]).
- This change was BUILT + VERIFIED but NOT deployed by me; PM deploys after the owner confirms the route. If asked to deploy CSA later, see [[csa-vercel-deploy]].
