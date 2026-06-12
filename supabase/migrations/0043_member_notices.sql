-- Migration 0043 — MEMBER NOTICES (open commitments / "notes & notices")
-- A promise made to a member stays OPEN until the team fulfills it.
-- Surfaced on pack-check + stop-manifest for the relevant stop, and on
-- the admin Notices page. Admin/staff only.
CREATE TABLE IF NOT EXISTS member_notices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id),
  title text NOT NULL,                      -- short: "2x mushrooms make-good"
  detail text,                              -- context for the packer
  stop_hint text,                           -- pickup stop name it belongs to (or 'HOME DELIVERY' / null = general)
  due_week date,                            -- week_starting it should be fulfilled (null = next opportunity / when available)
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','done','cancelled')),
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  fulfilled_by text,
  fulfilled_at timestamptz
);
CREATE INDEX IF NOT EXISTS member_notices_open_idx ON member_notices (status, due_week);
ALTER TABLE member_notices ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='member_notices' AND policyname='notices_staff_all') THEN
    CREATE POLICY notices_staff_all ON member_notices FOR ALL
      USING (EXISTS (SELECT 1 FROM customers c WHERE c.email = auth.jwt()->>'email' AND c.role IN ('admin','staff')))
      WITH CHECK (EXISTS (SELECT 1 FROM customers c WHERE c.email = auth.jwt()->>'email' AND c.role IN ('admin','staff')));
  END IF;
END $$;
