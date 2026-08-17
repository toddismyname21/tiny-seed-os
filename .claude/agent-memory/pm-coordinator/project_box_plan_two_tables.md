---
name: box-plan-two-tables
description: CSA box plan lives in TWO tables (box_contents = member-facing, weekly_box_plan = operations/resolveCycle). Both must be populated each week or harvest/pack/route show empty.
metadata:
  type: project
---

The CSA box composition is stored in **two** tables that must agree:
- **`box_contents`** — `week_date`, `share_type` (large/small), `product_name`, `quantity`, `unit`. Drives what MEMBERS see in the portal.
- **`weekly_box_plan`** — `cycle_code='WEEKLY'`, `week_starting`, `share_size` (large/small), `contents` jsonb = `[{crop,qty,unit}]`, `published_at`. This is the ONLY one `resolveCycle()` reads, so it feeds the **harvest list, pack sheets, labels, and route** (all of `/admin/harvest`, `/admin/pack-*`, `/admin/route-sheet`, etc.).

**Why:** 2026-06-22 the harvest list came up EMPTY even though the box was planned — `box_contents` had the week (large 8 / small 6 items) but `weekly_box_plan` had ZERO rows (and appeared never populated). resolveCycle reads weekly_box_plan, so all ops tooling showed nothing. This is the root cause of Todd's "flying blind on CSA day." Fixed for that week by copying box_contents → weekly_box_plan (script `apps/csa-portal/scripts/harvest_numbers.ts` computes harvest; the populate was a direct SQL insert of the two share_size rows).

**How to apply:** Every CSA week, BOTH tables must be populated for the same Monday + sizes. If a harvest/pack/route page is empty, check `SELECT * FROM weekly_box_plan WHERE week_starting='<MON>'` first. Until the permanent fix lands, after setting box_contents you MUST also insert weekly_box_plan rows (share_size large+small, contents jsonb [{crop,qty,unit}], cycle_code 'WEEKLY'). resolveCycle then applies member swaps on top (counts can dip slightly below raw box_contents math — correct). PERMANENT FIX (not yet built): repoint resolver to read box_contents, or auto-sync on publish, so they can't diverge. Documented in [[reference_glossary_of_truth]] section 5a.
