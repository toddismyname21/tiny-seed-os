-- ═══════════════════════════════════════════════════════════════════
-- Migration 0029: Stop Notes / By-Stop Chat (Phase 0 — read-only)
--
-- Spec: docs/specs/CSA_BY_STOP_CHAT_SPEC.md
--
-- Why this migration exists
-- ─────────────────────────
-- Todd chose the spec's phased recommendation: ship a READ-ONLY "Stop
-- Notes" board now (staff/host post; members read), and only open it to
-- member-to-member posting LATER, once demand is proven and he's ready to
-- own the moderation burden. The KEY constraint Todd set: this schema must
-- upgrade to open chat (Phase 1) with ZERO schema change — only the RLS
-- INSERT policy differs.
--
-- What this builds (Phase 0)
-- ──────────────────────────
--   1. stop_messages         — one note per row, scoped by pickup_location_id.
--   2. stop_message_reports   — the Phase-1 reporting table + indexes, built
--                               NOW so Phase 1 drops in cleanly (NO reporting
--                               UI ships in Phase 0; the table just exists).
--   3. current_member_location_ids() — SECURITY DEFINER helper returning the
--                               caller's pickup_location_ids across their
--                               active/paused/onboarding shares.
--   4. RLS (Phase 0):
--        · member SELECT — non-hidden messages for the caller's location(s)
--        · admin  ALL    — full read/insert/update/delete (is_admin_caller())
--        · NO member INSERT policy yet — that is the ONLY change Phase 1 adds.
--   5. updated_at + audit triggers (consistent with 0010 / 0019).
--   6. Realtime publication membership (so the future Phase-1 live feed and
--      the optional Phase-0 read realtime both work without a later migration).
--
-- ─── How Phase 1 (open member posting) upgrades from here ─────────────
--   A LATER migration (no schema change to these tables) adds ONLY:
--     · stop_messages_member_insert  (member can INSERT author_role='member'
--                                     into their own location)
--     · a hide_own_message(uuid) SECURITY DEFINER RPC (author self-delete)
--     · an AFTER-INSERT trigger on stop_message_reports that bumps
--       report_count and auto-hides at the threshold.
--   The columns those features need (author_role, hidden_at/by/reason,
--   report_count, the reports table) ALL exist as of THIS migration, so the
--   Phase-1 migration is policy + trigger + RPC only.
--
-- Household sharing: current_customer_id() (replaced in 0023) already
-- collapses an invited household member to the OWNER's customer_id, so a
-- household reads exactly the owner's stop(s). No extra handling needed —
-- current_member_location_ids() builds on current_customer_id().
--
-- Forward-only. Apply via the Supabase Management API
-- (scripts/migrate-csa/run_migration.py).
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

-- ───────────────────────────────────────────────────────────────────
-- 1. stop_messages — one note per row, scoped to a pickup location.
--
-- Phase 0 only ever inserts author_role IN ('staff','host') via the admin
-- path. The 'member' value + the member-insert plumbing exist in the schema
-- so Phase 1 needs no column change. body 1..1000 chars (matches spec);
-- soft-delete via hidden_at (never hard-delete by default — preserves the
-- audit trail and lets staff un-hide). report_count is denormalized so the
-- Phase-1 auto-hide trigger + the feed query never aggregate the reports
-- table on a read.
-- ───────────────────────────────────────────────────────────────────

CREATE TABLE stop_messages (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pickup_location_id  UUID NOT NULL REFERENCES pickup_locations(id) ON DELETE CASCADE,
  -- The customers row that authored it (household-resolved at insert time).
  author_customer_id  UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  -- Denormalized display name captured at post time ("Jane M." or "Todd").
  -- Stored so a later name change / account deletion can't rewrite history,
  -- and so the feed renders with zero joins.
  author_display_name TEXT NOT NULL
                        CHECK (length(btrim(author_display_name)) BETWEEN 1 AND 80),
  -- Author role at post time. Phase 0 = 'staff' | 'host' only (enforced by
  -- the admin path, not a DB check — 'member' must stay legal for Phase 1).
  author_role         TEXT NOT NULL DEFAULT 'member'
                        CHECK (author_role IN ('member','staff','host')),
  body                TEXT NOT NULL
                        CHECK (length(btrim(body)) BETWEEN 1 AND 1000),
  -- Soft-delete / moderation. NULL = visible. Set = hidden.
  hidden_at           TIMESTAMPTZ,
  hidden_by           UUID REFERENCES customers(id) ON DELETE SET NULL,
  hidden_reason       TEXT CHECK (hidden_reason IS NULL
                        OR hidden_reason IN ('staff','auto_reports','author')),
  -- Auto-hide bookkeeping (denormalized active-report count; Phase 1 uses it).
  report_count        INT NOT NULL DEFAULT 0 CHECK (report_count >= 0),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE stop_messages IS
  'Per-pickup-location note board. Phase 0: staff/host authored, members read-only. Upgrades to open member chat (Phase 1) by adding ONLY a member-insert RLS policy — no schema change.';
COMMENT ON COLUMN stop_messages.author_display_name IS
  'Denormalized at post time ("Jane M." for members, "Todd"/host name for staff). First-name + last-initial only by privacy convention — never a full last name.';
COMMENT ON COLUMN stop_messages.author_role IS
  'Role at post time: member|staff|host. Phase 0 only writes staff/host; member is reserved for Phase 1 (kept legal so Phase 1 needs no schema change).';
COMMENT ON COLUMN stop_messages.hidden_at IS
  'Soft-delete timestamp. NULL = visible to members. Set = hidden (only staff see it). Never hard-deleted by default.';
COMMENT ON COLUMN stop_messages.report_count IS
  'Denormalized count of active reports. Phase 1''s auto-hide trigger maintains it; Phase 0 leaves it at 0.';

CREATE INDEX stop_messages_loc_created_idx
  ON stop_messages (pickup_location_id, created_at DESC);

-- Partial index for the default member feed (visible messages only).
CREATE INDEX stop_messages_loc_visible_idx
  ON stop_messages (pickup_location_id, created_at DESC)
  WHERE hidden_at IS NULL;

CREATE INDEX stop_messages_author_idx
  ON stop_messages (author_customer_id);

-- ───────────────────────────────────────────────────────────────────
-- 2. stop_message_reports — Phase-1 reporting table, created NOW so the
--    Phase-1 migration is policy/trigger/RPC only. NO reporting UI ships in
--    Phase 0; this table simply exists (and stays empty) until then.
--
-- UNIQUE(message_id, reporter_customer_id) prevents one member inflating a
-- report count (brigading). Phase 1 will add an AFTER-INSERT trigger here to
-- bump stop_messages.report_count and auto-hide at the threshold.
-- ───────────────────────────────────────────────────────────────────

CREATE TABLE stop_message_reports (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id           UUID NOT NULL REFERENCES stop_messages(id) ON DELETE CASCADE,
  reporter_customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  reason               TEXT CHECK (reason IS NULL OR reason IN
                         ('spam','harassment','offensive','off_topic','other')),
  note                 TEXT CHECK (note IS NULL OR length(note) <= 500),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- One report per (message, reporter) — prevents brigading inflation.
  UNIQUE (message_id, reporter_customer_id)
);

COMMENT ON TABLE stop_message_reports IS
  'Phase-1 member reporting of stop_messages. Created in 0029 (Phase 0) so the Phase-1 upgrade is policy/trigger/RPC only — NO reporting UI in Phase 0; stays empty until then.';

CREATE INDEX stop_message_reports_message_idx
  ON stop_message_reports (message_id);

-- ───────────────────────────────────────────────────────────────────
-- 3. updated_at maintenance (reuses set_updated_at() from migration 0010).
-- ───────────────────────────────────────────────────────────────────

CREATE TRIGGER trg_stop_messages_updated_at
  BEFORE UPDATE ON stop_messages
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- ───────────────────────────────────────────────────────────────────
-- 4. Audit trail — every staff post/edit/hide is reviewable (matches the
--    0019 delivery-tracking posture). Reuses log_audit_event() from 0009.
-- ───────────────────────────────────────────────────────────────────

CREATE TRIGGER audit_stop_messages
  AFTER INSERT OR UPDATE OR DELETE ON stop_messages
  FOR EACH ROW EXECUTE FUNCTION log_audit_event();

CREATE TRIGGER audit_stop_message_reports
  AFTER INSERT OR UPDATE OR DELETE ON stop_message_reports
  FOR EACH ROW EXECUTE FUNCTION log_audit_event();

-- ───────────────────────────────────────────────────────────────────
-- 5. current_member_location_ids() — SECURITY DEFINER helper.
--
-- Returns the set of pickup_location_ids the caller belongs to across ALL
-- their shares whose status is active/paused/onboarding. Built on
-- current_customer_id() (replaced in 0023 to collapse households to the
-- owner), so a household reads exactly the owner's stop(s).
--
-- Status filter: a cancelled/lapsed member at a stop should NOT keep reading
-- that stop's notes. This matches the dashboard's liveStatuses set. (0019's
-- delivery policy did not status-filter because a stale row there was
-- harmless; for a notes board we want it tighter.)
--
-- SECURITY DEFINER + SET search_path so the subquery against members /
-- current_customer_id() doesn't itself trip RLS recursion when the
-- stop_messages SELECT policy calls it.
-- ───────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION current_member_location_ids()
  RETURNS SETOF uuid
  LANGUAGE sql STABLE SECURITY DEFINER
  SET search_path TO 'public', 'pg_temp'
  AS $$
    SELECT DISTINCT pickup_location_id
    FROM members
    WHERE customer_id = current_customer_id()
      AND pickup_location_id IS NOT NULL
      AND status IN ('active','paused','onboarding');
  $$;

COMMENT ON FUNCTION current_member_location_ids() IS
  'The set of pickup_location_ids the caller belongs to (active/paused/onboarding shares). Built on current_customer_id() so households resolve to the owner''s stop(s). SECURITY DEFINER to avoid RLS recursion in the stop_messages read policy.';

REVOKE EXECUTE ON FUNCTION current_member_location_ids() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION current_member_location_ids() TO authenticated, service_role;

-- ───────────────────────────────────────────────────────────────────
-- 6. RLS — Phase 0.
--
-- READ : a member sees VISIBLE (non-hidden) messages in their own stop(s).
-- ADMIN: full bypass (read all incl. hidden, insert staff/host notes,
--        edit/hide, hard-delete) via is_admin_caller() (migration 0017).
--
-- THERE IS DELIBERATELY NO MEMBER INSERT POLICY. With RLS enabled and no
-- permissive INSERT policy for `authenticated`, a member INSERT is DENIED by
-- default — members are read-only in Phase 0. Phase 1 adds the member-insert
-- policy and NOTHING ELSE on this table.
-- ───────────────────────────────────────────────────────────────────

ALTER TABLE stop_messages        ENABLE ROW LEVEL SECURITY;
ALTER TABLE stop_message_reports ENABLE ROW LEVEL SECURITY;

-- READ: visible messages in the caller's own stop(s) only. Hidden messages
-- are invisible to members (only the admin policy returns them).
CREATE POLICY stop_messages_member_read ON stop_messages
  FOR SELECT
  TO authenticated
  USING (
    hidden_at IS NULL
    AND pickup_location_id IN (SELECT current_member_location_ids())
  );

-- ADMIN: full bypass — read all (incl. hidden), insert staff/host notes,
-- edit, hide/unhide, hard-delete.
CREATE POLICY stop_messages_admin_all ON stop_messages
  FOR ALL
  TO authenticated
  USING (is_admin_caller())
  WITH CHECK (is_admin_caller());

-- stop_message_reports — admin-only in Phase 0 (no member reporting yet).
-- Phase 1 will add a member-insert policy (report your own stop's messages).
CREATE POLICY stop_message_reports_admin_all ON stop_message_reports
  FOR ALL
  TO authenticated
  USING (is_admin_caller())
  WITH CHECK (is_admin_caller());

-- ───────────────────────────────────────────────────────────────────
-- 7. Realtime publication.
--
-- Add stop_messages now so a future Phase-1 live feed (and the optional
-- Phase-0 read-side realtime) works without a later migration. Realtime
-- respects RLS for the authenticated role, so a member can only receive
-- rows their read policy already permits. Mirrors 0019's approach.
-- ───────────────────────────────────────────────────────────────────

ALTER PUBLICATION supabase_realtime ADD TABLE stop_messages;

COMMIT;
