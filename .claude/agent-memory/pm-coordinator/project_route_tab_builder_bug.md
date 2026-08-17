---
name: route-tab-builder-bug
description: The /admin/route auto "Create today's route" builder is inaccurate — duplicates members, includes flowers/Week-A, misses Oakmont. Lock-down fix pending.
metadata:
  type: project
---

**The CSA driver Route TAB (`/admin/route` → POST `/api/admin/route`, builder `buildSeedPlan`) produces an INACCURATE route. The route SHEET (`/admin/route-sheet`, uses `resolveCycle`) is correct — they use different stop-selection logic and disagree.** Discovered 2026-06-17 when the auto-create made **31 stops / 22 "home deliveries"** for a day that actually had **20 stops / 10 home / 76 boxes**.

Root causes in `buildSeedPlan` (`src/pages/api/admin/route/index.ts`):
- **One stop per member ROW, not per customer** → anyone with summer_veg + add_on (or flower + veg) gets duplicated (Stephanie Tomasic, Ronelle Myers, Carla Nappi, Diane Reiche, Martina, Stephanie Montemurro all doubled).
- **No box-this-week / share-type filter** → includes flower-only members not delivering yet (Karl Leslie, Kevin, Diane Reiche → flowers next run) and biweekly **Week-A** members who get no box this week (Martina Hilldorfer, Kathryn Brown).
- **Host-stop selection** uses `day_of_week=Wed AND is_delivery_zone AND host_name` → **MISSES Oakmont** (Pittsburgh Taco Boys — configured without those flags) even though it has a box. The route-sheet (resolveCycle/activeStops) includes Oakmont.

**Fix (lock-down):** make `buildSeedPlan` mirror the route-sheet — pull stops from `resolveCycle(week).byStop` (already gated for biweekly parity + season + flex orders), group home deliveries by customer (one stop each), and order via the same `routeRank`. Then route-tab == route-sheet.

**Interim (works today):** driver uses the route-SHEET on her phone + `/admin/text-stop` for arrival texts; both accurate. Don't tap "Create today's route" until builder is fixed.

**Week-labeling gotcha:** on a delivery Wed, the admin "this week" default rolls to the NEXT Monday (e.g., on Wed Jun 17 the manifest/stop-manifest default = "Week of Jun 22", labeling Jun 15 as "last week"). To print TODAY's docs, explicitly select the CURRENT Monday (Jun 15 for Jun 17 delivery). Related: [[csa-release-cadence]], [[csa-locations]].
