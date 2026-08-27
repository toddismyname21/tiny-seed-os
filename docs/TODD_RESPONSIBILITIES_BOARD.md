# Todd's Responsibilities Board
_Started 2026-08-02. PM-maintained — reviewed every Friday Accountability Hour. Nothing falls off this list without Todd's explicit say-so._

## 💵 NEXT PAYROLL — carry Saturday Aug 15 forward
**10.50 hrs each · $157.50 each · $315.00 both.** Aug 15 fell one day past the 8/1–8/14
cutoff and is NOT yet paid. It is the last row on the paper card photographed 2026-08-27.

Add it to the 8/15–8/28 period **before** entering anything new — and do not re-read that
card from the top, or the ten days already paid will go through twice.

Full record: `legal/h2a_worker_onboarding/workers_2026/_case_98551_shared/payroll/HOURS_LOG.md`
(kept local — worker PII, gitignored).

⚠️ Also unconfirmed: **Aug 10 reads 7:30 AM → 8:00 PM = 12.00 hrs**, 1.5 hrs longer than any
other day. If it was really 6:00 PM, the period just paid was overstated by 2.00 hrs each.

## 🅿️ PARKED — FIELD PLAN, week of 2026-08-26 (Todd parked it 2026-08-27)
Full plan: `docs/field/WEEK_PLAN_2026-08-26.md` — 44 tasks across 12 fields, organised by
field, by sequence, and by equipment pass.

**Nothing here is lost — pick it up by opening that file. Two things unblock the rest:**
1. **ORDER COVER CROP SEED.** Six fields (Z3, Z5, Z1, M, Brassica, Lower) are queued to be
   tilled and sown. Every one of those tillage jobs ends in bare ground if the seed is not
   on the farm. This one order gates ~2/3 of the week's field work.
2. **Inventory seedlings + assign ground** — JS1 and Field I lettuce plans depend on it.
3. **Flax timing research for Z1** — blocked until reputable sources are checked.

**To resume, answer two questions:** (a) confirm the broadcast seed rates, and (b) map the
seven fields that have no record in the system — JS5, F3M, J field, Field I, Brassica field,
Lower field, the two flower fields. Everything else is already sized and sequenced.

**Also captured:** Shorin bag run (6#/8#/12# paper) · greenhouse run of 87 trays into 200s ·
20 × 6" pp Salanova next week for the high tunnel · Lower field retiring from production ·
**migrate app.tinyseedfarm to a better back end so organic records are easy to keep.**

## ⏰ TONIGHT — Wed 2026-08-26 — REPLY TO 7 CSA MEMBERS
**You promised this in writing today.** All 7 were emailed at ~12:40 PM saying you had read
their message and would reply properly TONIGHT. Talking points PDF sits in your inbox:
"CSA emails — talking points" (`CSA_Talking_Points_2026-08-26.pdf`).

| # | Member | What they need |
|---|--------|----------------|
| 1 | **Maggie Debski** | 🔴 TODAY — TRIPLE mushrooms + DOUBLE bread, notices due 8/24, she asked about THIS Wednesday |
| 2 | **Anna Phillips** | 2 make-up mushrooms (missed 7/06 + 7/20), overdue since 8/17 — give her a DATE |
| 3 | **Whitney Sunseri** | Owed 2 cheese: 1 from a make-good closed early + this week's miss |
| 4 | **Kelly Corrigan** | Close the Edgewood/Swissvale notice (she's staying at Highland Park); NEW cheese miss to log |
| 5 | **Ashley Lyons** | 💵 Box never arrived 8/19, has photo evidence, asked for a REFUND — nothing ever logged |
| 6 | **Marissa Norris** | 💵 Paid $12 for 1.07 lb of tomatoes at Bloomfield — suggest flex credit for the difference |
| 7 | **Jan Duckworth** | Added flex funds, cannot find how to spend them — send the direct link + a screenshot |

**The pattern, not the incidents:** 5 of 7 are add-on failures (cheese/bread/mushrooms), and
TWO make-good notices were marked FULFILLED while their own text says they were only partly
filled. Add-on packing and make-up verification are the fix — not seven apologies.

## ▶️ START HERE — 2026-08-17 morning (picked up from the 8/16 late session)
0. **SENDING THE WHOLESALE AVAILABILITY LIST + personal notes to Csilla and John (Todd's plan for 8/17).** Audience verified: **54 accounts will receive it, 7 will NOT.**
   - ✅ **John Rezzetano is FIXED and will now receive it** — he was failing for TWO independent reasons: the email typo (`rezzetono`→`rezzetano`) AND **no `order_token`**, and the audience query filters on `order_token IS NOT NULL`. Both fixed 8/16; he also now has `delivery_day=Tue` and an ordering link.
   - ⚠️ **STILL WILL NOT RECEIVE (7):** Harvie · Market Wagon · **St. Ferdinand** · **St. Ferdinand (PASS)** · North Hills Community Outreach · Preview Kitchen (chef view) · *(John now fixed)*. All have an `order_token` but **NO contact flagged `receives_orders`** and no account email. **St. Ferdinand is Linda Leary's food-bank account — and her monthly list is DUE WED 8/19.** If she is meant to get the automated list, add a contact row with `receives_orders=true`; otherwise send hers manually.
   - Harvie orders by PO (`Harvie PO # 7878307`), so its exclusion may be BY DESIGN — confirm rather than assume.
1. **Reconnect QuickBooks** — `csa.tinyseedfarm.com/admin/quickbooks` → Connect. (Intuit was returning 503 SystemFault at ~23:05 ET 8/16; token also expired.)
2. **Review + SEND 16 invoices already created and numbered, sitting UNSENT in QB** — `9000001`–`9000016`, **$4,996.91 total**. ⚠️ Check `#9000006` first: John Rezzetano's "4 carrots" was billed as 4 BUNCHES ($16) — 4× high if he meant 4 individual carrots.
3. **Tell Omar (Allegro) his two missing invoices are `#9000007` + `#9000008`** — he asked on 8/11 and is waiting.
4. **Account-by-account invoice review** (Todd's plan) — worksheet not yet built; needs QB live.
5. **Verify the new deliver→auto-invoice endpoint on ONE low-value order you can void.** It has never run against live QuickBooks.

## 🚨 TODAY (Tue Aug 4) — promised to customers in writing
- [ ] **This afternoon (after morning deliveries): update + send the accurate wholesale fresh sheet** — told ALL four chefs it's coming. Todd updates availability; send via /admin/wholesale/fresh-sheet (Friday sheet). PM: **re-enable the csa-wholesale-list-fri cron right after** (unscheduled 8/4 to prevent stale auto-send; re-add per migration 0081 pattern, Tue 14:00 UTC).
- [ ] **By END OF DAY: answer Csilla (Titusz)** on kohlrabi + red beets for her Friday order — promised in writing.

## 🔴 This week (Aug 3–9)
- [x] ~~**Pay Trellis invoice $700**~~ — Todd reported DONE 8/16. ➡️ NEXT: this unblocks Marlene — her 4 offered slots (Aug 5/10/11/13) have ALL passed, so ask her for new lease-meeting dates.
- [ ] **Reply to Marlene + book lease meeting** — she offered: Wed Aug 5 1:30p · Aug 10 1p · Aug 11 2p · Aug 13 11a. (Todd promised reply "by EOD" Jul 30 — slipped.)
- [ ] **PA annual report** (Marlene's list — Todd said he'd "look into it" Jul 30)
- [x] ~~**Simon Farm crew half-day by Aug 9**~~ — Todd reported DONE 8/16. ⚠️ Sept 30 full move-out + walk-through + settle-up still stands; weekly text to Dan still standing.
- [ ] **Weekly text to Dan** (every week until move-out complete)
- [ ] **Fix Don's cultipacker** (Todd broke it; diagnose + parts this week, repair ~crew day). WHAT BROKE: ___
- [x] ~~**Juan Pablo payroll** ($1,806.25 each, 7/6–7/17)~~ — Todd reported DONE 8/16. ⚠️ STANDING: bi-weekly pay is a CONTRACT term — periods after 7/17 keep accruing, so this recurs every 2 weeks, not once. PM to re-raise each Friday.
- [ ] **AIG R2: ASK ROTH FOR THE APPROVED LINE ITEMS (Attachment 1).** Awarded $31,380 of the $46,703 ask; which 
      lines were funded is STILL unknown. His 2026-08-20 email answered only the R1 reimbursement and never mentioned R2. 
      This gates all vendor ordering — the Checchi & Magli transplanter ($28K, imported) is the longest lead item.
- [ ] **AIG R2: send vendor number (#833615) to Mike Roth** (separate email; drafted)
- [x] ~~**AIG R1 reimbursement #1 $41,464.28**~~ — Roth SUBMITTED it 2026-08-20 after six weeks. ➡️ **Payment expected 
      ~2026-09-17.** If it hasn't landed by then, email him — he invited the follow-up. Official invoice template for 
      batch 2 saved at `legal/grants/ag_innovation_2026/13_Wilson_AIG_InvoiceTemplate.docx`.
- [ ] Tilmor 4-row finger weeder — follow-up SENT 8/2 (CC Alex Kozel); order when quote lands
- [x] ~~**Mac migration**~~ — DONE 8/16 (verified + prod deploy from new Mac; see Done log). ⚠️ FOLLOW-UP: **revoke Sam's Mac GitHub key by Sun Aug 23** (see Deadlines)
- [ ] Kick off **Jackie Wood / Good Roots** business-planning (= the Vitality↔AIG complement promised in the R2 application)

## 🔁 Recurring commitments (caught from text, 2026-08-16)
- [ ] **Food Bank / "St. Ferdinands" — Linda Leary** `(412) 585-5183`. Todd sells them produce for the **LAST WEDNESDAY of every month**, and owes her an **availability list the Wednesday BEFORE**. Dates computed:
  | Send list | Delivery |
  |-----------|----------|
  | **Wed 2026-08-19 ← 3 DAYS AWAY** | Wed 2026-08-26 |
  | Wed 2026-09-23 | Wed 2026-09-30 |
  | Wed 2026-10-21 | Wed 2026-10-28 |
  | Wed 2026-11-18 | Wed 2026-11-25 |
  | Wed 2026-12-23 ⚠️ holiday week — confirm they still want the 12/30 delivery | Wed 2026-12-30 |
  | Wed 2027-01-20 | Wed 2027-01-27 |
- [ ] **Weekly text to Dan Simon** — see People/Deadlines below (until Simon Farm move-out completes)

## 🗓️ Deadline projects
| Deadline | Item |
|----------|------|
| **Sun Aug 23** | **Revoke Sam's MacBook SSH key** at github.com/settings/keys (keep `Todds MacBook Pro 2026` = `SHA256:a5bKOQ/…17onI`). Todd deliberately kept Sam's Mac as a 1-week rollback fallback from 8/16. **RULE while both are live: ONLY the new Mac commits or deploys** — `vercel deploy --prod` uploads the local working tree, so a deploy from Sam's Mac would silently overwrite production. |
| Aug 9 | Simon crew half-day — ⚠️ **PASSED, unconfirmed** |
| Sept 30 | Simon Farm: EVERYTHING out + walk-through + settle-up (tiller $1,100 cr / AC $400 / propane split / Cub Cadet pending Dan's choice; $300/mo until out — pending Dan's acceptance) |
| Sept (per AIG timeline) | MF 1240 repair→move; Allis G repair-or-sell (new lease = working tractors only) |
| On AIG R2 contract | Orders month 1 (transplanter long lead); ~$23K match cash reserve; metrics; reimbursements months 4/9/12; CONFIDENTIAL until press event |
| Ongoing | AIG **Round 1** (C940002366): remaining purchases + reimbursement requests (Tilmor etc.) |
| Ongoing | **Farm Vitality grant** deliverables (brand/product dev — clamshell greens; via Good Roots) |

## 👥 People
- [ ] 🔥 **REPLY TO MACKENZIE — job applicant waiting since Sat 8/15** `(724) 290-0073` (daughter of Doug; Doug passed Todd's number along). Todd offered a trial shift 7/29; she came back 8/15 asking to come in **the last week of August or Sept 2** and has had NO reply. Directly serves the "HIRE full-time worker" keystone below — do not let this one go cold like the last three.
- [ ] **HIRE full-time worker** — the keystone; unblocks Simon timeline + market harvest load
- [ ] **Consistent delivery driver who knows the text system**
- [ ] H-2A: AEWR $15 confirm w/ másLabor · Jr.'s SSN card · W-2 records
- [ ] Pack-crew quality benchmarks (Mediterra complaint; Todd checking outgoing quality personally)

## 💵 Money
- [ ] 🔥 **JOHN REZZETANO — CHURNING, AND TRYING TO PAY YOU.** Private chef, orders weekly since 7/27, picks up ~8am at the farm. ROOT CAUSE FOUND 2026-08-16: his email was misspelled in the account (`rezzetono` vs correct `rezzetano`), so **every weekly availability list went to a dead address** — FIXED, and he now has a contact row flagged receives_orders + receives_invoices.
  - **He offered on 8/7 to come pay "the past 3 invoices"** — Todd never took him up on it. Only ONE order ($102.15, 8/4) is recorded in the system despite ~4+ weekly orders since 7/27, so the other orders were never captured at all.
  - **8/15, his soft goodbye:** *"I really need to be getting that availability list weekly like we discussed so that I can design my menus. I find out about the availability when I go to the Farmers Markets. I keep purchasing at the store the things that you end up having... I completely understand if you are too busy to work with me. Just please let me know if you aren't able to assist."* He asked to be added to the list on 8/11 AND 8/15. NEEDS A REPLY.
  - ✅ **RECONSTRUCTED 2026-08-16** — 3 missing orders recreated as DRAFTS from the text thread, priced from John's OWN recorded 8/4 order ("market prices minus 10%"): **7/29 $104.85** (13 lines; quantities are John's own 8/4 correction = what he actually received) · **8/5 $44.55** (10 lines) · **8/11 $31.50** (8 lines). Plus the already-recorded 8/4 $102.15 → **~$283.05 total owed**. Left as `draft` deliberately so they cannot hit a pack sheet or auto-invoice before Todd approves.
  - ⚠️ **NEEDS 5 PRICES FROM TODD before these can be invoiced** (left at $0): Swiss Chard (bunch) · Cabbage (head) · Mixed Sweet Peppers (qt) · Spring Onions (bunch) · Carrots (per each or per bunch?). None of these exist in `wholesale_products` at all.
  - TODO after pricing: flip drafts → confirmed, set `delivery_day`, issue an `order_token` so he can self-order.
- [ ] **INVOICE SWEEP (Todd directive 2026-08-16): go through ALL texts + emails and send every invoice never sent.** The text side is now searchable via `scripts/read_messages.py thread <phone>`. First one found below.
- [ ] **Jenifer / One Girls Graphics — UNINVOICED, she ASKED for it 8/11** (`jenifer@onegirlsgraphics.com` — note the one-'n' spelling). Picked up at market Tue 8/11: 5 lb dandelion greens @$5, 6 zucchini (3 yellow/3 green) @"2.5", 1 lb basil @$12, 1 bulb garlic (never priced). ≈$52 + garlic. Todd's reply stalled mid-word ("I'm") and she nudged 8/12. She is ALSO doing farm logo/social/write-up work (vendor relationship) — unpaid while promoting the farm. OPEN Q for Todd: zucchini unit (each vs lb) + garlic price. ALSO never answered her question of whether to coordinate orders through Todd or Marigrace.
- [ ] **⚠️ Rosemary for a WEDDING — did it happen?** `(724) 244-5923` (signs as "N"). Asked 7/20 for fresh rosemary as a per-plate garnish for her **daughter's wedding on 8/8/26**; Todd replied "Yes!" and the thread ENDS there. Wedding date has passed with no confirmation, no pickup arrangement, and no payment discussed. Either it was handled offline or a wedding order was dropped — VERIFY.
- [ ] 💰 **RECONCILED AGAINST QUICKBOOKS 2026-08-16 — the real numbers.** QB (production, realm 193514705221064) holds **47 invoices since 2026-06-01 totalling $21,380.85**. The portal's "$17,628.91 uninvoiced" was mostly a LINKING artifact — Todd invoices directly in QB and the portal never records `invoice_number`. Two real numbers:
  - **💵 $10,005.67 IS ACTUALLY OWED TO TINY SEED** (unpaid QB balances): Greater Pittsburgh Community Food Bank **$3,439.47** (3 invoices, NONE paid — 7/30 $1,380 · 8/4 $979.47 · 8/11 $1,080) · Harvie Farms **$3,351.54** (9 invoices, none paid) · St. Ferdinand's **$1,790.46** (6/24 $824.18 + 7/29 $966.28) · Butter Joint $558.25 · Della Terra $439.85 · Pigeon Bagel $225.83 · EYV $68.92 · Nurture $103.02 · Community Cultures $28.33. **THIS is the collections list.**
  - **🧾 ~$1,944.92 appears GENUINELY NEVER INVOICED**: Allegro $537.50 gap · Brothmonger $335.00 · **John Rezzetano $321.05** · EYV $212.39 gap · Sprezzatura $192.95 · Della Terra $174.80 gap · Titusz $62.18 gap · ShuBrew $58.50 · Butter Joint $50.55 gap.
  - ✅ **13 INVOICES CREATED IN QUICKBOOKS 2026-08-16 — $2,305.70. THEY ARE *NOT* EMAILED**; they sit unsent in QB for Todd to review and send. Harvie #19324 $559.30 (8/03, radicchio excluded) · #19325 $501.40 (8/10) · John Rezzetano #19326 $107.85 · #19327 $102.15 · #19328 $50.55 · #19329 $60.50 · Allegro #19330 $187.50 · #19331 $150.00 · Brothmonger #19332 $112.50 · #19333 $222.50 · ShuBrew #19334 $58.50 · Sprezzatura #19335 $108.05 · #19336 $84.90. `invoice_number` + `invoiced_at` written back to every portal order, so this can't double-bill.
    - QB item **"Green Beans" created (Id 621)**. John's per-bunch items (Asian eggplant, shishito, Swiss chard, carrots, spring onions, sweet peppers) billed on the generic `Wholesale` item with the real product name as the line description — his bunch/qt units don't fit the case-based catalog.
    - ⚠️ John's 8/11 line "Carrots ×4" was billed as **4 BUNCHES @ $4 = $16**. If he meant 4 individual carrots that line is 4× too high — check before sending #19329.
  - 🔴 **CSILLA / TITUSZ — ORDER NEVER DELIVERED, NEVER FOLLOWED UP. TODD OWES HER AN APOLOGY + FIX.** She asked 8/8 *"Was that whole order a bust?"*; Todd replied 8/9 that it was mostly packed Thursday, he took Friday off, it never went out, and *"I have to check with the pack people tomorrow"* — he never did, and never told her. Confirmed 8/16. ACTIONS TAKEN: the **8/07 $96.20 order is CANCELLED** with all lines `qty_packed=0` so it can never be billed. The **7/29 order drops from $103.20 to $43.20** (escarole $60 removed — 7/28 "short and unable to send the escarole"; she accepted dandelion greens instead, and **that substitution was never added to the order or priced**). TODD TO DO: contact Csilla, apologise, price the dandelion substitution, and decide whether to re-deliver or credit.
  - 📨 **TEXT SWEEP OF ALL WHOLESALE THREADS (2026-08-16, `read_messages.py sweep`).** 28 financially load-bearing messages found since 7/1. Findings:
    - **ALLEGRO / Omar — CONFIRMED BY THE CUSTOMER.** 8/11 Omar: *"Got the invoice for this week's delivery and I paid it. **Still looking for last week and the week before**."* Verified: QB has ONLY 8/12 $197.50 (paid). **MISSING: 7/29 $187.50 + 8/05 $150.00 = $337.50.** (8/19 $200 is a future delivery, not yet due — my earlier "$537.50 gap" wrongly included it.) He also asked 8/2 for invoices to go to `allegropgh@gmail.com`. PRICE AGREED BY TEXT 8/10: slicers incl. heirlooms **$3.75/lb**, cherries **$4.75/lb**.
    - **MEDITERRA — CREDIT OWED, LIKELY NEVER APPLIED.** 7/23 Anthony: *"we could use a credit on **10# of that baby kale** from last week. It was not usable. After it was washed it fell apart from the holes in it."* Agreed price 7/6 was **$10/lb → ~$100 credit**. Also 7/13: *"they only yielded 1 out of 5 bags"* — a second quality claim. QB has billed Mediterra $5,872 vs $5,562 of portal orders (all PAID), i.e. **$310 MORE than ordered** — consistent with the credit never being issued. VERIFY before their next invoice.
    - **TITUSZ / Csilla** — portal 7/15 $73.00 · 7/29 $103.20 · 8/07 $96.20 = $272.40; QB has only an 8/14 $50.00 since June. ~$222 likely unbilled. ⚠️ 7/28 Todd: *"We are short and unable to send the escarole"* → the 7/29 order may need reducing before billing.
    - **BUTTER JOINT / George** — 7/22 Todd: *"We might be short On the broccolini"* on a 10# broccolini line. Confirm what actually shipped before billing; $558.25 is currently unpaid.
    - **CAFE VERDE / David Green** — 8/6 *"Can I get kale this morning?"* — a possible verbal order never entered.
    - **SPREZZATURA / Jen** — 7/23: *"I'm here at Millvale Market and all of our deliveries are gonna be here now... Did you guys come yesterday?"* Confirms Millvale Market is the DELIVERY point (billing entity still to confirm) and hints at a possibly missed delivery.
    - **GOAT RODEO / India** — 7/15 Todd forgot to order cheese ("I forgot to order cheese again"). Todd owes them $316.80 (see below), separate from produce sales.
  - 🥬 **HARVIE — RECONCILED LINE BY LINE 2026-08-16.** Last Harvie invoice in QB is **2026-07-30**; portal shows deliveries on 8/03 and 8/10 that were NEVER BILLED. Late fees were masking the match — once netted out, portal↔QB reconciles EXACTLY: portal 7/06 $272.50 = QB doc 7849634 ($276.59 − $4.09 late fee) · portal 7/13 $559.05 = doc 7849635 ($567.44 − $8.39) · portal 7/20 $522.70 = doc 7849638 ($530.54 − $7.84). The 7/27 delivery ($667.20) was billed at $622.40 net — a **$44.80 difference already applied**, presumably an earlier shortfall.
    - **UNBILLED: 8/03 $577.30 + 8/10 $501.40 = $1,078.70.**
    - ⚠️ **8/03 MUST BE INVOICED AT $559.30, NOT $577.30** — Todd texted Chuck 8/4 "we did not send radicchio yesterday" and Chuck confirmed. The order carries `Local Organic Radicchio qty 6 = $18.00`. RECORDED via migration 0088: that line's `qty_packed=0` → `fulfillment_status='unavailable'`, so an invoice built from `qty_packed` excludes it automatically.
    - ⚠️ Harvie's TOTAL QB balance is **$5,986.70** (not just the $3,351.54 since June) — there are OLDER unpaid invoices too. QuickBooks is auto-applying **1.5% late fees** to them (applied Jun 24, Jul 16, Jul 30, Aug 4, Aug 7). Decide whether to keep charging a partner late fees while nothing is being collected.
  - ✅ **QB CUSTOMERS CREATED 2026-08-16** (Todd-approved; NO invoices sent): **Brothmonger** Id=1104 · **John Rezzetano** Id=1105 · **ShuBrew** Id=1106. **Sprezzatura was NOT created — it ALREADY EXISTS** in QB (`sprezzaturapgh@gmail.com`, matching the portal contact). The earlier "no QB customer" wording was imprecise: it meant no *invoices since June*, not no customer. ⚠️ Sprezzatura = **Jen Saffron**, and its portal address reads "Deliver to the Millvale Market, 524 Grant Avenue" — **Millvale Market is a SEPARATE QB customer** (`ian@` / `jen@millvalemarket.com`). CONFIRM WITH TODD which entity to bill before invoicing that $192.95.
  - ✓ Fully covered in QB (no action): Mediterra ($5,872 billed, ALL PAID) · Black Radish ($2,260.56, all paid) · Cafe Verde ($1,018.50, all paid) · Center for Hope/food-bank · Pigeon · Harvie · St. Ferdinand.
  - ⚠️ CAVEAT: this compares TOTALS per account, not invoice-to-order line matching, so small gaps may be timing rather than missing bills. Verify each gap before sending. Todd directive 2026-08-16: **DO NOT SEND ANY INVOICES until the existing ones are confirmed.**
- [ ] ~~**WHOLESALE UNINVOICED = $17,628.91 across 67 orders**~~ (superseded by the QB reconciliation above) (measured 2026-08-16 from `wholesale_orders`, delivery dates 2026-06-24 → 2026-08-19; Market Wagon EXCLUDED because it auto-pays through their own system; cancelled excluded). This supersedes the $6,508.73 figure, which only covered Jul 4–24. Biggest: Mediterra $5,562 (8 orders) · Harvie $3,100.15 (6) · Center for Hope (PASS) $1,380 (1) · Butter Joint $1,183.80 (9) · Black Radish $987 (8) · Cafe Verde $926 (8) · St. Ferdinand $800 + $700 (PASS).
  - **CAVEAT — NOT YET CONFIRMED AS UNBILLED.** This counts orders with no `invoice_number` in the portal. Todd may have invoiced some directly in QuickBooks, which the portal would not know about. **BLOCKED on a QuickBooks reconnect** (stored access token expired 2026-08-08; Vercel redacts the client secret so the token cannot be refreshed locally). Todd: visit `csa.tinyseedfarm.com/admin/quickbooks` → Connect, then PM can pull the real sent-invoice list and produce a true delta.
  - Possible DUPLICATE ACCOUNTS to merge: "St. Ferdinand" vs "St. Ferdinand (PASS)"; also "Center for Hope (PASS)" and "North Hills Community Outreach" ($0) — the PASS/food-bank programs (Linda Leary's account is the St. Ferdinands one) may be split across records.
- [ ] Wholesale invoicing (superseded figure, kept for history): $6,508.73 (Jul 4–24, 27 orders) — Friday blocks
- [ ] Mediterra: apply promised discount on 7/9 greens; Kathy CC added in portal, add in QB
- [ ] Goat Rodeo $316.80 check (at cheese pickup)
- [ ] Trellis $700 (above)
- [ ] Don Kretschmann monthly bills; lease/arrears negotiation (~$9,715) resumes at Marlene meeting
- [ ] Grant match reserve ~$23K planning

## 🖥️ CSA portal / software (PM owns, Todd approves)
- [ ] **csa.tinyseedfarm.com full review — walk EVERY tab with Todd, update as we go** (working session)
- [ ] Pick-list fix relaunch (make-ups fold-in + crop conflation + garbage row) — builder died mid-task 7/22
- [ ] Trust bugs: multi-share vacation holds (Bianca) · box-view "no box" display (Cynthia) · hold audit trail (Victoria)
- [ ] Flex cutoff roll — automate/one-click (bit us 7/20 AND 8/2)
- [ ] Member items: Victoria make-up box · Bianca credit · Cynthia retention reply? · Karl Leslie dupe · Pat Hust contact · Daniel Selcer Week-B question
- [ ] CSA prospects awaiting replies: Evan Harbuck · Nicole R. · Maddison Perzel · Beth Cline · JoAnn Worthing
- [ ] 6 members still missing phones (post add-your-cell emails)

## 📱 Systems being set up
- [ ] **Text-promise catcher**: on Todd's NEW Mac — Messages + Apple ID + iPhone Text Forwarding → daily promise scan → Friday list. (Interim: Todd forwards promise texts manually.)
- [ ] Weekly schedule redesign (in discussion — see Friday Accountability Hour)
- [ ] Equipment "Garage" population (machines + manuals; ECHO GT-225 manual filed at equipment/manuals/)

## Mac migration checklist (Sam's MacBook → Todd's new Mac)
1. Time Machine backup of Sam's machine FIRST (external SSD)
2. Migration Assistant via Thunderbolt cable on first boot (or from the TM backup)
3. Verify before wiping anything: iCloud sign-in, Mail, repo at ~/Documents/TIny_Seed_OS, `git status`, **untracked secrets present** (.env.csa, tinypm/.env, tinypm/.oauth_tokens/, apps/csa-portal/.env), `npm run build` in apps/csa-portal
4. Re-auth: clasp, vercel CLI, browser logins
5. NEW: sign into Messages w/ Todd's Apple ID + enable iPhone Text Message Forwarding (powers the promise-catcher)
6. Sam's machine: remove Todd's accounts/data after verification

## ✅ Done log
- 2026-08-16: **Mac migration VERIFIED + closed out.** All secrets/tokens migrated (.env.csa, tinypm/.env, portal .env, both OAuth tokens); Supabase, Gmail (both accounts), Resend, Shopify, Twilio, clasp all confirmed live; portal builds clean; unit tests 25/25; **real production deploy from the new Mac** (`dpl_5kPvHkQSi1CmtgGjsZph3eFLKJDa`) now serving csa.tinyseedfarm.com. Fixed 2 migration gaps: recreated the missing Vercel project link, and generated a new SSH key (`~/.ssh/id_ed25519`, GitHub host keys cross-verified against api.github.com/meta) — `~/.ssh/` had been completely empty, so git push was dead. **Backed up 62 files of live-but-uncommitted production code** (commit `32c84ed`, +5,237 lines) that existed only on local disk. Todd keeping Sam's Mac as a rollback fallback until ~8/23.
- 2026-08-02: OEFFA renewal CONFIRMED GOOD (Todd) · flex week 8/3 live (31 items, +green beans, −beets), cutoff extended Tue 7A, verified member-side, 26 batch + 5 individual emails sent · Heidi flex access enabled ($31.67 credit) · Tilmor follow-up sent (CC Alex Kozel)
- 2026-07-28: AIG Round 2 AWARDED (amount TBD) · Mediterra: Kathy added as invoice contact · Harvie invoicing PDF (3 POs, $1,354.25)
- 2026-07-26: Dan Simon counter-email sent + removal schedule delivered · Dosatron/traps returned
- 2026-07-24: Invoicing packet Jul 4–24 ($6,508.73)
