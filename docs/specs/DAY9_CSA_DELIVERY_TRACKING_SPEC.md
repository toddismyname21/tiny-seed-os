# Day 9 Spec — CSA Delivery Tracking for Members

**Status:** DRAFT — ready to dispatch when Day 8 ships
**Plan reference:** `docs/CSA_MIGRATION_PLAN_2026.md` Day 9 (inserted 2026-05-08 per Todd)
**Note:** This was originally a wholesale-only feature; Todd flagged that CSA members deserve the same "where is my box" visibility.

---

## Goal

CSA members can see real-time delivery status on their dashboard during pickup days: status pill, driver name, ETA, and (after delivery) GPS-verified delivery time + proof photo if applicable.

## User Story

> "It's Wednesday afternoon. My CSA box is delivered to a host stop in Highland Park between 4 and 6:30 PM. I open csa.tinyseedfarm.com on my phone at 4:45 PM. I see at the top of my dashboard: 'Out for delivery — Driver: Mark — ETA Highland Park 5:15 PM.' At 5:20 PM I refresh, the card now says 'Delivered ✓ at 5:18 PM' with a photo of the boxes at the host's porch. I know my food is there before I drive over."

## Architecture

### The data lives in Sheets (for now — wholesale migration moves it to Postgres)

The driver app (`driver.html`) writes per-stop status to:
- `SALES_DeliveryStops` — the stop status, GPS coords, photo URL, signature URL, ETA
- `DELIVERY_TRACKING` — real-time route position (driver lat/lng/heading/speed)
- `SALES_DeliveryProofs` — photo + signature blobs

The Apps Script endpoint `getDeliveryHistory()` already returns this filtered by customer. We will use this as the data source for Phase 1 (Day 9).

**Phase 2 (during wholesale migration, ~Day 30):** driver app rewritten to write to Postgres directly. This widget switches its data source from Apps Script bridge to Supabase Realtime for live updates without polling.

### New /dashboard widget: "Today's Delivery"

Shown on the member dashboard ONLY when:
- Today is the member's pickup day (per `members.pickup_day` or per the active week's box delivery schedule)
- Member has an active membership for the current week
- Member's pickup is NOT a self-pickup farm location (e.g. "Rochester Farm Pickup" doesn't get tracked — they're at the farm already)

States the widget can be in:

| State | When | What it shows |
|---|---|---|
| **Not yet packed** | Pre-delivery day | "Your box is being packed for [Wed May 14]" — minimal, just a heads-up |
| **Packed, not started** | Delivery morning before driver clocks in | "Your box is ready and waiting on the driver" |
| **Out for delivery** | Driver clocked in, your stop status = pending | "Driver Mark is on the road. ETA [stop] [time]" |
| **Driver near you** | Your stop is the next 1-2 stops on the route | "Driver Mark is approaching [stop] — ~5 min away" |
| **Delivered** | Stop status = completed | "✓ Delivered at [time]. [photo if available]" |
| **Issue reported** | Stop status = exception | "We had an issue with your delivery — we'll be in touch shortly. [details]" |
| **Past delivery** | After delivery day, before next | (widget hidden until next pickup day) |

### Implementation: Astro server component + lightweight polling

Component: `apps/csa-portal/src/components/DeliveryTracker.astro`

- Server-renders the current state on dashboard load
- Embedded JS polls every 60 sec while page is open (or 15 sec if state is "Out for delivery")
- Calls a thin Astro API route `/api/delivery-status` that proxies the Apps Script `getDeliveryHistory` call
- Phase 2: replace polling with Supabase Realtime subscription

**Why polling, not WebSocket:** Apps Script doesn't support WebSocket. Phase 1 = polling. Phase 2 (Postgres) = Realtime via Supabase channels.

### API route: `/api/delivery-status.ts`

```typescript
import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '../../lib/supabase';
import { z } from 'zod';
import { TINY_SEED_API } from '../../lib/api-config';  // canonical API URL constant

export const GET: APIRoute = async ({ cookies, request }) => {
  // 1. Authenticate
  const sb = createSupabaseServerClient(cookies);
  const { data: { user } } = await sb.auth.getUser();
  if (!user?.email) return new Response('unauthorized', { status: 401 });

  // 2. Look up member's customer_id from email
  const { data: customer } = await sb.from('customers').select('id, legacy_id').eq('email', user.email).single();
  if (!customer) return new Response('no member', { status: 404 });

  // 3. Call Apps Script endpoint (until wholesale migration moves driver writes to Postgres)
  const url = `${TINY_SEED_API.MAIN_API}?action=getDeliveryHistory&customerId=${customer.legacy_id}&limit=5`;
  const res = await fetch(url, { headers: { 'Cache-Control': 'no-store' } });
  if (!res.ok) return new Response(JSON.stringify({ error: 'upstream_error' }), { status: 502 });
  const data = await res.json();

  // 4. Filter to TODAY's delivery (if any)
  const today = new Date().toISOString().slice(0, 10);
  const todays = (data.deliveries || []).filter((d: any) => d.date === today);

  // 5. Return shape consumed by DeliveryTracker.astro
  return new Response(JSON.stringify({
    state: deriveState(todays[0]),  // 'packed' | 'out_for_delivery' | 'near_you' | 'delivered' | 'issue' | 'none'
    eta: todays[0]?.eta ?? null,
    driver_name: todays[0]?.driver_name ?? null,
    completed_at: todays[0]?.completed_at ?? null,
    photo_url: todays[0]?.photo_url ?? null,
    issue_notes: todays[0]?.issue_notes ?? null,
  }), { headers: { 'content-type': 'application/json' } });
};
```

### Server-side state derivation

A small helper `deriveState(stop)` translates the raw Apps Script response into one of the 7 widget states. Lives in `src/lib/delivery.ts`.

### Mobile UX

- The widget is the FIRST card on the dashboard during delivery days (above the existing share + box content cards)
- When state = "Out for delivery" or "Near you", widget pulses softly (CSS animation) to draw attention
- "Near you" state shows a small map embed (Leaflet, lightweight) with driver's position + member's stop pin, ONLY if member opts into it (privacy-friendly)
- Photo of delivered box (if available) renders inline at 240×240, click to expand
- "Report a problem" button visible after delivery — opens mailto with pre-filled subject

### Privacy + scope considerations

- Member only sees THEIR stop's status, never other members' stops or the full route
- Driver name is shown (first name only — "Driver Mark") for human connection, not driver phone or last name
- GPS map embed (Phase 2) shows driver's CURRENT position only when their stop is active or imminent — not historical track of where the driver has been all day (drivers' privacy)

### Out of scope (deferred to Phase 2 or later days)

- ❌ Push notifications when driver is near (Phase 2 — needs PWA install + push API)
- ❌ Member-initiated "I'm not home, leave at door" notes (Day 10+)
- ❌ Direct chat with driver (out of scope; mailto is fine)
- ❌ Live GPS map embed (Phase 2 — privacy + Leaflet bundle size; first version is text-only status)
- ❌ Multi-week delivery history view (defer; admin tools handle this)
- ❌ Driver app rebuild — that's part of wholesale migration. Day 9 ONLY adds the member-facing reader.

## Verification gates

```bash
# 1. Build clean
cd apps/csa-portal && npm run build && npx astro check

# 2. Files exist
for f in src/components/DeliveryTracker.astro \
         src/lib/delivery.ts \
         src/pages/api/delivery-status.ts; do
  test -f "$f" && echo "✓ $f" || echo "✗ $f"
done

# 3. Live test (auth'd member with active share):
# - GET /dashboard on a non-delivery day → widget hidden
# - GET /dashboard on a delivery day → widget visible with the right state
# - GET /api/delivery-status → JSON response with state + driver + eta

# 4. State transitions (manual — Todd can test by checking on different days)
# - Day before delivery: state='packed'
# - Morning of delivery before driver clocks in: state='packed'
# - Driver in route: state='out_for_delivery'
# - Driver 1-2 stops away: state='near_you'
# - After mark-delivered: state='delivered' with photo
# - Day after delivery: widget hidden

# 5. Apps Script bridge respects rate limits
# Poll interval is 60s default, 15s when 'out_for_delivery'
# Apps Script quota: 20 URL fetches per second per script
# Worst case: 800 active members × poll every 15s = 53/s (under quota)
# Better: only poll when page is visible (use Page Visibility API)
```

## Phase 2 evolution (during wholesale migration ~Day 30)

When the driver app moves to Postgres:
1. `delivery_stops` table gets real-time updates from driver mutations
2. `DeliveryTracker.astro` switches from polling to Supabase Realtime subscription
3. `/api/delivery-status` becomes a server-rendered version (for SEO + initial render); subscription updates from there
4. Apps Script bridge in `/api/delivery-status` can be removed

This is documented as a Phase 2 follow-up in the wholesale migration plan.

## Risk + mitigation

| Risk | Mitigation |
|---|---|
| Apps Script bridge slow during heavy poll traffic | 60s default poll, 15s near delivery; only poll while page visible |
| Apps Script returns stale data | Client shows "last updated [timestamp]" so members know if it's fresh |
| Driver doesn't update status (forgets to clock in) | Widget falls back to "Your box is on its way" with no specifics — fail soft |
| Member opens dashboard mid-route, sees "Out for delivery" but their stop already happened | Detect by comparing stop_index vs total_stops + check completed_at — show "delivered" state if true |
| Privacy concern: member can infer driver's full route from "stops away" | Only show "approaching" indicator when member is the immediate next stop |

## Time estimate

~6-8 hours of dev work. Realistic single day with verification.
