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

---

## 🔨 TO BUILD — inbound text → draft order (Todd 2026-08-31)

**Ask:** "Is there a way you can know when I get a text? If it is an order it can get entered?"
Part of the autopilot-with-approval goal — handle orders conversationally while
doing something else.

### What already works (proven 2026-08-31)
| | |
|---|---|
| **Send** | AppleScript → Messages. Two real sends, `sent=1 delivered=1`. Goes from Todd's own number, into the existing thread. No Twilio, no cost. |
| **Read** | `~/Library/Messages/chat.db`, incl. decoding `attributedBody` (only ~3 of 638 recent messages carry readable `.text`; the rest are blobs) |
| **Identify** | `config/verified_facts.json` names 24 numbers; `wholesale_account_contacts.phone` has 12 more |

### What's missing
A `launchd` agent with `WatchPaths` on `chat.db` + `chat.db-wal` — fires on
filesystem change, no polling.

### ⚠️ The design constraint, learned the hard way
**Classify the SENDER before parsing any content.** On 2026-08-31 the message
`"1105 lb potato / 60 lb pepper / 70lb tomato / 60 lb bean"` looked like a
textbook order. It was **Ben Finley (412-862-0215), the farm manager, reporting
harvest counts.** Auto-entry would have created a 1,105 lb potato order for the
farm's own crew chief.

Crew are not chefs. Ben sends numbers all day and none of them are orders.

**Second constraint:** even real chef texts are often unparseable intent. Kate
Lasky, 2026-08-24: *"I can take 100-150# easy, and lemme know if you are trying
to move more."* A range plus a negotiation — she ended at 300 lb, not 150.

### Agreed shape
1. launchd agent wakes on chat.db change
2. Sender must match a KNOWN CHEF number (never crew, never unknown)
3. If it reads like an order → write a **draft** order + notify Todd
4. **Todd confirms. Never auto-enter.**

Same pattern as the flex Thursday draft, which already works.

### Do NOT revive `sms_intelligence/` wholesale
It exists and once did this, but: plist points at `/Users/samanthapollack/...`
(old machine), `launchctl` shows it unloaded, `/usr/local/bin/python3` missing,
`anthropic`/`redis`/`chromadb` all uninstalled, no log — **it has never run on
this Mac.** It also targets the retired Google Sheets backend and needs Redis +
ChromaDB. `config.py` uses `Path.home()` so the code is portable; the useful
parts are the chat.db reader and the attributedBody decoder. Rebuild small
against Supabase rather than standing up three services for a dead backend.

### Also worth doing while in here
`/admin/text-chef` currently reads only `wholesale_accounts.phone` (13 accounts).
**12 more contacts have phones on `wholesale_account_contacts`** — including
Sherri (Black Radish), Brian + George (Butter Joint), Anthony + Aniceto
(Mediterra), David (Cafe Verde). Widening it reaches ~17 people by name instead
of 13 accounts.
