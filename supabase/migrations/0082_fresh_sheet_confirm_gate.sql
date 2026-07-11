-- ============================================================================
-- 0082_fresh_sheet_confirm_gate.sql
--
-- REVIEW → CONFIRM → SEND gate for the wholesale fresh-sheet emails
-- (Todd, 2026-07-10: "Make sure the lists are updated before they are sent. I
--  should get a reminder and be able to update and confirm before send.").
--
-- This migration handles ONLY the cron scheduling side of that gate:
--
--   1. Schedule the two new REVIEW reminders to Todd (~4 PM ET the day BEFORE
--      each list's scheduled chef send), which link him to the new review page
--      (/admin/wholesale/fresh-sheet) where he confirms before anything mails:
--
--        csa-fresh-sheet-reminder-wed  THURSDAY 20:00 UTC (~4 PM ET)
--          → /api/cron/fresh-sheet-reminder?period=wed
--          (the Wednesday-period list sends FRIDAY 8:30 AM ET — the next day)
--
--        csa-fresh-sheet-reminder-fri  MONDAY   20:00 UTC (~4 PM ET)
--          → /api/cron/fresh-sheet-reminder?period=fri
--          (the Friday-period list sends TUESDAY 10:00 AM ET — the next day)
--
--   2. UNSCHEDULE the old csa-friday-list-reminder job (migration 0076) — it is
--      SUPERSEDED by the two reminders above. Its endpoint file is kept as a
--      harmless no-op.
--
-- The confirmation STORAGE lives in portal_settings keys
-- fresh_sheet_confirmed_wed / _fri (written by the confirm endpoint; no seed
-- needed — an absent key simply reads as "not confirmed", which is the correct
-- safe default). The chef-send enabled flags (wholesale_list_wed/fri_enabled)
-- were seeded in 0080 and are untouched here.
--
-- Same Vault cron_secret pattern as 0033 / 0074 / 0076 / 0081: the bearer is
-- looked up from Supabase Vault at RUN time (never interpolated into the stored
-- schedule, never in the repo). If the Vault secret is absent at apply time we
-- RAISE NOTICE and leave the jobs UNSCHEDULED — the operator stores it, then
-- re-runs the DO block. Idempotent: unschedule-guarded + cron.schedule
-- overwrites; the Management API runner wraps each submission in one implicit
-- transaction with no trailing ROLLBACK, so the schedule persists.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 1. Retire the superseded Friday-list reminder (guard: unschedule throws if
--    the job is absent).
SELECT cron.unschedule('csa-friday-list-reminder')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'csa-friday-list-reminder');

-- 2. Clean any prior definitions of the two new reminders so this re-runs clean.
SELECT cron.unschedule('csa-fresh-sheet-reminder-wed')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'csa-fresh-sheet-reminder-wed');
SELECT cron.unschedule('csa-fresh-sheet-reminder-fri')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'csa-fresh-sheet-reminder-fri');

-- 3. (Re)schedule inside a DO block that defers on a missing Vault secret.
DO $$
DECLARE
  has_secret BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM vault.decrypted_secrets WHERE name = 'cron_secret'
  ) INTO has_secret;

  IF NOT has_secret THEN
    RAISE NOTICE
      'cron_secret not present in Supabase Vault — skipping cron.schedule for the '
      'fresh-sheet reminders. Store it with:  '
      'select vault.create_secret(''<THE_SECRET>'', ''cron_secret'');  '
      'then re-run the DO block from this migration.';
    RETURN;
  END IF;

  -- Wednesday-period review reminder — Thursday 20:00 UTC (~4 PM ET, EDT).
  PERFORM cron.schedule(
    'csa-fresh-sheet-reminder-wed',
    '0 20 * * 4',
    $body$
    SELECT net.http_post(
      url     := 'https://csa.tinyseedfarm.com/api/cron/fresh-sheet-reminder?period=wed',
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

  -- Friday-period review reminder — Monday 20:00 UTC (~4 PM ET, EDT).
  PERFORM cron.schedule(
    'csa-fresh-sheet-reminder-fri',
    '0 20 * * 1',
    $body$
    SELECT net.http_post(
      url     := 'https://csa.tinyseedfarm.com/api/cron/fresh-sheet-reminder?period=fri',
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
    'Scheduled csa-fresh-sheet-reminder-wed (Thu 20:00 UTC) + '
    'csa-fresh-sheet-reminder-fri (Mon 20:00 UTC); unscheduled csa-friday-list-reminder.';
END
$$;

-- 4. Verification SELECT — read-only confirmation the cron API runner echoes
--    back. csa-friday-list-reminder should be ABSENT; the two new jobs present.
SELECT jobname, schedule, active FROM cron.job
WHERE jobname IN (
  'csa-fresh-sheet-reminder-wed',
  'csa-fresh-sheet-reminder-fri',
  'csa-friday-list-reminder'
)
ORDER BY jobname;
