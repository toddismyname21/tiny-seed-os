-- ═══════════════════════════════════════════════════════════════════
-- Migration 0022: Shopify → Supabase order sync (idempotency state)
--
-- Why this migration exists
-- ─────────────────────────
-- The 2026 CSA data migration was a point-in-time snapshot. After it ran,
-- new Shopify orders stopped flowing into Supabase and ~100 customers
-- developed gaps (since manually reconciled). To make sure future orders
-- never drop, `/api/sync/shopify-orders` polls Shopify forward from a
-- watermark and upserts members + issues flex store credit. That endpoint
-- is SENSITIVE (creates member rows, issues real money), so it leans on
-- the two tables created here for strict idempotency:
--
--   1. shopify_sync_state — single-row watermark. The sync only ever
--      processes orders updated at/after `last_synced_at`. Seeded to
--      NOW() at deploy time so the very first run looks ONLY at orders
--      from deploy-time forward — everything historical is already
--      reconciled and must not be re-imported.
--
--   2. shopify_order_sync — per-order ledger. One row per Shopify order
--      the sync has touched, keyed by `shopify_order_id`. Presence of a
--      row means "already processed — skip". It also records how many
--      member rows were upserted and how much flex credit was issued, so
--      a re-run can prove it never double-credits.
--
-- RLS: enabled, admin-only (reuses the is_admin_caller() helper from
-- migration 0017). The sync endpoint itself runs as the service role,
-- which bypasses RLS entirely — these policies exist so the admin UI (or
-- a curious human via the cookie-aware client) can inspect sync state,
-- and so no member/anon can read or tamper with it.
--
-- Forward-only. Apply via the Supabase Management API
-- (scripts/migrate-csa/run_migration.py).
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

-- ───────────────────────────────────────────────────────────────────
-- 1. shopify_sync_state — single-row watermark
--
-- The `id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1)` idiom pins the table
-- to exactly one row: any second INSERT either omits id (→ default 1 →
-- PK conflict) or supplies a non-1 id (→ CHECK violation). The sync
-- always UPDATEs the existing row; it never INSERTs.
-- ───────────────────────────────────────────────────────────────────

CREATE TABLE shopify_sync_state (
  id              INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  last_synced_at  TIMESTAMPTZ,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE shopify_sync_state IS
  'Single-row watermark for the Shopify→Supabase order sync. The sync processes only orders with updated_at >= last_synced_at, then advances the watermark. CHECK(id=1) pins it to one row.';
COMMENT ON COLUMN shopify_sync_state.last_synced_at IS
  'High-water mark. Seeded to deploy-time NOW() so the first run ignores all historical (already-reconciled) orders. Advanced to max(order.updated_at) seen on each completed run.';

-- Seed the single row with the watermark at deploy time. Everything
-- before this instant is already reconciled and must NOT be re-imported.
INSERT INTO shopify_sync_state (id, last_synced_at, updated_at)
VALUES (1, NOW(), NOW());

-- ───────────────────────────────────────────────────────────────────
-- 2. shopify_order_sync — per-order idempotency ledger
--
-- One row per Shopify order the sync has processed (or attempted). The
-- PK is the Shopify order id (numeric portion of the GID, stored as
-- text). The sync checks for an existing row BEFORE doing any write for
-- an order — presence == "already handled, skip".
--
--   - members_upserted: how many member rows this order produced. Lets a
--     human verify counts without re-querying Shopify.
--   - flex_credited: dollars of store credit issued for this order's flex
--     line items. The endpoint guards flex issuance on this being 0 (or
--     absent) so a re-run can never double-credit.
--   - last_error: NULL on success. If processing an order throws, the
--     endpoint records the message here and CONTINUES with the next
--     order — one bad order never fails the whole run.
-- ───────────────────────────────────────────────────────────────────

CREATE TABLE shopify_order_sync (
  shopify_order_id  TEXT PRIMARY KEY,
  order_name        TEXT,
  members_upserted  INT NOT NULL DEFAULT 0 CHECK (members_upserted >= 0),
  flex_credited     NUMERIC NOT NULL DEFAULT 0 CHECK (flex_credited >= 0),
  processed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_error        TEXT
);

COMMENT ON TABLE shopify_order_sync IS
  'Per-order idempotency ledger for the Shopify→Supabase sync. A row''s presence (keyed by shopify_order_id) means the order was already processed and must be skipped. Records members upserted + flex credited so re-runs cannot double-act.';
COMMENT ON COLUMN shopify_order_sync.flex_credited IS
  'Dollars of Shopify store credit issued for this order''s flex line items. Flex issuance is guarded on this being 0/absent so a re-run never double-credits.';
COMMENT ON COLUMN shopify_order_sync.last_error IS
  'NULL on success. Records the error message when an order fails to process; the run continues with the next order rather than failing wholesale.';

CREATE INDEX shopify_order_sync_processed_idx
  ON shopify_order_sync (processed_at DESC);

-- Partial index over rows that errored — lets an admin quickly find
-- orders that need a retry / manual look without scanning the whole table.
CREATE INDEX shopify_order_sync_error_idx
  ON shopify_order_sync (processed_at DESC)
  WHERE last_error IS NOT NULL;

-- ───────────────────────────────────────────────────────────────────
-- 3. updated_at maintenance on shopify_sync_state (consistent w/ 0010)
--
-- set_updated_at() was created in migration 0010 and bumps NEW.updated_at
-- to NOW() on every UPDATE. shopify_order_sync has no updated_at column
-- (it's an append-mostly ledger; processed_at carries the timestamp), so
-- only the state table gets the trigger.
-- ───────────────────────────────────────────────────────────────────

CREATE TRIGGER trg_shopify_sync_state_updated_at
  BEFORE UPDATE ON shopify_sync_state
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- ───────────────────────────────────────────────────────────────────
-- 4. RLS — enable + admin-only policies
--
-- The service role (used by the sync endpoint) bypasses RLS, so these
-- policies exist solely to (a) let the admin UI read sync state via the
-- cookie-aware client and (b) deny members/anon any access. Pattern
-- matches migration 0017's admin-bypass policies: FOR ALL TO
-- authenticated USING/​WITH CHECK is_admin_caller().
-- ───────────────────────────────────────────────────────────────────

ALTER TABLE shopify_sync_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopify_order_sync ENABLE ROW LEVEL SECURITY;

CREATE POLICY admin_all_shopify_sync_state ON shopify_sync_state
  FOR ALL
  TO authenticated
  USING (is_admin_caller())
  WITH CHECK (is_admin_caller());

CREATE POLICY admin_all_shopify_order_sync ON shopify_order_sync
  FOR ALL
  TO authenticated
  USING (is_admin_caller())
  WITH CHECK (is_admin_caller());

COMMIT;
