-- ============================================================================
-- 0072_member_recipe_read.sql
--
-- PHASE 2 · WAVE 3 of the CSA retention layer (Todd's ask, 2026-07-05).
-- Spec: docs/audits/CSA_GAP_RESEARCH_2026-07.md (gap 7) +
--       CSA_MASTER_PROPOSAL_2026-07.md (2.7 member recipe browse page).
--
-- WHAT THIS DOES
--   Adds ONE least-privilege, ACTIVE-ONLY member SELECT policy to `recipes`
--   so the new member-facing browse page (/account/recipes) can read the
--   recipe library through the member's own RLS-scoped client.
--
-- WHY IT'S NEEDED
--   Migration 0026 created `recipes` ADMIN-ONLY (`admin_all_recipes`,
--   is_admin_caller()) with NO member/anon read — members only ever saw
--   recipes inside the composed weekly email (built server-side with the
--   service-role client, which bypasses RLS). Surfacing the library as a
--   member page needs a member-readable path.
--
-- WHY AN RLS POLICY (not a service-role read)
--   Recipes hold ZERO member PII (title, source, url/body, crop tags, image).
--   The correct least-privilege boundary is therefore in the database: grant
--   authenticated users read access to ACTIVE recipes only. This keeps the
--   member page consistent with every other /account read (member RLS client)
--   and never exposes inactive/draft recipes.
--
-- LEAST-PRIVILEGE
--   • SELECT only (no INSERT/UPDATE/DELETE — CRUD stays admin_all_recipes).
--   • WHERE is_active = true — inactive/draft recipes remain admin-only.
--   • No columns are PII; nothing member-scoped is leaked (the whole active
--     library is intentionally public-to-members, exactly like a printed
--     recipe card handed out at pickup).
--
-- The pre-existing `admin_all_recipes` (FOR ALL) policy is UNCHANGED — RLS
-- policies are OR-combined, so admins keep full CRUD and members additionally
-- get active-only reads. This weakens nothing.
--
-- IDEMPOTENT: DROP POLICY IF EXISTS then CREATE (safe to re-run).
-- ============================================================================

DROP POLICY IF EXISTS recipes_active_member_read ON recipes;
CREATE POLICY recipes_active_member_read ON recipes FOR SELECT TO authenticated
  USING (is_active = true);

COMMENT ON POLICY recipes_active_member_read ON recipes IS
  'Phase 2 Wave 3: least-privilege member read for /account/recipes. Authenticated users may SELECT only ACTIVE recipes (no PII). CRUD stays admin-only (admin_all_recipes). Additive — weakens no existing policy.';
