-- Survey: optional customer testimonial field (Todd 2026-09-25) — may be used
-- on the website / 2027 CSA marketing, so it is explicitly opt-in in the form copy.
alter table member_survey_responses add column if not exists testimonial text;
