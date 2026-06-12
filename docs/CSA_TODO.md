# CSA — Running To-Do / Backlog

_Started 2026-06-08. PM-maintained. Newest deferrals at top of each section._

## 🚨 WEEK-1 INCIDENT RECOVERY (2026-06-10) — missed flex + add-on matching
**Incident:** stray A/B tags on flex rows + resolver parity bug dropped 7 ordered flex members from labels/pack/manifest; truck left without their items. Root causes FIXED (data cleared, resolver flex-bypass deployed, 44/44 tests). Remaining ops:
- [ ] **THURSDAY (Jun 11) catch-up delivery run:** ① Kathleen Ganster + ② Andrea Szolna → Simon's Farm Stand (4312 Middle Rd) · ③ Melissa Maxwell → 1928 Lake Marshall Dr, Gibsonia (confirm if she corrects address) · ④ Jackie Weaver-Agostoni → 9840 Covered Wagon Ct, Wexford 15090 **+ her mushroom add-on**. Item lists on 🧺 Flex orders → Pack tab.
- [ ] **Saturday markets:** Jen VanderPlaats → Bloomfield Sat (her flex order, name on it) · Linda Cole → Bloomfield Sat · Josh Burke → Sewickley Sat. Olivia Vareha (North Side) — awaiting her choice of option.
- [ ] **Tony Rozic** — handled at farm 6/10 ✓
- [ ] **Add-on catch-up decision (Todd):** 8 A-week-box members' add-ons were tagged B and so MISSED today's box (Kelly Corrigan mushroom+cheese, Kathryn Brown mushroom, Laura Zalaznik bread, Denise Fazio mushroom, Heather Edmondson mushroom, Whitney cheese, Carly Lagoda cheese+bread). Weeks now ALIGNED to their box → next ships Jun 24. **Decide:** double-up on Jun 24, or include in Thursday's catch-up run, or credit. Then notify them.
- [ ] **Biweekly add-on semantics check:** aligned all 13 mismatched add-ons to the customer's box week (a biweekly add-on should ride the box). If any customer genuinely wanted alternate-week add-ons, undo per their request.
- [ ] **Verify Saturday market sheets fresh-printed** (flex fixes included) before Bloomfield/Sewickley.

## 🕓 Later (Todd-requested, not urgent)

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

## 🔧 Build / systemic
- [ ] **Shopify→Supabase paid-status sync** — make portal payment data trustworthy (it currently marks everyone "Paid" with $0 spent). Mark **verified-paid** vs **needs-review**; NEVER auto-flag "unpaid." Powers send-time paid+share verification (per `feedback_email_send_discipline`).
- [ ] **Flex Phase 2 — card overage** (HIGH PRIORITY): charge the card for cart amount over the flex balance (foundation for buy-beyond-balance). Spec in `docs/specs/FLEX_ORDERING_BUILD_SPEC.md`.
- [ ] **Flower reconciliation** — verify the 21 flower exceptions against the Tiny Seed **Fleurs** store (separate Shopify store?).
- [ ] **Member phone data** — 65 of 197 active members have no phone (the new sign-in gate will force them; monitor adoption). Earlier seed/test customers had the farm's own # as placeholder.

## 🔒 Security / hygiene
- [ ] **`SOCIAL_CREDENTIALS.md` is NOT gitignored** — credentials file should never be committable. Gitignore it + check git history for prior commits of secrets.

## ✅ Done 2026-06-08 (for reference)
Flex ordering (admin form, member page, submit, cancel, pop-up, gap-research M1–M7) · forced phone gate · forced pickup-acknowledgment gate · per-site pickup instructions + host display for all 15 stops · cleared inaccurate pickup time windows · Allison Park→Simon's consolidation · Oakmont→Taco Boys · 4 member email campaigns (333 sent) · Rhonda + Pete host emails · Shopify token wired + full reconciliation · email-send-discipline guardrail (`send_member_campaign.py`).
