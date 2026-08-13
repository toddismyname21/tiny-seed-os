# CSA Portal — Feature Backlog

Owner-requested features, in priority order. PM_ARCHITECT maintains this file.

## Queued

### 2. "Track my box" — member-facing driver tracker (Todd, 2026-08-11)
Members see delivery progress on delivery day; kills "did the driver come yet?" texts.
- Phase 1 (backbone): checkpoint-based — driver completes stops in the driver view →
  member tracking page shows "N stops away, ETA ~time" (ETAs from the optimizer's
  drive-time matrix on the saved route). No GPS, no battery drain, works always.
- Phase 2 (nice-to-have): live GPS pin while the driver view is foregrounded
  (navigator.geolocation.watchPosition → API → member map). Mobile-web limit:
  pauses when screen locks — Phase 1 remains source of truth.
- Decision context: Google Fleet Engine / Last-Mile marketing email (2026-08-10)
  evaluated and rejected — enterprise pricing + native-app requirement. Build
  homegrown on saved routes + stop statuses + the route map components from #1.

### 3. Real box swaps for members (parked 2026-08-10)
The swap plumbing exists (ItemCard, box_swaps, swap_credits, cutoff logic) but no
item has ever been flagged `is_swappable` with `swap_options`. To ship: flag items
weekly + set options + one end-to-end test with a test member + pack-sheet
surfacing of swap selections. Todd chose to defer ("go from there") — offer each
Monday.

### 4. Twilio SMS automation (recurring)
Arrival texts are manual `sms:` deep links from the driver's phone. Needs Todd
~20-min setup session (account/number/A2P). Never worked historically.

## Done
- Route-plan map visual (2026-08-13) — interactive Google Map per route (A/B) on
  `/admin/route-plan`: 🚜 depot → numbered stops in drive order → 🏁 end marker
  (when an open-route end address is set); manual stops render amber. Road-following
  polyline via DirectionsService, chunked at ≤23 waypoints/request with a geodesic
  fallback; redraws on every re-optimize + manual reorder. Maps JS loads lazily
  once (no initial-page cost). Todd: HTTP-referrer-restrict GOOGLE_MAPS_API_KEY to
  csa.tinyseedfarm.com in Google Cloud Console + enable Maps JavaScript + Directions APIs.
- Manual route stops (2026-08-11) — add/remove ad-hoc stops on route-plan; they
  flow through optimize → save → driver view → load order.
- Coming-soon banner on chef order page (2026-08-10) — portal_settings
  `wholesale_coming_soon`.
- Nightly vendor-bills automation (2026-08-07) — inbox → QB Bills + digest.
