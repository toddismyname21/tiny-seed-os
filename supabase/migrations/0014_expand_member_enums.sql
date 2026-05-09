-- ═══════════════════════════════════════════════════════════════════
-- Migration 0014: Expand members.status + share_size CHECK constraints
-- to match the real values used in the legacy CSA_Members sheet.
-- Source data audit (2026-05-08):
--   Status: active(294), inactive(9), pending(5)
--   Share_Size: small(111), regular(106), family(30), petite(19),
--               large(18), light(12), full(12)
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE members DROP CONSTRAINT members_status_check;
ALTER TABLE members ADD CONSTRAINT members_status_check
  CHECK (status IN ('active','inactive','paused','pending','cancelled','lapsed','onboarding','expired'));

ALTER TABLE members DROP CONSTRAINT members_share_size_check;
ALTER TABLE members ADD CONSTRAINT members_share_size_check
  CHECK (share_size IS NULL OR share_size IN
    ('small','regular','family','petite','large','light','full','half','quarter','single','double'));
