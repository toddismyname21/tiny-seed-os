-- Fall 2026 member survey (Todd 2026-09-23).
-- member_survey_responses — landing table for the public /survey form.
-- Inserts happen ONLY via the service-role API route (/api/survey/submit);
-- RLS is enabled with no anon policies, so PostgREST anon/authed see nothing.
--
-- NOTE: an earlier draft of this migration also tried to create
-- referral_codes — that table ALREADY EXISTS (migration 0024_referrals.sql,
-- full program at /account/refer). The CREATE IF NOT EXISTS no-op'd and the
-- draft rows were deleted the same day. Referrals live in 0024's schema.

create table if not exists member_survey_responses (
  id uuid primary key default gen_random_uuid(),
  email text,
  name text,
  overall_rating int check (overall_rating between 1 and 5),
  working_well text,
  improve text,
  delivery_rating int check (delivery_rating between 1 and 5),
  used_tracker text check (used_tracker in ('yes','no','didnt_know')),
  gets_arrival_texts text check (gets_arrival_texts in ('always','sometimes','never','not_sure')),
  tools_helpful text,
  comments text,
  source text not null default 'fall_2026_email',
  created_at timestamptz not null default now()
);
alter table member_survey_responses enable row level security;
