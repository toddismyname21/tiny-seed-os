---
name: csa-chef-wholesale-ordering
description: Zero-barrier chef wholesale ordering — token-keyed public /order/<token>, legacy wholesale_orders reshaped, place_wholesale_order RPC, server-side pricing.
metadata:
  type: project
---

Chef WHOLESALE ordering in `apps/csa-portal` (built 2026-06-14, migration 0050). Public, NO login — `wholesale_accounts.order_token` IS the access; chefs bookmark `/order/<token>`. See [[csa-portal-build-gotchas]], [[csa-flex-feature]].

**The legacy `wholesale_orders` table was the hard part — it was customer-keyed + admin-only, NOT built for token chef orders.** Migration 0050 reshaped it:
- Added `account_id uuid` FK → `wholesale_accounts(id)` and `source text` ('chef_portal').
- Relaxed `customer_id` to NULLABLE — chef `wholesale_accounts` rows have `customer_id = NULL` + `email = NULL` (verified live: all 9 accounts). So a token order links via `account_id`, not customer.
- Status CHECK was `draft|confirmed|packed|delivered|cancelled` — added `'submitted'` (the chef-placed status).
- `wholesale_orders` has NO `total_cents` — it stores `total_amount numeric` (DOLLARS) + `total_lbs`. The RPC writes `total_amount = round(total_cents/100,2)`; EXACT integer cents live only on `wholesale_order_items.unit_price_cents/line_total_cents` (the money source of truth).

**Access model = SECURITY DEFINER RPC `place_wholesale_order(p_token, p_lines jsonb, p_delivery_date date)`** (granted to anon+authenticated), mirroring `place_flex_order`. RLS on `wholesale_orders`/`_items` is admin-only, so a public submit can't INSERT directly — the RPC runs as definer but validates the token→account FIRST (the gate). It does the SERVER-SIDE price lookup from `wholesale_products` (active only) + applies `wholesale_pricing_tiers.discount_pct` (Standard=0%). Returns `{ok, order_id, total_cents, item_count, delivery_date, restaurant_name}` or `{error:<code>}` (invalid_token/empty/no_available_items). Skips now-inactive products silently; unwinds the order shell + returns `no_available_items` if nothing prices.

**Page reads use `supabaseAdmin` (service role), not the cookie client** — the page is anon and `wholesale_accounts` RLS is admin-only, so the token check IN CODE is the scoping gate. `wholesale_products` (`products_read`: is_active) + `product_library` (`lib_read`) are public-readable, but the page uses admin uniformly. Photo precedence: `product_library.photo_url` (via `wholesale_products.library_id`) → `wholesale_products.photo_url` → category emoji.

**Middleware:** `/order` + `/api/order` are in `PUBLIC_TOKEN_PREFIXES` with an EARLY fast pass-through (before any protected/onboarding/admin gate). They are deliberately NOT in PROTECTED_PREFIXES. Don't add them there or chefs get bounced to /login.

**Delivery/cutoff cadence (src/lib/wholesale-order.ts, pure):** delivery = NEXT Wednesday = `upcomingMondayET()+2d` (through Jul 1 2026 delivery is Wed). Edit cutoff label = "Sunday 8 PM" (the Sunday before delivery). The submit computes the delivery date SERVER-SIDE (never from client).

**Routing:** `src/pages/order/[token].astro` (order page) coexists with `src/pages/order/[token]/confirmed.astro` (post-submit "✅ Order in!" screen) — Astro allows a `[token].astro` file beside a `[token]/` dir. Confirmed page scopes the order to (token's account AND `?o=<order_id>`).

**Tier discount is wired but currently 0%:** the only tier is "Standard" (`discount_pct=0`), so list price = effective price today. `effectiveUnitCents(listCents, pct)` (page) mirrors the RPC's `round(price_cents*(1-pct/100))` so a future per-chef discount just works.
