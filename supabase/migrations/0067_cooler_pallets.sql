-- ============================================================================
-- 0067_cooler_pallets.sql
--
-- COOLER / PALLET-SPACE BOARD (Todd's ask, 2026-07-03).
--
-- THE PROBLEM: the pack crew needs to know what's in the coolers and — above
-- all — WHAT TO MOVE and WHERE. The farm is always reorganizing, so the board
-- must be low-friction: a MOVE LIST, not a physical map the crew has to babysit
-- with every shuffle.
--
-- Design spec: docs/COOLER_LAYOUT.md ("Design approach for the board (v1)" +
-- the RESOLVED open items + Todd's "Key operating rule"). The decisions that
-- shape THIS table:
--   • Track LOGICAL PALLETS — one per destination (each market / each wholesale
--     order / CSA / other) — NOT physical slot positions. We never log a shuffle.
--   • ZONES, not 22 numbered slots: 'ph_accessible', 'ph_far', 'barn',
--     'van_overflow' (van overflow = a loose short-term list, no slots).
--   • Each pallet carries date_in (FIFO clock), an optional 🔴 move-it flag with
--     an optional reason, and an active/out status. The rules that matter
--     (aisle clear, PH-1/2/3 empty by Fri, Sewickley-Sat-unblocks-South-Side-Sun,
--     CSA-in-Barn-by-Tue) fire as COMPUTED ALERTS on the page — never as manual
--     per-slot tracking here.
--
-- FUTURE HOOK (designed for, NOT wired now): the move_it flag + reason are kept
-- clean and queryable so a later feature can feed 🔴 move-it pallets into
-- CSA-box fill + wholesale availability. No cross-feature wiring in this
-- migration.
--
-- ── ONE TABLE ───────────────────────────────────────────────────────────────
--   cooler_pallets   one row per logical destination pallet. zone + move_it(+
--                    reason) + date_in drive the move list; status active/out
--                    retires a pallet once it ships/empties (out_at stamped).
--
-- RLS: admin/staff-only, gated by is_admin_caller() (migration 0017 — returns
-- TRUE for customers.role IN ('admin','staff'), so BOTH the pack crew (staff)
-- and Todd (admin) get full access — the board must work for the crew on their
-- phones, not just Todd). Same FOR ALL policy pattern as packhouse_handoff
-- (0066) / market_offerings (0054) / member_notices (0043).
--
-- TABLE GRANTS: intentionally NONE. Matching the repo convention for TABLES
-- (verified: no table migration — 0043/0054/0061/0066 — issues an explicit
-- GRANT; Supabase's default privileges already grant authenticated +
-- service_role, and RLS is the gate). This DIFFERS from FUNCTION migrations
-- (0065), where we MUST REVOKE-then-GRANT because a fresh function is
-- world-executable by default.
--
-- Idempotent: CREATE TABLE IF NOT EXISTS, guarded partial index, DROP POLICY
-- IF EXISTS before CREATE POLICY. Safe to re-run. Ends with a verify SELECT.
-- ============================================================================

-- ── cooler_pallets — one logical destination pallet ─────────────────────────
CREATE TABLE IF NOT EXISTS cooler_pallets (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Destination name — e.g. 'Bloomfield market', 'Wholesale — Legume', 'CSA'.
  label          text NOT NULL,
  -- What KIND of destination this pallet serves. Drives the type badge on the
  -- board + the CSA-in-Barn-by-Tuesday alert (which keys off pallet_type='csa').
  pallet_type    text NOT NULL
                   CHECK (pallet_type IN ('market','wholesale','csa','other')),
  -- WHERE it lives right now. Zones, not slots: ph_accessible (near the door /
  -- outbound), ph_far (long-hold far corners), barn, van_overflow (a loose
  -- short-term overflow list — no slots).
  zone           text NOT NULL DEFAULT 'ph_accessible'
                   CHECK (zone IN ('ph_accessible','ph_far','barn','van_overflow')),
  -- FIFO clock. ET-local calendar date the pallet was staged — the farm's
  -- America/New_York "today", never the server's UTC date, so a pallet built
  -- late on a Tuesday evening is dated Tuesday, not Wednesday-UTC.
  date_in        date NOT NULL DEFAULT (now() AT TIME ZONE 'America/New_York')::date,
  -- 🔴 "move it" priority flag + an OPTIONAL reason. Kept clean/queryable for the
  -- future CSA-box-fill / wholesale-availability hook (NOT wired here).
  move_it        boolean NOT NULL DEFAULT false,
  move_it_reason text
                   CHECK (move_it_reason IN ('aging','surplus','customer') OR move_it_reason IS NULL),
  -- active while in play; 'out' once shipped / emptied (retires it from the
  -- board + the move list). out_at stamps when that happened.
  status         text NOT NULL DEFAULT 'active'
                   CHECK (status IN ('active','out')),
  notes          text,
  out_at         timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

-- The board + move list scan ACTIVE pallets only. Partial index keeps that scan
-- tight as retired ('out') pallets accumulate over the season.
CREATE INDEX IF NOT EXISTS cooler_pallets_active_idx
  ON cooler_pallets (status)
  WHERE status = 'active';

ALTER TABLE cooler_pallets ENABLE ROW LEVEL SECURITY;

-- Admin/staff manage the whole table (mirrors packhouse_handoff 0066).
DROP POLICY IF EXISTS cooler_pallets_staff ON cooler_pallets;
CREATE POLICY cooler_pallets_staff ON cooler_pallets
  FOR ALL
  USING (is_admin_caller())
  WITH CHECK (is_admin_caller());

-- ── Verify (returns the table row so the apply is provably persisted) ───────
SELECT tablename
  FROM pg_tables
 WHERE schemaname = 'public'
   AND tablename = 'cooler_pallets';
