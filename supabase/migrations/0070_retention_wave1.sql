-- ============================================================================
-- 0070_retention_wave1.sql
--
-- PHASE 2 · WAVE 1 of the CSA retention layer (Todd's ask, 2026-07-05).
-- Spec: docs/audits/CSA_GAP_RESEARCH_2026-07.md (gaps 4/5/6) +
--       CSA_MASTER_PROPOSAL_2026-07.md (2.1/2.2/2.3).
--
-- THE PROBLEM: the portal's ops tooling beats every commercial CSA platform,
-- but the member-RETENTION communication layer (the documented 15–25pp renewal
-- lever) was entirely missing. This migration lays the DATA foundation for the
-- three smallest, highest-value retention features:
--
--   2.1  In-portal renewal banner (weeks_remaining ≤ threshold → Shopify link)
--   2.2  Public waitlist form (no auth → warm pool for cancellations)
--   2.3  Post-pickup micro-survey (token link in the weekly email → 1–4 + text)
--
-- ── THREE TABLES ─────────────────────────────────────────────────────────────
--   portal_settings   key/value config the ADMIN edits and the DASHBOARD reads.
--                     Holds the ready-to-arm renewal-banner switch + URL +
--                     threshold. NO PII, so it carries an authenticated READ
--                     policy (the member's own RLS client reads it) ON TOP of
--                     the admin FOR ALL policy.
--   waitlist_signups  public waitlist submissions. Written by a SERVER endpoint
--                     using the service-role client after zod + honeypot
--                     validation (same trust model as the onboarding endpoints)
--                     — so there is NO anon INSERT policy; only admin/staff read
--                     + manage via is_admin_caller().
--   box_feedback      post-pickup micro-survey rows (rating 1–4 + optional
--                     comment). Written by a SERVER endpoint after HMAC-token
--                     verification (the token IS the access, mirroring the
--                     one-click unsubscribe model), via the service-role client.
--                     One row per (week_date, customer_id) — repeat taps UPSERT.
--
-- RLS: all three carry is_admin_caller() FOR ALL (migration 0017 — TRUE for
-- customers.role IN ('admin','staff')). portal_settings ADDS a read-only SELECT
-- policy for authenticated (settings hold no PII; the dashboard reads the
-- renewal keys via the member's cookie-aware RLS client). waitlist_signups and
-- box_feedback have NO anon/authenticated policies — their public writes flow
-- through service-role endpoints AFTER validation, exactly like the onboarding
-- + unsubscribe endpoints, so the service-role bypasses RLS and no forgeable
-- client-side INSERT path exists.
--
-- TABLE GRANTS: intentionally NONE — matching the repo TABLE convention
-- (0043/0054/0061/0066): Supabase's default privileges already grant
-- authenticated + service_role, and RLS is the gate. (FUNCTION migrations
-- REVOKE-then-GRANT; this migration defines no functions.)
--
-- Idempotent: CREATE TABLE IF NOT EXISTS, guarded UNIQUE constraints, guarded
-- seed upserts, DROP POLICY IF EXISTS before CREATE POLICY, CREATE INDEX IF NOT
-- EXISTS. Safe to re-run. Ends with a verify SELECT proving all three tables +
-- their policies exist and the seed rows are present.
-- ============================================================================

-- ── 1. portal_settings — admin-edited config the dashboard reads ────────────
CREATE TABLE IF NOT EXISTS portal_settings (
  key        text PRIMARY KEY,
  value      text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE portal_settings ENABLE ROW LEVEL SECURITY;

-- Admin/staff manage the whole table (mirrors market_offerings 0054).
DROP POLICY IF EXISTS portal_settings_admin ON portal_settings;
CREATE POLICY portal_settings_admin ON portal_settings
  FOR ALL
  USING (is_admin_caller())
  WITH CHECK (is_admin_caller());

-- Read-only for any authenticated member: the dashboard reads the renewal
-- banner keys through the member's own cookie-aware RLS client. These rows hold
-- ZERO PII (a feature switch, a public Shopify URL, a small integer threshold),
-- so widening READ to authenticated leaks nothing. WRITE stays admin-only.
DROP POLICY IF EXISTS portal_settings_read ON portal_settings;
CREATE POLICY portal_settings_read ON portal_settings
  FOR SELECT
  TO authenticated
  USING (true);

-- Seed the ready-to-arm renewal-banner rows (idempotent — first run inserts,
-- re-runs leave any admin-edited value untouched via DO NOTHING).
INSERT INTO portal_settings (key, value) VALUES
  ('renewal_banner_enabled', 'false'),
  ('renewal_url', 'https://www.tinyseedfarm.com/products/2025-flex-csa-and-or-market-share'),
  ('renewal_weeks_threshold', '4')
ON CONFLICT (key) DO NOTHING;

-- ── 2. waitlist_signups — public waitlist submissions ───────────────────────
CREATE TABLE IF NOT EXISTS waitlist_signups (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name              text NOT NULL,
  email             text NOT NULL,
  phone             text,
  -- Free-form share interest (Summer Veg / Flower / Flex / Any) — kept text so
  -- adding a future share never needs a constraint migration.
  share_interest    text,
  pickup_preference text,
  notes             text,
  status            text NOT NULL DEFAULT 'new'
                      CHECK (status IN ('new', 'contacted', 'converted', 'archived')),
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- ONE signup per email → the join endpoint UPSERTs on this key (a repeat signup
-- refreshes the existing row rather than creating a duplicate).
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'waitlist_signups_email_uniq'
  ) THEN
    ALTER TABLE waitlist_signups
      ADD CONSTRAINT waitlist_signups_email_uniq UNIQUE (email);
  END IF;
END $$;

-- The admin list orders newest-first; index that ordering.
CREATE INDEX IF NOT EXISTS waitlist_signups_created_idx
  ON waitlist_signups (created_at DESC);

ALTER TABLE waitlist_signups ENABLE ROW LEVEL SECURITY;

-- Admin/staff only. Public writes flow through the service-role join endpoint
-- AFTER zod + honeypot validation, so there is deliberately NO anon policy.
DROP POLICY IF EXISTS waitlist_signups_admin ON waitlist_signups;
CREATE POLICY waitlist_signups_admin ON waitlist_signups
  FOR ALL
  USING (is_admin_caller())
  WITH CHECK (is_admin_caller());

-- ── 3. box_feedback — post-pickup micro-survey rows ─────────────────────────
CREATE TABLE IF NOT EXISTS box_feedback (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- The cycle MONDAY the box was for (canonical week key — matches box_contents
  -- + the dashboard week-range label; the weekly-email link normalizes to it).
  week_date    date NOT NULL,
  -- Who left it. customer_id is the primary key of the survey; member_email is
  -- a display/search fallback. FK kept even if the customer is later removed
  -- (SET NULL) so the rating history survives. The admin page embeds
  -- customer:customers(contact_name) via this FK.
  customer_id  uuid REFERENCES customers(id) ON DELETE SET NULL,
  member_email text,
  -- 1 😞 · 2 😐 · 3 🙂 · 4 😍 — a four-point tap scale (no neutral-bias midpoint).
  rating       int NOT NULL CHECK (rating BETWEEN 1 AND 4),
  comment      text,
  -- The HMAC token the row was submitted under (audit — the token IS the
  -- access, so we keep the exact value that authorized the write).
  token        text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- ONE row per (week, customer) → the submit endpoint UPSERTs on this key, so a
-- member can change their rating / add a comment on a repeat visit.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'box_feedback_week_customer_uniq'
  ) THEN
    ALTER TABLE box_feedback
      ADD CONSTRAINT box_feedback_week_customer_uniq UNIQUE (week_date, customer_id);
  END IF;
END $$;

-- The admin per-week view scans all rows for a week; index that read.
CREATE INDEX IF NOT EXISTS box_feedback_week_idx
  ON box_feedback (week_date);

ALTER TABLE box_feedback ENABLE ROW LEVEL SECURITY;

-- Admin/staff only. Public writes flow through the service-role submit endpoint
-- AFTER HMAC token verification, so there is deliberately NO anon policy.
DROP POLICY IF EXISTS box_feedback_admin ON box_feedback;
CREATE POLICY box_feedback_admin ON box_feedback
  FOR ALL
  USING (is_admin_caller())
  WITH CHECK (is_admin_caller());

-- ── Verify (returns each table + its policy count + the seeded settings so the
--    apply is provably persisted). ────────────────────────────────────────────
SELECT
  (SELECT count(*) FROM pg_tables
     WHERE schemaname = 'public'
       AND tablename IN ('portal_settings', 'waitlist_signups', 'box_feedback')) AS tables_present,
  (SELECT count(*) FROM pg_policies
     WHERE schemaname = 'public'
       AND tablename IN ('portal_settings', 'waitlist_signups', 'box_feedback')) AS policies_present,
  (SELECT count(*) FROM portal_settings
     WHERE key IN ('renewal_banner_enabled', 'renewal_url', 'renewal_weeks_threshold')) AS seed_rows;
