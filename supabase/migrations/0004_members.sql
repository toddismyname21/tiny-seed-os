-- ═══════════════════════════════════════════════════════════════════
-- Migration 0004: CSA Members
-- Replaces CSA_Members sheet (309 rows × 23 cols → relational, FK-enforced)
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE members (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id             TEXT UNIQUE,                                  -- maps to CSA_Members.Member_ID
  customer_id           UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  share_type            TEXT NOT NULL CHECK (share_type IN
                          ('spring_veg','summer_veg','fall_veg','flower','flex','add_on','wholesale_csa')),
  share_size            TEXT CHECK (share_size IN ('full','half','quarter','single','double')),
  season                TEXT NOT NULL,                                -- e.g. '2026 Spring', '2026 Summer'
  start_date            DATE NOT NULL,
  end_date              DATE NOT NULL,
  total_weeks           INT NOT NULL CHECK (total_weeks > 0),
  weeks_remaining       INT NOT NULL CHECK (weeks_remaining >= 0),
  pickup_day            TEXT CHECK (pickup_day IN ('Sun','Mon','Tue','Wed','Thu','Fri','Sat',NULL)),
  pickup_location_id    UUID REFERENCES pickup_locations(id) ON DELETE SET NULL,
  delivery_address      TEXT,                                         -- only if home delivery
  customization_allowed BOOLEAN DEFAULT true,
  swap_credits          INT DEFAULT 0 CHECK (swap_credits >= 0),
  vacation_weeks_used   INT DEFAULT 0 CHECK (vacation_weeks_used >= 0),
  status                TEXT DEFAULT 'active' CHECK (status IN
                          ('active','paused','cancelled','lapsed','onboarding','expired')),
  payment_status        TEXT,
  amount_paid           DECIMAL(10,2),
  biweekly_week         INT CHECK (biweekly_week IS NULL OR biweekly_week IN (0,1)),
  notes                 TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),

  -- Business rule: end_date must be after start_date
  CONSTRAINT members_date_order CHECK (end_date >= start_date),
  -- Business rule: weeks_remaining can't exceed total_weeks
  CONSTRAINT members_weeks_remaining CHECK (weeks_remaining <= total_weeks)
);

CREATE INDEX members_customer_idx     ON members(customer_id);
CREATE INDEX members_active_idx       ON members(status) WHERE status = 'active';
CREATE INDEX members_pickup_loc_idx   ON members(pickup_location_id);
CREATE INDEX members_season_idx       ON members(season);
CREATE INDEX members_share_type_idx   ON members(share_type);
CREATE INDEX members_legacy_id_idx    ON members(legacy_id);

COMMENT ON TABLE  members IS 'Active + historical CSA memberships. Each member row is one season-share for one customer.';
COMMENT ON COLUMN members.share_type IS 'spring_veg, summer_veg, fall_veg, flower, flex, add_on, wholesale_csa';
