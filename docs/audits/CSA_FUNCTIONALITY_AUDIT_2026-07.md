# CSA Portal — Full Functionality Audit (2026-07-02)

**Scope:** `apps/csa-portal/` (Astro + Supabase + Vercel), live DB `melizsvabemhaqeaqtyw`, portal csa.tinyseedfarm.com.
**Method:** local build + unit tests, static route/contract/schema cross-checks, and **read-only queries against the production Supabase** (service-role key from `apps/csa-portal/.env`) plus one live Google Routes API call. No source code was modified.
**Legend:** ✅ verified working · ❌ verified broken · 🟡 built-but-dormant (code fine, no data/usage) · ⚠️ suspicious/unverified.

---

## 1. Executive Summary

The portal is in **substantially better shape than the known-traps list implies**. Build passes clean, all 12 unit-test files pass, both crons demonstrably ran today, Shopify sync is fresh (updated 11:30 UTC today), Resend is sending daily, and — new finding — **the Google Routes API block is RESOLVED** (live call succeeded with the key in `.env`).

**Verified broken / wrong right now (fix-worthy):**
1. **Dashboard count cards still wrong** (`src/pages/admin/index.astro`) — "Home deliveries" counts every active member with no pickup (line ~168–173) and "Unassigned Week A/B" counts every `biweekly_week IS NULL` member (line ~153–155). Both bugs from CSA_TODO 2026-06-08 are still in the code, unfixed.
2. **`/admin/route` auto-create seeds home-delivery stops without week parity** (`api/admin/route/index.ts:202-227`) — every active home-delivery member gets a stop, including biweekly members on their **off week** (no `resolveCycle`/`isMemberOnThisWeek` filter). The newer `/admin/route-plan` optimizer DOES apply parity (proven in CHANGE_LOG 2026-06-30: 16 raw → 13 after parity).
3. **13 TypeScript errors** in `astro check` (build still succeeds; they mark real schema drift — §5).
4. **`SOCIAL_CREDENTIALS.md` is committed to git and still not gitignored** (repo root; `git ls-files` confirms). CSA_TODO security item still open.
5. **Flex $15 minimum order — NOT built** (submit.ts only enforces `min(1)` line item, `api/account/flex-order/submit.ts:98`). Deduct-at-order and skip-without-order ARE built (TODO is stale on those).

**Dormant (built, deployed, zero usage in prod):**
- Box swap (0 rows in `box_swaps`, ever), email open-tracking (both `tracked_email_*` tables empty), recipes (0 rows), referrals (0 rows), member stop chat (`stop_messages` 0 rows), pack-load stop check-off (`pack_stop_status` 0 rows), pickup attendance (0 rows), vendor orders (table empty), `weekly_swap_menu` (empty).

**Orphaned:** `/admin/box-plan` — no nav link, writes `weekly_box_plan` which nothing reads anymore (superseded by `/admin/box-contents`; see trap a).

---

## 2. Build / Test Results

| Check | Result | Evidence |
|---|---|---|
| `npm run build` | ✅ PASS, 0 errors, 7.2 s | "Server built in 7.22s / Complete!". Only warning: local Node 25 unsupported by Vercel functions → runtime pinned to Node 24 (informational). |
| `npm run test:unit` | ✅ PASS (exit 0), 12 files | addon 16 ✓ · biweekly-assign 11 ✓ · box ✓ · campaign 9 ✓ · **cycle 47 ✓** · flex-order ✓ · pickup-from-variant 38 ✓ · schedule 33 ✓ · season 30 ✓ · stop-chat 11 ✓ · vacation-cascade ✓ · vacation 23 ✓ |
| `npx vitest run` | ⚠️ misleading — repo has **no vitest**; tests are plain tsx scripts (`package.json` → `test:unit` runs `npx tsx` per file). A stray global vitest 4.1.9 reports "No test suite found" ×21. Not a failure. | `src/lib/cycle.test.ts:4-5`: "No Vitest in this repo — run as a plain Node script" |
| `npx astro check` | ⚠️ **13 errors / 0 warnings / 44 hints** (pre-existing per CHANGE_LOG 2026-06-30; build unaffected) | Full list in §5 — all 13 are schema-drift or nullability casts |
| Playwright e2e | not run (requires live auth; smoke tests known disabled on auth redirect) | `tests/`, `playwright.config.ts` present |

`astro check` errors by file: `src/lib/cycle.ts:676` · `admin/wholesale/index.astro:31` · `admin/wholesale/orders/index.astro:58` · `admin/wholesale/labels/index.astro:80` · `api/admin/market/sign-edit.ts:64` · `api/admin/route/save-optimized.ts:50` · `api/admin/wholesale/account-save.ts:110,111` · `api/box/swap.ts:149` · `api/box/swap-undo.ts:104` (+3 dupes).

---

## 3. Route Inventory

All 38 form `action=` targets and all 27 client `fetch()` targets resolve to an existing file under `src/pages/api/` — **zero 404 endpoints**. Reachability from nav verified against `AdminShell.astro:74-149` (nav array) and `MemberShell.astro:144-155`.

### Member-facing

| Route | Status | Evidence |
|---|---|---|
| `/` `/login` `/auth/callback` `/logout` | ✅ WORKING | build; portal live, members sign in daily (member_comms, flex orders current week) |
| `/dashboard` | ✅ WORKING (feature gap) | pickup-day delivery widget exists (`dashboard.astro:363`); the requested 🟢GO/🔴NO off-week banner is **NOT built** (no off-week copy found) |
| `/box` | ✅ WORKING | Monday-key fix (`box/index.astro:69-79`), vacation-hold banner (2026-06-25 fix in file), share_type-bucket fix via `resolveBoxContentsBuckets`. Current week 2026-06-29 has box_contents rows (9 large + 7 small) → members see the box |
| `/box` swap UI | 🟡 DORMANT usage | wired end-to-end (`/api/box/swap` → `swap_box_item` RPC, contract verified §4) but **`box_swaps` has 0 rows ever** (live query) |
| `/account` + profile/preferences/pickup/household/refer/add-phone/confirm-pickup/biweekly-schedule | ✅ WORKING | all form actions exist; nav-linked |
| `/account/flex`, `/account/flex-order` | ✅ WORKING | debit-at-order implemented (`api/account/flex-order/submit.ts:181-197`); live `flex_transactions`: 46 debits/32 credits/7 refunds. Skip flow built (`flex-order.astro:322`, `flex-order/skip.ts`). Current-week flex_inventory: 44 items. **Gap: no $15 minimum** |
| `/account/vacation`, `/vacation/new` | ✅ WORKING | add-on cascade wired (`api/account/vacation/schedule.ts:277` → `cascadeVacationHoldToAddOns`) |
| `/onboarding/*` (5 pages) | ✅ WORKING | activate/contact/preferences APIs exist; flow interlinked |
| `/order/[token]` (+account/confirmed) | ✅ WORKING | wholesale chef token ordering; middleware public prefix `/order` (`middleware.ts:74`); live wholesale_orders through 2026-07-08 |
| `/stop-notes` | 🟡 DORMANT | page + `stop_messages` table live, **0 rows** in prod |
| `/unsubscribe` | ✅ WORKING | `unsubscribe_member_by_email` RPC typed + present |

### Admin — ops (all default to `currentDeliveryWeek()`, all resolveCycle-backed)

| Route | Status | Evidence |
|---|---|---|
| pack-day, pack-load, pack-sheet, pack-check, pick-pack, harvest, floral, labels, stop-manifest, host-sheets, share-contents, substitutions, text-stop | ✅ WORKING | all import `resolveCycle` (grep list §trap-b); all in AdminShell nav; box_contents populated for current week |
| pack-load check-off | 🟡 DORMANT usage | endpoints fine (`pack-load/note`, `/stop` contracts verified) but `pack_stop_status` = **0 rows** — crew never uses the tap-to-confirm |
| `/admin/box-contents` (Box editor) | ✅ WORKING | nav-linked; writes `box_contents` (the resolver's source) |
| `/admin/box-plan` (+`[...slug]`) | ❌ **ORPHANED / SUPERSEDED** | **no link anywhere** (grep: only self-references); writes `weekly_box_plan`, which `resolveCycle` no longer reads (cycle.ts:704-716). Live `weekly_box_plan` stops at 2026-06-22 while ops kept working = proof nothing depends on it |
| `/admin/route-plan` | ✅ WORKING | optimizer + Routes API verified live (§7); saves legs A/B via save-optimized; routable-toggle (mig 0062) |
| `/admin/route`, `/route/[id]` | ⚠️ WORKING code, low usage + bug | driver app; live routes exist (07-01 leg A, 21 stops) but `completed_stops`=0 on every route and 06-10 route still "in_progress" — driver flow not used to completion. Auto-create parity bug (§1.2) |
| `/admin/route-sheet` | ✅ WORKING | printable, resolveCycle |
| `/admin/index` (dashboard) | ⚠️ WORKING, 2 count cards wrong | §1.1 |
| members, members/[id], pickup-locations, notices, stop-notes | ✅ WORKING | notices: 10 open rows live; per-member forms all have endpoints |
| products, market, market-checkout, market/labels, market/price-list | ✅ WORKING | price-list/labels linked from `/admin/market` page. ⚠️ data note: `market_offerings` week 06-22 = 122 rows, current week 06-29 = **2 rows** — market list mostly not rebuilt this week |
| flex-inventory, flex-orders | ✅ WORKING | inventory populated weekly (28/29/45/44 rows); flex_orders current week: 48 pending |
| weekly-email, campaigns (index/new/[id]/templates) | ✅ WORKING | Resend live; 1 campaign sent (157 recipient sends in notification_log) |
| email-tracking (+[id]) | 🟡 DORMANT | deployed 06-30 (commit 5df4f5f) but `tracked_email_sends` and `tracked_email_recipients` both **empty** — no tracked send ever made |
| recipes | 🟡 DORMANT | page + API fine; `recipes` table 0 rows |
| reports | ⚠️ partial | active-members + churn CSVs fine; **pickup-attendance report reads a 0-row table** → always empty |
| sync | ✅ WORKING | shows sync state; `shopify_sync_state.updated_at` = today 11:30 UTC |
| health | ✅ WORKING | proxies nightly-health; 27 sent health emails in notification_log |
| vendor-orders (+slug) | 🟡 DORMANT | send endpoint + vendors seeded (Goat Rodeo etc.), `vendor_orders` table **empty** — never used |
| wholesale hub / orders / pack / labels / accounts / products / import | ✅ WORKING | orders through 07-08 in DB; products+import linked from hub cards (`wholesale/index.astro:62-64`); type-cast drift on 3 pages (§5) |

### API routes with no page caller (all intentional)
`/api/delivery-status` (kept as legacy alias — `api/delivery/today.ts:12-14`), `/api/cron/*` (scheduler-called), `/api/sync/shopify-orders` (pg_cron), `/api/admin/campaigns/webhook` (Resend webhook), `/api/track/o/[token].gif` (email pixel, public via `middleware.ts:74`).

---

## 4. API Contract Check (fetch/form body vs endpoint reads)

Spot-verified every JSON POST call site. **No mismatches found.**

| Caller → Endpoint | Fields sent | Endpoint reads | Match |
|---|---|---|---|
| `box/index.astro:804` → `api/box/swap.ts` | member_id, week_date, original_item, swapped_for | zod Body (swap.ts:63-70), RPC swap.ts:216-220 | ✅ |
| `box/index.astro:863` → swap-undo | member_id, week_date, original_item | undo RPC | ✅ |
| `pack-load/[...slug].astro:849` → pack-load/note | notice_id, action, week_starting | note.ts:62,67,98 | ✅ |
| `pack-load/[...slug].astro:876` → pack-load/stop | week_starting, stop_id, loaded, confirmed_count | stop.ts:58-80 | ✅ |
| `route-plan/index.astro:367` → optimize-route | stops, startSec | optimize-route.ts:34,56 | ✅ |
| `route-plan/index.astro:354` → route/save-optimized | route_date, leg, stops | save-optimized.ts:37-41 | ✅ (but `leg` untyped → §5) |
| `admin/index.astro:805,871` → biweekly/auto-assign | GET ?preview=1 / empty POST | auto-assign.ts:141 | ✅ |
| `campaigns/[id].astro:387` + `new.astro:914` → campaigns/send | campaign_id | send.ts:42 | ✅ |
| `weekly-email.astro:297-302` → weekly-email/send | FormData mode | send.ts:129-134 (formData) | ✅ |
| `price-list/[...slug].astro:232-235` → market/sign-edit | FormData (name, price_dollars, ajax) | sign-edit.ts:35 (formData) | ✅ |
| health.astro → health/run | empty POST (proxy) | run.ts proxies cron with server-side CRON_SECRET | ✅ |

Form actions (38): every `action="/api/..."` target exists on disk (diffed against `find src/pages/api`).

---

## 5. DB Schema Drift (code vs `database.types.ts` vs prod)

`database.types.ts` is **hand-maintained** (header: "MANUAL VERSION… will be regenerated"); real migrations live at repo root `supabase/migrations/` (58 files, through 0062). Drift found — each confirmed against prod or `astro check`:

| Drift | Where | Evidence |
|---|---|---|
| `delivery_routes.leg` missing from types | `api/admin/route/save-optimized.ts:50,55` (`as any` cast) | column EXISTS in prod (live query returned leg A/B rows); migration `0057_delivery_route_leg.sql`; astro-check error ts(2345) |
| `wholesale_accounts.portal_visit_count`, `last_portal_visit_at` missing from types | `admin/wholesale/index.astro:31`, `orders/index.astro:58` | migration `0056_wholesale_portal_visits.sql`; astro-check SelectQueryError casts |
| RPC `bump_wholesale_visit` not in types Functions | `order/[token].astro:68` | defined in migration 0056 |
| `vacation_holds.disposition` / `move_to_week` missing from the typed query in resolver | `src/lib/cycle.ts:676` (the "holds-fallback" error) | astro-check ts(2322); columns exist (make-good move-ins work per CSA_TODO Diane White) |
| `wholesale_order_items → wholesale_products` relation missing | `admin/wholesale/labels/index.astro:80` | astro-check ts(2352) |
| Legacy junk in `box_contents` | prod data | rows keyed `2026-01-19` with share_type "Friends-Family", "Seasonal-CSA", "Veggie-CSA", "Flower-Share", "Flex-CSA", "Petite-Bloom" (35 rows) — pre-migration seed data; harmless (resolver keys by week) but should be purged |
| Tables typed+used and confirmed present in prod | all 48 | every used table probed via REST; zero missing (earlier 400s were my column guesses, re-verified with `select=*`) |

**Recommendation:** run `supabase gen types typescript --project-id melizsvabemhaqeaqtyw` — would eliminate all 13 astro-check errors' root causes.

---

## 6. Known-Trap Status (a–e)

**a) box_contents vs weekly_box_plan dual-source — ✅ FIXED (single-source landed).**
`resolveCycle` now reads **only `box_contents`**: cycle.ts:27-32 ("the box composition served from the resolver is the LIVE plan, read from box_contents — the single source"), fetch at cycle.ts:704-716. `weekly_box_plan` is written only by the orphaned `/admin/box-plan` page and read by nothing else (grep). Prod proof: `weekly_box_plan` has no rows after 2026-06-22, yet week 06-29 ops pages resolve fine from box_contents (9 large + 7 small rows). Residue: `/admin/box-plan` should be deleted or archived to prevent someone "publishing" into a dead table.

**b) Raw member queries computing weekly counts without resolveCycle — 2 real offenders.**
34 files import resolveCycle (all ops pages + notices/flex/route-optimizer). Admin pages querying `from('members')` without it: index, members, members/[id], pickup-locations, reports, notices, market-checkout. Of these, only two compute **weekly-ish counts**:
- ❌ `admin/index.astro` — the two count cards (§1.1). Verified in code today.
- ❌ `api/admin/route/index.ts:202-227` — home-delivery route seeding, one stop per active member, **no A/B parity, no vacation-hold check** (§1.2).
The rest are member-roster/lookup views (assignment counts, not weekly recipients) — acceptable. Minor: `notices/index.astro:49` computes "thisWeekMonday" as `mondayOfWeek(upcomingMonday())`, which is **next** Monday on Tue–Sun (label drift only).

**c) /admin/route auto-create inaccuracy — MOSTLY FIXED, one gap.**
Rewritten (`api/admin/route/index.ts`): host stops are now **one per pickup_location** (no member duplication possible), farm pickup excluded (`isFarmPickup`, line 168), weekday-filtered from `pickup_locations.day_of_week` — so Oakmont is included as long as its row is active/Wed (data-dependent, code correct), and flowers/Week-A can no longer wrongly appear at host stops (member logic removed from host seeding). 409-guard prevents duplicate same-day routes. Remaining gap = the home-delivery parity bug (b). The two 06-24 "duplicate" routes are legit legs A + B (15 + 8 stops, `leg` column). Preferred path is now `/admin/route-plan` → save-optimized, which resolves members correctly.

**d) Box swap — LIVE in code, DORMANT in usage.**
Not dormant for the old reason: the box IS published to members (current-week box_contents rows exist; the share_type-bucket and Monday-vs-Wednesday key bugs are fixed in `box/index.astro:69-79`). Swap chain fully wired: page → `/api/box/swap` (zod, contract ✅) → `swap_box_item` RPC (typed, migration 0015) with pickup-day-aware cutoff + owner QA override. But **`box_swaps` = 0 rows and `box_swap_events` = 0 rows in prod** — no member has ever swapped. Also `weekly_swap_menu` table is empty/unused (swap options come from the page's baked JSON). The admin substitutions page was pre-wired to display swaps when they start (CHANGE_LOG 06-30).

**e) Week labeling / default-week gotcha — ✅ FIXED for execution tools.**
`currentDeliveryWeek()` (cycle.ts:1449-1466, added after the 2026-06-17 wrong-roster incident) stays on the current Mon–Sun week through Sunday; **all 16 execution pages** use it (pack-day, pack-load, pack-sheet, pack-check, pick-pack, harvest, floral, labels, stop-manifest, host-sheets, substitutions ×2, text-stop, route-plan, route-sheet — grep verified). Labels are date-ranges ("Week of Jun 8 – Jun 14", cycle-ui.ts:36-44). Planning tools (flex-inventory, box-plan, vendor-orders) intentionally keep `upcomingMonday()` (documented cycle.ts:1461-1462). Only cosmetic residue: `weekOptions()` anchors its 5-option list on `upcomingMonday`, and notices' "thisWeekMonday" label (see b).

---

## 7. Integration Status

| Integration | Status | Evidence |
|---|---|---|
| **Shopify sync** (`api/sync/shopify-orders.ts`, pg_cron 15-min) | ✅ WORKING | `shopify_sync_state.last_synced_at` 2026-06-30T22:58, `updated_at` **2026-07-02T11:30** (today, within 15 min of query); flex store-credit debits flowing (46 ledger debits) |
| **Resend email** | ✅ WORKING | notification_log: 27 nightly-health sends (daily 10:00 UTC streak through today), 157 campaign sends, 3 flex-list reminders — all `provider: resend, status: sent` |
| **Google route optimization** (`route-optimizer.ts`) | ✅ **UNBLOCKED / WORKING** — update the "BLOCKED on GCP" note | live `computeRouteMatrix` call with the `.env` key returned `{duration: 2036s, condition: ROUTE_EXISTS}` (farm→Pittsburgh). Key present as `GOOGLE_MAPS_API_KEY`; optimizer used to save 07-01 leg-A route |
| **Tracking pixel** (`api/track/o/[token].gif` + `stamp_email_open` RPC) | 🟡 DEPLOYED, UNUSED | middleware public prefix in place (middleware.ts:68-74), sender script exists (`scripts/send_tracked_email.py`), migration 0060 — but both tracked_email tables **empty**; `/admin/email-tracking` shows nothing |
| **Twilio** | 🟡 intentionally unused | `twilio` is in package.json deps but imported nowhere in src (grep); text-stop deliberately uses `sms:` deep links ("WHY sms: deep links (not Twilio): server-side SMS does NOT work in this…" — text-stop/index.astro:11). Dep is dead weight — removable |
| **Crons** | ✅ BOTH WORKING | `vercel.json` cron `/api/cron/flex-list-reminder` (0 11 * * 4) — path exists, CRON_SECRET-gated, **ran today 11:29 UTC** (Thu). `nightly-health` is scheduled by **pg_cron** (migration 0033, Vault secret), not vercel.json — ran every day 10:00 UTC incl. today. No orphan cron paths |

---

## 8. Redundant / Overlapping Features Map

**Box definition (member + ops):**
- `/admin/box-contents` — CURRENT editor → `box_contents` (resolver source). **Keep.**
- `/admin/box-plan` — legacy editor → `weekly_box_plan` (read by nothing). **Delete/archive** (orphaned; publishing here silently does nothing for ops OR members).
- `/admin/share-contents` — printable "what goes in each box" list (read-only view of the same data). Not redundant — different job (pack-floor printable).

**Pack tooling (5 pages, mostly complementary, one overlap):**
- `pack-day` — redirect-only day dashboard (THE landing Todd opens).
- `pack-load` — live interactive crew board (check-off, notes). Check-off unused (0 rows).
- `pack-sheet` — printable per-stop pack sheet + top-of-stop notices.
- `pack-check` — printable per-stop pack CHECKLIST. **Overlaps pack-sheet ~80%** (both per-stop printables of the same resolver data; candidates to merge).
- `pick-pack` — newest (commit 707cc45): printable harvest + per-market + CSA + wholesale generator, EN/ES. **Its harvest view overlaps `/admin/harvest`** — harvest could become a redirect into pick-pack.

**Routing (3 systems, 2 creation paths for `delivery_routes`):**
- `/admin/route-plan` (optimizer, legs A/B, save-optimized) — CURRENT.
- `/admin/route` + `/route/[id]` (auto-create + driver check-off app) — older; auto-create has the parity bug; driver check-off never completed a route in prod. The `[id]` driver VIEW is still what route-plan's "Open driver view" links to — keep the view, retire the auto-create button or fix its member seeding.
- `/admin/route-sheet` — printable; distinct job, keep.

**Email (3 senders, complementary):** weekly-email (member weekly, idempotent per week) · campaigns (ad-hoc audiences, tiptap editor) · scripts/send_member_campaign.py (out-of-band PM sends). Plus dormant email-tracking for 1:1 Gmail sends. No collision, but four ways to send mail is a training hazard.

---

## 9. CSA_TODO.md staleness check (items verified this audit)

| TODO item | Actual status |
|---|---|
| Flex must deduct at order | ✅ **DONE — stale** (submit.ts:181-197; 46 live debits; backfill script exists) |
| Skip = no empty submission | ✅ **DONE — stale** (skip.ts endpoint + "You're skipped" UX, flex-order.astro:322) |
| $15 flex minimum | ❌ **still open** (no minimum in submit.ts) |
| Member /box share_type mismatch (~30-min fix) | ✅ **DONE — stale** (resolveBoxContentsBuckets + Monday-key fix) |
| Vacation hold must cascade to add-ons | ✅ **DONE — stale** (vacation-cascade.ts, 490 lines + tests, wired at schedule.ts:277) |
| Sat-market members shown "Wednesday" | ✅ **DONE — stale** (pickup-day derived from stop day_of_week; pickupDateForWeek/title fix in box page) |
| GO/NO share-day banner | ❌ **still open** (pickup-day widget exists; no off-week "no box" state) |
| Dashboard count cards (home-delivery + unassigned A/B) | ❌ **still open — verified in code** |
| Shopify→Supabase paid-status sync | ❌ **still open** (no paid_status/needs_review anywhere in src) |
| Flex Phase 2 card overage | ❌ **still open** (no overage code) |
| SOCIAL_CREDENTIALS.md gitignore | ❌ **still open** (tracked in git, not ignored) |
| Nancy Bergman "can't see flex list" | likely resolved by data: flex_inventory now populated every week (28/29/45/44 items) — ⚠️ not verified per-stop |

---

## 10. Verification Notes / Limits

- Live-DB claims come from REST reads with the service-role key (counts, timestamps quoted above); no writes were made.
- Anything requiring an authenticated browser session (actual page renders behind admin auth) was verified at the code+data layer, not pixel level.
- `pg_cron` job definitions were verified via migrations + their observable output (notification_log), not by querying `cron.job` directly.

*Audit by Claude (Fable 5), 2026-07-02. Read-only.*
