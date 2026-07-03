-- ============================================================================
-- 0069_pick_pack_progress.sql
--
-- LIVE, PER-LINE PICK & PACK PROGRESS (Todd's ask, 2026-07-03).
--
-- THE PROBLEM (Todd's words): "confusion about what has been done, and if
-- someone did it." The printable Pick & Pack sheets (/admin/pick-pack/[week])
-- aggregate demand PER CROP across CSA + market + wholesale, but a paper tick
-- box can't tell the crew — or Todd watching from his phone — WHICH lines are
-- done and WHO did them, synced across devices. This table backs a live,
-- cross-device status for every rendered pick/pack line.
--
-- ── ONE TABLE ────────────────────────────────────────────────────────────────
--   pick_pack_progress   one row per (week, section, day-scope, market, line).
--                        A "line" is a per-crop DEMAND line the sheet already
--                        renders — NOT a member (zero PII: crop name + status +
--                        the crew display name who last touched it).
--
--   section  = which sheet the line lives on. 'harvest' is the PICK view (the
--              page's ?view=overall) whose lines flow todo→harvesting→done; the
--              other three are PACK views whose lines flow todo→packed.
--   scope_day= the harvest-day scope the sheet was rendered under ('all' whole
--              week, or 'mon'/'thu' — Monday harvest → Tue+Wed, Thursday →
--              Sat+Sun). A line's identity is per (week, section, scope, market).
--   market_id= the pickup_locations UUID for section='market'. For every OTHER
--              section (and for an untagged market group) it is the all-zero
--              SENTINEL uuid, NOT NULL — see the UNIQUE note below.
--   line_key = the STABLE per-crop key the page derives from the crop / harvest-
--              crop name (+ unit), identical server↔client, stable across
--              reloads and weeks (see lib/pick-pack.ts pickPackLineKey). NEVER an
--              array index.
--
-- ── WHY market_id IS A NOT-NULL SENTINEL (not NULL) ──────────────────────────
-- The upsert key is (week_date, section, scope_day, market_id, line_key). SQL
-- UNIQUE treats NULLs as DISTINCT, so a nullable market_id would let duplicate
-- non-market rows slip past the constraint, and PostgREST's on_conflict (used by
-- the save endpoint's .upsert({ onConflict })) can only name a plain column list
-- — it cannot infer a partial or COALESCE-expression index. Making market_id
-- NOT NULL with an all-zero sentinel default gives ONE ordinary composite UNIQUE
-- constraint that both dedupes correctly AND is directly nameable by on_conflict.
-- The section column keeps a 'market' sentinel row distinct from a 'csa' sentinel
-- row, and there is only ever one untagged market group per (week, scope), so the
-- sentinel never collapses two real lines together.
--
-- RLS: gated by is_ops_caller() (migration 0068 — admin/staff/CREW), NOT
-- is_admin_caller(), so the pack/field crew can READ the board and WRITE their
-- own check-offs from their phones. The three columns hold zero member PII (crop
-- name, status, and a crew/staff DISPLAY NAME), the same operational surface crew
-- already reach on handoff + cooler.
--
-- Realtime: the table is added to the supabase_realtime publication so every
-- device sees a check-off the instant it lands (Todd watches from his phone).
--
-- Idempotent: CREATE TABLE IF NOT EXISTS, guarded UNIQUE + publication add,
-- CREATE INDEX IF NOT EXISTS, DROP POLICY IF EXISTS before CREATE. Safe to
-- re-run. Ends with a verify SELECT proving the table, constraint, ops policy,
-- and realtime membership all exist.
-- ============================================================================

-- ── 1. The table ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pick_pack_progress (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week_date     date NOT NULL,
  -- 'harvest' = the PICK view (page ?view=overall). The rest are PACK views.
  section       text NOT NULL
                  CHECK (section IN ('harvest', 'csa', 'wholesale', 'market')),
  scope_day     text NOT NULL DEFAULT 'all'
                  CHECK (scope_day IN ('all', 'mon', 'thu')),
  -- pickup_locations UUID for section='market'; the all-zero SENTINEL for every
  -- other section (see header). NOT NULL so the composite UNIQUE dedupes and the
  -- save endpoint's on_conflict can name it directly.
  market_id     uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
  -- STABLE per-crop key (lib/pick-pack.ts pickPackLineKey). Never an array index.
  line_key      text NOT NULL,
  -- 'harvest' lines: todo→harvesting→done. PACK lines: todo→packed.
  status        text NOT NULL DEFAULT 'todo'
                  CHECK (status IN ('todo', 'harvesting', 'done', 'packed')),
  -- Captured when a PICK line is marked 'done' — the ACTUAL harvested qty vs the
  -- sheet's target (null for pack lines / todo / harvesting).
  actual_qty    numeric,
  -- The crew/staff DISPLAY NAME (+ customers.id) who last set the status. This is
  -- the "who did it" that answers Todd's complaint. worked_by is a farm-worker
  -- name, never a CSA member — no member PII on this table.
  worked_by     text,
  worked_by_id  uuid,
  updated_at    timestamptz NOT NULL DEFAULT now(),
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ── 2. ONE row per (week, section, scope, market, line) → upsert key ─────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pick_pack_progress_line_uniq'
  ) THEN
    ALTER TABLE pick_pack_progress
      ADD CONSTRAINT pick_pack_progress_line_uniq
      UNIQUE (week_date, section, scope_day, market_id, line_key);
  END IF;
END $$;

-- The loader reads every line for a rendered sheet in ONE query; index the read.
CREATE INDEX IF NOT EXISTS pick_pack_progress_sheet_idx
  ON pick_pack_progress (week_date, section, scope_day, market_id);

-- ── 3. RLS — admin/staff/CREW via is_ops_caller() (migration 0068) ──────────
ALTER TABLE pick_pack_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pick_pack_progress_ops ON pick_pack_progress;
CREATE POLICY pick_pack_progress_ops ON pick_pack_progress
  FOR ALL
  USING (is_ops_caller())
  WITH CHECK (is_ops_caller());

COMMENT ON TABLE pick_pack_progress IS
  'Live per-line status for the Pick & Pack sheets. One row per (week_date, section, scope_day, market_id, line_key). section=''harvest'' is the PICK view (todo→harvesting→done); csa/wholesale/market are PACK views (todo→packed). Zero member PII (crop line + status + crew display name). RLS: is_ops_caller (admin/staff/crew). In the supabase_realtime publication.';

-- ── 4. Realtime — publish so every device updates instantly ─────────────────
-- Guarded so a re-run never errors ("table is already member of publication").
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
     WHERE pubname = 'supabase_realtime'
       AND schemaname = 'public'
       AND tablename = 'pick_pack_progress'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.pick_pack_progress;
  END IF;
END $$;

-- ── Verify — proves the table, upsert constraint, ops policy, and realtime
--    membership all persisted. ─────────────────────────────────────────────
SELECT
  (SELECT count(*) FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'pick_pack_progress')      AS table_exists,
  (SELECT pg_get_constraintdef(oid) FROM pg_constraint
    WHERE conname = 'pick_pack_progress_line_uniq')                        AS upsert_constraint,
  (SELECT count(*) FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'pick_pack_progress'
      AND policyname = 'pick_pack_progress_ops')                           AS ops_policy_count,
  (SELECT count(*) FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'pick_pack_progress')                                AS in_realtime_pub;
