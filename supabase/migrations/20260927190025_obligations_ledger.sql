-- Obligations ledger (Todd 2026-09-27): promises + obligations extracted
-- daily from Todd's texts and emails by the Mac-side digest job
-- (apps/csa-portal/scripts/obligations_digest.py). Daily digest email +
-- Sunday-morning weekly rollup. Service-role writes only; RLS on, no
-- anon/authed policies.
create table if not exists obligations (
  id uuid primary key default gen_random_uuid(),
  detected_at timestamptz not null default now(),
  source text not null check (source in ('text','email','notice','manual')),
  counterparty text,
  handle text,                -- phone/email of the counterparty
  direction text not null check (direction in ('owed_by_farm','owed_to_farm')),
  description text not null,
  due_date date,
  source_quote text,
  dedupe_key text unique,     -- stable hash of source+quote to prevent re-adds
  status text not null default 'open' check (status in ('open','done','dropped')),
  done_at timestamptz,
  done_evidence text
);
alter table obligations enable row level security;
create index if not exists obligations_status_idx on obligations (status, detected_at);
