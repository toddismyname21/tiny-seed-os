-- 0093 — Persist the QuickBooks customer mapping on each wholesale account.
--
-- WHY THIS EXISTS
-- ---------------
-- /api/admin/wholesale/deliver resolves the QuickBooks customer with
-- findCustomerByName(restaurant_name) — an EXACT DisplayName match. Portal
-- names and QuickBooks DisplayNames diverged long ago:
--
--   portal "Allegro"               -> QB "allegrohearthbakery"
--   portal "Mediterra Mt. Lebanon" -> QB "Mediterra Cafe"
--   portal "Butter Joint"          -> QB "butterjoint - George"
--   portal "Black Radish Kitchen"  -> QB "black Radish, Kate Romane"
--   portal "Center for Hope (PASS)"-> QB "Greater Pittsburgh Community Food Bank"
--
-- Every one of those returns NULL, so Deliver records the drop-off and then
-- bails with qb_customer_not_found — the order stays unbilled and unlinked.
-- That is the mechanism behind the 2026-08-24 reconciliation finding: 65
-- portal orders reading "uninvoiced" while QuickBooks had already billed
-- $25,096. Renaming in QuickBooks is NOT an option (it would rewrite the
-- customer-facing name on years of paid invoices), so the mapping is stored.
--
-- qbo_customer_id is the durable key: QuickBooks Ids never change, while
-- DisplayNames do. qbo_customer_name is a human-readable cache for audit
-- output only — resolution MUST prefer the id.
--
-- Nullable by design: a brand-new account has no QuickBooks customer yet, and
-- deliver.ts must keep falling back to exact-name lookup so nothing regresses.

alter table public.wholesale_accounts
  add column if not exists qbo_customer_id   text,
  add column if not exists qbo_customer_name text;

comment on column public.wholesale_accounts.qbo_customer_id is
  'QuickBooks Customer.Id billed for this account. Preferred over restaurant_name, which frequently differs from the QB DisplayName. NULL = fall back to exact-name lookup.';
comment on column public.wholesale_accounts.qbo_customer_name is
  'Cached QuickBooks DisplayName for audit/reporting only. Never resolve by this — use qbo_customer_id.';

-- Two portal accounts must never map to the same QuickBooks customer: that
-- would merge two restaurants' ledgers. Partial so the many NULLs are exempt.
create unique index if not exists wholesale_accounts_qbo_customer_id_key
  on public.wholesale_accounts (qbo_customer_id)
  where qbo_customer_id is not null;

-- Reconciler lookup: "which orders for this account are still unlinked?"
create index if not exists wholesale_orders_account_unlinked_idx
  on public.wholesale_orders (account_id, delivery_date)
  where invoice_number is null;
