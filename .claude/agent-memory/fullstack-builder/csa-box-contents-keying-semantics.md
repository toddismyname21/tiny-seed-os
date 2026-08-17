---
name: csa-box-contents-keying-semantics
description: box_contents is Monday-keyed and its share_type column holds SIZE buckets (small/large/family) canonically — NOT member share_type enums. Two divergent box editors exist.
metadata:
  type: project
---

`box_contents` has two non-obvious properties that break naive queries.

**Fact 1 — keyed on the cycle MONDAY.** `box_contents.week_date == week_starting` (the Monday), the same key resolveCycle, `/admin/share-contents`, and `lib/week-setup.ts` all use. Querying on the delivery Wednesday matches ZERO rows every week.

**Fact 2 — canonical `share_type` = SIZE buckets, not member enums.** In the current model box_contents rows carry `share_type` in ('small','large','family') — read back by resolveCycle (`boxPlanBySize.get(size_bucket)`) and the share-contents sheet (`.in('share_type', ['small','family','large'])`). Do NOT compare box_contents.share_type against `members.share_type` enums (summer_veg/flower/flex/...) — they never match.

**Two divergent editors:**
- `/admin/share-contents` (`share-contents/[...slug].astro`) — CANONICAL. Monday-keyed, size-bucket rows. This is what week-setup.ts's box link (`AREA_HREF.box`) points to.
- `/admin/box-contents` (`box-contents.astro` + `api/admin/box-contents/save.ts`) — LEGACY. Defaults its `week` to `upcomingWednesday()` (Wednesday-keyed) and writes member-enum share_types (summer_veg, flower, ...). Being phased out. Prefer /admin/share-contents for any box-plan link.

**How to apply:** To check "is this week's box plan set?", HEAD-count `box_contents` on `mondayOfWeek(<date>)` (matches week-setup.ts's shared definition) rather than diffing share types. See [[csa-unified-harvest-doc]] for the pack-day doc that also consumes resolveCycle box composition. First hit: 2026-07-02 admin-home "unfilled boxes" badge fired forever because it queried the Wednesday AND diffed member enums vs size buckets.
