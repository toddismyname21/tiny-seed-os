-- 0094 — Run the order ↔ QuickBooks invoice reconciler nightly.
--
-- WHY: /api/cron/invoice-reconcile (added alongside migration 0093) closes the
-- loop for invoices raised BY HAND in QuickBooks, which the portal otherwise
-- never links. An endpoint nobody calls is not automation — without this job the
-- "uninvoiced" report drifts back out of true the first time Todd invoices
-- directly in QuickBooks, which is exactly how 65 orders came to look unbilled
-- while $25,096 had already been billed.
--
-- 03:00 ET (07:00 UTC): after the day's deliveries and invoicing are done, and
-- clear of csa-nightly-health at 10:00 UTC so the two never contend for the
-- QuickBooks rate limit.
--
-- The endpoint is idempotent (it only fills NULL invoice_number and re-asserts
-- that guard at write time), so a re-run or an overlapping run is harmless.

select cron.schedule(
  'csa-invoice-reconcile',
  '0 7 * * *',
  $job$
    SELECT net.http_post(
      url     := 'https://csa.tinyseedfarm.com/api/cron/invoice-reconcile',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (
          SELECT decrypted_secret
          FROM vault.decrypted_secrets
          WHERE name = 'cron_secret'
        )
      ),
      body    := jsonb_build_object('source', 'pg_cron')
    );
  $job$
);
