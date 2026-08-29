-- Certification core, part 1: the field registry + the two compliance logs.
--
-- WHY: OEFFA inspection 2026-09-18. INPUT_LOG and PEST_LOG hold zero rows
-- anywhere, and 7 of the fields Todd actually works had no record at all —
-- meaning an input application could not even be FILED against them. NOP
-- §205.103 requires records "readily understood and audited," kept 5 years.
-- Full proposal: docs/specs/CERTIFICATION_CORE_MIGRATION.md (approved 2026-08-29).
--
-- Named farm_fields/farm_beds (proposal said fields/beds) because this Postgres
-- also runs the member portal; "fields" is too generic to live safely there.
--
-- The two logs are BORN here — they never existed in Sheets, so there is no
-- migration for them, only a birth. input_log.field_id is NOT NULL by design:
-- it must be IMPOSSIBLE to log a compliance record against a field that does
-- not exist. That is the exact failure mode this schema eliminates.

create table if not exists public.farm_fields (
  id         uuid primary key default gen_random_uuid(),
  code       text not null unique,          -- 'Z3', 'HOL', 'IOL' …
  name       text not null,
  status     text not null default 'active' check (status in ('active','retiring','retired')),
  is_flower  boolean not null default false, -- F7M/F11M are Loren's flower ground
  bed_count  int,
  bed_length_ft int,
  notes      text,
  legacy_ref text,                           -- 'REF_Fields:<code>' — Sheets origin
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.farm_fields is
  'Authoritative field registry (certification core, 2026-08-29). Reconciled with Todd: Brassica=HOL, Lower(retiring)=IOL, J=JL, I=IL, flowers=F7M+F11M, F3M was a misnomer for F3L. JS5 still unresolved (teardown site).';

create table if not exists public.farm_beds (
  id         uuid primary key default gen_random_uuid(),
  field_id   uuid not null references public.farm_fields(id),
  code       text not null,                 -- 'Z3-01'
  length_ft  int,
  width_in   int not null default 30,       -- 30" bed, 18" path = 4 ft centres
  legacy_ref text,
  created_at timestamptz not null default now(),
  unique (field_id, code)
);

create table if not exists public.input_log (
  id           uuid primary key default gen_random_uuid(),
  applied_on   date not null,
  field_id     uuid not null references public.farm_fields(id),
  product      text not null,
  omri_listed  boolean,
  rate         text,                        -- '200 lb', '4 oz/gal' — as spoken
  method       text,                        -- broadcast / drop / foliar / fertigation
  applied_by   text,
  purpose      text,
  -- WHERE this fact came from: 'todd 2026-08-29', 'receipt SS-44127 photo',
  -- 'text thread with Ben'. §205.103 audit-trail; also the verify-before-send
  -- rule made durable: no evidence string, no record.
  source_evidence text not null,
  notes        text,
  created_by   text,
  created_at   timestamptz not null default now()
);
comment on table public.input_log is
  'Organic input applications (NOP §205.103, 5-yr retention). field_id NOT NULL: a record cannot reference ground that does not exist. source_evidence NOT NULL: every row names its primary source.';

create table if not exists public.pest_log (
  id            uuid primary key default gen_random_uuid(),
  observed_on   date not null,
  field_id      uuid not null references public.farm_fields(id),
  pest          text not null,
  severity      text check (severity in ('light','moderate','heavy')),
  control_measure text,
  product_used  text,
  omri_listed   boolean,
  results       text,
  source_evidence text not null,
  notes         text,
  created_at    timestamptz not null default now()
);

alter table public.farm_fields enable row level security;
alter table public.farm_beds   enable row level security;
alter table public.input_log   enable row level security;
alter table public.pest_log    enable row level security;
-- RLS on, no policies: PostgREST deny-all except service_role. Admin UI comes later.

create index if not exists input_log_field_date_idx on public.input_log(field_id, applied_on);
create index if not exists pest_log_field_date_idx  on public.pest_log(field_id, observed_on);
