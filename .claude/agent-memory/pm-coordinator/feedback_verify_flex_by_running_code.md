---
name: verify-flex-by-running-code
description: Never state flex open/closed status from code comments or memory — run the actual flex-order.ts functions (and check member-side). A stale comment caused a bad member email.
metadata:
  type: feedback
---

Before telling Todd (or members) that flex is "open until X," **run the actual `flex-order.ts` cutoff functions for `Date.now()`** — never rely on code comments or prior memory.

**Why:** On 2026-07-20 I told Todd flex was "open until Tuesday 8 AM" based on a **stale code comment** in `cutoffEpochMs`. The real cutoff is **Monday 7 AM** (see [[flex-cutoff-truth]]), which had already passed — and I'd just emailed 29 members a reminder linking to a page that showed "next week / closed." Todd caught it and called it "sloppy." Correct call.

**How to apply:** Any time flex open/closed/cutoff status matters (verifying, emailing a reminder, answering a member): (1) run `flex_diag.ts` / a tsx that prints `currentOrderWeek`, `isWindowOpen`, `isPastCutoff`, `closeLabel`, `windowLabels` for now; (2) for a reminder blast, also fetch `/account/flex-order` as a real flex member ([[member-page-verification]]) so you know members see it OPEN before you send. If the window is closed and Todd wants it open, extend via `WEEK_EXTENDED_TUE` + deploy, THEN verify, THEN send.
