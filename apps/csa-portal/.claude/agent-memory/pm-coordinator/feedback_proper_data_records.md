---
name: feedback-proper-data-records
description: Todd wants real domain records, not degenerate placeholder/"carrier" rows justified as hacks
metadata:
  type: feedback
---

When data is missing (e.g. an order line with a null `product_id` so no unit can join), model the fix as a **real, complete domain record** — not a degenerate stub created "just to hold a field."

**Why:** I created a `wholesale_products` row whose only stated purpose was to carry a unit string ("1.75#") and described it as a "hidden unit carrier." Todd pushed back: *"Why would you create a product that just has the unit. That does not make any sense."* A product is a product — it should be a proper product (name, category, price, unit, description), just set `is_active=false` if it shouldn't be orderable.

**How to apply:** When backfilling/linking, fill in the record as the legitimate entity it represents and use visibility/status flags (`is_active`, etc.) to control exposure. Don't invent stub rows with hacky rationale, and don't frame records to the user as workarounds — describe them as what they are. The product record was actually fine here; the nonsense was my framing/justification.
