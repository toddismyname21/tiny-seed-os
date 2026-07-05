-- ════════════════════════════════════════════════════════════════════
-- Migration 0073 — members.cadence (weekly-vs-biweekly source of truth)
-- ════════════════════════════════════════════════════════════════════
--
-- THE VERIFIED PROBLEM (PM-verified against code + prod data + Shopify)
-- ────────────────────────────────────────────────────────────────────
-- `members` only had `biweekly_week text ('A'|'B'|NULL)`. The app treated
-- a NULL biweekly_week as "on-week EVERY week" (src/lib/cycle.ts
-- isMemberOnThisWeek). That single column cannot distinguish:
--   • a WEEKLY member (a box every week), from
--   • a BIWEEKLY member who has not yet been assigned A/B.
-- Consequences observed in production:
--   (a) a biweekly purchaser never assigned A/B (NULL) silently receives
--       WEEKLY boxes (1 live case);
--   (b) weekly members carrying a stray A/B parity receive HALF their
--       boxes (live cases exist);
--   (c) the admin "Unassigned Week A/B" counter cannot be computed from
--       biweekly_week alone (a NULL means either weekly OR unassigned);
--   (d) mixed weekly+biweekly households lose half of their WEEKLY share
--       when one parity is stamped across all their member rows.
--
-- THE FIX — a dedicated `cadence` column becomes THE source of truth for
-- weekly-vs-biweekly. `biweekly_week` is ONLY meaningful when
-- cadence='biweekly'. The tuple (cadence='biweekly', biweekly_week NULL)
-- means "needs A/B assignment" and is treated as ON-WEEK until assigned
-- (documented legacy-safe choice so nobody loses boxes while unassigned).
--
-- BEHAVIOR-PRESERVING BACKFILL — mirrors today's EFFECTIVE semantics
-- exactly (zero behavior change at migration time):
--   cadence='biweekly' WHERE biweekly_week IN ('A','B')
--   cadence='weekly'   WHERE biweekly_week IS NULL
-- Because the old code treated NULL biweekly_week as weekly-equivalent
-- (on every week), the backfill reproduces that precisely.
--
-- EVIDENCED CORRECTIONS — the ONLY two rows whose behavior changes here
-- (Shopify-proven mixed households, identified STRUCTURALLY, never by
-- name; each restores PAID weekly service, never removes service):
--   (i)  a customer with an active FLOWER share (full weekly weeks,
--        total_weeks >= 16) mis-tagged biweekly_week='B', who ALSO holds a
--        separate active SUMMER_VEG share bought biweekly (total_weeks <=
--        10). Their flowers were bought WEEKLY → the flower row becomes
--        cadence='weekly', biweekly_week=NULL (restores their weekly
--        flowers). The biweekly veg row is left to the backfill.
--   (ii) a customer with an active SUMMER_VEG share (full weekly weeks,
--        total_weeks >= 16) mis-tagged biweekly_week='A', who ALSO holds a
--        separate active FLOWER share bought biweekly (total_weeks <= 10).
--        Their veg was bought WEEKLY → the summer_veg row becomes
--        cadence='weekly', biweekly_week=NULL (restores their weekly veg).
--        The biweekly flower row is left to the backfill.
-- Each correction is GUARDED to affect EXACTLY ONE row. If the structural
-- condition matches 0 or >1 rows, the correction is SKIPPED (backfill
-- value stands) and a NOTICE is raised for PM to adjudicate manually — we
-- never guess which row to change.
--
-- NOT TOUCHED HERE (deliberately): the other anomalies with NO Shopify
-- evidence — weekly-looking rows with a stray A/B + total_weeks >= 16, and
-- the lone NULL+total_weeks=9 member. The backfill covers them
-- behavior-preservingly; a human adjudication list goes to Todd separately.
--
-- Forward-only. DO NOT auto-apply — PM applies via the Supabase migration
-- runner after review.
-- ════════════════════════════════════════════════════════════════════

BEGIN;

-- ── 1. Add the column NULLABLE (no default yet) so the backfill can run
--       before we lock it down. The CHECK permits NULL transiently (a
--       CHECK passes on NULL) and enforces the domain thereafter.
ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS cadence text
  CHECK (cadence IS NULL OR cadence IN ('weekly', 'biweekly'));

-- ── 2. BEHAVIOR-PRESERVING BACKFILL ──────────────────────────────────
--       biweekly_week set ('A'/'B') → the member was being treated as
--       biweekly on their parity. NULL → the member was being treated as
--       on EVERY week (weekly-equivalent). Reproduce both exactly.
UPDATE public.members
   SET cadence = 'biweekly'
 WHERE biweekly_week IN ('A', 'B')
   AND cadence IS NULL;

UPDATE public.members
   SET cadence = 'weekly'
 WHERE biweekly_week IS NULL
   AND cadence IS NULL;

-- ── 3. EVIDENCED CORRECTIONS (exactly-one-row guarded) ───────────────
--       Wrapped in a DO block so each correction can COUNT its structural
--       match first and only fire when it isolates EXACTLY ONE row. A 0-
--       or multi-row match is SKIPPED with a NOTICE (PM adjudicates).
DO $$
DECLARE
  v_ids uuid[];
  v_n   int;
BEGIN
  -- (i) Mixed household #1 — WEEKLY flower mis-tagged biweekly-B, sharing
  --     a customer with a genuinely biweekly summer_veg share.
  SELECT array_agg(f.id) INTO v_ids
    FROM public.members f
   WHERE f.share_type = 'flower'
     AND f.status = 'active'
     AND f.total_weeks >= 16
     AND f.biweekly_week = 'B'
     AND EXISTS (
       SELECT 1 FROM public.members v
        WHERE v.customer_id = f.customer_id
          AND v.share_type = 'summer_veg'
          AND v.status = 'active'
          AND v.total_weeks <= 10
     );
  v_n := COALESCE(array_length(v_ids, 1), 0);
  IF v_n = 1 THEN
    UPDATE public.members
       SET cadence = 'weekly', biweekly_week = NULL, updated_at = now()
     WHERE id = v_ids[1];
    RAISE NOTICE '0073 correction (i) APPLIED: flower member % restored to weekly', v_ids[1];
  ELSE
    RAISE NOTICE '0073 correction (i) SKIPPED: expected exactly 1 matching flower row, found % — PM to adjudicate manually', v_n;
  END IF;

  -- (ii) Mixed household #2 — WEEKLY summer_veg mis-tagged biweekly-A,
  --      sharing a customer with a genuinely biweekly flower share.
  SELECT array_agg(v.id) INTO v_ids
    FROM public.members v
   WHERE v.share_type = 'summer_veg'
     AND v.status = 'active'
     AND v.total_weeks >= 16
     AND v.biweekly_week = 'A'
     AND EXISTS (
       SELECT 1 FROM public.members f
        WHERE f.customer_id = v.customer_id
          AND f.share_type = 'flower'
          AND f.status = 'active'
          AND f.total_weeks <= 10
     );
  v_n := COALESCE(array_length(v_ids, 1), 0);
  IF v_n = 1 THEN
    UPDATE public.members
       SET cadence = 'weekly', biweekly_week = NULL, updated_at = now()
     WHERE id = v_ids[1];
    RAISE NOTICE '0073 correction (ii) APPLIED: summer_veg member % restored to weekly', v_ids[1];
  ELSE
    RAISE NOTICE '0073 correction (ii) SKIPPED: expected exactly 1 matching summer_veg row, found % — PM to adjudicate manually', v_n;
  END IF;
END $$;

-- ── 4. Lock the column down: default 'weekly', NOT NULL. Applied AFTER
--       the backfill so no existing row is NULL when NOT NULL is set. New
--       inserts that omit cadence (should not happen — the Shopify sync
--       sets cadence = categorize().freq) default to the conservative
--       'weekly'.
ALTER TABLE public.members
  ALTER COLUMN cadence SET DEFAULT 'weekly';

ALTER TABLE public.members
  ALTER COLUMN cadence SET NOT NULL;

-- ── 5. Documented semantics ──────────────────────────────────────────
COMMENT ON COLUMN public.members.cadence IS
  'THE source of truth for weekly-vs-biweekly delivery (migration 0073). '
  '''weekly'' = a box every delivery week (any stray biweekly_week is '
  'ignored). ''biweekly'' = every-other-week on biweekly_week parity. '
  'biweekly_week is ONLY meaningful when cadence=''biweekly''. The tuple '
  '(cadence=''biweekly'', biweekly_week NULL) means "needs A/B assignment" '
  'and is treated as ON-WEEK until assigned (legacy-safe: nobody loses '
  'boxes while unassigned). cadence is purchase-defined (Shopify sync sets '
  'it from the order) and admin-editable; members cannot change it.';

COMMIT;

-- ── 6. VERIFICATION (run after apply; read-only) ─────────────────────
--       Counts per (cadence, biweekly_week) + the corrected-row count so
--       PM can confirm the distribution and that exactly the intended
--       rows changed. The two corrected rows appear as
--       (weekly, NULL) alongside every genuine weekly member.
SELECT cadence, biweekly_week, count(*) AS members
  FROM public.members
 GROUP BY cadence, biweekly_week
 ORDER BY cadence, biweekly_week NULLS LAST;

-- Corrected rows: active weekly summer_veg/flower with a biweekly sibling
-- of the OTHER share type — the exact structural signature of the two
-- evidenced mixed households (expect 0, 1, or 2 rows total).
SELECT m.id, m.customer_id, m.share_type, m.cadence, m.total_weeks
  FROM public.members m
 WHERE m.cadence = 'weekly'
   AND m.biweekly_week IS NULL
   AND m.status = 'active'
   AND m.total_weeks >= 16
   AND m.share_type IN ('summer_veg', 'flower')
   AND EXISTS (
     SELECT 1 FROM public.members s
      WHERE s.customer_id = m.customer_id
        AND s.status = 'active'
        AND s.cadence = 'biweekly'
        AND s.share_type IN ('summer_veg', 'flower')
        AND s.share_type <> m.share_type
   )
 ORDER BY m.share_type;
