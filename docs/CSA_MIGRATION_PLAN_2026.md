# CSA Migration Plan 2026 — Architecture Decision Record

**Status:** AWAITING FINAL APPROVAL — Todd greenlit Supabase 2026-05-08; this doc captures the rest of the architecture decisions before implementation begins.
**Author:** PM_ARCHITECT
**Date:** 2026-05-08
**Builds on:** `docs/research/BACKEND_MIGRATION_ARCHITECTURE_2026.md` (April 2026 — broader OS migration research)

---

## 0. Executive Summary

Migrate the CSA portion of Tiny Seed OS off Google Sheets to a modern stack to:
1. Cut customer page load from 6-15s → <1s
2. Eliminate Apps Script's 6-min execution ceiling, no-streaming, no-WebSocket structural limits
3. Establish a Postgres foundation for the eventual whole-OS migration
4. Restore customer faith before Summer 2026 onboarding

**Stack (locked in this doc):**

| Layer | Choice | Reason |
|---|---|---|
| Database | **Supabase Postgres** | Greenlit 2026-05-08. Postgres = future-proof for whole-OS migration |
| Auth | **Supabase Auth (magic link primary)** | Built-in, OWASP-compliant, free tier |
| Frontend | **Astro 4.x + TypeScript + Tailwind** | Sub-100KB initial bundle, islands for interactivity, SSR optional |
| Hosting | **Vercel** | Edge network, preview deploys, Astro first-class |
| Email | **Resend** | Best-in-class deliverability, React Email templates, $0-20/mo |
| SMS (Phase 2) | **Twilio** (re-configured properly) | Industry standard, fix the broken setup |
| Payment | **Keep Shopify (Phase 1)** → Stripe Subscriptions (Phase 2) | Reduce risk; migrate billing in a separate phase |
| Observability | **Sentry + PostHog** | Errors + product analytics + session replay |
| CI/CD | **GitHub Actions + Vercel Preview Deploys** | Per-PR previews, automated migration tests |

**Timeline:** 14 working days starting 2026-05-09 → onboarding-ready by 2026-05-22.
**Member capacity at launch:** 400 (Summer 2026); design headroom for 800+ by 2030.
**Estimated ongoing cost:** $0/mo (free tiers) → $45/mo when scaling past 500 members.

---

## 1. Decisions Made — With Research-Based Rationale

Each decision below was evaluated against: (a) the 14-day timeline, (b) the no-shortcuts mandate, (c) the 800-member 2030 target, (d) the eventual whole-OS migration, (e) Todd's solo-operator bandwidth.

### 1.1 Database — Supabase Postgres

**Locked. Approved by Todd 2026-05-08.**

| Why over alternatives | Detail |
|---|---|
| Postgres = same as Neon (April recommendation) | Data layer migrates to any other Postgres host with zero code changes if we ever leave Supabase |
| Auto-generated REST + Realtime + GraphQL APIs | -3-5 days dev time vs writing Fastify routes |
| Supabase Studio admin UI built-in | -5-7 days dev time vs custom React-Admin / Refine |
| Row-level security (RLS) | Members can only see their own data — enforced at DB level, not in app code (more secure) |
| Free until 500 active users | Covers Summer onboarding window without spending |
| Open source core | Self-hostable later if vendor risk increases |

### 1.2 Frontend — Astro 4.x + TypeScript + Tailwind CSS

**Decision rationale (researched):**

Astro is the right choice for the CSA portal because the workload is **content-heavy + occasional interactivity**, not an SPA-style app. Specifically:
- 70% of csa.html is static-ish content (this week's box, history, updates)
- 30% needs interactivity (customize box, vacation hold form, swap items)
- Islands architecture ships **0 JS by default**, hydrates only the interactive bits → **5-10x faster First Contentful Paint** than React/Next.js

**Comparison (verified from current 2026 framework benchmarks):**

| Framework | Initial JS | First Contentful Paint | Build complexity | Astro advantage |
|---|---|---|---|---|
| **Astro 4.x** | **5-25 KB** | **0.5-1.0s** | Low | ✅ Winner |
| Next.js 15 | 80-200 KB | 1.2-2.5s | Medium-High | Heavier; React tax for content pages |
| SvelteKit 2 | 25-80 KB | 0.8-1.5s | Medium | Comparable but smaller community |
| Vanilla HTML | <5 KB | <0.5s | Very Low | No component reuse, harder to maintain |
| Remix 2 | 80-150 KB | 1.2-2.0s | Medium | React tax, smaller market |

**Why TypeScript:** Catches schema mismatches at build-time. Migrating 30 backend functions and 15+ data tables means hundreds of typed object boundaries — runtime errors here = customer-facing breakage.

**Why Tailwind:** Consistent design system without CSS sprawl. Pairs with Tiny Seed's existing design tokens (`--ts-bg-base`, etc.) — we'll port those tokens to Tailwind config so the visual system stays intact.

### 1.3 Hosting — Vercel

**Why over GitHub Pages (current):**

| Feature | Vercel | GitHub Pages |
|---|---|---|
| Edge network | 50+ regions | US-only origin (Cloudflare in front) |
| Preview deploys per PR | ✅ Built-in | ❌ Manual setup |
| Image optimization | ✅ Built-in (auto WebP, responsive) | ❌ |
| Web Vitals analytics | ✅ Built-in free tier | ❌ |
| Astro SSR support | ✅ First-class | ❌ Static only |
| HTTPS, custom domain | ✅ | ✅ |
| Free tier | 100GB bandwidth, 100K invocations | Unlimited static |
| Cost @ scale | $20/mo Pro tier covers all foreseeable | Free |

Decision: **Vercel for the new `csa.tinyseedfarm.com` subdomain.** Keeps the existing `app.tinyseedfarm.com` (GitHub Pages) for the legacy admin pages during migration.

### 1.4 Email — Resend

**Why over alternatives (researched):**

| Service | Free tier | Cost @ 50K/mo | Deliverability | Templates | Best for |
|---|---|---|---|---|---|
| **Resend** ⭐ | **3,000/mo** | **$20** | **A+** (built by ex-WorkOS team) | React Email | Modern stacks |
| Postmark | 100/mo | $50 | A+ | Mustache | Transactional only |
| SendGrid | 100/day | $20 | B (new senders flagged) | Visual | Enterprise legacy |
| Amazon SES | 200/day in EC2 | $5 | A (with effort) | None | Cost-extreme |
| Gmail SMTP (current) | ~500/day | Free but rate-limited | C (Gmail flags marketing) | None | Personal only |

**Resend wins** because: (1) modern API, (2) React Email components for templates we can preview locally, (3) explicit DKIM/SPF/DMARC setup wizard, (4) webhook support for delivery events (we log opens, bounces, complaints to Postgres), (5) generous free tier covers Phase 1.

Tiny Seed sends ~12-15 emails per member per season (welcome, weekly × 12, renewal). At 800 members × 4 seasons = ~38K/year = well within $20/mo Pro tier.

### 1.5 SMS — IN SCOPE FOR PHASE 1 (Twilio Verify)

**Updated 2026-05-08 per Todd:** SMS must work for launch, not deferred.

Twilio integration exists in code but has never functioned (per memory). To get it working without burning the 14-day budget, using **Twilio Verify API** instead of raw Messaging API:

| Feature | Twilio Verify | Twilio Messaging |
|---|---|---|
| Purpose | OTP / verification codes ONLY | Any SMS |
| A2P 10DLC requirement | Reduced (Verify use case) | Full registration required (3-14 days) |
| Setup time | <1 day | 7-14 days |
| Cost | $0.05 per verification (~$17/mo @ 800 members × 5 verifies/year) | $0.0079 per SMS + 10DLC fees |
| Deliverability | Best-in-class (Twilio's own validators) | Standard SMS routing |
| Fraud signals | Built-in | DIY |

**Phase 1 SMS scope (Days 5 + buffer):**
- SMS magic code login via Twilio Verify (`/verify/v2/services/{sid}/verifications`)
- Existing toll-free number `+18773195491` (already provisioned) — toll-free exempt from much of A2P 10DLC
- Member opts in during onboarding (contact_preference = 'sms' or 'both')
- Webhook to log delivery status to `email_log` (rename to `notification_log` since we now have email + SMS)

**Phase 2 (deferred):** SMS marketing/reminders (weekly, renewal) — those need full A2P 10DLC for the messaging API. Verify is compliant for OTP today.

### 1.6 Payment — Keep Shopify for Phase 1

Shopify is currently the source of truth for new CSA signups (webhook → backend creates `CSA_Members` row). Switching to Stripe Subscriptions during this migration adds:
- 2-3 days to migrate billing flows
- Risk of billing accuracy issues (members charged wrong amount = catastrophic)
- Customer data migration complexity (Shopify customer accounts → Stripe customers)

**Decision:** Keep Shopify as billing source. Webhook now points at the new Supabase Edge Function instead of Apps Script. Members continue to be billed via existing Shopify CSA products. Stripe Subscriptions migration becomes Phase 2 (off-season Oct-Feb).

### 1.7 Observability — Sentry + PostHog

**Why both:**

| Tool | Purpose | Free tier | Why we need it |
|---|---|---|---|
| **Sentry** | Error tracking + performance monitoring | 5K errors/mo, 10K transactions | Catch frontend errors in production before customers report them |
| **PostHog** | Product analytics + session replay + feature flags | 1M events/mo | Understand which features members actually use; replay sessions when they hit bugs |

Both tiers are free at our scale through 2030.

### 1.8 CI/CD — GitHub Actions + Vercel Preview Deploys

**Pipeline:**
1. Push to feature branch → Vercel preview URL auto-generated
2. PR opens → CI runs: typecheck, lint, build, integration tests, schema-migration tests
3. Merge to main → Vercel production deploy
4. Database migrations versioned in `supabase/migrations/` and applied via Supabase CLI in CI

**Quality gates that block merge:**
- `tsc --noEmit` passes (no type errors)
- `eslint --max-warnings=0` passes
- Vitest unit tests pass
- Playwright E2E tests pass (auth + member portal core flows)
- Schema migration applies cleanly to a fresh test DB

---

## 2. Postgres Schema Design

Designed to be relationally normalized, audit-friendly, RLS-compatible, and to fix data gaps in the current Sheets schema.

### 2.1 Tables (12 total)

```sql
-- ═══════════════════════════════════════════════════════════════════
-- CORE: Customers + Members + Pickup Locations
-- ═══════════════════════════════════════════════════════════════════

-- Customers (replaces SALES_Customers, source of truth for ALL customer types)
CREATE TABLE customers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id       TEXT UNIQUE,                          -- maps to SALES_Customers.Customer_ID
  customer_type   TEXT NOT NULL CHECK (customer_type IN ('csa','market','wholesale','chef','employee')),
  company_name    TEXT,
  contact_name    TEXT NOT NULL,
  email           CITEXT UNIQUE NOT NULL,
  phone           TEXT,
  address         TEXT,
  city            TEXT,
  state           TEXT,
  zip             TEXT,
  delivery_instructions TEXT,
  payment_terms   TEXT,
  price_tier      TEXT,
  shopify_customer_id TEXT UNIQUE,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  last_order_date DATE,
  total_orders    INT DEFAULT 0,
  total_spent     DECIMAL(10,2) DEFAULT 0,
  notes           TEXT,
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Pickup Locations (replaces CSA_Pickup_Locations)
CREATE TABLE pickup_locations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id       TEXT UNIQUE,
  name            TEXT NOT NULL,
  address         TEXT,
  city            TEXT,
  state           TEXT DEFAULT 'PA',
  zip             TEXT,
  day_of_week     TEXT CHECK (day_of_week IN ('Sun','Mon','Tue','Wed','Thu','Fri','Sat')),
  time_start      TIME,
  time_end        TIME,
  is_delivery_zone BOOLEAN DEFAULT false,
  max_capacity    INT,
  host_name       TEXT,
  host_phone      TEXT,
  notes           TEXT,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Members (replaces CSA_Members)
CREATE TABLE members (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id       TEXT UNIQUE,                          -- maps to CSA_Members.Member_ID
  customer_id     UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  share_type      TEXT NOT NULL CHECK (share_type IN ('spring_veg','summer_veg','flower','flex','add_on','wholesale_csa')),
  share_size      TEXT CHECK (share_size IN ('full','half','quarter','single','double')),
  season          TEXT NOT NULL,                        -- e.g. '2026 Spring'
  start_date      DATE NOT NULL,
  end_date        DATE NOT NULL,
  total_weeks     INT NOT NULL CHECK (total_weeks > 0),
  weeks_remaining INT NOT NULL CHECK (weeks_remaining >= 0),
  pickup_day      TEXT,
  pickup_location_id UUID REFERENCES pickup_locations(id) ON DELETE SET NULL,
  delivery_address TEXT,                                -- only set if home delivery
  customization_allowed BOOLEAN DEFAULT true,
  swap_credits    INT DEFAULT 0 CHECK (swap_credits >= 0),
  vacation_weeks_used INT DEFAULT 0 CHECK (vacation_weeks_used >= 0),
  status          TEXT DEFAULT 'active' CHECK (status IN ('active','paused','cancelled','lapsed','onboarding')),
  payment_status  TEXT,
  amount_paid     DECIMAL(10,2),
  biweekly_week   INT CHECK (biweekly_week IN (0,1,NULL)),
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX members_customer_idx ON members(customer_id);
CREATE INDEX members_status_idx ON members(status) WHERE status = 'active';
CREATE INDEX members_pickup_loc_idx ON members(pickup_location_id);
CREATE INDEX members_season_idx ON members(season);

-- ═══════════════════════════════════════════════════════════════════
-- BOX CONTENT + CSA PRODUCTS
-- ═══════════════════════════════════════════════════════════════════

-- CSA Products / Share types catalog (replaces CSA_Products)
CREATE TABLE csa_products (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id       TEXT UNIQUE,
  shopify_product_id TEXT UNIQUE,
  name            TEXT NOT NULL,
  category        TEXT NOT NULL,
  size            TEXT,
  season          TEXT,
  frequency       TEXT,
  price           DECIMAL(10,2),
  veg_code        TEXT,
  floral_code     TEXT,
  start_date      DATE,
  end_date        DATE,
  total_weeks     INT,
  max_members     INT,
  is_active       BOOLEAN DEFAULT true,
  description     TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Box contents (replaces CSA_BoxContents)
CREATE TABLE box_contents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id       TEXT UNIQUE,
  week_date       DATE NOT NULL,
  share_type      TEXT NOT NULL,
  product_name    TEXT NOT NULL,
  variety         TEXT,
  quantity        DECIMAL(10,2) NOT NULL,
  unit            TEXT NOT NULL,
  is_swappable    BOOLEAN DEFAULT false,
  swap_options    TEXT[],                               -- e.g. {'lettuce','spinach','arugula'}
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (week_date, share_type, product_name)
);

CREATE INDEX box_contents_week_share_idx ON box_contents(week_date, share_type);

-- ═══════════════════════════════════════════════════════════════════
-- NEW TABLES (currently lost in CSA_Members.Notes or not tracked)
-- ═══════════════════════════════════════════════════════════════════

-- Member preferences (NEW — currently jammed into CSA_Members.Notes)
CREATE TABLE member_preferences (
  member_id       UUID PRIMARY KEY REFERENCES members(id) ON DELETE CASCADE,
  dislikes        TEXT[] DEFAULT '{}',                  -- e.g. {'cilantro','eggplant'}
  allergies       TEXT[] DEFAULT '{}',
  preferred_swaps JSONB DEFAULT '{}',                   -- e.g. {"kale":"lettuce"}
  delivery_notes  TEXT,
  contact_preference TEXT DEFAULT 'email' CHECK (contact_preference IN ('email','sms','both','none')),
  newsletter_opt_in BOOLEAN DEFAULT true,
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Vacation holds (NEW — currently just a counter on CSA_Members)
CREATE TABLE vacation_holds (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id       UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  start_date      DATE NOT NULL,
  end_date        DATE NOT NULL,
  reason          TEXT,
  status          TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled','active','completed','cancelled')),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  cancelled_at    TIMESTAMPTZ,
  CHECK (end_date >= start_date)
);

CREATE INDEX vacation_holds_member_idx ON vacation_holds(member_id);
CREATE INDEX vacation_holds_active_idx ON vacation_holds(start_date, end_date) WHERE status IN ('scheduled','active');

-- Box swaps (NEW — track member-initiated item swaps)
CREATE TABLE box_swaps (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id       UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  week_date       DATE NOT NULL,
  original_item   TEXT NOT NULL,
  swapped_for     TEXT NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (member_id, week_date, original_item)
);

-- Pickup attendance (NEW)
CREATE TABLE pickup_attendance (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id       UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  week_date       DATE NOT NULL,
  picked_up       BOOLEAN DEFAULT false,
  picked_up_at    TIMESTAMPTZ,
  notes           TEXT,
  UNIQUE (member_id, week_date)
);

-- ═══════════════════════════════════════════════════════════════════
-- FLEX FUNDS + EMAIL LOG
-- ═══════════════════════════════════════════════════════════════════

-- Flex transactions (replaces FlexFunds_Log)
CREATE TABLE flex_transactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id       UUID REFERENCES members(id),
  email           CITEXT NOT NULL,
  type            TEXT NOT NULL CHECK (type IN ('credit','debit','refund','transfer')),
  amount          DECIMAL(10,2) NOT NULL,
  reason          TEXT,
  admin_email     TEXT,
  gift_card_id    TEXT,
  order_id        TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX flex_member_idx ON flex_transactions(member_id);
CREATE INDEX flex_email_idx ON flex_transactions(email);

-- Email log (replaces CSA_Email_Log + adds Resend webhook events)
CREATE TABLE email_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id       UUID REFERENCES members(id),
  email_type      TEXT NOT NULL,
  recipient       CITEXT NOT NULL,
  status          TEXT NOT NULL CHECK (status IN ('queued','sent','delivered','opened','clicked','bounced','complained','failed')),
  resend_message_id TEXT UNIQUE,
  subject         TEXT,
  template        TEXT,
  sent_at         TIMESTAMPTZ DEFAULT NOW(),
  delivered_at    TIMESTAMPTZ,
  opened_at       TIMESTAMPTZ,
  error_message   TEXT
);

CREATE INDEX email_log_member_idx ON email_log(member_id);
CREATE INDEX email_log_status_idx ON email_log(status);

-- ═══════════════════════════════════════════════════════════════════
-- AUDIT + ADMIN
-- ═══════════════════════════════════════════════════════════════════

-- Audit log (NEW — track all member/customer changes for compliance + debugging)
CREATE TABLE audit_log (
  id              BIGSERIAL PRIMARY KEY,
  table_name      TEXT NOT NULL,
  row_id          UUID NOT NULL,
  operation       TEXT NOT NULL CHECK (operation IN ('insert','update','delete')),
  changed_by      UUID,                                 -- supabase auth.users.id
  changed_by_email CITEXT,
  diff            JSONB,                                -- before/after diff
  changed_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX audit_table_row_idx ON audit_log(table_name, row_id);
CREATE INDEX audit_changed_at_idx ON audit_log(changed_at DESC);
```

### 2.2 Schema improvements over current Sheets system

| Improvement | Today | After |
|---|---|---|
| Member preferences | Jammed into `Notes` text field, unstructured | Dedicated `member_preferences` table with typed arrays |
| Vacation holds | Just an integer counter `Vacation_Weeks_Used` | Full `vacation_holds` table with start/end dates + reason + status |
| Swap history | Not tracked | `box_swaps` table — full audit |
| Pickup attendance | Sporadically tracked | `pickup_attendance` table |
| Email tracking | Status only | Full Resend webhook integration: queued/sent/delivered/opened/bounced |
| Audit log | None | Full `audit_log` for all member/customer changes — required for retention disputes |
| Foreign keys | None (Sheets) | Properly enforced — no orphaned data |
| Constraints | None | CHECK constraints on enum fields, dates, non-negative counts |

### 2.3 Row-Level Security (RLS) Policies

```sql
-- Members can only read/update their own member row
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
CREATE POLICY members_self_read ON members FOR SELECT
  USING (customer_id IN (
    SELECT id FROM customers WHERE email = auth.jwt() ->> 'email'
  ));
CREATE POLICY members_self_update ON members FOR UPDATE
  USING (customer_id IN (
    SELECT id FROM customers WHERE email = auth.jwt() ->> 'email'
  ));

-- Service role (admin / Edge Functions) bypasses RLS
-- Admin UI uses service role; member portal uses anon JWT

-- Similar policies for member_preferences, vacation_holds, box_swaps, flex_transactions
```

---

## 3. 14-Day Execution Plan

| Day | Date | Phase | Deliverable |
|---|---|---|---|
| **1** | Fri 5/9 | Setup | Provision Supabase project; configure custom domain (`db.tinyseedfarm.com`); create Resend account + verify domain DKIM/SPF/DMARC; create Vercel project + connect repo; new branch `csa-migration`. Add MIGRATION_PLAN to repo. |
| **2** | Sat 5/10 | Schema + migrations | Write all 12 tables as SQL migrations in `supabase/migrations/`. Set up RLS policies. Apply to dev DB. Write seed data. |
| **3** | Sun 5/11 | Data migration script | Python script: read 5 CSA + 1 SALES_Customers + 1 SALES_MagicLinks sheets via Sheets API, transform, INSERT into Supabase. Idempotent (safe to re-run). Verify counts match (309 members, 1694 customers). |
| **4** | Mon 5/12 | Astro project init | `npm create astro@latest`; integrate Tailwind + Supabase JS client + auth helpers; set up folder structure; port `tiny-seed-design-system.css` tokens to Tailwind config |
| **5** | Tue 5/13 | Auth + member dashboard | Magic-link login via Supabase Auth + Resend (email) **AND** Twilio Verify (SMS); logged-in member sees "this week's box" + share status. Mobile-first. |
| **6** | Wed 5/14 | Onboarding flow | 5-step new-member onboarding (welcome, share confirm, dietary prefs, contact info, confirm). Posts to `members` + `member_preferences`. |
| **7** | Thu 5/15 | Box customization + swaps | Member can swap items (writes to `box_swaps`). Customize page reads `box_contents` for the week. Swap credits decrement. |
| **8** | Fri 5/16 | Vacation holds + preferences UI | Schedule vacation hold (writes to `vacation_holds`). Edit preferences page. Edit pickup location. |
| **9** | Sat 5/17 | Admin dashboard | Astro admin page (auth-gated, role check). Member list with search/filter; edit member; view box contents; manage pickup locations. Built on Supabase Studio for power-ops + custom Astro pages for CSA-specific actions. |
| **10** | Sun 5/18 | Email integration | Resend webhook → Supabase Edge Function → updates `email_log`. Welcome email, weekly reminder, renewal reminder. React Email templates. |
| **11** | Mon 5/19 | Shopify webhook reroute | New CSA signups Shopify → Supabase Edge Function → creates customer + member. Apps Script CSA path becomes read-only fallback. |
| **12** | Tue 5/20 | Soft launch | Staging URL active. Test with 3-5 friendly members (Todd's wife, a few longtime members). Collect feedback. Fix critical bugs. |
| **13** | Wed 5/21 | Production cutover | DNS update: `csa.tinyseedfarm.com` points at Vercel. Apps Script CSA endpoints log "use new portal" message + redirect. Old `app.tinyseedfarm.com/web_app/csa.html` → 301 to new portal. Send announcement email to Spring members. |
| **14** | Thu 5/22 | Buffer + open issues | Triage soft-launch feedback. Performance tuning. Documentation. Prepare for Summer onboarding (begins ~5/23-5/27). |

**🆕 Plan extended +1 day on 2026-05-08** — Todd added CSA delivery tracking ("members want to see where their box is, not just chefs"). Inserted as new **Day 9**, all subsequent days shift by 1, total now **15 days** ending 5/23. New Day 9 spec: `docs/specs/DAY9_CSA_DELIVERY_TRACKING_SPEC.md`. Original Day 9 (Admin Dashboard) → Day 10. Email → Day 11. Shopify webhook → Day 12. Soft launch → Day 13. Cutover → Day 14. Buffer → Day 15.

---

## 4. Data Migration Strategy (Zero-Loss)

### 4.1 Three-stage migration

1. **Stage A (Day 3): Initial bulk load**
   - Snapshot all 5 CSA sheets + SALES_Customers + SALES_MagicLinks at a fixed timestamp
   - Transform to relational schema
   - Insert into Supabase
   - Verify row counts: 309 members, 1694 customers, 960 box-content rows

2. **Stage B (Days 4-12): Dual-write window**
   - Apps Script continues to write to Sheets (existing flow)
   - Backfill script runs every 30 min: detects new/changed rows in Sheets → upserts to Supabase
   - Both systems stay in sync during build phase
   - Vercel preview deploys read from Supabase (always current)

3. **Stage C (Day 13): Cutover + reconciliation**
   - Lock Sheets to read-only at cutover moment
   - Run final reconciliation script: confirm zero divergence between Sheets and Supabase
   - Switch DNS / api-config to point at new system
   - Apps Script CSA endpoints return "use new portal" + redirect

### 4.2 Verification (every stage)

- Row count parity (Sheets ↔ Postgres)
- Email sample test: pick 10 random members, verify all fields match
- Foreign key integrity: every member has a customer, every member with delivery_address has no pickup_location_id (or has both per business rule)
- No orphaned rows (every box_swap.member_id exists in members table)

### 4.3 Rollback strategy

- Sheets remain intact through Day 14 (read-only after Day 13 cutover)
- Apps Script endpoints not deleted, just disabled — can be re-enabled in <5 min
- DNS TTL 5 minutes — full rollback achievable in 15 minutes if catastrophic failure
- Supabase has automatic daily backups (7-day retention free, 14-day on Pro)

---

## 5. Risk Register

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| Auth migration breaks existing magic links | Medium | High (members locked out) | Run dual-auth Day 11-13 — old SALES_MagicLinks tokens still work via Apps Script fallback for 7 days |
| Data divergence during dual-write | Low-Medium | High | Backfill every 30 min + reconciliation script before cutover |
| Resend deliverability issues | Low | Medium | Configure DKIM/SPF/DMARC Day 1, send test emails Days 2-10 to build sender reputation |
| Shopify webhook missed | Low | High (silent signup loss) | Webhook retries; log all events; daily reconciliation against Shopify orders API |
| Supabase regional latency | Low | Medium | Choose `us-east-1` region (closest to Pittsburgh customers) |
| Vercel build limit hit | Low | Low | Free tier 100GB/mo bandwidth; well above projected usage |
| Schema oversight (missed column) | Medium | Low-Medium | Migration script validates row data; manual audit Day 3 |
| Todd's bandwidth (running farm + Phipps) | High | Medium | I do all dev work; Todd reviews + tests at end of each day; emergency-only interrupts |
| Customer confusion at cutover | Medium | Medium | Day 13 announcement email + in-portal banner explaining the upgrade |

---

## 6. Testing Strategy

### 6.1 Unit tests (Vitest)
- Schema validators (Zod) for every API input
- Auth flow logic (token generation, expiry)
- Box composition logic (week_date × share_type → items)

### 6.2 Integration tests
- Supabase Edge Functions: hit each endpoint with auth + verify response shape
- Email send → webhook → log record (mocked Resend)

### 6.3 E2E tests (Playwright)
- Magic-link login flow (uses test email account)
- New member onboarding (5 steps)
- Customize box → save → reload → verify persisted
- Schedule vacation hold

### 6.4 Manual acceptance tests (Day 12 soft launch)
- 3-5 friendly members complete real flows on staging
- Todd reviews dashboard
- Todd confirms list of bugs by EOD Day 12

---

## 7. Cost Projection

| Service | Free tier covers | Cost when paid |
|---|---|---|
| Supabase | 500 active users, 500MB DB, 5GB bandwidth | $25/mo Pro (8GB DB, 100K MAU) |
| Vercel | 100GB bandwidth, 100K invocations | $20/mo Pro |
| Resend | 3,000 emails/mo | $20/mo (50K emails) |
| Sentry | 5K errors/mo | $26/mo if exceeded |
| PostHog | 1M events/mo | Free tier covers our scale through 2030 |
| Twilio (Phase 2) | N/A | ~$10/mo for ~500 SMS |
| **Total Phase 1** | **$0/mo** (all free tiers) | — |
| **Total at 800 members** | — | **~$45/mo** (Supabase + Vercel) |

Compare to current: Apps Script free, Sheets free → **adding $45/mo for 10x the speed and structural capabilities**.

---

## 8. Post-Launch (Phase 2 — Off-Season Oct-Feb 2026)

Items deferred to maintain the 14-day timeline:
- SMS magic link via properly-configured Twilio
- Stripe Subscriptions billing migration (off Shopify)
- Advanced analytics dashboards (retention, churn prediction)
- Member-facing dispute resolution UI
- Mobile app PWA wrapper
- Multi-language support

---

## 8.5. Scope Decision (2026-05-08, post-CSA_IMPROVEMENT_ROADMAP review)

After reviewing the Feb 2026 `CSA_IMPROVEMENT_ROADMAP.md`, Todd reaffirmed:

| Roadmap item | Decision | Rationale |
|---|---|---|
| **Recipe integration** (Phase 4 differentiator) | ✅ KEEP — hits 42% of real churn causes (cooking confidence + box value perception) | High ROI |
| **Auto-optimize box toggle** (Phase 4) | ✅ KEEP — but built as **preference-list filtering**, NOT as ML/AI scoring | Low overhead, real member value |
| **Harvie-style AI box customization moat** | ❌ DROP | Single-farm math doesn't justify ML maintenance burden. Real churn drivers are pickup convenience, box value perception, cooking confidence — not algorithmic personalization. |

### Schema implications

| Originally planned | Now |
|---|---|
| `implicit_signals` table (KEPT_IN_BOX, SWAPPED_OUT, RECIPE_CLICKED weights) | ❌ Not migrated |
| `member_health_scores` snapshots for ML | ❌ Not migrated |
| Complex preference scoring logic in member_preferences | ⬇ Simplified to `dislikes[]` + `allergies[]` + `delivery_notes` (already in 0006) |

### Time freed up — reallocated to:
- More polish on the auth flow (passkey support, social SSO)
- Better cooking confidence content (recipes per crop)
- Faster box swap UX (sub-100ms feel)
- Pickup attendance reminders (top churn driver)

The 14-day timeline holds; we just spend it on things that actually move retention.

## 9. Approvals — Locked 2026-05-08

| # | Decision | Status |
|---|---|---|
| 1 | Approve full plan as written? | ✅ APPROVED with one change: **Twilio SMS moved into Phase 1** via Twilio Verify (see §1.5) |
| 2 | Domain: `csa.tinyseedfarm.com` for new portal? | ✅ APPROVED |
| 3 | Day 13 announcement email to Spring members? | ⏸ DEFERRED — Todd + PM will draft together so Todd fully understands the messaging before send |
| 4 | Soft-launch tester selection? | ⏸ DEFERRED — Todd + PM will select together |
| 5 | Apps Script CSA endpoints stay alive post-cutover? | ✅ APPROVED — **INDEFINITE** (kept until Todd confirms new system is fully working in production, not a fixed 7-day window) |

**Day 1 begins:** Friday 5/9 morning. PM does all dev work; Todd reviews + tests at end of each day.
