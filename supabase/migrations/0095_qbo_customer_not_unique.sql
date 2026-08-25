-- 0095 — Several wholesale accounts MAY share one QuickBooks customer.
--
-- Migration 0093 put a partial-UNIQUE index on wholesale_accounts.qbo_customer_id,
-- reasoning that two accounts mapping to one QuickBooks customer would merge two
-- restaurants' ledgers. That is true for restaurants and false for food banks.
--
-- Greater Pittsburgh Community Food Bank runs the PASS program through multiple
-- partner agencies. Tiny Seed delivers to each agency separately — Center for
-- Hope in Ambridge, Gleaner's at St. Ferdinand in Cranberry Township — but every
-- one of those deliveries is invoiced to the SAME QuickBooks customer (the Food
-- Bank), distinguished by its own Sales Order number. Two portal accounts, one
-- payer, by design.
--
-- Found 2026-08-25 when Linda Leary's Gleaner's order for 8/26 could not be
-- mapped: the unique index rejected it because Center for Hope already held
-- customer 1099. The mapping is what makes deliver.ts able to invoice at all,
-- so the constraint was blocking real revenue.
--
-- Dropping uniqueness does not weaken reconciliation: reconcile() already
-- refuses to link when a tier yields more than one candidate order, so two
-- accounts under one customer produce a reported ambiguity rather than a wrong
-- link. A plain index preserves the lookup speed the unique index gave us.

drop index if exists public.wholesale_accounts_qbo_customer_id_key;

create index if not exists wholesale_accounts_qbo_customer_id_idx
  on public.wholesale_accounts (qbo_customer_id)
  where qbo_customer_id is not null;

comment on column public.wholesale_accounts.qbo_customer_id is
  'QuickBooks Customer.Id billed for this account. Preferred over restaurant_name, which frequently differs from the QB DisplayName. NOT unique: PASS food-bank agencies share one payer (the Food Bank) and are separated by Sales Order number. NULL = fall back to exact-name lookup.';
