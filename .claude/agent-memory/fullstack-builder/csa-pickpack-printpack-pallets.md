---
name: csa-pickpack-printpack-pallets
description: Combined print pack (?view=printpack) pallet sections — CSA totals, Flex totals, per-order Wholesale blocks — and the pick-pack.ts merge/matrix reuse contract.
metadata:
  type: project
---

The Pick & Pack combined print doc (`/admin/pick-pack/<week>?view=printpack`, page `src/pages/admin/pick-pack/[...slug].astro`, pure lib `src/lib/pick-pack.ts`) is Todd's single print job for a pack day.

Printpack section order (2026-08-03): overall harvest (page 1) → **CSA totals** → **Flex totals** → **Wholesale one-checklist-per-order** → Pack House matrix (landscape) → each market on its own page. The three middle "pallet" sections mirror how the pack floor stages: build CSA pallet, build Flex pallet, pack each wholesale order complete onto the wholesale pallet.

**Why:** Todd stages the floor by pallet; the printout should mirror that so the crew works pallet-by-pallet.

**How to apply:**
- The pallet sections are print/preview artifacts: plain pen checkboxes (`.harvest-check`, hidden on screen via `.harvest-doc .harvest-check { display:none }` @media screen, shown in print), NO live check-off (printpack has no `#pp-live-config`, so never add `lineAttrs`/`data-pp-line` there).
- CSA totals REUSES `csaCombine`/`csaRowsShown`; Flex totals REUSES `flexRows`; wholesale-per-order is `printpackWsaleOrders` (built only when `view==='printpack'`). All share the SAME day/status/junk gates as the merge + `buildDestinationMatrix`, so totals reconcile.
- Wholesale account names come from `wholesale_accounts.restaurant_name` via `db` (service role, so crew see it). Market Wagon is just another account.
- Print CSS is scoped under `.pp-printpack`: `.pp-pallet-page` = break-before page; `.pp-wsale-order` = break-inside avoid. Overall list, Pack House matrix, and markets must stay byte-for-byte unchanged (their view guards + markup are shared with the standalone views).
- `cropMergeKey` (in [[csa-market-list-feature]]-adjacent pick-pack.ts) is the ONE identity function for merge + matrix + slug — never fork crop identity.
