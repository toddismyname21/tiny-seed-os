# Wholesale Chef Portal — Build Synthesis
## Tiny Seed Farm — June 2026

**Synthesized from:** WHOLESALE_MIGRATION_PLAN_2026.md, WHOLESALE_MIGRATION_RESEARCH_2026.md, WHOLESALE_INDUSTRY_RESEARCH.md, WHOLESALE_IMPROVEMENT_ROADMAP.md, WHOLESALE_SYSTEM_AUDIT.md, CSA_WHOLESALE_FULL_AUDIT_2026-03-14.md, WHOLESALE_ACCOUNTS.md, WHOLESALE_MEETING_BRIEF.md, PITTSBURGH_FLOWER_CHEF_MARKET_RESEARCH.md, and direct inspection of chef-order.html, admin-wholesale.html, ChefCommunications.js.
**Date synthesized:** 2026-06-14
**Purpose:** Decision-ready brief for the wholesale chef portal build. Dense, specific, no padding.

---

## 1. WHOLESALE CLIENTS — The Complete Real List

**Source:** WHOLESALE_ACCOUNTS.md (last updated 2026-01-16) + WHOLESALE_MIGRATION_RESEARCH_2026.md

Total confirmed accounts: **9 restaurants** (delivery addresses on file). WHOLESALE_CUSTOMERS sheet has 3 data rows; SALES_Customers has 6 rows with customer_type='wholesale'. Combined = 6–9 active or recently active.

### Delivery Clusters

**Cluster A: Lawrenceville (3 stops — tightest cluster)**
| Restaurant | Address | Notes |
|---|---|---|
| Spirit | 242 51st St, Pittsburgh PA 15201 | Restaurant |
| Driftwood Oven | 3615 Butler St, Pittsburgh PA 15201 | Restaurant; sources from 8 regional farms |
| Morcilla | 3519 Butler St, Pittsburgh PA 15201 | Same block as Driftwood; Lawrenceville Spanish |

**Cluster B: Bloomfield (2 stops — parallel streets, 2 min apart)**
| Restaurant | Address | Notes |
|---|---|---|
| Fet Fisk | 4786 Liberty Ave, Pittsburgh PA 15224 | HIGHEST PRIORITY. Nik Forsberg (chef) literally worked at Tiny Seed Farm. Bon Appetit 2025 Best New Restaurants. James Beard finalist. Sells at Bloomfield Saturday Market. Also buys produce from local farms. |
| APTEKA | 4606 Penn Ave, Pittsburgh PA 15224 | Vegan Eastern European. JB semifinalist 2022–2025, finalist 2023. Heavy produce user. Edible flowers ideal. |

**Single Stops (Pittsburgh)**
| Restaurant | Address | Neighborhood | Notes |
|---|---|---|---|
| Eleven | 1150 Smallman St, Pittsburgh PA 15222 | Strip District | Entry point to Pittsburgh from farm |
| Mediterra Mt. Lebanon | 292 Beverly Road, Pittsburgh PA 15216 | South Hills / Mt. Lebanon | Off main route; may need separate trip |
| Black Radish Kitchen | 6901 Lynn Way Floor 2, Pittsburgh PA 15208 | Point Breeze | CATERING company, not restaurant. Different delivery patterns — flexible scheduling likely. |

**Outlier Stop (on route from farm)**
| Restaurant | Address | Town | Notes |
|---|---|---|---|
| Cafe Verde | 111 E Spring St Suite B, Zelienople PA 16037 | Butler County | ~15 min from farm at 257 Zeigler Rd, Rochester PA. On the way to Pittsburgh. Efficient first stop. |

### Optimal Route (Farm → Pittsburgh)
Farm (Rochester PA 15074) → Cafe Verde (Zelienople, ~15 min) → Eleven (Strip District, ~30 min) → Lawrenceville cluster: Spirit + Driftwood + Morcilla (~5 min apart) → Bloomfield cluster: Fet Fisk + APTEKA (~5 min walk) → Farm.
Mediterra (Mt. Lebanon) and Black Radish (Point Breeze) are off-route detours. Mediterra may deserve its own South Hills run or be batched with future South Hills accounts.

### What They Buy
From WHOLESALE_MEETING_BRIEF.md (product catalog detail):
- **Signature salad mixes** (King Spring Mix $63/6# case, Something Fresh $66/6# case, Fancy Pants $66/6# case) — primary restaurant SKU
- **Specialty greens**: Arugula $12.50/lb, Frisée $22/12ct, Celtuce $24/12ct (unique), Escarole $30/12ct
- **Head lettuce**: Butter, Romaine, Little Gem, Head Mix ($24–26/12ct)
- **Herbs**: Basil $11/lb, Cilantro $26.50/24ct, Parsley $30/24ct — chef staples
- **Edible flowers**: $6/8oz — undersells the opportunity; Fet Fisk/APTEKA/Altius are the right buyers
- **Mushrooms (year-round!)**: Oyster $12/lb, Lion's Mane $18/lb — rare year-round offering vs. competitors
- **Peppers**: Shishito $5.50/lb, Jalapeño $5.50/lb
- **Root veg**: French Breakfast Radish $2.75/lb, Hakurei Turnip $2.25/lb, Potatoes $3/lb
- **Brassicas**: Broccolini $5.50/lb, Broccoli $4/lb
- Total catalog: ~120 products across all categories

### Per-Chef Known Notes
- **Fet Fisk**: Personal relationship (Nik Forsberg worked at Tiny Seed). Also has own half-acre urban farm — edible flowers + specialty items are the angle, not bulk greens.
- **APTEKA**: Vegan only, forages, buys locally. High volume on greens, edible flowers. Kate Lasky and Tomasz Skowronski are James Beard chefs.
- **Driftwood Oven**: Already sources from 8 regional farms — they have a process, fit into it.
- **Black Radish Kitchen**: Catering, not restaurant. May need larger periodic orders vs. weekly small orders.
- **Data still needed** (per WHOLESALE_ACCOUNTS.md): Per-account preferred delivery day, time window, typical order size, standing vs. weekly preference.

### Flower/Florist Segment
Not yet in the delivery account list but explicitly in scope for the build (MIGRATION_PLAN_2026.md Day 20). Target flower buyers per PITTSBURGH_FLOWER_CHEF_MARKET_RESEARCH.md:
- Fet Fisk (edible flowers for plating)
- APTEKA (garnish, vegan presentations)
- Altius (fine dining, events)
- Lilith (Jamilka Borges — pastry + dessert, Churchview Farm collaborator)
- Greater Pittsburgh Flower Collective ($150/year membership = access to local florist wholesale network)

---

## 2. ORDERING PERIODS AND TIMELINE (Cadence)

**Sources:** WHOLESALE_SYSTEM_AUDIT.md, chef-order.html line scan, WHOLESALE_MIGRATION_PLAN_2026.md Day 17, DAY9_CSA_DELIVERY_TRACKING_SPEC.md

### Documented Delivery Days and Cutoffs (Old Apps Script System)
From WHOLESALE_SYSTEM_AUDIT.md and chef-order.html (lines 1561–1563):

| Delivery Day | Order Cutoff | Channel |
|---|---|---|
| **Tuesday 6–10 AM** | Sunday 8 PM | Wholesale + CSA |
| **Thursday 6–10 AM** | Tuesday 8 PM | Wholesale + CSA |
| Saturday 7–11 AM | Thursday 8 PM | Farmers Market route |

### CSA Alignment: The Critical Constraint
The CSA migration (DAY9_CSA_DELIVERY_TRACKING_SPEC.md) explicitly specifies **Wednesday** as the CSA delivery day in its user story: *"It's Wednesday 4:45 PM. I open csa.tinyseedfarm.com..."*. The spec also notes: *"Today is a delivery day per member's pickup_location (Wed for CSA; eventually Mon/Thu for wholesale)."*

This creates a schedule question: **Is the new CSA on Wednesdays, while the old wholesale system ran Tuesdays/Thursdays?** The old system config (chef-order.html) says Tuesday and Thursday. The CSA Day 9 spec says Wednesday for CSA. These need to be reconciled before building.

**Working assumption** until Todd confirms: Wholesale deliveries should run on the same truck day as CSA (currently Wednesday), using the same delivery_routes/delivery_stops infrastructure from the CSA migration. Thursday may be a second wholesale-only day. Saturday is market-only.

### Weekly Order Cycle (How It Should Work)
From WHOLESALE_MEETING_BRIEF.md best practices + system audit:
1. **Monday:** Todd sends weekly availability list to all chefs (what's ready to harvest this week)
2. **Sunday 8 PM / Tuesday 8 PM:** Order cutoffs for Tuesday/Thursday deliveries
3. **Monday–Tuesday:** Harvest and pack based on confirmed orders
4. **Tuesday / Thursday 6–10 AM:** Delivery route runs
5. **Wednesday (CSA):** Separate CSA route, but if wholesale also on Wednesday, combined truck

### Lead Time Chefs Need
Per WHOLESALE_MEETING_BRIEF.md: Chefs need **weekly availability updates on Mondays** (or the evening before the ordering window closes). They need to plan menus 2–3 days ahead. The availability list that shows what's actually ready to harvest that week is the #1 communication tool — more important than any feature in the portal.

---

## 3. DIFFERENCES FROM CSA — What Wholesale Needs That CSA Doesn't

**Sources:** WHOLESALE_SYSTEM_AUDIT.md, WHOLESALE_MIGRATION_RESEARCH_2026.md, CSA_WHOLESALE_FULL_AUDIT_2026-03-14.md, WHOLESALE_IMPROVEMENT_ROADMAP.md

These are wholesale-specific requirements with no CSA analog:

| Requirement | CSA Status | Wholesale Requirement | Source |
|---|---|---|---|
| **Standing/recurring orders** | Not applicable | Full CRUD: create, pause, resume, edit qty, cancel. Auto-process on delivery window. Already built in old system at lines 36738–36946 of MERGED TOTAL.js. Must be preserved in new build. | WHOLESALE_SYSTEM_AUDIT.md |
| **Order minimums per account** | Not applicable | Per-customer minimum order enforced at cart level AND backend. Old system had backend logic but no UI enforcement. | WHOLESALE_IMPROVEMENT_ROADMAP.md §1.4 |
| **Per-chef pricing tiers** | Fixed CSA price | Standard / Premium (5% off) / VIP (10% off). Set at approval time. Must flow to product catalog dynamically — never trust client-submitted price. | WHOLESALE_SYSTEM_AUDIT.md, AUDIT_2026-03-14.md P0-1 |
| **QuickBooks invoice auto-generation** | Not applicable | createInvoiceFromOrder() already exists but not wired to submitWholesaleOrder(). This is the single highest-ROI connection in the entire build. Eliminates manual invoicing admin. | WHOLESALE_IMPROVEMENT_ROADMAP.md §1.1 |
| **Net-30 (and custom) payment terms** | CSA is prepaid | Per-customer terms (Net 14, Net 30). Tracked in WHOLESALE_CUSTOMERS. QB integration must respect per-account terms. | WHOLESALE_SYSTEM_AUDIT.md |
| **Real-time availability tied to harvest** | CSA box contents set weekly | getRealtimeAvailability() already exists (connected to REF_Crops). New build: availability must reflect actual harvest data — "0 in stock" must mean zero, not just a stale estimate. | WHOLESALE_SYSTEM_AUDIT.md |
| **Product catalog browsable by chefs** | CSA members don't pick products | Full filterable catalog: category pills (Greens/Roots/Fruits/Herbs/Flowers), search, case vs. unit pricing, per-tier price display. Old chef-order.html has this already. | WHOLESALE_SYSTEM_AUDIT.md |
| **"Notify Me" when item back in stock** | Not applicable | getChefsInterestedIn() backend exists; "Notify Me" button exists in old chef-order.html; backend trigger not wired. | WHOLESALE_SYSTEM_AUDIT.md |
| **Substitution rules per chef** | Not applicable | Table: wholesale_substitution_rules. Per-chef fallback preferences (e.g., "if romaine is out, sub butter lettuce"). Prevents "where's my romaine" calls. | WHOLESALE_MIGRATION_PLAN_2026.md schema |
| **Offline-first PWA for 5 AM kitchens** | CSA members order from home | Chefs order from busy kitchens at 5 AM with unreliable WiFi. IndexedDB product catalog cache, offline order queue, sync when online. This is a REAL chef requirement, not a nice-to-have. | WHOLESALE_MIGRATION_RESEARCH_2026.md §3.4 |
| **Bulk chef invitation via CSV** | CSA has individual invites | bulkInviteChefs() backend exists; admin CSV upload UI incomplete ("coming soon" placeholder). | WHOLESALE_SYSTEM_AUDIT.md |
| **Florist-specific catalog view** | Not applicable | customer_type='florist'. Flower-only catalog filter. Stem count vs. bunch pricing. | WHOLESALE_MIGRATION_PLAN_2026.md Day 20 |
| **Multi-day delivery options** | CSA delivers to fixed stop schedule | Chefs choose Tuesday or Thursday delivery at cart. Per WHOLESALE_MEETING_BRIEF.md best practices: avoid 11am–2pm and 5–10pm service windows. | chef-order.html lines 860–881 |
| **Delivery tracking visible to chefs** | CSA Day 9 spec — same widget | Chef portal needs: "your order is on the way" with status pill, driver name, estimated arrival. Same Supabase Realtime architecture as CSA. | WHOLESALE_MIGRATION_PLAN_2026.md Day 18 |
| **Order history + quick reorder** | Not applicable | 12+ months of order history. One-click reorder from any past order. Sysco offers 14 months — match it. chef-order.html has "Quick Reorder" tab already. | WHOLESALE_SYSTEM_AUDIT.md, WHOLESALE_INDUSTRY_RESEARCH.md |
| **Admin chef management** | Admin sees CSA members | Separate admin surface: approve/reject chefs, set pricing tier, suspend, view all orders, run reports. chef-approve.html + wholesale.html admin tab in old system. | WHOLESALE_SYSTEM_AUDIT.md |
| **Server-side price validation** | P0 bug in old system | CRITICAL BUG in old system: submitWholesaleOrder() trusts client-submitted price (a chef can set price to $0.01 in DevTools). New build MUST do server-side price lookup by cropId. | CSA_WHOLESALE_FULL_AUDIT_2026-03-14.md P0-1 |

---

## 4. WHAT MAKES IT GREAT — Differentiators and Ammunition

**Sources:** WHOLESALE_INDUSTRY_RESEARCH.md, WHOLESALE_IMPROVEMENT_ROADMAP.md, PITTSBURGH_FLOWER_CHEF_MARKET_RESEARCH.md, WHOLESALE_MEETING_BRIEF.md

### What the Industry Does Badly (Verified Gap Analysis)

| Competitor/Platform | What They Do Poorly | Tiny Seed Opportunity |
|---|---|---|
| **Local Line** ($99/mo) | No offline ordering. No real-time delivery tracking. No standing orders. | Tiny Seed ships with all three — at zero SaaS cost. |
| **Barn2Door** ($59–249/mo) | Route optimization via third-party (Routific). No standing orders. No delivery tracking to buyer. | Tiny Seed's driver app + Supabase Realtime = native, first-class. |
| **BlueCart** | Standing orders and delivery tracking exist but it's a generic B2B marketplace — zero farm personality, zero story. | Tiny Seed's portal is from the farm. Chefs know whose fields their food came from. |
| **Sysco Shop** | Offline ordering and 14-month history are great — but it's a commodity box. Chefs can't talk to a farmer. | Tiny Seed can offer what Sysco never can: "this arugula was harvested yesterday by Todd." |
| **Broadline distributors generally** | Cold chain → 7–14 days from harvest. Inconsistent quality. Chefs can't know what's actually in season. | Tiny Seed: harvested this week, labeled by field, chefs get actual harvest data. |
| **Other small farms in Pittsburgh** | No digital ordering (still phone/text). No availability lists (chefs don't know what's ready until they call). No delivery tracking. Payments via Venmo or cash. | Tiny Seed can operate like a small Sysco: professional portal, automated invoices, SMS confirmations, real-time ETA. |

### The Five Features That Set Tiny Seed Apart
Synthesized from all research docs — these are the non-negotiables for a great portal:

**1. Accurate, Real-Time Availability (the #1 reason chefs hate small farms)**
Chefs order from a farm, item shows "in stock," delivery arrives without it. That's a blacklisting event. The old system had getRealtimeAvailability() connected to REF_Crops. The new system must connect to actual harvest data in Supabase. If 0 is in stock, chefs see 0. No flattering estimates. Per WHOLESALE_MEETING_BRIEF.md: "Never surprise a chef with missing items. Communicate early if there's a supply issue." The portal enforces this automatically when availability is real.

**2. 60-Second Reorder (frictionless repeat business)**
Chefs are busy. Most of their Tiny Seed orders are predictable: same products, similar quantities, weekly rhythm. The new portal should show "Reorder last week's order" as the first action on login. One tap to pre-fill the cart with last week's items. Standing orders handle the fully recurring case; quick reorder handles the "same-ish as last time" case. WHOLESALE_INDUSTRY_RESEARCH.md (Sysco lesson): "Fast repeat purchases: save settings for quick reorders." The old chef-order.html had a Quick Reorder tab but it was not prominently surfaced.

**3. Delivery Transparency (enterprise-level UX at farm scale)**
Every chef call that says "where's my order?" is wasted time for Todd and friction for the chef. The driver app (already built, rebuilt in Astro during Days 15–17) writes stop-level status to delivery_stops in Postgres. Supabase Realtime pushes that to the chef portal without a refresh. Chef sees: "Packed → Out for delivery → Next stop: your restaurant, est 10:15 AM → Delivered ✓ 10:12 AM." This is Sysco's delivery app feature at farm scale. No Pittsburgh farm competitor offers this. (WHOLESALE_IMPROVEMENT_ROADMAP.md: "Delivery tracking visible to chefs: Enterprise-level customer experience.")

**4. Proactive Availability List + Notify Me (sell what you grew)**
Send chefs a Monday availability list from the portal — automated, not a Todd task. Let chefs who want a specific item click "Notify Me." When that item is harvested and entered, they get an SMS/email. This flips the dynamic: instead of chefs going to Sysco when Tiny Seed is out of something, they wait for the alert. getChefsInterestedIn() backend already exists. Notify Me button already in old chef-order.html. Just needs wiring.

**5. Auto-Invoicing to QuickBooks (the admin time killer)**
Today, every wholesale order requires Todd or someone to manually create a QB invoice. The createInvoiceFromOrder() function exists and works. It just isn't called when a wholesale order is submitted. Wiring this single call eliminates an entire category of admin work and cuts time-to-invoice from days to seconds. Chefs with Net-30 terms get an invoice automatically. QB AR aging reports populate correctly. This is the single highest ROI connection in the entire build per WHOLESALE_IMPROVEMENT_ROADMAP.md (2–4 hours effort, massive ongoing time savings).

### The Story Angle (Not a Feature, But Differentiating)
Per PITTSBURGH_FLOWER_CHEF_MARKET_RESEARCH.md and WHOLESALE_MEETING_BRIEF.md: Chefs are not buying commodities — they're buying a story to put on their menu. "Tiny Seed Farm, Rochester PA" on the menu card is marketing for both parties. Nik Forsberg of Fet Fisk (James Beard finalist 2025, Bon Appetit Best New Restaurants 2025) literally worked at Tiny Seed Farm. APTEKA (JB finalist 2023) is two blocks from Fet Fisk. Both are on the same delivery cluster. The portal should surface the farm story — not with gimmicks, but with accurate harvest dates, field identifiers, and a personal tone. This is what Sysco and Local Line can never do.

### Tiny Seed's Unique Technical Advantages (vs. Farm-Scale Competitors)
Per WHOLESALE_IMPROVEMENT_ROADMAP.md competitive analysis:
- **Zone profitability analysis** built in IntelligentRoutingDashboard.html — most farm platforms don't have this at all
- **Churn risk detection** (getChurnRiskAnalysis() endpoint) — enterprise-level feature at farm scale
- **Year-round mushrooms** — no other Pittsburgh farm can offer this; chefs who want Oyster or Lion's Mane year-round have to go to a distributor otherwise
- **USDA Certified Organic edible flowers** — Cherry Valley Organics is the only other Pittsburgh-area certified organic flower grower, and they focus on dried products/teas, not fresh-to-restaurant supply

---

## 5. APPROVED DECISIONS AND PHASING

**Source:** WHOLESALE_MIGRATION_PLAN_2026.md (approved 2026-05-08 by Todd)

### Locked Scope

**Permanently dropped:**
- Catch weight support (farm produce is unit-priced — case, bunch, head)
- AI-powered reorder suggestions (6 chefs = no ML signal; revisit at >50 chefs)
- Multi-language UI
- Image-based ordering

**In Phase 1 (build now):**
- Auto-invoice generation wired to order submit (Day 8–9)
- SMS order confirmations (Day 10–11)
- Delivery tracking visible to chefs (Day 18)
- Minimum order validation — UI + backend (Day 5)
- Offline-first chef PWA — service worker + IndexedDB (Day 19)
- Bulk CSV chef invitations — admin UI (Day 13)
- Product availability "notify me" — email + SMS triggers (Day 14)
- Florist-specific features — customer_type + catalog filter + stem pricing (Day 20)
- Standing orders — create/pause/resume/cancel/auto-process (Day 12)
- Driver app rebuild in Astro PWA (Days 15–17)

**Deferred to Phase 2:**
- Routing dashboard rebuild (stays on Apps Script; admin-only)
- Florist supplier integrations (Mayesh etc.)
- QuickBooks-to-Stripe migration

### 21-Day Execution Timeline

| Day | Date (from ~5/22 start) | Deliverable |
|---|---|---|
| 1 | ~5/22 | 14 SQL migrations: tables, RLS, indexes, audit triggers |
| 2 | 5/23 | Import: WHOLESALE_CUSTOMERS, SALES_Orders (wholesale), SALES_DeliveryStops, SALES_Drivers, QB_Customers, QB_Invoices |
| 3 | 5/24 | Verify counts, FK integrity, dry-run reconciliation |
| 4 | 5/25 | Chef portal auth: magic link via Resend. Chef-specific onboarding (separate from CSA). |
| 5 | 5/26 | Chef portal: browse catalog, price tier display, add to cart, minimum order validation |
| 6 | 5/27 | Chef portal: order submit → wholesale_orders + wholesale_order_items. Idempotency. Confirmation email. |
| 7 | 5/28 | Chef portal: order history list + detail + reorder button |
| 8 | 5/29 | QuickBooks: order submit → auto QB invoice via createInvoiceFromOrder() |
| 9 | 5/30 | QB dashboard: port quickbooks-dashboard.html to Astro /admin/quickbooks |
| 10 | 5/31 | SMS order confirmations via Twilio (proper A2P 10DLC). Log to notification_log. |
| 11 | 6/1 | Wholesale admin: manage chefs (approve/suspend/tier), view all orders, reports |
| 12 | 6/2 | Standing orders: recurring setup, auto-process logic |
| 13 | 6/3 | Bulk chef invitations: CSV upload in admin → magic-link batch |
| 14 | 6/4 | "Notify me" subscriptions: watch product, trigger email+SMS when in stock |
| 15 | 6/5 | Driver auth: PIN-based, GPS-verified clock in/out |
| 16 | 6/6 | Driver app: stop list, navigate, mark delivered, photo capture, signature |
| 17 | 6/7 | Driver app: offline (IndexedDB queue), Supabase Realtime sync → ALSO activates CSA DeliveryTracker widget (which has been inert since 5/10 because Apps Script getDeliveryHistory isn't whitelisted) |
| 18 | 6/8 | Chef delivery tracking: same Realtime widget, status pill, driver name, ETA |
| 19 | 6/9 | Offline-first chef PWA: service worker + product catalog cache |
| 20 | 6/10 | Florist features: customer_type='florist', flower-only filter, stem count pricing |
| 21 | 6/11 | Soft launch: 2–3 friendly chefs, run flow, fix bugs, announce, redirect old wholesale.html/chef-order.html |

### 14-Table Schema (New Postgres Tables)

```
chef_accounts                 -- Auth + onboarding (separate auth surface from CSA members)
wholesale_pricing_tiers       -- Standard/Premium/VIP price lists
wholesale_products            -- Product catalog (price tier × product matrix)
wholesale_product_availability -- Real-time inventory linked to harvest data
wholesale_orders              -- Replaces SALES_Orders for wholesale channel
wholesale_order_items         -- Line items (replaces empty SALES_OrderItems)
wholesale_standing_orders     -- Recurring orders (e.g., "Tuesday: 5 cases romaine")
wholesale_substitution_rules  -- Per-chef product substitution preferences
delivery_routes               -- Daily/weekly route plans
delivery_stops                -- Stop-level status (GPS, photo, timestamp)
delivery_proofs               -- Photo + signature URLs (Supabase Storage backed)
drivers                       -- Driver auth (PIN), employment data
driver_clock_events           -- Time clock log (reused for employee migration)
delivery_tracking_pings       -- Real-time GPS pings, 30-day retention
qb_sync_log                   -- QuickBooks sync attempts + outcomes
notify_me_subscriptions       -- Members watching for product availability
roles / user_roles            -- Generic role tables (seeds employee migration)
```

Reused from CSA migration: customers (extended with customer_type='wholesale'), notification_log, audit_log.

### Cost
Wholesale adds ~$10–25/mo above CSA's existing ~$45/mo infrastructure (Supabase, Vercel, Resend already paid):
- Twilio SMS: ~$5–15/mo (order confirmations + ETAs at chef volume)
- Cloudflare Storage (delivery photos): $0–5/mo (free 10GB tier)
- QuickBooks API: free

---

## 6. ALREADY BUILT vs. TO BUILD

**Sources:** WHOLESALE_MIGRATION_RESEARCH_2026.md §2.1, WHOLESALE_SYSTEM_AUDIT.md, WHOLESALE_IMPROVEMENT_ROADMAP.md

### Reusable From CSA Migration (Supabase/Astro)
| Asset | What It Does | Reuse in Wholesale |
|---|---|---|
| delivery_routes table | CSA route plans | Same table; wholesale stops added alongside CSA |
| delivery_stops table | Per-stop GPS/photo/status | Same table; stop_type='wholesale' column |
| DeliveryTracker widget (CSA Day 9) | Realtime status card for members | Identical widget for chef portal (Day 18) |
| Driver screen (CSA delivery) | Stop list, mark delivered, photo | Extend for wholesale stops (same screen, different stop_type) |
| notification_log | email/SMS log | Same table, channel='sms'|'email' |
| audit_log | All mutations | Same table |
| customers table | CSA members | Extended: customer_type='wholesale' |
| Magic link auth via Resend | CSA member login | Chef login = same pattern (separate email template) |
| Twilio infrastructure | SMS for CSA | Same credentials for wholesale SMS |

### Old Apps Script Assets (Extract Logic, Don't Port Files)
| Old File/Function | What Works | What's Broken/Risky |
|---|---|---|
| chef-order.html (2,397 lines) | UI patterns: 5 tabs, filter pills, cart drawer, delivery options, standing orders tab, Quick Reorder tab, account tab | P0 bug: client-submitted price trusted. No offline sync. No server-side price lookup. |
| wholesale.html (2,799 lines) | UI patterns: product grid, admin chef management, order history, standing orders CRUD | Delivery schedule hardcoded (conflicts with api-config.js). Admin auth is client-side only. Session no server re-validation. |
| chef-approve.html (763 lines) | Approval workflow: stats cards, pending list, pricing tier selector | Clean; port the UX pattern |
| admin-wholesale.html | Monday overview: pending approvals, standing orders, availability, communications | Clean admin command center pattern; port to Astro |
| driver.html (5,414 lines) | Full-featured driver PWA: PIN auth, clock in/out with GPS, stop-by-stop, photo, signature, offline indicator, Google Maps, call/text customer | Too big to keep on Apps Script. Must rebuild in Astro PWA during Days 15–17. This is its own 5-day sub-project. |
| submitWholesaleOrder() line 36551 | Order creation logic | Trusts client price (P0). Missing createInvoiceFromOrder() call. Missing LockService. |
| createStandingOrder() line 36738 | Full standing order CRUD logic | Port the logic, not the code |
| createInvoiceFromOrder() line 15816 | QB invoice creation — works | Just needs to be called from order submit |
| ChefCommunications.js | Email templates, invitation flow | Port email template logic |
| IntelligentRoutingDashboard.html (707 lines, apps_script/) | Routing command center: Leaflet map, zone profitability, churn risk, demand forecast, "THE BRAIN" | KEEP on Apps Script for now (Phase 2 rebuild per approved plan). Admin-only. |

### Net-New Builds (No Prior Analog)
- wholesale_substitution_rules table + admin UI (never existed)
- Florist catalog filter + stem count pricing (never existed)
- Notify me subscription backend (button existed; backend half-built)
- Offline-first PWA service worker for chef portal (IndexedDB scaffolding existed in api-config.js but not connected)
- Proper A2P 10DLC SMS (Twilio existed but never fully worked)
- Server-side price lookup on every order (critical security fix + trust-client-price removal)

---

## 7. OPEN QUESTIONS AND DECISIONS STILL NEEDED

**Source:** WHOLESALE_MIGRATION_PLAN_2026.md §6, plus gaps identified in this synthesis

These are not resolved in any of the research documents. Todd must decide before or during Day 1:

| # | Question | Why It Matters | Default If Todd Silent |
|---|---|---|---|
| 1 | **Is wholesale delivery Wednesday (with CSA), or still Tuesday/Thursday?** | The CSA migration spec says Wednesday CSA. Old wholesale system said Tuesday+Thursday. Combined truck = one driver day. Split = more complexity. This affects delivery_stops schema design on Day 1. | Ask Todd. No safe default. |
| 2 | **Which 2–3 chefs for Day 21 soft launch?** | Need to be relationships Todd trusts and who will give honest feedback. Fet Fisk is the obvious first. | Todd + PM pick together. |
| 3 | **Chef subdomain: chefs.tinyseedfarm.com vs. csa.tinyseedfarm.com/wholesale?** | Clean separation = separate auth surface, separate branding. Subdomain recommended. | Subdomain per approved plan. |
| 4 | **Driver app subdomain: drivers.tinyseedfarm.com?** | Drivers shouldn't accidentally see member portal. | Subdomain per approved plan. |
| 5 | **Shopify wholesale orders: migrate or keep Shopify as billing?** | Shopify = real billing now. Keep Shopify, sync orders into wholesale_orders for visibility? Or cut Shopify for wholesale? | Keep Shopify per approved plan; sync into our table. |
| 6 | **What are the actual per-account minimum order amounts?** | Can't build minimum order validation without real numbers. | Unknown — data missing from WHOLESALE_CUSTOMERS. |
| 7 | **Are there established substitution preferences per chef?** | wholesale_substitution_rules is in the schema but there's no source data. Does Todd know chef-by-chef preferences? | Start empty; let chefs set in their account settings. |
| 8 | **Florist accounts: is GPFC membership ($150/year) planned for 2026?** | Joining the Greater Pittsburgh Flower Collective opens the wholesale florist channel (13+ local florists). | No default — needs Todd decision. |
| 9 | **Black Radish Kitchen: catering delivery patterns?** | WHOLESALE_ACCOUNTS.md flags this. Catering companies order differently (larger batches, less frequent, event-driven). Does the portal need to handle event-based orders? | Treat as regular account for now; capture notes in delivery_instructions. |
| 10 | **Are existing wholesale chefs currently on the Apps Script magic link system?** | If yes, dual-auth window needed (14 days both portals work) per migration plan risk register. | Yes, dual-auth window required. |
| 11 | **Edible flower chef program launch timing?** | PITTSBURGH_FLOWER_CHEF_MARKET_RESEARCH.md recommends targeting Fet Fisk, APTEKA, Altius, Lilith for edible flowers specifically. Is this a 2026 season priority? | Assume yes based on florist feature being in Phase 1 scope. |
| 12 | **Security fixes: when?** | CSA_WHOLESALE_FULL_AUDIT_2026-03-14.md identified 3 P0 bugs in old system (price manipulation, GET-based state change, no auth on order endpoints). New build should be clean by default — confirm with builder that server-side price lookup and proper auth are in the Day 5–6 implementation, not an afterthought. | Fix in new build by design. |

---

## Sources

- `/Users/samanthapollack/Documents/TIny_Seed_OS/docs/WHOLESALE_MIGRATION_PLAN_2026.md` — Approved plan (2026-05-08)
- `/Users/samanthapollack/Documents/TIny_Seed_OS/docs/WHOLESALE_MIGRATION_RESEARCH_2026.md` — Research (2026-05-08)
- `/Users/samanthapollack/Documents/TIny_Seed_OS/docs/WHOLESALE_INDUSTRY_RESEARCH.md` — Competitor/industry research (2026-02-12)
- `/Users/samanthapollack/Documents/TIny_Seed_OS/docs/WHOLESALE_IMPROVEMENT_ROADMAP.md` — Feature gap analysis (2026-02-12)
- `/Users/samanthapollack/Documents/TIny_Seed_OS/docs/WHOLESALE_SYSTEM_AUDIT.md` — System audit (2026-02-12)
- `/Users/samanthapollack/Documents/TIny_Seed_OS/docs/audits/CSA_WHOLESALE_FULL_AUDIT_2026-03-14.md` — Security + code quality audit (2026-03-14)
- `/Users/samanthapollack/Documents/TIny_Seed_OS/claude_sessions/route_delivery/reference_data/WHOLESALE_ACCOUNTS.md` — Real restaurant list (2026-01-16)
- `/Users/samanthapollack/Documents/TIny_Seed_OS/claude_sessions/field_operations/WHOLESALE_MEETING_BRIEF.md` — Product catalog + best practices (2026-01-22)
- `/Users/samanthapollack/Documents/TIny_Seed_OS/shared_research/flower_market_2026/PITTSBURGH_FLOWER_CHEF_MARKET_RESEARCH.md` — Flower/chef market research (2026-03-01)
- `/Users/samanthapollack/Documents/TIny_Seed_OS/docs/specs/DAY9_CSA_DELIVERY_TRACKING_SPEC.md` — CSA delivery day and driver pattern (context for wholesale alignment)
- Direct inspection: `web_app/chef-order.html`, `web_app/admin-wholesale.html`, `apps_script/ChefCommunications.js`

**Date synthesized:** 2026-06-14

---

## 8. DECISIONS LOCKED — Todd, 2026-06-14

| Decision | Locked value |
|---|---|
| **Delivery cadence** | **Wednesdays (on the CSA truck) THROUGH July 1.** After July 1: delivery days expand to **Tuesday, Wednesday, Friday.** Build the delivery-day model configurable from day one (Wed-only now → multi-day later) — no hardcoding. |
| **Invoicing** | **Net-15 via QuickBooks.** ⭐ **ONE-BUTTON INVOICE FIRES ON DELIVERY** — when the driver marks the wholesale stop *Delivered*, the QB invoice is generated AND sent at that moment (not on order submit). Net-15 clock starts at delivery. This REFINES the approved plan's "invoice-on-submit." |
| **Pricing** | **One price list to start.** Per-chef tiers (Standard/Premium/VIP) = approved future phase, design the schema to support it now (price resolved server-side per customer), enable later. |

### Implications for the build
- Invoice-on-delivery dovetails perfectly with the CSA driver screen already built (Mark Arrived → **Mark Delivered**). For a wholesale stop, "Mark Delivered" also calls `createInvoiceFromOrder` → QuickBooks. One tap = delivered + invoiced + sent.
- Delivery model: `delivery_stops.day_of_week` already supports any day; wholesale stops ride Wednesday's existing route now, multi-day after July 1.
- Pricing: server-side price lookup by (product × customer tier); tier defaults to "Standard" for everyone until tiers are turned on. This also fixes the old system's P0 bug (client could set price=$0.01).
