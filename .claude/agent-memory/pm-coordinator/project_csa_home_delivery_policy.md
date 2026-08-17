---
name: csa-home-delivery-policy
description: CSA home delivery is a $15/week, admin-approved paid add-on kept in Shopify — members must NOT be able to self-select it for free; note-only requests are unpaid.
metadata:
  type: project
---

**Home delivery = $15/week, approval-gated, paid in Shopify** (Todd 2026-05-24).

- A member who wrote "home delivery" in their **order note did NOT pay for it** — those are unpaid requests, not arrangements. Do NOT apply delivery addresses from order notes. They must *choose + pay* via the portal, and only **if we approve it**.
- The ~12 existing home-delivery members who bought the "2026 Home Delivery Options" Shopify product ($270–$990 = full-season fee, i.e. $15/wk × season) are the legit paid ones — don't break them.

**Gap found 2026-05-24 (fix queued):** `/account/pickup` currently lets ANY member switch to home delivery for FREE — `change_pickup_location` just sets `delivery_address` with no charge/approval. That contradicts the $15/wk+approval policy. The fix: members can only self-select a pickup *location*; home delivery becomes a **request → Todd approves → $15/wk charged in Shopify** (keep all payment in Shopify, no Stripe — consistent with [[csa-flex-store-credit]]). Also update `PickupNudgeBanner` copy so it doesn't offer free delivery self-select.

**Why:** unpaid free delivery is a revenue leak right before the June 10 launch.
**How to apply:** when touching the pickup/delivery flow or the nudge banner, enforce delivery = paid + approved; never auto-grant delivery from notes or member self-select. Related: [[csa-locations]] (home delivery $15/wk listed), [[csa-migration-data-gaps]].
