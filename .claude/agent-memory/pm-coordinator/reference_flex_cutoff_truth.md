---
name: flex-cutoff-truth
description: The ACTUAL flex order-window cutoff (Monday 7 AM for the Wed run) + the WEEK_EXTENDED_TUE override — and the rule to verify by RUNNING flex-order.ts, never the stale code comments.
metadata:
  type: reference
---

**The real flex order-window cutoff (`apps/csa-portal/src/lib/flex-order.ts`):**
- **Wednesday run** (Tue market / Wed CSA / home delivery / no-pickup): opens prior **Thursday 00:00 ET**, closes **MONDAY 7:00 AM ET** of the delivery week (`cutoffEpochMs` = week_starting **+0** days). i.e. flex for a Wed 7/22 delivery closes **Mon 7/20 7 AM**.
- **Weekend run** (Sat/Sun market members, `isWeekendMarket`): closes **Thursday 7 AM ET** (week_starting +3).
- After the Monday close, `currentOrderWeek()` immediately rolls to the NEXT delivery week (which is "before-open" until its Thursday), so `/account/flex-order` shows "next week / closed."

**One-week extension override:** `const WEEK_EXTENDED_TUE = 'YYYY-MM-DD'` — set it to the delivery week's Monday to extend THAT week's Wed-run close to **Tuesday 7 AM** (week_starting +1). Setting it also makes `currentOrderWeek` keep resolving to that week (stays OPEN) instead of rolling forward. Used when the flex list goes live late. Update the constant each time (it was stale at 2026-07-13 on 2026-07-20, causing members to see "closed"). Roll/remove after the week passes. Requires a CSA-portal **deploy** to take effect.

**⚠️ The code COMMENTS in `cutoffEpochMs` say "Tuesday 08:00 ET" — that is STALE/WRONG.** The actual logic is Monday 7 AM. See [[feedback_verify_flex_by_running_code]].

**How to verify (do this, don't trust comments or memory):** run `apps/csa-portal/scripts/flex_diag.ts` (or a tsx that imports `currentOrderWeek`, `isWindowOpen`, `isPastCutoff`, `closeLabel`, `windowLabels` and prints them for `Date.now()`). To confirm member-side, authenticate as a flex member and fetch `/account/flex-order` (see [[member-page-verification]]).
