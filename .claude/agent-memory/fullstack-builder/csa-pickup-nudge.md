---
name: csa-pickup-nudge
description: CSA portal pickup forcing-nudge banner — why migrated members need it, where it renders, the shared helper, and the E2E snapshot-pickup test pattern.
metadata:
  type: project
---

CSA portal "pickup forcing-nudge" (built 2026-05-24, commit 3ae4622 on csa-migration, gap-analysis P0). See also [[csa-portal-build-gotchas]], [[csa-portal-test-harness]].

**WHY:** the ~191 members migrated from the 2026 CSA Shopify products are `members.status='active'`, but those products did NOT capture a pickup choice at checkout. The middleware onboarding funnel only catches `status='onboarding'` (`middleware.ts:185`), so these ACTIVE members are NEVER prompted — yet they MUST choose a pickup location or home delivery before their first box (Wed June 10). Without this they'd have no pickup on file at delivery time.

**Component `src/components/PickupNudgeBanner.astro`.** Prominent, PERSISTENT `role="alert"` + `aria-live="assertive"` banner. Copy: "Action needed: choose your pickup … before your first box (Wednesday, June 10)" + green-primary CTA → `/account/pickup`. Does NOT hard-block browsing. NOT dismissible — it's DATA-DRIVEN, disappears on the next load once a pickup/delivery is set. Deadline label reads from `getSchedule('summer_veg')` → `firstDeliveryPretty` so it can't drift. A11y/design: tokens only; amber/warning palette frames the alert (border + icon tint) but ALL text uses `--ts-text`/`--ts-text-secondary` and the CTA is green primary — amber `#d97706` is ~3.4:1 on white so NEVER used for text (see [[csa-portal-color-tokens]]). Mobile-first: stacks <sm, 44px+ (h-12) CTA. Takes a no-prop default + optional `firstDeliveryLabel` / `class` overrides.

**Renders on 3 hubs:** `/dashboard`, `/box`, `/account` (top of each `<main>`).

**The gate.** Shared helper `src/lib/account.ts memberNeedsPickupChoice(supabase)` (RLS-scoped cookie client, FAIL-SOFT → false): true iff ≥1 ACTIVE share AND none of the active shares has `pickup_location_id` OR a non-empty `delivery_address`. Scope = ACTIVE only (onboarding members are already funnelled; a paused share isn't receiving a box). `/box` uses the helper (its query doesn't carry pickup cols). `/dashboard` + `/account` derive the SAME boolean inline from rows already in hand (no extra DB round-trip) — keep those inline checks in sync with the helper if the rule changes.

**E2E pattern (deterministic banner assertion) — reusable.** The banner is data-driven on the test member's REAL pickup, which would make a hard assertion flaky. So the harness SNAPSHOTS the test member's active-share pickup/delivery, CLEARS it in `global-setup` (writes `.auth/pickup-fixture.json` sidecar via `clearTestMemberPickup`), and RESTORES it in `global-teardown` (`restoreTestMemberPickup`) — same snapshot-mutate-restore shape as the swap fixture. `member-journeys.spec.ts` reads the sidecar (`pickupWasCleared()`) to self-skip when the member had no active share. **How to apply:** to deterministically test ANY data-driven member-state UI, snapshot+mutate+restore the member's rows in setup/teardown rather than asserting on whatever data they happen to have.
