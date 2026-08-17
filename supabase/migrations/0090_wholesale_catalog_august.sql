-- 0090_wholesale_catalog_august.sql
--
-- Rebuild the wholesale catalog to match what is actually in the field in
-- August, and put the crops Todd needs to move at the top of the list.
--
-- ── WHY ──────────────────────────────────────────────────────────────────────
-- Measured 2026-08-17 against production, the chef-facing catalog had drifted
-- badly away from the farm:
--
--   • 21 products active, but 13 crops standing in the field had NO wholesale
--     price at all — every pepper, every eggplant, green beans, tomatillos,
--     celery, carrots, new potatoes. Chefs literally could not order them.
--   • Meanwhile Cucumbers and Fennel were ACTIVE for chefs while switched OFF
--     on the same week's field list — offering produce that cannot ship.
--   • Cabbage occupied four separate SKUs (Green $2.28, Conical $2.75, Savoy
--     $3.00, plus a 25 lb bulk box) for what Todd sells as one thing.
--   • sort_order was unusable: duplicate values (five products at 0), large
--     gaps, and no relationship to season. Both the chef order page and the
--     availability email sort ONLY by sort_order, so the list a chef sees was
--     effectively random.
--
-- Trigger: 450 lb of slicing tomatoes and 100 lb of cherry tomatoes to move,
-- against 150 lb committed. Tomatoes and peppers therefore sort first.
--
-- ── PRICES ───────────────────────────────────────────────────────────────────
-- All set by Todd 2026-08-17. Where a price already existed in the wild it is
-- reconciled to the real one:
--   Cherry Tomatoes  $5.00 → $4.75/lb  (what Allegro + Cafe Verde actually pay)
--   Shishito         $5.50 → $6.00/lb  (was inactive; reactivated)
--   Seconds Tomatoes       → $1.65/lb  (existed only as a hand-typed line on
--                                       Mediterra's order; now a real SKU)
--   Green Beans            → $3.00/lb  (matches the Harvie rate) + $30/half bu
--
-- ── DESIGN ───────────────────────────────────────────────────────────────────
-- Retired products are DEACTIVATED, never deleted. wholesale_order_items snapshots
-- product_name and unit_price_cents per line, so history is safe either way, but
-- keeping the rows preserves the product_id foreign key on past orders and lets a
-- crop come back next season without re-creating it.
--
-- Cabbage: the four old SKUs are deactivated and ONE new "Cabbage" @ $2.25/lb is
-- inserted, rather than renaming an existing row, so no past order silently
-- appears to have been placed against a different product than it was.
--
-- sort_order is reassigned across the whole active set in blocks of ten by
-- family, leaving room to insert without another renumber.
--
-- Idempotent: safe to re-run.

BEGIN;

-- ── 1. Retire what is not in the field (or is being consolidated) ───────────
UPDATE wholesale_products
SET is_active = FALSE
WHERE name IN (
  'Swiss Chard',                    -- held back for CSA
  'Radicchio',
  'Cucumbers',                      -- off the field list this week
  'Slicing Cucumbers — 20 lb Box',
  'Fennel',                         -- off the field list this week
  'Conical Cabbage',                -- \
  'Green Cabbage',                  --  | consolidated into one per-lb Cabbage
  'Savoy Cabbage',                  --  |
  'Cabbage — 25 lb Bulk Box'        -- /
);

-- ── 2. Reprice + reactivate existing rows ──────────────────────────────────
UPDATE wholesale_products
SET price_cents = 475, is_active = TRUE, sort_order = 11
WHERE name = 'Cherry Tomatoes';

UPDATE wholesale_products
SET price_cents = 375, is_active = TRUE, sort_order = 10
WHERE name = 'Slicing Tomatoes';

UPDATE wholesale_products
SET price_cents = 600, is_active = TRUE, sort_order = 20, category = 'Peppers', unit = 'lb'
WHERE name = 'Shishito Peppers';

-- ── 3. New SKUs ────────────────────────────────────────────────────────────
INSERT INTO wholesale_products (name, category, unit, price_cents, is_active, sort_order)
SELECT v.name, v.category, v.unit, v.price_cents, TRUE, v.sort_order
FROM (VALUES
    ('Seconds Tomatoes',          'Tomatoes', 'lb',          165, 12),
    ('Jimmy Nardello Peppers',    'Peppers',  'lb',          550, 21),
    ('Carmen / Corno di Toro Peppers','Peppers','lb',        425, 22),
    ('Cherry Bomb Peppers',       'Peppers',  'lb',          550, 23),
    ('Jalapeño Peppers',          'Peppers',  'lb',          550, 24),
    ('Green Bell Peppers',        'Peppers',  'lb',          300, 25),
    ('Fairy Tale Eggplant',       'Eggplant', 'lb',          500, 30),
    ('Asian Eggplant',            'Eggplant', 'lb',          425, 31),
    ('Italian Eggplant',          'Eggplant', 'lb',          350, 32),
    ('Green Beans',               'Veg',      'lb',          300, 40),
    ('Green Beans — Half Bushel', 'Veg',      'half bushel', 3000, 41),
    ('Cabbage',                   'Veg',      'lb',          225, 42)
) AS v(name, category, unit, price_cents, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM wholesale_products p WHERE p.name = v.name
);

-- Re-running should still correct price/status/placement on rows that exist.
UPDATE wholesale_products p
SET price_cents = v.price_cents,
    category    = v.category,
    unit        = v.unit,
    sort_order  = v.sort_order,
    is_active   = TRUE
FROM (VALUES
    ('Seconds Tomatoes',          'Tomatoes', 'lb',          165, 12),
    ('Jimmy Nardello Peppers',    'Peppers',  'lb',          550, 21),
    ('Carmen / Corno di Toro Peppers','Peppers','lb',        425, 22),
    ('Cherry Bomb Peppers',       'Peppers',  'lb',          550, 23),
    ('Jalapeño Peppers',          'Peppers',  'lb',          550, 24),
    ('Green Bell Peppers',        'Peppers',  'lb',          300, 25),
    ('Fairy Tale Eggplant',       'Eggplant', 'lb',          500, 30),
    ('Asian Eggplant',            'Eggplant', 'lb',          425, 31),
    ('Italian Eggplant',          'Eggplant', 'lb',          350, 32),
    ('Green Beans',               'Veg',      'lb',          300, 40),
    ('Green Beans — Half Bushel', 'Veg',      'half bushel', 3000, 41),
    ('Cabbage',                   'Veg',      'lb',          225, 42)
) AS v(name, category, unit, price_cents, sort_order)
WHERE p.name = v.name;

-- ── 4. Renumber the survivors so the list reads in season order ─────────────
UPDATE wholesale_products SET sort_order = 50 WHERE name = 'Summer Squash Medley';
UPDATE wholesale_products SET sort_order = 51 WHERE name = 'Summer Squash — 20 lb Box';
UPDATE wholesale_products SET sort_order = 70 WHERE name = 'Ruby Kale';
UPDATE wholesale_products SET sort_order = 71 WHERE name = 'Lacinato Kale';
UPDATE wholesale_products SET sort_order = 72 WHERE name = 'Curly Kale';
UPDATE wholesale_products SET sort_order = 80 WHERE name = 'King Spring Mix (per lb)';
UPDATE wholesale_products SET sort_order = 81 WHERE name = 'King Spring Mix';
UPDATE wholesale_products SET sort_order = 90 WHERE name = 'Basil';
UPDATE wholesale_products SET sort_order = 91 WHERE name = 'Parsley';
UPDATE wholesale_products SET sort_order = 92 WHERE name = 'Rosemary';

COMMIT;
