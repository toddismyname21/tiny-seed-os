-- 0087_phone_identity_resolution.sql
--
-- PHASE 1 of the text-commitment system: link an incoming text message to the
-- CSA member or wholesale account it came from.
--
-- ── WHY ──────────────────────────────────────────────────────────────────────
-- Todd runs the farm over text. Chefs and CSA members text requests, he agrees,
-- and the promise then lives only in his head. Before any commitment capture is
-- possible we have to answer "WHO texted?" — an unattributed commitment is
-- useless.
--
-- Measured 2026-08-16 from the live Messages DB (scripts/read_messages.py):
--   • 249 senders over 42 days, 41.8 messages/day
--   • 64 two-way (real) conversations vs 184 one-way burner-spam senders
--   • only 17 of those 64 real conversations (26.6%) matched an account
--   • 47 real, active conversations were UNIDENTIFIABLE
--
-- Root cause is structural, not a data-entry gap:
--   • customers.phone           → exactly ONE phone per person
--   • wholesale_accounts.phone  → ONE per restaurant (the main/landline number)
--   • wholesale_account_contacts→ has email + routing flags but NO phone at all
--   • account_members           → links households by EMAIL only
-- So a member's spouse texting from their own phone, or (far more common) a chef
-- texting from his personal cell rather than the restaurant's main line, is both
-- unmatchable AND unstorable. There is nowhere to put the number.
--
-- ── WHAT THIS DOES ───────────────────────────────────────────────────────────
--   1) customer_phones — many phones → one customer (spouse, second line, work)
--   2) wholesale_account_contacts.phone — so a chef's personal cell can be stored
--   3) backfills customer_phones from the 213 numbers already on customers.phone
--
-- Purely ADDITIVE. No existing column is altered or dropped; no existing row is
-- modified. customers.phone stays exactly as it is and remains the sign-in gate
-- (see apps/csa-portal/src/lib/phone.ts) — this table SUPPLEMENTS it for
-- inbound identification, it does not replace it.
--
-- Idempotent: CREATE TABLE / ADD COLUMN / CREATE INDEX all IF NOT EXISTS, and
-- the backfill is ON CONFLICT DO NOTHING. Safe to re-run.


-- ── 1) customer_phones ───────────────────────────────────────────────────────

create table if not exists public.customer_phones (
  id           uuid primary key default gen_random_uuid(),
  customer_id  uuid not null references public.customers(id) on delete cascade,

  -- Canonical BARE 10 DIGITS ("4124073884"), matching normalizeUSPhone() in
  -- apps/csa-portal/src/lib/phone.ts. Storing one canonical form is what makes
  -- an inbound handle comparable at all — the same person appears in the
  -- Messages DB as +14124073884, (412) 407-3884, or 412-407-3884.
  -- The CHECK mirrors that function's NANP rule exactly: 10 digits, with the
  -- area-code and exchange first digits both 2-9. Keep the two in sync.
  phone        text not null
                 constraint customer_phones_canonical
                 check (phone ~ '^[2-9][0-9]{2}[2-9][0-9]{6}$'),

  label        text not null default 'mobile',
  is_primary   boolean not null default false,

  -- Provenance matters for trust: a number Todd tapped to link from a real text
  -- thread is stronger evidence than one bulk-copied from a legacy import.
  --   'customers.phone' → backfilled below from the existing column
  --   'linked_from_text'→ Todd linked an unknown sender in the admin queue
  --   'portal'          → member entered it themselves
  --   'shopify'         → came in on a Shopify order
  --   'manual'          → staff typed it in
  source       text not null default 'manual',

  -- Set when we have positive confirmation the number really is this person
  -- (they replied from it, or Todd explicitly confirmed the link).
  verified_at  timestamptz,
  created_by   text,
  created_at   timestamptz not null default now(),

  -- ONE customer per number, deliberately.
  --
  -- Households genuinely can share a landline, so this will occasionally reject
  -- a link. That is the INTENDED behaviour: a phone mapping to two customers
  -- makes inbound attribution ambiguous, and a silently wrong attribution (a
  -- commitment filed against the wrong member) is far more damaging than a loud
  -- failure Todd can resolve. Shared household numbers should link to the
  -- account OWNER — households are already modelled by account_members.
  constraint customer_phones_phone_key unique (phone)
);

-- Primary lookup path: inbound handle → customer. Explicitly indexed rather
-- than relying on the unique constraint's index, so intent survives refactors.
create index if not exists customer_phones_phone_idx
  on public.customer_phones (phone);

create index if not exists customer_phones_customer_idx
  on public.customer_phones (customer_id);

-- At most one primary number per customer. Partial unique index (rather than a
-- constraint) because only the is_primary=true rows need to be constrained.
create unique index if not exists customer_phones_one_primary_idx
  on public.customer_phones (customer_id)
  where is_primary;

comment on table public.customer_phones is
  'Many-phones-to-one-customer alias table (migration 0087). Powers inbound '
  'text-message identity resolution: a Messages handle is normalized to bare '
  '10 digits and looked up here. SUPPLEMENTS customers.phone (which remains the '
  'single sign-in gate value) rather than replacing it. phone is UNIQUE so that '
  'attribution is never ambiguous — see the constraint comment in 0087.';

comment on column public.customer_phones.source is
  'Provenance: customers.phone | linked_from_text | portal | shopify | manual. '
  'linked_from_text is the strongest signal (Todd confirmed it against a real '
  'conversation); legacy bulk values are the weakest.';

-- RLS: this table is member PII (phone numbers). Admin/staff ONLY.
-- Deliberately NOT readable by members: there is no member-facing feature here,
-- and current_customer_id()-scoped access would still expose the household
-- owner's number to a shared-account member who never had it.
alter table public.customer_phones enable row level security;

drop policy if exists customer_phones_admin_all on public.customer_phones;
create policy customer_phones_admin_all on public.customer_phones
  for all using (is_admin_caller()) with check (is_admin_caller());


-- ── 2) wholesale_account_contacts.phone ──────────────────────────────────────
--
-- The chef gap. wholesale_accounts.phone holds the restaurant's main line, but
-- chefs almost always text from a personal cell — which today has nowhere to
-- live. Nullable because existing contact rows are email-only and must stay
-- valid. Same canonical-10-digit CHECK as above; NULL is allowed, so the
-- constraint only bites on non-null values.

alter table public.wholesale_account_contacts
  add column if not exists phone text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'wholesale_account_contacts_phone_canonical'
  ) then
    alter table public.wholesale_account_contacts
      add constraint wholesale_account_contacts_phone_canonical
      check (phone is null or phone ~ '^[2-9][0-9]{2}[2-9][0-9]{6}$');
  end if;
end $$;

create index if not exists wholesale_account_contacts_phone_idx
  on public.wholesale_account_contacts (phone)
  where phone is not null;

comment on column public.wholesale_account_contacts.phone is
  'Canonical bare 10-digit US number for THIS contact (migration 0087). Chefs '
  'text from personal cells, not the restaurant main line in '
  'wholesale_accounts.phone — without this an inbound chef text cannot be '
  'attributed to an account. Nullable: existing rows are email-only.';


-- ── 3) Backfill customer_phones from customers.phone ─────────────────────────
--
-- Seeds the table with every number already on file (213 at time of writing) so
-- identity resolution works immediately rather than starting from empty.
--
-- Normalization is done in SQL to exactly mirror normalizeUSPhone():
--   • strip all non-digits
--   • drop a leading '1' on an 11-digit string
--   • keep only results that satisfy the NANP pattern
-- Rows whose stored value is junk (too short, letters, 000-/1xx- prefixes)
-- simply don't match the WHERE and are skipped rather than failing the CHECK.
--
-- is_primary=true because customers.phone IS the member's primary number (it is
-- the value the sign-in gate enforces). ON CONFLICT DO NOTHING makes re-runs
-- safe and tolerates two customers sharing a number (first one wins; the second
-- surfaces later in the admin unknown-number queue for Todd to resolve).

insert into public.customer_phones (customer_id, phone, label, is_primary, source, created_by)
select
  c.id,
  normalized.digits,
  'mobile',
  true,
  'customers.phone',
  'migration_0087'
from public.customers c
cross join lateral (
  select case
           when length(regexp_replace(coalesce(c.phone, ''), '\D', '', 'g')) = 11
                and left(regexp_replace(coalesce(c.phone, ''), '\D', '', 'g'), 1) = '1'
             then right(regexp_replace(coalesce(c.phone, ''), '\D', '', 'g'), 10)
           else regexp_replace(coalesce(c.phone, ''), '\D', '', 'g')
         end as digits
) normalized
where normalized.digits ~ '^[2-9][0-9]{2}[2-9][0-9]{6}$'
on conflict (phone) do nothing;
