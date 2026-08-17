---
name: csa-migration-data-gaps
description: 2026 CSA Shopify↔Supabase reconciliation (2026-05-21) found major gaps — 17 members missing, 82 with uncaptured amounts ($35.2K), amount_paid broadly unreliable. Launch-blocking.
metadata:
  type: project
---

A full 2026 CSA reconciliation (all Shopify orders since 2025-10-01 vs Supabase members) on 2026-05-21 found the migration is significantly incomplete.

**Findings (193 Shopify 2026-CSA customers):** 91 OK; **17 MISSING entirely** from Supabase ($6,145) — these people can't log into the portal or see their share = LAUNCH BLOCKER; **82 amount-gap** ($35,200 of paid amounts not captured); 1 inactive-only.

**Root causes:**
1. The data migration was a point-in-time SNAPSHOT (last run ~2026-05-13). Every order placed after never came in (the high #237xx/#238xx order numbers). The planned Day-12 Shopify→Supabase webhook is meant to prevent exactly this and is NOT yet built.
2. `members.amount_paid` was largely never populated — even early presale orders show $0. So amount_paid is NOT a trustworthy money field anywhere.

**Severity:** missing-members = functional blocker (no portal access). Flex amount gaps = real spendable money (critical). Non-flex amount gaps = financial-record/reporting gap only — those members still get box/pickup/weeks (share_type/size/dates drive the portal, not amount_paid).

**Implication for flex:** the Supabase-based flex credit list ($6,300/20 members) is WRONG — e.g. Jen VanderPlaats bought 2 flex shares in Shopify ($300) but Supabase captured $150. **Shopify must be the source of truth for flex credit** (matches Todd's "keep money in Shopify" rule). Flex line items = titles containing "Flex" ("2026 Summer CSA Share - Flex ..." and "2026 Flex CSA Share").

**Remediation status (2026-05-21, Todd "see it through"):**
- ✅ DONE — Step 1 flex credit: 29 customers, $10,100 issued via Shopify Store Credit (`scripts/migrate-csa/flex_credit_shopify.py --commit`). Shopify = source of truth. Idempotency guard in script. Reversible via storeCreditAccountDebit.
- ✅ DONE — Step 2 missing members: 16 customers / 24 member rows created (`scripts/migrate-csa/backfill_missing_members.py --commit`). Verified: active 245→269, missing 17→1 (the 1 = speedy55l refunded, correctly excluded).
- ✅ DONE — Step 3 amount_paid backfill: 99 member rows updated from Shopify line-item matching ($30,380). Audit gaps 82→25 ($35,200→$5,620); remainder = home-delivery line items (delivery method, not a share) + add-on granularity, not member-facing. Script `/tmp/step3_amount_backfill_dryrun.py --commit`.
- ✅ DONE — Step 4 automated sync (2026-05-21, deployed + scheduled). See [[csa-shopify-sync]] for the full reference. Endpoint `/api/sync/shopify-orders` (CRON_SECRET-protected, dry_run mode, idempotent), migration 0022 (shopify_sync_state watermark + shopify_order_sync ledger), scheduled via Supabase pg_cron job `csa-shopify-sync` every 15 min. Verified: auth 401s, dry-run parse correct vs 171 real orders, real run clean (0 new, watermark stable). NOTE: the Shopify app API SECRET (webhook HMAC) is NOT in `.secrets/CREDENTIALS.md` — only the access token is; we used polling, not webhooks, so the secret isn't needed.
- Reconciliation status: COMPLETE. All 4 steps done. Every paying 2026 CSA customer is in Supabase with correct share + amount; flex balances ($10,100) in Shopify Store Credit; future orders auto-sync every 15 min.
- RESOLVED: katherine.j.bowen (the 1 inactive-only) was REFUNDED (Todd confirmed 2026-05-21) — correctly inactive, leave as-is. Reconciliation now fully accounted for.
Audit script: `/tmp/audit_2026_csa_orders.py`. Shopify Admin token in `mcp-server/.env` (has write_store_credit_account_transactions). Related: [[csa-flex-store-credit]], [[csa-portal-prod-deploy]].

**Pickup-not-captured finding (2026-05-24) — SUPERSEDED, see below.** Initial `/tmp/investigate_pickup_notes.py` checked only line-item PROPERTIES (customAttributes) → found 0/216 → wrongly concluded "no pickup captured." WRONG.

**CORRECTION + full partial-capture backfill (2026-05-25):** Todd asked to "check variations for ANY order." The pickup (and flex $ amount, and the home-delivery share) is captured in the **Shopify VARIANT TITLE**, not properties. Variant option axes: "CSA STOP LOCATION" / "Choose your most convenient pick up location" (pickup), "Flex CSA Amount" ($), "2026 Home Delivery Options" (bundled share+delivery). The 2026-05-13 migration only read line-item TITLE → dropped (a) extra line items in multi-share orders and (b) the variant pickup. Root: migration kept ~1 line item/order + never parsed variants. **Authoritative reconciliation method = match Shopify vs Supabase by COUNT per group {veg=flex+summer_veg, flower, add_on} (NOT by size/type label — labels drift between migration & Shopify and cause phantom dupes); read the HD-bundle + flex variant.**
Executed 2026-05-25 (scripts `/tmp/csa_backfill.py`, `/tmp/pickup_backfill.py`, all idempotent, DRY-RUN→--commit): **CREATED 31 missing paid shares/add-ons** (3 summer_veg, 2 flex, 3 flower, 23 add-ons across 23 customers; Jackie's flex $400 + flower $200 included); **SET 165 pickups** from each member's chosen variant (pickup_day set to match); **CORRECTED 5** wrongly on Bloomfield-Wed → Bloomfield Market-Sat; **DEACTIVATED 2** bogus rows (hilldorf dup summer_veg, dereiche phantom summer_veg=mis-typed bread $95); **ADDED 2 pickup_locations** (Lawrenceville Tue, Oakmont Wed — Todd confirmed real; Oakmont day unconfirmed); **assigned ispx** 2 summer shares to his 2 stops; **relinked shopify_customer_id** for all members (only test@test.com unlinked). Allison Park (TBD) variants left NULL → member picks Simon's vs St. Paul's via PickupNudgeBanner (Todd's call). **Re-audit clean: 0 missing, 0 over-capture, 0 unmapped, 0 mismatch.** Final = **294 active rows / 190 customers** (summer_veg 126, add_on 60, flower 48, spring_veg 31, flex 29); pickup coverage 189 set + 15 delivery + 30 Allison-Park-TBD/test. Only 1 "orphan" (active, no 2026 order) = nzehnder86 (spring, season over — fine). NO other variables on orders (swept properties/order-attrs/options/selling-plans). These are Supabase DB changes — no portal deploy needed (reads live).
