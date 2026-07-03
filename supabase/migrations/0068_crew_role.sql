-- ============================================================================
-- 0068_crew_role.sql
--
-- LIMITED "CREW" ROLE for the pack/field crew (incl. Spanish-speaking H-2A
-- workers). Todd's ask, 2026-07-03. Crew log in on their own phones and use
-- ONLY the operational pack-house tools (handoff + cooler) — NEVER member PII,
-- financials, pricing, campaigns, or exports.
--
-- This migration does TWO things, BOTH additive and least-privilege:
--
--   1. EXTEND the customers.role CHECK constraint to allow 'crew'.
--      The role column was added in 0017 with an UNNAMED inline CHECK
--      (ADD COLUMN role ... CHECK (role IN ('member','admin','staff'))),
--      which Postgres auto-names `customers_role_check`. We drop that (guarded)
--      and re-add it as an EXPLICITLY-named constraint that also allows 'crew'.
--
--   2. GRANT crew WRITE/READ on EXACTLY the three PII-free pack-house ops tables
--      (packhouse_handoff, packhouse_open_items, cooler_pallets) via an ADDITIVE
--      RLS policy keyed to a NEW helper `is_ops_caller()` (role IN admin/staff/
--      crew). We DO NOT touch `is_admin_caller()` (0017) — it stays admin/staff-
--      only, so a crew row can NEVER bypass member-self RLS on customers,
--      members, preferences, financials, etc. Crew's DB reach is limited to
--      these three ops tables PLUS their own customers row (customers_self_read,
--      0011). NO existing RLS policy is weakened or dropped; the ops policies
--      are purely additive (Postgres OR-combines permissive policies).
--
-- WHY THE RLS GRANT IS REQUIRED: the handoff + cooler pages and their save/edit
-- endpoints all run through the cookie-aware (RLS-scoped) client. is_admin_caller
-- returns FALSE for crew, so without this additive policy a crew member would be
-- able to OPEN the handoff/cooler pages but see NOTHING and every save would be
-- silently dropped by RLS. These three tables hold ZERO member PII (shift logs,
-- carry-forward items, and destination-labelled cooler pallets), so widening
-- them to crew leaks no personal data — it is exactly the operational surface
-- crew needs.
--
-- Idempotent: guarded constraint swap, CREATE OR REPLACE FUNCTION, DROP POLICY
-- IF EXISTS before CREATE POLICY. Safe to re-run. Ends with a verify SELECT that
-- proves 'crew' is an allowed role and the three ops policies exist.
-- ============================================================================

-- ── 1. Extend the customers.role CHECK constraint to include 'crew' ─────────
-- The 0017 inline CHECK was auto-named customers_role_check. Drop it if present
-- (either the auto-named one OR a prior run of this migration), then re-add an
-- explicitly-named constraint covering all four roles.
ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_role_check;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'customers_role_check'
  ) THEN
    ALTER TABLE customers
      ADD CONSTRAINT customers_role_check
      CHECK (role IN ('member', 'admin', 'staff', 'crew'));
  END IF;
END $$;

COMMENT ON COLUMN customers.role IS
  'Authorization role. ''admin''/''staff'' bypass member-self RLS (is_admin_caller). ''crew'' is a LIMITED pack/field role — pack-house ops tools ONLY (is_ops_caller), never member PII/financials/campaigns. Default ''member''.';

-- ── 2. Helper: is_ops_caller() — admin OR staff OR crew ─────────────────────
-- SECURITY DEFINER (bypasses RLS on the customers lookup so an ops policy that
-- reads customers.role never recurses). This is the ONLY function that treats
-- 'crew' as privileged, and it gates ONLY the three ops tables below.
-- is_admin_caller() (0017) is deliberately left UNCHANGED (admin/staff only).
CREATE OR REPLACE FUNCTION public.is_ops_caller() RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM customers
     WHERE email = auth.jwt() ->> 'email'
       AND role IN ('admin', 'staff', 'crew')
  );
$$;

COMMENT ON FUNCTION public.is_ops_caller() IS
  'TRUE if the calling JWT email maps to a customers row with role admin, staff, OR crew. Gates ONLY the pack-house ops tables (packhouse_handoff, packhouse_open_items, cooler_pallets). SECURITY DEFINER to bypass RLS recursion. Distinct from is_admin_caller (admin/staff only).';

REVOKE EXECUTE ON FUNCTION public.is_ops_caller() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.is_ops_caller() TO authenticated, service_role;

-- ── 3. Additive crew (ops) policies on the three PII-free ops tables ────────
-- These COEXIST with the existing admin/staff *_staff policies (0066/0067):
-- Postgres OR-combines permissive policies, so admin/staff access is unchanged
-- and crew gains the same reach on exactly these tables. No member table is
-- touched. FOR ALL covers SELECT + INSERT + UPDATE + DELETE.

DROP POLICY IF EXISTS packhouse_handoff_ops ON packhouse_handoff;
CREATE POLICY packhouse_handoff_ops ON packhouse_handoff
  FOR ALL
  USING (is_ops_caller())
  WITH CHECK (is_ops_caller());

DROP POLICY IF EXISTS packhouse_open_items_ops ON packhouse_open_items;
CREATE POLICY packhouse_open_items_ops ON packhouse_open_items
  FOR ALL
  USING (is_ops_caller())
  WITH CHECK (is_ops_caller());

DROP POLICY IF EXISTS cooler_pallets_ops ON cooler_pallets;
CREATE POLICY cooler_pallets_ops ON cooler_pallets
  FOR ALL
  USING (is_ops_caller())
  WITH CHECK (is_ops_caller());

-- ── Verify (proves the constraint now allows 'crew' + all three ops policies
--    exist). A crew role value must satisfy the constraint; the three policy
--    names must be present. ─────────────────────────────────────────────────
SELECT
  (SELECT pg_get_constraintdef(oid)
     FROM pg_constraint
    WHERE conname = 'customers_role_check')                       AS role_constraint,
  (SELECT count(*) FROM pg_policies
    WHERE schemaname = 'public'
      AND policyname IN ('packhouse_handoff_ops',
                         'packhouse_open_items_ops',
                         'cooler_pallets_ops'))                    AS ops_policy_count;
