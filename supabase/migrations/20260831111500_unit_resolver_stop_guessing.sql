-- 20260831111500_unit_resolver_stop_guessing.sql
--
-- Stop the unit resolver GUESSING from the text before an em dash.
--
-- ── WHY ──────────────────────────────────────────────────────────────────────
-- Migration 20260831083400 added wholesale_order_items.unit specifically so a
-- packer would never read a wrong unit again. Its resolver had three steps:
-- product_id, exact name, then "the text before the em dash". That third step
-- is the bug it was meant to prevent.
--
-- Institutional pack sizes are NOT the chef catalog's pack sizes. Center for
-- Hope buys basil BY THE BUNCH; the catalog sells basil BY THE POUND. So on
-- 2026-08-31 the resolver stamped, on real rows:
--
--   'Basil — bunch'                       -> 'lb'        WRONG
--   'Cherry Tomatoes — 12-count bagged'   -> 'lb'        WRONG
--   'Summer Squash — half bushel (~20 lb)'-> 'lb'        WRONG
--   'Cucumbers — half bushel (~20 lb)'    -> 'lb'        WRONG
--   'Salad Mix — case of 24 bags'         -> '1.75#'     WRONG
--   'Fennel — 1 count'                    -> '12 ct'     WRONG
--
-- A packer reading "120 lb basil" instead of "120 bunches basil" picks the
-- wrong thing, which is precisely the failure the column exists to stop. The
-- em-dash suffix is exactly where the operator wrote the REAL pack size, so
-- throwing it away and matching the prefix inverts the intent of the line.
--
-- ── FIX ──────────────────────────────────────────────────────────────────────
-- Resolve ONLY from product_id or an exact full-name match. Anything else
-- returns NULL and renders as no unit at all. A blank is honest; a confident
-- wrong unit is what got us here. Hand-keyed lines should carry an explicit
-- unit — the trigger already respects one when supplied.
--
-- Cleanup is scoped to orders with delivery_date < CURRENT_DATE so live and
-- future orders (including tomorrow's Center for Hope delivery, whose units
-- were corrected by hand) are left alone.
--
-- Idempotent.

BEGIN;

CREATE OR REPLACE FUNCTION public.resolve_wholesale_unit(
  p_product_id uuid,
  p_product_name text
) RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT unit FROM public.wholesale_products
   WHERE id = p_product_id AND unit IS NOT NULL
  UNION ALL
  SELECT unit FROM public.wholesale_products
   WHERE lower(btrim(name)) = lower(btrim(p_product_name)) AND unit IS NOT NULL
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.resolve_wholesale_unit(uuid, text) IS
  'Unit for an order line, from product_id or an EXACT name match only. '
  'Deliberately does NOT infer from a partial name: institutional pack sizes '
  'differ from catalog pack sizes (Center for Hope buys basil by the bunch, '
  'the catalog sells it by the pound). Returns NULL rather than guess.';

-- Clear units on PAST rows that could only have come from the removed guess.
UPDATE public.wholesale_order_items i
   SET unit = NULL
  FROM public.wholesale_orders o
 WHERE i.order_id = o.id
   AND o.delivery_date < CURRENT_DATE
   AND i.unit IS NOT NULL
   AND i.product_id IS NULL
   AND NOT EXISTS (
     SELECT 1 FROM public.wholesale_products p
      WHERE lower(btrim(p.name)) = lower(btrim(i.product_name))
   );

COMMIT;
