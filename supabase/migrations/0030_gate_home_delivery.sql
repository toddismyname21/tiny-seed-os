-- ═══════════════════════════════════════════════════════════════════
-- Migration 0030: Gate home delivery — close the free self-select leak
--
-- THE PROBLEM (revenue leak):
--   /account/pickup let a MEMBER switch to "home delivery" and set their
--   own delivery_address through change_pickup_location() — with NO charge
--   and NO approval. Owner policy: home delivery = $15/week, ADMIN-approved,
--   paid in Shopify. Free self-select must be closed before the June 10
--   launch.
--
-- WHAT THIS MIGRATION DOES:
--   1. Adds two columns to `members` to track a member's home-delivery
--      REQUEST (so the request flow is idempotent and the chooser can show
--      a "request pending" state):
--        - home_delivery_requested_at      TIMESTAMPTZ NULL
--        - home_delivery_requested_address TEXT NULL
--      A request is "pending" while requested_at IS NOT NULL AND the member
--      does NOT yet have a delivery_address (i.e. an admin hasn't approved
--      + set it). Once an admin sets delivery_address, the request is
--      satisfied; the columns stay as an audit breadcrumb but no longer
--      gate the UI.
--
--   2. REWRITES change_pickup_location() to be ADMIN-GATED on the delivery
--      branch:
--        - Members may switch pickup ↔ pickup freely (capacity-checked, as
--          before).
--        - SETTING a delivery_address (home-delivery branch) now REQUIRES
--          is_admin_caller() = true. A member-initiated delivery set is
--          REJECTED with {error:'delivery_admin_only'} and writes NOTHING.
--        - CLEARING delivery_address by switching back to a pickup stop is
--          still allowed for anyone (a member CAN move OFF delivery onto a
--          stop — that closes, not opens, the leak).
--
--   The function is SECURITY DEFINER, so is_admin_caller() (which reads
--   auth.jwt()->>'email') evaluates the CALLING user's identity, not the
--   definer's. The admin set-delivery API route invokes this through the
--   cookie-aware RLS-scoped client (locals.supabase), so the admin's JWT
--   is present and is_admin_caller() returns true. The member pickup route
--   invokes it through the member's own RLS-scoped client → is_admin_caller()
--   is false → the delivery branch is rejected. The service-role client
--   bypasses RLS but carries no JWT, so it would also be rejected here; admin
--   delivery writes therefore go through the authenticated admin JWT, NOT the
--   service role (intentional — keeps the gate honest).
--
-- WHAT THIS MIGRATION DOES NOT DO (out of scope — PM is planning separately):
--   - NO Shopify charge / invoice / subscription / store-credit logic. The
--     $15/week payment is MANUAL (Todd does it in Shopify). This migration
--     only gates who can SET delivery + records the request.
--
-- The ~12 already-paid home-delivery members (delivery_address set, no
-- pickup, bought the "2026 Home Delivery Options" Shopify product) are
-- UNAFFECTED: this migration neither reads nor writes their delivery_address.
-- They keep delivery; the pickup chooser renders them read-only.
-- ═══════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────
-- 1. Schema: members home-delivery request columns
-- ───────────────────────────────────────────────────────────────────

ALTER TABLE members
  ADD COLUMN IF NOT EXISTS home_delivery_requested_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS home_delivery_requested_address TEXT;

COMMENT ON COLUMN members.home_delivery_requested_at IS
  'When the member REQUESTED home delivery (idempotent marker). NULL = no request. Request is "pending" while this is set AND delivery_address is still NULL (admin has not approved + set delivery yet). Set by /api/account/request-delivery; never charges or sets delivery itself.';
COMMENT ON COLUMN members.home_delivery_requested_address IS
  'The address the member supplied when requesting home delivery. Captured for staff to review at approval time; does NOT become delivery_address until an admin sets it.';

-- ───────────────────────────────────────────────────────────────────
-- 2. change_pickup_location() — admin-gated delivery set
--
-- Signature is UNCHANGED (3 args), so existing callers keep working. The
-- only behavioural change: the home-delivery branch (setting a non-empty
-- delivery_address) now requires is_admin_caller(). Pickup switching is
-- untouched.
-- ───────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.change_pickup_location(
  p_member_id            UUID,
  p_new_location_id      UUID,
  p_new_delivery_address TEXT
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_member_status     TEXT;
  v_current_location  UUID;
  v_max_capacity      INT;
  v_is_active         BOOLEAN;
  v_is_delivery_zone  BOOLEAN;
  v_current_count     INT;
  v_wants_delivery    BOOLEAN;
BEGIN
  IF p_member_id IS NULL THEN
    RETURN json_build_object('error', 'invalid_input');
  END IF;

  -- Is the caller trying to SET a (non-empty) delivery address? That's the
  -- only path the revenue-leak gate blocks for members.
  v_wants_delivery := (p_new_delivery_address IS NOT NULL AND BTRIM(p_new_delivery_address) <> '');

  -- Mutually exclusive inputs.
  IF (p_new_location_id IS NULL AND NOT v_wants_delivery)
     OR (p_new_location_id IS NOT NULL AND v_wants_delivery) THEN
    RETURN json_build_object('error', 'invalid_input');
  END IF;

  -- ── ADMIN GATE on the delivery branch ──────────────────────────────
  -- Setting a delivery_address = opting into PAID ($15/wk), admin-approved
  -- home delivery. Members may NOT do this themselves. is_admin_caller()
  -- reads the CALLER's JWT (SECURITY DEFINER does not change auth context).
  IF v_wants_delivery AND NOT is_admin_caller() THEN
    RETURN json_build_object('error', 'delivery_admin_only');
  END IF;

  -- Lock the member row.
  SELECT status, pickup_location_id
    INTO v_member_status, v_current_location
    FROM members
   WHERE id = p_member_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'member_not_found');
  END IF;

  IF p_new_location_id IS NOT NULL THEN
    -- ── Switch to a PICKUP stop (open to members + admins) ────────────
    -- This BRANCH also CLEARS any delivery_address — moving a member OFF
    -- delivery onto a stop is always allowed (it closes the leak).
    SELECT max_capacity, is_active, is_delivery_zone
      INTO v_max_capacity, v_is_active, v_is_delivery_zone
      FROM pickup_locations
     WHERE id = p_new_location_id;

    IF NOT FOUND OR v_is_active = false THEN
      RETURN json_build_object('error', 'location_not_found');
    END IF;

    -- Capacity check. Count existing live members at this location,
    -- excluding the current caller (so re-saving to the same location
    -- doesn't falsely fail).
    IF v_max_capacity IS NOT NULL AND p_new_location_id <> v_current_location THEN
      SELECT COUNT(*) INTO v_current_count
        FROM members
       WHERE pickup_location_id = p_new_location_id
         AND status IN ('active','paused','onboarding')
         AND id <> p_member_id;

      IF v_current_count + 1 > v_max_capacity THEN
        RETURN json_build_object(
          'error', 'location_full',
          'max_capacity', v_max_capacity,
          'current', v_current_count
        );
      END IF;
    END IF;

    -- Apply: set pickup, clear delivery. When a member (or admin) moves
    -- onto a stop we also clear any pending home-delivery REQUEST — the
    -- member chose a stop instead, so a stale "request pending" marker
    -- would be misleading.
    UPDATE members
       SET pickup_location_id              = p_new_location_id,
           delivery_address                = NULL,
           home_delivery_requested_at      = NULL,
           home_delivery_requested_address = NULL,
           updated_at                      = NOW()
     WHERE id = p_member_id;
  ELSE
    -- ── Home-delivery branch (ADMIN-ONLY, gated above) ────────────────
    -- Setting delivery clears the pickup AND satisfies any pending request
    -- (admin has now approved + set the address).
    UPDATE members
       SET pickup_location_id              = NULL,
           delivery_address                = BTRIM(p_new_delivery_address),
           home_delivery_requested_at      = NULL,
           home_delivery_requested_address = NULL,
           updated_at                      = NOW()
     WHERE id = p_member_id;
  END IF;

  RETURN json_build_object('ok', true);
END;
$$;

COMMENT ON FUNCTION public.change_pickup_location(UUID, UUID, TEXT) IS
  'Atomically changes a member''s pickup_location_id (capacity-checked) or sets delivery_address for home delivery. SETTING a delivery_address requires is_admin_caller() (home delivery is paid + admin-approved); a member-initiated delivery set returns {error:''delivery_admin_only''}. Switching to a pickup stop (and thereby clearing delivery) is open to members. Returns {ok|error, ...}.';

-- EXECUTE grants are unchanged from 0016 (REVOKE FROM PUBLIC; GRANT TO
-- authenticated, service_role). CREATE OR REPLACE preserves them.

-- ───────────────────────────────────────────────────────────────────
-- 3. DEFENSE-IN-DEPTH trigger: block a non-admin member from SETTING
--    delivery_address by ANY path (not just the RPC).
--
-- WHY: members_self_update (migration 0011) is ROW-scoped, not column-
-- scoped — it lets a member UPDATE any column on their own members row. So
-- a member could bypass change_pickup_location() entirely and set
-- delivery_address with a raw `from('members').update({delivery_address})`
-- against the Supabase REST API using their own JWT. The RPC gate alone
-- doesn't close that. This BEFORE UPDATE trigger makes the gate AIRTIGHT:
-- ANY attempt to set delivery_address to a new non-empty value is rejected
-- unless the caller is an admin (is_admin_caller()) OR is a trusted
-- server-side context with no end-user JWT (service_role — Shopify sync,
-- admin-service ops; their auth.jwt() is NULL).
--
-- What is ALLOWED for a member:
--   - CLEARING delivery_address (NULL / '') — moving OFF delivery is fine.
--   - Leaving delivery_address UNCHANGED while editing other columns
--     (e.g. setting the home_delivery_requested_* markers) — only a CHANGE
--     to a non-empty new value is gated.
-- The change_pickup_location() RPC's own admin delivery write passes this
-- trigger (it runs with the admin's JWT under SECURITY DEFINER, so
-- is_admin_caller() is TRUE).
-- ───────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.enforce_delivery_address_admin_only()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_new TEXT := NULLIF(BTRIM(COALESCE(NEW.delivery_address, '')), '');
  v_old TEXT := NULLIF(BTRIM(COALESCE(OLD.delivery_address, '')), '');
BEGIN
  -- Only gate when delivery_address is being CHANGED to a non-empty value.
  -- (Clearing it, or leaving it untouched, is always fine.)
  IF v_new IS NOT NULL AND v_new IS DISTINCT FROM v_old THEN
    -- Trusted server context: no end-user JWT (service_role). Allow.
    IF auth.jwt() IS NULL THEN
      RETURN NEW;
    END IF;
    -- Authenticated end user: must be admin/staff.
    IF NOT is_admin_caller() THEN
      RAISE EXCEPTION 'delivery_admin_only: home delivery is admin-approved and cannot be self-set'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.enforce_delivery_address_admin_only() IS
  'BEFORE UPDATE trigger fn on members: rejects setting delivery_address to a new non-empty value unless the caller is is_admin_caller() or a JWT-less server context (service_role). Defense-in-depth for the home-delivery revenue gate (members_self_update is row-scoped, not column-scoped).';

DROP TRIGGER IF EXISTS trg_enforce_delivery_address_admin_only ON members;
CREATE TRIGGER trg_enforce_delivery_address_admin_only
  BEFORE UPDATE OF delivery_address ON members
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_delivery_address_admin_only();

-- ───────────────────────────────────────────────────────────────────
-- Verification (read-only — safe to leave; the runner returns the last
-- SELECT's rows). NOT wrapped in a transaction with a trailing ROLLBACK,
-- so the DDL above PERSISTS (the runner wraps the whole submission in one
-- implicit txn).
-- ───────────────────────────────────────────────────────────────────

-- 1. The two new columns exist.
SELECT column_name, data_type, is_nullable
  FROM information_schema.columns
 WHERE table_name = 'members'
   AND column_name IN ('home_delivery_requested_at', 'home_delivery_requested_address')
 ORDER BY column_name;

-- 2. The function source mentions the admin gate (sanity check the replace
--    took effect), and the defense-in-depth trigger exists on members.
SELECT
  (SELECT pg_get_functiondef(p.oid) LIKE '%delivery_admin_only%'
     FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname='public' AND p.proname='change_pickup_location')      AS rpc_has_admin_gate,
  EXISTS (
    SELECT 1 FROM pg_trigger
     WHERE tgrelid = 'members'::regclass
       AND tgname = 'trg_enforce_delivery_address_admin_only'
       AND NOT tgisinternal
  )                                                                       AS trigger_installed;
