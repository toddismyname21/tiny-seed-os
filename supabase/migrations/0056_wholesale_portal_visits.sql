-- 0056_wholesale_portal_visits.sql
-- Engagement tracking for the wholesale (chef) ordering portal.
--
-- WHY: there was no way for Todd to see which chefs actually opened their
-- /order/<token> page vs. never looked. The only hard signal was "placed an
-- order". These columns + RPC give the admin Orders view an "Emailed ->
-- Visited -> Ordered" funnel. Visit counts accrue from the moment this ships
-- (no retroactive data); placed-order data is already fully accurate.
--
-- The order page (public, no-login, server-side service-role) calls
-- bump_wholesale_visit(account_id) on every successful page load.

alter table public.wholesale_accounts
  add column if not exists first_portal_visit_at timestamptz,
  add column if not exists last_portal_visit_at  timestamptz,
  add column if not exists portal_visit_count    integer not null default 0;

-- Atomic increment (supabase-js cannot express col = col + 1 in .update()).
create or replace function public.bump_wholesale_visit(p_account uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.wholesale_accounts
     set portal_visit_count    = coalesce(portal_visit_count, 0) + 1,
         last_portal_visit_at  = now(),
         first_portal_visit_at = coalesce(first_portal_visit_at, now())
   where id = p_account;
$$;

grant execute on function public.bump_wholesale_visit(uuid) to service_role, authenticated;
