-- 0046 — tie each member to its originating Shopify order (stops payment-reconciliation drift).
-- Applied live 2026-06-16; backfilled from notes + add-on→box link + Shopify-match (scripts/reconcile_orders.py).
ALTER TABLE members ADD COLUMN IF NOT EXISTS shopify_order_id text;
CREATE INDEX IF NOT EXISTS members_shopify_order_idx ON members (shopify_order_id);
