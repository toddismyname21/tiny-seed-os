-- Certification core, part 2: crops / seed lots / plantings.
-- Pulled forward from Day 2 because Todd is logging plantings FROM THE FIELD
-- (2026-08-29: direct-seeded arugula + French Breakfast radish into JS1, seed
-- bag photos as lot evidence) and the rows need somewhere real to land.
-- Sheets bulk migration (259 lots / 743 plantings) follows into these tables.

create table if not exists public.crops (
  id uuid primary key default gen_random_uuid(),
  canonical_name text not null unique,     -- 'arugula', 'tomato' — lowercase singular
  created_at timestamptz not null default now()
);
create table if not exists public.crop_aliases (
  alias text primary key,                  -- 'Tomatoes', 'Slicing Tomatoes', 'Something Fresh Mix'
  crop_id uuid not null references public.crops(id)
);
create table if not exists public.seed_lots (
  id uuid primary key default gen_random_uuid(),
  lot_code text not null,                  -- supplier lot ('113353') or internal ('S-TOM-260115-693')
  crop_id uuid references public.crops(id),
  variety text,
  supplier text,
  organic_status text,                     -- 'organic' / 'untreated' / 'unknown (label does not state)'
  germ_pct numeric, germ_test_date text,   -- as printed on the label
  seeds_per_lb int, size text,
  qr_url text,
  source_evidence text not null,           -- photo / SEED_INVENTORY row / receipt
  legacy_ref text,
  created_at timestamptz not null default now(),
  unique (supplier, lot_code)
);
create table if not exists public.plantings (
  id uuid primary key default gen_random_uuid(),
  batch_code text not null unique,
  crop_id uuid references public.crops(id),
  variety text,
  field_id uuid references public.farm_fields(id),
  bed_note text,                           -- '~100 ft bed, 7 rows' — as stated
  seed_lot_id uuid references public.seed_lots(id),
  method text check (method in ('direct_seed','transplant','greenhouse_sow')),
  planted_on date,                         -- ACTUAL date. NULL until evidenced.
  status text not null default 'planted',
  source_evidence text,                    -- NULL only for legacy Sheets imports
  legacy_ref text,
  notes text,
  created_at timestamptz not null default now()
);
alter table public.crops enable row level security;
alter table public.crop_aliases enable row level security;
alter table public.seed_lots enable row level security;
alter table public.plantings enable row level security;
create index if not exists plantings_field_date_idx on public.plantings(field_id, planted_on);
