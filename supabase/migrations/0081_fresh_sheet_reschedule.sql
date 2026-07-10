-- ============================================================================
-- 0081_fresh_sheet_reschedule.sql
--
-- Reschedule the two wholesale fresh-sheet emails (Todd, 2026-07-10):
--   "The Wednesday fresh sheet needs to go out earlier — Thursday or Friday,
--    and the Friday sheet needs to go out Tuesday."
--
--   csa-wholesale-list-wed:  Sun 21:10 UTC  →  FRIDAY 12:30 UTC (8:30 AM ET)
--     (chefs get Fri–Mon to plan; closes Tue 7 AM)
--   csa-wholesale-list-fri:  Wed 15:00 UTC  →  TUESDAY 14:00 UTC (10:00 AM ET)
--     (lands right after the Wednesday cutoff clears; closes Thu 7 AM)
--
-- Date-targeting verified: nextDeliveryWednesday() on a Friday and
-- nextDeliveryFriday() on a Tuesday both resolve to the upcoming correct
-- delivery date (checked with real Date fixtures 2026-07-10/14).
-- Same Vault cron_secret pattern as 0033/0074/0080. Idempotent.
-- ============================================================================

SELECT cron.unschedule('csa-wholesale-list-wed')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'csa-wholesale-list-wed');
SELECT cron.unschedule('csa-wholesale-list-fri')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'csa-wholesale-list-fri');

DO $$
DECLARE
  v_secret text;
BEGIN
  SELECT decrypted_secret INTO v_secret
  FROM vault.decrypted_secrets WHERE name = 'cron_secret';
  IF v_secret IS NULL THEN
    RAISE NOTICE 'cron_secret not in Vault — skipping; re-run after adding it.';
    RETURN;
  END IF;

  PERFORM cron.schedule(
    'csa-wholesale-list-wed',
    '30 12 * * 5',  -- Fridays 12:30 UTC = 8:30 AM ET (EDT)
    format($cmd$
      SELECT net.http_post(
        url := 'https://csa.tinyseedfarm.com/api/cron/wholesale-list-wed',
        headers := jsonb_build_object('Authorization', 'Bearer %s', 'Content-Type', 'application/json'),
        body := '{}'::jsonb);
    $cmd$, v_secret)
  );

  PERFORM cron.schedule(
    'csa-wholesale-list-fri',
    '0 14 * * 2',  -- Tuesdays 14:00 UTC = 10:00 AM ET (EDT)
    format($cmd$
      SELECT net.http_post(
        url := 'https://csa.tinyseedfarm.com/api/cron/wholesale-list-fri',
        headers := jsonb_build_object('Authorization', 'Bearer %s', 'Content-Type', 'application/json'),
        body := '{}'::jsonb);
    $cmd$, v_secret)
  );
END $$;

SELECT jobname, schedule, active FROM cron.job
WHERE jobname IN ('csa-wholesale-list-wed', 'csa-wholesale-list-fri')
ORDER BY jobname;
