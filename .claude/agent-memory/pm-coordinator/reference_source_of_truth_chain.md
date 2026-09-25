---
name: source-of-truth-chain
description: Look it up, don't ask Todd. Portal → Shopify for orders → QuickBooks or flex usage for billing. Where every common member/order question is actually answered.
metadata:
  type: reference
---

# Answer it from the system. Don't ask Todd.

Todd, 2026-09-15, after I handed him a list of "open issues" that were all
answerable from the portal:

> "A lot of the things you ask me about seem like they should be accessible in
> the portal. Please confirm that this is the case, and in the future do the work
> to answer the questions. We should be working from a source of truth and the
> amount of problems we are having resolving issues has increased recently."

> "check the portal, and if you have order questions you can check shopify. If you
> need to know if they were invoiced for tomatoes check quickbooks, or see if they
> used flex funds."

**He is right. Every question I asked that day was already answered in the data.**
Asking him is slower AND less reliable than reading it.

## The chain, in order

1. **Portal (Supabase)** — members, shares, add-ons, cadence/parity, pickup
   location, vacation holds, flex orders, wholesale orders and line items.
2. **Shopify** — the original order, what they actually bought, and
   **store credit = the flex balance** (`storeCreditAccounts`). Not in Supabase.
3. **QuickBooks** — whether something was invoiced and whether it was paid.
   Never infer this from `invoiced_at`; see [[albertas-collection]] for the
   37%-populated trap.
4. **Flex usage** — `flex_orders.status='locked'` means it was taken from flex
   funds and is settled. That alone answers "did they get it / pay for it."

## Worked examples from 2026-09-15

| Question | Answered by | Answer |
|---|---|---|
| Did Alan Dum's 50 lb happen? | `flex_orders` | 5 flats, $100, **status `locked`** on week 2026-09-07. Done. |
| Is Cory Cope owed cheese weekly? | `members` | Yes — add-on row `2026 Local Cheese CSA Add-On - Weekly (Goat Rodeo)`, active, weekly, plus separate bread and mushroom add-ons and a large veg box. |
| Is CJ Gonzalez on this week? | `members` + `weekParity` | biweekly **Week A**; 2026-09-14 is parity 0 = Week A → **yes**. Remaining 2: Sep 16, Sep 30. |
| Does Joe Zierer's phone need updating? | `customers.phone` | Already `8142434373`. Nothing to do. |
| Should Vrbanic be billed by flex? | Shopify store credit | **$0.00** — so no. She needs a QuickBooks invoice, matching what Todd told her. |

## The rule

Before asking Todd anything about a member, an order, or money: **query it.** Ask
only when the answer genuinely is not recorded anywhere — e.g. "is this actually
in the field," which has no table (see `.claude/rules/no-guessing.md`).

## Related
- [[flex-weekly-cadence]] — rostering, cutoffs, who gets the flex list
- [[evidence-sources]] — Gmail/Messages/court/PA Code access patterns
