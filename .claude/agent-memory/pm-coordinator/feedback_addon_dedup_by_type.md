---
name: addon-dedup-by-type
description: Any add-on dedup/cleanup must key by customer+TYPE+quantity, never by customer alone
metadata:
  type: feedback
---

Never dedup/collapse CSA add-on rows (`members` where `share_type='add_on'`) by **customer alone**. Key by **customer + add-on TYPE**, and respect **quantity** (a member can hold 2 of the same type).

**Why:** A one-off "DUPLICATE collapsed 2026-06-17" cleanup keyed by customer and kept a single "keeper" row per customer — silently inactivating every *distinct* paid add-on beyond the first. 16 members lost 23 paid add-ons (e.g. Christi Ptacek paid for bread+cheese+mushroom+coffee, kept only coffee). They were dropped from pack sheets and shorted in real boxes. Add-on type is stored only in the row's `notes` text (no dedicated column), so a naive "one row per customer" dedup looks reasonable but is catastrophic. Separately, Drew Gifford legitimately held 2× the *same* type (mushroom) — quantity matters too.

**How to apply:** Before any add-on cleanup, reconcile against Shopify as source of truth (`scripts/reconcile_orders.py` pattern): a member should have one active row per *distinct* paid add-on type, times the purchased quantity. Genuine "webhook double-fire" exact-duplicate rows (same type, flagged in notes) are the ONLY legit collapse target. Pack sheets now render duplicates as `Type ×N` ([[project-route-tab-builder-bug]] sibling work in stop-manifest/pack-check/labels). Related: [[project-csa-migration-data-gaps]] (Shopify = truth).
