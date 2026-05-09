# Wholesale Migration Research — Tiny Seed Farm

**Status:** RESEARCH — pre-implementation. Todd requested deep research 2026-05-08, to execute after CSA migration completes.
**Author:** PM_ARCHITECT
**Date:** 2026-05-08 (late night)
**Builds on:** `docs/WHOLESALE_IMPROVEMENT_ROADMAP.md` (Feb 2026 — pre-platform-migration), `docs/CSA_MIGRATION_PLAN_2026.md` (the pattern this work will follow)

---

## 0. Migration Sequencing (Locked 2026-05-08 by Todd)

Whole-OS migration in priority order:

```
1. CSA              ← in progress (Days 1-6 shipped, Day 7 building)
2. Wholesale + Chef + Driver + Delivery + QuickBooks
3. Employee time clock + sign-in + hours
4. Everything else (financial, planning, marketing, greenhouse)
```

After this doc: same Research → Plan (await approval) → Execute pattern as CSA.

---

## 1. Strategic Question: Is the Feb-2026 Roadmap Still Relevant?

**Answer: Yes — with a critical re-framing.**

The Feb 2026 `WHOLESALE_IMPROVEMENT_ROADMAP.md` (Claude Opus 4.5) found that **85%+ of industry-recommended wholesale features are already built but not connected**. Its Phase 1-4 plan was about *integration*, not new builds.

That entire framing assumed Apps Script + Sheets stayed the runtime. Now we're migrating off that runtime. So the roadmap remains the **menu of features we want preserved + integrated**, but the migration provides the *opportunity* to:

1. **Preserve the feature inventory** during the platform move (don't lose anything documented in the roadmap)
2. **Wire up the integrations the roadmap flagged as missing** (invoice auto-gen, SMS confirmations, delivery tracking on the chef portal, minimum order validation) — but do it in the new Postgres/Astro stack instead of Apps Script
3. **Do NOT rebuild the existing routing intelligence + driver app** unless it's broken — they're documented as complete and working

This is the parallel of how CSA migration approached the Feb 2026 `CSA_IMPROVEMENT_ROADMAP.md`: dropped the AI box customization moat (overengineered for single-farm scale), kept recipes + auto-optimize (real value).

**For wholesale, the parallel "drop" question is:** are there roadmap items that look fancy but don't justify their complexity for a single-farm wholesale operation?

Tentative drops (need Todd's approval):
- ❌ Catch weight support (Phase 4) — only useful if Tiny Seed sells variable-weight products to chefs (e.g., whole fish, large cuts of meat). Farm produce is largely unit-priced (case, bunch, head). Skip unless explicitly needed.
- ❌ AI-powered reorder suggestions (Phase 4) — same single-farm critique as CSA's AI moat. With ~3 active wholesale customers today, ML has nothing to learn from. Defer until customer count >50.
- ❌ Multi-language UI (Phase 3) — not needed for current customer base.
- ❌ Image-based ordering (Phase 3) — gimmick at our scale.

**Tentative keeps:**
- ✅ Invoice auto-generation on order submission (Phase 1 — Trivial integration win)
- ✅ SMS order confirmations (Phase 1)
- ✅ Delivery tracking visible to chefs (Phase 2 — uses existing driver app data)
- ✅ Minimum order validation (Phase 1)
- ✅ Offline-first chef PWA (Phase 2 — chefs order from busy kitchens with bad WiFi)
- ✅ Bulk CSV chef invitations (Phase 2)
- ✅ Product availability "notify me" (Phase 2)
- ✅ Florist-specific features (Phase 3 — flower wholesale is a real revenue line per CSA memory)

---

## 2. Inventory: What Exists Today (Verified, Not Assumed)

### 2.1 Frontend files (verified via `wc -l`)

| File | Size | Lines | Purpose |
|---|---|---|---|
| `web_app/wholesale.html` | 119 KB | 2,799 | Main buyer/admin portal (manage chefs, view orders, etc.) |
| `web_app/chef-order.html` | 88 KB | 2,397 | Mobile-first chef ordering PWA |
| `web_app/chef-register.html` | 44 KB | 1,176 | Chef registration completion form |
| `web_app/chef-approve.html` | 27 KB | 763 | Admin approval dashboard |
| `web_app/driver.html` | 199 KB | **5,414** | Driver mobile app — biggest single page in the OS |
| `web_app/quickbooks-dashboard.html` | 50 KB | 1,433 | QuickBooks integration UI |
| `apps_script/IntelligentRoutingDashboard.html` | 30 KB | 707 | Routing command center (admin-only) |
| **Total** | **557 KB** | **14,689 lines** | |

**Comparison to CSA:** wholesale frontend is 1.8× the size (CSA was ~308 KB / 8,277 lines for csa.html + customer.html). `driver.html` alone is bigger than the entire CSA portal.

### 2.2 Backend functions (verified via `grep` against `MERGED TOTAL.js`)

| Domain | References found | Examples |
|---|---|---|
| Wholesale | 20 | `submitWholesaleOrder`, `getWholesaleProducts`, `getWholesaleCustomers`, `getWholesaleDeliveryStatus`, `getWholesaleOrders` |
| Chef | 43 | `getChefProfile`, `getChefOrderHistory`, `getChefRecommendations`, `sendChefMagicLink`, `approveChef`, `bulkInviteChefs`, `updateChefPreferences` |
| Driver | 6 | `driverClockIn`, `driverClockOut`, `getDeliveryDrivers`, `updateDriverLocation` |
| Delivery | 55 | `getDeliveryRoutes`, `getDeliveryHistory`, `updateDeliveryStopStatus`, `updateDeliveryETA`, `sendDeliveryNotification`, `sendDeliveryComplete`, `sendDeliverySMS`, `createDeliveryRoute` |
| Route | 15 | `optimizeRoutesAdvanced`, `getIntelligentDashboard`, `getRouteForDeliveries`, `getRouteEfficiencyMetrics`, `sendRouteStartNotifications` |
| QuickBooks | 20 | `getQuickBooksAuthUrl`, `createInvoiceFromOrder`, `getQuickBooksDashboard`, `syncShopifyOrderToQuickBooks`, `getQBOpenInvoices` |
| Invoice | 4 | `createInvoice`, `createQuickBooksInvoice` |
| **Total** | **~163 references** | |

**Estimated backend code:** ~3,500-4,500 lines of business logic (will need full audit during migration to confirm). For comparison, CSA backend was ~2,400 lines.

### 2.3 Database tables (verified via Sheets API)

| Sheet | Cols | Real data rows | Purpose |
|---|---|---|---|
| `WHOLESALE_CUSTOMERS` | 31 | **3** | Wholesale buyer accounts (chefs, retailers) — small, nascent program |
| `SALES_Customers` | 19 | 527 | Master customer table (CSA + wholesale + retail) |
| `SALES_Orders` | 20 | **1,504** | All orders across all channels (CSA + wholesale + market) |
| `SALES_OrderItems` | 10 | 0 | **Empty** — likely deprecated or never populated |
| `ORDER_HISTORY` | 42 | TBD | Analytics-style denormalized history table |
| `ORDER_ANALYTICS` | 1 | — | Just a header row — looks like an unused stub |
| `INVENTORY_PRODUCTS` | 20 | TBD | Product catalog (some overlap with Shopify_Products) |
| `SALES_DeliveryStops` | 20 | 4 | Per-stop delivery records with GPS |
| `SALES_Drivers` | 12 | TBD | Driver accounts (PIN auth) |
| `SALES_DeliveryProofs` | 26 | TBD | Photo + signature proofs |
| `DELIVERY_TRACKING` | 13 | TBD | Real-time route position |
| `DELIVERY_DECISIONS` | 7 | TBD | Pre-delivery routing decisions |
| `QB_Customers` | 11 | TBD | QuickBooks customer mirror |
| `QB_Invoices` | 14 | TBD | QuickBooks invoice mirror |

**Critical finding:** `WHOLESALE_CUSTOMERS` has only **3 actual data rows**. Wholesale is either:
- (a) A new program with very few customers yet
- (b) The real wholesale customers live in `SALES_Customers WHERE Customer_Type = 'wholesale'` — and `WHOLESALE_CUSTOMERS` is a duplicate/legacy table

Per the migration audit earlier, `SALES_Customers` has **6 customers** with `customer_type='wholesale'`. So combined wholesale customer count is roughly 6-9 today. **Wholesale is small.** This dramatically changes the migration risk profile vs CSA.

### 2.4 Integration touchpoints

| Integration | Status | Importance |
|---|---|---|
| **Shopify** | ✅ Active — wholesale products synced via `SHOPIFY_Products`, orders flow webhook → Apps Script | Critical |
| **QuickBooks** | ✅ Connected via OAuth — invoice generation, customer sync, payment status | Critical for billing |
| **Twilio SMS** | ⚠️ Backend ready, partially connected — used for some delivery notifications, not order confirmations | Important |
| **Google Maps** | ✅ Used by `optimizeRoutesAdvanced` — route optimization with zone-based fallback | Important |
| **Driver GPS** | ✅ Active — clock in/out, real-time position via `DELIVERY_TRACKING` | Critical for driver workflow |

---

## 3. Wholesale-Specific Architecture Notes

### 3.1 The Driver App is its Own Platform

`driver.html` (5,414 lines) is genuinely enterprise-grade software:
- PIN-based auth (separate from member magic link)
- Clock in/out with GPS verification
- Stop-by-stop delivery list
- Photo + signature proof of delivery
- Issue reporting
- Real-time status updates
- Offline indicator
- Delivery history tab
- Call/text customer buttons
- Open in Google Maps integration

Migrating this is **not** the same as migrating CSA. It's a separate workstream within "wholesale migration." Realistically a 5-day project on its own (auth + GPS + photo upload + offline state — substantial complexity).

**Recommendation:** Treat driver app as its own deliverable inside wholesale migration. Not Day 1 work — defer to mid/late wholesale migration after the chef-facing portal is live.

### 3.2 The Routing Dashboard is Admin-Only

`IntelligentRoutingDashboard.html` lives in `apps_script/` (server-rendered HTML template), not `web_app/` — so it's already Apps Script-coupled. To migrate:
- Re-implement as Astro admin pages under `/admin/routing/*`
- Rebuild the Leaflet map + zone profitability charts using the same data sources (now Postgres queries instead of Sheets queries)
- Recreate the "Brain" recommendations logic in TypeScript

This is meaningful work — ~3-4 days of dedicated build. Alternatively: defer entirely to Phase 2, keep Apps Script routing dashboard alive read-only until then. Routing is admin-side; only Todd uses it.

### 3.3 QuickBooks is the Real Win

Connecting wholesale orders → QuickBooks invoices automatically (Phase 1 of the Feb roadmap) is **already coded**. The `createInvoiceFromOrder()` function exists. It just isn't called from `submitWholesaleOrder()`.

Two paths in the migration:
- **(a)** Port the existing Apps Script call into the new Astro `/api/wholesale/orders` endpoint — short, simple, days 1-2
- **(b)** Refactor QuickBooks integration to live in a Supabase Edge Function (more reliable, runs even if Vercel is down) — adds complexity but cleaner long-term

Recommend **(a)** for now, refactor to Edge Function later if needed.

### 3.4 The Chef PWA Has Offline Aspirations

`chef-order.html` already has offline scaffolding (`api-config.js` has IndexedDB structure starting at line 858+). The Feb roadmap flagged this as Phase 2 work.

For migration:
- Astro 6 can do PWAs via `@vite-pwa/astro` plugin
- Service worker caches the product catalog, queues offline orders, syncs when back online
- This is a **real chef requirement** — chefs order from kitchens at 5 AM with terrible WiFi
- Estimate: 1-2 days during wholesale migration

---

## 4. Migration Plan — High Level (Tentative)

Same architecture as CSA migration: Supabase Postgres + Astro 6 + Tailwind 4 + Vercel + Resend (+ Twilio for SMS, finally). Reuse everything we built for CSA.

### 4.1 Schema design (~10 new tables)

```
wholesale_customers       -- Maps to SALES_Customers WHERE customer_type='wholesale' + WHOLESALE_CUSTOMERS extras (loyalty_tier, payment_terms, etc.)
chef_accounts             -- Auth + onboarding state for chef users (separate from generic customers)
wholesale_products        -- Product catalog (price tiers, units, availability)
wholesale_pricing_tiers   -- Standard/Premium/VIP price lists
wholesale_orders          -- Replaces SALES_Orders for wholesale-channel orders
wholesale_order_items     -- Line items (replaces empty SALES_OrderItems)
wholesale_standing_orders -- Recurring orders (e.g., "Tuesday: 5 cases romaine")
delivery_routes           -- Replaces SALES_Routes (if exists) — daily/weekly route plans
delivery_stops            -- Replaces SALES_DeliveryStops
delivery_proofs           -- Photo + signature blobs
drivers                   -- Replaces SALES_Drivers (PIN auth, clock in/out)
driver_clock_events       -- NEW — proper time-clock log (used later for employee migration too)
qb_invoices               -- QuickBooks mirror (kept synced via webhook)
qb_customer_sync_log      -- Track QB sync status
delivery_tracking_pings   -- Real-time GPS pings during a route (high-frequency, retention 30 days)
audit_log                 -- Already exists from CSA migration; extends naturally
```

Compared to CSA's 12 tables, wholesale needs **~14 new tables** plus the 5 already migrated for CSA (customers, audit_log, notification_log are reusable).

### 4.2 Phased plan (proposed 21 days — vs CSA's 14)

Wholesale is bigger and has more integrations. Realistic estimate **3 weeks**, broken down:

| Phase | Days | Deliverable |
|---|---|---|
| 1 | 1-3 | Schema + data migration (chef accounts, products, orders, invoices) |
| 2 | 4-7 | Chef ordering portal: auth, browse catalog, place order, view history |
| 3 | 8-9 | QuickBooks integration: auto-invoice on order submit + sync to QB |
| 4 | 10-11 | SMS confirmations + minimum order validation + bulk chef invitations |
| 5 | 12-14 | Wholesale admin portal: manage chefs, approve, view orders, run reports |
| 6 | 15-17 | Driver app rebuild (PWA, PIN auth, clock in/out, GPS, proof of delivery) |
| 7 | 18 | Delivery tracking visible to chefs |
| 8 | 19 | Offline-first chef PWA |
| 9 | 20 | Routing dashboard admin tools (port from Apps Script HTML to Astro) |
| 10 | 21 | Soft launch + cutover |

### 4.3 Sequencing within wholesale

Same approach as CSA: build customer-facing portal first (chefs), admin portal second, driver app third. Rationale: chefs are the revenue source; getting them happy on the new portal is highest ROI.

### 4.4 Risks specific to wholesale (vs CSA)

| Risk | Notes |
|---|---|
| QuickBooks token rotation breaks billing | Build proper retry + reconnect flow; alert if QB OAuth expires |
| Driver app GPS drains phone battery during routes | Already handled in current driver.html (passive location, not active polling) — preserve approach |
| Photo upload bandwidth on rural delivery routes | Compress on-device before upload; queue offline if needed |
| QuickBooks invoice doesn't match the chef's preferred terms | Pre-flight check during chef onboarding: confirm payment terms (Net 30, Net 14, etc.) |
| Standing orders break when crops aren't available | Need substitution rules per chef per crop (current Apps Script may already have this — audit first) |
| Existing Apps Script chef magic links stop working at cutover | Same dual-auth window we used for CSA: 7-14 days both old and new portals work |

### 4.5 Cost (vs CSA's $0-45/mo)

Wholesale migration adds roughly **$0-15/mo** on top of CSA infrastructure:
- Supabase: same project (~441 customers + 6 wholesale = trivial)
- Twilio SMS: ~$0.01/SMS — at 6 chefs × 2 SMS/week × 52 = ~$6/year. Once standing orders ship, more like $50/year.
- QuickBooks API: free tier sufficient for our volume
- Photo storage for delivery proofs: 1KB/photo × 100 deliveries/week × 52 weeks = ~5MB/year, free Supabase Storage tier covers it
- Cloudflare KV (if we cache product catalog for offline PWA): free tier sufficient

**Wholesale doesn't move the needle on monthly cost.** It's a feature/effort cost, not infrastructure cost.

---

## 5. Employee Time Clock Migration (Preview — After Wholesale)

Per Todd's 2026-05-08 directive, after wholesale ships, the next priority is the employee time clock + sign-in.

### 5.1 What this likely means (needs deep research before execution)

Brief inventory from existing system:
- `employee.html` — 27,566 lines per `SYSTEM_INVENTORY.md` (mega-page; full crew mobile app: time clock, task queue, harvest logging, scouting, treatments, IPM, hazard reporting, weed pressure, crew messaging, GPS tracking)
- `web_app/manager-dashboard.html` — manager view of crew + tasks + time
- `web_app/employee-management.html` — admin: hire, fire, set roles, schedule
- `web_app/schedule.html` — week grid, create shifts
- `web_app/admin.html` — generic admin dashboard
- Backend functions: `clockIn`, `clockOut`, `getEmployeeTimeLogs`, `setupScheduleNotificationTriggers`, `sendWeeklyScheduleEmails`, `sendShiftReminders`, plus per-employee task management (~60-100 functions)
- Sheets: `EMPLOYEE_TIME_LOGS`, `USERS` or `EMPLOYEES`, `SHIFT_SCHEDULE`, `TASK_QUEUE`, plus harvest/treatment/IPM logs

**Estimated scope:** larger than wholesale, smaller than CSA in some dimensions, larger in others. The driver clock-in/out logic from wholesale migration (driver_clock_events table) is the seed for the broader employee time clock — nice reuse.

### 5.2 Phased plan TBD — separate doc when wholesale lands

A `EMPLOYEE_MIGRATION_RESEARCH_2026.md` will be written after wholesale ships. Estimate ~3-4 weeks.

---

## 6. Decision Points for Todd Before Wholesale Migration Begins

Same approach as CSA migration: research → plan → approval → execute. Key decisions before kicking off wholesale:

| # | Decision | My recommendation |
|---|---|---|
| 1 | Catch weight support? | **Drop** — farm produce is unit-priced |
| 2 | AI reorder suggestions (Phase 4)? | **Drop for now** — single-farm + 6 customers = no ML headroom; revisit at >50 chefs |
| 3 | Multi-language UI? | **Drop** — current customer base is English |
| 4 | Image-based ordering? | **Drop** — gimmick at our scale |
| 5 | Driver app: rebuild in Astro PWA, or keep Apps Script driver.html running indefinitely? | **Rebuild** — driver.html is critical infrastructure; should not stay on the deprecated runtime |
| 6 | Offline-first chef PWA — Phase 1 or Phase 2? | **Phase 2** — chefs really need this; flag as required, not nice-to-have |
| 7 | Routing dashboard rebuild? | **Defer to Phase 2** — admin-only, can stay in Apps Script for now |
| 8 | Florist-specific features — in scope? | **Phase 1** if flower wholesale is a real revenue line for 2026 — confirm with Todd |
| 9 | Standing orders feature — preserve? | **Yes** — chefs use this for weekly recurring orders, it's a retention driver |
| 10 | QuickBooks integration — keep current vs Stripe? | **Keep QuickBooks** — Tiny Seed's accountant uses QB, can't switch billing tools mid-flight |

---

## 7. Honest Assessment

**Wholesale migration is bigger than CSA.** Specifically:
- 1.8× the frontend lines of code
- ~2× the backend functions
- More external integrations (QuickBooks is critical, Twilio finally needs to fully work, Google Maps for routes)
- Driver app is essentially a separate project inside the project

**But:** wholesale customer count is small (~6-9 today). That makes data migration trivial and risk lower. The complexity is in *features*, not in *data*.

**Realistic timeline:** 3 weeks (vs CSA's 2 weeks). Possibly compressible to 2.5 weeks if we drop the driver app rebuild for Phase 2 and the routing dashboard rebuild entirely.

**The real value of wholesale migration isn't speed — it's plugging the integration gaps the Feb 2026 roadmap identified.** Specifically:
- Auto-invoice generation (huge admin time saver)
- SMS order confirmations (kills "where's my order" calls)
- Delivery tracking visible to chefs (enterprise-level UX)
- Minimum order validation (protects delivery economics)

These are the wins that justify the migration over just patching the existing Apps Script system.

---

## 8. Next Actions (When Todd Greenlights)

1. **Approve scope** (decisions in §6 above)
2. **Confirm wholesale starts AFTER CSA cutover** (Day 14 of CSA = end of week 2 from now)
3. **PM writes formal `WHOLESALE_MIGRATION_PLAN_2026.md`** with locked decisions, like the CSA plan
4. **Same execution discipline as CSA:** delegate to fullstack-builder, verify gates, audit before continuing

The Feb 2026 roadmap document doesn't go in the trash — it becomes the **feature inventory** that the new portal must preserve. Every Phase 1 item in that doc becomes a verification gate during the rebuild.

---

*This is a research document. No code changes. No commits to schema. Awaiting Todd's review.*
