---
name: csa-vacation-addon-riders
description: How CSA vacation holds model add-ons (rider holds) and the two-cutoff system — needed to avoid double-counting + copy mistakes.
metadata:
  type: project
---

CSA portal (apps/csa-portal) vacation holds + add-ons. See also [[csa-ops-admin-phase1]].

**Members can only schedule a hold on their PRIMARY box share.** `/account/vacation/new` posts a FIXED hidden `member_id = primary.id` (primary = `members[0]` ordered by start_date desc, the box row). There is no UI to hold an add-on directly.

**Add-on holds are auto-created "rider" holds, NOT member-booked.** `src/lib/vacation-cascade.ts` `cascadeVacationHoldToAddOns()` runs after a box hold succeeds: for every `share_type='add_on'` row of that customer it does a DIRECT INSERT of a matching hold (same dates/disposition), reason suffixed ` [auto: rides the held box]` (`RIDER_SUFFIX` / `riderReason()`). It does NOT call the RPC and NEVER writes `vacation_weeks_used` → rider holds consume **0 vacation weeks** (add_on has no delivery calendar; `vacationWeeksUsed()` in vacation.ts returns 0 for add_on/flex). Cascade only fires for BOX_SHARE_TYPES = summer_veg, spring_veg, fall_veg, flower, wholesale_csa.
- **Why:** an add-on must pause when its box pauses, else it packs with no box to ride in (real incident).
- **How to apply:** when rendering or counting member-facing vacation holds, EXCLUDE holds on `add_on` rows (they're internal riders) — else one household hold shows as multiple cards (Naomi Anderson bug, fixed 2026-06-16 in vacation.astro by filtering `memberById.get(h.member_id)?.share_type === 'add_on'`). Filter by the member row's share_type, not the reason suffix.

**CANCEL-CASCADE (built 2026-06-16; FK-exact since 2026-06-17):** `cascadeVacationCancelToAddOns()` in vacation-cascade.ts mirrors the create cascade on the cancel path. `/api/account/vacation/cancel` passes the cancelled box hold's id as `boxHoldId`; the cascade selects riders by `parent_hold_id = boxHoldId` (status scheduled/active) and cancels them via a DIRECT UPDATE (`status='cancelled', cancelled_at`) through the RLS-scoped client — NOT the RPC — so it never decrements `vacation_weeks_used` (riders never incremented it). Best-effort: a cascade failure never undoes the box cancel. A pre-0052 fallback (legacy customer + date-overlap + RIDER_SUFFIX marker, gated by `isRiderReason()`) covers riders created before the migration; auto-recovers once 0052 is applied.

**parent_hold_id FK (migration `supabase/migrations/0052_vacation_rider_parent.sql`, built 2026-06-17 — NOT yet applied/deployed by me; PM applies):** `vacation_holds.parent_hold_id uuid REFERENCES vacation_holds(id) ON DELETE CASCADE`, nullable, only riders set it. `cascadeVacationHoldToAddOns` stamps it = the box hold's id (`CascadeHoldInput.boxHoldId`, sourced from `schedule_vacation_hold`'s returned `hold_id`). This REPLACES the former marker+overlap matching and FIXES the old edge case: two overlapping box holds where only one is cancelled now cancel ONLY that box's riders (the FK is exact). Migration also conservatively backfills existing riders (links a rider only when EXACTLY ONE same-customer box hold matches its dates exactly; ambiguous → left NULL).

**Week-1 flex override RETIRED (2026-06-16):** `WEEK_ONE='2026-06-08'` in flex-order.ts no longer closes Tue 18:00/6 PM — it now closes Tue 08:00 AM ET like every standing week (Todd approved). The `WEEK_ONE` constant remains (used by `opensEpochMs` epoch-0 "already open" sentinel + `currentOrderWeek` scan), but `cutoffEpochMs`/`closeLabel` no longer special-case its close time. The flex window is now uniformly Friday-open / Tuesday-8-AM-close. See [[csa-flex-feature]].

**Two DIFFERENT Tuesday cutoffs — do not conflate in copy:**
- BOX swap/customization cutoff: **Tuesday 8 AM ET** (`src/lib/box.ts` `isCutoffPassed`).
- FLEX order window: opens prior **Thursday 00:00 ET**, closes **Tuesday 07:00 ET** (Week-1 override Tue 6 PM) — `src/lib/flex-order.ts`. The flex page renders computed open/close labels from this logic, so any hardcoded flex copy must agree with it.
- **How to apply:** "check back Tuesday evening" is WRONG box copy — it collides with the Tuesday-MORNING cutoff (Amy Hepner/Nancy Bergman missed ordering, 2026-06-16). For box pages say "before Tuesday 8 AM." Todd asked for the flex window to be "list Friday → order by Tue 8 AM" but the CODE is Thursday/7 AM — that mismatch was flagged to PM, not silently encoded.
