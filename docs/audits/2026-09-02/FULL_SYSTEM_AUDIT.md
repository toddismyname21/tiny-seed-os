# CSA Portal — Full System Audit (2026-09-02)

Commissioned by Todd after the 9/2 wrong-oracle incident ("I want a full audit of the
entire csa.tinyseedfarm system. I want proposals for updates. I want bugs weeded out,
and I want the latest gap research").

Five audit tracks: roster/cycle, flex/money, comms/campaign, security, feature gaps.
Detailed reports live beside this file. PM spot-verified the highest-stakes claims
directly against code before inclusion (flex_orders RLS policies, refund absence,
track.astro gate — all confirmed real).

---

## A. FIX IMMEDIATELY — live money/product loss (before the next flex window opens)

| # | Bug | Evidence | Impact |
|---|-----|----------|--------|
| A1 | **Free-food RLS hole**: members can INSERT/UPDATE `flex_orders` directly (ownership check only — no price, stock, status, window validation). Payment lives only in the API layer, so a direct REST write = packed & delivered product, $0 charged. | `0031_csa_operations.sql:374-395`; verified | CRITICAL — exploitable with a browser console today |
| A2 | **Cancel/skip keeps the member's money**: orders debit Shopify store credit at placement (Todd 6/18 change), but `cancel_flex_order` + skip never refund. Members who cancel LOSE the full order value, invisibly (no ledger row). | `0038:83-107`; only store-credit movers are submit/sync/market-checkout — verified | CRITICAL — members being harmed now |
| A3 | **`place_flex_order` trusts caller balance**: `p_balance_cents` is client-supplied; debit happens after, outside the transaction; no window check inside RPC. Direct RPC call = free pending (packable) order. | `0037` + `20260901112500` | CRITICAL |
| A4 | **`cancel_flex_order` still requires share_type='flex'`** — store-credit members (post-9/1 fix) can place orders they can never cancel/skip. | `0038:78-80` | HIGH |
| A5 | **Vacation-week counter disagrees with the app**: `_vacation_member_weeks_in_range` (0051) ignores `cadence` (pre-0073 logic) + carries a frozen season map. Weekly members with stray A/B tags get mischarged vs. what the page shows. Runs on every vacation request. | `0051:74-155` vs `cycle.ts:334` | CRITICAL |
| A6 | **Track My Box lies to off-week members**: fallback renders "Your box arrives Wednesday" gated only on status — no on-week/hold/season check. Mirror image of the 9/2 incident. | `track.astro:241-269`; verified | HIGH |

## B. STRUCTURAL — the "one question, one oracle" program

| # | Item | Action |
|---|------|--------|
| B1 | `members_receiving_on_date` (0021) — the 9/2 incident function; zero app callers; `ROUTING_ENGINE_SPEC.md:27` still recommends it | DROP + fix spec |
| B2 | `member_flex_balance` view joins on `member_id`, but every credit is written email-only → produced −$5.00 / −$232.50 phantom balances | Redefine on email or drop; admin page reads `getFlexBalance()` (Shopify) like members do |
| B3 | Split-brain money model | **Canon: Shopify store credit = balance; `flex_transactions` = append-only journal.** Backfill member_id, trigger-resolve on insert, EVERY movement writes a journal row (market checkout + cancel + admin credit currently don't), nightly Shopify-vs-journal drift reconciler |
| B4 | Missing flex lock job — `locked` is written by nothing; 72/73 orders pending; dead branches in cycle.ts/flex-order.astro | Add `/api/cron/flex-lock` (pg_cron, Mon+Thu 07:05 ET) — also the enforcement point for Todd's Tue/Wed closure directive |
| B5 | Cutoff design: weekend-market members get Thu-7AM cutoff even when they hold Tue/Wed shares; page silently rolls week forward; `WEEK_EXTENDED_TUE` hack still live | Cutoff derived from the order's fulfillment RUN, not pickup day; explicit delivery date in confirmation email; replace hack with `portal_settings` override |
| B6 | Off-roster invisibility: paid flex orders from members without a box that week print NOWHERE (harvested, picked, then orphaned — cost Laura's $77.50 order) | `resolveCycle` gains a `flex_only` bucket; "Flex only — no box" section on pack-sheet/manifest/labels; nightly assertion: every flex order row must appear on a sheet |
| B7 | Python senders (`send_member_campaign.py`, `send_all_member_emails.py`) resolve audiences with raw status/share queries — no parity/hold/season gate | Scripts must consume a resolveCycle-produced recipient file; refuse otherwise |
| B8 | Divergent-oracle CI guard | Grep-based CI: fail on new `% 2` week math / `biweekly_week` comparisons / members-roster queries outside cycle.ts+schedule.ts |
| B9 | Dead code with live comments: `csaDistDates` (already drifted — 3 of 4 pickup days), `upcomingMondayET` duplicate | Delete / re-export |
| B10 | Missing constraint: `cadence='weekly'` rows can carry stale `biweekly_week` (Shopify sync never clears it) — fuel for A5-class bugs | `CHECK (cadence='biweekly' OR biweekly_week IS NULL)` + data cleanup |
| B11 | `box_swap_events` same direct-write RLS pattern (no money, but fabricatable swap approvals) | RPC-only writes |
| B12 | `unsubscribe_member_by_email` granted to `anon` — token check bypassable via direct RPC | REVOKE from anon/authenticated |
| B13 | Store-credit debit failures swallowed (`submit.ts:236-238`) — order stands, no charge, promised "backfill" doesn't exist | Build the reconciler or fail the order |
| B14 | `isFlexFundsTitle` matches any product containing "flex" | Match productType/variant allowlist |

## C. CONFIRMED CLEAN (verified, not assumed)
- Admin gating: every /admin page + API route properly gated (middleware `resolveOpsRole`, `requireAdmin`); crew least-privilege role correct
- Cron routes: all bearer-gated with CRON_SECRET
- Secrets: none in src; .env never committed; astro:env client/server split correct
- No XSS found; escapeHtml discipline present
- Household sharing + prior IDOR fixes (0053) hold
- Wholesale ordering follows the correct RPC-only pattern (flex should copy it)
- TypeScript runtime path is single-oracle: 236 references, all funnel through resolveCycle

## D. FEATURE GAPS (2026 landscape — full report: audit-gaps.md)
1. **Season-end self-service renewal flow** — #1 remaining gap; every platform has it; direct revenue timing (build: M)
2. SMS: fix or formally retire (Twilio never worked; admin tooling implies capability)
3. Order/receipt history: verify history.astro/track.astro surface Shopify + flex journal cleanly
4. Gift shares: seasonal Nov–Jan ask; build only on demand (S)
5. Mid-season proration: only if paid-subscription model ever added
- **Do NOT build:** AI/ML box personalization (GrownBy's still beta after ~2 yrs), free build-a-box, multi-farm marketplace
- Platform cost avoided by self-hosting: ~$150–400+/mo at our size; none support Farm Flex natively
- Own-the-stack is a marketable stability story (Harvie closed 2024, Farmigo pivoted)

## E. CRON INVENTORY (both schedulers, verified live)
Vercel: flex-list-reminder (Thu), vendor-bills (daily). pg_cron: 12 active jobs
(shopify-sync ×2, nightly-health, chef/flex reminders, standing-orders, harvie-ingest,
wholesale lists ×2, fresh-sheet ×2, invoice-reconcile). MISSING: flex lock (B4),
Shopify-vs-journal reconciler (B3), roster-vs-sheet assertion (B6).

## F. PROPOSED EXECUTION ORDER
1. **Tonight/tomorrow AM (before Thursday flex open): A1 (revoke RLS), A2 (refund on cancel/skip), A4, A3-minimal (window check + reject direct-call orders), B12** — one migration batch + one API change
2. This week: A5, A6, B1, B2, B6 (off-roster bucket), B4 (lock cron incl. Tue/Wed closure)
3. Next week: B3 (money canon + reconcilers), B5 (run-based cutoffs), B7, B10
4. Backlog: B8-B9, B11, B13-B14, D1 (renewal flow), D2 (SMS decision)

## G. COMMS TRACK (appended — full report: audit-comms.md)

**Measured truth of the 8/29 campaign** (agent diffed campaign_recipients vs a real resolveCycle run):
152 sent → 91 matched their actual Wednesday; 23 receive on other days (Sat/Tue/Sun); **38 received
nothing that week** (35 biweekly-off B, 3 vacation holds); 26 flex-only members got box copy for a box
that doesn't exist for them; **26 members who WERE receiving got no email** (17 outside the share-type
filter, 9 with no member_preferences row). PM correction: the earlier "209 receiving / 126 reached"
figures came from the broken RPC and are retracted.

| # | Finding | Severity |
|---|---------|----------|
| G1 | **Two weekly-box senders exist**: the cycle-aware one (`api/admin/weekly-email/send.ts`, uses resolveCycle) has NEVER been used (email_log = 0 rows); the one actually used (`campaign.ts`) has no cycle awareness at all | ROOT CAUSE of 8/29 |
| G2 | **CAN-SPAM exposure**: campaigns with opt-in unchecked apply NO opt-out filter — mails members who explicitly unsubscribed (`campaign.ts:306-320`, also renewal segment) | HIGH/legal — one-line fix |
| G3 | **44 of 281 active members have no member_preferences row** → invisible to every opt-in send AND unsubscribe silently no-ops for them (RPC only UPDATEs). Fix send-side + upsert-unsubscribe TOGETHER | HIGH |
| G4 | Existing send guard compares COUNTS not MEMBERSHIP — passed cleanly on 8/29. Build `campaign-reconcile.ts` roster-diff gate (fail closed) + `receiving_this_week` segment kind backed by resolveCycle | HIGH |
| G5 | Five member-facing send paths never log to member_comms (weekly email, flex confirmations, flex reminder, household invites, ALL arrival texts) — arrival texts leave no record at all (sms: deep links) | MED-HIGH |
| G6 | Resumed multi-day campaigns don't re-check opt-out | LOW-MED |
| G7 | Orphaned live endpoint friday-list-reminder.ts (unscheduled by 0082) — delete; invoice-reconcile + vendor-bills have no heartbeat (can't prove they run); wholesale cron names inverted vs schedules | MED |
| G8 | chef_reminder_enabled=false since 8/10 — deliberate? Needs Todd confirmation | ASK TODD |

**Cross-track correction to B4:** comms is right that the cutoff is enforced at request time and
`pending` is packable — nothing is operationally frozen by a lock. So B4 becomes a DECISION:
(a) add a real lock cron for freeze semantics + DB-level Tue/Wed closure, or (b) formally retire
`locked` and its dead branches. Either — not the current half-state. **Laura's Tuesday pack miss is
therefore STILL UNDIAGNOSED** (she was on-roster with a pre-cutoff order): ask whoever packed
Lawrenceville Tuesday whether the pack sheet was consulted.

## H. FINAL EXECUTION ORDER (supersedes F)
1. **Batch 1 — before Thursday flex open:** A1 (revoke flex_orders member RLS), A2 (refund on cancel/skip), A3-minimal (window check in RPC), A4, B12, **G2 (opt-out exclusion)**
2. This week: A5, A6, B1, B2, B6, G3 (preferences backfill + unsubscribe upsert, together), G4 (receiving_this_week segment first, gate second)
3. Next week: B3, B5, B4-decision, B7, G5 (comms logging, arrival texts first)
4. Backlog: B8-B11, B13-B14, G6-G7, D-list (renewal flow #1)
5. Ask Todd: G8 (chef reminder off?), Laura Tuesday-pack question, B4 lock-vs-retire

— PM_Architect, 2026-09-02. All five tracks complete. Key claims spot-verified.
