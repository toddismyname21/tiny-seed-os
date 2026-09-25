---
name: flex-weekly-cadence
description: THE weekly Farm Flex operating loop — schedule, who gets the list, how to publish, and the auto-draft bug. Read this BEFORE asking Todd anything about flex.
metadata:
  type: project
---

# Farm Flex — the weekly loop

**Read this first. Do not ask Todd to re-explain the cadence.** Everything below is
from the code (`src/lib/flex-draft.ts`, `flex-order.ts`, `flex.ts`) and the live DB,
verified 2026-09-11.

## The week

Delivery weeks are keyed by **Monday** (`week_starting`, `cycle_code='WEEKLY'`).

| When (ET) | What | Who |
|---|---|---|
| Thu 00:00 | Order window **opens** | auto |
| Thu 07:00 | Cron `/api/cron/flex-list-reminder` clones this week's live list → next week as hidden draft, emails Todd a nudge | auto |
| Fri/Sat/Sun/Mon | Daily nudge if the week is still unpublished (`nudgeTargetWeek`) | auto |
| — | **PUBLISH** at `/admin/flex-review/[week]` — one tap | **TODD** |
| — | **SEND the member email** — a separate campaign | **TODD** |
| Tue 08:00 | Order window **closes** | auto |
| Wed | Delivery | — |

Weekend-market members (pickup `day_of_week` Sat/Sun) get a **later** cutoff
(Wednesday midnight). Wednesday pickup and home delivery keep Tuesday 08:00.

## How draft/publish actually works

- A row is invisible to members while `is_active=false`. **That IS the draft.**
- Desired on/off state lives in `draft_on`.
- **PUBLISH** copies `draft_on → is_active` for the whole week, and writes
  `portal_settings.flex_published_<week>` = ISO timestamp.
- After publish, per-item toggles write `is_active` directly — edits go live instantly.
- **Publishing sends NO email.** `publishWeek()` only flips visibility. The
  announcement is always a deliberate second action.

## ⚠️ The auto-draft bug — expect this

`createNextWeekDraft` is **idempotent on ANY row existing** in the target week:
if the week has even one row it returns `already_exists` and clones nothing.

**So a single item added to a future week silently kills Thursday's auto-clone.**
Happened for week 2026-09-14: one "Bulk Tomatoes — 10 lb flat" row blocked all 33
items. Todd found the list missing on Friday.

**How to apply:** if a week looks empty or tiny on Fri/Sat, this is why. Fix by
inserting the missing items directly (clone `is_active=true` rows from week−1,
skipping name collisions, set `is_active=false, draft_on=true`). Proper fix is to
make the gate smarter — not yet done.

## WHO gets the flex list — Todd, 2026-09-11

> "It should just be the flex members getting the flex list; and any members who
> added flex funds"

This matches the code's own eligibility rule in `flex.ts`:
**"a member may use Farm Flex ordering if they have spendable store credit > 0 OR a
live flex share row."**

So the audience is the **UNION** of:
- `members.share_type='flex'` AND `status='active'` (32 as of 2026-09-11), and
- **Shopify store credit > 0** (41 as of 2026-09-11)

As of 2026-09-11 that union was **41** — every flex-share member also had credit.

**Why it matters:** the 2026-08-29 campaign used filter
`share_types:[summer_veg,flex]` and went to **152**. That is ~110 people with no
flex share and no funds. Todd corrected this. **Do not reuse the summer_veg filter
for a flex list.**

### Where the balance actually lives
**Shopify Store Credit — NOT a Supabase column.** `members` has no
`flex_balance_cents`. `flex_transactions` records only promotional/bonus credit;
the spendable number is the sum of Shopify `storeCreditAccounts`. Query it with
`SHOPIFY_ACCESS_TOKEN` / `SHOPIFY_STORE_NAME` from `apps/csa-portal/.env` against
`/admin/api/2025-01/graphql.json`, paging `customers(first:250)`.

Total outstanding credit on 2026-09-11: **$5,836.98** across 41 people. That is
prepaid money — the email's real purpose is telling people they can spend it.

## Related
- [[never-send-without-confirmation]] — the member email NEVER goes without Todd's word
- Campaign recipients resolve via `member_preferences.newsletter_opt_in=true` →
  `members.status='active'` + share_type → `customers.email`, deduped by email
