# CSA Backlog — VERIFIED

**Verified:** 2026-08-30. Every line below was checked against code or the live
database in that session. Nothing here is carried over on trust.

**Why this file exists:** `docs/CSA_TODO.md` listed 42 open items. Of the 12 that
were code-verifiable, **7 were already done** — including the one marked
🚩 HIGH PRIORITY at the very top. A backlog that is ~60% stale is worse than no
backlog: it hides the live items in noise, which is how chef reminders stayed
dark for three weeks.

**Rule going forward:** an item is only "open" if someone re-verified it. If you
cannot verify it, it goes to UNVERIFIED — not to open.

---

## ✅ VERIFIED FIXED — remove from the active list

| Item | Evidence |
|---|---|
| 🚩 **Flex must deduct at order** (was top-of-list HIGH PRIORITY) | `api/account/flex-order/submit.ts:145` — debits at order against a debit/refund ledger |
| **Vacation hold must cascade to add-ons** | `lib/vacation-cascade.ts` creates rider holds for every active `add_on` row of the same customer; 17 passing tests |
| **Orphan add-ons dropped from pack sheets** | Fixed 2026-06-23 — add-on-only customers now print their OWN label at their stop (the Leah Rubenstein fix). 3 orphans exist this week (mushroom/North Park, bread/Highland Park, mushroom/Sewickley) and **all 3 have stops, so all 3 print** |
| **Member /box share_type mismatch** | `pages/box/index.astro:239` maps members to box_contents BUCKETS, not the enum |
| **"Home deliveries: NN active" card mislabeled** | `admin/index.astro:215` now counts genuine home deliveries |
| **"Unassigned Week A/B" count inflated** | `admin/index.astro:176` explicitly excludes weekly members |
| **`SOCIAL_CREDENTIALS.md` not gitignored** | `.gitignore:14` covers it; `git ls-files` confirms it was NEVER tracked |

---

## 🔴 VERIFIED STILL OPEN

| Item | Evidence | Note |
|---|---|---|
| **Shopify paid-status is fake** | `api/sync/shopify-orders.ts:886` hardcodes `payment_status: 'Paid'` | Portal payment data cannot be trusted. Blocks any revenue reporting |
| **Flex Phase 2 — card overage** | No overage/charge-beyond-balance code exists | Members can't spend past their balance |
| **GO / NO share-day banner** | No such component exists | Todd-requested clarity feature |
| **Member phone gaps** | **281 of 505 customers have no phone** | TODO said "65 of 197 active" — different denominator; re-baseline before acting |

---

## 🟡 RECLASSIFIED

| Item | Finding |
|---|---|
| **Sat-market members show "Wednesday" pickup** | `members.pickup_day` is NOT read by `cycle.ts` or `schedule.ts` — the resolver derives the day from `pickup_location.day_of_week`. The stale column is cosmetic, not operational. Downgrade to cleanup |

---

## ⚪ UNVERIFIED — do not treat as open until checked

- **Flex members can't SEE the flex list some weeks** (Nancy Bergman). Could not
  reproduce from code; needs a live account test.
- **`hme901@yahoo.com` holds $157.50 credit but is summer_veg.** Could not
  verify — `members` has NO `flex_balance_cents` column (the query returned null
  silently). Find where flex balance actually lives first.

---

## 🗄️ HISTORICAL — archive, do not action

Roughly 18 items dated **Jun 10–24 2026**: week-1 incident catch-up runs, the
add-on collapse recovery, specific weekend market loads, per-member make-goods
(Kathleen Ganster, Andrea Szolna, Melissa Maxwell, Jackie Weaver, Tony Rozic,
Drew Gifford, Cory Cope…). These are dated events 2½ months past. They either
happened or they didn't; the list cannot tell you which.

**Do not re-run them from this file.** Anything genuinely outstanding for a
member should live in `member_notices`, which prints on their label — that is the
mechanism that survives, not a markdown checkbox.

---

## 👤 NEEDS TODD (not code)

1. `chef_reminder_enabled = false` — ~50 chefs, no Monday reminder since Aug 10. Holding for a confirmed chef list.
2. Fresh-sheet gate — confirm weekly, or auto-send when the list is non-empty?
3. Google Maps key referrer restrictions (Cloud Console).
4. Collaborative Inbox — create the Google group + pick the address.
5. Correction note to the 66 mis-emailed members — approved, never sent.
6. 43 "no card order under their email" members — `scripts/out/members_to_verify.csv`.
