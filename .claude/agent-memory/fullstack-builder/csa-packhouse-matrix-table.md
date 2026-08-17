---
name: csa-packhouse-matrix-table
description: Pick&Pack Pack House section is a landscape distribution TABLE (crop×destination) with plain pen checkboxes — NO live check-off, unlike the other 4 views.
metadata:
  type: project
---

The Pick & Pack **Pack House** section (`?view=packhouse` and the second section of
`?view=printpack`) in `apps/csa-portal/src/pages/admin/pick-pack/[...slug].astro`
is a clean `.pack-matrix` TABLE: one row per crop, grouped into crew-section bands,
columns = Item │ one per destination (CSA / each market by name / each wholesale
account incl. Market Wagon / Flex) │ TOTAL (bold, + harvest-lb) │ Have on hand
(pen ☐ + write-in) │ Packed (pen ☐). Empty cells show a faint "·".

**Why:** Todd's crew struggled to read the old compact 2-line by-item blocks;
owner (2026-07-20) wanted a readable spreadsheet. The overall pick list ("pick
everything once") is deliberately left alone — Todd said that part is good.

**How to apply:**
- The math is `buildDestinationMatrix(merged, destInputs)` + `groupBySection` in
  `src/lib/pick-pack.ts`. Row TOTAL is reused verbatim from `merged`; destination
  cells SUM to it by construction. REUSE this — never rebuild it.
- This section has **NO live check-off** (unlike overall/csa/wholesale/market, which
  keep the 0069/0083 interactive board). The checkboxes are plain printed pen boxes
  on BOTH screen and print. So: packhouse is excluded from `ppKeys`, from the
  `#pp-live-config` render (`view !== 'packhouse'`), and there is no `packLineAttrs`.
  If you need per-crop "packed" state persisted again, you'd re-wire it — it was
  intentionally removed here.
- Print orientation for `.packhouse-doc` is **Letter LANDSCAPE** via
  `@page pack-landscape` (Thursday can have many destination columns). `<thead>`
  repeats per page; `.pm-row` uses `break-inside: avoid`.
- `<style is:global>` is bundled by Astro into a LINKED css file (e.g.
  `/_astro/_..*.css`), NOT inlined — so verify CSS by fetching that bundle, not by
  grepping the page HTML. See [[csa-unified-harvest-doc]] for the harvest-doc sibling.
