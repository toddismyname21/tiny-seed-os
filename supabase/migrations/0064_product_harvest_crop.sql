-- Migration 0064 — product_library.harvest_crop (combine package variants into one harvest line)
--
-- The crew HARVESTS raw greens by weight; the clamshell-vs-"Big Bagz" packaging
-- split is a downstream PACK decision. On the Pick & Pack harvest list
-- (/admin/pick-pack/[week]) a crop like "King Spring Mix" and its bagged variant
-- "King Spring (Big Bagz)" today print as TWO separate lines, so the harvester
-- weighs the same green twice and can miss the combined total. They must appear
-- as ONE harvest line = the summed pounds across every packaging variant.
--
-- `harvest_crop` is the shared harvest-line NAME that ties packaging variants of
-- the SAME raw crop together. Products that share a non-null `harvest_crop` are
-- rendered as one combined harvest row (harvest_crop name + total pounds =
-- sum over variants of qty x pack_weight_lb), with the per-package breakdown
-- shown underneath so the pack team can still portion.
--
-- STRICTLY ADDITIVE + NULLABLE:
--   - NULL (the default for every existing + future row) = the product harvests
--     as its own standalone line, exactly as before. Only products the farm
--     explicitly groups (via /admin/products) get a shared harvest_crop.
--   - This column does NOT change any demand math — it only affects how the
--     harvest DISPLAY groups rows. pack_weight_lb (migration 0063) still drives
--     the pounds figure.
--
-- RLS: no policy change. product_library already has lib_staff (admin/staff ALL)
-- + lib_read (public SELECT) from migration 0045; this is just another column on
-- that already-governed table. Writes go through the same requireAdmin +
-- isSameOriginPost gate as the rest of the product editor.

ALTER TABLE public.product_library
  ADD COLUMN IF NOT EXISTS harvest_crop text;

COMMENT ON COLUMN public.product_library.harvest_crop IS
  'Shared harvest-line name that groups packaging variants of the SAME raw crop '
  '(migration 0064). e.g. "King Spring Mix" and "King Spring (Big Bagz)" both set '
  'harvest_crop = "King Spring Mix" so the Pick & Pack harvest list combines them '
  'into ONE line = total pounds (sum of qty x pack_weight_lb across variants), '
  'with the per-package breakdown underneath. NULL (default) = the product '
  'harvests as its own standalone line. Editable at /admin/products.';
