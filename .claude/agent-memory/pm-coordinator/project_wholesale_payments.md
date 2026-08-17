---
name: wholesale-payments
description: Lowest-fee options for getting wholesale restaurant invoices paid — research conclusion + recommendation (decision pending)
metadata:
  type: project
---

Todd wants the lowest-fee way to get paid on WHOLESALE invoices (~46 restaurants, ~$30–300/order, weekly). Deep research 2026-06-24 (sourced).

**Recommendation: Stripe Invoicing** (runner-up: Melio).

**Why:** For B2B restaurant wholesale, **ACH beats cards by ~3x** — always default the pay link to ACH.
- Stripe: card 2.9%+30¢; **ACH 0.8% cap $5**; +0.4% invoice fee cap $2; $0/mo; first-class API + official Supabase integration → can auto-create an invoice per order from our portal and email a pay link. ~$2–3 total on a typical ACH invoice.
- QuickBooks Payments: ACH 1% cap $10; native QBO books sync; QBO REST API (OAuth2) is more integration effort.
- Melio: **ACH receiving $0**, syncs to QBO, but NO API to auto-create — one manual step per order.
- **Do NOT use Shopify** for wholesale invoicing (tool mismatch, per-order friction, no ACH discount).

**Industry standard:** email invoice on delivery day, Net 7–14, ACH "pay now" link (checks still common with older chefs); restaurants rarely pay vendor invoices by card.

**Why it matters / How to apply:** when building wholesale invoicing, default to ACH and integrate Stripe Invoicing from the order data in Supabase. **Decision still pending Todd's pick.** Full sourced comparison was delivered in chat 2026-06-24. Related: [[csa-flex-store-credit]] (CSA/retail payments stay in Shopify — different from wholesale).
