-- ═══════════════════════════════════════════════════════════════════
-- Migration 0023: Household sharing (invite couples / roommates)
--
-- A PRIMARY CSA member (the original account owner — a row in
-- `customers`) can invite another person by email to SHARE their
-- account. The invited person gets their OWN magic-link login that
-- resolves to the SAME account: same dashboard, box, swaps, vacation,
-- pickup, and Farm Flex. Only the PRIMARY can add/remove members.
--
-- ─── How access resolution works ────────────────────────────────────
--
-- EVERY member-facing RLS policy keys off `current_customer_id()`
-- (migration 0011). Today that function maps auth.jwt()->>'email' → the
-- customers row with that email. We REPLACE its body with a COALESCE:
--
--   1. own customers row (by email)            ← unchanged for everyone
--   2. else: owner_customer_id of the account  ← NEW: shared household
--      this email is an ACTIVE member of
--
-- The change is purely ADDITIVE. An email that has its own customers row
-- still resolves to that row first (step 1), so EVERY existing member is
-- unaffected. The new step 2 only ever fires for an email that has NO
-- customers row of its own but IS an active account_members row — i.e.
-- an invited household member. Through this single function, the invited
-- person inherits the owner's view across all 12 member-facing tables
-- without touching any of their policies.
--
-- `auth_primary_customer_id()` is a NEW direct-identity helper (NO
-- household fallback). It returns the caller's OWN customers id or NULL.
-- We use it for OWNER-ONLY checks: only the direct email owner (the
-- primary) may write account_members rows — an invited member's email
-- has no customers row, so auth_primary_customer_id() is NULL for them
-- and the owner_write policy denies their writes.
--
-- ─── Why citext + the unique/partial index ──────────────────────────
--
-- member_email is citext (extension enabled in 0001) so 'Jane@x.com'
-- and 'jane@x.com' are the same person — matches how `customers.email`
-- comparisons behave against the JWT claim. UNIQUE(owner, email) blocks
-- the same person being invited twice to one account. The partial index
-- on member_email WHERE status='active' makes the household-resolution
-- lookup in current_customer_id() a cheap index probe.
--
-- ─── RLS policy shape (matches the established patterns) ─────────────
--
--   * SELECT  — everyone ON the account (owner OR invited) can SEE the
--               household list → USING (owner = current_customer_id()).
--   * FOR ALL — only the PRIMARY (direct email owner) can write
--               → USING/WITH CHECK (owner = auth_primary_customer_id()).
--   * admin   — is_admin_caller() bypass, identical to migration 0017.
--
-- Postgres OR-combines permissive policies, so the admin policy widens
-- (never narrows) access, exactly like the 0017 admin-bypass policies.
-- ═══════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────
-- 1. account_members table
-- ───────────────────────────────────────────────────────────────────

CREATE TABLE account_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  member_email citext NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','removed')),
  invited_by citext,
  created_at timestamptz DEFAULT now(),
  UNIQUE (owner_customer_id, member_email)
);

CREATE INDEX account_members_email_active_idx
  ON account_members(member_email) WHERE status='active';

COMMENT ON TABLE account_members IS
  'Household sharing: maps an invited person''s email to the owner''s account. An active row lets that email resolve to owner_customer_id via current_customer_id().';

-- ───────────────────────────────────────────────────────────────────
-- 2. auth_primary_customer_id() — DIRECT identity, NO household fallback
--    Used for owner-only checks (who may write account_members).
-- ───────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION auth_primary_customer_id() RETURNS uuid
  LANGUAGE sql STABLE SECURITY DEFINER
  SET search_path = public, pg_temp
  AS $$
  SELECT id FROM customers WHERE email = auth.jwt()->>'email' LIMIT 1;
$$;

COMMENT ON FUNCTION auth_primary_customer_id() IS
  'The caller''s OWN customers id (by JWT email), or NULL. NO household fallback — used for owner-only RLS checks. SECURITY DEFINER to avoid RLS recursion on customers.';

-- ───────────────────────────────────────────────────────────────────
-- 3. current_customer_id() — REPLACE body with own-first, household-else
--    (was: SELECT id FROM customers WHERE email = jwt email — migration 0011)
-- ───────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION current_customer_id() RETURNS uuid
  LANGUAGE sql STABLE SECURITY DEFINER
  SET search_path = public, pg_temp
  AS $$
  SELECT COALESCE(
    (SELECT id FROM customers WHERE email = auth.jwt()->>'email' LIMIT 1),
    (SELECT owner_customer_id FROM account_members
       WHERE member_email = auth.jwt()->>'email' AND status='active' LIMIT 1)
  );
$$;

COMMENT ON FUNCTION current_customer_id() IS
  'Resolves the caller to a customers id: own row first (unchanged), else the owner_customer_id of an account they were invited to share (household). Drives every member-facing RLS policy.';

-- ───────────────────────────────────────────────────────────────────
-- 3b. email_is_customer(p_email) — RLS-safe existence check
--
-- The member self-service client can only SEE its OWN customers row
-- (policy customers_self_read), so it can't directly tell whether a
-- DIFFERENT email already has a CSA account. The household invite flow
-- needs exactly that ("one email = one account" v1 block). This
-- SECURITY DEFINER helper bypasses RLS to return only a boolean — it
-- leaks no row data, just yes/no — so the invite API can enforce the
-- block without service-role access. citext makes the match
-- case-insensitive, matching how emails are compared everywhere else.
-- ───────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION email_is_customer(p_email citext) RETURNS boolean
  LANGUAGE sql STABLE SECURITY DEFINER
  SET search_path = public, pg_temp
  AS $$
  SELECT EXISTS (SELECT 1 FROM customers WHERE email = p_email);
$$;

COMMENT ON FUNCTION email_is_customer(citext) IS
  'TRUE if the given email already has a customers row. SECURITY DEFINER so the member self-service client can run the household "one email = one account" invite block without seeing foreign rows. Returns only a boolean.';

-- ───────────────────────────────────────────────────────────────────
-- 3c. household_owner() — owner identity for the caller's own account
--
-- The household page needs the PRIMARY's name to render "Shared by
-- [name]" for an invited member. But an invited member can't read the
-- owner's customers row under customers_self_read. This helper returns
-- the owner identity (id, name, email) for the CALLER's resolved account
-- only — it keys off current_customer_id(), so it can never expose
-- anyone else's identity. SECURITY DEFINER to bypass customers RLS.
-- ───────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION household_owner()
  RETURNS TABLE (owner_id uuid, contact_name text, email text)
  LANGUAGE sql STABLE SECURITY DEFINER
  SET search_path = public, pg_temp
  AS $$
  SELECT c.id, c.contact_name, c.email::text
  FROM customers c
  WHERE c.id = current_customer_id();
$$;

COMMENT ON FUNCTION household_owner() IS
  'Owner (primary) identity (id, contact_name, email) for the caller''s resolved account (current_customer_id()). Lets an invited member see who shared the account without RLS exposing other customers. SECURITY DEFINER.';

-- ───────────────────────────────────────────────────────────────────
-- 4. RLS on account_members
-- ───────────────────────────────────────────────────────────────────

ALTER TABLE account_members ENABLE ROW LEVEL SECURITY;

-- Everyone ON the account (owner OR invited member) can SEE the list.
CREATE POLICY account_members_select ON account_members FOR SELECT
  USING (owner_customer_id = current_customer_id());

-- Only the PRIMARY (direct email owner) can INSERT/UPDATE/DELETE.
-- An invited member's email has no customers row, so
-- auth_primary_customer_id() is NULL for them → writes denied.
CREATE POLICY account_members_owner_write ON account_members FOR ALL
  USING (owner_customer_id = auth_primary_customer_id())
  WITH CHECK (owner_customer_id = auth_primary_customer_id());

-- Admin bypass — matches the is_admin_caller() pattern (migration 0017).
CREATE POLICY account_members_admin ON account_members FOR ALL
  USING (is_admin_caller()) WITH CHECK (is_admin_caller());

-- ───────────────────────────────────────────────────────────────────
-- 5. Grants — authenticated callers execute the helpers; the cookie-aware
--    client runs as `authenticated`. service_role bypasses RLS anyway.
-- ───────────────────────────────────────────────────────────────────

REVOKE EXECUTE ON FUNCTION auth_primary_customer_id() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION auth_primary_customer_id() TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION email_is_customer(citext) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION email_is_customer(citext) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION household_owner() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION household_owner() TO authenticated, service_role;
-- current_customer_id() was already granted to authenticated in 0011's
-- CREATE; CREATE OR REPLACE preserves existing grants, but we re-assert
-- to be explicit after replacing the body.
GRANT  EXECUTE ON FUNCTION current_customer_id() TO authenticated, service_role;
