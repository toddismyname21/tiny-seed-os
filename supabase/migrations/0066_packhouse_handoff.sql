-- ============================================================================
-- 0066_packhouse_handoff.sql
--
-- END-OF-DAY PACK-HOUSE SHIFT HANDOFF (Todd's ask, 2026-07-03).
--
-- THE PROBLEM: "the person working the pack house one day doesn't know what
-- happened yesterday." The pack crew works Mon/Tue/Thu; the FIELD crew takes
-- over the pack house Fri for the weekend markets. Someone fills a handoff at
-- the END of their day; the next person reads it at the START of theirs. The
-- highest-risk transition is Tuesday-pack → Thursday-field: a two-day gap PLUS
-- a crew change, so unresolved items must carry forward across ALL prior days,
-- not just yesterday.
--
-- Design spec: docs/research/PACKHOUSE_HANDOFF_RESEARCH_2026.md (7-block field
-- set, read-side triage digest, multi-day carry-forward, EN/ES).
--
-- ── TWO TABLES ──────────────────────────────────────────────────────────────
--   packhouse_handoff    one row per (log_date, crew_type) shift. UNIQUE on
--                        (log_date, crew_type) so a crew edits ONE handoff per
--                        day (the save endpoint upserts on that key). Captures
--                        identity, status, what-got-packed, cooler state,
--                        issues, top-3 priorities, and the note to the next
--                        crew — plus the incoming person's read-receipt
--                        (read_by / read_at), the I-PASS "synthesis by receiver".
--
--   packhouse_open_items CARRY-FORWARD items that persist across days until
--                        resolved. An item is OPEN while resolved_at IS NULL and
--                        surfaces on EVERY future day's digest (with an age =
--                        today − created_date; the read page escalates 3+ day
--                        items visually). Resolution is an explicit action on
--                        the read side (never auto-cleared) — this is the fix
--                        for the "carryforward zombie" anti-pattern (AP-3).
--
-- RLS: both tables are admin/staff-only, gated by is_admin_caller() (migration
-- 0017 — returns TRUE for customers.role IN ('admin','staff'), so BOTH the pack
-- crew (staff) and Todd (admin) get full access). Same FOR ALL policy pattern as
-- market_offerings (0054) and member_notices (0043).
--
-- TABLE GRANTS: intentionally NONE. Matching the repo convention for TABLES
-- (verified: no table migration — 0043/0054/0061 — issues an explicit GRANT;
-- Supabase's default privileges already grant authenticated + service_role, and
-- RLS is the gate). This DIFFERS from FUNCTION migrations (0065), where we MUST
-- REVOKE-then-GRANT because a fresh function is world-executable by default.
--
-- Idempotent: CREATE TABLE IF NOT EXISTS, guarded indexes, DROP POLICY IF EXISTS
-- before CREATE POLICY, and a DO-guarded UNIQUE constraint. Safe to re-run.
-- Ends with a SELECT proving both tables exist.
-- ============================================================================

-- ── 1. packhouse_handoff — one shift's end-of-day log ───────────────────────
CREATE TABLE IF NOT EXISTS packhouse_handoff (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Block A — identity.
  log_date         date NOT NULL,
  crew_type        text NOT NULL CHECK (crew_type IN ('pack','field')),
  author_name      text,
  next_crew        text,
  headcount        int,
  -- Block B — shift status.
  shift_status     text NOT NULL DEFAULT 'normal'
                     CHECK (shift_status IN ('normal','attention','urgent')),
  summary          text,
  -- Block C — what got packed (flexible jsonb: per-channel done-vs-target) +
  -- whether the plan was completed.
  plan_completed   text CHECK (plan_completed IN ('yes','partial','no')),
  packed           jsonb,
  -- Block D — cooler & storage state (references PH cooler / Barn cooler / truck
  -- by name; see docs/COOLER_LAYOUT.md — the full pallet board is a separate,
  -- future feature. Here the cooler state is lightweight: temps + free text).
  ph_cooler_temp   numeric,
  barn_cooler_temp numeric,
  truck_used       boolean NOT NULL DEFAULT false,
  truck_temp       numeric,
  cooler_notes     text,
  use_first        text,
  running_low      text,
  -- Block E — issues (each free text; NULL/blank = none, revealed only on "Yes"
  -- in the fill UI) + an optional photo URL.
  quality_issue    text,
  equipment_issue  text,
  safety_issue     text,
  photo_url        text,
  -- Block F — top-3 priorities for the next crew (jsonb array of ≤3 strings).
  -- (Carry-forward open items live in packhouse_open_items, below.)
  priorities       jsonb,
  -- Block G — free-text note to the next crew.
  note_next_crew   text,
  -- Read-side acknowledgment (I-PASS "synthesis by receiver").
  read_by          text,
  read_at          timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- ONE handoff per crew per day → the save endpoint upserts on this key.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'packhouse_handoff_date_crew_uniq'
  ) THEN
    ALTER TABLE packhouse_handoff
      ADD CONSTRAINT packhouse_handoff_date_crew_uniq UNIQUE (log_date, crew_type);
  END IF;
END $$;

-- The digest loads the most-recent handoff by date; index for that ordering.
CREATE INDEX IF NOT EXISTS packhouse_handoff_date_idx
  ON packhouse_handoff (log_date DESC);

ALTER TABLE packhouse_handoff ENABLE ROW LEVEL SECURITY;

-- Admin/staff manage the whole table (mirrors market_offerings 0054).
DROP POLICY IF EXISTS packhouse_handoff_staff ON packhouse_handoff;
CREATE POLICY packhouse_handoff_staff ON packhouse_handoff
  FOR ALL
  USING (is_admin_caller())
  WITH CHECK (is_admin_caller());

-- ── 2. packhouse_open_items — carry-forward items until resolved ────────────
CREATE TABLE IF NOT EXISTS packhouse_open_items (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  body               text NOT NULL,
  owner              text,
  -- The handoff this item was raised on (nullable link kept even if that
  -- handoff row is ever deleted, so the item's age/history survives).
  created_handoff_id uuid REFERENCES packhouse_handoff(id) ON DELETE SET NULL,
  -- ET-local calendar date the item was raised — the age clock the digest reads
  -- (age = today − created_date; escalate at 3+ days). Default is the farm's
  -- America/New_York "today", never the server's UTC date, so an item raised
  -- late on a Tuesday evening is dated Tuesday, not Wednesday-UTC.
  created_date       date NOT NULL DEFAULT (now() AT TIME ZONE 'America/New_York')::date,
  resolved_at        timestamptz,
  resolved_by        text,
  created_at         timestamptz NOT NULL DEFAULT now()
);

-- The digest scans OPEN items (resolved_at IS NULL) across ALL days, oldest
-- first. Partial index keeps that scan tight as resolved items accumulate.
CREATE INDEX IF NOT EXISTS packhouse_open_items_open_idx
  ON packhouse_open_items (created_date)
  WHERE resolved_at IS NULL;

ALTER TABLE packhouse_open_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS packhouse_open_items_staff ON packhouse_open_items;
CREATE POLICY packhouse_open_items_staff ON packhouse_open_items
  FOR ALL
  USING (is_admin_caller())
  WITH CHECK (is_admin_caller());

-- ── Verify (returns both table rows so the apply is provably persisted) ─────
SELECT tablename
  FROM pg_tables
 WHERE schemaname = 'public'
   AND tablename IN ('packhouse_handoff', 'packhouse_open_items')
 ORDER BY tablename;
