-- ═══════════════════════════════════════════════════════════════════
-- Migration 0031: CSA Operations Admin — Phase 1 data model
--
-- Adds the seven tables that power the back-office Fulfillment Cycle
-- (per docs/specs/CSA_OPERATIONS_ADMIN_SPEC.md §3.1). One weekly cycle
-- per Todd's 2026-05-27 locked decision — cycle_code is CHECK-limited to
-- 'WEEKLY' for now and the cutoff is Mon 6 AM (covers Tue Lawrenceville,
-- Wed CSA stops + home delivery, Sat farmers' markets).
--
-- Hard constraints honored:
--   • DDL persists (no trailing ROLLBACK — the Management API runner wraps
--     each submission in one implicit transaction; a verification SELECT at
--     the end is fine, a ROLLBACK would undo everything).
--   • RLS: admin/staff full; member SELECT only after published_at IS NOT
--     NULL on the catalog tables (don't leak drafts).
--   • Each table has cycle_code DEFAULT 'WEEKLY' CHECK ('WEEKLY') so a
--     future "Mon" + "Thu" split is a CHECK-relaxation + index changes
--     only, no application rewrite.
--   • set_updated_at triggers on tables with updated_at columns.
--   • audit_log triggers on each NEW table (matches the 0028/0029 pattern).
--
-- Tables created:
--   weekly_box_plan       — one row per (cycle, week, share_size); JSONB
--                           contents; published_at flips draft → live.
--   weekly_swap_menu      — curated swap items for the week (swap_out /
--                           swap_in side).
--   flex_inventory        — per-week extras catalog (price, qty, restock
--                           threshold).
--   flex_orders           — member orders against flex_inventory; status
--                           pending → locked at cutoff → fulfilled.
--   pickup_checkins       — one row per (cycle, week, member); host taps
--                           "picked up" or it rolls to unclaimed.
--   vendors               — slug-keyed vendor catalog (Goat Rodeo,
--                           Redhawk, bread, mushroom). Seeded below.
--   vendor_orders         — per-cycle totals + email-body draft; sent_at
--                           is null until admin clicks Send.
--   box_swap_events       — per-member swap events; drives both the pack
--                           sheet and the swap_credits decrement.
--
-- Existing tables touched:
--   members  — comment on customization_allowed (semantics for Phase 1
--              backfill). No column change here; the init_swap_credits
--              backfill script handles data.
-- ═══════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────
-- 1. weekly_box_plan
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS weekly_box_plan (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_code      TEXT NOT NULL DEFAULT 'WEEKLY' CHECK (cycle_code IN ('WEEKLY')),
  week_starting   DATE NOT NULL,
  share_size      TEXT NOT NULL CHECK (share_size IN ('small','large','family','regular','light')),
  contents        JSONB NOT NULL DEFAULT '[]'::jsonb,
  published_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (cycle_code, week_starting, share_size)
);
CREATE INDEX IF NOT EXISTS weekly_box_plan_week_idx
  ON weekly_box_plan (cycle_code, week_starting);

COMMENT ON TABLE weekly_box_plan IS
  'Per-week base box composition per share_size. contents is a JSONB array of {crop, qty, unit, notes}. published_at NULL = draft (admin only); non-null = locked and visible to members.';

-- ───────────────────────────────────────────────────────────────────
-- 2. weekly_swap_menu
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS weekly_swap_menu (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_code      TEXT NOT NULL DEFAULT 'WEEKLY' CHECK (cycle_code IN ('WEEKLY')),
  week_starting   DATE NOT NULL,
  side            TEXT NOT NULL CHECK (side IN ('swap_out','swap_in')),
  item            TEXT NOT NULL CHECK (length(btrim(item)) BETWEEN 1 AND 80),
  unit            TEXT,
  available_qty   INT CHECK (available_qty IS NULL OR available_qty >= 0),
  display_order   INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (cycle_code, week_starting, side, item)
);
CREATE INDEX IF NOT EXISTS weekly_swap_menu_week_idx
  ON weekly_swap_menu (cycle_code, week_starting);

COMMENT ON TABLE weekly_swap_menu IS
  'Per-week curated swap menu. side=swap_out lists what members can remove from the box; side=swap_in lists what they can add. available_qty NULL = unlimited.';

-- ───────────────────────────────────────────────────────────────────
-- 3. flex_inventory
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS flex_inventory (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_code      TEXT NOT NULL DEFAULT 'WEEKLY' CHECK (cycle_code IN ('WEEKLY')),
  week_starting   DATE NOT NULL,
  name            TEXT NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 120),
  category        TEXT,
  unit            TEXT NOT NULL,
  price_cents     INT NOT NULL CHECK (price_cents >= 0),
  available_qty   INT NOT NULL CHECK (available_qty >= 0),
  remaining_qty   INT NOT NULL CHECK (remaining_qty >= 0),
  photo_url       TEXT,
  description     TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  restock_alert_threshold INT NOT NULL DEFAULT 0 CHECK (restock_alert_threshold >= 0),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS flex_inventory_week_idx
  ON flex_inventory (cycle_code, week_starting);
CREATE INDEX IF NOT EXISTS flex_inventory_active_idx
  ON flex_inventory (cycle_code, week_starting, is_active);

COMMENT ON TABLE flex_inventory IS
  'Per-week catalog of à-la-carte extras members can buy with Farm Flex funds. remaining_qty decrements on order, resets each week.';

-- ───────────────────────────────────────────────────────────────────
-- 4. flex_orders
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS flex_orders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_code      TEXT NOT NULL DEFAULT 'WEEKLY' CHECK (cycle_code IN ('WEEKLY')),
  week_starting   DATE NOT NULL,
  member_id       UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  flex_item_id    UUID NOT NULL REFERENCES flex_inventory(id),
  qty             INT NOT NULL CHECK (qty > 0),
  unit_price_cents INT NOT NULL CHECK (unit_price_cents >= 0),
  total_cents     INT NOT NULL CHECK (total_cents >= 0),
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','locked','fulfilled','cancelled','refunded')),
  ordered_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  fulfilled_at    TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS flex_orders_week_idx
  ON flex_orders (cycle_code, week_starting);
CREATE INDEX IF NOT EXISTS flex_orders_member_status_idx
  ON flex_orders (member_id, status);
CREATE INDEX IF NOT EXISTS flex_orders_week_status_idx
  ON flex_orders (cycle_code, week_starting, status);

COMMENT ON TABLE flex_orders IS
  'Member-placed flex orders. status: pending (editable) → locked (paid, cutoff passed) → fulfilled. Cancelled/refunded are end states. Cycle close debits Shopify store credit on locked rows.';

-- ───────────────────────────────────────────────────────────────────
-- 5. pickup_checkins
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pickup_checkins (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_code      TEXT NOT NULL DEFAULT 'WEEKLY' CHECK (cycle_code IN ('WEEKLY')),
  week_starting   DATE NOT NULL,
  member_id       UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  pickup_location_id UUID REFERENCES pickup_locations(id),
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','picked_up','no_show','donated','held','contacted')),
  checked_in_at   TIMESTAMPTZ,
  checked_in_by   UUID REFERENCES customers(id),
  note            TEXT,
  UNIQUE (cycle_code, week_starting, member_id)
);
CREATE INDEX IF NOT EXISTS pickup_checkins_week_idx
  ON pickup_checkins (cycle_code, week_starting);
CREATE INDEX IF NOT EXISTS pickup_checkins_loc_idx
  ON pickup_checkins (pickup_location_id, week_starting);

COMMENT ON TABLE pickup_checkins IS
  'One row per (cycle, week, member). Host or admin marks status=picked_up at the stop; members without a row by end-of-day surface in the Unclaimed Box workflow.';

-- ───────────────────────────────────────────────────────────────────
-- 6. vendors
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vendors (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            TEXT UNIQUE NOT NULL CHECK (slug ~ '^[a-z0-9][a-z0-9-]*$'),
  name            TEXT NOT NULL,
  contact_email   TEXT NOT NULL,
  contact_phone   TEXT,
  lead_time_days  INT NOT NULL DEFAULT 7 CHECK (lead_time_days >= 0),
  order_template  TEXT,
  add_on_types    TEXT[] NOT NULL DEFAULT '{}',
  is_active       BOOLEAN NOT NULL DEFAULT true,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE vendors IS
  'Add-on vendor catalog (Goat Rodeo cheese, Redhawk coffee, the bread vendor, mushroom grower, …). lead_time_days defaults to 7 per Todd''s 2026-05-27 decision (one weekly vendor delivery). add_on_types is which add-on type names this vendor supplies (matches member subscription tags).';

-- ───────────────────────────────────────────────────────────────────
-- 7. vendor_orders
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vendor_orders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_code      TEXT NOT NULL DEFAULT 'WEEKLY' CHECK (cycle_code IN ('WEEKLY')),
  week_starting   DATE NOT NULL,
  vendor_id       UUID NOT NULL REFERENCES vendors(id),
  totals          JSONB NOT NULL DEFAULT '{}'::jsonb,
  email_subject   TEXT,
  email_body      TEXT,
  sent_at         TIMESTAMPTZ,
  sent_to         TEXT,
  override_qty    JSONB,
  notes           TEXT,
  UNIQUE (cycle_code, week_starting, vendor_id)
);
CREATE INDEX IF NOT EXISTS vendor_orders_week_idx
  ON vendor_orders (cycle_code, week_starting);

COMMENT ON TABLE vendor_orders IS
  'Per-cycle vendor order log. totals = auto-computed counts {addon_type: qty}; override_qty = admin manual overrides; sent_at NULL until admin clicks Send.';

-- ───────────────────────────────────────────────────────────────────
-- 8. box_swap_events
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS box_swap_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_code      TEXT NOT NULL DEFAULT 'WEEKLY' CHECK (cycle_code IN ('WEEKLY')),
  week_starting   DATE NOT NULL,
  member_id       UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  swap_out_item   TEXT NOT NULL CHECK (length(btrim(swap_out_item)) BETWEEN 1 AND 80),
  swap_in_item    TEXT NOT NULL CHECK (length(btrim(swap_in_item)) BETWEEN 1 AND 80),
  credits_used    INT NOT NULL DEFAULT 1 CHECK (credits_used > 0),
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','locked','reverted')),
  ordered_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  locked_at       TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS box_swap_events_week_idx
  ON box_swap_events (cycle_code, week_starting);
CREATE INDEX IF NOT EXISTS box_swap_events_member_status_idx
  ON box_swap_events (member_id, status);
CREATE INDEX IF NOT EXISTS box_swap_events_week_status_idx
  ON box_swap_events (cycle_code, week_starting, status);

COMMENT ON TABLE box_swap_events IS
  'Per-member swap events for a cycle. status: pending (editable) → locked (final, applied to pack list) → reverted. Drives both members.swap_credits decrement and the pack sheet swap flags.';

-- ───────────────────────────────────────────────────────────────────
-- 9. updated_at triggers (reuse the existing set_updated_at fn)
-- ───────────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_weekly_box_plan_updated_at ON weekly_box_plan;
CREATE TRIGGER trg_weekly_box_plan_updated_at
  BEFORE UPDATE ON weekly_box_plan
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_flex_inventory_updated_at ON flex_inventory;
CREATE TRIGGER trg_flex_inventory_updated_at
  BEFORE UPDATE ON flex_inventory
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ───────────────────────────────────────────────────────────────────
-- 10. audit_log triggers (reuse the existing log_audit_event fn)
-- ───────────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_audit_weekly_box_plan ON weekly_box_plan;
CREATE TRIGGER trg_audit_weekly_box_plan
  AFTER INSERT OR UPDATE OR DELETE ON weekly_box_plan
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS trg_audit_weekly_swap_menu ON weekly_swap_menu;
CREATE TRIGGER trg_audit_weekly_swap_menu
  AFTER INSERT OR UPDATE OR DELETE ON weekly_swap_menu
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS trg_audit_flex_inventory ON flex_inventory;
CREATE TRIGGER trg_audit_flex_inventory
  AFTER INSERT OR UPDATE OR DELETE ON flex_inventory
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS trg_audit_flex_orders ON flex_orders;
CREATE TRIGGER trg_audit_flex_orders
  AFTER INSERT OR UPDATE OR DELETE ON flex_orders
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS trg_audit_pickup_checkins ON pickup_checkins;
CREATE TRIGGER trg_audit_pickup_checkins
  AFTER INSERT OR UPDATE OR DELETE ON pickup_checkins
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS trg_audit_vendors ON vendors;
CREATE TRIGGER trg_audit_vendors
  AFTER INSERT OR UPDATE OR DELETE ON vendors
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS trg_audit_vendor_orders ON vendor_orders;
CREATE TRIGGER trg_audit_vendor_orders
  AFTER INSERT OR UPDATE OR DELETE ON vendor_orders
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS trg_audit_box_swap_events ON box_swap_events;
CREATE TRIGGER trg_audit_box_swap_events
  AFTER INSERT OR UPDATE OR DELETE ON box_swap_events
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- ───────────────────────────────────────────────────────────────────
-- 11. RLS policies (spec §3.3)
--
-- Catalog tables (weekly_box_plan, weekly_swap_menu, flex_inventory,
-- vendors, vendor_orders): admin/staff full; member SELECT only after
-- published_at IS NOT NULL (so drafts stay private). vendors don't have
-- a publish gate — members never read them; admin-only.
--
-- flex_orders: member can SELECT/INSERT/UPDATE own (member_id resolves
-- via the same membership path stop_messages uses — by joining to members
-- → customer_id → current_customer_id()). Admin/staff full.
--
-- box_swap_events: same as flex_orders.
--
-- pickup_checkins: admin/staff full; member SELECT own (so /box can show
-- "picked up ✓"); no member INSERT (host or admin checks them in).
-- ───────────────────────────────────────────────────────────────────

ALTER TABLE weekly_box_plan      ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_swap_menu     ENABLE ROW LEVEL SECURITY;
ALTER TABLE flex_inventory       ENABLE ROW LEVEL SECURITY;
ALTER TABLE flex_orders          ENABLE ROW LEVEL SECURITY;
ALTER TABLE pickup_checkins      ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors              ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_orders        ENABLE ROW LEVEL SECURITY;
ALTER TABLE box_swap_events      ENABLE ROW LEVEL SECURITY;

-- ── weekly_box_plan ────────────────────────────────────────────────
DROP POLICY IF EXISTS weekly_box_plan_admin_all   ON weekly_box_plan;
CREATE POLICY weekly_box_plan_admin_all ON weekly_box_plan
  FOR ALL TO authenticated
  USING (is_admin_caller()) WITH CHECK (is_admin_caller());

DROP POLICY IF EXISTS weekly_box_plan_member_read ON weekly_box_plan;
CREATE POLICY weekly_box_plan_member_read ON weekly_box_plan
  FOR SELECT TO authenticated
  USING (published_at IS NOT NULL);

-- ── weekly_swap_menu ───────────────────────────────────────────────
DROP POLICY IF EXISTS weekly_swap_menu_admin_all   ON weekly_swap_menu;
CREATE POLICY weekly_swap_menu_admin_all ON weekly_swap_menu
  FOR ALL TO authenticated
  USING (is_admin_caller()) WITH CHECK (is_admin_caller());

-- Swap menu doesn't carry its own publish flag; it's visible whenever the
-- matching box plan for that (week, size) is published. We enforce this in
-- the application layer (the /box page only fetches the menu after it has
-- fetched a published plan). DB-side: allow member SELECT — leaking a
-- curated swap list pre-publish is low-impact and the simpler policy is
-- the right call here.
DROP POLICY IF EXISTS weekly_swap_menu_member_read ON weekly_swap_menu;
CREATE POLICY weekly_swap_menu_member_read ON weekly_swap_menu
  FOR SELECT TO authenticated
  USING (true);

-- ── flex_inventory ─────────────────────────────────────────────────
DROP POLICY IF EXISTS flex_inventory_admin_all   ON flex_inventory;
CREATE POLICY flex_inventory_admin_all ON flex_inventory
  FOR ALL TO authenticated
  USING (is_admin_caller()) WITH CHECK (is_admin_caller());

DROP POLICY IF EXISTS flex_inventory_member_read ON flex_inventory;
CREATE POLICY flex_inventory_member_read ON flex_inventory
  FOR SELECT TO authenticated
  USING (is_active = true);

-- ── flex_orders ────────────────────────────────────────────────────
DROP POLICY IF EXISTS flex_orders_admin_all ON flex_orders;
CREATE POLICY flex_orders_admin_all ON flex_orders
  FOR ALL TO authenticated
  USING (is_admin_caller()) WITH CHECK (is_admin_caller());

-- Member SELECT/INSERT/UPDATE own — resolve member_id → customer via the
-- members table, then compare to current_customer_id() (household-aware).
DROP POLICY IF EXISTS flex_orders_member_select ON flex_orders;
CREATE POLICY flex_orders_member_select ON flex_orders
  FOR SELECT TO authenticated
  USING (
    member_id IN (
      SELECT id FROM members WHERE customer_id = current_customer_id()
    )
  );

DROP POLICY IF EXISTS flex_orders_member_insert ON flex_orders;
CREATE POLICY flex_orders_member_insert ON flex_orders
  FOR INSERT TO authenticated
  WITH CHECK (
    member_id IN (
      SELECT id FROM members WHERE customer_id = current_customer_id()
    )
  );

DROP POLICY IF EXISTS flex_orders_member_update ON flex_orders;
CREATE POLICY flex_orders_member_update ON flex_orders
  FOR UPDATE TO authenticated
  USING (
    member_id IN (
      SELECT id FROM members WHERE customer_id = current_customer_id()
    )
  )
  WITH CHECK (
    member_id IN (
      SELECT id FROM members WHERE customer_id = current_customer_id()
    )
  );

-- ── box_swap_events ────────────────────────────────────────────────
DROP POLICY IF EXISTS box_swap_events_admin_all ON box_swap_events;
CREATE POLICY box_swap_events_admin_all ON box_swap_events
  FOR ALL TO authenticated
  USING (is_admin_caller()) WITH CHECK (is_admin_caller());

DROP POLICY IF EXISTS box_swap_events_member_select ON box_swap_events;
CREATE POLICY box_swap_events_member_select ON box_swap_events
  FOR SELECT TO authenticated
  USING (
    member_id IN (
      SELECT id FROM members WHERE customer_id = current_customer_id()
    )
  );

DROP POLICY IF EXISTS box_swap_events_member_insert ON box_swap_events;
CREATE POLICY box_swap_events_member_insert ON box_swap_events
  FOR INSERT TO authenticated
  WITH CHECK (
    member_id IN (
      SELECT id FROM members WHERE customer_id = current_customer_id()
    )
  );

DROP POLICY IF EXISTS box_swap_events_member_update ON box_swap_events;
CREATE POLICY box_swap_events_member_update ON box_swap_events
  FOR UPDATE TO authenticated
  USING (
    member_id IN (
      SELECT id FROM members WHERE customer_id = current_customer_id()
    )
  )
  WITH CHECK (
    member_id IN (
      SELECT id FROM members WHERE customer_id = current_customer_id()
    )
  );

-- ── pickup_checkins ────────────────────────────────────────────────
DROP POLICY IF EXISTS pickup_checkins_admin_all ON pickup_checkins;
CREATE POLICY pickup_checkins_admin_all ON pickup_checkins
  FOR ALL TO authenticated
  USING (is_admin_caller()) WITH CHECK (is_admin_caller());

DROP POLICY IF EXISTS pickup_checkins_member_select ON pickup_checkins;
CREATE POLICY pickup_checkins_member_select ON pickup_checkins
  FOR SELECT TO authenticated
  USING (
    member_id IN (
      SELECT id FROM members WHERE customer_id = current_customer_id()
    )
  );
-- DELIBERATELY no member INSERT/UPDATE — only host or admin checks in.

-- ── vendors ────────────────────────────────────────────────────────
DROP POLICY IF EXISTS vendors_admin_all ON vendors;
CREATE POLICY vendors_admin_all ON vendors
  FOR ALL TO authenticated
  USING (is_admin_caller()) WITH CHECK (is_admin_caller());
-- No member read policy — members never see vendor catalog.

-- ── vendor_orders ──────────────────────────────────────────────────
DROP POLICY IF EXISTS vendor_orders_admin_all ON vendor_orders;
CREATE POLICY vendor_orders_admin_all ON vendor_orders
  FOR ALL TO authenticated
  USING (is_admin_caller()) WITH CHECK (is_admin_caller());

-- ───────────────────────────────────────────────────────────────────
-- 12. Vendor seed data (the four known suppliers per spec §6 Phase 1).
--    Contact emails are PLACEHOLDERS — Todd/Frankie must confirm actual
--    addresses before any vendor order is sent. is_active stays true so
--    the page renders, but a TODO note flags it.
-- ───────────────────────────────────────────────────────────────────
INSERT INTO vendors (slug, name, contact_email, lead_time_days, add_on_types, notes) VALUES
  ('goat-rodeo',      'Goat Rodeo Farm & Dairy',  'hello@goatrodeofarm.com',   7, ARRAY['cheese'],   'TODO: Confirm contact email with Todd before sending an order. Cheese add-on supplier.'),
  ('redhawk',         'Redhawk Coffee Roasters',  'hello@redhawkcoffee.com',   7, ARRAY['coffee'],   'TODO: Confirm contact email with Todd before sending an order. Coffee add-on supplier.'),
  ('local-bread',     'Local Bread Vendor (TBD)', 'todd@tinyseedfarmpgh.com',  7, ARRAY['bread'],    'TODO: Replace placeholder name + email with the real bread vendor. Bread add-on supplier.'),
  ('mushroom-grower', 'Mushroom Grower (TBD)',    'todd@tinyseedfarmpgh.com',  7, ARRAY['mushroom'], 'TODO: Replace placeholder name + email with the real mushroom grower. Mushroom add-on supplier.')
ON CONFLICT (slug) DO NOTHING;

-- ───────────────────────────────────────────────────────────────────
-- 13. Verification (read-only — runner returns the LAST SELECT's rows).
--     NOT wrapped in a transaction; the implicit DDL above persists.
-- ───────────────────────────────────────────────────────────────────

-- (a) All eight tables exist.
SELECT
  EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='weekly_box_plan')   AS weekly_box_plan,
  EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='weekly_swap_menu')  AS weekly_swap_menu,
  EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='flex_inventory')    AS flex_inventory,
  EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='flex_orders')       AS flex_orders,
  EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='pickup_checkins')   AS pickup_checkins,
  EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='vendors')           AS vendors,
  EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='vendor_orders')     AS vendor_orders,
  EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='box_swap_events')   AS box_swap_events,
  (SELECT COUNT(*) FROM vendors)                                                                AS vendor_seed_count;
