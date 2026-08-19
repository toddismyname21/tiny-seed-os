# Software Ideas & Backlog — Wholesale + CSA

_One place to dump ideas for the wholesale and CSA software. Anything with a `- [ ]`
lands in the Sunday open-items email. Tick it when it's built or drop the line if
it's dead._

_Started 2026-08-19. Seeded with findings from the Aug 17–19 sessions that were not
captured anywhere else._

## 🧾 Wholesale

- [ ] **Catch texted orders automatically.** David Green and John Rezzetano both text orders that never got entered — 7/22 and 7/29 were billed at $60 (the bare standing order) when full lists had been texted. ~$341 recovered by hand for David alone. Something should flag "a text arrived from a wholesale contact and no order line changed."
- [ ] **The standing order is a trap.** Butter Joint, Cafe Verde, Black Radish and Mediterra all auto-create a standing order weekly. When a chef adds to it by text/email and nobody enters it, the auto-order still ships and the addition is silently lost. Standing orders should surface as "confirm or add" rather than silently completing.
- [ ] **"You're already in for Wednesday" copy discourages add-ons.** The availability email tells standing-order accounts they're already set, which reads as "nothing to do." Butter Joint went 8 straight weeks at the bare $100 minimum.
- [ ] **Reusable order-editor script** (Todd asked 2026-08-18) — a supported way to add/correct lines on an existing wholesale order, instead of a throwaway script each time. Must refuse to touch an order that already has an `invoice_number`.
- [ ] **Invoice memo needs the Food Bank sales-order number.** Marc Rattay requires an SO# in the memo per delivery (SO89802 = 8/11, SO89803 = 8/18). Currently manual and already missed once.
- [ ] **QuickBooks late fees are firing on partner accounts** — 1.5% auto-applied to Harvie and the Food Bank. Charging a food bank a late fee is a bad look and makes the signed proof-of-delivery amount disagree with the QB balance, which stalls payment.
- [ ] **Wholesale catalog drifts from the field.** Before 2026-08-18 the catalog offered cucumbers and fennel that weren't harvestable while 13 crops standing in the field had no price at all. The catalog should be checked against the week's actual availability.
- [ ] Per-chef order history on the order page ("last time you took 10 lb") to make reordering one tap.

## 🥬 CSA / member portal

- [ ] **Make-ups need a closing loop.** They now print on labels (2026-08-19), but nothing marks them fulfilled — a notice stays open until a human ticks it. Packing one should be able to close it.
- [ ] **Vacation holds: `skip` silently costs a paid delivery.** No credit, no make-up, no notice. `move` exists in the schema but isn't the default or surfaced at hold creation. See CSA_TODO for the Anna Phillips case.
- [ ] **Add-on-only holds** can exist with no matching box hold — audit whether that's ever intentional or always a bug.
- [ ] **Flex store is hard to find.** Jan Duckworth, a long-time member, couldn't locate it two weeks running and missed her week.
- [ ] **Negative flex balance** seen on a member row (Jan Duckworth, −$5.00). Balances shouldn't go below zero.
- [ ] **GO / NO share-day banner** — "🟢 your share is ready TODAY at <stop>" vs "🔴 no share this week, next box <date>". Directly fixes recurring Week A/B confusion.
- [ ] Driver name is shown to members on the tracker ("Amelia is out delivering"). Nice, but confirm that's wanted.

## 🔁 Ops / cross-cutting

- [ ] **Crew role can't drive.** `crew` reaches only handoff, cooler and pick-pack; the route pages and every route API are `requireAdmin`. So a driver must be made `staff`, which grants member PII, QuickBooks, campaigns and exports. Needs a driver-capable role that sees the run sheet but not the books.
- [ ] **Pack-crew daily checklists** — Monday is built (migration 0092 + lib + endpoint, page unfinished). Tue/Wed/Thu still drafts awaiting Todd.
- [ ] Text-promise catcher — daily scan of Messages for commitments, feeding the Friday/Sunday list.
