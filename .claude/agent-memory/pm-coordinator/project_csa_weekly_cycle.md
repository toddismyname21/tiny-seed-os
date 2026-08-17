---
name: csa-weekly-cycle
description: The LOCKED-DOWN definition of a CSA week — Mon–Sun, four pickup days, rolls Monday, labeled by date range. Resolves the "this week / next week" confusion (Todd 2026-06-18).
metadata:
  type: project
---

**The CSA weekly cycle is LOCKED (Todd 2026-06-18, after the Jun-17 delivery confusion).**

**Definition:** A CSA week = **Monday–Sunday**, with **FOUR pickup days**:
- **Tue** — Lawrenceville (~7 members)
- **Wed** — main truck delivery: 11 host stops + Rochester farm pickup (~122 members)
- **Sat** — Bloomfield Market, Sewickley Market (~18)
- **Sun** — South Side Market (day_of_week='Sun', active; pickup_locations)

**Why:** Todd was confused that on a Thursday the Wed delivery is done but the same week's Sat/Sun markets are still pending, while the order window for the NEXT week is already open. "Everything changes all the time" + relative "this/next week" labels made it worse.

**The locked rules (all LIVE):**
1. **Date-RANGE labels everywhere** — `weekOptions()` in `lib/cycle-ui.ts` now renders "Week of Jun 22 – Jun 28" (Mon–Sun range). NO "this/last/next week", NO "delivers Wed" (wrong for the 25+ Tue/Sat/Sun members). Used by ~10 admin tools.
2. **`currentDeliveryWeek()`** (`lib/cycle.ts` = `mondayOfWeek(todayET())`) — driver/packer/box/text tools default to the current Mon–Sun week and HOLD it **through Sunday**, rolling Monday. So Sat/Sun market pickups are never orphaned mid-week. (Replaced `upcomingMonday()` which rolled to next week on the delivery day — the Jun-17 incident.)
3. Member-facing pages already show each member's OWN pickup day (Tue/Wed/Sat/Sun) via pickup-day-aware logic.

**Forward-planning tools** (flex ordering window, flex-inventory, vendor-orders, box-plan) still intentionally look at the UPCOMING week — that's correct; only delivery-EXECUTION tools use currentDeliveryWeek. Related: [[csa-locations]], [[route-tab-builder-bug]], [[box-swap-design]].
