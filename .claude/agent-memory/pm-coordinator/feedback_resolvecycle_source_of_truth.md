---
name: resolvecycle-source-of-truth
description: resolveCycle is the ONE source of truth for who-gets-a-box/where/this-week — every recipient/box/stop-count surface must derive from it, never raw member queries
metadata:
  type: feedback
---

**Rule:** `resolveCycle(supabase, weekMonday)` (`src/lib/cycle.ts`) is the SINGLE source of truth for "who gets a box, where, this week." Any surface that lists recipients, counts boxes, or texts/emails members for a delivery MUST read `cycle.byStop` / `cycle.activeStops` / `cycle.totalsByStop` — never a raw `members` query (e.g. `.from('members').eq('pickup_location_id', …)`).

**Why:** Todd got burned repeatedly by mismatches and is stressed about misinforming customers. 2026-06-24: the driver route page (`/admin/route/[id].astro`) built its "Text all here" group-SMS from raw `members.pickup_location_id` (all active members at a location) instead of resolveCycle — so it texted biweekly-off-week / on-hold / out-of-season / stale-pickup members who get NO box that week (e.g. Highland Park texted 21 vs 14 actual boxes). resolveCycle already applies biweekly parity, vacation holds, season windows, flex-order gating, and home-delivery bucketing; raw member queries apply none of that.

**How to apply:**
- Before building/editing ANY box/recipient/stop-count surface, derive from resolveCycle. The good examples to mirror: `/admin/text-stop`, labels, pack-check, stop-manifest, route-sheet (all use the resolver).
- Raw `.from('members')` is fine ONLY for member/account *management* (members editor, account self-service, onboarding, swaps, vacation, biweekly assign, reports) — NOT for "who's getting a box this week."
- When a recipient count can't equal the box count (members with no phone), SHOW the gap ("N boxes · X no phone") — never a silent mismatch.
- Audit (2026-06-24): the driver route page was the ONLY divergent surface; everything else already uses resolveCycle. Related: [[home-delivery-address-model]] (also a resolveCycle canonicalization fix).
