-- ═══════════════════════════════════════════════════════════════════
-- Migration 0010: Auto-update updated_at columns
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER customers_updated_at         BEFORE UPDATE ON customers         FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER members_updated_at           BEFORE UPDATE ON members           FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER member_preferences_updated_at BEFORE UPDATE ON member_preferences FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER box_contents_updated_at      BEFORE UPDATE ON box_contents      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
