-- ═══════════════════════════════════════════════════════════════════
-- Migration 0017: Admin role + admin-bypass RLS (Day 10)
--
-- Adds a role column to `customers` so we can flag Todd (and future
-- staff) as 'admin'. Adds additive, admin-bypass RLS policies to every
-- member-facing table so the admin UI (cookie-aware client) can SELECT
-- and UPDATE rows the member-self policies wouldn't otherwise allow.
--
-- IMPORTANT design notes:
--
--   1. Admin policies are ADDITIVE. The existing member-self policies
--      (migration 0011) stay intact — members continue to see only
--      their own data. Admins additionally see EVERYTHING. Postgres RLS
--      OR-combines policies on the same (table, command), so adding a
--      second permissive policy widens, not narrows, access.
--
--   2. The admin check uses a SECURITY DEFINER helper (`is_admin_caller`)
--      so the subquery against `customers.role` doesn't itself trip
--      RLS recursion. Without SECURITY DEFINER, an admin policy on
--      `customers` that reads from `customers` would recursively re-run
--      RLS and produce confusing planner errors. (The existing
--      `current_customer_id()` helper from 0011 uses the same pattern.)
--
--   3. We seed Todd as admin and add an index on role for non-members
--      (sparse — only the handful of admin/staff rows are stored).
--
--   4. We DO NOT enable audit-trigger replay for the role change itself
--      because audit_log was added in 0009 with triggers on `customers`,
--      so the seed UPDATE below will be captured automatically with a
--      diff showing 'member' → 'admin'.
--
-- Tables covered (12 — matches spec):
--   customers, members, member_preferences, vacation_holds, box_swaps,
--   box_contents, pickup_locations, csa_products, flex_transactions,
--   notification_log, pickup_attendance, audit_log
--
-- audit_log had RLS enabled in 0011 with no policies → effectively
-- locked-out for everyone except service_role. We add a read-only
-- admin policy here so the admin UI can show recent changes.
-- ═══════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────
-- 1. Schema: customers.role
-- ───────────────────────────────────────────────────────────────────

ALTER TABLE customers
  ADD COLUMN role TEXT NOT NULL DEFAULT 'member'
    CHECK (role IN ('member', 'admin', 'staff'));

-- Partial index — sparse on purpose. Only the rows we'd ever lookup
-- by role (non-'member') live in this index.
CREATE INDEX customers_role_idx
  ON customers (role)
  WHERE role <> 'member';

COMMENT ON COLUMN customers.role IS
  'Authorization role. ''admin'' bypasses member-self RLS. ''staff'' reserved for Phase 2. Default ''member''.';

-- Seed Todd as admin. The audit trigger on customers (migration 0009)
-- will capture this update with before/after diff.
UPDATE customers
   SET role = 'admin'
 WHERE email = 'todd@tinyseedfarmpgh.com';

-- ───────────────────────────────────────────────────────────────────
-- 2. Helper: is_admin_caller()
--
-- Returns TRUE iff the calling JWT's email maps to a customer row
-- with role = 'admin' OR 'staff'. SECURITY DEFINER bypasses RLS on
-- the customers lookup so we don't recurse when the admin policies
-- below evaluate against the customers table itself.
-- ───────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.is_admin_caller() RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM customers
     WHERE email = auth.jwt() ->> 'email'
       AND role IN ('admin', 'staff')
  );
$$;

COMMENT ON FUNCTION public.is_admin_caller() IS
  'TRUE if the calling JWT email maps to a customers row with role admin or staff. SECURITY DEFINER to bypass RLS recursion.';

REVOKE EXECUTE ON FUNCTION public.is_admin_caller() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.is_admin_caller() TO authenticated, service_role;

-- ───────────────────────────────────────────────────────────────────
-- 3. Admin-bypass policies (additive — coexist with member-self)
--
-- Pattern: FOR ALL TO authenticated USING (is_admin_caller())
-- WITH CHECK (is_admin_caller()). FOR ALL covers SELECT + INSERT +
-- UPDATE + DELETE. The check + using clauses are identical so an
-- admin can write any row they can read.
-- ───────────────────────────────────────────────────────────────────

-- customers
CREATE POLICY admin_all_customers ON customers FOR ALL TO authenticated
  USING (is_admin_caller())
  WITH CHECK (is_admin_caller());

-- members
CREATE POLICY admin_all_members ON members FOR ALL TO authenticated
  USING (is_admin_caller())
  WITH CHECK (is_admin_caller());

-- member_preferences
CREATE POLICY admin_all_member_preferences ON member_preferences FOR ALL TO authenticated
  USING (is_admin_caller())
  WITH CHECK (is_admin_caller());

-- vacation_holds
CREATE POLICY admin_all_vacation_holds ON vacation_holds FOR ALL TO authenticated
  USING (is_admin_caller())
  WITH CHECK (is_admin_caller());

-- box_swaps
CREATE POLICY admin_all_box_swaps ON box_swaps FOR ALL TO authenticated
  USING (is_admin_caller())
  WITH CHECK (is_admin_caller());

-- box_contents (member-self had no write policy — admins get full write)
CREATE POLICY admin_all_box_contents ON box_contents FOR ALL TO authenticated
  USING (is_admin_caller())
  WITH CHECK (is_admin_caller());

-- pickup_locations (member-self read-only — admins get full write)
CREATE POLICY admin_all_pickup_locations ON pickup_locations FOR ALL TO authenticated
  USING (is_admin_caller())
  WITH CHECK (is_admin_caller());

-- csa_products (member-self read-only — admins get full write)
CREATE POLICY admin_all_csa_products ON csa_products FOR ALL TO authenticated
  USING (is_admin_caller())
  WITH CHECK (is_admin_caller());

-- flex_transactions (member-self read-only — admins can credit/debit)
CREATE POLICY admin_all_flex_transactions ON flex_transactions FOR ALL TO authenticated
  USING (is_admin_caller())
  WITH CHECK (is_admin_caller());

-- notification_log (member-self read-only — admins can read all)
CREATE POLICY admin_all_notification_log ON notification_log FOR ALL TO authenticated
  USING (is_admin_caller())
  WITH CHECK (is_admin_caller());

-- pickup_attendance (member-self read-only — admins can mark attendance)
CREATE POLICY admin_all_pickup_attendance ON pickup_attendance FOR ALL TO authenticated
  USING (is_admin_caller())
  WITH CHECK (is_admin_caller());

-- audit_log (had no policies → locked. Admins now read-only.)
-- FOR SELECT only — audit log is append-only by the trigger, never
-- written by user code.
CREATE POLICY admin_read_audit_log ON audit_log FOR SELECT TO authenticated
  USING (is_admin_caller());
