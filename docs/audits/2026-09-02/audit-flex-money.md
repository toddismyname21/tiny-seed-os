## Farm Flex ordering + money pipeline — audit

**Headline:** The `pending→locked` transition does not exist anywhere in the codebase — no cron, no RPC, no admin action, no trigger. `locked` is a vestigial value in a CHECK constraint that nothing ever writes. Separately, cancelling a flex order **keeps the member's money**: submit debits Shopify store credit, and neither `cancel_flex_order` nor the cancel/skip handlers ever refund it. And `flex_orders` RLS grants members direct INSERT/UPDATE, so the `place_flex_order` RPC is not the only way in — the payment path can be bypassed entirely without touching the RPC at all.

All paths below are relative to `/Users/toddsmacbookpro2026/Documents/TIny_Seed_OS`.

---

## (a) The lock mechanism does not exist — SEVERITY: HIGH (data-model, not money)

**There is nothing to fix in a broken lock job, because there is no lock job.** Evidence:

- `apps/csa-portal/vercel.json:3-12` — exactly two crons: `flex-list-reminder` (Thu 11:00 UTC) and `vendor-bills`. Neither locks.
- `apps/csa-portal/src/pages/api/cron/` contains 11 endpoints; none is a lock job.
- Every `cron.schedule` in `supabase/migrations/` (0033, 0074, 0075, 0076, 0077, 0078, 0080, 0081, 0082, 0094) — nightly-health, harvie-ingest, chef/flex order reminders, wholesale lists, fresh sheet, invoice reconcile. None touches `flex_orders`.
- Grep of every `flex_orders` write in the app: the **only** two status writes in existence are `INSERT ... 'pending'` (`supabase/migrations/20260901112500_flex_order_credit_members.sql:152-157`) and `UPDATE ... 'cancelled'` (`supabase/migrations/0038_cancel_flex_order.sql:99-101`).

So "72 pending, 1 locked" for week 2026-08-31 is the *correct and expected* output of the system as written. The single `locked` row is almost certainly a manual SQL edit.

**Important nuance: `pending` is already the packable status.** Every ops surface treats `pending|locked|fulfilled` as one set (`src/lib/cycle.ts:767`, `pack-sheet/[...slug].astro:352`, `pack-check/[...slug].astro:443`, `labels/[...slug].astro:520`, `stop-manifest/[...slug].astro:96,127`, `route-sheet:139`, `host-sheets:118`, `pack-load:73`, `harvest:146`, `pick-pack:419`, `TodayFlow.astro:197,392`). Money is also debited at order time, not at lock (`src/pages/api/account/flex-order/submit.ts:213-239`, per the Todd 2026-06-18 change documented at :204-212).

**Therefore the missing lock is NOT why the $77.50 order went unpacked.** A pending order for a member on that week's roster does print. The real cause of that incident is (e). What the missing lock *does* cost you is the freeze semantics: after cutoff nothing prevents further mutation of an order the farm is already harvesting, and `cycle.ts:830` (`if (s.status !== 'locked') continue;`) plus `flex-order.astro:254` (`hasLocked`) are dead branches that will never fire.

**Fix.** Either (1) add a real lock cron — `/api/cron/flex-lock` on the pg_cron + Vault pattern of migration 0074, running Mon 07:05 ET and Thu 07:05 ET, flipping `pending→locked` for weeks past their run-specific cutoff — or (2) formally retire `locked` and delete the dead branches. **Recommend (1)**, because a real lock is the natural enforcement point for the Tue/Wed closure in (b) and gives cancel a hard stop. Do not do a partial version of either; the current half-state is what makes the data unreadable.

---

## (b) Post-cutoff orders — SEVERITY: HIGH (policy conflict, not a missing guard)

Server-side enforcement **does exist and does run**: `submit.ts:93` calls `isBeforeOpen(week) || isPastCutoff(week, Date.now(), pickupDay)`. The cutoff is defined in `src/lib/flex-order.ts:233-247`:

```ts
export function cutoffEpochMs(weekStarting: string, pickupDay: PickupDay = null): number {
  if (isWeekendMarket(pickupDay)) {
    return etWallClockEpochMs(weekStarting, 3, 7, 0);   // THURSDAY 7 AM ET
  }
  if (weekStarting === WEEK_EXTENDED_TUE) {
    return etWallClockEpochMs(weekStarting, 1, 7, 0);   // Tue 7 AM (one-week hack)
  }
  return etWallClockEpochMs(weekStarting, 0, 7, 0);     // MONDAY 7 AM ET
}
```

**The Wednesday 8:28 AM order was not a bypass — it was allowed by policy.** Any member whose `pickup_locations.day_of_week` is `'Sat'` or `'Sun'` (`isWeekendMarket`, :173-175) has a cutoff of **Thursday 7 AM ET**, so Wednesday morning is squarely inside their window. This is the documented Todd 2026-06-12 / 2026-06-26 rule at :120-131 and :224-232.

Two aggravating factors:

1. **The page silently rolls the week forward.** `currentOrderWeek` (`flex-order.ts:384-420`, used at `flex-order.astro:137`) returns the next week once the current one closes. So a Wed-run member ordering Tuesday is charged immediately for *next* week's delivery while believing it is this week's. Nothing in the confirmation email disambiguates this beyond `prettyWeek(week)`.
2. **`WEEK_EXTENDED_TUE = '2026-08-17'`** (`flex-order.ts:117`) is a live one-week hack whose own comment says "Remove after 2026-08-18." It is still in the code.

**Enforcement design for the owner directive.** The directive ("closed Tue+Wed for Tue/Wed CSA shares") is already satisfied for Wed-run members by the Monday 7 AM cutoff. What violates it is the weekend-market Thursday 7 AM cutoff colliding with Tue/Wed shares — and members holding *both* a weekend pickup and a Tue/Wed share get the looser deadline. Proposed:

- **Derive the cutoff from the fulfilment run of the order's share, not from the member's pickup day.** Add `runOf(member, week): 'wednesday' | 'weekend'` in `flex-order.ts` and make `cutoffEpochMs` take the run. A member with any Tue/Wed obligation resolves to `'wednesday'` → Monday 7 AM. Keep the existing fail-toward-stricter posture of `asPickupDay` (:151-165).
- **Enforce it in three places, not one.** Today it lives only in the TypeScript handler. Push the same instant into `place_flex_order` (see (d)) and into the lock cron from (a), so a locked row is immutable regardless of caller.
- **Delete `WEEK_EXTENDED_TUE`** and replace ad-hoc extensions with a `portal_settings` row (`flex_cutoff_override_<week>`), so an extension is data Todd can set from his phone rather than a deploy.

---

## (c) Split-brain money — SEVERITY: CRITICAL

**Two ledgers, and they are joined on a column one of them never fills.**

The view (`supabase/migrations/0007_flex_funds.sql:26-36`):

```sql
LEFT JOIN flex_transactions ft ON ft.member_id = m.id
```

Every **credit** is written with `email` only, no `member_id`:
- `src/pages/api/sync/shopify-orders.ts:1032-1037` — flex top-up principal
- `src/pages/api/sync/shopify-orders.ts:1054-1059` — loyalty bonus
- `src/pages/api/sync/shopify-orders.ts:540-546` — referral bonus

Every **debit** is written *with* `member_id`:
- `src/pages/api/account/flex-order/submit.ts:222-225` (debit) and `:228-231` (partial refund)

The view therefore sums debits and drops the matching credits — producing exactly the reported negatives (−$5.00, −$232.50) while Shopify correctly holds $47.50 and $172.50. The only writer that sets both fields is the admin credit form (`src/pages/api/admin/members/[id]/flex-credit.ts:81-89`).

**Full money flow as it stands:**

| Step | Money moves in | Ledger row | `member_id`? |
|---|---|---|---|
| Top-up purchase | Shopify store credit (`issueStoreCreditDelta`, sync:1021) | credit ×2 (principal + bonus) | **no** |
| Referral bonus | Shopify (sync:525) | credit | **no** |
| Admin manual credit | *nowhere* — ledger only | credit | yes |
| Flex order | Shopify debit (submit.ts:221) | debit | yes |
| Order edited down | Shopify re-credit (submit.ts:227) | refund | yes |
| Market checkout | Shopify debit (`market-checkout.ts:232`) | **none at all** | — |
| Cancel / skip | **nothing** | **none** | — |

Note two further breaks in that table: the **admin credit form moves no real money** (it writes a ledger row only, so the member cannot spend it — `getFlexBalance` reads Shopify), and **market checkout debits Shopify with no ledger row whatsoever** (grep for `flex_transactions` in `market-checkout.ts` returns nothing), so that spend is invisible to history and to any reconciliation.

**Consumers of `member_flex_balance`:** exactly one — `src/pages/admin/members/[id].astro:236`. Nothing member-facing reads it; `getFlexBalance` (`src/lib/flex.ts:123-165`) reads Shopify. That is why the wrong number only ever surfaced on the admin member page.

**Proposed canonical design — Shopify is the balance, Supabase is the journal.**

1. **Declare it in one line and enforce it:** spendable balance = Shopify store credit, always. `flex_transactions` is an append-only journal for accounting (bonus/principal split, escheatment), never a balance source.
2. **Drop `member_flex_balance` entirely**, or redefine it as an explicitly-labelled `journal_net` keyed on `email` (`JOIN customers c ON c.email = ft.email`) rather than `member_id`. Replace the one consumer at `admin/members/[id].astro:236` with a `getFlexBalance()` call so admin and member see the same number from the same source.
3. **Backfill `member_id` on email-only rows** and add a trigger that resolves `member_id` from `email` on insert, so the two writer styles converge.
4. **Every money movement writes a journal row.** Add the missing ones: market checkout, cancel refund, admin credit (and make admin credit actually call `issueStoreCreditDelta`).
5. **Add a reconciler** to `nightly-health.ts`: for each member with journal activity, compare Shopify balance against journal net and alert on drift. This is the check that would have caught both reported members before they noticed.

---

## (d) `place_flex_order` security — SEVERITY: CRITICAL

`supabase/migrations/20260901112500_flex_order_credit_members.sql`, `SECURITY DEFINER`, granted to `authenticated` (`0037_place_flex_order.sql:213`).

**D1 — `p_balance_cents` is caller-supplied and is the only payment check.** The over-balance cap at :133-139 compares the cart against a value the client passes in. The actual Shopify debit lives in TypeScript (`submit.ts:213-239`), *outside* the RPC. Any authenticated member can call the RPC directly with `p_balance_cents: 2147483647` and receive a pending order with **no debit at all** — and pending is packable, so it prints on every sheet and gets delivered. This is free food with a valid login.

**D2 — the RPC has no window check.** There is no cutoff logic anywhere in the function body, yet `submit.ts:188` lists `'window_closed'` among the codes it expects back from the RPC. That handler branch is unreachable; the guard exists only at `submit.ts:93`. Direct RPC calls order at any hour of any day.

**D3 — the 2026-09-01 patch widened the gate.** Removing the `share_type='flex'` requirement (:52-60) was correct for the Anna Phillips case, but combined with D1/D2 it means any live `active|paused|onboarding` member row on the caller's account can now carry a free, out-of-window order.

**D4 — RLS makes the RPC optional anyway.** `supabase/migrations/0031_csa_operations.sql:378-395`:

```sql
CREATE POLICY flex_orders_member_insert ON flex_orders
  FOR INSERT TO authenticated
  WITH CHECK (member_id IN (SELECT id FROM members WHERE customer_id = current_customer_id()));

CREATE POLICY flex_orders_member_update ON flex_orders   -- :383-395
```

A member can `POST /rest/v1/flex_orders` with `unit_price_cents: 0`, `qty: 50`, `status: 'pending'` and skip `place_flex_order` completely — no oversell guard, no balance cap, no price lookup, no debit. They can also UPDATE an existing order after cutoff. **Hardening the RPC alone fixes nothing while these policies stand.**

**Proposed hardening:**
- **Revoke member INSERT and UPDATE on `flex_orders`.** Keep SELECT. All writes go through the two RPCs. This is the single highest-value change in this report.
- **Move the balance read inside the RPC.** Drop `p_balance_cents` from the signature and have the function sum a server-side balance (a `flex_balance_cache` table refreshed by the sync, or a `pg_net` call to a portal endpoint). If Shopify must stay outside the DB, then perform the debit *before* insert and roll back the order when the debit fails — never the current order-then-maybe-debit-fail-soft ordering at `submit.ts:236-238`.
- **Add the window check to the RPC** so `'window_closed'` becomes reachable, and re-add a status guard so locked rows cannot be edited.
- **Reject `total_cents` mismatches** and keep price lookup server-side (already correct at :95-101 — preserve that).

---

## (e) Off-roster invisibility — SEVERITY: CRITICAL. **This is what cost the $77.50.**

The roster is `resolveCycle`'s **included** members, built from `members` where `status='active'` (`src/lib/cycle.ts:626-637`) and then partitioned — biweekly off-week, vacation hold, out-of-season members are excluded (`:930-935`).

Every per-member ops surface then scopes its flex query to that roster:

- `pack-sheet/[...slug].astro:348-355` — `.in('member_id', memberIds)` where `memberIds = selectedMembers.map(m => m.id)` (:342)
- `stop-manifest/[...slug].astro:92-98` and `:123-131` — `.in('member_id', memberIds)` from `allRenderedMembers`
- `pack-check/[...slug].astro:444`, `labels/[...slug].astro:521`, `route-sheet:140`, `host-sheets:119`, `pack-load:74` — all `.in('member_id', memberIds)`

A paid order from a member not on that week's roster is **never fetched**, so it prints nowhere.

**The precise mechanism, and why it looks so strange in practice:** `harvest/[...slug].astro:139-147` and `pick-pack/[...slug].astro:411-420` are scoped by **week only, with no member filter**. So the produce for an off-roster order *is* harvested and *is* picked — it just has no bag, no label, no manifest line, and no stop. The food is grown, pulled, and then orphaned on the pack bench. That matches the hand-carry-via-`member_notices` workaround exactly.

Compounding it: `pack-sheet/[...slug].astro:366-368` explicitly *drops* flex members with no order — correct for roster members, but it means the sheet has no "extras" region where an off-roster bag could surface.

**Fix.** Invert the query direction. Fetch flex orders **by week first**, then union their `member_id`s into the rendered set:

1. In `resolveCycle`, after the flex fetch at `cycle.ts:757-767`, collect `member_id`s present in `flexOrders` but absent from `included`, load those member rows, and expose them as a new `flex_only: CycleMember[]` bucket (parallel to the existing `donated` / `excluded_*` buckets at `:203-221`).
2. Route them to a stop using their normal `pickup_location_id` so they land on the right manifest and route sheet.
3. Render them as a clearly-marked **"Flex only — no box this week"** section on pack-sheet, pack-check, stop-manifest, labels, and host-sheets. They need a label and a manifest line; they must not be counted as boxes.
4. Add a nightly-health assertion: every `flex_orders` row for the week whose `member_id` is not on any rendered sheet is an alert. This is the guard that turns a silent loss into a Sunday-night email.

---

## Sweep — additional findings

**S1. Cancel keeps the member's money — SEVERITY: CRITICAL.**
`submit.ts:221` debits Shopify store credit at order time. `cancel_flex_order` (`0038_cancel_flex_order.sql:83-107`) restocks inventory and flips `pending→cancelled` — and that is all. Neither `cancel.ts` nor `skip.ts` calls `issueStoreCreditDelta` (grep confirms: the only store-credit movements in the whole app are `submit.ts:221,227`, `sync/shopify-orders.ts:525,1021`, and `market-checkout.ts:232`). **A member who cancels loses the full order value.** No ledger row is written either, so it is invisible in history. Fix: refund in the cancel handler and write a `refund` journal row, mirroring `submit.ts:226-231`.

**S2. `skip.ts` acts on a stale money model — SEVERITY: HIGH.**
`skip.ts:12` states "Balance is untouched (nothing was ever charged — store credit only debits at fulfillment)." That has been false since the 2026-06-18 debit-at-order change documented in `submit.ts:204-212`. Skip calls the same unrefunding RPC, so **"Skip this week" silently confiscates the balance** of anyone who had already ordered. Same fix as S1.

**S3. `cancel_flex_order` still requires `share_type='flex'` — SEVERITY: HIGH.**
`0038_cancel_flex_order.sql:78-80` returns `not_flex` for any non-flex row. The 2026-09-01 migration relaxed this in `place_flex_order` but **not** in `cancel_flex_order`. A store-credit member can now place an order they can never cancel or skip — the exact asymmetry that turns a self-service action into a support ticket. Apply the same patch.

**S4. Store-credit debit failure is swallowed — SEVERITY: HIGH.**
`submit.ts:236-238` catches every Shopify failure and logs it. The order stands as pending (therefore packable and deliverable) with **no charge**. The comment at :211-212 says "the backfill/retry reconciles" — no such backfill or retry job exists in `src/pages/api/cron/`. Fix: build the reconciler, or fail the order.

**S5. `isFlexFundsTitle` matches any title containing "flex" — SEVERITY: MEDIUM.**
`src/lib/flex.ts:543-545` does `title.toLowerCase().includes('flex')`. Any future Shopify product with "flex" in its name (a flexible-stem bouquet, a flex-fit hat) will silently issue store credit plus a loyalty bonus for its full price. Fix: match on `productType === 'flex-topup'` or an explicit variant-id allowlist against `FLEX_TOPUP_VARIANTS` (:486-491).

**S6. Gift cards are unimplemented — SEVERITY: LOW.**
`flex_transactions.gift_card_id` exists (`0007_flex_funds.sql:14`) with no reader or writer anywhere in `src/`. Dead column; either wire it or drop it.

**S7. Confirmation email cannot disambiguate the week — SEVERITY: MEDIUM.**
`submit.ts:290-299` sends `prettyWeek(week)` and `closeLabel(week, pickupDay)`. Given the silent week-roll in (b), a member charged Tuesday for next week gets an email that reads plausibly for either week. Add an explicit delivery date and the member's own pickup day/stop to the template.

---

## Suggested fix order

1. **Revoke `flex_orders` member INSERT/UPDATE RLS** (D4) — closes the free-food path in one migration.
2. **Refund on cancel and skip** (S1, S2) and **patch `cancel_flex_order`'s `not_flex` gate** (S3) — members are losing real money today.
3. **Off-roster flex bucket in `resolveCycle`** (e) — stops the recurring hand-carry.
4. **Fix `member_flex_balance` and add the Shopify-vs-journal reconciler** (c).
5. **Move the balance and window checks inside `place_flex_order`** (D1, D2).
6. **Add the lock cron** (a) and **run-based cutoffs, deleting `WEEK_EXTENDED_TUE`** (b).

Items 1 through 3 are each a small, self-contained change and together they stop every active loss. Items 4 through 6 are the structural work.