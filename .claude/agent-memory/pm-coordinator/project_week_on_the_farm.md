---
name: week-on-the-farm
description: THE canonical weekly operating framework for Tiny Seed — daily responsibilities + order windows across CSA, Flex, Markets, Wholesale, Floral. The basis for all scheduling/ordering/portal decisions (Todd-confirmed 2026-06-18).
metadata:
  type: project
---

**THE canonical "Week on the Farm" — Todd-confirmed 2026-06-18. Base all scheduling, ordering-window, and portal decisions on this.** A CSA week = **Mon–Sun**, four pickup days (Tue/Wed/Sat/Sun), labeled by date range, rolls Monday (see [[csa-weekly-cycle]]).

## Two fulfillment cycles
- **Early-week:** harvest **Mon** → distribute **Tue** (Lawrenceville) + **Wed** (all CSA stops + home + farm pickup).
- **Weekend:** harvest **Thu** → distribute **Sat** (Bloomfield, Sewickley) + **Sun** (South Side). (Sunday IS in the Thursday cycle — confirmed.)
Pick/pack lists generate **Mon & Thu mornings**. Floral pick lists ALWAYS separate (veg→todd@, floral→tinyseedfleurs@).

## Daily responsibilities
| Day | What happens |
|-----|--------------|
| **Mon** | Harvest (Wed CSA + Tue Lawrenceville + Tue wholesale); gen pick/pack; place vendor add-on orders |
| **Tue** | Lawrenceville market 3–7; deliver Tue wholesale; finish/pack for Wed |
| **Wed** | MAIN CSA delivery — 11 stops + home + farm pickup (Mediterra wholesale rides this day, always) |
| **Thu** | Harvest (weekend CSA + Sat/Sun markets + Fri wholesale); gen pick/pack; **flex window opens for next week**; owner reminder |
| **Fri** | Market prep; deliver Fri wholesale; weekend CSA prep |
| **Sat** | Bloomfield (5050 Liberty, 9–1) + Sewickley (200 Walnut, 9–1) markets |
| **Sun** | South Side market (2120 Jane St, 10–2, May–Sept) |

## ORDER WINDOWS (confirmed, refined 2026-06-18)
Opens **Thursday** for ALL CSA. Cutoffs align to the HARVEST day (base box is picked that morning → no changes after):
- **BOX SWAPS** (changing the standard box): **base box is picked Monday** → swaps lock **Monday 6:00 AM** for Tue/Wed CSA; **Thursday 6:00 AM** for Sat/Sun CSA. "The traditional CSA should not be able to switch after the Monday harvest."
- **FLEX add-ons** (à-la-carte extras on top): **Tuesday 6:00 AM** (Tue/Wed) / **Thursday 6:00 AM** (Sat/Sun) — CONFIRMED (Todd 2026-06-18: "a la carte can end Tuesday"). Additive extras get a LATER cutoff than box swaps because swaps lock at the Monday harvest while extras can still be pulled.
- (6 AM so pick/pack sheets print that morning.) ⚠️ Portal code currently enforces a single **Tue 8 AM** cutoff — NEEDS UPDATING to this harvest-aligned per-cycle model.
- **Add-on (vendor) orders: place ≥1 WEEK ahead** (cheese/bread/mushroom/coffee). Vendor lead time ≈ 1 week.

**Wholesale** (two delivery days, ideal state):
- **Tuesday delivery** → list out **Thursday**, ordering closes **Monday 6:00 AM**
- **Friday delivery** → list out **Sunday**, ordering closes **Thursday 6:00 AM**
- **CURRENT transitional reality:** wholesale is consolidated onto **Wednesday with the CSA** to save labor (not fully in the swing yet). **Mediterra stays Wednesday permanently** (far, next to a CSA stop). Goal: shift wholesale to the Tue/Fri cycle once enough restaurants cluster near Mediterra.

**Markets** — walk-up retail; CSA-market members pick up their share during market hours.

**Floral** — flower members pick up **same days, same stops as their veg**; season starts **June 24**; weekly or biweekly, petite/full. Wholesale floral expected to grow.

## Wholesale STANDING orders (confirmed 2026-06-18) — all King Spring Mix, all can add on
| Customer | Qty | Day |
|---|---|---|
| **Mediterra** | 50 # | Wednesday (always — far, by a CSA stop) |
| **Black Radish** | 10 # | Wednesday |
| **Cafe Verde** | 5 # | Wednesday |
| **Butterjoint** | 10 # | Friday |
→ Wed standing total = **65 # King Spring Mix**; Fri = **10 #**. All customers may add more on top of the standing qty. (Table `wholesale_standing_orders` exists — set these up so they auto-appear weekly.)

## Season
Open NOW; product likely available **through ~New Year** (exact end TBD — "feel it out"). No off-season shutoff to configure yet.

## Markets: standard AND customizing both supported
Per-member `customization_allowed` flag: `true`=choose/swap, `false`=fixed standard share. All 130 summer_veg currently `true`. Box-swap must respect this flag.

## Open items to make the week smoother (pending Todd)
1. **Harvest-vs-cutoff timing:** Tue/Wed orders close Tue 6 AM but harvest is Monday — clarify what's harvested Mon (base box) vs finalized Tue 6 AM (flex/swap deltas) so the Tue-morning pick is just the deltas.
2. **Vendor add-on lead times** (Goat Rodeo cheese / bread / mushroom / Redhawk coffee) — drives when Mon/Thu vendor orders must fire.
3. **Wholesale standing orders** — which restaurants, standing items (esp. the Mediterra standing order).
4. Season end dates (veg, flower); market-season + holiday closures.
Related: [[csa-weekly-cycle]], [[weekly-schedule]], [[csa-operations-admin]], [[box-swap-design]], [[csa-share-structure-2026]].
