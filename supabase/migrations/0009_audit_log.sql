-- ═══════════════════════════════════════════════════════════════════
-- Migration 0009: Audit Log (NEW — currently no audit anywhere)
-- Captures all changes to members, customers, vacation_holds, etc.
-- Required for retention disputes, debugging, compliance.
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE audit_log (
  id                BIGSERIAL PRIMARY KEY,
  table_name        TEXT NOT NULL,
  row_id            UUID NOT NULL,
  operation         TEXT NOT NULL CHECK (operation IN ('insert','update','delete')),
  changed_by        UUID,                                     -- supabase auth.users.id
  changed_by_email  CITEXT,
  diff              JSONB,                                    -- {before: {...}, after: {...}}
  changed_at        TIMESTAMPTZ DEFAULT NOW(),
  ip_address        INET,
  user_agent        TEXT
);

CREATE INDEX audit_table_row_idx     ON audit_log(table_name, row_id);
CREATE INDEX audit_changed_at_idx    ON audit_log(changed_at DESC);
CREATE INDEX audit_changed_by_idx    ON audit_log(changed_by);
CREATE INDEX audit_table_op_idx      ON audit_log(table_name, operation, changed_at DESC);

COMMENT ON TABLE audit_log IS 'Append-only audit trail for all member/customer/preference/vacation changes.';

-- ───────────────────────────────────────────────────────────────────
-- Generic audit trigger function
-- ───────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION log_audit_event() RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_user_email TEXT;
  v_diff JSONB;
BEGIN
  -- Get current auth user (NULL for service-role / system writes)
  v_user_id    := auth.uid();
  v_user_email := auth.jwt() ->> 'email';

  IF (TG_OP = 'INSERT') THEN
    v_diff := jsonb_build_object('after', to_jsonb(NEW));
    INSERT INTO audit_log (table_name, row_id, operation, changed_by, changed_by_email, diff)
    VALUES (TG_TABLE_NAME, NEW.id, 'insert', v_user_id, v_user_email, v_diff);
    RETURN NEW;
  ELSIF (TG_OP = 'UPDATE') THEN
    v_diff := jsonb_build_object('before', to_jsonb(OLD), 'after', to_jsonb(NEW));
    INSERT INTO audit_log (table_name, row_id, operation, changed_by, changed_by_email, diff)
    VALUES (TG_TABLE_NAME, NEW.id, 'update', v_user_id, v_user_email, v_diff);
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    v_diff := jsonb_build_object('before', to_jsonb(OLD));
    INSERT INTO audit_log (table_name, row_id, operation, changed_by, changed_by_email, diff)
    VALUES (TG_TABLE_NAME, OLD.id, 'delete', v_user_id, v_user_email, v_diff);
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger to mutable tables (NOT append-only ones like notification_log, flex_transactions, audit_log)
CREATE TRIGGER audit_customers           AFTER INSERT OR UPDATE OR DELETE ON customers           FOR EACH ROW EXECUTE FUNCTION log_audit_event();
CREATE TRIGGER audit_members             AFTER INSERT OR UPDATE OR DELETE ON members             FOR EACH ROW EXECUTE FUNCTION log_audit_event();
CREATE TRIGGER audit_member_preferences  AFTER INSERT OR UPDATE OR DELETE ON member_preferences  FOR EACH ROW EXECUTE FUNCTION log_audit_event();
CREATE TRIGGER audit_vacation_holds      AFTER INSERT OR UPDATE OR DELETE ON vacation_holds      FOR EACH ROW EXECUTE FUNCTION log_audit_event();
CREATE TRIGGER audit_pickup_locations    AFTER INSERT OR UPDATE OR DELETE ON pickup_locations    FOR EACH ROW EXECUTE FUNCTION log_audit_event();
CREATE TRIGGER audit_box_contents        AFTER INSERT OR UPDATE OR DELETE ON box_contents        FOR EACH ROW EXECUTE FUNCTION log_audit_event();
