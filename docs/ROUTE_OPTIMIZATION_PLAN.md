# Delivery Route Optimization — Plan (Tiny Seed Farm)

**Status:** Research complete (2026-06-23). Awaiting Todd's approval to build.
**Owner:** PM_Architect. **Stack:** Astro + Supabase + Node/TypeScript.

## Goal (Todd, 2026-06-23)
A delivery route that is **the best and automatic**: driver **starts and ends at the farm (Rochester)**, **least total drive time with no backtracking**, **includes Wednesday wholesale** (restaurant deliveries) in the same loop, and lets us **toggle stops on/off** (e.g., drop Zelienople CSA + the 1st home delivery). It should re-optimize itself when the week's stops change — "second nature."

## Decision: Google **Route Optimization API** (single-vehicle SKU)
The clean, embeddable, time-window-aware solution for a ~13–15 stop single-vehicle depot loop.

**Why this over the alternatives** (researched + sourced):
- **Legacy Directions API `optimize:true`** — ❌ **deprecated Mar 2025** (JS API removed May 2026) and **never supported time windows**. Do not build on it. *(This corrected an earlier preliminary lean.)*
- **Route Optimization API (VRP)** — ✅ native **time windows** (market/restaurant hours), **service time per stop**, **depot start+end**, traffic-aware on Google's road network, plain **REST JSON** (fits our Node/TS backend), **~$0.15 per optimization run** (single-vehicle SKU, $10/1,000 visits). Overbuilt for 15 stops = reliable.
- **Google OR-Tools (WASM)** — powerful + free, but the Node embedding (WASM pipeline) is 2–3 days of work and needs an external distance matrix anyway. Reserve for "zero external dependency / huge scale" later.
- **Self-built nearest-neighbor + 2-opt** — viable + ~free for 15 stops, but bolting on time-window feasibility is fragile. Good fallback if we ever want no API dependency.
- **SaaS (Routific/OptimoRoute/Circuit/Route4Me)** — ❌ ruled out: $150–$350/mo subscription products with login UIs, not embeddable per-call primitives. We'd pay $1,800–$4,200/yr for a $0.15/week API call.

## How it plugs into our system
- Stops + coordinates already live in Supabase (`pickup_locations.coordinates_lat/lng`, wholesale `address`).
- New backend endpoint **`/api/optimize-route`**: (1) read the week's active delivery stops from `resolveCycle` + the Wed wholesale orders, (2) build the Route Optimization payload (depot = farm; each stop = a visit with lat/lng, time window, service time), (3) POST to the API, (4) write the optimized `stop_order` back to `route_stops`, (5) return the ordered list + ETAs.
- Wire into the existing **`/admin/route`** (replaces the inaccurate manual/auto stop_order) + a **"Re-optimize"** button + a one-tap **full-route** Google/Apple Maps link (all waypoints, not one at a time).

## Phase 0 — Prerequisites
1. ✅ **DONE — all 15 CSA stops geocoded** (2026-06-23, via OSM/Nominatim free fallback since the Google Geocoding API isn't enabled). North Park resolved to the boathouse (approximate — confirm); Lawrenceville to the farmers market; rest exact.
2. ✅ **Farm depot (Rochester) already geocoded:** 40.7456, -80.2617.
3. ⏳ **NEED: exact addresses for Butter Joint (Oakland) + St. Ferdinand (church, Cranberry)** — my guesses (214 N Craig St / 2535 Rochester Rd) didn't cleanly resolve. (Cafe Verde, Black Radish, Mediterra have addresses.)
4. 🔴 **BLOCKER for Phase 1 — enable Google APIs:** the `GOOGLE_MAPS_API_KEY` exists but the Google Cloud project returns *"This API is not activated"*. Must enable **Geocoding API** + **Route Optimization API** + confirm **billing** in Google Cloud Console. Without this the optimizer can't run.
5. ⏳ **Inputs captured (2026-06-23):** restaurants by 3 PM (Black Radish HARD by 3 PM); unload 5 min/stop, 1 min/home delivery. Still need market setup windows.

## Phase 1 — Build (the quick, high-value win)
- `/api/optimize-route` endpoint (above) using the single-vehicle SKU.
- Stop toggles (include/exclude Zelienople CSA, 1st home delivery, etc.).
- Wednesday wholesale stops folded into the same loop.
- Optimized order written to `route_stops`; `/admin/route` shows the no-backtrack sequence + ETAs + one-tap full-route navigation.
- Auto-runs when the cycle resolves; "Re-optimize" button for mid-week stop changes (~$0.15/run, trivial).

## Phase 2 — Only if needed
- **Multi-vehicle** (e.g., a separate flower vs. veg truck): same API, Fleet SKU ($30/1,000), add a 2nd vehicle object — no architecture change.
- **OR-Tools WASM** migration only if we ever want zero external API dependency.

## Best practices baked in (for a CSA + wholesale depot operation)
- **Depot loop:** farm as both start + end; never plan an open route.
- **Service time per stop:** ~5 min CSA drop, ~15 min restaurant unload — without it, ETAs + time windows silently fail.
- **Time windows:** markets (hard setup deadline) + restaurants (receiving windows) modeled as `timeWindows`; the API hard-respects them + flags infeasibility.
- **Cold chain (summer):** sequence refrigerated restaurant receiving early, home deliveries mid, cooler-staged pickup stops last; enforce via tighter windows on restaurants. Shorter dwell (pre-staged boxes, arrival texts) cuts heat exposure.
- **Re-optimize weekly** when the stop set changes; don't cache a route beyond a week.

## Cost
~**$0.15 per optimization run** (15 visits @ $10/1,000). Re-optimizing twice a week ≈ **$1.50/month**.

## Open inputs needed from Todd before build
1. **Time windows** per stop type — e.g., what time must markets be set up by? Restaurant receiving windows (Cafe Verde, Black Radish, Butter Joint, Mediterra, St. Ferdinand)?
2. **Service/unload time** estimates — CSA stop vs. home delivery vs. restaurant.
3. **Butter Joint + St. Ferdinand addresses.**
4. Confirm the **stops to drop** this go (Zelienople CSA, 1st home delivery) and that **Wed wholesale** rides the same loop.

## Sources
Google Route Optimization API (overview + billing), Directions API deprecation timeline, OR-Tools VRPTW, 2-opt/nearest-neighbor benchmarks, Routific/Route4Me/OptimoRoute pricing — full list in the 2026-06-23 research record.
