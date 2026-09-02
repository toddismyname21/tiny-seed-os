## Security Audit Findings — CSA Portal (csa.tinyseedfarm.com)

Read-only audit of `/Users/toddsmacbookpro2026/Documents/TIny_Seed_OS/apps/csa-portal` and `/Users/toddsmacbookpro2026/Documents/TIny_Seed_OS/supabase/migrations`. No code was modified. Headline result: **admin gating, cron auth, and secret handling are all clean**, but I found a **critical, currently-exploitable price/inventory bypass on Farm Flex ordering** that lets any logged-in member get real product for free by talking to the Supabase REST API directly instead of the app's UI.

### CRITICAL — `flex_orders` direct-write RLS policies bypass every server-side check
**File:** `supabase/migrations/0031_csa_operations.sql:374-395` (policies `flex_orders_member_insert`, `flex_orders_member_update`)

The farm built a correct, careful atomic RPC (`place_flex_order`, migration 0037) that enforces the oversell guard, the balance cap, and price consistency. But the table also carries these RLS policies, which let any authenticated member write `flex_orders` **directly**, bypassing the RPC entirely:
```sql
CREATE POLICY flex_orders_member_insert ON flex_orders FOR INSERT TO authenticated
  WITH CHECK (member_id IN (SELECT id FROM members WHERE customer_id = current_customer_id()));
CREATE POLICY flex_orders_member_update ON flex_orders FOR UPDATE TO authenticated
  USING (...) WITH CHECK (...);  -- same ownership-only check
```
The table's own CHECK constraints only require `qty > 0`, `unit_price_cents >= 0`, `total_cents >= 0`, and `status` in an enum (`0031_csa_operations.sql:118-131`). There is no constraint tying `total_cents` to `unit_price_cents * qty`, none tying price to `flex_inventory.price_cents`, no stock decrement, and no restriction on setting `status` straight to `'fulfilled'`. I confirmed via `grep` that the only trigger on this table is an audit-log trigger (`trg_audit_flex_orders`) — it records the change, it doesn't block it.

**Exploit:** any member, using their own session JWT and the public Supabase anon key (both already in the browser), can `POST /rest/v1/flex_orders` with `unit_price_cents: 0, total_cents: 0, qty: 50, status: "fulfilled"` for any `flex_item_id`, including inactive/sold-out ones (the policy checks ownership of `member_id` only, never item availability). Per the migration comments, `pending`/`locked`/`fulfilled` flex orders all feed labels, pack sheets, and the manifest — so this isn't cosmetic, it results in real product being packed and handed over with **zero debit to the member's Shopify store credit**, because the debit logic lives only in the API route (`src/pages/api/account/flex-order/submit.ts:204-239`), not in a DB trigger or the RPC itself.

**Fix:** drop the member INSERT/UPDATE policies on `flex_orders` (mirror how `wholesale_orders`/`wholesale_order_items` are handled — staff/admin-only RLS, member writes only through a vetted RPC). Add a trigger enforcing `total_cents = unit_price_cents * qty` and that `unit_price_cents` matches `flex_inventory.price_cents` at the time of write, as defense in depth even after the RLS policy is fixed.

### CRITICAL — `place_flex_order` RPC: caller-supplied balance + debit lives outside the transaction
**Files:** `supabase/migrations/0037_place_flex_order.sql`, `20260901112500_flex_order_credit_members.sql`, `src/pages/api/account/flex-order/submit.ts:144-171`

The RPC is `GRANT EXECUTE ... TO authenticated` (directly callable via `/rest/v1/rpc/place_flex_order`), and the "over-balance cap" check (`v_total_cents > p_balance_cents`) trusts the `p_balance_cents` parameter with no independent lookup inside the function. The team lead's ticket flagged this as a "known" issue; I traced the actual blast radius and it's worse than a cap bypass: the **debit to Shopify store credit only happens in `submit.ts`, after a successful RPC call** — it is not part of the atomic transaction and has no DB-side equivalent. A direct RPC call (bypassing `submit.ts`) places a real, stock-decrementing `'pending'` order and **no debit ever occurs**, regardless of what `p_balance_cents` is set to. Combined with finding #1, this table has two independent free-product paths, not one.

**Fix:** move balance resolution and the debit reservation inside the SECURITY DEFINER function (e.g. from a synced `customers.flex_balance_cents` column reconciled by a trusted job) so placing an order and reserving/debiting the balance are one transaction, not two round trips split across trust boundaries.

### HIGH — `box_swap_events` has the identical direct-write pattern
**File:** `supabase/migrations/0031_csa_operations.sql:412-433`

Same shape as finding #1: `box_swap_events_member_insert`/`_update` let a member INSERT/UPDATE rows for their own `member_id` with no validation of `credits_used`, no check that `swap_in_item`/`swap_out_item` are valid catalog choices, and no restriction on setting `status` directly to `'locked'`. No dollar amounts are involved (no cents columns on this table), so I'm rating it HIGH rather than CRITICAL, but it's the same architectural gap and should get the same fix (RPC-only writes) since it can be used to fabricate swap approvals packers will act on.

### MEDIUM — `unsubscribe_member_by_email` granted to `anon`, token check is bypassable
**Files:** `supabase/migrations/0026_recipes_and_email.sql:184-185`, `src/pages/unsubscribe.astro`

The app's `/unsubscribe` page verifies an HMAC token before calling this SECURITY DEFINER RPC via the service-role client. But the migration also does `GRANT EXECUTE ... TO anon, authenticated, service_role` — the service-role grant is the only one actually needed (service_role already bypasses grants). Because it's also granted to `anon`, any unauthenticated caller can `POST /rest/v1/rpc/unsubscribe_member_by_email` with `{"p_email": "<any member's email>"}` directly, with **no token check at all** — the code comment claiming "the token is verified server-side before this is called" is only true for traffic that goes through the page, not for direct RPC calls. Impact is low (reversible, no data read/exposure — the function returns only a row count) but it doesn't match the documented security model.

**Fix:** `REVOKE EXECUTE ... FROM anon, authenticated;` leaving only `service_role`.

### Confirmed clean (verified directly, not assumed)
- **Admin page gating** (`src/middleware.ts`): every `/admin/*` page routes through `resolveOpsRole`; role checks correctly distinguish `admin`/`staff` (full access) from the newer least-privilege `crew` role (page-allowlisted to handoff/cooler/pick-pack only). No admin page found unprotected.
- **Admin API routes**: every file under `src/pages/api/admin/**/*.ts` calls `requireAdmin`/`requireCrew`/`denyIfNotAdmin` except `campaigns/webhook.ts`, which is correctly public — it's a Resend delivery webhook gated by svix HMAC signature verification, and fails closed (returns 200 but applies nothing) when `RESEND_WEBHOOK_SECRET` is unset. No gap here.
- **Cron routes** (`src/pages/api/cron/*.ts`): all 10 routes require `Authorization: Bearer <CRON_SECRET>`; `invoice-reconcile.ts` additionally accepts an admin session for manual triggering, which is intentional.
- **Prior IDOR fixes hold up**: `schedule_vacation_hold`, `cancel_vacation_hold`, `change_pickup_location` (migration `0053_rpc_ownership_guards.sql`) all correctly re-assert `is_admin_caller() OR (member row belongs to current_customer_id())` inside the SECURITY DEFINER body — this closes the exact class of bug found in findings #1/#2 above, which makes those two findings more notable: the pattern was already understood and fixed for vacation/pickup RPCs but not applied consistently to `flex_orders`' RLS policies.
- **Household sharing** (`account_members`, migration `0023`): `current_customer_id()` vs `auth_primary_customer_id()` split is correctly used — invited household members get read access but only the primary can write membership.
- **Secrets**: no hardcoded keys/tokens found in `src`; `.env` is gitignored and was never committed (`git log --all --full-history -- .env` returns nothing); `astro.config.mjs` env schema correctly splits `context: 'client'/'server'` — `SUPABASE_SERVICE_ROLE_KEY` and all other secrets are `context: 'server', access: 'secret'`.
- **XSS**: no unescaped user data found flowing into `set:html`/`innerHTML` in a spot check of member-facing pages; the codebase shows an established `escapeHtml()` discipline (e.g. `src/pages/admin/route-plan/index.astro`) and several files have explicit comments confirming "no innerHTML built from user data."
- **`generate_standing_orders`**: correctly `REVOKE ALL ... FROM PUBLIC, anon, authenticated` — not reachable by any client, only by the cron/service-role path.
- **Wholesale ordering**: `wholesale_orders`/`wholesale_order_items`/`wholesale_accounts` are staff/admin-only RLS (`0044_wholesale_mvp.sql`); chef self-service goes through the token-gated `/order/<token>` page and `place_wholesale_order` RPC, not direct table writes — this is the pattern `flex_orders` should have followed and didn't.

### Priority
Fix the two CRITICAL `flex_orders`/`place_flex_order` findings before the next Farm Flex ordering window opens — this is a live, no-skill-required financial exploit reachable with a browser's dev console and a member's own already-valid session. The HIGH and MEDIUM findings can follow in the next migration batch.