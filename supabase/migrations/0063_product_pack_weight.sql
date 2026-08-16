-- Migration 0063 — product_library.pack_weight_lb (editable per-product pack weight)
--
-- Portioned CSA/market items (salad mixes, "Big Bagz") are HARVESTED BY WEIGHT,
-- not by clamshell/bag count. The crew weighs greens into total pounds, then
-- portions them. The Pick & Pack harvest list (/admin/pick-pack/[week]) currently
-- only shows the packed-unit COUNT (e.g. "40 clamshells"), which tells the crew
-- how many containers to fill but NOT how many pounds of greens to actually pick.
--
-- `pack_weight_lb` is the pounds of product in ONE packed unit of a portioned
-- product (e.g. a 1/4 lb clamshell salad mix = 0.25; a 12 oz "Big Bag" = 0.75).
-- The harvest list multiplies the summed unit demand by this to show the total
-- POUNDS to harvest alongside the count (e.g. "40 clamshells · 10.0 lb").
--
-- STRICTLY ADDITIVE + NULLABLE:
--   - NULL (the default for every existing + future row) = no weight known →
--     the harvest list shows ONLY the count, exactly as before. Todd fills the
--     rest in from /admin/products.
--   - Rows whose unit is already lb/pound are NEVER converted by the harvest
--     list (that would double-count) — this column only applies to count/portion
--     units. That guard lives in the page, not the schema.
--
-- RLS: no policy change. product_library already has lib_staff (admin/staff
-- ALL) + lib_read (public SELECT) from migration 0045; this is just another
-- column on that already-governed table. Writes go through the same
-- requireAdmin + isSameOriginPost gate as the rest of the product editor.

ALTER TABLE public.product_library
  ADD COLUMN IF NOT EXISTS pack_weight_lb numeric;

COMMENT ON COLUMN public.product_library.pack_weight_lb IS
  'Pounds of product in ONE packed unit of a portioned item (migration 0063). '
  'e.g. a 1/4 lb clamshell salad mix = 0.25; a 12 oz Big Bag = 0.75. NULL '
  '(default) = unknown → the Pick & Pack harvest list shows only the packed-unit '
  'count. When set, the harvest list also shows total pounds = summed unit qty x '
  'pack_weight_lb, but NEVER for rows whose unit is already lb/pound (no '
  'double-counting). Editable at /admin/products.';
