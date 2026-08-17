---
name: csa-monday-crons
description: Monday workflow-automation crons (Harvie Gmail auto-ingest, chef + flex order reminders), the shared wholesale-import-commit lib, and the flex-cutoff copy discrepancy.
metadata:
  type: project
---

Three Monday pg_cron endpoints in csa-portal (`src/pages/api/cron/`), all Bearer-CRON_SECRET, all fail-soft, scheduled by `supabase/migrations/0074_monday_crons.sql` (ROOT migrations dir, copies the 0033 Vault+pg_net pattern):

- `harvie-ingest.ts` — Gmail OAuth refresh-token flow (env `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`/`GMAIL_REFRESH_TOKEN`, added to astro.config env schema server/secret/optional). Searches `from:procurementexpress.com subject:"Purchase Order" has:attachment newer_than:3d`, downloads the PDF, reuses `parseWholesalePdf` (unpdf) + vendor_product_map resolution, commits via the shared lib with `onExisting:'skip'`. Fires 3× Monday (skip-if-exists makes that safe).
- `chef-order-reminder.ts` — gated on `portal_settings.chef_reminder_enabled`. Vendor accounts (Harvie/Market Wagon) excluded.
- `flex-order-reminder.ts` — gated on `portal_settings.flex_reminder_enabled`. Uses live Shopify `getFlexBalance` + `currentOrderWeek`/`isWindowOpen`.

Both reminder flags seed `'false'` in 0074 — deploy-safe until Todd approves copy.

**Shared commit lib** `src/lib/wholesale-import-commit.ts`: `commitWholesaleImport(supabase, input, {onExisting})`. The write path was extracted verbatim from `api/admin/wholesale/import/commit.ts` (which now calls it with `onExisting:'replace'`). `'skip'` = never overwrite an existing (account, delivery_date, external_ref) order (the auto-ingest safety contract); `'replace'` = admin re-upload replaces items in place. See [[csa-wholesale-manual-order]], [[csa-chef-wholesale-ordering]].

**GOTCHA (load-bearing):** the flex order cutoff in `lib/flex-order.ts` is **Monday 7 AM (Wednesday run) / Thursday 7 AM (weekend run)** per the unified 2026-06-26 cutoff (confirmed by box.test.ts), NOT the "Tuesday 8 AM" that older recon/comments claim. `closeLabel` returns "Monday 7 AM"/"Thursday 7 AM". Any Monday-morning flex reminder will skip most Wednesday-run members because their window already closed — the flex reminder copy ("Tuesday 8 AM") and its Monday schedule are unreconciled and were flagged to Todd. See [[csa-flex-feature]], [[csa-vacation-addon-riders]].
