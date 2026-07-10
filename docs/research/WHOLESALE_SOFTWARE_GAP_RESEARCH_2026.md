# Wholesale Software Gap Research — Farm-to-Restaurant Ordering
**Date Researched:** 2026-07-09  
**Researcher:** RESEARCH_CLAUDE  
**Builds on (do not repeat):** `docs/audits/WHOLESALE_PORTAL_AUDIT_2026-07.md` (full portal audit, prod data), `docs/CSA_INDUSTRY_RESEARCH.md`, `docs/audits/CSA_GAP_RESEARCH_2026-07.md`  
**Scope:** Farm-side wholesale platforms + restaurant-side ordering apps + fresh-sheet best practices → gap table vs Tiny Seed's live portal → actionable proposals

---

## Executive Summary

- **The leader bar for farm-side wholesale is Local Line**: real-time portal, standing orders, order cycles, shared single-inventory across CSA + wholesale, pick/pack/harvest lists — exactly what we've built. Their documented weakness is no native broadcast email/SMS to buyers; our system already has the cron + Resend infrastructure to beat them on that.
- **The bar chefs actually use is set by Choco and BlueCart**: 3-tap mobile ordering, "reorder last order" in seconds, free for restaurants, no login friction. Our "reorder last week" hero button and permanent token link already meet this bar; we are not missing a native app.
- **The single highest-converting communication act in farm wholesale is the weekly "fresh sheet"** — same day, every week, products + prices + personal link + cutoff. Penn State, Local Line, and every practitioner guide agree: reliability of the send beats cleverness of content. Our portal is built; the send is not automated.
- **Standing orders are the revenue foundation**: Local Line explicitly: "one-off orders pay for gas, standing orders build a business." We have the SQL schema and generator; we do not have the admin UI to let Todd manage them without a developer.
- **Chef onboarding is the funnel leak**: 46 of 56 accounts have never ordered; industry benchmark is 60%+ first order within 30 days of approval. Welcome emails have a 94% open rate. We have no welcome email and no add-account UI.

---

## 1. How the Leaders Work — Farm-Side Wholesale Platforms

### 1.1 Local Line (localline.co)
**Position:** Current market leader for multi-channel farms, primary destination for farms leaving Harvie. Pricing: $69–299/month + 0.5–2% transaction fee.

**Wholesale features (verified from vendor pages and third-party reviews):**
- **Separate storefronts per channel**: retail, wholesale, restaurant, distributor — all drawing from one master inventory. Price lists per customer type from one dashboard. This is the "shared product library" pattern.
- **Order cycles**: farm sets open/close windows (e.g., open Monday, close Wednesday night, fulfill Friday). Buyers can only order within the window. Cutoff is enforced.
- **Standing orders / subscriptions**: subscription-based recurring orders. Customers subscribe once; farm collects every cycle.
- **Pick lists, pack lists, harvest lists**: same fulfillment tooling serves CSA boxes and wholesale orders.
- **Real-time inventory**: availability updates instantly across all channels. Out-of-stock products hide automatically.
- **Confirmed weakness**: Local Line "sends order confirmations and transactional emails, but it does not offer broadcast SMS or marketing email campaigns." Farms cannot send availability alerts or fresh sheets directly through the platform — they must connect Mailchimp or another tool. (Source: farmzz.com review, 2026)

**Key lesson for us:** Local Line's architecture matches ours (single product library → multi-channel). Their gap (no broadcast availability email) is our opportunity to differentiate. We have Resend + the cron infrastructure; they don't.

### 1.2 Local Food Marketplace (home.localfoodmarketplace.com)
**Position:** Food-hub and multi-producer platform. Pricing starts $129/month.

- Unlimited price lists across packages (restaurant pricing separate from retail/CSA).
- Manages wholesale ordering, delivery routing, and harvest list generation in one system.
- Supports CSA (traditional and customizable) alongside wholesale — same platform, shared inventory.
- Used by food hubs aggregating from multiple farms; single-farm use is over-engineered for Tiny Seed's scale.

### 1.3 GrazeCart (grazecart.com)
**Position:** Weight-based product specialist (meat, dairy by the pound). Pricing ~$59/month.

- Wholesale pricing tiers alongside retail from same backend.
- Handles variable-weight items (half-beef shares, etc.) — not our primary use case.
- Lacks the farm communications / availability-email layer entirely.

### 1.4 Barn2Door (barn2door.com)
**Position:** Direct-to-consumer for farms; no wholesale marketplace. Does NOT directly serve restaurant wholesale accounts as a channel. Its "wholesale" is really a retail price-list variant for direct sales, not B2B procurement. (Source: Barn2Door vs. Local Line comparison page, 2026)

**Relevance to us:** Low. Barn2Door's strength — best-in-class subscription engine and farm branding — is already solved in our system.

### 1.5 Rooted Farmers (rootedfarmers.com)
**Position:** Marketplace + SaaS hybrid. 7,500+ wholesale buyers on the network.

- Farms create storefronts; buyers discover and order across multiple farms.
- 2025 additions: Mailchimp sync for buyer email campaigns, wholesale buyer CRM ("Customer Diary"), analytics by retail vs. wholesale segment.
- Products are marketplace-listed with ready-made templates — useful for buyer discovery, but adds marketplace dependency.
- **Anti-pattern for us:** listing on Rooted puts our products in a multi-farm catalog and introduces marketplace commission. Not appropriate for our direct-relationship model with named restaurant accounts.

### 1.6 Platform Comparison Summary

| Platform | Shared product library | Availability email | Standing orders UI | Chef onboarding | Pick/pack integration | Pricing |
|----------|----------------------|-------------------|-------------------|----------------|----------------------|---------|
| **Local Line** | Yes | No (Mailchimp add-on) | Yes (subscription) | Via storefront | Yes | $69–299/mo |
| **Local Food Marketplace** | Yes | Partial (built-in email) | Yes | Self-serve portal | Yes | $129+/mo |
| **GrazeCart** | Yes | No | Limited | Self-serve | Basic | $59/mo |
| **Barn2Door** | No wholesale marketplace | No | Subscription engine | Via storefront | Basic | ~$149/mo |
| **Rooted Farmers** | Marketplace model | Mailchimp sync (2025) | Not documented | Marketplace | No | Commission-based |
| **Tiny Seed (today)** | **Yes** | **No (manual)** | **Yes (SQL only)** | **No (SQL insert)** | **Yes (best-in-class)** | Self-hosted |

---

## 2. The Chef-Side UX Bar — Restaurant Ordering Apps

These are the apps chefs already live in. They set the UX expectation chefs bring to any supplier portal.

### 2.1 Choco (choco.com)
**Model:** Free for restaurants. Paid by distributors/suppliers. ~8.8 million orders/year processed.

**Why chefs adopt it:**
- "Place orders in 3 taps" from mobile. Orders that used to take 30–60 minutes take 5–10 minutes.
- Eliminates communication anxiety ("texting the right person," worrying messages went through). Instant confirmation: "know exactly what I am getting."
- No setup time. Works on mobile and desktop.
- 2025–2026: AI-powered voice ordering (OpenAI partnership) — chef calls, AI takes the order, checks stock, suggests alternatives. 50% reduction in manual order entry.
- Saves 2+ hours/week per chef. (Source: choco.com/us/restaurants; OpenAI case study, 2026)

**What this means for us:** Our permanent token (no login), mobile-first page, "reorder last week" button, and instant confirmation email already match Choco's UX proposition for a single-supplier flow. We do not need a native app or AI voice ordering. What we lack is the *send* that drives chefs to open the portal.

### 2.2 BlueCart (bluecart.com)
**Model:** $10/month + 5% commission (marketplace plan). 48,000+ restaurant users.

**Key features:**
- **Standing orders**: auto-generated recurring orders at defined intervals. Quantities pre-set; confirmed automatically. "An effective standing order allows for purchase and delivery of the correct amount of inventory."
- **One-click reorder**: repeat any past order with single action.
- **Predictive ordering**: triggers purchase orders automatically when stock hits minimum threshold.
- **Push notifications**: stock alerts, order confirmations, delivery updates.
- **Inventory integration**: connects to restaurant inventory management; ordering triggers stock deduction.
- Drawback: built for distributors and broadline suppliers, not farm-direct. Commission on marketplace model is inappropriate for our direct accounts. (Source: bluecart.com; sourceforge reviews 2026)

**What this means for us:** Our "reorder last week" feature is the equivalent of one-click reorder. We already have this. Standing orders with admin UI (Gap #2) would close the BlueCart parity gap on recurring orders.

### 2.3 Notch / formerly ChefHero (Notch Connect)
**Model:** Lightweight SaaS. Primarily local/small businesses.

- Fewer features than BlueCart but lower friction for small operations.
- Used by local suppliers and small food businesses as a phone/text replacement.
- No specific features that differentiate from our portal for a single-farm context.

### 2.4 Pepper (usepepper.com)
**Model:** B2B ordering for independent food distributors.

- 70%+ of orders completed in under 5 minutes. (Source: usepepper.com)
- Focuses on basket-size growth and sales rep efficiency.
- Designed for distributor-to-restaurant flow, not farm-direct. Not a direct competitor or model.

### 2.5 What Makes Chefs Adopt One Supplier's Portal

Synthesized from Choco, BlueCart, Penn State, SmartFarmPilot, and Fresho research:

1. **Zero login friction.** Chefs will not create and remember another password. Permanent token or app stays logged in.
2. **Mobile-first, thumb-reachable.** Over 70% of B2B food orders are initiated on phone now. 44px touch targets are table stakes.
3. **Reorder last order in 30 seconds.** The single most-cited time-saver. Chefs order the same ~5–10 items weekly.
4. **Instant confirmation with line-item detail.** "I know exactly what I'm getting." Eliminates phone-tag to verify receipt.
5. **It's free for the chef.** No barrier. Our portal is free to use for chefs.
6. **Reliability of the supplier, not features of the platform.** Chefs stay with suppliers who deliver correctly and on time. Technology lowers friction; relationships drive loyalty.

---

## 3. Fresh Sheet / Availability List Practice

### 3.1 What the Availability Email IS

Industry consensus (Local Line, Penn State Extension, SmartFarmPilot, ATTRA, practitioner guides):

> A **fresh sheet** or **availability list** is a weekly (or per-delivery-period) email or message to restaurant buyers listing: what's available now, in what units, at what price, with how to order and by when. It is the heartbeat of the farm-restaurant relationship.

It is NOT a newsletter. It is NOT marketing content. It IS an operational document — the instrument that opens each order period.

### 3.2 Format Consensus

| Element | Industry consensus | Our portal today |
|---------|-------------------|-----------------|
| Products listed | All available items, grouped by category | Not sent automatically |
| Unit + price visible | Yes — chef needs this to plan menu costs | Products/prices on portal; not in email |
| Quantity available | Optional; "approximate" acceptable | `available_qty` field exists but decorative |
| Photos | "A great photo can whet a chef's appetite" (Penn State). Increases engagement. | 20 of 38 products have photos; 18 missing |
| Quality/freshness notes | "Seasonal specials, variety details, freshness" cited as differentiator | Feature built; 0 uses ever |
| Personal order link | Per-chef token link (or standing URL) | Token exists; not included in any automated email |
| Cutoff date and time | Explicit — chefs plan around it | Shown on portal; not in any automated email |
| Send cadence | Same day, same time, every week (reliability > cleverness) | Manual, ad hoc |

### 3.3 When to Send

Synthesized from Penn State, SmartFarmPilot, Local Line, and practitioner data:

- **Wednesday-delivery period:** Sunday evening or Monday by 8:30–9:00 AM. Chefs are planning menus Sunday/Monday for midweek. This aligns with our current Monday 9:05 AM reminder slot — which should become the availability email, not a bare reminder.
- **Friday-delivery period:** Tuesday evening or Wednesday morning. Chefs are planning Thursday–weekend menus by Wednesday. Our Monday 3:30 PM "Todd reminder" should become a Wednesday 8:00 AM chef-facing send.
- **Single biggest cadence mistake**: inconsistency. Sending Sunday one week, Wednesday the next trains chefs to ignore the send. Pick a time; hold it forever.

### 3.4 What Converts (Engagement Factors)

1. **Reliability of cadence**: Chefs who know the list arrives Monday at 9 AM will open it. Chefs who don't know when it comes will miss it.
2. **Products + prices in the email body**: A bare "ordering is open" link requires the chef to click through to see what's available. Many won't. Put the key items in the email itself (top 8–12 products, grouped, with prices), then link to the full portal for the full list and order form. (Inference from industry pattern; not a single documented A/B test found in research.)
3. **Personal link (no login)**: Re-confirmed by Choco's success: remove every friction. Our token links should be in every email.
4. **Correct cutoff in the email**: Chefs plan around deadlines. The wrong cutoff (C3 bug in our audit) destroys trust.
5. **Photos drive attention**: Instagram-savvy farms report photos in the list increase response. "A great photo can whet a chef's appetite for great products." (Penn State, ATTRA guides.)
6. **Re-order reminder trigger**: Re-order reminder emails triggered ~14 days after last order generate a 5–8% reorder rate (wholesale email benchmark, from research synthesis). Our Monday reminder to accounts that haven't ordered is the correct mechanic.

### 3.5 Freshness / Quality Notes as Differentiator

Local Line, SmartFarmPilot, and Penn State all cite "quality and variety details" as the differentiator that moves a price-comparison into a loyalty relationship. Our portal already has the "Today's quality update" feature (photo + note, per-week keyed) — and it has never been used. This is a Todd-behavior gap, not a code gap. The right intervention is: include quality notes in the availability email template when they exist, and show a "no quality notes yet for this week" placeholder that nudges Todd to fill them before the send fires.

---

## 4. Gap Table — Tiny Seed vs. Industry Leaders

Ranked by value to order frequency / chef adoption / farm labor. "Effort" is S = hours, M = 1 day, L = 1+ days.

| Rank | Gap | What leaders do | We have? | Value | Effort | CSA/market dovetail note |
|------|-----|----------------|----------|-------|--------|--------------------------|
| **1** | **Automated availability email per order period** (products + prices + token link + cutoff; Wed + Fri variants; freshness notes if present; freshness guard if list stale) | Local Line: real-time portal (no email but positions this as their gap). Penn State / ATTRA / SmartFarmPilot: weekly fresh sheet is table stakes. Rooted Farmers: Mailchimp sync added 2025. | NO. Monday reminder has no products. Friday period sends nothing to chefs. Manual Gmail by Todd. | ★★★★★ Owner's stated ask | M | Resend + cron pattern already proven by `chef-order-reminder.ts`. Does NOT touch CSA campaign system (different recipient table). |
| **2** | **Standing orders admin UI** (list/toggle/qty-edit/add; Friday `delivery_dow` support; run confirmation) | BlueCart: UI-based auto-recurring. Local Line: subscription UI. All platforms treat standing orders as a first-class feature. | Schema + generator: YES. Admin UI: NONE. Todd can't manage without SQL. | ★★★★★ | M | `standing_orders` is already keyed on `delivery_date`. Adding Friday support uses same generator. Does NOT fork pick-pack — standing orders already appear on all pack surfaces. |
| **3** | **Wed/Fri period chooser on chef page + server-side cutoff enforcement** | All platforms: order windows are explicit and enforced hard. Buyers select their delivery slot. Cutoffs block submission. | Period chooser: NO (Friday hidden behind `?day=fri`). Cutoff enforcement: NO (display-only). | ★★★★ | S | Fixing the confirmed.astro cutoff label (C3) and the `?day=fri` lost-on-error redirect (C4) is pure wholesale code — no CSA impact. |
| **4** | **Chef onboarding: add-account UI + welcome email** | BlueCart / Local Line: self-serve application or admin "add account" form + automated welcome email with portal link. Industry benchmark: 60%+ of approved buyers place first order within 30 days; welcome emails have 94% open rate. | NO add-account form (SQL only). NO welcome email template. 46/56 accounts never ordered. | ★★★★ | S–M | Wholesale accounts table is separate from CSA customers. No cross-system schema impact. |
| **5** | **"Item went off after you ordered" notification to chef** (when Todd toggles a product off that is in a placed order) | Local Line: product hides automatically, but does NOT notify chefs who already ordered. BlueCart: push notification on stock change. This is a gap even at industry leaders — we could lead. | NO. Toggle exists; no downstream notification. Only Todd knows. | ★★★ | S | Uses same `notification_log` pattern. No CSA impact. |
| **6** | **Freshness signal on chef page** ("list last updated X days ago") + **stale-list send guard** | Local Line: real-time update timestamp implicit. Our audit finding: products last updated 6 days before audit; chefs see no signal. | NO. No "last updated" on chef page or in emails. | ★★★ | S | Pairs naturally with Gap #1 (the availability email should refuse to fire if list is stale beyond N days). |
| **7** | **Re-invite / follow-up play for never-ordered accounts** | Rooted: "Customer Diary" CRM. BlueCart: analytics + outreach tools. SmartFarmPilot: 4-touch sequence after initial sample. Industry: 60%+ first-order in 30 days; accounts beyond 30 days drop sharply. | Engagement funnel visible at `/admin/wholesale/orders`. No follow-up automation. | ★★★ | M | Uses existing `notification_log` pattern. 38 accounts have never opened their link. |
| **8** | **Email opt-out / unsubscribe footer on all chef bulk sends** | Required by best practice (B2B is low CAN-SPAM risk but 50+ recipients/week warrants an exit). All commercial platforms include this. | NO opt-out exists. `receives_orders` contact flag is the only lever (requires chef to self-manage). | ★★★ | S | Audit recommendation: one-line footer + `opt_out` flag on `wholesale_accounts` honored by both crons. No CSA impact. |
| **9** | **Quality update habit (or remove the feature)** | SmartFarmPilot, Penn State: quality + variety details in the fresh sheet are the differentiator that builds loyalty beyond price. Local Line: product descriptions editable per cycle. | Feature built (photo + note, week-keyed). 0 uses in production. | ★★★ behavior gap | — | Correct intervention: surface quality note status in the availability email template and on the admin hub ("0 quality notes for this period — add one before the list sends"). Todd behavior, not code. |
| **10** | **Photos for 18 photo-less active products** | All platforms: photos drive engagement. "A great photo can whet a chef's appetite." | Board upload flow exists; 18/38 products have no photo. | ★★★ | S (field work) | No system impact. |
| **11** | **Multiple pricing tiers (real discount tiers)** | Local Line: unlimited price lists per customer type. BlueCart: per-account pricing. | Schema: YES (1 tier, 0% discount; 49 accounts pointed at it). Business decision: no tier exists yet. | ★★ | S (once Todd defines tiers) | Tier machinery already built. Gap is business decision, not code. |
| **12** | **`available_qty` enforcement** (hide/block when qty = 0) | Local Line: hides out-of-stock automatically. BlueCart: predictive alerts. | Decorative field. 0 active products at qty 0 today — no live harm. | ★★ | M | Would need RPC + availability email integration. Low urgency. |

---

## 5. Anti-Recommendations

Features that look relevant but should NOT be built at this stage. Each carries an explicit reason.

### 5.1 Marketplace Listing (Rooted Farmers, Local Line marketplace)
**Do not list Tiny Seed on any food marketplace.**  
Reason: Our 56 accounts are named, direct relationships. A marketplace introduces commission fees, comparison shopping (chefs see competing farms), and dependency on a third-party platform that could close (see Harvie). Our competitive position is the *direct relationship* — personalized token, direct Resend emails, Todd's phone number. Marketplace listing is an anti-pattern for this model.

### 5.2 Payment Rails / Invoice Integration
**Do not build invoice or payment integration at this stage.**  
Reason: The existing Stripe-ACH-first decision memo defers this. None of the 19 orders to date have required online payment; the business runs on invoices and relationships. BlueCart's commission model (5% per order) would cost ~$97/week at current volume — unacceptable. Build when the business demands it, not to match feature checklists.

### 5.3 Native Mobile App
**Do not build an iOS/Android app.**  
Reason: Our portal is already mobile-first (44px touch targets, safe-area padding, verified mobile render). Choco succeeded because it was free and frictionless — not because it was native. A native app requires App Store approval, maintenance, and push notification infrastructure. PWA (add-to-home-screen) is 90% of the benefit at ~0% of the cost if ever needed.

### 5.4 AI-Powered Ordering (Voice, Suggestion Engine)
**Do not implement AI ordering at this stage.**  
Reason: Choco's AI voice ordering (OpenAI, 2025) is designed for distributors with hundreds of SKUs and dozens of reps. We have 38 products and 10 active ordering accounts. The ROI calculation doesn't apply. Our "reorder last week" button is already the correct level of intelligence for this scale.

### 5.5 Multi-Producer Food Hub Features
**Do not aggregate other farms' products.**  
Reason: Wrong business model. Aggregating other producers introduces food safety liability, procurement complexity, and margin compression. Our value proposition is Tiny Seed Farm's produce, not a regional hub.

### 5.6 Broadcast SMS to Chefs
**Do not replace availability email with SMS at this stage.**  
Reason: SMS works well for time-sensitive consumer alerts (CSA pickup reminders). For B2B procurement, chefs need to see a product list — SMS is too short. The right channel for a fresh sheet is email with a link. SMS can be added as a "list is live" nudge after the email system is proven, but it should not be the primary instrument.

---

## 6. The Three Strongest Patterns Worth Adopting

### Pattern A: The Weekly Availability Ritual (same day, same time, every week)

**What leaders do:** Local Line states it explicitly: "update your list on the same day each week and send it to every account with a link to order." Penn State: "contact chefs at the beginning of the week as they're planning their menus." SmartFarmPilot: fresh sheet cadence = before Tuesday evening for Wednesday, before Thursday morning for Friday.

**The insight:** Chefs are creatures of planning rhythm. If they know the Tiny Seed list arrives at 8:30 AM every Monday, they will plan their Tuesday specials around it. If it arrives sometimes Monday, sometimes Wednesday, sometimes not at all — they stop planning around it and default to their broadline distributor. Reliability of the send is more important than quality of the content.

**What to build:** Two cron sends per week (Mon ~8:30 AM for Wed, Wed ~8:00 AM for Fri), both gated behind a `portal_settings` flag Todd arms, both with a freshness guard (refuse to send if `max(wholesale_products.updated_at)` is older than 5 days). The email body should contain the top products with prices and the chef's personal token link — not just "click here to see the list."

**CSA dovetail:** The Resend + cron pattern is already proven by `chef-order-reminder.ts`. The send logic is identical; only the content differs. Does NOT use the CSA campaign system.

### Pattern B: Standing Orders as the Revenue Foundation, With Admin UI

**What leaders do:** BlueCart, Local Line, and every practitioner guide agree: recurring orders are the business model. Local Line's guidance to farms: "one-off orders pay for gas, standing orders build a business." BlueCart: standing orders prevent stockouts, reduce manual intervention, and create negotiating leverage for the chef (priority service, better terms).

**The insight:** Our four standing order accounts (Mediterra 50 lb King Spring Mix/week, Butter Joint 10 lb, Cafe Verde 6 lb, Black Radish 10 lb) account for the majority of this week's $1,940. Those are effectively locked-in revenue. Every new account that places two or three one-off orders is a conversion opportunity to standing. But Todd can't propose, adjust, or manage standing orders without SQL — which means conversions never happen in the field, only in retrospect.

**What to build:** A minimal `/admin/wholesale/standing-orders` page: list all active standing orders (account, product, qty, dow), toggle active/inactive, edit qty, add a new row (account + product + qty + Mon or Fri). No fancy UX needed — this is an internal tool. The generator already works. Friday `delivery_dow` support requires one line change in the cron target.

**CSA dovetail:** Standing orders already appear on all pack surfaces (keyed on `delivery_date`). No fork. No duplicate system. The generator materializes standing orders into `wholesale_orders` exactly like any other order source.

### Pattern C: Chef Onboarding as a Conversion System, Not a SQL Task

**What leaders do:** BlueCart, Local Line, and wholesale B2B practice: welcome emails achieve 94% open rate vs. 26% average; personalized welcome emails increase Day 7 retention by 33%; target 60%+ of approved buyers placing first order within 30 days. The onboarding sequence is: application/add → welcome email with portal link → follow-up at day 7 if no visit → follow-up at day 14 if no order → archive/re-pitch at day 30.

**The insight:** 46 of our 56 accounts have never ordered. 38 have never opened their link. This is not a product quality problem — our ordering page is excellent. It is an onboarding problem: no chef ever received a warm, personal "here's your link, here's what we grow, here's when to expect our list" email. The gap between "SQL row inserted" and "chef places first order" is unbridged.

**What to build:** (1) An admin "Add account" form (name, email, phone, pricing tier, delivery pref) that calls `/api/admin/wholesale/account-save` with an INSERT path and auto-mints the token. (2) A welcome email template sent on account creation: farm intro (2 sentences), "here is your personal ordering link" (big button), what we grow (brief), when the list arrives (Monday AM for Wed, Wed AM for Fri), and Todd's phone number for questions. This single touchpoint converts the 46 never-ordered accounts from dead weight to opportunity.

**CSA dovetail:** Wholesale accounts table is entirely separate from CSA customers. No schema surgery. No cross-system impact.

---

## Sources

- [Local Line — Restaurant Sourcing Features](https://www.localline.co/customers/restaurants)
- [Local Line — Wholesale Line Sheet Guide](https://www.localline.co/blog/wholesale-line-sheet)
- [Local Line — How to Sell Produce to Restaurants](https://www.localline.co/blog/how-to-sell-produce-to-restaurants)
- [Local Line vs. Barn2Door Comparison 2026](https://www.barn2door.com/blog-all/a-2025-comparison-of-barn2door-and-local-line)
- [Local Line Pricing & Review 2026 — Farmzz](https://farmzz.com/en/blog/local-line-pricing-review)
- [Choco — Restaurant Ordering App](https://choco.com/us/restaurants)
- [Choco + OpenAI AI Ordering Case Study](https://openai.com/index/choco/)
- [BlueCart — Standing Orders Guide](https://www.bluecart.com/blog/standing-orders)
- [BlueCart — Best SaaS Platforms for Restaurant Wholesale Ordering](https://www.bluecart.com/blog/best-platforms-restaurant-wholesale-ordering)
- [BlueCart — Restaurant Ordering Platform Overview](https://restauranttools.ai/tools/bluecart)
- [BlueCart — Pepper Comparison](https://www.bluecart.com/blog/pepper)
- [Pepper vs. BlueCart Comparison](https://www.usepepper.com/compare/pepper-vs-bluecart)
- [Rooted Farmers — Marketplace + Sales Platform](https://www.rootedfarmers.com/blog/we-re-a-marketplace-sales-platform-why-that-s-good-for-your-farm)
- [Rooted Farmers — January 2025 Features](https://www.rootedfarmers.com/blog/rooted-just-got-better-new-january-features)
- [GrazeCart — Farm E-Commerce Platform](https://www.grazecart.com/)
- [Findhomegrown — Best E-Commerce Platforms for Farmers 2026](https://findhomegrown.com/blog/ecommerce-platforms-for-farmers)
- [Penn State Women's Ag Network — Farm-to-Chef Relationships](https://agsci.psu.edu/wagn/topics/virtual-field-days/farm-to-chef-relationships)
- [SmartFarmPilot — Sell to Restaurants: How Farms Add 25–40% Revenue](https://smartfarmpilot.com/blog/farm-to-table-partnerships-selling-to-restaurants-institutions)
- [Carnation Farms — Fresh Sheet Wholesale Ordering](https://farm.carnationfarms.org/fresh-sheet/)
- [Local Food Marketplace — Software for Farms, Food Hubs, CSAs](https://home.localfoodmarketplace.com/)
- [ATTRA/NCAT — Tips for Selling to Restaurants](https://attra.ncat.org/publication/tips-for-selling-to-restaurants/) *(redirected to ncat.org)*
- [Fresho — Biggest Challenges in Restaurant Industry 2024](https://www.fresho.com/us/resources/fresh-food-insiders/the-biggest-challenges-in-the-restaurant-industry-in-2024) *(403 on fetch; sourced via search results)*
- [Fresho — Chef Insights Survey Report 2025](https://www.fresho.com/resources/tools/chef-insights-survey-report-2025)
- [Excelohunt — Wholesale Account Onboarding via Email](https://www.excelohunt.com/blog/b2b-wholesale-email-onboarding-accounts/)
- [Wholesale Suite — Customer Onboarding Checklist](https://wholesalesuiteplugin.com/wholesale-customer-onboarding/)
- [FutureDataStats — Farm-to-Table Market Size 2030](https://www.futuredatastats.com/farm-to-table-market)
- [Morning Ag Clips — Farm-to-Restaurant Sourcing](https://www.morningagclips.com/from-garden-to-plate-sourcing-wholesale-ingredients-for-farm-to-table-restaurants/)
- [thefarminginsider.com — Farm-to-Restaurant Programs](https://thefarminginsider.com/farm-to-restaurant-programs-for-direct-produce-sales/)

---

*Research method: web search (Brave/Firecrawl), vendor page fetches, extension publication review, and third-party platform comparisons. Claims from vendor marketing copy are labeled as such; independent review sources noted where available. No data was written to production systems. Research goes stale — re-verify pricing and feature availability before citing in procurement decisions.*
