-- ============================================================================
-- 0078_harvie_ingest_from_7am.sql
--
-- Start the Monday Harvie auto-ingest sweep at 7:00 AM ET (Todd, 2026-07-06:
-- "The automatic harvie should start at 7am. It came at 7:22 today.")
-- Supersedes 0077's 9:00 AM start. Every 30 minutes, 7:00 AM–2:30 PM ET
-- Monday = 11:00–18:30 UTC (EDT). Empty ticks are no-ops (skip-if-exists).
-- ============================================================================

SELECT cron.unschedule('csa-harvie-ingest')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'csa-harvie-ingest');

DO $$
DECLARE
  v_secret text;
BEGIN
  SELECT decrypted_secret INTO v_secret
  FROM vault.decrypted_secrets WHERE name = 'cron_secret';

  IF v_secret IS NULL THEN
    RAISE NOTICE 'cron_secret not in Vault — skipping schedule; re-run manually after adding it.';
    RETURN;
  END IF;

  PERFORM cron.schedule(
    'csa-harvie-ingest',
    '0,30 11-18 * * 1',  -- every 30 min, 11:00–18:30 UTC Mon (7:00a–2:30p ET)
    format(
      $cmd$
      SELECT net.http_post(
        url := 'https://csa.tinyseedfarm.com/api/cron/harvie-ingest',
        headers := jsonb_build_object(
          'Authorization', 'Bearer %s',
          'Content-Type', 'application/json'
        ),
        body := '{}'::jsonb
      );
      $cmd$,
      v_secret
    )
  );
END $$;

SELECT jobname, schedule, active FROM cron.job WHERE jobname = 'csa-harvie-ingest';
