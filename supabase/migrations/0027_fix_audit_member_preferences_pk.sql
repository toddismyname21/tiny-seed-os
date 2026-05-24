-- ═══════════════════════════════════════════════════════════════════
-- Migration 0027: Fix log_audit_event() for tables whose PK isn't `id`
--
-- ─── The bug ─────────────────────────────────────────────────────────
-- The generic audit trigger function log_audit_event() (migration 0009)
-- hardcodes NEW.id / OLD.id for audit_log.row_id. That works for every
-- audited table EXCEPT `member_preferences`, whose PRIMARY KEY is
-- `member_id` (it has no `id` column). On an INSERT into member_preferences
-- the trigger raises:
--
--     ERROR: 42703: record "new" has no field "id"
--
-- Consequence (discovered 2026-05-24 while building the weekly email):
-- NO member_preferences row could be INSERTed. Since newsletter opt-in
-- lives in member_preferences, the weekly-email feature had zero possible
-- recipients (0 prefs rows existed for all 269 active members). The member
-- preferences upsert (/api/account/preferences) and onboarding's first
-- preferences write hit this too whenever a member had no prefs row yet.
--
-- ─── The fix ─────────────────────────────────────────────────────────
-- Resolve the row id from the row's jsonb representation, preferring the
-- `id` key and falling back to `member_id`. to_jsonb(NEW) is already
-- computed for the diff, so this adds no real cost and is GENERAL across
-- every audited table:
--   · id-keyed tables (customers, members, box_contents, pickup_locations,
--     vacation_holds, delivery_routes, delivery_stops) → uses `id`
--   · member_preferences (PK member_id, no id) → uses `member_id`
--
-- audit_log.row_id is UUID NOT NULL. Both `id` and `member_id` are UUIDs,
-- and every audited table has one of them, so the COALESCE always yields a
-- non-null UUID. We CAST the extracted text to UUID explicitly.
--
-- CREATE OR REPLACE keeps the same triggers attached — no trigger churn,
-- no downtime. This is purely a function-body fix.
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION log_audit_event() RETURNS TRIGGER AS $$
DECLARE
  v_user_id    UUID;
  v_user_email TEXT;
  v_diff       JSONB;
  v_new_json   JSONB;
  v_old_json   JSONB;
  v_row_id     UUID;
BEGIN
  -- Current auth user (NULL for service-role / system writes).
  v_user_id    := auth.uid();
  v_user_email := auth.jwt() ->> 'email';

  IF (TG_OP = 'INSERT') THEN
    v_new_json := to_jsonb(NEW);
    v_diff     := jsonb_build_object('after', v_new_json);
    -- Prefer `id`; fall back to `member_id` (member_preferences). Both UUID.
    v_row_id   := COALESCE(v_new_json ->> 'id', v_new_json ->> 'member_id')::uuid;
    INSERT INTO audit_log (table_name, row_id, operation, changed_by, changed_by_email, diff)
    VALUES (TG_TABLE_NAME, v_row_id, 'insert', v_user_id, v_user_email, v_diff);
    RETURN NEW;

  ELSIF (TG_OP = 'UPDATE') THEN
    v_new_json := to_jsonb(NEW);
    v_old_json := to_jsonb(OLD);
    v_diff     := jsonb_build_object('before', v_old_json, 'after', v_new_json);
    v_row_id   := COALESCE(v_new_json ->> 'id', v_new_json ->> 'member_id')::uuid;
    INSERT INTO audit_log (table_name, row_id, operation, changed_by, changed_by_email, diff)
    VALUES (TG_TABLE_NAME, v_row_id, 'update', v_user_id, v_user_email, v_diff);
    RETURN NEW;

  ELSIF (TG_OP = 'DELETE') THEN
    v_old_json := to_jsonb(OLD);
    v_diff     := jsonb_build_object('before', v_old_json);
    v_row_id   := COALESCE(v_old_json ->> 'id', v_old_json ->> 'member_id')::uuid;
    INSERT INTO audit_log (table_name, row_id, operation, changed_by, changed_by_email, diff)
    VALUES (TG_TABLE_NAME, v_row_id, 'delete', v_user_id, v_user_email, v_diff);
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION log_audit_event() IS
  'Generic audit trigger. Resolves audit_log.row_id from the row jsonb (id, then member_id) so tables whose PK is not `id` (member_preferences) audit correctly. Fixed in migration 0027.';
