-- 20260829174600_portal_settings_updated_at_trigger.sql
--
-- Maintain portal_settings.updated_at automatically.
--
-- ── WHY ──────────────────────────────────────────────────────────────────────
-- portal_settings HAS an updated_at column but NOTHING maintains it. There is
-- no trigger, and only src/lib/flex-draft.ts (publishWeek) sets it explicitly.
-- Every other writer — the admin UI, ad-hoc scripts, feature-gate toggles —
-- leaves whatever value was there before.
--
-- Measured 2026-08-29: `chef_reminder_enabled` read updated_at = 2026-07-13,
-- but chef_order_reminder sends continued through 2026-08-10 (notification_log).
-- The gate was therefore switched off somewhere between Aug 10 and Aug 17 while
-- the timestamp still claimed July 13. The column was actively misleading.
--
-- This matters more than it sounds. These rows are FEATURE GATES: a disabled
-- cron returns HTTP 200 with {skipped:'disabled'}, so nothing anywhere looks
-- broken while customer-facing automation is silently off. ~50 chefs missed
-- three Mondays of order reminders before anyone noticed. "When did this
-- change?" is the first question in that kind of incident, and right now the
-- database cannot answer it.
--
-- ── DESIGN ───────────────────────────────────────────────────────────────────
-- Deliberately CONSERVATIVE. The naive version --
--
--     NEW.updated_at := now();
--
-- -- would also OVERWRITE a value the caller set on purpose. publishWeek()
-- upserts {key, value, updated_at: publishedAt} and then RETURNS publishedAt to
-- its caller, which surfaces it in the admin UI and stores it as the publish
-- marker. Clobbering that would introduce a silent skew between the timestamp
-- the app reports and the one persisted.
--
-- So we only fill the timestamp in when the writer did NOT set it:
--   • UPDATE — stamp now() only if updated_at is unchanged from OLD.
--   • INSERT — stamp now() only if updated_at came in NULL.
-- An explicit value always wins. No existing write path changes behaviour;
-- the only difference is that writers which previously left updated_at stale
-- now get an accurate one.
--
-- Idempotent: CREATE OR REPLACE + DROP TRIGGER IF EXISTS. Safe to re-run.
-- Backfill: intentionally NONE. Existing rows keep their (possibly wrong)
-- timestamps rather than being rewritten to now(), which would destroy the
-- little history there is and falsely imply every setting changed today.

BEGIN;

CREATE OR REPLACE FUNCTION public.set_portal_settings_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.updated_at IS NULL THEN
      NEW.updated_at := now();
    END IF;
  ELSE
    -- UPDATE: only stamp when the caller did not set it themselves.
    IF NEW.updated_at IS NOT DISTINCT FROM OLD.updated_at THEN
      NEW.updated_at := now();
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS portal_settings_set_updated_at ON public.portal_settings;

CREATE TRIGGER portal_settings_set_updated_at
  BEFORE INSERT OR UPDATE ON public.portal_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_portal_settings_updated_at();

COMMIT;
