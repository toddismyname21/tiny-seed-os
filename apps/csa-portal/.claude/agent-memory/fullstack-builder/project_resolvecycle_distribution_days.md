---
name: resolvecycle-distribution-days
description: resolveCycle byDistributionDay now seeds Tue/Wed/Sat/Sun; Sun = the weekend run (South Side Market)
metadata:
  type: project
---

`resolveCycle` in `src/lib/cycle.ts` is the single source of truth for the CSA pack/harvest/label/manifest pipeline. Its `byDistributionDay` map now seeds **Tue/Wed/Sat/Sun** (Sun added 2026-06-30). Sunday is the WEEKEND run — the Sunday "South Side Market" stop (pickup_locations id `8ee7e46b-0a5c-494c-8697-35978ebec319`, day_of_week='Sun') is packed at the same time as the Saturday markets (Bloomfield + Sewickley).

**Why:** South Side was silently resolving as `(unknown)`/null and falling out of the weekend run. Two bugs: (1) `totalsByStop` took stop name/day from `stopMembers[0]`, which can be a null-pickup ADD-ON row that rode to its customer's box stop → poisoned the whole stop's name/day; fixed by deriving from the first member that actually has a pickup_location. (2) `byDistributionDay` forced any non-Tue/Wed/Sat day (incl. Sun) into Wed; fixed by seeding a Sun bucket and not forcing Sun.

**How to apply:**
- The day-grouped admin VIEWS treat **Sat + Sun together as one "Weekend" group/run** (pack-load groups them; labels DAY_RANK ranks Sun=4 right after Sat; harvest+floral route Sat/Sun→Thursday harvest/floral; pack-sheet has a `?day=sun` tab). If you add a new day-grouped consumer, group Sat+Sun together or you'll re-hide South Side.
- harvest + floral re-derive each member's day from `m.pickup_location?.day_of_week` (not the map key), so they're robust to bucketing — but they DO enumerate `byDistributionDay.values()` deduped by id, so any new bucket is still picked up.
- **Live-data gotcha:** South Side's members are all `biweekly_week='A'`. On a parity-B week (e.g. 2026-06-29) they are legitimately off-week and absent from activeStops — that is correct, not a bug. Verify resolver fixes on a Week-A cycle (e.g. 2026-07-06) where the stop is actually receiving. weekParity anchor = 2026-06-08 (parity 0 = Week A).
- **Admin pages cannot be curl-verified for content:** admin auth is a real Supabase session cookie (no static token in .env), so curl returns 303 (= deployed + auth-gated). To prove rendering, verify the resolver data + replicate the page's grouping logic in a tsx script against prod Supabase (PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from apps/csa-portal/.env), then delete the script. See [[csa-vercel-deploy]].
