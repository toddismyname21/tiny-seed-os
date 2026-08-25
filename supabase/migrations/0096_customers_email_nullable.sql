-- 0096 — customers.email may be NULL.
--
-- WHY: not every customer has an email address. Gleaner's Food Bank (Linda
-- Leary) is invoiced ON PAPER, handed to her in person at the 7 AM drop; she has
-- a phone and nothing else. The NOT NULL constraint made her unrepresentable, and
-- the only ways around it were inventing a fake address or leaving
-- wholesale_accounts.customer_id NULL.
--
-- Leaving it NULL is not harmless: a driver stop must reference a customers.id,
-- so an unlinked wholesale account silently drops out of the saved route and
-- sinks to the bottom of the pack sheet (see 2026-08-25 CHANGE_LOG). Modelling
-- the real customer is the fix; a placeholder email would have been a stub that
-- something would eventually try to send mail to.
--
-- SAFE because:
--  • 503 rows today, 0 with a NULL or blank email — nothing is retro-affected.
--  • customers_email_key stays UNIQUE. Postgres treats NULLs as distinct, so any
--    number of no-email customers coexist without collision.
--  • Every reader is already guarded or null-safe: market-checkout and
--    flex-credit bail on a falsy email; cycle/reports/weekly-email/
--    flex-order-reminder use `?.` / `?? ''`.
--  • Rows that will be NULL are customer_type='wholesale' with NO members row,
--    so they never enter onboarding, referral, weekly email or flex — those all
--    reach customers THROUGH members.
--
-- NULL means "no email on file — reached by phone or in person". It does NOT
-- mean unknown-but-expected; if an email exists, record it.

alter table public.customers alter column email drop not null;

comment on column public.customers.email is
  'Email address, or NULL when the customer has none on file (in-person/phone customers such as food-bank pantries invoiced on paper). UNIQUE still applies; Postgres treats NULLs as distinct. Any send path must guard on a falsy email.';
