## Feature-Gap Analysis: Tiny Seed CSA Portal vs. 2026 CSA Software Landscape

**Bottom line up front:** This exact question has already been researched in depth four times this year (`docs/research/CSA_PORTAL_COMPETITOR_TEARDOWN_2026.md`, `CSA_PORTAL_GAP_ANALYSIS_2026.md` + `_V2`, `CSA_PORTAL_PLATFORM_BENCHMARK_2026.md`, `FLEX_ORDERING_GAP_RESEARCH.md`), and I did not write a new document — the harness rule for this session is to return findings as text, not to create another file in an already-crowded space. What follows is genuinely new work: (1) I re-verified the codebase as it stands today (Sept 2, three months after the June 10 launch) against the June 18 benchmark's gap list, and several "P0" gaps are now closed; (2) I researched three platforms not covered in prior docs — GrazeCart, Local Food Marketplace, Eat From Farms; (3) I pulled current 2026 pricing for Barn2Door/CSAware/Farmigo/GrownBy from a live comparison; (4) I dug into the payments-landscape question (store credit vs. subscription vs. pay-as-you-go, proration) specifically, which prior docs touched lightly.

### 1. What changed since the last audit (June 18) — verified against the live repo today

| Prior "P0" gap (June 18 benchmark) | Status today (grep-verified) |
|---|---|
| No box-swap/customization ritual | **BUILT.** `lib/box.ts`, `api/box/swap.ts`, `api/box/swap-undo.ts`, unified pickup-day-aware cutoff (per code comment, shipped 2026-06-26). This was the #1 industry-proven retention feature — it's now live. |
| No season-end renewal flow | **STILL MISSING.** No `renewal` logic anywhere outside marketing `campaign.ts`/`campaign-segments.ts` (which can *target* lapsing members for an email, but there's no self-service in-portal renew/re-up page or flow). `season.ts` only tracks the current season's dates, not a next-season signup. |
| No preference→recipe matching | **BUILT.** `lib/recipes.ts`, `account/recipes.astro`, wired into `weekly-email.ts`. |
| PWA/push, working SMS | **SMS still not functioning.** `grep -rli twilio` finds only `database.types.ts` schema, `sms-policy.astro`, and admin pages that presumably compose links for manual/host texting (`text-stop`, `text-chef`) — no Twilio send integration in `lib/`. This matches your own memory note that Twilio has never worked. |
| No order/payment history | Partially — `account/history.astro` and `account/track.astro` exist now. |
| No gift shares | **STILL MISSING.** No gift-card/gift-share logic anywhere in `lib` or `pages`. |
| No mid-season proration | **STILL MISSING.** `grep` for proration/installment/payment-plan finds nothing outside test file names. |

So the honest read: the single biggest retention lever the industry proves out (box swaps) is done. What's left open — renewal, gift shares, proration/payment plans, real SMS — is a narrower, more specific list than the June doc suggested.

### 2. Three platforms not previously covered

**GrazeCart** (grazecart.com) — farm-store POS + e-commerce, not CSA-first but supports "weekly or monthly farm boxes customers can customize," native store credit + gift cards + subscriptions, sell-by-weight. Pricing: Starter $89/mo, Growth (unlisted, "most popular," adds POS/coupons/gift cards/subscriptions/preorders/SMS via Drip), Premium (adds Zapier, pickup/packing manager). Relevant to you mainly as a payments-pattern reference (native gift-card + store-credit support in one system) rather than a direct competitor — it's built for farm stores selling meat/produce broadly, not CSA-first.

**Local Food Marketplace** (localfoodmarketplace.com) — food-hub/multi-farm aggregation software: "Subscription Builder" for customizable CSAs, SNAP support, scheduled payments, bulk invoicing, harvest/pick/pack list generation. Per Local Line's own July 2026 comparison, priced from $129/mo (producers) to $149/mo (food hubs), prepaid annually. This is overbuilt for a single 200-member farm — its value is multi-farm/food-hub aggregation, which you don't need.

**Eat From Farms** — the cheapest option in the category: $15/mo flat, no commission, online storefront + bundles + variable weight + "8 payment options." Notable mainly as the low end of the market — confirms that even the cheapest commercial platform charges an ongoing fee you don't pay by self-hosting.

### 3. Current 2026 pricing snapshot (Local Line's own comparison, July 2026 — read with the bias that Local Line ranks itself #1, but the pricing figures are specific and checkable)

| Platform | Pricing model | Note |
|---|---|---|
| Local Line | $99+/mo flat, no commission | |
| CSAware | 2% of deliveries + $100/mo minimum | |
| Farmigo | 2% of deliveries + $150/mo minimum | |
| GrownBy | $50/mo CSA plan + 2% co-op fee | Farmer-owned co-op |
| Eat From Farms | $15/mo flat, no commission | |
| Local Food Marketplace | $129–149/mo, prepaid annually | Food-hub focus |
| Barn2Door (official pricing page, verified directly) | $119/$159/$299/mo + 2.9%+$0.30 processing + $399–599 one-time setup | Tiered by farm size/volume |

At 2% of deliveries or $100-150/mo minimums, a 200-member farm running weekly boxes would be paying roughly **$150–400+/month** ($1,800–4,800+/season) for a platform that still wouldn't natively support your Farm Flex prepaid-credit model, household accounts, or driver arrival-text routing — all of which you've already built. This reinforces the prior research's conclusion: self-hosting is a real structural advantage here, not just a cost story.

### 4. Payments landscape — store credit vs. subscription vs. weekly billing (the part prior docs covered lightly)

Barn2Door's subscriptions page (verified directly, not secondhand) is the clearest primary source on how the industry actually structures CSA payments, and it maps closely onto decisions you'll face:

- **Pay-upfront vs. pay-as-you-go is the core split**, and Barn2Door states the real-world ratio: ~1/3 of farm subscriptions are paid upfront (typically with a 5–10% discount as the incentive), ~2/3 are pay-as-you-go (charged per fulfillment — weekly for a weekly box). Your Flex system is effectively a third model: prepaid store credit, spent down at will, never expiring — which none of the reviewed platforms replicate natively (GrazeCart has generic store credit, but not a CSA-specific weekly-cutoff spend-down wallet like yours).
- **Late enrollment / mid-season proration is an explicit, named feature on Barn2Door**: "Buyers will automatically be charged a prorated amount depending on the fulfillment schedule or remainder of the term." This is the one concrete payments gap your portal has today that a returning/new-signup competitor platform would visibly beat you on if you ever run paid subscriptions rather than pure Flex credit. Worth flagging even though it's not urgent for a Flex-based model.
- **Skip/cancel self-service** is treated as table stakes ("the easier it is to make changes... the better the experience") — you already have this via vacation holds and box swaps.

### 5. AI-era features — reality check, not hype

I went back to the primary source (GrownBy's own "Custom CSA Shares (BETA)" post) rather than trusting secondhand summaries. As of the cached version I could retrieve, GrownBy's AI-personalized box-building is **still explicitly beta**, still "learning your customers' preferences over time," and the farmer-choice fallback is still manual, not AI-generated. That's essentially unchanged from what the June 18 benchmark found. **This confirms the owner's exclusion of AI/ML box customization from the June scope was and remains the right call** — no platform in this category has shipped mature AI personalization; the "AI-era features" the team lead asked about (churn prediction, conversational/voice ordering) don't appear as shipped, verifiable features anywhere in this category as of this research — they show up only in generic SEO content-mill trend pieces (e.g., a Farmonaut blog post making an unsourced "75% of CSA programs will adopt specialized software by 2026" claim), which I'm flagging as low-confidence marketing copy, not evidence, and would not act on.

### Top 10 recommendations for a 200-member farm, ranked by impact

1. **Season-end self-service renewal flow.** Every reviewed platform has this; you don't. It's the single largest gap left after box-swap shipped, and it's a direct revenue-timing issue (locking in commitment before the off-season). Medium effort — you already have `campaign-segments.ts` to identify lapsing members; the missing piece is the in-portal renew action itself.
2. **Don't build AI/ML personalization.** Confirmed again this pass — no competitor has shipped it maturely, GrownBy's own version is still beta after ~2 years. Skip it.
3. **Don't build gift cards/gift shares unless demand is proven.** Real feature elsewhere (GrazeCart, Barn2Door), but it's a Nov–Jan seasonal ask, not core retention — small effort if/when you want it, not a priority now.
4. **Fix or formally retire SMS.** You have a `sms-policy.astro` and admin text-stop/text-chef tooling but no working Twilio send path for member-facing reminders. Either finish the Twilio setup (flagged in your active-locks.md as "needs Todd") or stop implying SMS capability exists in member-facing copy.
5. **Mid-season proration** — only worth building if you ever move part of the membership to a paid-subscription model rather than pure Flex credit; low priority while Flex remains the primary payment mechanism.
6. **Order/receipt history** — you have `account/history.astro`/`track.astro` already; verify these actually surface Shopify order + Flex ledger data cleanly, since this was flagged incomplete in June.
7. **Continue NOT building free build-a-box.** Barn2Door/industry data (already in your prior research) confirms this doesn't scale past ~50 members — stay with capped swaps.
8. **Continue NOT building a multi-farm/food-hub marketplace layer** (what Local Food Marketplace sells). You're single-farm; that entire feature class is irrelevant to you.
9. **Route optimization** — genuinely differentiating once a second driver/home-delivery scales, per prior benchmark; not urgent at current scale.
10. **Own-the-stack messaging as a retention asset** — this is free and already true: unlike Harvie (closed 2024), Farmigo (pivoted), or Imperfect (absorbed into Misfits), your self-hosted Supabase/Astro portal can't vanish under you. Worth stating to members directly as a stability feature, per the competitor-teardown doc's Section 5.

### Sources
- GrazeCart: grazecart.com (fetched directly), grazecart.com/pricing (fetched directly)
- Local Food Marketplace: localfoodmarketplace.com (fetched directly)
- Local Line "6 Best CSA Software Platforms for Farms (2026)," localline.co/blog/top-csa-software-platforms (fetched directly, July 3 2026 — note: Local Line-authored, self-ranked #1, but pricing figures for competitors are specific and checkable)
- Barn2Door pricing: barn2door.com/pricing (fetched directly)
- Barn2Door subscriptions: barn2door.com/subscriptions (fetched directly)
- GrownBy AI custom shares status: coop.grownby.com/post/grownby-introduces-custom-csa-shares-beta (fetched directly)
- Farmonaut "CSA Software 2026 Trends" — flagged as low-confidence SEO content marketing, not treated as evidence
- Internal codebase verification: `apps/csa-portal/src/lib/{box,season,recipes}.ts`, `apps/csa-portal/src/pages/{account,admin}/**`, grep audits for `twilio`, `proration`, `renew`, `gift` (Sept 2, 2026)
- Prior internal research (not duplicated, built upon): `docs/research/CSA_PORTAL_PLATFORM_BENCHMARK_2026.md` (2026-06-18), `CSA_PORTAL_COMPETITOR_TEARDOWN_2026.md` (2026-05-20), `CSA_PORTAL_GAP_ANALYSIS_V2_2026.md` (2026-05-24), `FLEX_ORDERING_GAP_RESEARCH.md` (2026-06-08)

**Date researched:** 2026-09-02