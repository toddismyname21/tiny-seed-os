Audit complete. Here is the report.

---

# CSA Portal — Member Communications Pipeline Audit
**Date:** 2026-09-02 · **Scope:** `/Users/toddsmacbookpro2026/Documents/TIny_Seed_OS/apps/csa-portal` · **Method:** code read + live Supabase queries (read-only, service role)

## The headline

**There are two weekly-box senders. The cycle-aware one has never been used, and the one Todd actually uses has no cycle awareness at all.**

- `/Users/toddsmacbookpro2026/Documents/TIny_Seed_OS/apps/csa-portal/src/pages/api/admin/weekly-email/send.ts:234` calls `resolveCycle` and filters the audience to members actually receiving food that week. Its idempotency ledger, `email_log`, contains **zero rows** in production. It has never sent a single email.
- `/Users/toddsmacbookpro2026/Documents/TIny_Seed_OS/apps/csa-portal/src/lib/campaign.ts:246` (`resolveRecipientsRaw`) resolves recipients from `share_type` + `newsletter_opt_in` and nothing else. No biweekly parity, no vacation holds, no pickup day, no season window. This is the path the 8/29 send used.

Everything below follows from that one fact.

---

## 1. The 8/29 incident, measured

Campaign `f18ce464-b69b-4f38-91b8-69ab48ae9e61`, "Week of Sept 1 — box contents + flex list live", created Sat 2026-08-29 13:41 UTC, sent 14:34 UTC, 152 recipients, filter `{"share_types":["summer_veg","flex"],"newsletter_opt_in":true}`. Statuses: 151 delivered, 1 bounced.

I ran `resolveCycle(supabase, '2026-08-31')` — the cycle Monday for the Wednesday the copy named — and diffed it against `campaign_recipients`.

**resolveCycle for week 2026-08-31:** 194 receiving member rows across 140 distinct emails; 81 excluded biweekly off-week; 6 excluded on vacation hold; 0 out of season.

### Who got the "here's your Wednesday box" email

| Reality for that member | Count |
|---|---|
| Actually received on Wednesday | 91 |
| Received on Saturday | 16 |
| Received on Tuesday | 6 |
| Received on Sunday | 1 |
| **Received nothing at all that week** | **38** |

Only 91 of 152 (60%) got copy that matched their week. Twenty-three people were told "this Wednesday" about a share they collect on a Saturday, Tuesday, or Sunday.

The 38 who received nothing break down cleanly, and both causes are things `resolveCycle` already knows and `campaign.ts` never asks about:

- **35 were on their biweekly OFF week.** Every one is `cadence=biweekly, biweekly_week=B` while the 8/31 cycle was week A. Examples: `erinkpgh@gmail.com`, `dixitsb@outlook.com`, `dwhite131@gmail.com`, `beccamalena@gmail.com` — all `summer_veg:active:BIWEEKLY_OFF(bwB)`.
- **3 were on an active vacation hold**: `naomi.anderson1122@gmail.com`, `crystal.katie.miller@gmail.com`, `lilbit1370@yahoo.com`.

### The flex-only problem

**26 of the 152 recipients are flex-only members.** They hold no veg share. `box_contents` for week 2026-08-31 contains 16 rows, share types `large` and `small` only — there is no flex box. These members received box-contents copy describing a box that does not exist for them. Flex members order à la carte from the extras catalog.

### Who was missed

**26 members who WERE receiving that week got no email.** Two causes:

- **17 fell outside the share-type filter.** They are flower-share or add-on-only members — `cynthshea@yahoo.com`, `mollie.martini@gmail.com`, `procariolm@gmail.com`, `stephanieteres@gmail.com`, `klwallisch@gmail.com`, `anatomies@ymail.com` and 11 others. They receive a share that week; `summer_veg`+`flex` simply doesn't cover them.
- **9 have no `member_preferences` row at all.** `cyelenovsky412@gmail.com`, `alexiskuzel@gmail.com`, `mollie.rosenzweig@gmail.com`, `utz.ryan@gmail.com`, `cdmurakami@gmail.com`, `lbittel@icloud.com`, `ispx@protonmail.com`, `jenvanderplaats@gmail.com`, and `freetodd21@gmail.com` (a legitimate `TEST_EXCLUDES` entry, so 8 real misses).

That last one is a systemic hole, not a one-off. The opt-in query at `src/lib/campaign.ts:284-299` anchors on `member_preferences` with `members!inner`. **A member with no preferences row is invisible to every opt-in-gated send.** Live census: of 281 active member rows, **44 have no preferences row** and exactly **1** has `newsletter_opt_in=false`. So the "opt-in" filter is currently excluding 44x more people by accident than by choice.

> **Note on the numbers you gave me.** You said 209 receiving and ~126 reached. I measure 194 receiving member rows / 140 distinct emails, with 114 of the 152 overlapping the receiving set. I can't reproduce 209 or 126 from any query I ran; the difference may be a different week or a member-row vs. household count. Flagging rather than adopting.

### Remediation cost, from the record

`member_comms` shows the cleanup, all authored by `todd@tinyseedfarmpgh.com`:

- 2026-09-02 12:57 — 22 rows, "Emailed: correction — 8/29 campaign wrongly a[ddressed]…"
- 2026-09-02 15:29 — 23 rows, "URGENT correction #2 (9/2): morning 'no box'…"
- 2026-09-02 15:33 — 76 rows, "Emailed: green bean swap notice for today's b[ox]"

Roughly 45 apology emails and a same-day scramble, hand-logged.

---

## 2. Proposed campaign↔roster reconciliation gate

**Severity: high.** There is already a drift guard at `src/pages/api/admin/campaigns/send.ts:118-158`, but it compares **counts, not membership**. It re-resolves the audience and blocks if `|live − reviewed| > max(2, 5% of reviewed)`. On 8/29 it would have passed cleanly: the count was correct and stable. It cannot detect that the *right number of the wrong people* were selected.

The fix is to diff the audience against `resolveCycle` for a declared target week, and to make the target week an explicit, required property of any campaign that talks about a specific week.

### Files to change

**New — `src/lib/campaign-reconcile.ts`**

```ts
export interface RosterDiff {
  target_week: string;              // cycle Monday
  audience: number;
  receiving: number;
  matched: number;
  sending_not_receiving: Array<{ email: string; reason: 'biweekly_off' | 'vacation_hold' | 'out_of_season' | 'not_a_member' }>;
  receiving_not_sending: Array<{ email: string; reason: 'share_type_excluded' | 'no_preferences_row' | 'opted_out' }>;
  day_mismatch: Array<{ email: string; day: 'Tue' | 'Wed' | 'Sat' | 'Sun' }>;
  no_box_this_week: string[];       // flex-only / add-on-only in a box-contents campaign
}

export async function reconcileAgainstCycle(
  supabase, filter: RecipientFilter, targetWeek: string
): Promise<RosterDiff>
```

Classify each bucket by reading `cycle.excluded_biweekly`, `cycle.excluded_on_hold`, `cycle.excluded_out_of_season`, and `cycle.byDistributionDay` — all already returned by `resolveCycle` (`src/lib/cycle.ts:576`). No new queries beyond the ones `resolveCycle` already makes.

**Schema — one migration**

Add `campaigns.target_week DATE NULL` and `campaigns.roster_ack JSONB NULL`. `target_week` null means "not week-specific" (renewal, win-back) and skips the gate entirely. `roster_ack` stores the exact diff the human approved.

**`src/pages/api/admin/campaigns/send.ts`** — extend the existing guard block at line 118. When `target_week` is set, run `reconcileAgainstCycle`. Refuse with 409 and the full diff when `sending_not_receiving.length > 0` or `no_box_this_week.length > 0`. Require `confirm_roster=<sha256 of the diff>` to override, and persist it to `roster_ack`. Keep the existing count guard — it catches a different failure. **Do not fail open here.** Fail-open is right for a transient count read; it is wrong for "am I about to tell 38 people about a box they aren't getting."

**`src/pages/api/admin/campaigns/recipients-count.ts`** — return the diff alongside the count so the composer shows it before send, not at send.

**`src/pages/admin/campaigns/new.astro`** and **`[id].astro`** — add a target-week picker and render the diff as a blocking review panel: "38 of these 152 people receive nothing on 2026-09-02 (35 biweekly off-week, 3 on vacation hold). 26 have no box (flex-only). 26 members who ARE receiving are not on this list."

**Cheaper complement, worth doing regardless:** add a `receiving_this_week` segment kind to `SEGMENT_KINDS` in `src/lib/campaign-segments.ts:53`, resolved directly from `resolveCycle`, optionally narrowed by distribution day. Then "here's your Wednesday box" becomes a correct audience by construction rather than a correct audience by review. The reconciliation gate stays as the backstop for hand-built audiences.

---

## 3. Outbound member comms inventory

| Send path | File | Member-facing | Cycle-aware | Honors opt-out | `notification_log` | `member_comms` |
|---|---|---|---|---|---|---|
| Campaign | `src/lib/campaign.ts:773` | yes | **no** | partial (see §4) | yes `:1042` | yes `:1056` |
| Weekly box email | `src/pages/api/admin/weekly-email/send.ts` | yes | **yes** `:234` | yes | **no** | **no** |
| Flex order confirmation | `src/lib/flex-order-email.ts` | yes | n/a (transactional) | n/a | **no** | **no** |
| Flex order reminder (cron) | `src/pages/api/cron/flex-order-reminder.ts` | yes | partial (window-aware, not `resolveCycle`) | yes `:237` | yes `:165` | **no** |
| Market checkout receipt | `src/lib/market-checkout-email.ts` | yes | n/a | n/a | **no** | yes (`market-checkout.ts:243`) |
| Delivery request ack | `src/pages/api/account/request-delivery.ts` | yes | n/a | n/a | **no** | yes `:147` |
| Household invite | `src/pages/api/account/household.ts` | yes | n/a | n/a | **no** | **no** |
| **Arrival texts** | `src/pages/admin/route/[id].astro:234,470`, `src/pages/admin/text-stop/[...slug].astro:137,178` | yes | n/a | n/a | **no** | **no** |
| Flex list reminder (cron) | `src/pages/api/cron/flex-list-reminder.ts:52` | no — Todd only | n/a | n/a | yes `:284` | n/a |
| Fresh sheet / chef lists | `src/lib/fresh-sheet.ts` | no — wholesale | n/a | n/a | yes | n/a |
| Vendor bills, harvie-ingest, nightly-health | various crons | no — internal | n/a | n/a | yes | n/a |

### Not logged to `member_comms`

**Severity: medium-high.** Five member-facing paths write nothing to the member's interaction record: the weekly box email, flex order confirmations, the flex order reminder, household invites, and **all arrival texts**.

The arrival texts are the worst gap. They are `sms:` deep links (`src/pages/admin/text-stop/[...slug].astro:137`) — the browser hands the message to the device Messages app and the server never learns whether it was sent. This is a deliberate design choice, documented at `src/pages/admin/text-chef.astro:10`: *"WHY `sms:` deep links and NOT Twilio: server-side SMS has never worked."* That's fine as a mechanism, but it means there is **no record anywhere** that a member was told their box arrived. Todd is hand-logging these: `member_comms` 2026-09-02 15:29 contains "Texted driver Amelia (507-244-1677) via iMessage," typed by hand.

**Fix:** the deep-link buttons are already server-rendered per member with a known `member_id`. Fire a `navigator.sendBeacon` to a new `POST /api/admin/comms/log-sms` on click, writing `member_comms` with `summary: 'Arrival text opened for <stop>'`. It records intent, not delivery — label it as such in the summary so nobody mistakes it for proof. That is still infinitely better than nothing, and it costs one endpoint.

For the other four: add a `member_comms` insert next to each existing send. The weekly box email is the priority — it is the one a member is most likely to ask about.

---

## 4. Unsubscribe handling

The RPC (`supabase/migrations/0026_recipes_and_email.sql:146`) and the page (`src/pages/unsubscribe.astro:51`) are correct in themselves: HMAC-verified token, `SECURITY DEFINER`, idempotent, no data leak, revoked from `PUBLIC`. Two real holes around it:

### 4a. A campaign with `newsletter_opt_in: false` mails people who unsubscribed

**Severity: high — this is a CAN-SPAM exposure, not a UX bug.**

`src/lib/campaign.ts:306-320`, the `else` branch, anchors on `members` directly and applies **no opt-out filter of any kind**:

```ts
} else {
    // No opt-in requirement — anchor on members directly.
    const { data, error } = await supabase
      .from('members')
      .select(`status, share_type, customer:customers!inner(...)`)
      .in('share_type', filter.share_types as unknown as ...)
```

Unchecking "only opted-in" in the composer therefore mails the one member who explicitly unsubscribed. The same hole exists in `resolveRenewalWindowRaw` (`src/lib/campaign-segments.ts:196-209`) when `newsletterOptIn` is false. Notably `resolveLapsedRaw` **does** get this right — it excludes on any `newsletter_opt_in=false` row (`campaign-segments.ts:358`).

**Fix:** in both non-opt-in branches, fetch the set of members with `newsletter_opt_in=false` and exclude those customers unconditionally. `newsletter_opt_in: false` in the filter must mean "don't *require* opt-in," never "ignore opt-out." Right now the flag reads as the latter.

### 4b. Unsubscribe silently does nothing for 44 members

**Severity: medium.** The RPC's CTE joins `member_preferences mp JOIN members m` — it only ever UPDATEs rows that already exist. A member with no preferences row unsubscribes, the RPC returns 0, and `unsubscribe.astro:57` shows "You're unsubscribed" regardless (`outcome = 'done'` on any non-error). 44 active members are in this state.

Today they're shielded by accident, because the same missing row also excludes them from opt-in sends (§1). But fixing §1 without fixing this converts a delivery bug into a compliance bug.

**Fix:** change the RPC to UPSERT — insert `member_preferences(member_id, newsletter_opt_in=false)` for every member of that customer lacking a row. Then backfill preference rows for all 44 so both the send path and the unsubscribe path see a real value.

### 4c. Resumed campaigns don't re-check opt-out

**Severity: low-medium.** `sendCampaign` resolves recipients once and freezes them into `campaign_recipients` as `pending` (`src/lib/campaign.ts:870-885`). On a `partial` resume the next day it sends every remaining `pending` row without re-consulting preferences. Someone who unsubscribes from day 1's email still gets day 2's. Currently latent — `DAILY_SEND_CAP` is 5000 and no send has approached it — but it will bite the first time a send spans days.

**Fix:** re-resolve and drop now-unsubscribed rows at the top of each run, before the pending query.

---

## 5. `market-checkout-email.ts` and `fresh-sheet.ts`

Both live, both correct, no stale copy found.

**`market-checkout-email.ts`** (173 lines) — receipt sent when staff deduct a farmers-market purchase from a member's Farm Flex balance. Called from `src/pages/api/admin/market-checkout.ts:41`. Fail-soft by design (the debit already happened; the receipt is a courtesy). Replies route to `CSA_CONTACT_EMAILS`, bcc to Todd. Live evidence in `member_comms`: "MARKET CHECKOUT: -$12.00 at Bloomfield Market" 2026-07-25, "-$20.00 at Sewickley Market" 2026-07-12. Correctly logged to `member_comms`; not logged to `notification_log`, which is a minor inconsistency but not a gap since `member_comms` covers it.

**`fresh-sheet.ts`** (713 lines) — the single source of truth for wholesale availability emails to chefs. **Not member-facing.** Consolidated from duplicated copies inside the two wholesale-list crons, and the extraction is the right call: preview, scheduled send, and "confirm & send now" all call the same `bodyHtml`/`bodyText`/`sendFreshSheet`, so they cannot drift. Audience is `wholesale_accounts` with an order token and ≥1 recipient, minus vendors and `TEST_EXCLUDES`. Has a double-send guard (batch marker row per period + delivery date). Very much live: `chef_availability_wed` 55 sends on 2026-08-31, `fresh_sheet_unconfirmed_fri` on 2026-09-01.

Neither needs work. Note that `fresh-sheet.ts` imports `TEST_EXCLUDES` from `campaign.ts` — worth remembering if the campaign module is ever refactored.

---

## 6. Cron inventory

Vercel runs 2 jobs; pg_cron runs the other 11. "Last fired" is from `notification_log.sent_at`, live.

### Vercel (`vercel.json`)

| Job | Schedule | Purpose | Last known good |
|---|---|---|---|
| `flex-list-reminder` | `0 11 * * 4` (Thu 07:00 ET) | Stage next week's flex draft + nudge Todd on empty box/flex/market editors. Internal only. | 2026-08-27, 5 sends |
| `vendor-bills` | `0 10 * * *` (daily 06:00 ET) | Vendor bill sync + unpublished-draft nudge | No `notification_log` rows — see below |

### pg_cron (repo-root `supabase/migrations/`)

| Job | Schedule (UTC) | Endpoint | Defined in | Last known good |
|---|---|---|---|---|
| `csa-nightly-health` | `0 10 * * *` | `/api/cron/nightly-health` | `0033` | 2026-09-02, 37 sends ✅ |
| `csa-harvie-ingest` | `0,30 11-18 * * 1` | `/api/cron/harvie-ingest` | `0078` (supersedes `0074`, `0077`) | 2026-08-31, 96 ✅ |
| `csa-chef-order-reminder` | `5 13 * * 1` | `/api/cron/chef-order-reminder` | `0074` | **2026-08-10** — see below |
| `csa-flex-order-reminder` | `5 21 * * 0` | `/api/cron/flex-order-reminder` | `0074` | 2026-08-30, 116 ✅ |
| `csa-standing-orders` | `0 10 * * 1` | pure SQL `generate_standing_orders()` | `0075` | No log — by design, no email |
| `csa-wholesale-list-wed` | `30 12 * * 5` (Fri!) | `/api/cron/wholesale-list-wed` | `0081` (supersedes `0080`) | 2026-08-31, 55 ✅ |
| `csa-wholesale-list-fri` | `0 14 * * 2` (Tue!) | `/api/cron/wholesale-list-fri` | `0081` | 2026-09-01, 4 ✅ |
| `csa-fresh-sheet-reminder-wed` | `0 20 * * 4` | `/api/cron/fresh-sheet-reminder` | `0082` | 2026-08-27, 5 ✅ |
| `csa-fresh-sheet-reminder-fri` | `0 20 * * 1` | `/api/cron/fresh-sheet-reminder` | `0082` | 2026-08-31, 6 ✅ |
| `csa-invoice-reconcile` | `0 7 * * *` | `/api/cron/invoice-reconcile` | `0094` | No log — see below |
| `csa-friday-list-reminder` | — | `/api/cron/friday-list-reminder` | `0076`, **unscheduled by `0082:46`** | Never ❌ |

### Flags

**`chef-order-reminder` has not fired since 2026-08-10 — and that is correct.** `portal_settings.chef_reminder_enabled = 'false'` (verified live). The endpoint reads the flag and returns `{ok:true, skipped:'disabled'}` without sending. Three Mondays skipped by design. **This is exactly the shape of signal that gets misread as a broken cron** — the job runs fine, the flag is off. If Todd wants it back on it is a one-row update, not a code change. Worth confirming the "off" is still intentional three weeks later.

**`friday-list-reminder` is an orphaned endpoint.** `supabase/migrations/0076_friday_reminder_cron.sql:65` scheduled it; `supabase/migrations/0082_fresh_sheet_confirm_gate.sql:46` unschedules it and replaces it with the two `fresh-sheet-reminder` jobs. `src/pages/api/cron/friday-list-reminder.ts` (51 lines) is still deployed and reachable, and zero rows exist in `notification_log`. Dead code behind a live URL. **Fix:** delete the file, or leave it and add a comment naming `0082` as its replacement. Do not re-schedule it — that would double up with `csa-fresh-sheet-reminder-fri`.

**`invoice-reconcile` and `vendor-bills` write no `notification_log` rows,** so I have no evidence either way about whether they run. They may legitimately not send email. I did not verify these against QuickBooks and am not going to assert they work. **Fix:** have both write a heartbeat row (`notification_type: 'cron_heartbeat'`) even on a no-op run, so `nightly-health` can alert on silence. `src/lib/automation-heartbeat.ts` already exists and appears built for exactly this.

**The `wholesale-list-wed`/`-fri` job names are inverted relative to their schedules.** `csa-wholesale-list-wed` runs Fridays; `csa-wholesale-list-fri` runs Tuesdays (`0081_fresh_sheet_reschedule.sql:36-48`). The names refer to the *delivery period*, not the send day. Intentional and documented, but it is a live trap for whoever next debugs a wholesale send. Rename to `csa-fresh-sheet-wed-period` / `-fri-period`, or add a `COMMENT`.

**No flex lock job is missing.** I checked, since it was flagged as a possible gap. The flex ordering cutoff is enforced as a pure function at request time — `src/pages/api/account/flex-order/submit.ts:94` redirects with `window_closed` when the window is shut, using the pickup-day-aware cutoff from `src/lib/flex-order.ts`. There is nothing for a cron to lock. Publishing is separately gated on `portal_settings.flex_published_<week>`, which is present for the current week (`flex_published_2026-08-31 = 2026-08-29T13:28Z`).

---

## Recommended order of work

1. **Add opt-out exclusion to the non-opt-in branches** (`campaign.ts:306`, `campaign-segments.ts:196`). One-line-ish, closes a legal exposure, no design decisions needed.
2. **Add the `receiving_this_week` segment** backed by `resolveCycle`. This makes the 8/29 failure structurally impossible for the common case, and is less work than the full gate.
3. **Build the reconciliation gate** as the backstop for hand-built audiences (§2).
4. **Backfill the 44 missing `member_preferences` rows and make the unsubscribe RPC upsert.** Do these together — order matters, since fixing the send side alone creates a compliance gap.
5. **Log the five unlogged member-facing paths to `member_comms`**, arrival texts first.
6. **Delete `friday-list-reminder.ts`; add heartbeats to `invoice-reconcile` and `vendor-bills`.**

One thing I could not determine and did not guess: whether `chef_reminder_enabled=false` is still deliberate, and whether `invoice-reconcile` / `vendor-bills` are actually executing. Both need either Todd or a look at the live `cron.job` / `cron.job_run_details` tables, which PostgREST does not expose — that needs a direct SQL connection.