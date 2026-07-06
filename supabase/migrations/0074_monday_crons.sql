-- ═══════════════════════════════════════════════════════════════════
-- Migration 0074: Monday workflow-automation crons
--
-- Schedules three Monday pg_cron jobs that call the new portal endpoints,
-- mirroring the csa-nightly-health pattern (migration 0033): pg_cron +
-- pg_net.http_post, with the CRON_SECRET bearer pulled from Supabase Vault
-- at RUN time (never interpolated at schedule time, never in the repo).
--
--   1. csa-harvie-ingest        → /api/cron/harvie-ingest
--        Auto-imports the weekly Harvie purchase order out of Gmail. The PO
--        email arrives Mondays ~11:00–12:00 ET, so we fire THREE times —
--        11:45 / 12:45 / 1:45 ET — to bracket the observed arrival. Running
--        it multiple times is safe: the endpoint commits with onExisting:'skip'
--        so a PO that already imported is a no-op.
--        Schedule '45 15,16,17 * * 1' = 15:45/16:45/17:45 UTC = 11:45a/12:45p/
--        1:45p ET (EDT).
--
--   2. csa-chef-order-reminder  → /api/cron/chef-order-reminder
--        Monday ~9:05 ET nudge to chef accounts with no order yet for this
--        Wednesday (cutoff Tue 7 AM ET). GATED behind portal_settings
--        'chef_reminder_enabled' — no send until Todd arms it.
--        Schedule '5 13 * * 1' = 13:05 UTC = 09:05 ET (EDT).
--
--   3. csa-flex-order-reminder  → /api/cron/flex-order-reminder
--        Monday ~9:10 ET nudge to flex members with a positive balance who
--        haven't ordered for their open week. GATED behind portal_settings
--        'flex_reminder_enabled'.
--        Schedule '5 21 * * 0' = 13:10 UTC = 09:10 ET (EDT).
--
-- ── CRON_SECRET handling (identical to 0033) ─────────────────────────
-- Each job sends 'Authorization: Bearer ' || vault secret 'cron_secret',
-- which must equal the endpoints' CRON_SECRET env var. If the Vault secret
-- is absent at apply time we RAISE NOTICE and leave the jobs UNSCHEDULED
-- (no hard error) — the operator stores the secret then re-runs the DO
-- block. The DDL / seed rows still persist.
--
-- ── Idempotency ──────────────────────────────────────────────────────
-- Re-running is safe: CREATE EXTENSION IF NOT EXISTS; cron.unschedule guarded
-- by cron.job existence; cron.schedule overwrites; portal_settings seeds use
-- ON CONFLICT DO NOTHING (never clobber an admin-edited value). The
-- Management API runner wraps each submission in one implicit transaction and
-- adds no trailing ROLLBACK, so the DDL persists.
-- ═══════════════════════════════════════════════════════════════════

-- 1. Required extensions (no-op if already installed).
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Deploy-safe gate rows for the two reminder crons. Seeded 'false' so both
--    reminders no-op until Todd approves the copy and flips the flag. The
--    portal_settings table is created in migration 0070; ON CONFLICT DO NOTHING
--    leaves any pre-existing / admin-edited value untouched.
INSERT INTO portal_settings (key, value) VALUES
  ('chef_reminder_enabled', 'false'),
  ('flex_reminder_enabled', 'false')
ON CONFLICT (key) DO NOTHING;

-- 3. Remove any prior definitions so the schedules are clean (guard on
--    cron.job existence — cron.unschedule throws if the job is absent).
SELECT cron.unschedule('csa-harvie-ingest')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'csa-harvie-ingest');
SELECT cron.unschedule('csa-chef-order-reminder')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'csa-chef-order-reminder');
SELECT cron.unschedule('csa-flex-order-reminder')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'csa-flex-order-reminder');

-- 4. (Re)schedule all three inside a DO block that defers on a missing Vault
--    secret (NOTICE, not error) — identical guard to migration 0033.
DO $$
DECLARE
  has_secret BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM vault.decrypted_secrets WHERE name = 'cron_secret'
  ) INTO has_secret;

  IF NOT has_secret THEN
    RAISE NOTICE
      'cron_secret not present in Supabase Vault — skipping cron.schedule for the Monday jobs. '
      'Store it with:  select vault.create_secret(''<THE_SECRET>'', ''cron_secret'');  '
      'then run the cron.schedule blocks from this migration manually.';
    RETURN;
  END IF;

  -- Harvie auto-ingest — 3× Monday (11:45 / 12:45 / 1:45 ET); skip-if-exists
  -- makes the extra runs safe.
  PERFORM cron.schedule(
    'csa-harvie-ingest',
    '45 15,16,17 * * 1',
    $body$
    SELECT net.http_post(
      url     := 'https://csa.tinyseedfarm.com/api/cron/harvie-ingest',
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

  -- Chef order reminder — Monday 09:05 ET.
  PERFORM cron.schedule(
    'csa-chef-order-reminder',
    '5 13 * * 1',
    $body$
    SELECT net.http_post(
      url     := 'https://csa.tinyseedfarm.com/api/cron/chef-order-reminder',
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

  -- Flex order reminder — Monday 09:10 ET.
  PERFORM cron.schedule(
    'csa-flex-order-reminder',
    '5 21 * * 0',
    $body$
    SELECT net.http_post(
      url     := 'https://csa.tinyseedfarm.com/api/cron/flex-order-reminder',
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
    'Scheduled csa-harvie-ingest (Mon 15:45/16:45/17:45 UTC), csa-chef-order-reminder '
    '(Mon 13:05 UTC), csa-flex-order-reminder (Mon 13:10 UTC). Verify with the SELECT below.';
END
$$;

-- 5. Verification SELECT — read-only confirmation the cron API runner echoes
--    back. Empty result = the operator must create the Vault secret and re-run
--    the DO block above.
SELECT jobname, schedule, active
FROM cron.job
WHERE jobname IN ('csa-harvie-ingest', 'csa-chef-order-reminder', 'csa-flex-order-reminder')
ORDER BY jobname;
