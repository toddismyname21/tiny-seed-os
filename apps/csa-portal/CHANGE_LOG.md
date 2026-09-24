
## 2026-09-24 — PM_Architect (Loren terminal) — Tomatillo shortage: refunds + inventory zeroed
- Tomatillos unavailable for wk 2026-09-21; ONLY two orders existed (verified by item-id sweep): Steven Schwab x3 ($15), Jen VanderPlaats x4 ($20)
- Both: Shopify store credit issued (delta mutation, balances verified $31.50→$46.50, $74→$94), flex_transactions refund rows, order lines → cancelled, apology emails sent (Gmail 1a0d3ab3…, 1a0d3c42…)
- flex_inventory Tomatillos remaining_qty 33→0 per Todd — prevents re-orders/repeat refunds. Item left active for when stock returns.

## 2026-09-16 — PM_Architect (Loren terminal) — Oakmont one-day move + Dwell Florals stop
- Oakmont: Taco Boys closed this week → member-host porch 388 College Ave TODAY only. 3 affected members emailed (Nick/Emily/Caranina, Gmail 1a0aa4e4*); stop-level member_notice 2eda8798 (customer_id NULL, stop_hint Oakmont) prints on today's stop sheet. Stop record UNCHANGED (reverts next week). Notice to be marked done after today's drop.
- Dwell Florals (Jenna): one bucket wholesale flowers, 1645 Pioneer Ave 15226. route_manual_stops 3b4db180 (geocoded) + delivery_stops on today's leg A after Mt. Lebanon.
- OAKMONT WAS MISSING from today's routes entirely (Todd caught it) — 3 members expected boxes. Ran on leg A every week since June (recently #8, Fox Chapel→Highland Park). Re-inserted at #8 (stop 3c702c5c), 14 stops shifted, total_stops → 22. Final: Oakmont #8, Mt. Lebanon #17, Dwell #18. TODO: find why route-build dropped Oakmont (gather step?).

## 2026-09-14 — PM_Architect (Loren terminal) — New member Joe Zierer added
- Customer b7a6c853 (J.Zierer@speedpro.com) + 2 member rows: small WEEKLY veg + petite WEEKLY flower, start 2026-09-16, end 2026-10-07 (4 wks), Cranberry host, Wed
- payment: COMPED per Todd (trade — Joe made the farm's signs). payment_status=Paid, amount_paid=$0, note on both rows
- Welcome email sent (Gmail 1a0a20a57a450c6d) w/ pickup + portal sign-in steps; fixed email case (J.Zierer→j.zierer) — RLS `email = jwt->>'email'` is exact-match and auth lowercases, would have locked him out; audited all active customers: 0 others mixed-case
- Verified via resolveCycle(2026-09-14): both shares resolve at Cranberry

## 2026-09-06 — PM_Architect — Tomato BONANZA CSA orders processed
- 6 member orders (all 20 lb): Jan+Kathleen flex-debited $45 each (Shopify + journal); Jessica/Cory/Katie/Kristina QB-invoiced 9000079-82 w/ pay buttons (new QB customers 1114-1117)
- Orders structured as flex_orders: 10 lb flats qty 2 @ $22.50 (item 'Bulk Tomatoes — 10 lb flat', wks 9/7 + 9/14)
- Flat tickets PDF (1-of-2 format) emailed to Todd; Kathleen (flex, no box) + Jessica (biweekly, wk 9/14) flagged
- Kristina pickup_day corrected Wed→Sat (Sewickley is Saturday only — Todd)
- 6 confirmation emails sent after draft+approve

## 2026-09-06 — PM_Architect — Weekly wholesale list sent + portal reconciled
- Availability email → 52 accounts w/ personal portal order links (Mediterra/Butter Joint/Apteka/Allegro excluded — individual pitches sent separately; Omar emailed)
- Portal reconciled to match email: deactivated Green Beans ×2 (deer), Jalapeños, Jimmy Nardellos (Apteka dibs), King Spring Mix ×2 (salad offline), kale ×3
- East End contact: tkulp@ → gm@eastendfood.coop (contact record fixed)
- Reconciler mislink ROOT CAUSE fixed: my '[9/4: late fee...]' PrivateNotes were parsed as delivery dates by memo_dates tier → rewrote 51 notes to 'Sept 4 2026:' (unparseable). RULE: never write slash-dates in QB memo/note fields.

## 2026-09-06 (eve) — PM_Architect — Standing orders + day's order intake
- Mediterra: NEW standing order 110 lb slicers/Wed (Todd directive); salad standing order (50 lb King) PAUSED — manually add if pickable
- Apteka FINAL Wed 9/9 $752.50 (from Kate texts: 150#@2.00, 40 Carmen, 25 Italian eggplant, 30 Jimmys, parsley)
- Portal orders in: Allegro $211.25 (Wed), Titusz $111.25 (Wed) + $61.25 (Fri)
- CSA tomato boxes: Denise Fazio added (9th buyer, wk 9/14, inv 9000086); Peter Cormas unsubscribed
- Sue/C4H count-check email sent (24 cherry bags / 0.3 lb tomato per family flag)
- Python 3.14 hijacked python3 without SSL certs — certs installed; /tmp/qbrenew.sh pinned to /usr/bin/python3
