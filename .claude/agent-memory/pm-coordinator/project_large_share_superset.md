---
name: large-share-superset-rule
description: Large veg share ALWAYS contains everything in the small share plus extras — any small-share item change applies to large too
metadata:
  type: project
---

**Rule (Todd, 2026-07-28): "The large share always gets everything in the small share."**
Large = small's items + extra items (typically 2, e.g. carrots + one more).

**Why:** During the week-of-Jul-27 field swap I initially treated small and large box_contents rows as independent — swapped cabbage into small only and had to ask whether large gets it too. Todd confirmed large is a strict superset, always.

**How to apply:** When editing `box_contents` for any week: any item added/removed/substituted in the SMALL share must be mirrored in the LARGE share rows. Large-only changes (its extras) don't touch small. Sanity check after any edit: large's item set ⊇ small's item set. Related: [[box-plan-two-tables]].
