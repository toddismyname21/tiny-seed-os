-- ============================================================================
-- 0077_harvie_ingest_wider_window.sql
--
-- WIDEN the Monday Harvie auto-ingest window (Todd, 2026-07-06: "Monday
-- morning — harvie and market wagon import").
--
-- The Harvie PO email is OBSERVED to arrive ~11:20–12:00 ET on Mondays, but
-- the exact minute varies. 0074 scheduled three fixed checks (11:45a/12:45p/
-- 1:45p ET). This replaces that with EVERY 30 MINUTES from 13:00–19:00 UTC
-- (9:00 AM–3:00 PM ET) each Monday, so the PO imports within ≤30 min of
-- whenever it lands. Safe because the ingest endpoint SKIPS any PO whose
-- (account, delivery_date, external_ref) already exists — extra ticks with
-- nothing new are no-ops (a Gmail search + exit).
--
-- Same Vault cron_secret + pg_net pattern as 0033/0074.
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
    RAISE NOTICE 'cron_secret not present in Supabase Vault — skipping cron.schedule for csa-harvie-ingest. Add the secret then re-run this block manually.';
    RETURN;
  END IF;

  PERFORM cron.schedule(
    'csa-harvie-ingest',
    '0,30 13-18 * * 1',  -- every 30 min, 13:00–18:30 UTC Mon (9:00a–2:30p ET)
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

-- Verify — the job exists with the widened schedule.
SELECT jobname, schedule, active FROM cron.job WHERE jobname = 'csa-harvie-ingest';
