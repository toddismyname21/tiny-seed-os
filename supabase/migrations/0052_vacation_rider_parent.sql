-- ════════════════════════════════════════════════════════════════════
-- Migration 0052 — Vacation-hold RIDER ↦ PARENT foreign key
-- ════════════════════════════════════════════════════════════════════
--
-- WHY ─────────────────────────────────────────────────────────────────
-- An add-on "rider" vacation hold (created by cascadeVacationHoldToAddOns
-- in src/lib/vacation-cascade.ts when a BOX hold is placed) used to be
-- matched back to its box hold on the CANCEL path by a fragile heuristic:
--   same customer  +  date-range OVERLAP  +  the rider reason marker
--                       "[auto: rides the held box]".
--
-- That heuristic mis-fires when a member has TWO overlapping box holds:
-- cancelling one box hold would cancel riders that belong to the OTHER
-- box hold (they all overlap, all carry the marker, all share the
-- customer). The riders are then orphaned/over-cancelled.
--
-- FIX ─────────────────────────────────────────────────────────────────
-- Give each rider a real `parent_hold_id` FK pointing at the BOX hold it
-- rides. The create cascade stamps it; the cancel cascade selects riders
-- by `parent_hold_id = <cancelled box hold id>` (no date math, no marker
-- guessing). ON DELETE CASCADE means a hard-deleted box hold takes its
-- riders with it (we soft-cancel via status, so this is just a safety net).
--
-- NULLABLE: only riders set this column. Member-booked holds and box holds
-- leave it NULL. The CHECK keeps a row from pointing at itself.
--
-- BACKFILL ────────────────────────────────────────────────────────────
-- Existing riders (reason LIKE '%[auto: rides the held box]%') are linked
-- to their box hold CONSERVATIVELY — only where the match is UNAMBIGUOUS:
-- exactly ONE box hold for the same customer, exactly matching the rider's
-- [start_date, end_date], in a non-cancelled state. Riders that match zero
-- or more-than-one candidate box hold are LEFT NULL (we will not guess).
-- This links the known 6/15–6/19 add-on rider for Naomi Anderson.
--
-- IDEMPOTENT: column / index adds use IF NOT EXISTS; the constraint add is
-- guarded by a DO-block; the backfill only fills rows still NULL, so a
-- re-run is a no-op.
--
-- RLS: unchanged. parent_hold_id is written through the existing
-- vacation_self_all policy (migration 0011) on the cookie-scoped client,
-- exactly like every other rider column today.
-- ════════════════════════════════════════════════════════════════════

-- ── 1. Column ───────────────────────────────────────────────────────
ALTER TABLE vacation_holds
  ADD COLUMN IF NOT EXISTS parent_hold_id uuid
  REFERENCES vacation_holds(id) ON DELETE CASCADE;

-- A hold must not be its own parent. Guarded so re-running is a no-op
-- (ADD CONSTRAINT has no IF NOT EXISTS in stable Postgres).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'vacation_holds_parent_not_self'
  ) THEN
    ALTER TABLE vacation_holds
      ADD CONSTRAINT vacation_holds_parent_not_self
      CHECK (parent_hold_id IS NULL OR parent_hold_id <> id);
  END IF;
END $$;

-- ── 2. Index ────────────────────────────────────────────────────────
-- The cancel cascade looks up riders by parent_hold_id; index it.
CREATE INDEX IF NOT EXISTS vacation_holds_parent_idx
  ON vacation_holds(parent_hold_id);

-- ── 3. Backfill existing riders ─────────────────────────────────────
-- Link each NULL-parent rider to its box hold ONLY when exactly ONE box
-- hold of the SAME customer matches the rider's dates exactly and is in a
-- live (non-cancelled) state. Ambiguous (0 or 2+ candidates) → left NULL.
--
-- "Box hold" = a hold on a members row whose share_type is one of the box
-- types cascadeVacationHoldToAddOns cascades for (NOT add_on / flex). We
-- resolve the customer through members.customer_id on both sides.
WITH rider AS (
  SELECT
    vh.id           AS rider_id,
    m.customer_id   AS customer_id,
    vh.start_date,
    vh.end_date
  FROM vacation_holds vh
  JOIN members m ON m.id = vh.member_id
  WHERE vh.parent_hold_id IS NULL
    AND vh.reason LIKE '%[auto: rides the held box]%'
    AND m.share_type = 'add_on'
    AND vh.status IN ('scheduled', 'active')
),
candidate AS (
  -- For each rider, count + capture the box hold(s) it could ride.
  SELECT
    r.rider_id,
    COUNT(box.id)                            AS n,
    -- min(id) is deterministic but only USED when n = 1.
    (ARRAY_AGG(box.id ORDER BY box.id))[1]   AS box_hold_id
  FROM rider r
  JOIN members bm
    ON bm.customer_id = r.customer_id
   AND bm.share_type IN ('summer_veg', 'spring_veg', 'fall_veg', 'flower', 'wholesale_csa')
  JOIN vacation_holds box
    ON box.member_id = bm.id
   AND box.start_date = r.start_date
   AND box.end_date   = r.end_date
   AND box.status IN ('scheduled', 'active')
   AND box.reason NOT LIKE '%[auto: rides the held box]%'  -- a box hold, not another rider
  GROUP BY r.rider_id
)
UPDATE vacation_holds vh
SET parent_hold_id = c.box_hold_id
FROM candidate c
WHERE vh.id = c.rider_id
  AND c.n = 1                       -- UNAMBIGUOUS only
  AND vh.parent_hold_id IS NULL;    -- idempotent: never overwrite

-- ── 4. Comment ──────────────────────────────────────────────────────
COMMENT ON COLUMN vacation_holds.parent_hold_id IS
  'For add-on RIDER holds only: the BOX vacation_holds.id this rider rides. '
  'Set by cascadeVacationHoldToAddOns; the cancel cascade selects riders by it. '
  'NULL for box holds and member-booked add-on holds.';
