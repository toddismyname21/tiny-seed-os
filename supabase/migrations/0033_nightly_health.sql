-- ═══════════════════════════════════════════════════════════════════
-- Migration 0033: Nightly CSA portal health-check cron
--
-- Why this migration exists
-- ─────────────────────────
-- The Shopify→Supabase order sync runs every 15 min and is monitored by
-- the existing csa-shopify-sync pg_cron + the in-endpoint error-alert
-- email. But there's a SECOND class of drift that the 15-min sync alone
-- doesn't catch:
--
--   1. The "auto-pickup from variantTitle" code shipped on 2026-06-04 — any
--      member whose order synced BEFORE that ship still has NULL pickup.
--   2. Tag drift in Shopify (someone unticks a tag manually, a brand-new
--      customer somehow doesn't get tagged, etc.).
--   3. The sync watermark being stale by > 30 min (= two consecutive
--      missed */15 runs) without anyone noticing because the in-endpoint
--      alert only fires when a run RAN and ERRORED — not when no run ran
--      at all.
--
-- /api/cron/nightly-health is the self-healing daily run that addresses
-- all three. This migration only sets the SCHEDULE that calls it. The
-- endpoint itself does the work + sends the daily summary email.
--
-- Why the schedule lives in pg_cron + not Vercel Cron: same reason as the
-- existing csa-shopify-sync job — Vercel Hobby tier is daily-only and
-- single-region; pg_cron + pg_net call out from Postgres with no quota
-- limit, and the CRON_SECRET stays in Supabase Vault (never in env files
-- nor in the GitHub repo).
--
-- ── Schedule ─────────────────────────────────────────────────────────
-- 10:00 UTC = 06:00 ET in EDT / 05:00 ET in EST. We want the email to land
-- before the farm owner's day starts; 06:00 ET is the right window.
--
-- ── CRON_SECRET handling ─────────────────────────────────────────────
-- The bearer token the job sends MUST equal the Vercel env var CRON_SECRET
-- that the endpoint compares against. This migration pulls it from Supabase
-- Vault under the secret name 'cron_secret' (same convention as the
-- csa-shopify-sync job — see docs/CSA_SYNC_RUNBOOK.md §2). If the Vault
-- secret is not present at schedule-creation time, this migration logs a
-- NOTICE and leaves the job UNSCHEDULED — the operator must store the
-- secret then re-run the cron.schedule block manually. We DELIBERATELY do
-- NOT raise an exception here: the rest of the migration (idempotency
-- guards) should succeed even if the operator hasn't synced the Vault yet.
--
-- ── Idempotency ──────────────────────────────────────────────────────
-- Re-running this migration is safe:
--   - CREATE EXTENSION IF NOT EXISTS handles the pg_cron / pg_net pieces.
--   - The cron.unschedule + cron.schedule sequence ensures a clean
--     overwrite if the job already exists.
--   - The Management API runner wraps each submission in one implicit
--     transaction; no trailing ROLLBACK so the DDL persists.
-- ═══════════════════════════════════════════════════════════════════

-- 1. Required extensions (no-op if already installed).
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Remove any prior definition so the schedule is clean. cron.unschedule
--    throws if the job doesn't exist, so guard on cron.job first. The
--    WHERE-EXISTS pattern matches the csa-shopify-sync runbook (§2).
SELECT cron.unschedule('csa-nightly-health')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'csa-nightly-health');

-- 3. (Re)schedule. The body is a SQL block that calls pg_net.http_post
--    against the public endpoint with the CRON_SECRET bearer. Both the
--    URL and the Vault-secret lookup happen at run-time inside Postgres,
--    so neither the secret nor the URL is ever interpolated at schedule
--    time.
--
--    The DO block defers the cron.schedule call so a missing Vault secret
--    becomes a NOTICE (not a hard error) — the operator can then store the
--    secret and run the schedule block separately.
DO $$
DECLARE
  has_secret BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM vault.decrypted_secrets WHERE name = 'cron_secret'
  ) INTO has_secret;

  IF NOT has_secret THEN
    RAISE NOTICE
      'cron_secret not present in Supabase Vault — skipping cron.schedule for csa-nightly-health. '
      'Store it with:  select vault.create_secret(''<THE_SECRET>'', ''cron_secret'');  '
      'then run the cron.schedule block from this migration manually.';
    RETURN;
  END IF;

  PERFORM cron.schedule(
    'csa-nightly-health',
    '0 10 * * *',  -- 10:00 UTC = 06:00 ET (EDT) / 05:00 ET (EST)
    $body$
    SELECT net.http_post(
      url     := 'https://csa.tinyseedfarm.com/api/cron/nightly-health',
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
    $body$
  );

  RAISE NOTICE
    'Scheduled csa-nightly-health (10:00 UTC daily). Verify with: '
    'select jobname, schedule, active from cron.job where jobname = ''csa-nightly-health'';';
END
$$;

-- 4. Verification SELECT — read-only, the cron API runner returns this as
--    confirmation in the response. Empty result = the operator needs to
--    create the Vault secret and re-run the DO block above.
SELECT jobname, schedule, active
FROM cron.job
WHERE jobname = 'csa-nightly-health';
