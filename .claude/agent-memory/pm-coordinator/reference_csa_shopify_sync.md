---
name: csa-shopify-sync
description: The automated Shopify→Supabase order sync for the CSA portal — endpoint, schedule, idempotency model, how to operate/debug it, and the watermark-reset caveat.
metadata:
  type: reference
---

Automated catch-up sync so new Shopify CSA orders never drop out of Supabase (replaces the broken point-in-time migration snapshot). Built + deployed 2026-05-21.

**Endpoint:** `apps/csa-portal/src/pages/api/sync/shopify-orders.ts` → live at `https://csa.tinyseedfarm.com/api/sync/shopify-orders`. Auth: `Authorization: Bearer <CRON_SECRET>` (401 otherwise). `?dry_run=1` = reads only, returns a `planned[]` array, ZERO writes.

**Schedule:** Supabase `pg_cron` job `csa-shopify-sync`, `*/15 * * * *`, calls the endpoint via `pg_net` (`net.http_post` with the Bearer header, 30s timeout). NOT Vercel Cron (this project is Vercel Hobby = daily-only cron). Manage: `select * from cron.job;` / `cron.unschedule('csa-shopify-sync')`. pg_net responses land in `net._http_response`.

**Idempotency model (migration 0022):**
- `shopify_sync_state` (1 row): `last_synced_at` watermark. Seeded at deploy-time so the first runs ignore all historical/already-reconciled orders. Each run pulls Shopify orders with `updated_at >= watermark`, then advances the watermark to the max updated_at seen.
- `shopify_order_sync`: per-order ledger keyed by `shopify_order_id` (skip already-processed); records members_upserted, flex_credited, last_error.
- Member rows upserted with deterministic `legacy_id = SYNC-<orderId>-<lineItemId>`. Flex line items → `storeCreditAccountCredit` (skips if balance already ≥ target).

**⚠️ Watermark-reset caveat:** the sync de-dupes by SYNC-legacy_id + the order ledger, NOT against the EXISTING (migrated/backfilled) member rows which have non-SYNC legacy_ids. So if someone manually moves `last_synced_at` BACKWARD past already-reconciled orders and runs a REAL (non-dry) sync, it WILL create duplicate member rows. Only move the watermark backward for `?dry_run=1` inspection, then reset it forward. Hardening TODO (not yet done): also skip creating a member if the customer already has an equivalent active share.

**Operating creds:** CRON_SECRET + SHOPIFY_ACCESS_TOKEN + SHOPIFY_STORE_NAME are Vercel env vars on the portal project (encrypted). Shopify token also in `mcp-server/.env`. Reconciliation/parse logic source of truth: `scripts/migrate-csa/backfill_missing_members.py` (categorize) + `flex_credit_shopify.py` (flex credit). Related: [[csa-migration-data-gaps]], [[csa-flex-store-credit]], [[csa-portal-prod-deploy]].
