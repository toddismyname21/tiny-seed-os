# CSA Shopify → Supabase Sync — Operations Runbook

The CSA portal keeps Supabase in step with Shopify by polling Shopify for
orders updated since a watermark and, for each new order, **upserting CSA
member rows and issuing real money** (Shopify store credit for Farm Flex
purchases + $25 referral payouts). Because it moves money unattended, this
runbook documents how it runs, how to verify it's healthy, and how to
recover it.

> **Why this exists:** The 2026 CSA data migration was a point-in-time
> snapshot. After it ran, new Shopify orders stopped flowing into Supabase
> and ~100 customers developed gaps (since reconciled). The sync prevents a
> recurrence — and the alerting + admin sync-health page (this runbook's
> companions) make a future failure **loud and visible** instead of silent.

---

## 1. Components at a glance

| Piece | Where | Role |
|-------|-------|------|
| Sync endpoint | `apps/csa-portal/src/pages/api/sync/shopify-orders.ts` | The job. `GET`/`POST`, Bearer-auth, idempotent, fail-soft per order. |
| Watermark table | `shopify_sync_state` (single row, `id=1`) | `last_synced_at` high-water mark. |
| Per-order ledger | `shopify_order_sync` | One row per order touched; `last_error` on failure. |
| Money ledgers | `flex_transactions`, `referrals` | Store-credit + referral payout records. |
| Scheduler | Supabase `pg_cron` job `csa-shopify-sync` | Fires the endpoint every 15 min via `pg_net`. |
| Error alert | inside the sync endpoint (`sendSyncErrorAlert`) | Best-effort Resend email to the owner when a run hits any error. |
| Health UI | `apps/csa-portal/src/pages/admin/sync.astro` → `/admin/sync` | Read-only dashboard: last run, throughput, errored orders, money activity. |

Migrations: `supabase/migrations/0022_shopify_sync.sql` (sync tables + RLS),
`0007_flex_funds.sql` (flex_transactions), `0024_referrals.sql` (referrals).

---

## 2. The pg_cron job

- **Name:** `csa-shopify-sync`
- **Schedule:** `*/15 * * * *` (every 15 minutes)
- **What it does:** issues an HTTP `POST` to the sync endpoint via
  Supabase's `pg_net` extension, with an `Authorization: Bearer <CRON_SECRET>`
  header. The endpoint validates that bearer against the `CRON_SECRET`
  environment variable (Vercel) — no cookie session, no admin role; this is
  machine-to-machine.

The endpoint URL is the deployed CSA portal:

```
https://csa.tinyseedfarm.com/api/sync/shopify-orders
```

> **Do NOT put the actual `CRON_SECRET` in this document or any committed
> file.** It lives only in Vercel env vars (for the endpoint to check) and
> in the Supabase Vault / the `cron.job` command (for the job to send). If
> it's ever printed in a doc, log, or commit, rotate it.

### 2.1 Verify it's scheduled

Run in the Supabase SQL editor (or via the Management API SQL runner):

```sql
select jobid, jobname, schedule, active, command
from cron.job
where jobname = 'csa-shopify-sync';
```

Expect one **active** row with schedule `*/15 * * * *`. The `command`
column shows the `net.http_post(...)` call (the bearer is interpolated from
the Vault — confirm the header references the secret, not a literal).

### 2.2 Verify it's actually firing (read the responses)

`pg_net` records every HTTP call it makes. Recent sync responses:

```sql
-- Most recent pg_net responses (200 = the endpoint ran).
select id, status_code, created, content::text as body
from net._http_response
order by created desc
limit 10;
```

A healthy run returns `200` with a JSON body like
`{ "ok": true, "orders_seen": N, "orders_processed": M, ... }`. To see WHEN
the job last ran and whether it succeeded at the cron layer:

```sql
select runid, jobid, status, return_message, start_time, end_time
from cron.job_run_details
where jobid = (select jobid from cron.job where jobname = 'csa-shopify-sync')
order by start_time desc
limit 10;
```

`status='succeeded'` here means the SQL command (the `net.http_post` call)
queued OK — it does **not** prove the endpoint returned 200. Cross-check
`net._http_response` (above) for the HTTP status, and `/admin/sync` for the
watermark advance.

### 2.3 Recreate the job

If the job is missing or was unscheduled, recreate it. Replace the
placeholders — **never commit the real secret**.

```sql
-- 1. Ensure the extensions exist (idempotent).
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- 2. Remove any prior definition so the schedule is clean.
select cron.unschedule('csa-shopify-sync')
where exists (select 1 from cron.job where jobname = 'csa-shopify-sync');

-- 3. (Re)schedule. The CRON_SECRET should be read from Vault, not pasted.
--    Store it once:  select vault.create_secret('<THE_SECRET>', 'cron_secret');
select cron.schedule(
  'csa-shopify-sync',
  '*/15 * * * *',
  $$
  select net.http_post(
    url     := 'https://csa.tinyseedfarm.com/api/sync/shopify-orders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret
                                       from vault.decrypted_secrets
                                       where name = 'cron_secret')
    ),
    body    := '{}'::jsonb
  );
  $$
);
```

> The bearer value the endpoint checks is the Vercel env var `CRON_SECRET`.
> The bearer the job sends must equal it byte-for-byte. If they drift, the
> endpoint returns `401 unauthorized`, the watermark never advances, and
> `/admin/sync` goes **STALE** within 30 minutes.

---

## 3. Watermark & idempotency model

The sync is designed so re-running it is always safe.

### 3.1 The watermark

- `shopify_sync_state.last_synced_at` is a single high-water mark. Each run
  pulls only Shopify orders with `updated_at >= last_synced_at`.
- The watermark advances to `max(order.updated_at)` observed **only at the
  end of a completed run** (and never backwards). A mid-run crash leaves the
  old watermark in place, so the next run re-covers the same frontier — no
  order is skipped.
- It was seeded to deploy-time `NOW()` so the very first run looked only at
  orders from deploy forward; all historical (already-reconciled) orders are
  intentionally never re-imported.

### 3.2 Idempotency (no double-acting)

- **Per-order ledger:** `shopify_order_sync` has one row per order, keyed by
  `shopify_order_id`. The sync checks for an existing row **before** doing
  any write for an order — presence means "already processed, skip." This is
  the primary guard, so member upserts, flex credit, and referral payouts
  each run at most once per order.
- **Member rows:** upserted on a deterministic `legacy_id =
  'SYNC-<orderId>-<lineItemId>'`, so even a forced re-process can't
  duplicate a member.
- **Flex credit + referral bonus:** these are PURE ADDITIVE credits
  (`issueStoreCreditDelta` ADDS the amount server-side — no read-then-set).
  An additive credit cannot be made idempotent by a balance read, so the
  **per-order `shopify_order_sync` ledger row above is the sole guard**: the
  sync checks it before issuing any credit, so each order pays out at most
  once. The credit is ALWAYS issued before its ledger rows are written — if
  Shopify rejects the credit, no ledger row is recorded (we never claim a
  credit that didn't post), and if the ledger write fails the per-order
  try/catch surfaces it for reconciliation.
  - (History: credit used to be balance-TARGETED — top up *to* current +
    amount — which self-guarded on the balance but could UNDER-CREDIT when a
    fail-soft balance read returned 0, drifting Shopify from the ledger.
    Switched to additive on 2026-05-24.)
- **Referrals:** `referrals.referred_order_id` is `UNIQUE` — a durable
  belt-and-suspenders backstop on top of the per-order ledger. A duplicate
  insert (race) is caught; because the credit is now additive, a true
  duplicate means a second credit may have posted, so the sync reports it as
  an error for human reconciliation rather than silently treating it as a
  no-op.

### 3.3 ⚠️ The watermark-reset duplicate caveat

The "skip if already in `shopify_order_sync`" check is what makes re-runs
safe — **not** the watermark alone. The watermark only controls *which
orders Shopify hands back*.

If you **manually reset `last_synced_at` backwards** (e.g. to backfill), the
sync will re-fetch older orders. That is safe **only because** their ledger
rows already exist and cause a skip. **Do NOT** also truncate or delete rows
from `shopify_order_sync` when resetting the watermark — doing both at once
removes the idempotency guard and the sync will **re-issue store credit and
re-pay referral bonuses** for every order in the window. If you must reset
the watermark, leave the ledger intact.

When in doubt, use **dry-run** first (Section 5) to see exactly what a run
*would* do before it does it.

---

## 4. Error alerting

At the end of every **live** run that touched **any** error, the endpoint
emails `todd@tinyseedfarmpgh.com` via Resend
(`sendSyncErrorAlert`). The email summarizes the run (timestamp, orders
seen/processed, members upserted, flex + referral credited) and lists each
failing order with its error text. Subject:
`⚠️ CSA sync: N order(s) errored on <date>`.

Properties:

- **Only on errors.** A clean run sends nothing (no inbox spam).
- **Best-effort / fail-soft.** A missing Resend key, Resend being down, or a
  non-2xx response is logged and swallowed — the alert never breaks the sync
  (the run + watermark advance have already completed before the alert
  fires). It never throws.
- **Dry-run never alerts** (a dry-run writes nothing and is
  operator-initiated).

What counts as an "error": `errors[]` aggregates both a thrown per-order
failure (which also stamps `last_error` on that order's ledger row) and
non-fatal referral / watermark issues. So the alert fires on the complete
"this run touched a problem" signal.

> A daily **heartbeat** alert (so a totally-dead cron is noticed even when no
> order errors) is wired separately as its own pg_cron job — see PM notes.
> This in-app alert covers the "ran but something failed" case; the
> heartbeat covers the "didn't run at all" case, backed visually by the
> STALE warning on `/admin/sync`.

---

## 5. Manual run & dry-run (debugging)

The endpoint accepts both `GET` and `POST` and requires the bearer.

```bash
# DRY-RUN — does ALL reads, reports the planned actions as JSON, writes
# NOTHING (no member upserts, no store credit, no watermark advance, no
# ledger rows). Safe to run anytime to see what the next live run would do.
curl -s -X POST 'https://csa.tinyseedfarm.com/api/sync/shopify-orders?dry_run=1' \
  -H "Authorization: Bearer $CRON_SECRET" | jq

# LIVE — identical to what the cron fires. Only run deliberately.
curl -s -X POST 'https://csa.tinyseedfarm.com/api/sync/shopify-orders' \
  -H "Authorization: Bearer $CRON_SECRET" | jq
```

(Export `CRON_SECRET` into your shell from a secure source — never paste it
into a committed file or share it in chat.)

Response shape:

```json
{
  "ok": true,
  "dry_run": false,
  "orders_seen": 0,
  "orders_processed": 0,
  "members_upserted": 0,
  "flex_credited_total": 0,
  "flex_bonus_total": 0,
  "referral_bonus_total": 0,
  "watermark_was": "2026-05-24T12:00:00.000Z",
  "watermark_advanced_to": "2026-05-24T12:14:59.000Z",
  "errors": []
}
```

`ok` is `false` whenever `errors[]` is non-empty. A dry-run also returns a
`planned[]` array describing each order's would-be member upserts, flex
principal/bonus, and referral preview.

---

## 6. Reading the admin sync-health page

`/admin/sync` (admin-gated; the AdminShell "Sync" nav tab and a "Sync
health" card on the admin home both link to it). It is **read-only** — it
performs no writes. Sections:

1. **Last successful run** — the `last_synced_at` watermark as a human
   "X minutes/hours ago" plus the absolute timestamp (America/New_York). It
   shows a green **Healthy** pill normally and a red **STALE** alert when the
   watermark is older than **30 minutes** (the sync runs every 15, so 30+ min
   means at least two missed runs — investigate the cron job per Section 2).
2. **Orders processed** — counts from `shopify_order_sync.processed_at` over
   the last 24h and 7d, plus 7-day flex-credited and referral-payout totals.
3. **Needs attention** — every `shopify_order_sync` row with a non-null
   `last_error` (order name + id, the error text, and when it last attempted).
   A row stays here until a clean re-run clears its `last_error`. Empty =
   nothing erroring.
4. **Recent money activity** — `flex_transactions` (last 7d, credits/debits
   with reason) and `referrals` (last 7d payouts), so you can eyeball that
   the money the sync issued looks right.

### Triage flow

- **STALE banner** → the cron isn't completing runs. Check
  `cron.job_run_details` + `net._http_response` (Section 2.2). Common causes:
  job unscheduled, `CRON_SECRET` mismatch (401), or the endpoint 5xx-ing
  (Shopify down → `shopify_fetch_failed`).
- **Rows in "Needs attention"** → open the order in Shopify, read the
  `last_error`. The sync auto-retries each run; a transient error
  (e.g. Shopify timeout) usually clears on its own. A persistent one (e.g.
  "order has no usable email", "referrer has no Shopify customer") needs a
  human fix in Shopify/Supabase. Once fixed, the next run clears the row.
- **Money totals look wrong** → cross-check `flex_transactions` /
  `referrals` against Shopify store-credit balances. Remember the
  idempotency guards mean the sync won't double-issue; an over-credit almost
  always traces to a manual watermark reset that also cleared the ledger
  (Section 3.3).
</content>
