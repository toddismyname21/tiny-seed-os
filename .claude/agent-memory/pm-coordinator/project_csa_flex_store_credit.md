---
name: csa-flex-store-credit
description: CSA "Farm Flex" feature — members preload funds + buy extras. Firm constraint: all payments stay in Shopify (no Stripe). Plan APPROVED by Todd 2026-05-20. Phase 0 = migrate existing flex balances.
metadata:
  type: project
---

Todd wants a "Farm Flex" capability on the CSA portal: any member can preload a prepaid balance and spend it on a curated weekly "extras store" (his words: "a regular CSA member wants to buy tons of tomatoes — they can!").

**Firm constraint (Todd, 2026-05-20):** ALL billing/payments stay in Shopify. Do NOT propose Stripe or any other processor.

**Why:** Todd already runs his store on Shopify (tinyseedfarm.com) and doesn't want a second money system. The CSA migration deliberately kept billing on Shopify for Phase 1.

**How to apply:** Architecture decided by research (`docs/research/CSA_FLEX_SHOPIFY_ARCHITECTURE_2026.md` + `CSA_FLEX_PRODUCT_UX_2026.md`):
- Use Shopify **Store Credit accounts** as the balance source of truth — native, redeemable at checkout, available on ALL plans ($0 upgrade; Plus only needed for Multipass/custom-IdP which we avoid).
- Add funds = a "Flex Top-Up" Shopify product → checkout → `orders/paid` webhook → `storeCreditAccountCredit`.
- Extras = curated `csa-extras` collection, headless cart in the Astro portal → Shopify checkout auto-applies credit (card covers overage).
- Supabase `flex_transactions` becomes a webhook-driven MIRROR for display; never build our own money ledger.
- Auth bridge = existing `customers.shopify_customer_id` + deep-link to Shopify login.

**Bonus ladder (Todd decided 2026-05-21): <$250 → +5% ; $250–$499 → +10% ; $500+ → +12%.** Used for both the retroactive surprise AND the standing Add Funds incentive going forward (advertise it).

**Retroactive loyalty bonus — DONE 2026-05-21:** issued $1,019 of bonus store credit to the 29 existing flex customers (5/10/12 ladder on their principal), NO expiry (goodwill surprise). Recorded as 29 promotional rows in `flex_transactions` (reason 'Flex loyalty bonus') for the principal/bonus accounting split. Combined flex balances now $11,119 ($10,100 principal + $1,019 bonus). Script: `scripts/migrate-csa/flex_loyalty_bonus.py` (idempotent — skips if balance > principal). Shopify shows ONE combined spendable balance; Supabase flex_transactions tracks the promotional portion.

**Legal guardrails (must be in the design):** flex PRINCIPAL never expires + never charges fees → exempt from PA escheatment (one of the shortest US dormancy windows). Bonus credit is ledgered SEPARATELY (flex_transactions) and may expire (retroactive batch has none). Treat loaded balances as deferred revenue (liability until redeemed). Non-refundable for cash. Needs PA CPA/attorney sign-off before holding member money; re-verify PA HB 1067 status.

**Pre-build gating checks for Todd:** (1) confirm Shopify "New Customer Accounts" is enabled (required for store credit at checkout); (2) confirm Shopify store creation date (fee question, only matters if created on/after 2025-05-12).

**Three flex-balance mechanisms required (Todd clarified 2026-05-20):**
1. **Auto-load on flex-share purchase** — when a customer buys a flex share via Shopify, that amount auto-loads as their portal balance (orders/paid webhook → storeCreditAccountCredit). Covers future orders.
2. **One-time migration of already-sold 2026 summer flex shares** — load existing balances. KEY: flex balances were NEVER tracked separately, and the 2026 season hasn't started (no drawdown), so opening balance = `members.amount_paid`. That data lives in Supabase already, so it's SAFE through cutover (NOT time-sensitive — earlier worry retracted). ~28 active flex members, ~$7,300 total. Load amount_paid where >0.
3. **Admin manual entry/adjustment tool** — set/correct a member's balance (writes to Shopify Store Credit + mirrors to flex_transactions). Handles the ~8 active season="Flex" members showing $0 (amount never captured → Todd enters manually).

Open items: confirm season="Flex" cohort (8 members, $0) are summer flex shares to enter manually vs a different product; exclude test rows (fakeemailsofake@gmail.com "Jack Fakeguy", freetodd21).

**Extras Store model (Todd 2026-05-22, refined):** End-state = the FIELD PLAN creates the item catalog; the store is populated by only AVAILABLE items, which the admin TOGGLES on/off. So it's a persistent item CATALOG + an availability toggle — NOT a fresh manual list typed each week, and NOT a fixed pre-defined SKU set.
- DEFER (the dream): the field-plan → catalog auto-feed pipeline (field-planner.html / PLANNING_2026 → extras catalog items). Build later.
- BUILD NOW (forward-compatible with the above): `extras_items` CATALOG table {id, name, unit, price, shopify_variant_id, crop_ref nullable (future field-plan link), source 'manual'|'field_plan', is_available boolean toggle, created_at}. Admin page: add catalog items manually for now + an on/off availability toggle per item. Member store shows items where is_available=true during the order window (reuse the Tue 8am season/cutoff logic). When the field-plan pipeline lands later it just inserts into the SAME `extras_items` catalog (source='field_plan'); the toggle + store don't change.
- Grounding: farm already has a ~40-item `[Veg]` retail catalog in Shopify + partner add-ons (mushroom/bread/Goat Rodeo cheese/Redhawk coffee) + DIY Bloom Bucket; summer fruiting crops (tomatoes/peppers/cukes/corn/squash) are NOT SKUs yet.
- Checkout: Shopify cart permalink → member logs into Shopify (New Customer Accounts) → store credit auto-applies (no Storefront token needed for v1). Inventory tracked in Shopify (qty → auto sold-out).

**Build sequencing:** Phase 1 Farm Flex WALLET (show $11,119 balances incl. bonus surprise) FIRST — decision-free; then Phase 2a Add Funds (5/10/12 ladder); then Phase 2b admin-managed Extras Store. Related: [[csa-portal-prod-deploy]], [[csa-shopify-sync]], research docs CSA_FLEX_SHOPIFY_ARCHITECTURE_2026.md + CSA_FLEX_PRODUCT_UX_2026.md.
