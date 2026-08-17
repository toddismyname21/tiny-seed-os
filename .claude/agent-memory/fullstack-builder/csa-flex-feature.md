---
name: csa-flex-feature
description: Farm Flex (member prepaid store credit) feature in apps/csa-portal — data sources, phasing, where the wallet renders.
metadata:
  type: project
---

The CSA portal "Farm Flex" feature exposes members' prepaid store credit. See also [[csa-portal-build-gotchas]].

**Source of truth for the spendable balance is Shopify Store Credit, NOT Supabase.**
- A member's Shopify customer is resolved by EMAIL (their portal auth identity): Admin GraphQL `customers(first:1, query:"email:..")` → sum `storeCreditAccounts(first:5).balance.amount` = total. One combined number.
- Supabase `flex_transactions` separately records the promotional **loyalty bonus** (rows where `reason ILIKE '%loyalty bonus%'`, type='credit'). bonus = sum of those for the email; principal = max(0, total − bonus). Principal ($10,100 across 29 members) is escheatment-exempt; bonus ($1,019) is goodwill. This split exists for accounting/legal — Shopify only shows the combined number.
- **Why the split matters:** do NOT collapse principal+bonus in any accounting-facing surface. Member-facing UI shows total prominently but breaks out the bonus as a celebratory surprise.

**`src/lib/flex.ts` is the read API (Phase 1, built 2026-05-22).**
- `getFlexBalance(email)` → `{ total, bonus, principal, currency } | null`. FAIL-SOFT: one try/catch returns null on every error (no Shopify creds, Shopify down, GraphQL errors, no customer). Callers HIDE the wallet on null. Never throws.
- `getFlexTransactions(email)` → 25 newest flex_transactions, fail-soft → [].
- SERVER-ONLY (imports astro:env/server via ./shopify + service-role supabaseAdmin). Reuses `shopifyGraphQL` / `shopifyConfigured` from shopify.ts — don't write a second Shopify fetch.
- **How to apply:** any new flex surface should call these, not re-query Shopify/Supabase directly, so the fail-soft + email-resolution stay in one place.

**Where the wallet renders:** all three surfaces now use ONE component `src/components/FlexWallet.astro` (variants `dashboard` | `hub` | `detail`) — dashboard.astro hero card (above share cards / below countdown banner), account/index.astro hub link card, `/account/flex` detail page (auth-gated; total + principal/bonus breakdown + history + Add Funds tiles).

**The balance is loaded NON-BLOCKING as of 2026-05-24 (gap analysis P0-1 — the #1 scaling risk at 176+ concurrent logins).** The three pages used to `await getFlexBalance(email)` in SSR frontmatter — a LIVE Shopify GraphQL call that gated first paint on EVERY load. NOW: `getFlexBalance` is called ONLY in the new endpoint `src/pages/api/account/flex-balance.ts` (GET, auth-gated via Astro.locals.user, returns `{total,principal,bonus,currency}`, normalizes null→zeroed, Cache-Control private,no-store). The `FlexWallet` island renders a loading skeleton, fetches that endpoint AFTER first paint, and DOM-patches the numbers (no innerHTML — DeliveryTracker discipline). Fail-soft preserved: total<=0/error → card hides (dashboard/detail remove themselves; hub keeps the nav link + shows the generic tagline). The island dispatches a `flex:resolved` CustomEvent so /account/flex can pick the right empty-state (its tx history stays SSR — Supabase, not Shopify). **How to apply: any NEW flex surface should use `<FlexWallet>` or this endpoint pattern — never re-add an SSR `await getFlexBalance` (it re-introduces the P0 blocking call).** formatFlexMoney is server-only (flex.ts imports shopify/supabase) so the island re-implements it inline with Intl.NumberFormat.

**Member-facing label for `principal` is "Your funds" (2026-05-22), NOT "principal" or "Prepaid principal".**
- "principal" is bank-jargon Todd doesn't want members to see. The CODE field stays `principal` (flex.ts, the math) — only the displayed `<dt>` label changed. flex.astro shows "Your funds" / "Bonus 🎁"; dashboard.astro wallet shows a compact "Your funds {principal} · Bonus 🎁 {bonus}" breakdown under the total.
- **How to apply:** any future flex surface should label the principal line "Your funds" for members. Keep "Bonus" + "Total" as-is.

**Flex ORDER WINDOW math lives in `src/lib/flex-order.ts` (pure, import-safe from admin + member + tests).** As of 2026-06-17: window OPENS prior **Thursday** 00:00 ET (`opensEpochMs` offset `-4`; moved from Friday/`-3`) and CLOSES that week's **Tuesday 08:00 ET** (`cutoffEpochMs`, box-swap-aligned). Weekend-market members (pickup day Sat/Sun, `isWeekendMarket`) get a later close: Wednesday 23:59:59 ET. Week-1 (`'2026-06-08'`) is already-open (epoch 0). DST-aware via Intl (never hardcode UTC offset). Member copy says "goes live Thursday" (dashboard CTA + `account/flex-order.astro`). Unit tests `flex-order.test.ts` assert exact UTC instants — update them in lockstep with any offset change. **How to apply:** any window-day/cutoff change is a one-line offset edit in flex-order.ts PLUS the "goes live <day>" copy strings PLUS the test's open/close ISO assertions.

**Two flex ADMIN pages — don't confuse them:** `/admin/flex-inventory` = the weekly catalog/list EDITOR (Todd adds items/photos/prices/qty for a week — CRUD on `flex_inventory`); `/admin/flex-orders` = read-only PACK view of what members ordered. "Edit the flex list / store items" → `flex-inventory`. Prod origin `https://csa.tinyseedfarm.com`.

**Weekly flex-list reminder cron (2026-06-17):** `src/pages/api/cron/flex-list-reminder.ts` emails Todd every Thursday 7 AM EDT (Vercel cron `0 11 * * 4` UTC) to refresh the list, linking `/admin/flex-inventory`. Same CRON_SECRET-Bearer auth + Resend fail-soft pattern as [[csa-sync-reliability]]'s nightly-health. Vercel `vercel.json` `crons` only accepts `path`+`schedule` (no comment field).

**Phasing (Todd's plan):**
- Phase 1 (done): read-only display. No money movement.
- Phase 2a (built 2026-05-23): Add Funds. Top-up tiles ($50/$100/$250/$500) on /account/flex #add-funds → Shopify cart permalink → 15-min sync credits principal + ladder bonus. Ladder: <$250 +5%, $250–$499 +10%, $500+ +12% (decided 2026-05-21). All money in Shopify, no Stripe.
- Phase 2b: Extras / add-on checkout that spends flex.
- **How to apply:** when asked to "build Add Funds" or "spend flex," that's Phase 2 — confirm scope with PM; Phase 1 deliberately did NOT touch money.

**Ladder math + top-up wiring lives in `src/lib/flex.ts` (added Phase 2a):**
- `FLEX_BONUS_TIERS` / `flexBonusRate()` / `flexBonusAmount()` (cent-rounded) = the SINGLE source of truth for the bonus %; both the UI tiles and the sync read it so the displayed promise can't drift from the issued credit. `planFlexCredit(amount)` → {principal, bonusRate, bonus, total}. `isFlexFundsTitle()` (title contains "flex" — broader than shopify.ts `categorize()`, which only knows the flex SHARE) catches the top-up product in the sync.
- **The sync credits principal+bonus via `issueStoreCreditDelta(gid, creditPlan.total)` — PURE ADDITIVE (commit 3ae4622, 2026-05-24 drift fix).** DO NOT revert to `issueStoreCredit(gid, total)` (balance-TARGETED): a fail-soft balance read of 0 tops up only TO total instead of ADDING it → under-credit while the bonus flex_transactions row claims the full bonus → Shopify↔ledger drift. The bonus row is written ONLY after a confirmed credit (credited>0). Idempotency = the per-order shopify_order_sync ledger guard (NOT a balance self-guard — additive can't self-guard). Same additive switch as the referral $25 — see [[csa-referral-feature]]. The balance-targeted issueStoreCredit + getStoreCreditBalance are now retained in shopify.ts ONLY for the idempotent backfill (zero callers in the sync).
- **`FLEX_TOPUP_VARIANTS` variantIds ARE NOW WIRED (2026-05-23 by PM_ARCHITECT) — `FLEX_TOPUP_PRODUCT_READY` is true, Add Funds tiles are LIVE.** The "CSA Farm Flex Top-Up" Shopify product (gid 8763606728857) was created with 4 variants: $50 (47841200046233), $100 (47841222951065, highlight), $250 (47841222983833), $500 (47841223016601). `FLEX_TOPUP_PRODUCT_READY` (every().variantId set) gates the UI: false → calm "coming soon" card; true → live tiles. (Was BLOCKED earlier — no Shopify Admin token in this build env; SHOPIFY_ACCESS_TOKEN/SHOPIFY_STORE_NAME are Vercel-only — so PM created it. To create Shopify products from a script the shell needs SHOPIFY_ACCESS_TOKEN exported; it is NOT persisted locally.)
- **How to apply:** to create Shopify products from a script, the shell needs `SHOPIFY_ACCESS_TOKEN` exported (the Python migrate-csa scripts read it from os.environ); it is NOT persisted locally.
