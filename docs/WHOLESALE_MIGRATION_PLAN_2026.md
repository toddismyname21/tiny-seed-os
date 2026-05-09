# Wholesale Migration Plan 2026 — Architecture Decision Record

**Status:** APPROVED — Todd locked scope on 2026-05-08
**Author:** PM_ARCHITECT
**Builds on:** `docs/WHOLESALE_MIGRATION_RESEARCH_2026.md` (research findings) + `docs/WHOLESALE_IMPROVEMENT_ROADMAP.md` (Feb 2026 — feature inventory)
**Sequencing:** Begins after CSA migration cutover (Day 14 of CSA = ~2026-05-22). Estimated 21 days, ending ~2026-06-12.
**Stack:** Same as CSA (Supabase Postgres + Astro 6 + Tailwind 4 + Vercel + Resend + Twilio Verify + Cloudflare DNS). No re-debate.

---

## 0. Locked Scope (2026-05-08)

| Decision | Status | Rationale |
|---|---|---|
| Catch weight support | ❌ DROPPED | Farm produce is unit-priced (case, bunch, head); no variable weights to track |
| AI-powered reorder suggestions | ❌ DROPPED | Single-farm + 6 wholesale customers = no ML headroom; revisit at >50 chefs |
| Multi-language UI | ❌ DROPPED | Current customer base is English |
| Image-based ordering | ❌ DROPPED | Gimmick at our scale |
| Routing dashboard rebuild | 📅 PHASE 2 | Admin-only; Apps Script can stay until later |
| Auto-invoice generation on order submit | ✅ PHASE 1 (Days 8-9) | Existing `createInvoiceFromOrder` just needs wiring |
| SMS order confirmations | ✅ PHASE 1 (Days 10-11) | Twilio backend exists; Resend will be live by then |
| Delivery tracking visible to chefs | ✅ PHASE 1 (Day 18) | Same architecture as CSA Day 9 |
| Minimum order validation | ✅ PHASE 1 (Day 5) | UI + backend, ~2 hours |
| Offline-first chef PWA | ✅ PHASE 1 (Day 19) | Real chef requirement (5 AM kitchen WiFi) |
| Bulk CSV chef invitations | ✅ PHASE 1 (Day 13) | Existing backend, just needs UI |
| Product availability "notify me" | ✅ PHASE 1 (Day 14) | Email + SMS triggers, low effort |
| Florist-specific features | ✅ PHASE 1 (Day 16) | Confirmed flower wholesale is real revenue (Tiny Seed has flower-focused chefs/florists) |
| Standing orders | ✅ PHASE 1 (Day 12) | Existing chef workflow; preserve |
| Driver app rebuild | ✅ PHASE 1 (Days 15-17) | Critical infrastructure, can't stay on Apps Script forever |

---

## 1. Schema Design — 14 New Postgres Tables

```
-- Reuses from CSA migration:
--   customers (extended customer_type='wholesale')
--   notification_log (channel='email'|'sms', already polymorphic)
--   audit_log (already exists)

-- New for wholesale:
chef_accounts                -- Auth + onboarding state for chef users (separate auth surface from CSA members)
wholesale_pricing_tiers      -- Standard/Premium/VIP price lists (per-customer assignment)
wholesale_products           -- Product catalog (price tier × product matrix)
wholesale_product_availability -- Real-time inventory linked to harvest data
wholesale_orders             -- Replaces SALES_Orders for wholesale-channel orders
wholesale_order_items        -- Line items (replaces empty SALES_OrderItems)
wholesale_standing_orders    -- Recurring orders (e.g., "Tuesday: 5 cases romaine")
wholesale_substitution_rules -- Per-chef product substitution preferences
delivery_routes              -- Daily/weekly route plans (replaces apps_script logic)
delivery_stops               -- Stop-level status (replaces SALES_DeliveryStops)
delivery_proofs              -- Photo + signature URLs (replaces SALES_DeliveryProofs; Supabase Storage backed)
drivers                      -- Driver auth (PIN), employment data (replaces SALES_Drivers)
driver_clock_events          -- Time clock log — REUSED later for employee migration
delivery_tracking_pings      -- Real-time GPS pings during routes (high-frequency, 30-day retention)
qb_sync_log                  -- Track QuickBooks sync attempts + outcomes
notify_me_subscriptions      -- Members watching for product availability
```

Plus a shared concept worth seeding:

```
roles                        -- Generic role table (admin, staff, driver, chef, member)
user_roles                   -- Many-to-many join (a user may be both driver and admin)
```

This becomes the foundation for the **Employee migration** that follows wholesale. Drivers, kitchen staff, harvest crew all live in the same `customers + roles + user_roles + clock_events` model.

---

## 2. 21-Day Execution Plan

| Day | Date* | Phase | Deliverable |
|---|---|---|---|
| **1** | ~5/22 | Schema | 14 SQL migrations: tables, RLS policies, indexes, audit triggers |
| **2** | 5/23 | Data migration | Import: WHOLESALE_CUSTOMERS, SALES_Orders (filtered to wholesale), SALES_DeliveryStops, SALES_Drivers, QB_Customers, QB_Invoices |
| **3** | 5/24 | Data migration cont. | Verify counts, FK integrity, audit log; run dry-run reconciliation |
| **4** | 5/25 | Chef portal: auth | Magic link via Resend (already wired from CSA Day 11). Chef-specific onboarding flow (separate from CSA member onboarding) |
| **5** | 5/26 | Chef portal: catalog + cart | Browse products by category, see price tier, add to cart, **minimum order validation** |
| **6** | 5/27 | Chef portal: order submit | POST submits to `wholesale_orders` + `wholesale_order_items`. Idempotency. Order confirmation email. |
| **7** | 5/28 | Chef portal: order history | List + detail views. Reorder button. Invoice link (placeholder until QB wired) |
| **8** | 5/29 | QuickBooks integration | Wholesale order submit → automatic QB invoice creation via existing `createInvoiceFromOrder`. Sync to `qb_invoices`. |
| **9** | 5/30 | QuickBooks dashboard | Port `quickbooks-dashboard.html` admin view to Astro `/admin/quickbooks` |
| **10** | 5/31 | SMS order confirmations | Use Twilio Verify infrastructure for proper A2P 10DLC compliant SMS via API. Webhook to `notification_log`. |
| **11** | 6/1 | Wholesale admin: chef management | Manage chefs (approve, suspend, edit pricing tier), view all orders, run reports |
| **12** | 6/2 | Standing orders | Recurring order setup (every Tuesday, every other Friday, etc.). Auto-process logic. |
| **13** | 6/3 | Bulk chef invitations | CSV upload UI in admin → send magic-link invitations |
| **14** | 6/4 | Product availability "notify me" | Subscribe to product, trigger email/SMS when back in stock |
| **15** | 6/5 | Driver auth + clock in/out | PIN-based auth (separate from member magic link). GPS-verified clock in/out. |
| **16** | 6/6 | Driver app: route + stops | Stop list, navigate, mark delivered, photo capture, signature capture |
| **17** | 6/7 | Driver app: offline + status updates | IndexedDB queue for offline mutations; sync when online. Real-time `delivery_stops` updates trigger Supabase Realtime → chef portal sees live status |
| **18** | 6/8 | Chef delivery tracking | Same widget pattern as CSA Day 9 — chefs see "your order is on the way" with status pill, driver name, ETA |
| **19** | 6/9 | Offline-first chef PWA | Service worker, IndexedDB product catalog cache, offline order queue |
| **20** | 6/10 | Florist-specific features | Florist customer type, flower-only catalog filter, stem count vs bunch pricing |
| **21** | 6/11 | Soft launch + cutover | Pick 2-3 friendly chef testers, run flow, fix bugs, send announcement, redirect old wholesale.html / chef-order.html |

\* Dates assume CSA cutover lands 5/22 as planned. Slip CSA → slip wholesale.

---

## 3. Phasing Decisions (What's NOT in This Plan)

| Item | Where it goes |
|---|---|
| Routing dashboard (`IntelligentRoutingDashboard.html`) rebuild | Phase 2 — kept on Apps Script through 2026 |
| Catch weight support | Permanently dropped |
| AI reorder suggestions | Revisit when chef count > 50 |
| Image-based ordering, multi-language | Permanently dropped |
| Florist supplier integrations (Mayesh, etc.) | Phase 2+ |
| QuickBooks-to-Stripe migration | Defer — accountant uses QB |
| Recipe integration for chefs | Out of scope (CSA-side feature) |

---

## 4. Risk Register

| Risk | Severity | Mitigation |
|---|---|---|
| QuickBooks token expires mid-migration | High | Build proper OAuth refresh flow (Day 8); alert if QB OAuth expires |
| Driver app GPS battery drain | Medium | Match current Apps Script's passive location strategy (event-driven, not polling) |
| Standing orders break when crops aren't available | Medium | Substitution rules table (Day 12); fallback to skip-and-credit |
| Existing Apps Script chef magic links stop working at cutover | Medium | Dual-auth window: 14 days both old and new portals work |
| Existing wholesale customers in SALES_Customers don't have `customer_type='wholesale'` set correctly | Medium | Audit + remap during data migration (Day 2) |
| Real customers' QB IDs don't match between SALES_Customers and QB_Customers | High | Data reconciliation script (Day 3) — match by email |
| Photos large, slow upload on rural delivery routes | Medium | Compress on-device before upload; queue offline; max 1MB/photo |
| Driver app rebuild lengthens timeline | High | Days 15-17 are dedicated; if it slips, Phase 2 those features |

---

## 5. Cost Projection

| Service | Wholesale-only adder | Notes |
|---|---|---|
| Supabase | $0 | Existing project handles 6-50 chefs trivially |
| Vercel | $0 | Existing project hosts wholesale + CSA + driver app |
| Resend | $0-5/mo | Order confirmations + delivery notifications add ~50 emails/day at scale |
| Twilio SMS | $5-15/mo | Order confirmations + delivery ETA SMS at chef volume |
| QuickBooks API | $0 | Existing connection |
| Cloudflare Storage (for delivery photos) | $0-5/mo | Free 10GB, photos stored here vs Supabase Storage |
| **Total** | **~$10-25/mo above CSA's $45/mo** | |

---

## 6. Decisions Required Before Day 1 of Wholesale (after CSA cutover)

| # | Decision | Default if silent |
|---|---|---|
| 1 | Confirm wholesale starts day after CSA cutover (no buffer)? | YES, start immediately |
| 2 | Chef-specific subdomain `chefs.tinyseedfarm.com`, or part of `csa.tinyseedfarm.com/wholesale`? | **Subdomain** — clean separation, separate auth surface |
| 3 | Driver app URL: `drivers.tinyseedfarm.com` or `csa.tinyseedfarm.com/driver`? | **Subdomain** — drivers shouldn't accidentally browse member portal |
| 4 | Migrate Shopify wholesale orders or keep Shopify as-is for billing? | **Keep Shopify** for billing; sync orders into our wholesale_orders table for visibility |
| 5 | Soft-launch testers: which 2-3 chefs? | Todd + PM pick together |

---

## 7. Sequencing With Employee Migration

After wholesale ships (~6/12), employee migration begins. Key reuses:
- `customers` table → all employees are customers with `customer_type='employee'`
- `roles` + `user_roles` tables → defined in wholesale migration, reused
- `driver_clock_events` table → generalized to `clock_events` (driver/staff/harvest crew all log to same table)
- Magic link auth → already works
- Resend → already configured
- Twilio → already configured for SMS

Estimated employee migration: **3 weeks** (similar size to wholesale). Detailed plan written when wholesale lands.

---

## 8. Approvals

| Decision | Status |
|---|---|
| Stack (Supabase + Astro + Vercel + Resend + Twilio + Cloudflare DNS) | ✅ Locked from CSA migration |
| Drop catch weight, AI reorder, multi-language, image ordering | ✅ Approved 2026-05-08 |
| Keep auto-invoice, SMS confirms, delivery tracking, min order, offline PWA, florist, standing orders, driver rebuild | ✅ Approved 2026-05-08 |
| Defer routing dashboard rebuild to Phase 2 | ✅ Approved 2026-05-08 |
| 21-day timeline | ✅ Approved 2026-05-08 |

**This plan is ready to execute when CSA cutover ships.**

---

*Ready for implementation. No code changes yet — execution begins after CSA Day 14 (cutover, ~2026-05-22).*
