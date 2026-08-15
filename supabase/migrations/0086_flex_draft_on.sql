-- 0086_flex_draft_on.sql
--
-- "Thursday Draft + Phone Approve" flex-list system.
--
-- Adds a DRAFT-STATE toggle column to flex_inventory so the weekly list can be
-- STAGED (created by the Thursday cron) without members seeing it, and then
-- PUBLISHED with one tap on the phone-first review page.
--
-- Why a separate column (not just is_active):
--   is_active=true is what makes a row visible + orderable to members. If we
--   flipped is_active during draft editing, members would see half-built lists
--   and stale items (the exact failure Todd wants to prevent — an unavailable
--   item got ordered because a stale list was live).
--
--   So the draft carries its DESIRED on/off state in `draft_on` while the row
--   stays is_active=false (invisible). PUBLISH copies draft_on → is_active for
--   the whole week in one action. After publish, edits flip is_active directly.
--
-- draft_on defaults TRUE so that:
--   • the Thursday clone (copy of last week's is_active=true rows) starts with
--     every item toggled ON in the draft — Todd reviews and turns OFF what he
--     doesn't have, rather than turning everything on from scratch;
--   • already-published historical rows (is_active=true) get draft_on=true,
--     which is harmless (a re-publish would keep them on).
--
-- Idempotent: ADD COLUMN IF NOT EXISTS. Safe to re-run.

alter table public.flex_inventory
  add column if not exists draft_on boolean not null default true;

comment on column public.flex_inventory.draft_on is
  'Draft desired-visible state for the Thursday-draft flex list. While a week is '
  'unpublished the row stays is_active=false (invisible to members) and draft_on '
  'holds whether PUBLISH should turn it on. PUBLISH sets is_active = draft_on for '
  'the whole week; after publish, toggles write is_active directly. Default true '
  'so a freshly-cloned draft starts with every item ON for review.';
