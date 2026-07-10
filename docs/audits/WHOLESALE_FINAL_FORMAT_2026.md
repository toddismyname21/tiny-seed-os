# Wholesale Portal — FINALIZED FORMAT (2026-07-10)

Synthesizes: [full audit](WHOLESALE_PORTAL_AUDIT_2026-07.md) · [software gap research](../research/WHOLESALE_SOFTWARE_GAP_RESEARCH_2026.md) · prior CSA industry/gap research. Owner goals: chefs order weekly; dovetails with CSA/market ops; lists out like clockwork.

## Design principles (locked)
1. **One system, four channels.** Wholesale is a CHANNEL of the same machine as CSA/market/flex — shared product_library, one pick-pack merge, Pack House splits per restaurant, cooler destination pallets, truck load numbering. Anything that forks this is rejected.
2. **The cadence IS the product** (research consensus): the fresh list lands same day, same time, every week — chefs plan their menus around our clock or they default to the broadliner.
3. **Token link stays** — no chef logins, ever. The bar is Choco/Pepper-class speed: list → tap link → order in under 2 minutes.
4. **Standing orders are the revenue foundation**; the portal is the growth layer on top.

## THE WEEKLY CLOCK (finalized)
| When (ET) | What | Status |
|-----------|------|--------|
| **Sun 5:10 PM** | 🥬 **Wednesday fresh sheet** → all chefs: products + tier prices in the body + personal link + "closes Tue 7 AM" | ✅ BUILT — gated, awaiting copy approval |
| Mon 9:05 AM | Deadline nudge → only chefs NOT yet in for Wed | ✅ LIVE |
| Tue 7:00 AM | Wed ordering closes — **server-enforced** | ✅ LIVE (verified) |
| Mon ~10 AM | Standing orders auto-generate + deck watchdog | ✅ LIVE (first scheduled fire 7/13 — watch) |
| **Wed 11:00 AM** | 🥬 **Friday fresh sheet** → all chefs (?day=fri links) | ✅ BUILT — gated |
| Thu 7:00 AM | Fri ordering closes — server-enforced | ✅ LIVE |
| Mon+Wed | Orders flow automatically into pick-pack totals, Pack House splits, labels w/ TRUCK #, pack-check slots | ✅ LIVE |

## CHEF EXPERIENCE (finalized format)
- `/order/<token>`: Wed/Fri period tabs (✅ live) · tier-priced catalog · edit-until-cutoff · kind closed-window message (✅ live)
- **ADD — Reorder-last-order button** (the #1 restaurant-app pattern): one tap pre-fills their previous order → adjust → submit. [Effort S-M]
- **ADD — "86'd item" notice**: product toggled off mid-period → auto-email to chefs with open orders containing it ("removed from your Friday order — substitute or credit?"). [S]

## ACCOUNT LIFECYCLE (finalized)
- **ADD — `/admin/wholesale/accounts/new`**: create account → token minted → **welcome email** auto-sent (personal link big-button, what we grow, "the list arrives Sunday evenings," Todd's number). Kills the 46-of-56-never-ordered cold-start. [M]
- **ADD — `/admin/wholesale/standing`**: list/add/edit/pause standing orders — no SQL. Enables the "you've ordered 3 weeks running — want a standing order?" conversion Todd does in person. [M]
- Status field retired as meaningless (audit: 55/56 'draft'); activity = has-ordered/visited funnel (exists).

## EXPLICITLY OUT (anti-recommendations)
Marketplace listings (Forager-style) · chef logins/passwords · payments/invoicing in-portal (Stripe-ACH decision memo exists, separate track) · WhatsApp/SMS ordering bots (revisit only if list emails underperform) · forking a wholesale-specific product catalog.

## BUILD ORDER
1. **ARM THE LISTS** (zero build — Todd approves copy, flip 2 flags) ← the clockwork ask
2. Welcome email + add-account UI (funnel leak)
3. Standing-orders admin UI
4. Reorder-last-order button
5. 86'd-item notification
6. Watch: standing-orders cron first live fire Mon 7/13 (deck watchdog armed)
