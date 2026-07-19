# PRINT FORMATS AUDIT — CSA Portal (2026-07-16)

**Scope:** every printed surface in `apps/csa-portal/src/pages/admin/`.
**Standards applied:** `docs/CSA_LABEL_REDESIGN_REQUIREMENTS.md` (crew print DNA: one line per decision, checkbox first, biggest text = the scanned thing, small color accents, low ink) + owner standing rules: ≥11pt body floors on crew sheets, zebra rows on spreadsheet-like lists, alphabetical within sections, date-range week labels, day-scoped where the work is day-scoped, sensible page breaks, landscape only when justified, EN/ES on crew-facing sheets.
**Method:** read-only code audit — `@media print` CSS + printed markup + frontmatter defaults for all 11 surfaces (~12k lines). No fixes made.

---

## VERDICT TABLE

| # | Surface | Verdict | One-line summary |
|---|---------|---------|------------------|
| 1 | `/admin/pick-pack` (overall, packhouse, per-market, csa, wholesale, printpack) | 🟡 tweaks | Overall + packhouse print sheets are excellent; CSA/wholesale/market print views drift from them (no zebra, no compact header, partial ES); day default is `all` (the exact merged-harvest failure Todd flagged 2026-07-09). |
| 2 | `/admin/pack-sheet` | 🔴 needs work | The most-used crew sheet prints ~9.8pt body type (below the 11pt floor), no zebra, and **no week/day header prints at all**; landing day picker is missing Sunday. |
| 3 | `/admin/pack-check` | 🟡 tweaks | Best-in-class per-stop format (color bands, LOAD banners, make-goods, cover chips) — but zero day scoping (`all=1` mixes Tue/Wed/Sat/Sun), flex sub-checklist prints 9pt, no ES. |
| 4 | `/admin/labels` (Avery 5164) | ✅ solid | Meets the label-redesign spec nearly point-for-point (one label/customer, checkboxes, truck pill, EN/ES, low ink, load order). |
| 5 | `/admin/wholesale/labels` (5164 + 8163) | 🟡 tweaks | Layout solid; **no order-status filter** (cancelled/draft orders print crate labels) and crates sort alphabetically instead of load order. |
| 6 | `/admin/stop-manifest` | 🟡 tweaks | Strong driver/host sheet, but flex line-items query uses a *different status set* than its own box count (pending orders counted but not listed), and no LOAD banner (every sibling sheet has one). |
| 7 | `/admin/host-sheets` | ✅ solid | Big type (2xl–3xl names/phones), one page per stop, correct scoping. |
| 8 | `/admin/route-sheet` | ✅ solid | Correct print pattern, per-leg pages, break rules; minor: checkbox is *last* on saved-leg rows (checkbox-first everywhere else). |
| 9 | `/admin/pack-load` (truck door sheet) | ✅ solid | Per-leg page-broken sheets, dark seq chips, live board correctly `print:hidden`. |
| 10 | `/admin/substitutions` | 🔴 needs work | Prints with **no `@page` rule, no printed week header, no break-inside protection, no checkboxes** — a raw screen dump. |
| 11 | `/admin/wholesale/pack` | 🟡 tweaks | The recent fixes ARE in (per-order page breaks + 1.5rem/800 restaurant headers verified) — but no `@page` rule, and no status filter (cancelled/draft orders print pack sheets). |
| 12 | `/admin/market/price-list` | ✅ solid | The only surface using a true date-range header; dot leaders, category grouping A→Z, 2-col multicol with break-inside avoid. |
| 13 | `/admin/market/labels` (sale signs) | ✅ solid | Landscape is justified (2×2 full-bleed cut-in-quarters signs); per-sign print toggles. |
| 14 | `/admin/notices` | 🟡 tweaks | Dedicated B&W print worksheet with hand-tick squares is good; the page's week anchor uses `upcomingMonday()` so mid-week the "due this week" bucket points at NEXT week. |
| 15 | `/admin/floral` | 🔴 needs work | Printed sheet has **no week/day identification** (title is in the print-hidden AdminShell header), no break-inside rules (stop cards split across pages), 10.5pt member rows. |

---

## 1. /admin/pick-pack — `pick-pack/[...slug].astro` (2705 lines) + `index.astro`

### What's right
- **Overall view print** (`.pp-overall`, lines 2019–2141): one line per crop, 12pt floor honored (`.pp-crop` 12pt, qty 12.5pt), zebra rows (line 2060), dot leaders, amber tender left-edge, auto 2-col only when >34 rows (line 757–759). Exactly the crew DNA.
- **Packhouse print** (lines 1996–2017): 13.5pt crop names, 14pt totals, 11pt splits (explicit floor comment), zebra units (line 1920), units never split (`break-inside: avoid`), section bands, portrait (kills the old landscape grid — "landscape only when justified" honored).
- **printpack** (lines 2143–2158): composes overall → packhouse → per-market with `break-before` (no trailing blank page), single page-1 banner, EN/ES, printed-on date. Reuses the same builders — no forked renderers.
- Alphabetical within sections everywhere (crew request 2026-07-13, lines 167, 345, 440, 468–471).
- Make-ups banner prints in color, kept whole (line 1991).
- Landing page day-explicit buttons for packhouse + printpack + one-tap market prints (index lines 203–217, 262–279, 296–308) — the day-less-print lesson institutionalized.

### Findings
| Sev | Finding | Where | Fix direction |
|-----|---------|-------|---------------|
| HIGH | **Default day scope is `all`** on direct open of `/admin/pick-pack/[week]` — the merged Mon+Thu harvest Todd explicitly flagged 2026-07-09. The landing's "Open overall harvest →" action button (index lines 121–125, 231) is also day-less. | `[...slug].astro:82-84`; `index.astro:121,231` | Default `day` from today's weekday (Fri–Mon → `mon`, Tue–Thu → `thu`… or simply keep `all` on screen but make the print buttons/day tabs nag when printing `all`). At minimum make the landing's primary button day-explicit like every other button on that page. |
| MED | **Print inconsistency between views**: only `.pp-overall` and `.packhouse-doc` get compact print CSS + zebra. The CSA / wholesale / market checklists print the full-size screen layout — 3xl (~27pt) doc-band titles, `py-3` rows, borders only, **no zebra** — so the same crew gets two different print languages in one day. | CSA/wholesale/market templates lines 1426–1594 vs print CSS 2019+ | Extend the `.pp-overall` compact/zebra print treatment (or at least zebra + compact band) to `.harvest-doc` generally. |
| MED | Per-market header omits the day-scope label that CSA/wholesale/overall headers carry (`dayScopeLabel`), so a printed market sheet doesn't say which harvest run it belongs to. | line 1523 vs 1331/1430/1478 | Add `· {dayScopeLabel}` (or the market's day) to the market doc-band kicker. |
| MED | **Landing wholesale count ≠ sheet contents**: index counts `.eq('status','submitted')` but the sheet includes `['submitted','confirmed','packed']` (the 2026-07-13 latent-hole fix was applied to the sheet only). Card can read 0 while the sheet has orders. | `index.astro:74` vs `[...slug].astro:305` | Use the same `.in('status', […])` filter on the landing count. |
| LOW | ES coverage is partial: the lang toggle renders only for overall/packhouse/printpack (line 1098), and the CSA/wholesale/market view headers/footnotes are hard-coded English (e.g. lines 1430–1432, 1478–1480, 1526). Market checklists are crew print targets (one-tap print buttons). | lines 1098, 1426–1594 | Move the per-view strings into `PICK_PACK_STRINGS` and offer the toggle on all views. |
| LOW | Emoji glyph accents (🥬🛒🍽🌿) in packhouse splits render inconsistently in B&W laser print (emoji become gray boxes on some drivers). | lines 701–703 | Consider letter glyphs (C/M/W/F) or accept — low ink either way. |

---

## 2. /admin/pack-sheet — `pack-sheet/[...slug].astro` (667) + `index.astro` (62)

### What's right
- One compact line per customer, alphabetical within stop, truck-LOAD order + `🚚 LOAD #n` chips (shared `lib/load-order`), home split into individual stops — consistent with pack-check/labels.
- Make-ups banner prints (buttons correctly hidden, line 664–665); banner kept whole.
- 2-col continuous flow is a deliberate, correct page-break choice for this sheet (crew works down a list; per-stop pages live on pack-check) — comment at line 514 says exactly this.

### Findings
| Sev | Finding | Where | Fix direction |
|-----|---------|-------|---------------|
| HIGH | **No printed week/day header.** The AdminShell heading (which carries "Wednesday Jul 15 · Week of Monday, July 13") is `print:hidden` (AdminShell.astro:396), and the page adds no `.print-doc` header of its own — the printed sheet starts with stat cards then the list. Two harvest runs a week = a real mixup risk between Monday's and Thursday's printouts. | `[...slug].astro:356-419` + `AdminShell.astro:396` | Add a small printed header line (day + date + week range) above `.ps-doc`, mirroring pick-pack's doc-band. |
| HIGH | **Body type below the 11pt floor**: `.ps-member` is 0.82rem (~9.8pt), `.ps-stop-sub` 0.72rem (~8.6pt), size pill 0.68rem (~8.2pt). Density was requested, but the standing rule is "compact ≠ cramped, ≥11pt". | lines 613–651 | Raise `.ps-member` to ≥11pt in `@media print` (2 columns still fit ~50 rows/page at 11pt). |
| MED | **No zebra rows** — this is the most spreadsheet-like list in the portal (one line per customer) and gets only a 1px `border-bottom: #f1f2f4` (near-invisible in print). | line 623 | `nth-child(even)` tint like `.pp-overall` (line 2060 pattern). |
| MED | Landing day picker missing **Sunday** (South Side market) — options are wed/tue/sat/all only, while the slug page supports `?day=sun` and renders a Sun tab. | `index.astro:31-36` vs `[...slug].astro:41,375` | Add `<option value="sun">`. |
| MED | Day default is always `wed` regardless of the actual day the user opens it (a Saturday pack crew lands on Wednesday's list). | `[...slug].astro:37-43` | Default `day` from today's weekday within the delivery week. |
| LOW | Stat cards (5 Cards) print above the list — screen furniture consuming ~1.5in of page 1. | lines 392–418 | Wrap in `print:hidden` (make-ups banner already carries the key count). |
| LOW | No EN/ES (crew-facing). | — | Reuse the pick-pack `parseLang` pattern. |

---

## 3. /admin/pack-check — `pack-check/[...slug].astro` (1189) + `index.astro` (152)

### What's right
- The strongest per-stop print format in the portal: color-coded stop band matching labels/manifest (same 15-band palette, same name-sorted mapping — verified identical hex, lines 230–248), 🚚 LOAD banners glued to bands (`break-after: avoid`, line 1181), red make-goods block pinned at top, tickable cover chips per size/add-on/flex/flower, one page per stop (`.page-break`, 1174–1175), rows kept whole.
- `all=1` in truck-load order with home split + wholesale sections interleaved — matches labels/pack-sheet numbering (one shared `lib/load-order`).
- Defaults: `currentDeliveryWeek()` — correct.

### Findings
| Sev | Finding | Where | Fix direction |
|-----|---------|-------|---------------|
| HIGH | **No day scoping anywhere.** "Print all stops for this week →" (index line 46) renders every stop Tue+Wed+Sat+Sun in one job; a Wednesday pack crew wades through weekend market stops (and load order only sequences the Wed route, so Sat/Sun stops sort as off-route noise at the end). The work is day-scoped; the surface isn't. | `index.astro:46`; `[...slug].astro:97-99` | Add `?day=` filtering + day-explicit print buttons on the landing (pattern already exists in pack-sheet/pick-pack). |
| MED | Flex nested checklist prints `text-xs` (~9pt) with 14px tick boxes — below the 11pt floor for the crew's most error-prone items. Allergy flag is also `text-xs`. | lines 1051–1063, 1068–1071 | Bump flex lines + allergy to ≥11pt in print CSS. |
| LOW | Wholesale sections' order-lines query has **no status filter** (drafts/cancelled included). | lines 570–574 | Filter to `['submitted','confirmed','packed']` like pick-pack. |
| LOW | No zebra on member rows (multi-line rows make it less critical, but long stops are 30+ rows). | line 972 | Optional `nth-child` tint. |
| LOW | No EN/ES (crew-facing). | — | Same as pack-sheet. |
| LOW | Stop-band palette is a local copy — `lib/stop-colors.ts` exists precisely for this and documents the drift risk in its own header. | lines 230–248 | Import from `lib/stop-colors`. |

---

## 4. /admin/labels — `labels/[...slug].astro` (1571) + `index.astro` (239) — ✅

Measured against `CSA_LABEL_REDESIGN_REQUIREMENTS.md` acceptance criteria:
- One label per customer ✓ (customer grouping, lines 526–742); add-ons as color chips w/ counts ✓; flex `☐ qty× name` checklist w/ real squares ✓ (2-col at 4+ items, 11pt rows); allergy/owes flags ✓; stop+day band prominent ✓; name 19pt biggest ✓; low-ink accents ✓; Avery 5164 geometry verified ✓; sort = load order when a route is saved (supersedes day→stop→name — correct evolution, one numbering truth) ✓; EN/ES ✓ (full string table, lines 111–243).
- Print CSS is the debugged pattern: `.screen-only` hidden (with the historical-regression comment), one sheet per page, margin 0.

Minor (LOW):
- Week footer reads "Week of Jun 8" (Monday only) at 7.5pt — the glossary range ("Jun 8 – Jun 14") would cost ~0.3in of width and is the standing rule; acceptable deviation given the 4"-wide budget, but note it in the week-label cleanup (cross-surface §12).
- The size-badge label for ES `FAMILIAR`/`PEQUEÑA` can widen the pill and squeeze the 19pt name a hair — cosmetic.
- Palette duplicated locally instead of `lib/stop-colors` (same as pack-check).

Default: landing = `currentDeliveryWeek()` ✓ with stop/member/type filter launchers ✓.

## 5. /admin/wholesale/labels — `wholesale/labels/index.astro` (436) — 🟡

- Crate (5164) + item (8163) modes share data; truck pill `🚚 A-3` matches the CSA labels' per-leg numbering ✓; USDA seal + phone ✓; pads to whole sheets ✓; `@page` margin 0 ✓.

| Sev | Finding | Where | Fix direction |
|-----|---------|-------|---------------|
| MED | **No order-status filter** — every `wholesale_orders` row on the date prints a crate label, including `draft` and `cancelled`. Pick-pack deliberately filters to submitted/confirmed/packed; a cancelled order here prints a phantom crate. | lines 56–60 | Add the same `.in('status', …)` filter. |
| LOW | Crate labels sort **alphabetically** (line 122) even when a load order exists — the CSA label stack sorts by load order so the pile matches the truck; crates don't. | lines 111–122 | When `loadOrder` exists, sort by `orderValue('wc:'+customer_id)` like the CSA labels. |
| LOW | Default date = `currentDeliveryWednesday()` — fine for the Wed run, but Fri/Sat wholesale deliveries (which pick-pack's Thursday scope explicitly supports) are hidden behind the date chips. | line 46 | Default to the nearest date that actually has orders in the current week. |
| LOW | Crate restaurant name 18pt vs CSA member name 19pt; footer 6.5pt (fine — not crew-scanned). | lines 338, 370 | Cosmetic alignment only. |

## 6. /admin/stop-manifest — `stop-manifest/[...slug].astro` (817) — 🟡

- Same band/badge/chip color system as labels/pack-check (hex-identical, verified) ✓; bold ★ N BOXES ★ cover; tickable size/add-on chips; yellow notices block prints in color, kept whole ✓; page-per-stop ✓; donations + moved-in chips ✓.

| Sev | Finding | Where | Fix direction |
|-----|---------|-------|---------------|
| HIGH | **Internal status-set mismatch**: the flex *box count* gate uses `['pending','locked','fulfilled']` (line 95) but the flex *line items* query uses `['locked','fulfilled']` only (line 120). A pending-only flex member is counted as a box on the cover and gets a row — with an **empty items list** on the manifest. Labels/pack-check/pack-sheet all use the 3-status set for lines. | lines 95 vs 120 | Add `'pending'` to the line-items query. |
| MED | No 🚚 LOAD banner — labels, pack-check, pack-sheet, pack-load and wholesale labels all print the per-leg load number; the manifest (which travels on the same truck) doesn't. | template lines 476–519 | Reuse `loadBannerForStop` from pack-check (shared `lib/load-order`). |
| LOW | Flex summary + allergy + notes rows print `text-xs` (~9pt). | lines 717–738 | Bump to ≥10.5–11pt in print CSS. |
| LOW | Local palette copy (see §3). | lines 182–218 | Import `lib/stop-colors`. |

## 7. /admin/host-sheets — `host-sheets/[...slug].astro` (323) — ✅

Names + phones at 2xl/3xl (the host's scanned fields = biggest text ✓), one page per stop ✓, host-stops-only scoping ✓, `no phone on file` sentinel ✓, rows kept whole ✓, default `currentDeliveryWeek()` ✓. Only nit: header band is neutral gray rather than the stop's label color (arguably fine — hosts don't see the colored stickers ecosystem).

## 8. /admin/route-sheet — `route-sheet/[...slug].astro` (651) — ✅

Saved-route mode: per-leg pages, reverse-load banner, combined checklist on its own page, rows kept whole ✓. Fallback zip-loop mode: numbered rows w/ 8×8mm checkboxes, color name-bands via the **shared** `lib/stop-colors` ✓ (the only page using the lib). Defaults ✓.
- LOW: saved-leg rows put the checkbox at the row **end** (line 445) while the combined checklist puts it first (line 470) — checkbox-first is the DNA; align them.
- LOW: leg-page addresses/phones print `text-sm` (~10.5pt) — borderline; driver reads in a truck cab.

## 9. /admin/pack-load — `pack-load/[...slug].astro` (1061) — ✅ (truck door sheet)

Print = ONLY the per-leg truck sheets (live board `print:hidden`, sheets `break-after: page`, lines 830–843) ✓; dark load-seq chips print exact-color ✓; box/crate counts per row ✓; header carries week + "load #1 first (deepest)" instruction ✓. Default week `currentDeliveryWeek()` ✓; default open day-tab = busiest day, prefers Wed ✓ (screen-only concern anyway).
- LOW: "drive #x of y" at `text-xs`; stop names `text-base` semibold — name could be bolder/larger (it's the scanned field on the truck door), but acceptable.

## 10. /admin/substitutions — `substitutions/[...slug].astro` (413) — 🔴

The content model is excellent (by-stop, alphabetical, red allergy left-rule, teal swaps, legend). The **print layer is missing**:

| Sev | Finding | Where | Fix direction |
|-----|---------|-------|---------------|
| HIGH | `@media print` contains ONLY `.screen-only { display:none }` — no `@page` rule (browser default margins/size), no `break-inside: avoid` on member rows or stop sections (rows split mid-member across pages), no page-break strategy per stop. | lines 405–413 | Copy the standard block from stop-manifest: `@page Letter portrait 0.5in` + row/section break protection. |
| HIGH | **No printed header**: title + week live in the AdminShell heading (print-hidden); the week `<select>` form is `screen-only`; nothing on paper says which week this is. | lines 208–240 | Add a printed doc-band ("Box Modifications · <week range>"). |
| MED | No checkboxes — this is a pack-floor verification list ("pack with extra care") where every other crew sheet gives a tick square per decision. | lines 298–356 | Add a `☐` per member row. |
| LOW | No zebra; `text-sm`/`text-xs` sub rows (~9–10.5pt) below floor. | lines 322–331 | Zebra + ≥11pt in print. |

## 11. /admin/wholesale/pack — `wholesale/pack/index.astro` (366) — 🟡

**Recent fixes verified present:** each order on its own sheet (`.order-break { break-after: page }`, line 349–352; pick totals section too, 353–357), big bold restaurant header band (`.order-name` 1.5rem/800 on the green `#f0fdf4` band that force-prints, lines 256–261, 363). Item rows 1.125rem/600 with real checkboxes and boxed 1.375rem quantities ✓ — all above floor.

| Sev | Finding | Where | Fix direction |
|-----|---------|-------|---------------|
| MED | **No status filter** — drafts/cancelled orders print their own pack sheets AND inflate the ①Pick/Harvest totals (which double-counts against pick-pack's filtered wholesale numbers). | lines 36–40 | Filter to `['submitted','confirmed','packed']`. |
| LOW | No `@page` rule (only surface family without one besides substitutions) — margins/orientation left to the browser. | lines 346–365 | Add `@page { size: Letter portrait; margin: 0.5in }`. |
| LOW | `.order-block { break-inside: avoid }` + one order per page: an order taller than one page gets pushed to a fresh page then still overflows; harmless today (chef orders are short) but remove `break-inside` from the block, keep it on items. | lines 358–361 | Keep `break-inside` on `.pack-item` only. |
| LOW | Orders sort alphabetically, not load order (same note as crate labels). | line 106 | Optional: reuse loadOrder. |

## 12. /admin/market/price-list — `price-list/[...slug].astro` (303) — ✅

Category groups A→Z (Other last) ✓, items A→Z ✓, dot leaders ✓, 2-col multicol with `break-inside: avoid` per group AND row ✓, dark header band force-printed ✓, `@page` Letter portrait ✓, contenteditable affordances stripped in print ✓. **This is the only printed surface using a true date-range header** ("June 29 – July 5, 2026", lines 103–118) — the model the others should copy.

## 13. /admin/market/labels (sale signs) — ✅

Landscape **justified**: full-bleed 2×2 quarter-cut signs (`@page letter landscape; margin: 0`, sheet = 11×8.5in, hairline borders double as cut guides, `break-before` prevents the trailing blank page). Per-sign print toggles, blank hand-write signs. No issues.

## 14. /admin/notices — `notices/index.astro` (597) — 🟡

Print worksheet is thoughtfully built: forced black-on-white, print-only title + hand-tick square per notice, bucket headings ruled, rows kept whole (lines 536–596). Interactive buttons/`details` correctly print-hidden.

| Sev | Finding | Where | Fix direction |
|-----|---------|-------|---------------|
| MED | Week anchor = `mondayOfWeek(upcomingMonday())` — on Tue–Sun this is **next** Monday, so mid-week the "Due this week" bucket names next week and current-week dues fall into "Overdue". Every execution surface uses `currentDeliveryWeek()`. | line 49 | Use `currentDeliveryWeek()`. |
| LOW | Print title is static "…worksheet" without a date/week line; add printed-on date for the fridge copy. | ~line 558 | Append the week range + printed date. |

## 15. /admin/floral — `floral/[...slug].astro` (317) — 🔴

| Sev | Finding | Where | Fix direction |
|-----|---------|-------|---------------|
| HIGH | **No week/day identification prints.** Title ("Floral list · Monday") + week are in the print-hidden AdminShell heading; the day tab strip is print-hidden too (line 311–314). The paper says nothing about which week or which floral day it is — with two floral runs a week. | lines 179–182, 307–317 | Add a printed doc-band (day + Tue+Wed/Sat+Sun target + week range). |
| MED | No `break-inside` rules at all — stop Cards and member rows split across pages; no page-break strategy (bouquet-making is per-stop work → per-stop grouping should at least stay whole). | lines 307–317 | `break-inside: avoid` on stop cards / rows. |
| LOW | Member rows `text-sm` (~10.5pt), stop header `text-sm`, count line `text-xs` — under the floor for a make-list. | lines 268–290 | Bump in print CSS. |
| LOW | Day default is `mon` regardless of the actual day (opening Thursday-run week on a Thursday still shows Monday floral). | lines 47–48 | Default tab from today's weekday. |
| LOW | Stat cards print (screen furniture; the "Excluded" transparency card is meaningless on paper). | lines 223–249 | `print:hidden` the stat row, fold totals into the doc-band. |

---

## CROSS-SURFACE CONSISTENCY

1. **Week label — NOT identical anywhere.** The glossary rule (and `lib/cycle-ui.ts:34` `weekRangeLabel`, "the single canonical WEEK label… ALWAYS a range") produces "Week of Jun 22 – Jun 28". But **every printed header uses `prettyWeekHeader()`** ("Week of Monday, July 13" — `lib/cycle.ts:1436`): pick-pack, pack-check, stop-manifest, host-sheets, pack-load, labels subtitle, printpack banner. Price-list rolls its own range ("June 29 – July 5, 2026"). CSA label footers use "Week of Jun 8". Wholesale surfaces use "Delivery Wed, Jul 16" (fine — those are date-scoped, not week-scoped). → One change to `prettyWeekHeader` (delegate to `weekRangeLabel`) would fix ~10 surfaces at once. Screen week pickers already use the range.
2. **Stop colors** — values are identical across labels / pack-check / stop-manifest / route-sheet (verified hex-by-hex), but three pages carry private copies while `lib/stop-colors.ts` exists and documents itself as the shared source ("the others can be migrated… DO NOT change in isolation"). Drift risk, not a current bug. Same for the ADDON_STYLE + SIZE_BADGES tables (4 private copies).
3. **Load numbering** — consistent per-leg numbers from one shared `lib/load-order` on labels ("A-3" pill), pack-check ("LOAD #3 · drive stop 7 of 9"), pack-sheet, pack-load (truck door), wholesale labels. **Missing on stop-manifest** (§6). Route-sheet numbers by drive order 1..N with a reverse-load banner — a different (but internally coherent) frame; the sheets never show contradictory numbers because route-sheet doesn't print "LOAD #".
4. **Checkbox-first** — honored on every crew sheet except route-sheet saved-leg rows (checkbox last) and substitutions (no checkbox at all).
5. **Flex status sets** — `['pending','locked','fulfilled']` everywhere EXCEPT stop-manifest's line-items query (§6) — the one true data inconsistency.
6. **Wholesale status sets** — pick-pack filters to real orders; wholesale/labels, wholesale/pack, and pack-check's wholesale sections don't filter at all. Phantom crates/sheets + pick-total drift.
7. **EN/ES** — full on pick-pack (overall/packhouse/printpack) + labels; absent on pack-sheet, pack-check, stop-manifest, wholesale/pack; partial inside pick-pack (csa/wholesale/market views).
8. **`@page` rule** — uniform `Letter portrait margin 0.5in` (labels use margin 0 by spec; signs landscape by spec) except substitutions and wholesale/pack (none).

## DEFAULTS AUDIT (what a user lands on)

| Surface | Default | Logical? |
|---|---|---|
| pick-pack landing + slug | `currentDeliveryWeek` ✓ / view=overall, **day=all** | Week ✓. Day ✗ — merges Mon+Thu harvests; the crew's actual unit of work is a harvest day. |
| pack-sheet | week ✓ / **day=wed always** | ✗ on Tue/Sat/Sun — should follow today's weekday. Landing also can't select Sunday. |
| pack-check | week ✓ / no day dimension | ✗ — "Print all stops" spans 4 pickup days. |
| labels | week ✓, whole-week w/ filters | ✓ (labels are printed once for the whole week in load order). |
| wholesale labels/pack | `currentDeliveryWednesday` | Mostly ✓; hides Fri/Sat wholesale behind date chips. |
| stop-manifest / host-sheets / route-sheet / pack-load / substitutions | `currentDeliveryWeek` | ✓ (the 2026-06-17 "next week's roster" incident fix is consistently applied). |
| floral | week ✓ / **day=mon always** | ✗ on Thu–Sun. |
| notices | `upcomingMonday` anchor | ✗ mid-week (shifts buckets a week early). |
| price-list / signs | explicit week from `/admin/market` | ✓. |

---

## RANKED FIX LIST (severity × frequency of use)

1. **pack-sheet print layer** (used every pack day, 2×/wk): add a printed week/day header, raise body type to ≥11pt, add zebra, add Sunday to the landing picker, day-default from today. — `pack-sheet/[...slug].astro:356-666`, `index.astro:31-36`.
2. **pack-check day scoping** (every pack day): `?day=` filter + day-explicit "Print all" buttons so the all-stops job matches the day's run; bump flex/allergy print type to 11pt. — `pack-check/index.astro:46`, `[...slug].astro:97-99,1051-1071`.
3. **stop-manifest flex line-items status set** (every delivery day; silent data hole): add `'pending'` at line 120 so counted flex boxes list their items; add the LOAD banner for numbering parity. — `stop-manifest/[...slug].astro:120`.
4. **Wholesale status filter** (weekly; phantom prints + total drift): filter `wholesale_orders` to submitted/confirmed/packed in wholesale/labels (56–60), wholesale/pack (36–40), pack-check wholesale (570–574); align pick-pack landing count (index:74).
5. **Canonical week-range header** (every surface, every print): make `prettyWeekHeader` delegate to `weekRangeLabel` ("Week of Jul 13 – Jul 19") — one function, ~10 surfaces fixed. — `lib/cycle.ts:1436`.
6. **pick-pack default day + print-language parity across views**: day-explicit default/primary button; extend zebra + compact header to CSA/wholesale/market print views; add `dayScopeLabel` to the market header. — `pick-pack/[...slug].astro:82,1523,2019+`, `index.astro:121,231`.
7. **substitutions print layer**: `@page` + printed week header + break protection + row checkboxes. — `substitutions/[...slug].astro:405-413`.
8. **floral print layer**: printed day/week band + break-inside rules + ≥11pt rows + day-default from today. — `floral/[...slug].astro:47,307-317`.
9. **notices week anchor**: `upcomingMonday` → `currentDeliveryWeek`. — `notices/index.astro:49`.
10. **Consistency hygiene** (low, batched): migrate labels/pack-check/stop-manifest to `lib/stop-colors`; checkbox-first on route-sheet leg rows; crate labels in load order; `@page` on wholesale/pack; EN/ES on pack-sheet/pack-check.

*Read-only audit — no code was modified. All line numbers verified against the working tree on branch `csa-migration`, 2026-07-16.*
