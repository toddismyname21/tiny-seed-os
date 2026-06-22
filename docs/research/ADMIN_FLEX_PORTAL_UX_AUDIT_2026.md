# Admin Portal UX Audit — Navigation + Market Checkout (2026-06-22)

Audit of the CSA **admin** portal (`apps/csa-portal`), focused on the 28-tab nav sprawl and the farmers-market flex-spend flow. Combines a fresh best-practices refresh (researcher) + a code-grounded design audit (ux-designer). Prior member-facing research (`CSA_PORTAL_UX_AUDIT_2026.md`, `CSA_PORTAL_PREMIUM_UX_2026.md`, `CSA_FLEX_PRODUCT_UX_2026.md`, `CSA_PORTAL_UX_ROADMAP_2026.md`) remains valid; admin IA is net-new here.

## Diagnosis
- **`AdminShell.astro` has 28–29 flat nav items** in a horizontally-scrolling strip → most are off-screen at all times; no mental model possible. Miller's law: cap is ~5–7 *groups*, not items. (NN/g: hidden nav = ~21% harder / ~39% slower tasks.)
- **Market Checkout** (`/admin/market-checkout`, the Saturday flex-spend tool) is buried as 1 of 28 tabs, and has concrete friction (below). It's functionally solid (server balance re-fetch, idempotency, $500 cap).
- **2 dead tabs:** `box-plan` + `box (legacy)` — both obsolete now that `box_contents`/Share list is the single source.

## Recommendations — Navigation / IA
- **Group 28 → 6 task sections** in a collapsible left sidebar (desktop) / drawer + bottom bar (mobile):
  1. **Pack Week** — Pack day · Harvest · Pack sheet · Pack check · Labels · Manifests · Host sheets
  2. **Members** — Members · Pickups · Notes · Notices
  3. **Market & Flex** — Market checkout · Flex items · Flex orders
  4. **Deliveries** — Route · Route sheet · Text a stop
  5. **Comms & Content** — Email · Campaigns · Recipes
  6. **System** — Members…Reports · Vendors · Wholesale · Share list · Sync · Health · Reports
- **Cmd-K command palette** (fuzzy jump to any tab) — warranted at this count; one `<dialog>` + keydown + filter over navItems, recent-first. Mobile equivalent = prominent search.
- **Mobile bottom bar** (≤5): Pack · Members · Market · Route · More. 56–60px targets (gloves/sun), primary actions in bottom third, text labels (icon-only fails in glare).
- **Remove** `box-plan` + `box (legacy)` (zero-risk after link check).

## Recommendations — Market Checkout (the Saturday fix)
Concrete, file-referenced:
- **P0 Instant search** — `index.astro:393` Stage 1 is a `<form method=GET>` (full reload per search). Prefetch the small active-flex-member list on load + filter client-side on `oninput`. Kills the type→submit→wait loop. *(Biggest "not easy to navigate" win.)*
- **P0 Bottom-sheet confirm** — `index.astro:514` uses raw `window.confirm()` (center-screen, off-brand, mis-tap risk while money moves). Replace with the member-portal BottomSheet pattern: big "Deduct $X from [Name]?", thumb-zone, red confirm + ghost cancel. Keep the idempotency token.
- **P1 Recent / today's members** — blank search state shows nothing; same 8–15 flex members recur weekly. Add a `sessionStorage` "Recent (last 5 charged)" tap row → no retyping.
- **P1 Number keyboard** — `index.astro:325` `type=number` → `type=text inputmode=decimal pattern="[0-9]*\.?[0-9]{0,2}"` for reliable iOS decimal key.
- **P1 Full-screen mode** — launch market checkout as its own focused mode (recent list dominant), not a tab among 28.
- **P2** — update "you'll confirm" copy after bottom-sheet; enlarge "← New search" to a full-width button.

## Prioritized punch list
**P0 (do first, max market-day impact, low risk):** remove 2 dead tabs · market-checkout instant search · market-checkout bottom-sheet confirm.
**P1:** nav → grouped sidebar + bottom bar · Cmd-K palette · recent-members shortlist · number-keyboard fix.
**P2:** copy + button polish.

## Sources
Researcher refresh (2026): Miller's law (CareerFoundry/NumberAnalytics), admin IA (Eleken, Medium/Carlos Smith), command palette (WordPress 6.9, Figma, solomon.io), farmers-market POS (GetVMS, farmersmarketpos.com, Square/Toast; POS-UX-benchmarking interface-design.co.uk), field mobile (eDesignify, OpenReplay, UX Planet bottom-bar, UXPin progressive disclosure). Full links in this session's research output.
