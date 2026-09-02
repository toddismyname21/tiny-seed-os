Audit complete. Here are the findings.

## Bottom line

The app's TypeScript path is clean: every surface that answers "does this member get a box this week" funnels through `resolveCycle` → `isMemberOnThisWeek` / `holdOverlapsWeek` / `isShareInSeasonForWeek`. I found **no** divergent parity math in the runtime request path.

The danger is entirely in **four places outside that path**: one live SQL function that silently disagrees with the app, one dead SQL function (today's incident) that a spec still recommends, two Python email senders with no week gate, and one member-facing page that tells anyone their box is coming. I also confirmed the `cycle-ui.ts` duplicate the task asked about **has already drifted**.

## The single oracle, confirmed

`/Users/toddsmacbookpro2026/Documents/TIny_Seed_OS/apps/csa-portal/src/lib/cycle.ts:396-404` is the authority:

```ts
export function weekParity(weekStarting: string): 0 | 1 {
  const anchor = '2026-06-08';
```

`resolveCycle` applies all three gates internally (`cycle.ts:908, 951, 957`), so anything consuming its output is correct by construction. 236 references to the three oracle functions across `src/`. `schedule.ts:196` correctly delegates (`deliveryParity` calls `weekParity(mondayOfWeek(d))`), and `vacation.ts:144-153` correctly treats `cadence` as authoritative.

## Findings

| # | Where | What it decides | Oracle used | Severity |
|---|---|---|---|---|
| 1 | `supabase/migrations/0051_vacation_week_count_fix.sql:74-155` | How many vacation weeks a member is charged | **Own** parity + own season map, **ignores `cadence`** | CRITICAL |
| 2 | `supabase/migrations/0021_routing_schema.sql:194-256` | "Who receives a box on date D" | **Own** parity from each member's `start_date` | CRITICAL |
| 3 | `apps/csa-portal/scripts/send_member_campaign.py:84-85` | Who receives a member email | **None** — `status=active` + share_type only | HIGH |
| 4 | `apps/csa-portal/scripts/send_all_member_emails.py:49-51` | Who receives a member email | **None**; parity asserted in prose | HIGH |
| 5 | `apps/csa-portal/src/pages/account/track.astro:241-269` | "Your box arrives Wednesday" | **None** — no on-week or hold check | HIGH |
| 6 | `apps/csa-portal/src/lib/cycle-ui.ts:69-79` | Distribution dates for a week | **Own** — and already drifted | MEDIUM |
| 7 | `apps/csa-portal/src/lib/flex-order.ts:335-350` | "Which Monday is it now" | Duplicate of `cycle.ts:1487` | MEDIUM |
| 8 | `supabase/migrations/0073` (absent constraint) | — | Nothing prevents `cadence='weekly'` + `biweekly_week='B'` | MEDIUM |
| 9 | `docs/specs/ROUTING_ENGINE_SPEC.md:27` | Tells builders which oracle to use | Points at finding #2 | HIGH |

### 1. CRITICAL — the vacation counter is live and disagrees with the app

This is the one I'd fix first, because unlike the incident RPC it **runs on every member vacation request today**. `/api/account/vacation/schedule.ts:209` calls `schedule_vacation_hold`, which calls `_vacation_member_weeks_in_range`. That helper never reads `cadence`:

```sql
-- 0051:104
SELECT share_type, biweekly_week, total_weeks
  INTO v_share_type, v_biweekly_week, v_total_weeks
-- 0051:128
v_is_biweekly := (v_biweekly_week IN ('A','B')) OR (...total_weeks < season_weeks);
```

Migration 0051 predates 0073, which made `cadence` the source of truth and which `cycle.ts:334` and `vacation.ts:144` both honor. Meanwhile the member-facing preview at `/account/vacation/new.astro:99-111` explicitly uses `cadence`. So for a member with `cadence='weekly'` carrying a stray `biweekly_week`, the page says "this uses 2 of your weeks" and the database charges 1.

That combination is reachable right now: the Shopify sync writes `cadence` on every re-sync but never clears `biweekly_week` (`src/pages/api/sync/shopify-orders.ts:869-888` — `basePayload` contains `cadence: m.cadence` and no `biweekly_week` key). A member converting biweekly→weekly keeps the stale letter. No CHECK constraint prevents it; 0073's only constraint is on the cadence value domain (`0073:71`).

**Fix:** replace the helper's biweekly detection with `cadence` (fall back to the old heuristic only when NULL), and add `CHECK (cadence = 'biweekly' OR biweekly_week IS NULL)`. Longer term this function shouldn't exist — have the endpoint compute the count with `vacationWeeksUsed` and pass it to the RPC as a parameter, so there is exactly one implementation.

Same file also hardcodes a copy of `SEASON_SCHEDULE` (`0051:114-119`). It currently matches `src/lib/season.ts:40-45` exactly — I checked — but it's a frozen copy with `fall_veg` missing, and `season.ts:12` invites the owner to edit that map freely.

### 2. CRITICAL — the incident function, and the spec that recommends it

`members_receiving_on_date` computes parity from each member's own `start_date` (`0021:232, 236`):

```sql
a.biweekly_week = 'A'
AND (FLOOR((target_date - a.start_date) / 7.0)::int % 2) = 0
```

It also ignores `cadence` entirely and only excludes `vacation_holds` with `status='active'`, while `holdOverlapsWeek` (`cycle.ts:428`) counts `'active'` **and** `'scheduled'`. I confirmed zero callers: no `.rpc('members_receiving_on_date')` anywhere in `src/` or `scripts/`, and no later migration drops or replaces it.

The reason it fooled a reviewer is documented in the tree. `/Users/toddsmacbookpro2026/Documents/TIny_Seed_OS/docs/specs/ROUTING_ENGINE_SPEC.md:27` says it "returns the deterministic answer," and its own `COMMENT ON FUNCTION` (`0021:258`) advertises it as the thing to "use for dynamic route seeding." Dropping the function without fixing the spec leaves the trap set.

**Fix:** `DROP FUNCTION members_receiving_on_date(date)`, correct the spec line to name `resolveCycle`, and note in `0021` that route seeding goes through `/api/admin/route/index.ts:12` (which does use `resolveCycle`).

### 3–4. HIGH — Python senders with no week gate

`send_member_campaign.py:3` describes itself as "the ONLY approved way to email CSA members," and resolves recipients as `status=eq.active&share_type=in.(...)` — no parity, no vacation hold, no season window. `send_all_member_emails.py:49-51` is the same, and additionally asserts parity in the copy by hand (`:65` — `"This is Week A — the first week of the season"`), which is exactly the "derive, don't assert" failure in `.claude/rules/verify-before-send.md`.

Notably, every `.ts`/`.mts` script in that same directory (`routeA_recips.ts`, `weekend_sheets.ts`, `send_flower_email.ts`, `send_flower_wk.ts`, `pack_matrix.ts`, `harvest_numbers.ts`, `incident_check.ts`) **does** import `resolveCycle`. The Python ones are the gap.

**Fix:** these should not resolve their own audiences. Give them a `--week` flag and have them fetch the roster from an admin endpoint backed by `resolveCycle`, or refuse to run without an explicit recipient file produced by one.

### 5. HIGH — Track My Box tells everyone a box is coming

`src/pages/account/track.astro:241-269`: when the member has no stop today, it queries their member row filtered only on `.in('status', ['active','paused','onboarding'])` and renders "Your box arrives {weekday}." A biweekly off-week member, a member on a vacation hold, or an out-of-season member all get told a box is coming. This is the mirror image of today's incident.

**Fix:** the page already has `supabase` and the week; gate the fallback on `isMemberOnThisWeek` + `holdOverlapsWeek` + `isShareInSeasonForWeek` and render "no box this week — your next is {date}" from `resolveMemberSchedule`.

### 6. MEDIUM — the `cycle-ui.ts` duplicate has already drifted

You asked me to verify whether it can drift. It already did. `cycle.ts:588-593` builds **four** distribution dates:

```ts
const distribution_dates = { Tue: ..., Wed: ..., Sat: ..., Sun: addDays(week_starting, 6) };
```

`cycle-ui.ts:69-79` returns **three** — no `Sun`. The file's own comment eight lines above (`cycle-ui.ts:47-48`) says "a CSA week … has FOUR pickup days (Tue Lawrenceville, Wed delivery, Sat markets, Sun South Side)," and the function immediately below omits South Side Sunday.

It has **zero consumers** — grep for `csaDistDates` returns only its own definition and docstring. So nothing is broken today, but it is precisely the same shape as finding #2: dead, loaded, and carrying a comment that tells the next reader it mirrors the resolver. **Delete it.**

### 7–8. MEDIUM — duplicates and a missing constraint

`flex-order.ts:335-350` (`upcomingMondayET`) is a line-for-line functional duplicate of `cycle.ts:1487-1500` (`upcomingMonday`) — same Intl formatter, same `daysUntilMon` expression, different date arithmetic to reach the same result. Currently identical; re-export from `cycle.ts` instead.

Separately, a naming hazard worth a comment: `delivery_stops.leg = 'A' | 'B'` (van legs, `route-optimizer.ts:500`, `api/admin/optimize-route.ts:67`, `route-plan/index.astro:741`) is a completely different A/B from `biweekly_week`. Nothing conflates them today, but the collision is an easy future mistake.

## Kill list

1. **`members_receiving_on_date`** (`0021:194-256`) — DROP, plus fix `ROUTING_ENGINE_SPEC.md:27`.
2. **`_vacation_member_weeks_in_range` parity/cadence logic** (`0051:74-155`) — rewrite to honor `cadence`, or eliminate by passing the app-computed count into the RPC.
3. **`csaDistDates`** (`cycle-ui.ts:69-79`) — DELETE, already drifted, zero consumers.
4. **`upcomingMondayET`** (`flex-order.ts:335-350`) — replace with a re-export of `cycle.ts:upcomingMonday`.
5. **Python audience resolution** in `send_member_campaign.py:84-85` and `send_all_member_emails.py:49-51` — must not pick recipients.
6. **`track.astro:241-269` fallback** — must gate on the oracle.

The structural point behind all six: the app enforces one oracle well, but the *periphery* — SQL functions, ad-hoc scripts, and specs — has no such discipline, and the periphery is where both today's incident and the live vacation-counter bug live. A grep-based CI check that fails on any new `% 2` week math, `biweekly_week` comparison, or `members` query outside `cycle.ts`/`schedule.ts` would have caught every one of these.