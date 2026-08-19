# CSA — Running To-Do / Backlog

_Started 2026-06-08. PM-maintained. Newest deferrals at top of each section._

## 🚩 SHORT LIST — FLEX MUST DEDUCT AT ORDER (Todd 2026-06-18, HIGH PRIORITY, PORTAL SESSION)
**Decision (Todd):** Flex balance must **debit the moment an order is placed**, NOT at fulfillment. **Assumption = the order will get fulfilled; if something doesn't go out, we make it up** (credit/refund that amount back). 
**Why it's a big deal:** today flex orders sit `status='pending'` and the Shopify store-credit balance **never deducts** — members see a full balance all season and can't tell what they've spent. Verified: **Nikki Matusiak** balance still $672 after ~$60 ordered (2 wks, all pending); **Nancy Bergman** same pending state + couldn't see her list. Revenue/▸balance integrity issue.
**Change:** on order place/lock → immediately `issueStoreCreditDelta` DEBIT for the cart total (server-side), reflect new balance in portal instantly. Reverse/credit if an order is later not fulfilled. Also fix orders stuck in `pending` (should lock→fulfill so they pack AND debit). **PM cannot touch flex/portal code (coordination directive) — portal session owns this.**

**ALSO (Todd 2026-06-18, same flex-order work — PORTAL SESSION):**
- **Skip = order nothing, no empty submission.** A flex member who wants to SKIP a week should NOT have to submit an empty order or a "hold." Today the portal blocks submitting with zero items, so members add a throwaway item just to "submit" (Amy Hepner did exactly this). Fix: skipping = simply not ordering (no charge, no hold); make the UX/copy say so. (Flex members also kept creating useless vacation `skip` holds — flex needs no holds.)
- **$15 minimum order on flex.** If a member DOES place a flex order, require the cart to total **≥ $15** to submit. (Pairs with deduct-at-order.)

## 🔑 GOOGLE DRIVE ACCESS — paused mid-setup (Todd 2026-06-18)
Goal: give the assistant Drive/Sheets access via the already-configured `google-sheets` MCP (`mcp-google-sheets`, currently uncredentialed). Todd created the service account: **tiny-seed-assistant@sys-02163100643422711337409367.iam.gserviceaccount.com**. REMAINING (≈2 min): ① download its JSON key (Service Accounts → that SA → Keys → Add Key → JSON) ② enable **Google Sheets API** + **Google Drive API** ③ share a Drive folder (or sheets) with that SA email as Editor ④ hand me the JSON → I wire the MCP env (`SERVICE_ACCOUNT_PATH`) + verify by listing sheets. NOT the OAuth Client ID — the JSON key file.

## 💰 FARM BOOKKEEPING / SCHEDULE F — accountant reporting (Todd 2026-06-14, PARKED)
**Vision:** monthly Schedule-F-categorized expense reports auto-sent to the accountant, + an app feature to snap receipt PHOTOS with explanations (for cash/check buys not in email), + each report ends with a PDF of actual receipt copies.
- ✅ STARTED: email receipt extractor built — `apps/csa-portal/scripts/csa_inbox_triage.py` (inbox triage) + a 2026 Schedule-F extraction script; draft CSV at `apps/csa-portal/scripts/out/schedule_f_2026.csv` (by SF line, with Income/Personal/Review tabs). Year scope: **2026 onward**.
- EXISTING DATA TO BUILD ON (do NOT rebuild): `legal/grants/farm_vitality_2026/SCHEDULE_F_CATEGORY_MAP.html`, `tinypm/SCHEDULE_F_PRO_FORMA_2026_FINAL.md` + `TINY_SEED_FARM_2026_PRO_FORMA_SCHEDULE_F.md`, `business_docs/lease/EXPENSE_ANALYSIS_2026.md`, `web_app/quickbooks-dashboard.html`, `PHOTO_UPLOAD_RESEARCH.md`, FSA projected income/expense docs.
- [ ] Build: monthly report generator (SF lines + subtotals) → email to accountant, signed/scheduled.
- [ ] Build: receipt-photo upload in the app (mobile: snap + category + note) for non-email purchases.
- [ ] Build: PDF appendix = actual receipt copies (email receipts rendered + uploaded photos).
- [ ] Vendor→SF map confirmed with Todd; accountant's email; cadence (monthly).
**Status: PARKED — revisit after CSA ops are stable. Accountant email + cadence needed to resume.**

## 🍄 ADD-ON COLLAPSE RECOVERY (2026-06-18) — DONE, watch for replies
The June-17 dedup collapsed add-on rows by CUSTOMER not CUSTOMER+TYPE → 16 members lost paid distinct add-ons (silently dropped from pack sheets). **FIXED:** restored all 23 (Shopify-verified, 1:1), deployed pack-sheet ×N display fix (commit 06f87f9), sent personalized "did we miss anything?" fishing email to all 16 (From csa@, BCC Todd). **Policy (Todd): make-goods ONLY for members who reply/complain** (credit / Sat-market make-up / double next box).
- [ ] **WATCH the team inbox for replies to the fishing email** (16 members) → make-good each complainer. The 9 weekly/Week-B members (Cory, Katelynn, Stephanie, Carla, Carly, Elizabeth, Ronelle, Maggie, Karen) were shorted in the Jun-17 boxes — most likely to reply.

## 📦 MAKE-GOOD BOXES IN-SYSTEM (verified via resolveCycle)
- ✅ **Diane White** (dwhite131) — missed Jun-17 box (arrival-text failure). Make-up box **Jun 24 @ Mt. Lebanon** added as a resolver move-in (vacation_holds id fc589e1b, disposition=move, move_to_week=2026-06-22; NO vacation week charged). Verified: PRESENT moved_in on Jun-24 AND her normal Jul-1 Week-B box intact. +$10 flex funds added (Shopify store credit). Email sent w/ Lora's # (215-313-6720). **Physical: pack a small summer box for Diane on the Jun-24 Mt. Lebanon run — it's on the manifest.**

## 🚨 WEEK-1 INCIDENT RECOVERY (2026-06-10) — missed flex + add-on matching
**Incident:** stray A/B tags on flex rows + resolver parity bug dropped 7 ordered flex members from labels/pack/manifest; truck left without their items. Root causes FIXED (data cleared, resolver flex-bypass deployed, 44/44 tests). Remaining ops:
- [ ] **THURSDAY (Jun 11) catch-up delivery run:** ① Kathleen Ganster + ② Andrea Szolna → Simon's Farm Stand (4312 Middle Rd) · ③ Melissa Maxwell → 1928 Lake Marshall Dr, Gibsonia (confirm if she corrects address) · ④ Jackie Weaver-Agostoni → 9840 Covered Wagon Ct, Wexford 15090 **+ her mushroom add-on**. Item lists on 🧺 Flex orders → Pack tab.
- [ ] **Saturday markets:** Jen VanderPlaats → Bloomfield Sat (her flex order, name on it) · Linda Cole → Bloomfield Sat · Josh Burke → Sewickley Sat. Olivia Vareha (North Side) — awaiting her choice of option.
- [ ] **Tony Rozic** — handled at farm 6/10 ✓
- [ ] **Add-on catch-up decision (Todd):** 8 A-week-box members' add-ons were tagged B and so MISSED today's box (Kelly Corrigan mushroom+cheese, Kathryn Brown mushroom, Laura Zalaznik bread, Denise Fazio mushroom, Heather Edmondson mushroom, Whitney cheese, Carly Lagoda cheese+bread). Weeks now ALIGNED to their box → next ships Jun 24. **Decide:** double-up on Jun 24, or include in Thursday's catch-up run, or credit. Then notify them.
- [ ] **Biweekly add-on semantics check:** aligned all 13 mismatched add-ons to the customer's box week (a biweekly add-on should ride the box). If any customer genuinely wanted alternate-week add-ons, undo per their request.
- [ ] **Verify Saturday market sheets fresh-printed** (flex fixes included) before Bloomfield/Sewickley.


## 🛒 WEEKEND MARKET LOAD (Sat Jun 13 / Sun Jun 14)
- [ ] **Bloomfield Sat:** Jen VanderPlaats flex order · Linda Cole flex order · **Drew Gifford 2× mushrooms (make-good)** · Marissa Norris + walk-up flex shoppers (use 💳 Market checkout)
- [ ] **Sewickley Sat:** Josh Burke flex order · Melissa Schad shops table (Market checkout)
- [ ] **South Side Sun:** possibly Laura McCurdy fresh remake (awaiting her "Sunday or Tuesday" reply)
- [ ] **Jun 24 DOUBLE add-on list (UPDATED):** Kelly Corrigan (mushroom+cheese), Katy Brown (mushroom), Heather Edmondson (mushroom), Laura Zalaznik (bread), Denise Fazio (mushroom), Whitney/wmsunseri (cheese). **CARLY LAGODA REMOVED — refunded $18.89 instead (PENDING on her card).**
- [ ] **Make-goods pending:** Ayça Akin herb seedling (Tue Lawrenceville) · Martina replacement radishes (next planting) · Emily Wender replacement box Wed IF she replies hers was gone · Cory Cope DOUBLE box Jun 24
- [ ] **Maggie Debski upgrade:** small→Family biweekly — NEEDS TODD: price difference to quote (then I invoice + flip her share_size)
- [ ] **Edgewood/Swissvale stop:** Kelly Corrigan moving late July; Todd promised a switch; NO such stop exists in portal — create stop (host?) or offer nearest alternative before Aug 1

## 🔬 AUDIT 2026-06-14 (full add-on/box/vacation reconciliation) — findings
**NEXT WEEK (distribution Jun 17 Wed / 20 Sat / 21 Sun = WEEK B):**
- VEG BOXES: **66 Small + 24 Family/Large = 90** (+ flex boxes as orders come in)
- ADD-ONS riding with a box: **mushroom 17 · bread 8 · cheese 6 · coffee 2 = 33**
- Add-on freq reconciled vs Shopify: **65/67 correct**; fixed Carly Lagoda 2 dup rows + Meghan Simek bread B→A.
**FIXED in data:** Meghan Simek bread→A · Carly dup add-ons inactivated · 4 add-on holds cascaded (Cory Cope etc.).
**SYSTEMIC FIXES STILL NEEDED IN CODE (need Todd OK to build):**
- [ ] **Vacation hold must auto-cascade to add-ons.** Today a hold on the box does NOT pause the member's add-ons — I patched it manually for current holds, but the hold-creation flow (`/api/account/vacation`, schedule_vacation_hold RPC) must hold ALL the customer's rows, not just the box. Until built, every new hold needs manual cascade.
- [ ] **Orphan add-ons (owner has no box) get dropped from pack sheets.** Members with an add-on but no active veg box — flex-only (Jackie Weaver), spring-ended (Leah Rubenstein), flower-only (Diane Reiche) — never appear on a pack sheet, so their paid add-on is missed (this is the "Rubenstein came for mushrooms" bug). Short-term: notices created. Real fix: resolver must surface add-on-only members for standalone packing on their weeks.
- [ ] **Diane Reiche bread (Week B) vs flower (starts Jun 24):** decide when her bread starts + align to flower pickup weeks.
- [ ] **Member /box page share_type mismatch:** queries box_contents by member.share_type ('summer_veg') but box_contents uses 'small/family/large' → member box page may show "not published" even when packers' Share list is populated. ~30-min fix.

## 🕓 Later (Todd-requested, not urgent)
- [ ] **Collaborative Inbox for team email replies** (Todd 2026-06-08). Set up a Google Collaborative Inbox (Workspace, free) so Todd / Frankie / Loren don't double-reply to customer emails. Steps: admin.google.com → Groups → create group (address TBD: `csa-replies@` or `hello@`) → add the 3 → Settings → enable **Collaborative Inbox** (assign/take/resolve). Then PM switches `Reply-To` on all sends (`send_email.py`, `send_member_campaign.py`) to that single address. _Awaiting: Todd creates the group + picks the address._

## 🔜 Soon / pending action
- [ ] **Correction note to the 66 mis-emailed members** (Todd approved). Scoped apology + summer signup link to active members who got the summer-box email but have no summer share (flower/spring/flex-only). Send via `send_member_campaign.py` (audience-verified). _Not yet sent._
- [ ] **Verify the 43 "no card order under their email" members** — `apps/csa-portal/scripts/out/members_to_verify.csv` (21 summer, 21 flower, 1 spring). Most are comped hosts / check-payers / alt-email / Fleurs-store flowers. Todd to eyeball; resolve genuine non-payments.
- [ ] **Flex anomaly:** `hme901@yahoo.com` holds $157.50 store credit but is summer_veg (not flex) — refund or re-link.
- [ ] **Confirm:** Lawrenceville address (115 41st St, Bay 41) · North Park host phone (Heather, 412-370-1815).

## 🐛 Admin dashboard — inaccurate count cards (found 2026-06-08)
- [ ] **"Home deliveries: NN active" card is mislabeled** (`src/pages/admin/index.astro` ~L160). Counts EVERY active member with `pickup_location_id IS NULL` — which includes 14 add-ons (never have a pickup) + members who simply haven't picked a stop. Shows 36; true home-delivery ≈ 11. Fix: exclude `share_type='add_on'`; split "Home delivery" (real delivery members) from "No pickup assigned — needs a stop."
- [ ] **"Unassigned Week A/B" count is inflated** (`src/pages/admin/index.astro` L144). Counts ALL active members with `biweekly_week IS NULL` (114) — but weekly/add-on/flex members are SUPPOSED to be null. TRUE members needing an A/B pick = **0** (verified 2026-06-08). Fix: count only members who are actually biweekly (use `memberIsBiweekly` w/ `total_weeks` + `season.ts` canonical lengths: summer 18, spring 4, flower 16); query must also `select total_weeks`.
- [ ] **Cosmetic (low pri):** 8 biweekly home-delivery members have `total_weeks` = full season (18/16) instead of reduced (9/8). `biweekly_week=B` is correct so delivery is fine; only `memberIsBiweekly`'s 2nd condition is moot. Optional: reduce their `total_weeks` for accounting cleanliness. Members: Ronelle Myers, Stephanie Montemurro (summer+flower), Lela Dougherty, Doug Holscher, Dawn Bartlett, Kevin Hutchings.

## 🏖️ VACATION HOLDS — two problems found 2026-08-19 (Anna Phillips)

Surfaced reconciling Anna Phillips' missing mushrooms. Her season week-by-week:

| week | veg | mushroom | |
|---|---|---|---|
| 6/08 · 6/22 | ✅ | ✅ | fine |
| **7/06** | ✅ | ❌ | **genuine miss — no hold, box went, mushroom didn't. Cause still unknown.** |
| 7/20 | ✅ | ❌ | hold on the ADD-ON ONLY, 7/10→7/21 |
| 8/03 | ❌ | ❌ | hold on both, 8/02→8/09 |
| 8/17 | ✅ | ✅ | fine |

- [ ] **A hold existed on ONLY the add-on (7/10→7/21) while the veg box still went out.** Either the member deliberately held just the mushroom, or a hold got applied to the wrong member rows. **Audit every `vacation_holds` row for add-on-only holds that don't have a matching box hold** — if this is a bug, other members are silently losing add-ons they paid for. (This is the mirror image of the known "hold does NOT cascade to add-ons" bug already logged below.)
- [ ] **`disposition='skip'` silently costs a member a paid delivery.** Anna paid for 9 mushroom weeks; 2 holds took 2 off with no credit, no make-up, no notice. Members should be offered **move** (reschedule to the end of the season) as the default rather than losing the week outright. `disposition='move'` + `move_to_week` already exists — it just isn't the default or surfaced at hold-creation.
- [ ] **7/06 is still unexplained** — no hold, box delivered, add-on absent. Root-cause it; it is the same failure shape as the 8/12 all-members mushroom miss.

## 🔧 Build / systemic
- [ ] **🚧 FOR PORTAL SESSION — flex members can't SEE the flex order list some weeks.** Nancy Bergman (Zelienople flex) had week-1 (Jun 10) flex orders but could NOT see/place a Jun 17 order ("checked Friday and Saturday, couldn't see where to order") → no `flex_orders` row for week 2026-06-15; Todd handled it manually off her email. The flex list opens Thursday, so it should have been visible Fri/Sat. Check flex-list publish/visibility for Zelienople (and all stops) per week. Also: Nancy's week-1 flex_orders are status `pending` (not locked/fulfilled) — confirm pending orders still pack + debit. (PM flagged 2026-06-18; PM cannot touch flex/portal.)
- [ ] **🚧 FOR PORTAL SESSION — Saturday-market members show "Wednesday" pickup.** Brenda Mellon (Sewickley Market, Sat) has `members.pickup_day='Wed'` while her stop is the Saturday market, so the portal told her "pick up next Saturday, then Wednesdays." Fix: derive/display pickup day from the stop's `day_of_week` (Sat for markets), not the member's `pickup_day` field — OR correct `pickup_day` for all market-stop members. (PM flagged 2026-06-18; PM cannot touch portal code per coordination directive.)
- [ ] **Portal "GO / NO" share-day light** (Todd 2026-06-18, HIGH-CLARITY): dashboard banner — 🟢 "GO — your share is ready TODAY at <stop>" when today is the member's pickup day AND it's their week; 🔴 "No share this week — next box <date>". Data already exists (biweekly_week + pickup day + season schedule + currentDeliveryWeek + resolveCycle). Directly fixes the Week-A/B confusion (Laura Kim logged in, saw "Week A", still thought she had a box on an off-week). Low effort.
- [ ] **Laura Kim follow-up:** she signed in Jun 17 4:35pm but still misread her Week-A schedule → awaiting her portal-clarity feedback (asked her what tripped her up). Possible she eyed a non-hers box at Squirrel Hill Jun 17 (she's Week A, not due) — watch for any Week-B Squirrel Hill member reporting a missing Jun-17 box. Offered free weekend-market shopping; off-week make-up box as backup.
- [ ] **Shopify→Supabase paid-status sync** — make portal payment data trustworthy (it currently marks everyone "Paid" with $0 spent). Mark **verified-paid** vs **needs-review**; NEVER auto-flag "unpaid." Powers send-time paid+share verification (per `feedback_email_send_discipline`).
- [ ] **Flex Phase 2 — card overage** (HIGH PRIORITY): charge the card for cart amount over the flex balance (foundation for buy-beyond-balance). Spec in `docs/specs/FLEX_ORDERING_BUILD_SPEC.md`.
- [ ] **Flower reconciliation** — verify the 21 flower exceptions against the Tiny Seed **Fleurs** store (separate Shopify store?).
- [ ] **Member phone data** — 65 of 197 active members have no phone (the new sign-in gate will force them; monitor adoption). Earlier seed/test customers had the farm's own # as placeholder.

## 🔒 Security / hygiene
- [ ] **`SOCIAL_CREDENTIALS.md` is NOT gitignored** — credentials file should never be committable. Gitignore it + check git history for prior commits of secrets.

## ✅ Done 2026-06-08 (for reference)
Flex ordering (admin form, member page, submit, cancel, pop-up, gap-research M1–M7) · forced phone gate · forced pickup-acknowledgment gate · per-site pickup instructions + host display for all 15 stops · cleared inaccurate pickup time windows · Allison Park→Simon's consolidation · Oakmont→Taco Boys · 4 member email campaigns (333 sent) · Rhonda + Pete host emails · Shopify token wired + full reconciliation · email-send-discipline guardrail (`send_member_campaign.py`).
