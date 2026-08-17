---
name: pack-weight-lb
description: product_library.pack_weight_lb drives total-pounds on the Pick & Pack harvest list; library lookup MUST be exact-name-first
metadata:
  type: project
---

`product_library.pack_weight_lb` (numeric, nullable — migration 0063) is the
pounds of product in ONE packed unit of a portioned item (¼ lb clamshell salad
mix = 0.25; 12 oz "Big Bag" = 0.75). The Pick & Pack harvest list
(`src/pages/admin/pick-pack/[...slug].astro`) multiplies summed packed-unit
demand × pack_weight_lb to show total POUNDS alongside the unit count
("40 clamshells · 10.0 lb"). Editable at `/admin/products` (add + inline edit;
save endpoint `src/pages/api/admin/products/save.ts`).

**Why:** the crew harvests portioned greens by WEIGHT, not container count — the
count alone told them how many clamshells to fill but not how many pounds to pick.

**How to apply:**
- The pick-pack page's `libLookup()` keys the library by BOTH exact-lowercase
  name AND `normCrop()` key, and MUST check exact FIRST. `normCrop()` strips
  parentheticals, so `normCrop("Something Fresh (Big Bagz)")` == `"something
  fresh"` — a COLLISION with the plain "Something Fresh". Exact-first is what
  makes the Big Bagz (0.75) resolve correctly instead of falling back to the
  plain mix's 0.25. If you ever "simplify" that lookup to norm-only, Big Bagz
  will silently harvest at the wrong weight.
- NEVER convert a row whose unit is already lb/pound/# — `packLb()` guards this
  (`WEIGHT_UNIT_RE`) so weight-based wholesale lines don't double-count.
- Seeded 0.25: Arugula, King Spring Mix, Something Fresh, Fancy Pants, Petite
  Kale Mix, Spinach (all "Salad Mixes" clamshells). Seeded 0.75: the four
  "(Big Bagz)" variants. Everything else is NULL (count-only) until Todd fills it.

See [[migration-runner]].
