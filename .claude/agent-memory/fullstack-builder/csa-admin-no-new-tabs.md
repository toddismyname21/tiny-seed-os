---
name: csa-admin-no-new-tabs
description: Owner rejects new admin nav tabs/pages; day-aware ops flows belong on the /admin home via the TodayFlow component, not standalone pages.
metadata:
  type: feedback
---

Do NOT solve an admin ops need by adding a new /admin page + a new sidebar nav item. Extend the existing admin home instead.

**Why:** On 2026-07-06 I shipped a `/admin/monday` page + a "Monday" nav tab. Todd rejected it same-day: "Building another page may not be the best idea. The workflow is already confusing and there are a ton of tabs — our research would suggest this is bad UX." This aligns with `shared_research/ux_design_2026/CORE_UX_PRINCIPLES.md` (3–5 nav items, progressive disclosure). The AdminShell sidebar is already large (8 groups, ~28 items).

**How to apply:**
- Day-of-week / "what do I do today" ops flows live in `src/components/TodayFlow.astro`, rendered at the TOP of `src/pages/admin/index.astro` (where Todd lands). It's day-aware via `todayWeekdayET()`: Monday = full Wednesday-run deck, Thursday = weekend-run mirror, other days = a slim strip. Add new day-modes/steps THERE.
- Wrap heavy checklists in `<details open>` (progressive disclosure) so they collapse once the day is rolling; keep the home's existing cards below unchanged.
- If you must retire a page that had a nav tab, remove the nav item from AdminShell and convert the old route to `return Astro.redirect('/admin', 303)` (bookmark-safe) rather than deleting it.
- Todd asked for the Monday flow to be mirrored for Thursday ("get market, csa, flex, wholesale ready for pick and pack and move it along") — he thinks in symmetric Wednesday-run vs weekend-run pack days. Related: [[csa-ops-admin-phase1]], [[csa-monday-crons]].

**Note on `scripts/ux-preflight-audit.sh`:** it targets standalone HTML pages, so it FALSELY fails an Astro component on DS-001 (design-system CSS), MB-001 (viewport meta) — both live in BaseLayout/AdminShell — and CL-001 (tab count). Ignore those three for component files.
