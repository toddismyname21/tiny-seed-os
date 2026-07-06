-- ═══════════════════════════════════════════════════════════════════
-- Migration 0076: Friday-list reminder cron
--
-- Schedules ONE Monday pg_cron job that calls the new portal endpoint
--   csa-friday-list-reminder → /api/cron/friday-list-reminder
-- mirroring the csa-flex-list-reminder / csa-nightly-health pattern
-- (migrations 0074 / 0033): pg_cron + pg_net.http_post, with the CRON_SECRET
-- bearer pulled from Supabase Vault at RUN time (never interpolated at schedule
-- time, never in the repo).
--
-- WHAT IT DOES
--   Monday ~3:30 PM ET nudge to TODD ONLY to send the Friday wholesale
--   availability list to chefs (Friday-delivery ordering closes Thursday 7 AM
--   ET). This is a purely operational OWNER reminder — like csa-flex-list-
--   reminder it emails only todd@tinyseedfarmpgh.com, so there is NO gating
--   flag (there is no member-facing copy to approve first).
--   Schedule '30 19 * * 1' = 19:30 UTC = 15:30 ET (EDT).
--
-- NOTE ON NUMBERING: the spec named this file 0075, but 0075 was already taken
-- by 0075_standing_wholesale_orders.sql — this is the next free number (0076).
--
-- ── CRON_SECRET handling (identical to 0033 / 0074) ──────────────────
-- The job sends 'Authorization: Bearer ' || vault secret 'cron_secret', which
-- must equal the endpoint's CRON_SECRET env var. If the Vault secret is absent
-- at apply time we RAISE NOTICE and leave the job UNSCHEDULED (no hard error) —
-- the operator stores the secret then re-runs the DO block. The DDL still
-- persists.
--
-- ── Idempotency ──────────────────────────────────────────────────────
-- Re-running is safe: CREATE EXTENSION IF NOT EXISTS; cron.unschedule guarded by
-- cron.job existence; cron.schedule overwrites. The Management API runner wraps
-- each submission in one implicit transaction and adds no trailing ROLLBACK, so
-- the schedule persists.
-- ═══════════════════════════════════════════════════════════════════

-- 1. Required extensions (no-op if already installed).
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Remove any prior definition so the schedule is clean (guard on cron.job
--    existence — cron.unschedule throws if the job is absent).
SELECT cron.unschedule('csa-friday-list-reminder')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'csa-friday-list-reminder');

-- 3. (Re)schedule inside a DO block that defers on a missing Vault secret
--    (NOTICE, not error) — identical guard to migrations 0033 / 0074.
DO $$
DECLARE
  has_secret BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM vault.decrypted_secrets WHERE name = 'cron_secret'
  ) INTO has_secret;

  IF NOT has_secret THEN
    RAISE NOTICE
      'cron_secret not present in Supabase Vault — skipping cron.schedule for csa-friday-list-reminder. '
      'Store it with:  select vault.create_secret(''<THE_SECRET>'', ''cron_secret'');  '
      'then run the cron.schedule block from this migration manually.';
    RETURN;
  END IF;

  -- Friday-list reminder — Monday 15:30 ET (19:30 UTC, EDT).
  PERFORM cron.schedule(
    'csa-friday-list-reminder',
    '30 19 * * 1',
    $body$
    SELECT net.http_post(
      url     := 'https://csa.tinyseedfarm.com/api/cron/friday-list-reminder',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (
          SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret'
        )
      ),
      body    := jsonb_build_object('source', 'pg_cron')
    );
    $body$
  );

  RAISE NOTICE
    'Scheduled csa-friday-list-reminder (Mon 19:30 UTC / 15:30 ET). Verify with the SELECT below.';
END
$$;

-- 4. Verification SELECT — read-only confirmation the cron API runner echoes
--    back. Empty result = the operator must create the Vault secret and re-run
--    the DO block above.
SELECT jobname, schedule, active
FROM cron.job
WHERE jobname = 'csa-friday-list-reminder';
