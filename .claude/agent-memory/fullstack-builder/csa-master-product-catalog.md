---
name: csa-master-product-catalog
description: /admin/products master catalog screen — product_library identity + photo + standing wholesale listing; the upsert-by-library_id pattern and the reverse-embed.
metadata:
  type: project
---

`/admin/products` (page `src/pages/admin/products/index.astro` + APIs `api/admin/products/save.ts` & `image.ts`) is the SINGLE place to manage a product's IDENTITY (name/category/unit/description) + canonical PHOTO + STANDING wholesale listing. Built 2026-06-22.

**Why:** `product_library` is the single source of truth (see [[csa-product-library-single-source]]); this screen was the missing master editor. Flex/box stay WEEKLY in their own editors — this screen is master + standing wholesale only (no weekly management, no Cmd-K).

**How to apply:**
- `product_library` has NO `unit` column — unit lives on the channel listings. The edit form seeds `unit` from the linked `wholesale_products` row (active first, else any, else 'each') via `unitFor()`; on save the unit is persisted onto the wholesale listing.
- `product_library.name` is UNIQUE (migration 0045) → save.ts catches PG `23505` → `?error=duplicate_name`.
- `wholesale_products.library_id` has NO unique constraint → can't use PostgREST on-conflict upsert. save.ts does read-by-library_id → update-or-insert manually. List-off = `is_active=false` (NEVER delete; keeps sort_order/compare_at/history).
- Reverse embed in the page: `wholesale_products:wholesale_products!library_id ( ... )` — column-name FK hint, returns an ARRAY (≤1 in practice). Page reads via cookie-aware admin client so `products_staff` (FOR ALL) shows INACTIVE rows too — needed to seed the edit form after de-listing.
- Photo: `image.ts` uploads to PUBLIC `flex-images` bucket at `library/<slug>-<6hex>.jpg` (slug from the DB-read name, NOT client input → no path traversal; randomBytes(3).toString('hex') = 6 hex). Storage upload uses `supabaseAdmin` (service role), but the `product_library.photo_url` WRITE uses the cookie-aware client (lib_staff) — defense in depth. Sets photo_url directly (propagates everywhere library-first), so no separate form save.
- Nav: added `{ href:'/admin/products', label:'Products', icon:'📦' }` to AdminShell navItems (2nd, after Home).
- Page is at `src/pages/admin/products/index.astro` → 3 levels deep → imports use `../../../components` / `../../../lib` (flex-inventory.astro is 2 levels → `../../`; easy to get wrong).

Pre-existing unrelated `astro check` error in `src/lib/cycle.ts:674` (vacation move/donate types) was in the working tree before this work — not mine.
