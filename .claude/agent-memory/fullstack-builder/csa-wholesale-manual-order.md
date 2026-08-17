---
name: csa-wholesale-manual-order
description: Manual admin wholesale order entry — place_wholesale_order_admin RPC, the admin-price-trust distinction vs the public token RPC, edit/delete guards.
metadata:
  type: project
---

Manual wholesale order entry (create / edit / delete) at `/admin/wholesale/orders/new` + `/api/admin/wholesale/orders/{create,update,delete}.ts`, RPC in `supabase/migrations/0065_wholesale_admin_order.sql`.

**Why:** staff needed to key in a chef order phoned/texted/emailed, or add one past the Tuesday cutoff. The chef token portal, PDF import, and read-only orders view existed but there was no manual single-order path.

**How to apply / key facts:**
- `place_wholesale_order_admin` MIRRORS `place_wholesale_order` (0050) but with a deliberate PRICE-TRUST DIFFERENCE: the public token RPC NEVER trusts a client price (re-prices from catalog×tier); the ADMIN RPC USES a supplied `price_cents` VERBATIM because the caller is authenticated staff (legit one-off/off-catalog prices). No price_cents on a catalog line → server-prices it = product.price_cents × (1 − tier discount). Custom (product_id NULL) lines MUST supply product_name + price_cents.
- Edit path = same RPC with `p_order_id` (replaces that order's items); RAISEs on a 0-item edit so the single-statement txn rolls back and the order keeps its items. Create path with 0 items DELETEs the shell + returns soft jsonb error (mirrors 0050).
- EDIT scope CHANGED (0079_edit_any_wholesale_order.sql, 2026-07-06): ANY existing order is now editable (Todd wanted accuracy edits on chef_portal/harvie/market_wagon/email orders), not just `source='manual'`. 0079 relaxed the RPC edit guard (row must EXIST, else `not_editable`) AND — critically — the edit UPDATE no longer stamps `source='manual'`; it PRESERVES the row's existing source (provenance is never rewritten by an edit) + stamps `updated_at`. update.ts dropped its `source!=='manual'` pre-check and orders/new.astro dropped its edit-loader guard; the Edit control shows on every order in orders/index.astro. DELETE stays MANUAL-ONLY (delete.ts + the index UI) — chef/import orders are never deleted from this path. Safety: harvie auto-ingest uses onExisting='skip' (can't clobber an edit); a manual /import re-upload is a deliberate replace that WILL overwrite edits (documented). `wholesale_order_items.order_id` FK is ON DELETE CASCADE (0044).
- The new RPC is NOT in the hand-maintained `database.types.ts` Functions map (that file was out of scope) — the API routes type the `.rpc()` call via a small local cast, no `any`. See [[csa-portal-build-gotchas]] (manual database.types).
- Frontend price semantics: untouched catalog lines OMIT price_cents (server prices fresh); admin-edited, custom, and edit-loaded lines send price_cents as an override so an edit never silently re-prices.
- qty is integer (RPC floors to int, like 0050) — the form uses step=1.
- Migrations live at repo-root `supabase/migrations/`, NOT `apps/csa-portal/supabase/migrations`. Numbering can collide with untracked files from benched workstreams (0064 was taken → used 0065); check `ls` before naming.
