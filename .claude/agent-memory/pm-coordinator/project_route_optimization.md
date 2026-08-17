---
name: route-optimization
description: CSA+wholesale delivery route optimization initiative — decision, plan, blocker, inputs. Plan doc at docs/ROUTE_OPTIMIZATION_PLAN.md.
metadata:
  type: project
---

Building **automatic delivery-route optimization** into the CSA portal (Todd 2026-06-23). Single vehicle, driver **starts+ends at the farm (Rochester, depot = "Rochester (Farm Pickup)" stop coords 40.7456,-80.2617)**, ~13–15 Wed stops (CSA + wholesale together), goal = **least drive time, NO backtracking**, with time windows.

**Why:** Todd — "our route has not been optimized well... it needs to be the best and automatic." Full research + plan in **`docs/ROUTE_OPTIMIZATION_PLAN.md`**.

**How to apply / decision:** Build on the **Google Route Optimization API (single-vehicle SKU, ~$0.15/run)** — NOT the legacy Directions `optimize:true` (deprecated Mar 2025, no time windows). OR-Tools/SaaS ruled out for our scale. Phase 1 = `/api/optimize-route` endpoint (reads week's stops from resolveCycle + Wed wholesale, optimizes depot→stops→depot w/ time windows + unload times, writes stop_order into existing `/admin/route`, one-tap full-route nav + Re-optimize button + toggleable stops). Phase 2 = multi-vehicle (flower vs veg truck).

**Status (2026-06-23): ✅ PHASE 1 BUILT + LIVE — `/admin/route-plan`.**
- Decision evolved: the **Route Optimization VRP API rejects API keys** (needs a service account). PIVOTED to the **Routes API `computeRouteMatrix`** (real road drive-times, WORKS with the API key) + our own **nearest-neighbor + 2-opt** solver with a time-window-aware cost. Cleaner, no service account.
- New **GCP project `tiny-seed-farm`** (Todd's, owns billing) with **Geocoding API + Routes API enabled**. Key `GOOGLE_MAPS_API_KEY` swapped in apps/csa-portal/.env + added to Vercel prod + astro env schema.
- All 15 CSA stops re-geocoded ROOFTOP via Google. Butter Joint = **208 N Craig St, Pittsburgh 15213**; St. Ferdinand = **2535 Rochester Rd, Cranberry 16066** (saved to wholesale_accounts). Farm depot = 257 Zeigler Rd → 40.7456,-80.1610 (re-geocoded, old pin was ~6mi off).
- Engine: `src/lib/route-optimizer.ts`; endpoint `src/pages/api/admin/optimize-route.ts`; UI `src/pages/admin/route-plan/index.astro` (day/week/start-time, stop on/off toggles, ETAs, one-tap full-route Google Maps nav). Commit 6594ab2.
- Validation: 21 real Wed stops → 262 min (4.4 hr) loop. Live: 23 toggleable stops, endpoint returns optimized loop + maps URL.
- **TODO Phase 1.5:** cache wholesale coords (currently geocoded on the fly each gather); confirm market setup windows (only Black Radish 3 PM is wired); optionally persist the optimized order into the driver route (`route_stops`).

**Inputs (Todd 2026-06-23):** restaurants ideally by 3 PM, **Black Radish HARD by 3 PM**; unload **5 min/stop, 1 min/home delivery**; scope = drop **Zelienople CSA + 1st home delivery**, Wed wholesale rides the same loop ("yes, as of now, can change if it makes sense"). Still need **market setup windows**.

**Insight:** **Cafe Verde (Wed wholesale) is IN Zelienople** (111 E Spring St) — so dropping the Zelienople CSA stop may NOT save the trip if the driver delivers Cafe Verde there anyway. Let the optimizer decide. Related: [[csa-makeup-box-mechanism]], [[always-use-resolvecycle]].
