---
name: home-delivery-address-model
description: How CSA home-delivery addresses are stored, why add-on rows are often null, and why you cannot backfill delivery_address directly
metadata:
  type: project
---

CSA home-delivery address is stored **per member row** in `members.delivery_address`. A household has several member rows (the `summer_veg` box row + one row per add-on). The box row reliably carries the address; **add-on rows are frequently NULL** (created/migrated that way from Shopify line items). The add-on "rides" the box to the same stop.

**Why:** Consequence — any consumer that reads *one arbitrary member row* per household can hit a null and wrongly conclude "no address." This caused the 2026-06-24 route-planner "no home address" false-skip for Martina Hilldorfer, Stephanie Tomasic, Carla Nappi, and Ronelle Myers (biweekly-B).

**How to apply:**
- The single source of truth is `resolveCycle` (`src/lib/cycle.ts`). It now stamps each home household's box-row address onto its home-riding rows (display-only, no count change). Prefer reading addresses *through resolveCycle*, not raw member rows.
- **Do NOT try to backfill `members.delivery_address` directly** — a `BEFORE UPDATE` trigger `enforce_delivery_address_admin_only` (migration `0030_gate_home_delivery.sql`) rejects setting it to a new non-empty value unless `auth.jwt() IS NULL` (true postgres/no-JWT connection) or `is_admin_caller()`. The **service-role key is itself a JWT**, so PostgREST writes with it are rejected (`delivery_admin_only`, ERRCODE 23514). This is the home-delivery revenue gate; don't bypass it. The legit write path is the `change_pickup_location()` RPC under an admin JWT.
- To verify resolution: run `resolveCycle(supabase, weekMonday)` under tsx with the service-role key, inspect `byStop.get('home_delivery')`. cycle.ts imports only types + pure helpers, so it runs standalone. Related: [[csa-cycle-resolver]].
