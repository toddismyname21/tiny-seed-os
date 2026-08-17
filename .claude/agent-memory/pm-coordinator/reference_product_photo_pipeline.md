---
name: product-photo-pipeline
description: How to get a product photo into the CSA/wholesale portal (where photos live, how to process + upload + link)
metadata:
  type: reference
---

How product photos flow into the portal (verified 2026-06-21).

**Where the existing photos came from:** the farm's own **Shopify product images**. A one-off batch on 2026-06-18 pulled ~11 into `flex-images/library/<slug>.jpg`. The 3 original wholesale ones (bibb, green sweet crisp, mini iceberg) were hand-uploaded via the admin board 2026-06-14. Most still-missing veg ALSO have Shopify images (Basil, Broccolini, Parsley, King Spring Mix, Little Gem, Edible Flowers) — a few don't (Curly Kale, Endive, Escarole, Green Oakleaf). Todd also sends real field photos from his phone (best source — authentic).

**Storage:** public bucket `flex-images`, path `library/<slug>-<6hex>.jpg`. Use a unique suffix so replacing a photo busts CDN/browser cache. Upload via storage REST: `POST {SUPABASE_URL}/storage/v1/object/flex-images/<path>` with `Authorization: Bearer <service key>`, `apikey`, `Content-Type: image/jpeg`, `x-upsert: true`. Public URL = `{SUPABASE_URL}/storage/v1/object/public/flex-images/<path>`.

**Linking (3 places):** the WHOLESALE chef catalog (`/order/[token]`) resolves photo as `product_library.photo_url (via library_id) → wholesale_products.photo_url → emoji`; the FLEX member catalog reads `flex_inventory.photo_url` (its own column). So set all three: `UPDATE product_library`, `UPDATE wholesale_products`, `UPDATE flex_inventory` WHERE name matches or library_id matches. Updating `product_library` alone covers wholesale (all active wholesale rows are linked via library_id).

**Image processing (REQUIRED):** iPhone photos arrive with EXIF Orientation=6 (sideways). Use `PIL ImageOps.exif_transpose()` to bake rotation into pixels, `convert('RGB')`, `thumbnail((1400,1400))`, save JPEG quality 85 → ~200-500KB. ALWAYS re-read a couple processed files to confirm they're upright before uploading — a sideways photo on the chef catalog is worse than an emoji.

**To pull from Shopify:** creds in `mcp-server/.env` (SHOPIFY_STORE_NAME, SHOPIFY_ACCESS_TOKEN); GraphQL `products(query:"title:*<veg>*"){images}`. Match the RIGHT product — fuzzy matches return seedling-tray photos (wrong) and multiple variants; eyeball before linking.

Related: [[project_flex_portal_state]].
