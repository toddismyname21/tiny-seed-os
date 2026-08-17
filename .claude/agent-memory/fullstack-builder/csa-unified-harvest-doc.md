---
name: csa-unified-harvest-doc
description: /admin/harvest/[week] is now a UNIFIED pack-day doc — box + flex + NEW wholesale + market sections, library-first photos across all.
metadata:
  type: project
---

`apps/csa-portal/src/pages/admin/harvest/[...slug].astro` is the printable pack-day harvest doc (Spec §4.5). Originally box pick list + flex à-la-carte; extended 2026-06-22 into a UNIFIED doc covering all channels. See [[csa-market-list-feature]], [[csa-chef-wholesale-ordering]], [[csa-ops-admin-phase1]].

**Why:** one printable sheet on pack day must cover everything the team harvests for — CSA boxes, flex add-ons, chef wholesale orders, AND the farmers-market stall.

**How to apply:**
- Day tabs unchanged: `dayTab` 'mon' serves Tue+Wed distributions, 'thu' serves Sat. `resolveCycle(supabase, week_starting)` is still the box/flex source. DO NOT touch box (`cycle.boxCompositionByMember`) or flex (`flex_orders`) aggregation logic — only photos were added to their rows.
- **Wholesale section:** `wholesale_orders` status='submitted', `delivery_date` in [week_starting, addDays(week_starting,6)], join `wholesale_order_items` (product_name, qty) → `wholesale_products` (unit, photo_url, library_id→product_library.photo_url). Aggregate by product_name+unit. Attributed to a tab by delivery DOW via `wholesaleTabFor()`: Fri(5)/Sat(6)→'thu', else→'mon' (Wed rides Monday tab). DOW computed from YMD as UTC (`dowOfYMD`, TZ-safe). Real ordered qty (unlike market).
- **Market section:** `market_offerings` where `week_starting = cycle Monday` AND `is_active=true`, join `product_library` (name, photo_url, category). NO computed harvest qty (it's the farmer's estimate) — lists product/unit/price only. Shown on both tabs (week-level). Empty-state links to `/admin/market`.
- **Photos (library-first everywhere):** flex row photo = `flex_inventory.library.photo_url ?? flex_inventory.photo_url ?? categoryEmoji`. Box row = best-effort `boxCropPhoto()` matching crop name (lowercased) against a `product_library` name→photo map (only photo_url-NOT-NULL rows); MOST box crops won't resolve (box_contents are plain strings) — that's expected, no thumb then. Wholesale/market also library-first. Thumb pattern: `h-10 w-10 ... overflow-hidden rounded-ts-md border border-ts-border bg-ts-bg-surface` + `<img object-cover>` or emoji span (mirrors admin/market thumb).
- Reads use `Astro.locals.supabase` (cookie client) — the page is admin/auth-guarded so it passes `is_admin_caller()` RLS on wholesale/market tables; product_library is public-read. (Same pattern the existing flex_orders read uses — NOT supabaseAdmin.)
- Helpers: `addDays` from lib/cycle; `formatCents`, `categoryEmoji` from lib/flex-order. Print `<style is:global>` block unchanged (Letter portrait, hides nav/buttons).

**Build gotcha (not mine):** `npx astro check` reports 1 pre-existing error in `src/lib/cycle.ts:674` (vacation_holds fallback PostgrestSingleResponse type mismatch) — present in the working tree before this task, does NOT block `astro build` (Vite/esbuild emits valid runtime JS). The harvest page itself is diagnostic-clean.
