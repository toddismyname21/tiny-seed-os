---
name: flex-portal-state
description: CSA Farm Flex portal go-live state — it's fully built/live, the "ghost catalog" toggle model, and the one real gap (no product photos in the system).
metadata:
  type: project
---

**Farm Flex is fully built and LIVE — it is NOT "build from scratch"** (Todd feared it was empty 2026-06-18). The whole system exists: admin inventory CRUD (`/admin/flex-inventory`), member ordering (`/account/flex-order`) with order windows (opens prior Thursday, closes Tuesday 8AM, pickup-day-aware cutoffs), prepaid store-credit balance, and orders flowing.

**Why it looked empty:** the admin flex page defaults to the UPCOMING week, which is empty until populated. Select the current week to see items. Flex items are per-week rows in `flex_inventory` (keyed by `week_starting`).

**Ghost-catalog model (built 2026-06-18, Todd's design):** every possible item lives in the week's list; `is_active=false` = "ghost" (greyed `opacity-50 grayscale` + dashed border, visible to admin only). One-click **Turn ON / Turn OFF** toggle per item (endpoint `/api/admin/flex-inventory/toggle`, mirrors delete.ts). Flip ON the moment you have the item — no rebuilding weekly. Populating a new week: I copy the prior week's rows forward via SQL (no UI "copy week" button yet — that's a still-wanted feature).

**PHOTOS — partially solved 2026-06-18.** No auto-source exists (flex 0 / library 3 / Shopify produce 0). The only source = Todd's own uploads. From the 19 he uploaded 2026-06-16, I attached **11 confident produce photos** (Bok Choy, Beets, Fennel, Swiss Chard, Dandelion Greens, Fava Beans, Nasturtiums, Red Romaine, Romaine, Sweet Oakleaf, Red & Green Butter Duo) to `flex_inventory` (all weeks) AND `product_library` by exact name. **Convention:** resize w/ `sips -Z 1400`, upload to PUBLIC bucket `flex-images` at path `library/<slug>.jpg` (service role), set photo_url = `{SUPABASE_URL}/storage/v1/object/public/flex-images/library/<slug>.jpg`. 3 uploads were non-produce (cat, worker, busy shot) — excluded. **5 STILL UNATTACHED** — green/red lettuce heads I couldn't pin to a variety (uploads IMG_0229/0230/0233/0237 green, IMG_0239 red); awaiting Todd's variety ID. All other ~30 catalog items still need photos (no source).

**How members order:** cart pre-fills with their base CSA share; they add extras against their flex balance. So `flex_inventory` legitimately contains "Small CSA Share"/"Family CSA Share" rows (the base, not à-la-carte produce) — don't delete those.

**How to verify member-side:** `apps/csa-portal/scripts/member_fetch.py <email> <path>` (magic-link session). Related: [[csa-flex-ordering-build]], [[csa-flex-store-credit]], [[member-page-verification]].
