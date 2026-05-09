# Day 8 Spec — Vacation Holds + Preferences UI

**Status:** DRAFT — ready to dispatch after Day 7 ships
**Plan reference:** `docs/CSA_MIGRATION_PLAN_2026.md` Day 8

---

## Goal

Members can:
1. **Schedule a vacation hold** — pause their box for one or more weeks (going on vacation, illness, etc.)
2. **Edit their preferences** — dietary dislikes, allergies, delivery notes, contact preferences
3. **Edit their pickup location** — change which stop they pick up at, or switch to home delivery

## User Stories

> "I'm going to Italy for 2 weeks in July. I open csa.tinyseedfarm.com → My Account → Schedule a vacation hold → pick July 8 to July 22 → confirm. The system pauses my deliveries during those weeks (no boxes packed for me, no emails sent). I get a confirmation."

> "I just realized I hate cilantro. I open Preferences → add 'cilantro' to my dislikes → save. Future boxes will skip cilantro when possible (preference filtering, not AI)."

> "I'm switching jobs and my new office is in Squirrel Hill. I open Pickup Location → change from Highland Park → Squirrel Hill → save. Effective next Wednesday."

## New Pages

### `/account` — Account hub
Member's account home. Shows all editable settings as cards:
- Profile (name, email — email is read-only since it's the auth identity)
- Pickup location (current + change link)
- Preferences (dietary, contact, delivery notes)
- Vacation holds (list of scheduled + button to schedule new)
- Sign out

### `/account/vacation` — Vacation holds list
- Shows current scheduled + active holds with start/end + status + cancel button
- Shows past completed holds (collapsed under "Show history" disclosure)
- Button: "Schedule new vacation hold" → modal/page

### `/account/vacation/new` — New vacation hold form
- Date range picker (start_date, end_date) — both required
- Reason textarea (optional, helps farm staff if there's an issue)
- Validation:
  - end_date ≥ start_date (DB CHECK already enforces)
  - start_date ≥ today (no retroactive holds)
  - Combined hold weeks ≤ member's `total_weeks - vacation_weeks_used` available
  - Members can have multiple holds, but they can't overlap
- On submit: INSERT into `vacation_holds` + INCREMENT `members.vacation_weeks_used` by the number of weeks covered
- Use a Postgres function `schedule_vacation_hold()` for atomic accounting (same pattern as swap_box_item)

### `/account/preferences` — Preferences form
- **Dislikes:** chips/tags input (pre-populated from existing `member_preferences.dislikes` array)
- **Allergies:** chips/tags input (pre-populated from `allergies` array)
- **Delivery notes:** textarea (pre-populated)
- **Contact preference:** radio (email / sms / both / none)
- **Newsletter opt-in:** checkbox
- POST to `/api/account/preferences` updates the row
- "SMS not yet enabled — coming soon" disabled state on SMS option (defer until SMS auth ships)

### `/account/pickup` — Pickup location change
- Current pickup card (read-only display)
- Dropdown of all active `pickup_locations` (filtered to `is_delivery_zone = false` for normal stops; or "Home delivery" option that shows a delivery_address textarea)
- "Effective next Wednesday" disclaimer
- POST to `/api/account/pickup-location` updates `members.pickup_location_id` (or sets `delivery_address`)
- Constraint: new pickup location's `current_members + 1 ≤ max_capacity` (if max_capacity is set). Use a Postgres function for atomic capacity check.

## API routes

| Route | Method | Purpose |
|---|---|---|
| `/api/account/vacation/schedule` | POST | Schedule a new vacation hold |
| `/api/account/vacation/cancel` | POST | Cancel a scheduled hold (sets status=cancelled, refunds vacation_weeks_used) |
| `/api/account/preferences` | POST | Update member_preferences row |
| `/api/account/pickup-location` | POST | Change pickup location with capacity check |

## Database functions (migration 0016)

```sql
CREATE OR REPLACE FUNCTION public.schedule_vacation_hold(
  p_member_id UUID,
  p_start_date DATE,
  p_end_date DATE,
  p_reason TEXT
) RETURNS json
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_member RECORD;
  v_weeks_in_hold INT;
  v_weeks_available INT;
  v_overlap_count INT;
  v_hold_id UUID;
BEGIN
  -- Lock member row
  SELECT id, total_weeks, vacation_weeks_used INTO v_member
  FROM members WHERE id = p_member_id FOR UPDATE;

  IF NOT FOUND THEN RETURN json_build_object('error', 'member_not_found'); END IF;
  IF p_start_date < CURRENT_DATE THEN RETURN json_build_object('error', 'start_date_in_past'); END IF;
  IF p_end_date < p_start_date THEN RETURN json_build_object('error', 'invalid_date_range'); END IF;

  -- Calculate weeks covered
  v_weeks_in_hold := CEIL(EXTRACT(EPOCH FROM (p_end_date - p_start_date)) / (7 * 86400)) + 1;
  v_weeks_available := v_member.total_weeks - v_member.vacation_weeks_used;

  IF v_weeks_in_hold > v_weeks_available THEN
    RETURN json_build_object('error', 'insufficient_vacation_weeks',
      'requested', v_weeks_in_hold, 'available', v_weeks_available);
  END IF;

  -- Check for overlapping holds
  SELECT COUNT(*) INTO v_overlap_count FROM vacation_holds
   WHERE member_id = p_member_id
     AND status IN ('scheduled','active')
     AND tstzrange(start_date::timestamptz, end_date::timestamptz, '[]') &&
         tstzrange(p_start_date::timestamptz, p_end_date::timestamptz, '[]');
  IF v_overlap_count > 0 THEN
    RETURN json_build_object('error', 'overlapping_hold');
  END IF;

  -- Insert hold
  INSERT INTO vacation_holds (member_id, start_date, end_date, reason, status)
  VALUES (p_member_id, p_start_date, p_end_date, p_reason, 'scheduled')
  RETURNING id INTO v_hold_id;

  -- Increment counter
  UPDATE members SET vacation_weeks_used = vacation_weeks_used + v_weeks_in_hold
   WHERE id = p_member_id;

  RETURN json_build_object('ok', true, 'hold_id', v_hold_id, 'weeks_used', v_weeks_in_hold);
END;
$$;

-- Cancel function
CREATE OR REPLACE FUNCTION public.cancel_vacation_hold(
  p_member_id UUID,
  p_hold_id UUID
) RETURNS json
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_hold RECORD;
  v_weeks INT;
BEGIN
  SELECT * INTO v_hold FROM vacation_holds
   WHERE id = p_hold_id AND member_id = p_member_id FOR UPDATE;
  IF NOT FOUND THEN RETURN json_build_object('error', 'hold_not_found'); END IF;
  IF v_hold.status NOT IN ('scheduled','active') THEN
    RETURN json_build_object('error', 'cannot_cancel', 'status', v_hold.status);
  END IF;

  v_weeks := CEIL(EXTRACT(EPOCH FROM (v_hold.end_date - v_hold.start_date)) / (7 * 86400)) + 1;

  UPDATE vacation_holds SET status='cancelled', cancelled_at=NOW() WHERE id = p_hold_id;
  UPDATE members SET vacation_weeks_used = GREATEST(0, vacation_weeks_used - v_weeks)
   WHERE id = p_member_id;

  RETURN json_build_object('ok', true, 'weeks_refunded', v_weeks);
END;
$$;
```

## Components to extract

Continue the library:
- `DateRangePicker.astro` — accessible date range input (use native HTML `<input type="date">` for now, polished UI in Phase 4)
- `Tags.astro` — chips/tags input for dislikes + allergies (type-and-add, click-to-remove)
- `Select.astro` — styled select dropdown (used by pickup location)
- `FormRow.astro` — label + input + error message wrapper
- `Disclosure.astro` — show/hide toggle for "Show history" of past vacation holds

## Verification gates

```bash
# Build + types clean
npm run build && npx astro check

# Migration applied
SELECT proname FROM pg_proc WHERE proname IN ('schedule_vacation_hold', 'cancel_vacation_hold');
# Expected: both rows

# Files exist
for f in src/pages/account/index.astro \
         src/pages/account/vacation.astro \
         src/pages/account/vacation/new.astro \
         src/pages/account/preferences.astro \
         src/pages/account/pickup.astro \
         src/pages/api/account/vacation/schedule.ts \
         src/pages/api/account/vacation/cancel.ts \
         src/pages/api/account/preferences.ts \
         src/pages/api/account/pickup-location.ts \
         src/components/{DateRangePicker,Tags,Select,FormRow,Disclosure}.astro \
         supabase/migrations/0016_vacation_hold_functions.sql; do
  test -f "$f" && echo "✓ $f" || echo "✗ $f"
done

# Live tests:
# - GET /account (unauthenticated) → 303 /login
# - GET /account/vacation/new (auth) → 200, form renders
# - POST schedule with overlapping date range → 409 overlapping_hold
# - POST schedule with insufficient weeks → 422 insufficient_vacation_weeks
# - POST cancel → 200, vacation_weeks_used decrements correctly
```

## Out of scope

- ❌ Auto-pause for missed pickups (admin work, Day 9)
- ❌ Refund-to-flex-balance when canceling a vacation (Phase 4 finance feature)
- ❌ Email confirmation of vacation hold (Day 10 — Resend integration)

## Edge cases

| Case | Handling |
|---|---|
| Cancel a hold that's already active | Allowed (status='active'), but only refund weeks that haven't passed yet |
| Cancel a hold that's already completed | Reject — can't refund past time |
| Schedule a hold during an active hold | Reject overlap |
| Member with 0 vacation_weeks remaining | Schedule button disabled with "No vacation weeks left this season" |
| Pickup location at max_capacity | Reject change with "That location is full — try another or contact us" |
