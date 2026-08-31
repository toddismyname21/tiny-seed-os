-- 20260831083400_wholesale_order_items_unit.sql
--
-- Give every wholesale order line its own UNIT, stamped at write time.
--
-- ── WHY ──────────────────────────────────────────────────────────────────────
-- `wholesale_order_items` records product_name, qty, unit_price_cents and
-- line_total_cents — but NOT the unit those numbers are in. The unit lived only
-- on `wholesale_products`, so any screen showing an order had to go re-derive it.
--
-- /admin/wholesale/orders didn't. It printed a hardcoded "ea", so Mediterra's
-- 15 POUNDS of Asian eggplant rendered as "15× Asian Eggplant  $4.25 ea". Todd,
-- 2026-08-31: "this can lead to confusion for sure." It is worse than a missing
-- unit — it is a confident wrong one. A packer reading that pulls 15 eggplants
-- instead of 15 pounds, and the chef gets a fraction of the order.
--
-- Reading the unit off the live catalog at render time is not a fix either:
--   • 260 of 527 existing line items have a NULL product_id, so half of them
--     can only be matched by name — which fails on hand-keyed names like
--     "Slicing Tomatoes — first 50 lb @ $3.75".
--   • The catalog is MUTABLE. Change a product from lb to case next season and
--     every historical order silently re-renders in the new unit. An invoice
--     must say what was actually sold, which is exactly why the table already
--     stores unit_price_cents instead of looking up today's price.
--
-- ── WHY A TRIGGER AND NOT APPLICATION CODE ───────────────────────────────────
-- Order lines are written from at least five places: the chef portal
-- (place_wholesale_order), the admin editor (place_wholesale_order_admin), the
-- standing-order cron (generate_standing_orders), the Market Wagon / Harvie
-- importer (lib/wholesale-import-commit.ts), and ad-hoc operator scripts. Three
-- of those are PL/pgSQL functions, not TypeScript. Patching the TS paths would
-- have covered the minority of inserts and left the RPCs — which write most
-- rows — still blank, producing a column that is populated just often enough to
-- be trusted and not often enough to be right.
--
-- A BEFORE trigger is the only place every writer passes through.
--
-- ── DESIGN ───────────────────────────────────────────────────────────────────
-- Conservative, same shape as the portal_settings updated_at trigger:
--   • Only fills the unit when the caller did NOT supply one. An explicit unit
--     always wins, so a one-off line ("half bushel" of something normally sold
--     by the pound) can be recorded truthfully.
--   • Resolves product_id first, then exact name, then the text before an em
--     dash (hand-keyed tier lines).
--   • Leaves NULL when nothing resolves. A blank renders as no unit; inventing
--     "ea" is what caused this.
--
-- Backfill uses the same precedence and is one-time. Rows that cannot be
-- resolved stay NULL rather than being guessed.
--
-- Idempotent: ADD COLUMN IF NOT EXISTS, CREATE OR REPLACE, DROP TRIGGER IF EXISTS.

BEGIN;

ALTER TABLE public.wholesale_order_items
  ADD COLUMN IF NOT EXISTS unit text;

COMMENT ON COLUMN public.wholesale_order_items.unit IS
  'Unit this line was SOLD in (lb, half bushel, 12 ct, ...), frozen at write '
  'time. Stamped by trg_wholesale_order_items_unit when not supplied. Never '
  'read the unit from wholesale_products for an existing order — the catalog '
  'changes, the invoice must not.';

-- ── resolver ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.resolve_wholesale_unit(
  p_product_id uuid,
  p_product_name text
) RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT unit FROM public.wholesale_products WHERE id = p_product_id AND unit IS NOT NULL
  UNION ALL
  SELECT unit FROM public.wholesale_products
   WHERE lower(btrim(name)) = lower(btrim(p_product_name)) AND unit IS NOT NULL
  UNION ALL
  -- hand-keyed lines: "Slicing Tomatoes — first 50 lb @ $3.75" -> "Slicing Tomatoes"
  SELECT unit FROM public.wholesale_products
   WHERE lower(btrim(name)) = lower(btrim(split_part(p_product_name, '—', 1)))
     AND unit IS NOT NULL
  LIMIT 1;
$$;

-- ── trigger ─────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_wholesale_order_item_unit()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- An explicitly supplied unit always wins.
  IF NEW.unit IS NULL OR btrim(NEW.unit) = '' THEN
    NEW.unit := public.resolve_wholesale_unit(NEW.product_id, NEW.product_name);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_wholesale_order_items_unit ON public.wholesale_order_items;

CREATE TRIGGER trg_wholesale_order_items_unit
  BEFORE INSERT OR UPDATE OF product_id, product_name, unit
  ON public.wholesale_order_items
  FOR EACH ROW
  EXECUTE FUNCTION public.set_wholesale_order_item_unit();

-- ── backfill (one time) ─────────────────────────────────────────────────────
UPDATE public.wholesale_order_items i
   SET unit = public.resolve_wholesale_unit(i.product_id, i.product_name)
 WHERE i.unit IS NULL;

COMMIT;
