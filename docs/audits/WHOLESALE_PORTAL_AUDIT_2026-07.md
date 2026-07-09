# Wholesale (Chef) Portal — Deep Functionality + Gap Audit

**Date:** 2026-07-09 (Thursday) · **Auditor:** Claude (read-only; code + live prod queries)
**Scope:** `apps/csa-portal` wholesale system (Astro + Supabase + Vercel, live at csa.tinyseedfarm.com)
**Owner goal:** "Get the wholesale portal working, and make sure we get a list out for each order period every week."

Every number below was pulled from production on 2026-07-09 via read-only SQL (Supabase Management API) or a live page fetch. Nothing was written or submitted.

---

## Executive Summary

The chef ordering portal **works** — the token page renders (HTTP 200, ~40 active products with photos, tier pricing, one-tap reorder, sticky cart), the submit path re-prices server-side, confirmation emails BCC Todd, and 6 chef/standing orders totaling ~$1,940 flowed through it for this week's Wednesday (2026-07-08). The Monday chef reminder is live and armed (46 reminder emails sent 2026-07-06).

**The core ask — "a list out for each order period every week" — is not automated.** What exists is a reminder *to Todd* (Mon 3:30 PM, Friday list) and a bare "orders close Tuesday" nudge to chefs (Mon 9:05 AM, Wednesday period, no product list). The actual availability list is still a manual Gmail send by Todd, with no product content, no per-chef token link, and nothing at all for the Friday period going to chefs automatically.

**Three things need attention before next Monday:**
1. **The standing-orders pg_cron job has NEVER fired.** This week's standing orders were generated *manually* (created 2026-07-06 13:47 UTC — the cron slot is 10:00 UTC, and `cron.job_run_details` retains runs back to May 21 with **zero** rows for `csa-standing-orders`). The migration was applied after Monday's slot; first real fire is Mon 2026-07-13. If it silently fails, the exact "66# missing spring mix" incident it was built to prevent recurs.
2. **The Friday order period is invisible to chefs.** There is no Wed/Fri choice on the order page — Friday is only reachable via a `?day=fri` link nobody sends automatically. Exactly **1 Friday-delivery order has ever been placed** (Della Terra, $170.50, for 2026-06-26).
3. **Cutoffs are display-only.** Fetched live today (Thursday, *after* the Thu 7 AM Friday cutoff): `?day=fri` still sells delivery for *tomorrow* (Friday, July 10) while displaying "Edit until Thursday 7 AM." Nothing server-side enforces either cutoff.

---

## 1. Chef Experience Findings

Verified live with a real token (`SELECT order_token … LIMIT 1`; no order submitted).

### What works well
- **`/order/<token>`** (`src/pages/order/[token].astro`, 632 lines): resolves account server-side by permanent token, tracks visits (`bump_wholesale_visit` RPC), renders a category-grouped catalog with library-first photos, tap-to-enlarge lightbox, quality notes, sale strike-through pricing, +/− steppers, sticky cart bar, soft minimum-order warning. Genuinely mobile-first (44px touch targets, safe-area padding).
- **"Reorder last week"** hero prefills the cart from the latest non-cancelled order, filtered to still-active products at today's prices.
- **Submit** (`src/pages/api/order/submit.ts`): CSRF check, Zod validation, server-computed delivery date, `place_wholesale_order` RPC does the server-side price lookup + tier discount (never trusts client prices), atomic write.
- **Confirmation email** (`src/lib/wholesale-order-email.ts`): itemized, fail-soft, to every contact flagged `receives_orders` (fallback legacy email, fallback owner-only), BCC `tinyseedorders@gmail.com` + `todd@tinyseedfarmpgh.com`, reply-to the monitored inboxes.
- **Chef self-service** (`/order/<token>/account`): contact info, delivery hours/instructions, and multi-email routing (`receives_orders` / `receives_invoices`) — no login needed.
- Live fetch confirmed: HTTP 200, "Delivery **Wednesday, July 15** · Edit until Tuesday 7 AM", 41 product rows.

### Gaps / bugs
| # | Finding | Evidence |
|---|---------|----------|
| C1 | **No Wed vs Fri choice.** The page shows exactly one period. Friday exists only via `?day=fri` in the URL — a chef can never discover it. | `[token].astro:89` — `isFriday = url.searchParams.get('day') === 'fri'`; no toggle rendered |
| C2 | **Cutoff not enforced.** Fetched today (Thu 7/9, past the Thu 7 AM cutoff): `?day=fri` offers "Delivery **Friday, July 10**" (tomorrow) with the already-passed "Edit until Thursday 7 AM". `place_wholesale_order` (migrations 0050/0079) checks only `is_active` — no date/cutoff validation. | Live fetch; `0079_edit_any_wholesale_order.sql:182` |
| C3 | **Friday confirmation screen shows the Wednesday cutoff.** `confirmed.astro` imports only `CUTOFF_LABEL` ("Tuesday 7 AM") and hardcodes it at line 146 — wrong for Friday orders. | `src/pages/order/[token]/confirmed.astro:13,146` |
| C4 | **Friday mode lost on soft error.** `backToOrder()` in submit.ts redirects to `/order/<token>?error=…` without `&day=fri` — after a hiccup the chef lands back in Wednesday mode. | `submit.ts:46-48` |
| C5 | **`available_qty` is decorative.** Neither the chef page query nor the RPC filters/decrements it — a product marked qty 0 stays visible and orderable. (Today 0 active products have qty 0, so no live harm; 8 products carry a qty value.) | `[token].astro:124-133`; RPC checks `is_active` only |
| C6 | **Chefs cannot edit or cancel their own order.** The email says "reply to this email to edit" — every change is a manual Todd action (admin `orders/new?edit=` path exists, migration 0079). | Design decision, but worth naming as friction |

## 2. Availability Management

- **Board:** `/admin/wholesale/products` (629 lines) — flex-style ON/OFF toggles, inline edit (price/qty/category/unit/sort/description), one-tap product-photo upload (`/api/admin/wholesale/photo` → auto-submit), "Today's quality update" (photo + note, `wholesale_product_updates`, week-keyed).
- **On/off = `is_active`**, which is the single source of truth for what chefs see. Out-of-stock mid-period = Todd flips the toggle; already-placed orders keep the item (correct); but there is **no notification** to chefs who ordered an item that later went off.
- **Freshness:** products last touched **2026-07-03** (6 days before audit). There is no "list last updated" signal anywhere — not on the chef page, not on the admin hub, not in any email.
- **Quality updates have never been used:** `wholesale_product_updates` has **0 rows ever**. The feature Todd's board calls "the differentiator chefs actually want" is unused.
- **Photos:** 18 of 38 active products have **no photo** (fall back to a category emoji): Parsley, Arugula, Kohlrabi, Little Gem, Farmers Choice Head Lettuce, Ruby Kale, Something Fresh, Broccoli, Green Cabbage, Golden Beets, Radicchio, Rosemary, Summer Squash, Cucumbers, Dill, Red Radishes, Wild Arugula, Broccolini.
- Pricing health is fine: 0 active products with null/zero price.

## 3. Weekly Comms Loop — Current vs Needed

### What exists today (all verified live in prod)
| When | What | Audience | Status |
|------|------|----------|--------|
| Mon 06:00 ET | `csa-standing-orders` pg_cron → `generate_standing_orders()` for Wednesday | (DB only) | Scheduled, **never fired yet** (see §4) |
| Mon 09:05 ET | `csa-chef-order-reminder` → "orders close Tuesday 7 AM" + token link | Every tokened chef account that hasn't ordered for Wed (46 sent 7/6) | **LIVE + armed** (`chef_reminder_enabled='true'`) |
| Mon 15:30 ET | `csa-friday-list-reminder` → "Send the Friday wholesale list" | **Todd only** (sent 7/6, logged) | LIVE |
| Ad hoc | "Wholesale Availability" Gmail sends | Chefs | **Manual, by Todd** |
| Thu 11:00 UTC | Vercel cron `flex-list-reminder` | Todd (flex, not wholesale) | LIVE |

`notification_log` confirms: `chef_order_reminder` 46 sent (last 2026-07-06 14:58 UTC), `friday_list_reminder` 1 sent. **No availability-list email type exists** (`all wholesale-ish notification_types` = exactly those two).

### The gap
There is **no automated per-period availability email to chefs** — the owner's core ask. The Monday chef reminder contains *no products, no prices* — just a deadline and a link. The Friday period gets *nothing* chef-facing at all; it depends entirely on Todd acting on his 3:30 PM reminder.

### What an automated "list is open" email needs (design notes)
1. **Content:** active products grouped by category (name, unit, price — flat list price is fine: the only pricing tier is "Standard" at 0% discount, so per-account price rendering is currently a no-op), the chef's personal `/order/<token>` link (`?day=fri` for the Friday send), the correct cutoff label, and optionally the week's quality notes/photos.
2. **Send moments (two per week):**
   - **Wednesday period:** Sun evening or Mon ~8:30 AM ET (before the 9:05 reminder — or *replacing* it, see dedupe).
   - **Friday period:** Tue evening or Wed morning ET (cutoff Thu 7 AM). Todd's manual sends have been ad hoc; confirm his preferred moments before arming.
3. **Dedupe with the existing Monday reminder:** simplest is to make the availability email *the* Monday touch (it includes the deadline) and retire the bare reminder, or keep the reminder but restrict it to accounts that received the list and still haven't ordered by Monday. Do not send both a list and a bare reminder within 30 minutes.
4. **Recipients:** same resolution as the reminder — `resolveOrderRecipients(contacts, account.email)`, skip vendor accounts (Harvie / Market Wagon), skip `TEST_EXCLUDES`, log per-account to `notification_log` with a new `notification_type` (e.g. `chef_availability_wed` / `chef_availability_fri`), gate behind a `portal_settings` flag Todd arms.
5. **Opt-out:** **none exists today** — confirmed. Chef emails carry no unsubscribe link. Partial mitigation: chefs can unflag `receives_orders` on contacts via `/order/<token>/account`, but the UI requires at least one contact to keep it. Add a one-line footer: "To stop these emails, reply 'stop'…" or wire an opt-out flag on `wholesale_accounts` honored by both crons. (B2B relationship emails are low CAN-SPAM risk, but 50+ recipients weekly deserves an exit.)
6. **Infrastructure choice: plain Resend loop, NOT `lib/campaign`.** The campaign system is keyed to `customers`/members (`campaign_recipients.customer_id`, `newsletter_opt_in`, member unsubscribe HMAC) — chefs are `wholesale_accounts` and don't fit without schema surgery. `chef-order-reminder.ts` is the proven template: cron endpoint + CRON_SECRET + `portal_settings` gate + Resend loop + `notification_log`. Volume (≈50/period) is fine under Resend limits.
7. **Freshness guard:** refuse to send (and alert Todd instead) if `max(wholesale_products.updated_at)` is older than N days — never mail a stale list.

## 4. Standing Orders (migration 0075)

**What it built:** `standing_orders` table (account × product recurring line, `active` flag, `delivery_dow` default Wed), `generate_standing_orders(target_date)` SECURITY DEFINER function that materializes active rows into real `wholesale_orders` (source='standing') with per-(account,date,product) dedup, and pg_cron `csa-standing-orders` Mon 10:00 UTC targeting that week's Wednesday. Seeded 4 rows — all King Spring Mix @ $10/lb: Mediterra 50 lb, Butter Joint 10 lb, Cafe Verde 6 lb, Black Radish 10 lb. All 4 still active in prod.

**Does it work?**
- The *generator* works: 2026-07-08 has standing orders for Mediterra ($1,200 — generated at $500 then admin-edited on 7/7 to add 30 lb Arugula + 40 lb Petite Kale Mix), Butter Joint ($100), Cafe Verde ($152 — edited up from $60). Dedup worked: Black Radish had an email-sourced order containing the product, so no standing duplicate was created.
- The *cron has never fired*: `cron.job_run_details` retains history to 2026-05-21 (35 runs logged for `csa-nightly-health`) and has **zero rows** for `csa-standing-orders`. The 7/8 rows were created 2026-07-06 **13:47 UTC** — 3h47m after the 10:00 UTC slot, i.e. a manual invocation right after the migration was applied. **First scheduled fire: Mon 2026-07-13 10:00 UTC. Verify it.** Earlier "standing" rows (6/24: $500; 7/1: 3 orders/$660) were created manually before the migration existed (created_at 6/23 and 6/29 predate the 7/6 migration).
- **Pack surfaces:** yes — `/admin/wholesale/pack`, `/orders`, `/labels`, and the hub are all keyed on `wholesale_orders.delivery_date` regardless of `source`, so standing orders appear everywhere, with a source badge on the orders page.

**Gaps:**
- **No admin UI.** `standing_orders` is service-role-only with zero app code touching it (grep confirms). Adding/pausing/changing a standing order = SQL. Todd cannot manage them.
- **Wednesday-only.** `delivery_dow` exists but the cron hardcodes the Wednesday target; a Friday standing order can never auto-generate.
- **No run confirmation.** Pure-SQL cron; if it fails, nobody is told. A cheap guard: nightly-health (or the Monday ops page) should check "standing orders exist for this Wednesday by Mon 8 AM."

## 5. Account Lifecycle

Prod (2026-07-09): **56 accounts** · 56 with token · 52 with email · 49 with `pricing_tier_id` · 7 with phone · 48 with contact rows (64 contacts) · 18 have ever visited their portal · **10 have ever ordered**.

- **`status` is dead weight:** 55 'draft' / 1 'active'. Code deliberately ignores it (the reminder cron comment documents why); only 'paused' does anything (404s the link). Either use it or drop it from UIs.
- **Pricing tiers are a no-op:** exactly **1 tier ("Standard", 0% discount)**. 49 accounts point at it; 7 point at nothing — and both cases produce identical prices. Tier assignment "coverage" is a non-issue until a real tier exists.
- **Onboarding a new chef is entirely manual:** `/api/admin/wholesale/account-save` only UPDATEs (0 inserts); no admin "add account" form exists anywhere; tokens are only auto-minted by the PDF vendor importer. New chef = SQL insert + hand-composed welcome email. No welcome-email template exists.
- **Dead accounts:** 46/56 have never ordered; 38 have never even opened their link. The engagement funnel (`/admin/wholesale/orders`: Emailed → Visited → Ordered) surfaces this but there's no follow-up play (re-invite, call list, archive).
- 4 accounts have no email (Preview Kitchen, North Hills Community Outreach, St. Ferdinand, Harvie) — fine (test/vendor/community rows), but they'll show as "skipped_no_recipient" forever.

## 6. Data Health (prod numbers, 2026-07-09)

| Metric | Value |
|--------|-------|
| Orders (all time / last 30d) | **19 / 19** (system is ~1 month old) |
| By source | standing 7 · chef_portal 4 · phone 3 · email 2 · harvie 1 · null 2 |
| Wednesday vs Friday deliveries | **17 vs 1** (plus 1 Monday Harvie PO) |
| Only Friday order ever | Della Terra, 2026-06-26, $170.50, source chef_portal (placed 6/24) — so **`?day=fri` tooling demonstrably works end-to-end, used once** |
| This week (Wed 7/8) | 6 orders ≈ $1,940 (Mediterra 1,200 · Della Terra 217.50 · Black Radish 212 · Cafe Verde 152 · Butter Joint 100 · ShuBrew 58.50) + Harvie $272.50 (Mon 7/6) — consistent with pack surfaces (all date-keyed) |
| Products | 47 total, 38 active, 0 missing price, **18 missing photo**, 0 active at qty 0, last update 2026-07-03 |
| Quality updates | **0 ever** |
| Chef reminder | 46 sent Mon 7/6 (armed); Friday-list reminder to Todd: sent Mon 7/6 |

## 7. Up-to-Date Check

- **`astro check`:** 3 wholesale files carry **type errors** from a stale generated `src/lib/database.types.ts` — `/admin/wholesale/index.astro:31` and `/admin/wholesale/orders/index.astro:58` ("column 'portal_visit_count' does not exist" — it DOES exist in prod, types are stale) and `/admin/wholesale/labels/index.astro:101` (missing items↔products relation). Runtime is unaffected (live pages 200), but regenerate the types to restore type safety.
- **Stale copy:** hub subtitle always reads "order cutoff Tuesday 7 AM" even when a Friday date is selected (`admin/wholesale/index.astro:71`); `confirmed.astro` hardcodes the Tuesday cutoff (bug C3); `wholesale-order.ts:14` comment "through Jul 1 2026 delivery is Wednesday" is expired.
- **Dead links:** none found — hub's 7 tool links all resolve to real pages.
- **Adjacent doc bug (noting only):** migration 0074's comment for `csa-flex-order-reminder` claims "Monday 9:10 ET" but schedules `5 21 * * 0` = **Sunday 21:05 UTC (5:05 PM ET)**. Live cron matches the wrong-commented schedule.

## 8. Gaps Ranked by Value / Effort

| # | Gap | Value | Effort | Note |
|---|-----|-------|--------|------|
| 1 | **Automated availability-list email per order period** (Wed + Fri variants; products + prices + token link + right cutoff; `portal_settings`-gated; plain Resend loop cloned from chef-order-reminder) | ★★★★★ | M (~1 day) | The owner's ask. Retire/merge the bare Monday reminder to dedupe |
| 2 | **Verify `csa-standing-orders` fires Mon 7/13** + add a "standing orders present by Mon 8 AM" health check | ★★★★★ | XS | Never fired; the failure mode is exactly the 66# incident |
| 3 | **Wed/Fri period picker on the chef page** (+ fix C3 Friday cutoff on confirmed screen, C4 day-loss on error redirect) | ★★★★ | S | Friday period is currently undiscoverable; 1 Friday order ever |
| 4 | **Server-side cutoff enforcement** in `place_wholesale_order` (reject/roll orders past Tue-7AM / Thu-7AM for the target date) | ★★★★ | S | Today a Thursday-night `?day=fri` order sells next-morning delivery |
| 5 | **Standing-orders admin UI** (list/toggle/qty/add, incl. Friday `delivery_dow` support in the generator) | ★★★★ | M | Currently SQL-only; Todd can't manage his own recurring orders |
| 6 | **New-chef onboarding** (admin "Add account" → token mint → welcome email with the link) | ★★★ | S–M | Today it's a SQL insert; blocks growth |
| 7 | **Chef opt-out** + footer on bulk chef emails | ★★★ | S | None exists; 46–50 emails/week |
| 8 | Photos for the 18 photo-less active products | ★★★ | S (field work) | Photos sell; board upload flow already exists |
| 9 | Regenerate `database.types.ts` (clears the 3 wholesale type errors) | ★★ | XS | `supabase gen types` |
| 10 | Enforce or remove `available_qty` (and "item went off after you ordered" notice) | ★★ | M | Decorative today; misleading admin field |
| 11 | Freshness signal ("list updated <date>") on chef page + emails; block stale-list sends | ★★ | S | Pairs with #1 |
| 12 | Quality-update habit (or drop the feature) | ★★ | — | 0 uses ever; it's Todd-behavior, not code |

## 9. Proposed Weekly Cadence

Target end-state: **every order period opens with a list in chefs' inboxes, closes with orders on the pack sheet, and nothing depends on Todd remembering.**

| When (ET) | Action | Owner | Status |
|-----------|--------|-------|--------|
| **Sun evening / Mon 8:30 AM** | **Availability email — WEDNESDAY period** (products, prices, token link, "closes Tue 7 AM") to all chef accounts | *NEW cron* | Build (#1) |
| Mon 6:00 AM | Standing orders auto-generate for Wednesday | pg_cron | Verify 7/13 (#2) |
| Mon 9:05 AM | Not-yet-ordered reminder (keep, but only if the availability email went out ≥ a few hours earlier; else merge) | cron (live) | Adjust (#1) |
| Mon 3:30 PM | Friday-list reminder to Todd → becomes a *fallback check* ("Friday list will auto-send Wed 8 AM — review products now") | cron (live) | Re-copy |
| Tue 7:00 AM | Wednesday cutoff — enforced in RPC | — | Build (#4) |
| Tue–Wed | Todd updates the board (photos/quality/on-off) for the Friday list | Todd | Habit |
| **Wed 8:00 AM** | **Availability email — FRIDAY period** (`?day=fri` links, "closes Thu 7 AM") | *NEW cron* | Build (#1) |
| Thu 7:00 AM | Friday cutoff — enforced in RPC | — | Build (#4) |
| Wed / Fri AM | Pick & pack / labels from `/admin/wholesale/pack?date=…` (already includes standing + imported orders) | Todd/crew | Works today |

Both new sends: gated behind `portal_settings` flags Todd arms after approving copy, logged per-account to `notification_log`, vendor/test accounts excluded, opt-out honored (#7), stale-list guard (#11).

---

*Method note: prod queries ran read-only through `scripts/migrate-csa/run_migration.py` / the Management API (`/tmp/wholesale_audit_q1–q7.sql`). Live chef page fetched with a real token in both modes; no order was placed, no data modified.*
