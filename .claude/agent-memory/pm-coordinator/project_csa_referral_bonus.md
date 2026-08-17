---
name: csa-referral-bonus
description: CSA referral bonus feature — confirmed business rules + attribution-mechanism decision (pending). Both referrer and friend get $25 flex; qualifying = CSA order >$300.
metadata:
  type: project
---

Referral bonus for the CSA portal (Todd requested 2026-05-23, rules confirmed 2026-05-24).

**Confirmed business rules:**
- Referrer reward: **$25 in Farm Flex** (Shopify store credit) per successful referral.
- Friend (referee) bonus: **$25 in flex funds** (NOT a checkout discount — Todd's deliberate choice; keeps full order revenue + drives extras/wallet engagement).
- Qualifying event: the referred person places **any CSA order OVER $300** (paid, not cancelled/refunded).
- **Unlimited** referrals per member.

**Attribution mechanism — DECIDED: Option A (Todd 2026-05-24, "A is fine it seems easier").**
- Each referrer gets a unique Shopify DISCOUNT CODE. Friend enters it at checkout → **$25 OFF** (this is the friend's benefit; supersedes the earlier "friend gets flex" idea). Referrer gets **$25 flex** when the order completes. No Shopify theme change needed (bulletproof — the code is on the order).
- PROVEN Shopify mechanics (PM validated 2026-05-24): `discountCodeBasicCreate` — $25 fixed off, minimumRequirement subtotal ≥ $300, restricted to CSA collection `gid://shopify/Collection/184897929349` (handle tiny-seed-farm-csa), appliesOncePerCustomer, no usage limit (unlimited friends). Mutation tested + works.

**Build plan (once mechanism picked):** generate a unique referral code per member (on-demand when they open the page); `/account/refer` page (code/link + how-it-works + # referred + bonus earned); referral tracking table; extend the sync to detect a qualifying referred order (>$300 CSA) → issue $25 flex store credit to referrer + friend (idempotent, recorded in flex_transactions). All credits via Shopify Store Credit (consistent with [[csa-flex-store-credit]]). Reuse the sync's idempotency ([[csa-shopify-sync]]). Shopify theme change needs approval per CLAUDE.md external-site rule.
