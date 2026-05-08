-- ═══════════════════════════════════════════════════════════════════
-- Migration 0011: Row-Level Security Policies
--
-- Members can only read/update their own data.
-- Service role (admin Edge Functions) bypasses RLS.
-- Anon role has zero access — must authenticate.
-- ═══════════════════════════════════════════════════════════════════

-- Enable RLS on all member-facing tables
ALTER TABLE customers           ENABLE ROW LEVEL SECURITY;
ALTER TABLE members             ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_preferences  ENABLE ROW LEVEL SECURITY;
ALTER TABLE vacation_holds      ENABLE ROW LEVEL SECURITY;
ALTER TABLE box_swaps           ENABLE ROW LEVEL SECURITY;
ALTER TABLE pickup_attendance   ENABLE ROW LEVEL SECURITY;
ALTER TABLE flex_transactions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_log    ENABLE ROW LEVEL SECURITY;
-- box_contents + pickup_locations + csa_products: public-read (anyone authenticated can see what's in this week's box)
ALTER TABLE box_contents        ENABLE ROW LEVEL SECURITY;
ALTER TABLE pickup_locations    ENABLE ROW LEVEL SECURITY;
ALTER TABLE csa_products        ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log           ENABLE ROW LEVEL SECURITY;

-- ───────────────────────────────────────────────────────────────────
-- Helper: get current user's customer_id from auth email
-- ───────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION current_customer_id() RETURNS UUID AS $$
  SELECT id FROM customers WHERE email = auth.jwt() ->> 'email' LIMIT 1;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- ───────────────────────────────────────────────────────────────────
-- CUSTOMERS: read own row
-- ───────────────────────────────────────────────────────────────────

CREATE POLICY customers_self_read ON customers FOR SELECT
  USING (email = auth.jwt() ->> 'email');

CREATE POLICY customers_self_update ON customers FOR UPDATE
  USING (email = auth.jwt() ->> 'email')
  WITH CHECK (email = auth.jwt() ->> 'email');                -- prevent email change to someone else's

-- ───────────────────────────────────────────────────────────────────
-- MEMBERS: read/update own member rows
-- ───────────────────────────────────────────────────────────────────

CREATE POLICY members_self_read ON members FOR SELECT
  USING (customer_id = current_customer_id());

CREATE POLICY members_self_update ON members FOR UPDATE
  USING (customer_id = current_customer_id())
  WITH CHECK (customer_id = current_customer_id());

-- ───────────────────────────────────────────────────────────────────
-- MEMBER_PREFERENCES: full control over own
-- ───────────────────────────────────────────────────────────────────

CREATE POLICY prefs_self_all ON member_preferences FOR ALL
  USING (member_id IN (SELECT id FROM members WHERE customer_id = current_customer_id()))
  WITH CHECK (member_id IN (SELECT id FROM members WHERE customer_id = current_customer_id()));

-- ───────────────────────────────────────────────────────────────────
-- VACATION_HOLDS: read/write own
-- ───────────────────────────────────────────────────────────────────

CREATE POLICY vacation_self_all ON vacation_holds FOR ALL
  USING (member_id IN (SELECT id FROM members WHERE customer_id = current_customer_id()))
  WITH CHECK (member_id IN (SELECT id FROM members WHERE customer_id = current_customer_id()));

-- ───────────────────────────────────────────────────────────────────
-- BOX_SWAPS: read/write own
-- ───────────────────────────────────────────────────────────────────

CREATE POLICY swaps_self_all ON box_swaps FOR ALL
  USING (member_id IN (SELECT id FROM members WHERE customer_id = current_customer_id()))
  WITH CHECK (member_id IN (SELECT id FROM members WHERE customer_id = current_customer_id()));

-- ───────────────────────────────────────────────────────────────────
-- PICKUP_ATTENDANCE: read own, hosts/admins write (via service role)
-- ───────────────────────────────────────────────────────────────────

CREATE POLICY attendance_self_read ON pickup_attendance FOR SELECT
  USING (member_id IN (SELECT id FROM members WHERE customer_id = current_customer_id()));

-- ───────────────────────────────────────────────────────────────────
-- FLEX_TRANSACTIONS: members READ their own ledger; only service role writes
-- ───────────────────────────────────────────────────────────────────

CREATE POLICY flex_self_read ON flex_transactions FOR SELECT
  USING (
    member_id IN (SELECT id FROM members WHERE customer_id = current_customer_id())
    OR email = auth.jwt() ->> 'email'
  );

-- ───────────────────────────────────────────────────────────────────
-- NOTIFICATION_LOG: members READ their own; only service role writes
-- ───────────────────────────────────────────────────────────────────

CREATE POLICY notif_self_read ON notification_log FOR SELECT
  USING (
    member_id IN (SELECT id FROM members WHERE customer_id = current_customer_id())
    OR customer_id = current_customer_id()
  );

-- ───────────────────────────────────────────────────────────────────
-- BOX_CONTENTS, PICKUP_LOCATIONS, CSA_PRODUCTS: any authenticated user can read
-- ───────────────────────────────────────────────────────────────────

CREATE POLICY boxes_authenticated_read   ON box_contents     FOR SELECT TO authenticated USING (true);
CREATE POLICY pickups_authenticated_read ON pickup_locations FOR SELECT TO authenticated USING (true);
CREATE POLICY products_authenticated_read ON csa_products    FOR SELECT TO authenticated USING (true);

-- ───────────────────────────────────────────────────────────────────
-- AUDIT_LOG: read-only for service role + admins (no public access)
-- (Default deny — no policy = no rows visible to non-service)
-- ───────────────────────────────────────────────────────────────────
-- (RLS enabled, no policies = empty result set for non-service callers)
