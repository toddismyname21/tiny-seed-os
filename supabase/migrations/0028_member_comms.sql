-- ═══════════════════════════════════════════════════════════════════
-- Migration 0028: Per-member communication log (member_comms)
--
-- A simple, append-style ledger of every interaction Frankie/Todd have
-- with a member — a phone call, a text, an email reply, or a free-form
-- note. The point is that NO conversation gets lost: when a member calls
-- about a missed box or a vacation hold, the admin logs a one-line
-- summary against that member's record, and the next person to talk to
-- that member can see the full history on the member-detail page.
--
-- Distinct from notification_log (which is the SYSTEM's outbound send
-- ledger — magic links, weekly emails, delivery alerts). member_comms is
-- the HUMAN interaction log, written by hand from the admin UI.
--
-- ─── Columns ─────────────────────────────────────────────────────────
--   id            uuid PK
--   customer_id   uuid → customers(id) ON DELETE CASCADE. We key on the
--                 CUSTOMER (the person), not a specific membership row,
--                 so the log survives across seasons / multiple shares.
--                 CASCADE: if a customer is deleted, their comms history
--                 goes with them (no orphaned rows).
--   author_email  text — the admin/staff who logged the entry. Nullable
--                 only as a defensive default; the API always sets it to
--                 the logged-in admin's email.
--   channel       text — how the interaction happened. CHECK-constrained
--                 to a small enum so the UI can render a consistent badge.
--   summary       text NOT NULL — the actual note (what was discussed).
--   created_at    timestamptz default now()
--
-- ─── RLS ─────────────────────────────────────────────────────────────
--   Admin/staff full access via is_admin_caller() (migration 0017 —
--   already covers role IN ('admin','staff')). Service role bypasses RLS.
--   There is intentionally NO member/anon policy: members never read or
--   write their own comms log (it's internal staff notes).
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS member_comms (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id   UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  author_email  TEXT,
  channel       TEXT NOT NULL DEFAULT 'note'
                  CHECK (channel IN ('email', 'phone', 'text', 'note', 'other')),
  summary       TEXT NOT NULL CHECK (length(trim(summary)) > 0),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE member_comms IS
  'Per-member HUMAN interaction log (calls/texts/emails/notes) written by admin/staff from the member-detail page. Distinct from notification_log (system outbound sends). Keyed on customer_id so it spans seasons.';

-- Newest-first listing per member is the only read pattern — composite
-- index on (customer_id, created_at DESC) covers it.
CREATE INDEX IF NOT EXISTS member_comms_customer_created_idx
  ON member_comms (customer_id, created_at DESC);

ALTER TABLE member_comms ENABLE ROW LEVEL SECURITY;

-- Admin/staff full access (read + write). is_admin_caller() (migration
-- 0017, SECURITY DEFINER) is TRUE for role IN ('admin','staff'). The
-- service-role client bypasses RLS entirely. No member/anon policy.
DROP POLICY IF EXISTS admin_all_member_comms ON member_comms;
CREATE POLICY admin_all_member_comms ON member_comms FOR ALL TO authenticated
  USING (is_admin_caller())
  WITH CHECK (is_admin_caller());

-- ───────────────────────────────────────────────────────────────────
-- Verification (returned by the Management API runner). NOT wrapped in a
-- transaction with a trailing ROLLBACK — the DDL above must PERSIST, and
-- the runner wraps the whole submission in one implicit txn. These are
-- read-only SELECTs, so they're safe to leave; the last SELECT's rows
-- are what the runner prints.
-- ───────────────────────────────────────────────────────────────────
SELECT
  c.relname              AS table_name,
  c.relrowsecurity       AS rls_enabled,
  c.relforcerowsecurity  AS rls_forced
FROM pg_class c
WHERE c.relname = 'member_comms';

SELECT
  pol.polname  AS policy_name,
  pol.polcmd   AS cmd,            -- 'r'=SELECT, 'a'=INSERT, 'w'=UPDATE, 'd'=DELETE, '*'=ALL
  pg_get_expr(pol.polqual, pol.polrelid)      AS using_expr,
  pg_get_expr(pol.polwithcheck, pol.polrelid) AS with_check_expr
FROM pg_policy pol
WHERE pol.polrelid = 'member_comms'::regclass
ORDER BY pol.polname;
