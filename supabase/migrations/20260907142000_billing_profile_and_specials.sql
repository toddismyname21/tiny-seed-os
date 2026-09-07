-- Phase 1+3 (Todd-approved 2026-09-07): per-account billing profile + specials containers
-- docs/specs/PACK_INVOICE_SPECIALS_PROPOSAL.md

-- Auto-send the QuickBooks invoice at the delivery tap. Per-account, not global
-- (research: Local Line models billing behavior per customer). Default TRUE for
-- restaurants; vendor/PO-driven accounts are flipped off below.
ALTER TABLE wholesale_accounts
  ADD COLUMN IF NOT EXISTS auto_send_invoice boolean NOT NULL DEFAULT true;
COMMENT ON COLUMN wholesale_accounts.auto_send_invoice IS
  'When true, /api/admin/wholesale/deliver emails the QuickBooks invoice (with pay button) immediately after creating it. False = create only; Todd sends manually (Harvie needs PO memos, etc.).';

-- Vendor/PO-flow accounts: invoice goes through their AP process, never auto-emailed.
UPDATE wholesale_accounts SET auto_send_invoice = false
 WHERE lower(trim(restaurant_name)) IN ('harvie', 'market wagon');

-- Specials: an item whose units ship as SEPARATE physical containers. Each
-- container gets its own "Name — 1 of N" cell on the Avery 6-up label run.
ALTER TABLE flex_inventory
  ADD COLUMN IF NOT EXISTS separate_container boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN flex_inventory.separate_container IS
  'True = each unit of a flex order for this item is a separate physical container (e.g. 10 lb tomato flat) and prints its own per-container label cell.';

-- The live tomato flats are the first separate-container special.
UPDATE flex_inventory SET separate_container = true
 WHERE name = 'Bulk Tomatoes — 10 lb flat';

-- notification_log gains 'quickbooks' as a provider: auto-sent invoices are
-- delivered by QuickBooks' own mailer, and every send must leave an audit row
-- (caught by astro check before it could 23514 at runtime).
ALTER TABLE notification_log DROP CONSTRAINT notification_log_provider_check;
ALTER TABLE notification_log ADD CONSTRAINT notification_log_provider_check
  CHECK (provider = ANY (ARRAY['resend'::text,'twilio_verify'::text,'twilio_sms'::text,'gmail_legacy'::text,'quickbooks'::text]));
