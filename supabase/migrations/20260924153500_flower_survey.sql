-- Flower CSA 2026 season survey (Loren, approved 2026-09-24; send HELD until
-- Loren releases it week of 2026-09-28).
--
-- flower_survey_responses — landing table for the public /survey/flowers form.
-- Same trust model as member_survey_responses (20260923155320): inserts happen
-- ONLY via the service-role API route (/api/survey/flowers); RLS is enabled
-- with no anon/authenticated policies, so PostgREST sees nothing. Admin reads
-- go through the service-role client on /admin/survey.
--
-- interests: text[] of checkbox keys, validated app-side against the approved
-- option set (spring_csa, dahlia_csa, dried_csa, pick_your_own,
-- arrangement_workshops, wreath_workshops, holiday_wreaths, keep_same).

create table if not exists flower_survey_responses (
  id uuid primary key default gen_random_uuid(),
  email text,
  name text,
  overall_rating int check (overall_rating between 1 and 5),
  loved text,
  change_request text,
  vase_life text check (vase_life in ('week_plus','four_five_days','few_days','varied')),
  renew_2027 text check (renew_2027 in ('definitely','probably','not_sure','probably_not')),
  interests text[] not null default '{}',
  comments text,
  source text not null default 'flower_2026_email',
  created_at timestamptz not null default now()
);
alter table flower_survey_responses enable row level security;

-- verify (returned by the migration runner)
select relname, relrowsecurity from pg_class where relname = 'flower_survey_responses';
