# Day 9 Spec — Admin Dashboard

**Status:** DRAFT — ready to dispatch after Day 8 ships
**Plan reference:** `docs/CSA_MIGRATION_PLAN_2026.md` Day 9

---

## Goal

Todd (and future farm staff) can manage the CSA from a logged-in admin dashboard:
- See all members, search/filter
- View any member's full profile (preferences, holds, swaps, balance)
- Edit member status (active/paused/cancelled)
- Manage box contents per week per share type
- See pickup location capacities and member counts
- Run reports (active members per stop, churn alerts, etc.)

## Authentication: Admin role

A member can be promoted to admin by setting a flag. Add to migration 0017:

```sql
ALTER TABLE customers ADD COLUMN role TEXT DEFAULT 'member' CHECK (role IN ('member','admin','staff'));
CREATE INDEX customers_role_idx ON customers(role) WHERE role <> 'member';

-- Seed Todd as admin
UPDATE customers SET role = 'admin' WHERE email = 'todd@tinyseedfarmpgh.com';

-- RLS policy: admin can read/write everything
CREATE POLICY admin_all_customers ON customers FOR ALL
  TO authenticated
  USING (
    (SELECT role FROM customers WHERE email = auth.jwt() ->> 'email') = 'admin'
  );
-- Similar policies for members, member_preferences, vacation_holds, box_swaps, box_contents, pickup_attendance
```

Middleware update: routes under `/admin/*` require `customers.role = 'admin'` OR `'staff'`. Non-admin users hitting /admin → redirect to /dashboard with banner "Admin access required."

## Pages

### `/admin` — Admin home
Stats overview cards:
- Active members (current count)
- Members by share type (mini bar chart or table)
- Members by pickup location (table)
- Pending tasks: unfilled box content for upcoming Wednesday, members in onboarding > 3 days, churn-risk members
- Recent signups (last 7 days)

### `/admin/members` — Members table
- Searchable + filterable list (search by name, email, member_id; filter by status, share_type, pickup_location)
- Pagination (50 per page)
- Each row: name, email, share_type + size, pickup, status badge, last login, actions (View, Edit)
- Bulk actions: send weekly reminder (deferred until Resend), export to CSV

### `/admin/members/[id]` — Member detail
- Profile: name, email, phone (editable)
- Membership card: share_type, size, season, weeks remaining, status (editable dropdown), payment_status, amount_paid
- Preferences (dietary): dislikes, allergies, delivery notes (editable)
- Pickup: location + day/time + delivery_address (editable)
- Vacation holds: list with cancel buttons
- Swap history: list of box_swaps for this member
- Flex balance: current balance + transaction history
- Notification log: last 20 emails/SMS (status, type, sent_at)
- Audit log: last 20 changes (operation, changed_by, diff summary)
- Admin actions:
  - Suspend / reactivate
  - Cancel membership (status=cancelled)
  - Add flex credit (form: amount, reason)
  - Send custom email (deferred until Resend)

### `/admin/box-contents` — Box editor
- Week selector (next 4 weeks visible)
- Share type tabs (spring_veg, summer_veg, flower, etc.)
- Editable list of items: product_name, variety, quantity, unit, is_swappable, swap_options (multi-select)
- "Add item" + "Remove" buttons
- "Copy from last week" button
- Save → upsert box_contents rows for (week_date, share_type)

### `/admin/pickup-locations` — Pickup management
- Table of all 12 stops + delivery zones
- Each row: name, day, time, host, current_members / max_capacity, is_active toggle
- Edit capacity, host info
- "Add new location" button

### `/admin/reports` — Reports
- Active member count by share + size + season
- Churn risk: members with status='active' and last_login > 30 days ago
- Pickup attendance heatmap (last 8 weeks)
- Weekly box satisfaction (computed from preferences vs items shipped — Phase 4 work, basic placeholder for now)
- Export each as CSV

## API routes (for admin actions)

| Route | Method | Purpose |
|---|---|---|
| `/api/admin/members/[id]/status` | POST | Update member status |
| `/api/admin/members/[id]/preferences` | POST | Update preferences |
| `/api/admin/members/[id]/flex-credit` | POST | Add flex credit (writes to flex_transactions + audit) |
| `/api/admin/box-contents/save` | POST | Upsert week's box for a share type |
| `/api/admin/pickup-locations/[id]` | POST | Update location |
| `/api/admin/reports/[name].csv` | GET | Stream CSV report |

All admin API routes verify role='admin' before processing.

## RLS

Existing member-facing RLS policies stay. Add **admin-bypass** policies for each table that admins need to manipulate. Pattern (per table):

```sql
CREATE POLICY admin_all_members ON members FOR ALL TO authenticated
  USING ((SELECT role FROM customers WHERE email = auth.jwt() ->> 'email') = 'admin')
  WITH CHECK ((SELECT role FROM customers WHERE email = auth.jwt() ->> 'email') = 'admin');
```

Repeat for: customers, member_preferences, vacation_holds, box_swaps, box_contents, pickup_locations, csa_products, flex_transactions, notification_log, pickup_attendance.

## Component additions

Continue the component library:
- `Table.astro` — sortable, paginated table (using Tailwind table classes + small JS for sort)
- `SearchInput.astro` — debounced search box with clear button
- `Tabs.astro` — accessible tab navigation (used in member detail + box editor)
- `Pagination.astro` — page navigation
- `StatusPill.astro` — colored status badge (uses existing Badge.astro internally)
- `CSVExport.astro` — download button + tracking

## Verification gates

```bash
# Migration applied (0017)
SELECT column_name FROM information_schema.columns WHERE table_name='customers' AND column_name='role';
# Expected: role row

# Todd is admin
SELECT email, role FROM customers WHERE email='todd@tinyseedfarmpgh.com';
# Expected: role='admin'

# Build clean
npm run build && npx astro check

# Files exist (15+ files; spot check key ones)
for f in src/pages/admin/index.astro \
         src/pages/admin/members/index.astro \
         src/pages/admin/members/[id].astro \
         src/pages/admin/box-contents.astro \
         src/middleware.ts \
         supabase/migrations/0017_admin_role_and_rls.sql; do
  test -f "$f" && echo "✓ $f" || echo "✗ $f"
done

# Live tests:
# - GET /admin (Todd authed) → 200
# - GET /admin (non-admin authed) → 303 to /dashboard with banner
# - GET /admin (unauthed) → 303 to /login
# - POST /api/admin/members/[id]/status (Todd) → 200, change persists
# - POST /api/admin/members/[id]/status (non-admin) → 403
```

## Out of scope

- ❌ Audit dashboard with full diff visualization (Phase 4)
- ❌ Real-time updates (websockets) — refresh works fine for now
- ❌ Charts/graphs beyond simple HTML tables (Phase 4)
- ❌ Email/SMS sending UI (Day 10)
- ❌ Multi-staff accounts beyond 'admin' (Phase 2)

## Mobile considerations

The admin dashboard is **desktop-first** — Todd manages this from his laptop. But:
- All pages should still be functional (not broken) on mobile
- Tables should horizontally scroll on small screens
- Forms remain mobile-friendly

A "good enough" mobile experience for the admin is acceptable; we don't need to optimize it heavily for Day 9.

## Audit log integration

Every admin action that mutates data should:
1. Use the service role client (`supabaseAdmin`) so RLS doesn't get in the way of admin writes
2. Audit log captures who did what (the existing audit_log triggers capture this automatically since `auth.uid()` is set)

Verify after Day 9: when Todd changes a member's status from 'active' → 'paused', the audit_log table has a row with `changed_by_email = 'todd@tinyseedfarmpgh.com'`, `operation = 'update'`, and the diff shows the status change.
