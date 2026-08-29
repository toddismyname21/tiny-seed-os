# Production evidence reconstructed from sales — 2026-08-29
_Todd's rule: "If we were selling them we grew em." NOP traceability run backward:
sale → harvest → production. Sources: `wholesale_orders`+items and `market_offerings`
(both already in Supabase, dated). Raw matrix: crop × week-sold, Jun 22 → Sep 4._

## Result
- **44 crops** carry dated sales proof across up to 10 weeks each.
- **26 crops** corroborated on BOTH sides (sales ↔ planting records).
- The sales ledger effectively IS the harvest record OEFFA's checker says is missing
  ("Harvest Records: 0") — it just lives in Postgres, not the empty HARVESTS sheet.
  Plus 560 of 743 plantings already carry First_Harvest dates.

## "Sold but no planting record" — mostly explainable, few real gaps
| Crop | Verdict |
|---|---|
| salad mix / petite / swiss | **aliasing** — planted as "Something Fresh Mix" (19), "Petite Kale Mix" (18), "Swiss Chard" (7); sold under blend/short names. Canonical crops table (Day 2) closes this. |
| mint, rosemary | **perennials** — no annual planting row expected; must appear in OSP as perennial herb beds |
| dandelion | sold as "WILD Dandelion Greens" — likely foraged, needs a wild-crop note, not a planting |
| broccolini | ❓ possible real gap (or recorded as "Broccoli" in HOL) — ask Todd |
| fava, oakleaf, savoy, conical | one-off sales; minor, resolve in Day 2 exception list |

## "Planted but never sold" — the mirror check
- **Flowers** (zinnias 20, amaranthus 11, sunflowers 11, scabiosa, celosia…) — Loren's
  channel; her sales aren't in these tables. Fine.
- **Spinach (22), turnips (14), carrots (15), bok choy (10)** — likely sold through the
  **CSA boxes and early-season markets**, which are NOT in this matrix yet.

## Next evidence channel (biggest one still unmined)
**CSA box contents** (`box_contents` / `weekly_box_plan`) — ~200 members weekly all
season. Adding it should absorb most of the "planted but never sold" list and gives
per-week quantities for the biggest share of production.
