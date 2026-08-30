# Scheduled Jobs — Tiny Seed CSA Portal

**Status:** SOURCE OF TRUTH for what runs automatically.
**Verified:** 2026-08-29 — every schedule below was cross-checked against real
send timestamps in `notification_log`, not just read out of the code.

---

## ⚠️ READ THIS FIRST — there are TWO schedulers

Automation is split across two independent systems. **Looking at only one will
lead you to a wrong conclusion.**

| Scheduler | Jobs | Defined in | How to change |
|---|---|---|---|
| **Supabase `pg_cron`** | 9 | `supabase/migrations/` (`0033`–`0094`) | new migration |
| **Vercel Cron** | 2 | `apps/csa-portal/vercel.json` | edit that file |

**This bit someone on 2026-08-29.** `vercel.json` lists only 2 crons while 11
cron routes exist in `src/pages/api/cron/`, which looks exactly like 9 dead
endpoints. They are not dead — `pg_cron` calls them over HTTPS. "Fixing" it by
adding the missing 9 to `vercel.json` would have **DOUBLE-SENT customer email.**

Before touching any schedule, check **both** places.

---

## Vercel Cron (`apps/csa-portal/vercel.json`)

| Job | Schedule (UTC) | ET | What it does |
|---|---|---|---|
| `/api/cron/flex-list-reminder` | `0 11 * * 4` | Thu 7:00 AM | Auto-stages next week's flex draft **and** emails Todd the "set up next week" nudge |
| `/api/cron/vendor-bills` | `0 10 * * *` | daily 6:00 AM | Vendor bill processing |

---

## Supabase pg_cron

Each job POSTs to `https://csa.tinyseedfarm.com/api/cron/...` with
`Authorization: Bearer <CRON_SECRET>`, where the secret comes from **Supabase
Vault**. Every migration guards on the Vault secret existing and merely
`RAISE NOTICE`s if absent — so a missing secret means jobs silently never
schedule.

| Job | Schedule (UTC) | ET | Defined in |
|---|---|---|---|
| `csa-nightly-health` | `0 10 * * *` | daily 6:00 AM | `0033` |
| `csa-invoice-reconcile` | `0 7 * * *` | daily 3:00 AM | `0094` |
| `csa-standing-orders` | `0 10 * * 1` | Mon 6:00 AM | `0075` |
| `csa-harvie-ingest` | `0,30 11-18 * * 1` | Mon 7:00 AM–2:30 PM /30min | `0078` |
| `csa-chef-order-reminder` | `5 13 * * 1` | Mon 9:05 AM | `0074` |
| `csa-flex-order-reminder` | `5 21 * * 0` | Sun 5:05 PM | `0074` |
| `csa-fresh-sheet-reminder-fri` | `0 20 * * 1` | Mon 4:00 PM | `0082` |
| `csa-fresh-sheet-reminder-wed` | `0 20 * * 4` | Thu 4:00 PM | `0082` |
| `csa-wholesale-list-fri` | `0 14 * * 2` | **Tue** 10:00 AM | `0081` |
| `csa-wholesale-list-wed` | `30 12 * * 5` | **Fri** 8:30 AM | `0081` |

### Naming trap
`csa-wholesale-list-wed` runs on **Friday**; `csa-wholesale-list-fri` runs on
**Tuesday**. The suffix is the **delivery** day, not the run day. This is
intentional. Do not "correct" it.

### Superseded
`csa-friday-list-reminder` (`0076`) was unscheduled by `0082` and replaced by the
two `fresh-sheet-reminder` jobs. Its route still exists but nothing schedules it.
Corroborated: `notification_log` shows `friday_list_reminder` last fired
2026-07-06.

---

## Feature gates — how automation goes silently dark

Several cron endpoints are gated on a `portal_settings` row. **A disabled job
returns HTTP 200 with `{ok: true, skipped: 'disabled'}`** — so nothing looks
broken in any log or monitor while the feature is entirely off.

| Gate key | Controls |
|---|---|
| `chef_reminder_enabled` | Monday chef order reminders (~50 chefs) |
| `flex_reminder_enabled` | Sunday flex order reminders |
| `wholesale_list_wed_enabled` | Wednesday fresh sheet |
| `wholesale_list_fri_enabled` | Friday fresh sheet |

There is a **second** gate on the fresh sheets: `fresh_sheet_confirmed_wed` /
`_fri` must **equal the next delivery date**. A stale value can never match, so
the sheet never sends and Todd gets a weekly "NOT sent — unconfirmed" alert
instead.

**Real incident, 2026-08-29:** `chef_reminder_enabled` was found `false`. Chef
reminders stopped after 2026-08-10 — three Mondays, ~50 chefs, zero errors
anywhere.

### Diagnosing "why didn't X send?"
1. Is the job scheduled? Check **both** `vercel.json` and the pg_cron migrations.
2. Is its `portal_settings` gate `true`?
3. For fresh sheets: does `fresh_sheet_confirmed_*` equal the next delivery date?
4. What does `notification_log` show for that `notification_type`? Gaps in the
   date sequence are the fastest signal.

> `portal_settings.updated_at` was historically **unreliable** — no trigger
> maintained it and most writers left it stale. Migration
> `20260829174600_portal_settings_updated_at_trigger.sql` fixes this going
> forward, but timestamps predating it cannot be trusted.
