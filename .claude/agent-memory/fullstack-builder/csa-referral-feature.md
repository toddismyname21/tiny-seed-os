---
name: csa-referral-feature
description: CSA referral bonus feature in apps/csa-portal — where the code-gen + sync attribution live, idempotency design, and the loyalty-vs-referral reason gotcha.
metadata:
  type: project
---

CSA portal "referral bonus" (built 2026-05-24, commit fd7fedb on csa-migration). A member shares a unique discount code; a friend gets $25 off a CSA order ($300 min, CSA collection gid 184897929349); when that referred order completes (paid, not cancelled), the referrer earns $25 in Farm Flex (Shopify store credit). Unlimited. See also [[csa-flex-feature]].

**Tables (migration 0024_referrals.sql):** `referral_codes` (one per member: customer_id UNIQUE FK, code UNIQUE, shopify_discount_node_id) + `referrals` (one per qualifying order: referred_order_id text NOT NULL UNIQUE = the idempotency guard). RLS: SELECT scoped to current_customer_id() (household-aware), is_admin_caller() bypass, NO authenticated write policy — all writes are service-role only (like flex_transactions).

**`src/lib/referral.ts` is the server-only code-gen + stats API.**
- `getOrCreateReferralCode(customer)` → existing row or mint one. Generates `<FIRSTNAME>-<4 char>` (unambiguous 32-char alphabet, no I/O/0/1), DB collision-retry, then the PM-PROVEN `discountCodeBasicCreate` mutation, then INSERT. FAIL-SOFT: Shopify error throws `ReferralCodeError` and writes NO half row (page shows "try again"); 23505 race re-reads the winner.
- `getReferralStats(customerId)` → {count, totalEarned} fail-soft to zeros.
- `REFERRAL_BONUS_AMOUNT = 25` is the shared constant the SYNC imports, so the displayed promise and the issued credit can't drift.

**Sync attribution lives in `src/pages/api/sync/shopify-orders.ts` → `attributeReferral(order, email)`.**
- Runs AFTER the per-order ledger write, ONLY for paid orders. Qualifier: CSA line item + total > $300 + paid. Matches any order discount code (case-insensitive) to referral_codes.code, resolves the referrer, GUARDS self-referral (referrer email == referred email → skip), short-circuits on an existing referrals row, credits referrer +$25, THEN (only after a confirmed credit) inserts flex_transactions + referrals rows.
- **CREDIT IS ADDITIVE as of 2026-05-24 (drift fix, commit 3ae4622).** It calls `issueStoreCreditDelta(referrerGid, 25)` — a PURE additive credit (ADDS $25 server-side, NO read-then-set). DO NOT revert to `issueStoreCredit(gid, currentBalance+25)` (balance-TARGETED): a fail-soft balance read of 0 would top up only TO $25 instead of ADDING it → UNDER-CREDIT while the ledger still claims +$25 → Shopify↔ledger drift. ORDERING: credit first (throws on Shopify error → caught → NO ledger rows), then write flex_transactions + referrals ONLY after credited>0. A duplicate referrals insert (23505) now REPORTS an error (a second credit may have posted) rather than silently no-op'ing (additive ≠ self-guarding). Idempotency is the per-order shopify_order_sync ledger guard (runs at 5a BEFORE any credit); referrals.referred_order_id UNIQUE is the backstop. See [[csa-flex-feature]] (same additive switch for the flex top-up).
- `attributeReferral` NEVER throws — a referral hiccup must not fail an order whose members+flex are already committed; non-fatal issues go into the run's errors[].
- Needed two new shopify.ts helpers: `getCustomerGidByEmail()` (resolve referrer's Shopify customer) + `isOrderPaid()`. Plus `discountCodes` + `currentTotalPriceSet` added to the orders GraphQL query / ShopifyOrder type / fetchOrders mapping (Order.discountCodes is a `[String!]!` of code strings in Admin API 2025-01).

**GOTCHA — the flex reason string is load-bearing.** `flex.ts getLoyaltyBonusTotal` sums flex_transactions WHERE `reason ILIKE '%loyalty bonus%'` to compute the principal/bonus split. The referral reason MUST be `Referral bonus — order <name>` (no "loyalty bonus" substring) or it would be miscounted as a loyalty bonus and wrongly shrink the displayed principal. Keep these reason vocabularies disjoint.

**How to apply:** any NEW "credit a member store credit + record it" path should use `issueStoreCreditDelta(gid, amount)` (PURE additive — the correct forward-credit primitive) NOT `issueStoreCredit` (balance-targeted, only for the idempotent backfill where re-running must be a no-op). Always: credit FIRST, write the ledger row ONLY after a confirmed credit (never claim a credit that didn't post). Pick a flex_transactions.reason that does NOT collide with the loyalty-bonus ILIKE. The refer.astro page is a READ-only display (mints on load) — no POST/CSRF needed, unlike the /account/* editor pages.
