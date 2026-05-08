-- ═══════════════════════════════════════════════════════════════════
-- Migration 0006: Member Preferences, Vacation Holds, Swaps, Attendance
-- NEW tables — these were previously crammed into CSA_Members.Notes
-- or simply not tracked at all (swap history, pickup attendance).
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE member_preferences (
  member_id           UUID PRIMARY KEY REFERENCES members(id) ON DELETE CASCADE,
  dislikes            TEXT[] DEFAULT '{}',                    -- e.g. {'cilantro','eggplant'}
  allergies           TEXT[] DEFAULT '{}',
  preferred_swaps     JSONB DEFAULT '{}',                     -- e.g. {"kale":"lettuce"}
  delivery_notes      TEXT,
  contact_preference  TEXT DEFAULT 'email' CHECK (contact_preference IN ('email','sms','both','none')),
  newsletter_opt_in   BOOLEAN DEFAULT true,
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE member_preferences IS 'Member dietary prefs and contact preferences. 1:1 with members.';

-- ───────────────────────────────────────────────────────────────────

CREATE TABLE vacation_holds (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id     UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  start_date    DATE NOT NULL,
  end_date      DATE NOT NULL,
  reason        TEXT,
  status        TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled','active','completed','cancelled')),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  cancelled_at  TIMESTAMPTZ,

  CONSTRAINT vacation_date_order CHECK (end_date >= start_date)
);

CREATE INDEX vacation_holds_member_idx ON vacation_holds(member_id);
CREATE INDEX vacation_holds_active_idx ON vacation_holds(start_date, end_date)
  WHERE status IN ('scheduled','active');

COMMENT ON TABLE vacation_holds IS 'Member-scheduled vacation holds. Replaces single counter on CSA_Members.';

-- ───────────────────────────────────────────────────────────────────

CREATE TABLE box_swaps (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id     UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  week_date     DATE NOT NULL,
  original_item TEXT NOT NULL,
  swapped_for   TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (member_id, week_date, original_item)
);

CREATE INDEX box_swaps_week_idx ON box_swaps(week_date);
CREATE INDEX box_swaps_member_idx ON box_swaps(member_id);

COMMENT ON TABLE box_swaps IS 'Member-initiated swaps of items in their weekly box. Full audit history.';

-- ───────────────────────────────────────────────────────────────────

CREATE TABLE pickup_attendance (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id     UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  week_date     DATE NOT NULL,
  picked_up     BOOLEAN DEFAULT false,
  picked_up_at  TIMESTAMPTZ,
  notes         TEXT,
  recorded_by   UUID,                                         -- references auth.users(id) — host or admin

  UNIQUE (member_id, week_date)
);

CREATE INDEX pickup_attendance_week_idx ON pickup_attendance(week_date);
CREATE INDEX pickup_attendance_missed_idx ON pickup_attendance(week_date, picked_up) WHERE picked_up = false;

COMMENT ON TABLE pickup_attendance IS 'Per-week pickup tracking. Hosts mark members present at the stop.';
