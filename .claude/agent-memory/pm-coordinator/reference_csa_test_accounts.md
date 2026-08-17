---
name: csa-test-accounts
description: CSA portal test/fixture accounts that must ALWAYS be excluded from real member counts, the weekly email, reports, and credit operations.
metadata:
  type: reference
---

Known test accounts in the CSA Supabase — ALWAYS exclude these from real member counts, recipient lists, sales reports, and any credit/money operation:
- `freetodd21@gmail.com` — Todd's manual-test login (reused for portal walkthroughs). Shares deactivated 2026-05-24; keep the customer for future testing. Store credit cleared to $0.
- `fakeemailsofake@gmail.com` ("Jack Fakeguy") — pure junk test. Shares deactivated 2026-05-24.
- `test@test.com` ("CSA Member") — the Playwright E2E harness fixture; the automated test suite logs in as this member and needs an ACTIVE summer_veg share, so it is kept ACTIVE on purpose. Excluded from the weekly email (newsletter_opt_in=false) and must be excluded from real counts/reports.

Scripts already hardcode an EXCLUDE set (`scripts/migrate-csa/*.py`, the PDF generator) — currently freetodd21 + fakeemailsofake; ADD `test@test.com` to report/count exclusions too.

`tinyseedcsa@gmail.com` — Frankie's STAFF login (keep the customer + staff role), but its 2 CSA shares (Summer Veg Large $360 + Flower Large $200) were TEST per Todd 2026-05-24 → deactivated. Add this email to report/count exclusions too (added to the PDF generator EXCLUDE set).

After full 2026-05-24 cleanup: **real active members = 264 shares / 189 customers; weekly-email recipients = 189** (excludes freetodd21, fakeemailsofake, test@test.com, tinyseedcsa@). NOTE: `laurenkurtz.lek@gmail.com` "Lauren Kurtz" ($540 summer) is a REAL customer (Todd confirmed — NOT an insider/"Loren" share) — leave her.

Cleaner end-states offered to Todd (pending): (1) hard-DELETE the junk (fakeemailsofake + freetodd21 inactive rows) vs leave deactivated; (2) make the Playwright harness self-provision its own throwaway test member in global-setup so `test@test.com` can be removed from production entirely. Related: [[csa-migration-data-gaps]], [[csa-shopify-sync]].
