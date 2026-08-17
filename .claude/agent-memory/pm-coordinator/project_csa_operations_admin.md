---
name: csa-operations-admin
description: CSA back-office tooling spec (CSA day, harvest, ordering, swaps, flex store, labels, vendor lead-time). Two weekly cycles + per-member box composition + Avery 5164 labels.
metadata:
  type: project
---

CSA back-office admin tooling — the operational backbone for CSA day, harvest, and ordering. Spec: `docs/specs/CSA_OPERATIONS_ADMIN_SPEC.md` (drafted 2026-05-26 after Todd's "think of all the practical necessities" prompt + a CSA-fulfillment-software gap analysis).

**Foundation = the Fulfillment Cycle model.** Two cycles per week (NOT one):
- **MON cycle:** member cutoff Mon 6:00 AM → harvest Mon → distribute Tue (Lawrenceville Tuesday market) + Wed (all CSA stops + home delivery). Vendor emails fire at Mon 6:00 AM.
- **THU cycle:** member cutoff Thu 6:00 AM → harvest Thu → distribute Sat (Bloomfield Market, Sewickley Market). Vendor emails at Thu 6:00 AM.

A Cycle Instance = (cycle_code, week_starting). Every report (vendor totals, harvest, pack, labels, per-stop manifest, dashboard) is a **live computed view** of one Cycle Instance — never a stored snapshot — so a 6 AM vacation hold propagates everywhere instantly without report re-runs (this is the #1 data-integrity trap in the industry per the gap analysis).

**Box swap allowance (refines/supersedes [[csa-no-ai-moat]]).** Limited swaps ARE allowed, just rationed:
- Large weekly + Small weekly summer_veg: **6 swaps/season**
- Biweekly (small + family): **3 swaps/season**
- Flex / flower / spring / add_on: no swaps (flex is à-la-carte; flower/spring don't apply).
- `members.swap_credits` column already exists — initialize on build. `customization_allowed=true` only for summer_veg.
- Swap MECHANIC (Todd approved): each week a curated `weekly_swap_menu` (swap_out items + swap_in items, ~equal value). 1-for-1 swaps. Locked at cutoff. Allergy/dislike subs from `member_preferences` are automatic and DO NOT consume credits.

**Labels:** Avery 5164 (3.33×4", 6/sheet). Print in PACK ORDER. Include name, stop, size, add-ons, swap flags, allergy flag, ⚠ "balance due" flag.

**Vendor add-on lead-time forecasting** is the single biggest under-built feature across all CSA platforms surveyed (LFM is the only one that does POs at all; none do true forecasting). New tables: `vendors`, `vendor_orders`. Auto-compute + draft email at cutoff; admin clicks Send (never auto-send).

**Flex availability:** new tables `flex_inventory` (weekly catalog with per-item caps + restock alerts) + `flex_orders`. Member's Shopify Store Credit debited at cutoff (when status flips pending→locked).

**Other ops modules in spec:** Harvest List · Pack Sheet (per-member, add-ons separated from produce) · Per-Stop Manifest (BOLD box count + breakdown cover, flex balance, owes flag) · Home-Delivery Manifest · Pickup Check-in · Pack-Day Dashboard (the consolidated "what's due / what changed" view — industry's biggest gap) · End-of-Day Unclaimed Box workflow · Late Add (post-cutoff, pre-pack).

**Build is phased for June 10 launch.** Phase 1 (must ship before Mon June 8): data model + cycle resolver + per-stop manifest + Avery 5164 labels + vendor order report + harvest list + pack sheet + box content planner + minimal pack-day dashboard + vendors seed data. Phase 2 (in-season): member box swap + flex store CRUD + member flex store + pickup check-in + home-delivery manifest + vendor auto-draft cron + late add. Phase 3: end-of-day unclaimed + Realtime hold sync + Tiny Seed OS integration (field-planner/harvest/inventory → CSA portal).

**Open decisions still need Todd:** (1) lead-time-days per vendor (Goat Rodeo / Redhawk / bread / mushroom); (2) confirm swap items are equal value (assumed yes); (3) unused swap credits at season end — forfeit / roll into flex / refund (recommended: forfeit, industry standard); (4) late-add cutoff (1hr after member cutoff? until pack start?); (5) flex order debit timing (recommended: at cutoff = lock); (6) unclaimed-box default action (donate after 24h? hold? notify only?). Related: [[csa-portal-feature-backlog]], [[csa-portal-ux-initiative]], [[csa-flex-store-credit]], [[csa-locations]], [[csa-home-delivery-policy]], [[weekly-schedule]].
