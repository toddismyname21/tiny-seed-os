---
name: thorough-root-cause-sweep
description: When investigating a customer-reported bug, do the COMPLETE sweep up front — every code path, RLS, AND any legacy/old system still live — before declaring it resolved. Don't fix one cause and assume done.
metadata:
  type: feedback
---

When a customer/owner reports a bug (e.g. "pickup locations aren't showing"), do an EXHAUSTIVE root-cause sweep the FIRST time — do not fix the first cause you find and call it resolved.

**Why:** 2026-06-05, Todd: "it seems this filter check should have been done from the beginning. I expect you to be more thorough." On the "pickup locations not available" complaint, the PM first found+fixed ONE cause (the `is_delivery_zone=false` filter in `/account/pickup`), deployed, and reported it resolved. Customers kept emailing. The fuller sweep then found the REAL ongoing culprit: **the OLD Apps Script portal (`app.tinyseedfarm.com/web_app/csa.html`, GitHub Pages from `main`) was still live with its own stale pickup chooser** — never redirected at cutover. Members on old bookmarks saw stale data. Fixing one layer and stopping wasted Todd's time and looked sloppy.

**The complete checklist for "X isn't showing for customers" (apply ALL, every time):**
1. Every code path that renders the thing (grep ALL `.from('<table>')` / all choosers, not just the obvious page).
2. RLS policies on the table (what an *authenticated member* client actually sees ≠ service-role).
3. Any server-side filter (capacity, status, zone flags) AND any validating RPC/save path.
4. **Legacy / old systems still serving traffic** — old portal, old domain, cached bookmarks. At cutover, confirm the OLD system is redirected/locked, not just that the NEW one works.
5. Browser cache + timing — a complaint may predate the fix (ask "when did you last check?").

**How to apply:** Before telling the owner "resolved," enumerate every place the symptom could originate and verify each. Especially: is there an OLD version of this system still live that customers could be hitting? (For Tiny Seed: `app.tinyseedfarm.com/*` GitHub-Pages legacy pages vs the new `csa.tinyseedfarm.com` Vercel portal — the legacy `csa.html` is now a redirect as of 2026-06-05; check siblings like `customer.html` too.) Related: [[csa-portal-prod-deploy]].
