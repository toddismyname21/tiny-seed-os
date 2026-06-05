-- ═══════════════════════════════════════════════════════════════════
-- Migration 0034: Campaign template library
--
-- Backs Feature 4 of the campaign-tool upgrade: a reusable template
-- library the composer reads from. Previously the seed templates lived
-- ONLY as a hard-coded const (CAMPAIGN_TEMPLATES in lib/campaign.ts);
-- this table makes them editable in-app at /admin/campaigns/templates
-- and lets Todd/Frankie/Loren "Save as template" from the composer.
--
-- One new table:
--   campaign_templates — reusable, named, categorized campaign starters.
--     The composer's "Use template" dropdown reads from here; the new
--     "Save as template" button writes here.
--
-- ── Seed ─────────────────────────────────────────────────────────────
--   We seed the two existing hard-coded templates (Portal Launch —
--   Summer/Flex + Flower). Idempotent via ON CONFLICT (name) DO NOTHING
--   so re-running this migration never duplicates or clobbers
--   admin-edited copies.
--
-- ── RLS ──────────────────────────────────────────────────────────────
--   Admin/staff full access via is_admin_caller() (migration 0017).
--   No member/anon policy — templates are an admin-only authoring tool.
--   The composer reads them through the cookie-aware (RLS-scoped) admin
--   client, same as the campaigns list.
--
-- ── Triggers ─────────────────────────────────────────────────────────
--   - set_updated_at (migration 0010) for updated_at maintenance.
--   - log_audit_event on the table (low cardinality — a handful of
--     templates — so auditing edits is cheap + useful).
--
-- ── Idempotency ──────────────────────────────────────────────────────
--   CREATE TABLE IF NOT EXISTS + DROP POLICY IF EXISTS + ON CONFLICT
--   throughout. Safe to re-run. No transaction wrapper (the Management
--   API runner wraps each submission in one implicit txn).
-- ═══════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────
-- 1. campaign_templates
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS campaign_templates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Human-facing template name. UNIQUE so the seed upsert + the
  -- "Save as template" flow can dedupe by name.
  name            TEXT NOT NULL UNIQUE CHECK (length(btrim(name)) BETWEEN 1 AND 160),
  -- Grouping for the picker. Constrained to the agreed set.
  category        TEXT NOT NULL DEFAULT 'announcement'
                    CHECK (category IN ('announcement','weekly','reminder','wholesale','welcome')),
  -- Pre-fill fields — mirror the campaigns table shape.
  subject         TEXT NOT NULL CHECK (length(btrim(subject)) BETWEEN 1 AND 200),
  preview_text    TEXT NOT NULL CHECK (length(btrim(preview_text)) BETWEEN 1 AND 200),
  body_html       TEXT NOT NULL CHECK (length(btrim(body_html)) BETWEEN 1 AND 200000),
  -- Default recipient filter the template suggests:
  --   { "share_types": ["summer_veg","flex"], "newsletter_opt_in": true }
  recipient_filter JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE campaign_templates IS
  'Reusable campaign starters for /admin/campaigns/new. category in (announcement,weekly,reminder,wholesale,welcome). Admin-only (RLS). Seeded from the former hard-coded CAMPAIGN_TEMPLATES.';

CREATE INDEX IF NOT EXISTS campaign_templates_category_idx
  ON campaign_templates (category, name);

-- ───────────────────────────────────────────────────────────────────
-- 2. updated_at trigger (reuse set_updated_at)
-- ───────────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_campaign_templates_updated_at ON campaign_templates;
CREATE TRIGGER trg_campaign_templates_updated_at
  BEFORE UPDATE ON campaign_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ───────────────────────────────────────────────────────────────────
-- 3. audit trigger
-- ───────────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_audit_campaign_templates ON campaign_templates;
CREATE TRIGGER trg_audit_campaign_templates
  AFTER INSERT OR UPDATE OR DELETE ON campaign_templates
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- ───────────────────────────────────────────────────────────────────
-- 4. RLS — admin/staff full; no member policy
-- ───────────────────────────────────────────────────────────────────
ALTER TABLE campaign_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS campaign_templates_admin_all ON campaign_templates;
CREATE POLICY campaign_templates_admin_all ON campaign_templates FOR ALL TO authenticated
  USING (is_admin_caller())
  WITH CHECK (is_admin_caller());

-- ───────────────────────────────────────────────────────────────────
-- 5. Seed the two existing hard-coded templates.
--    ON CONFLICT (name) DO NOTHING — never clobber admin edits, never
--    duplicate on re-run.
-- ───────────────────────────────────────────────────────────────────
INSERT INTO campaign_templates (name, category, subject, preview_text, body_html, recipient_filter)
VALUES
  (
    'Portal Launch — Summer/Flex Wave (June 2026)',
    'announcement',
    'Your Tiny Seed Farm CSA portal has a new home 🌱',
    'Sign in at csa.tinyseedfarm.com — same membership, faster portal, works great on phone.',
    E'Hi {{first_name}},\n\nYou can now manage your whole CSA from your phone at https://csa.tinyseedfarm.com/login?email={{email}}\n\nSign in with your email — we''ll send you a one-time link. No password.\n\n**What''s there for you:**\n\n- **Set "always avoid" preferences** — tell us once, we''ll auto-swap allergies and dislikes every week. No thinking required.\n- **Schedule a vacation hold** when you''re out of town\n- **Add funds to your Farm Flex wallet** for extras\n- **Change your pickup location** anytime\n\n**Why this is better for all of us:** when you tell us your preferences, we pack what you''ll actually eat. Less food in the compost. Fewer "please skip my box" emails. More time for everyone to enjoy the actual food.\n\n**Week 1 starts Wednesday, June 10.** Pop in before then to set your preferences so your first box comes out right.\n\nAnything off? Just reply — I''ll fix it.\n\n— Farmer Todd and the Tiny Seed Crew',
    '{"share_types": ["summer_veg", "flex"], "newsletter_opt_in": true}'::jsonb
  ),
  (
    'Portal Launch — Flower Wave (June 2026)',
    'announcement',
    'Your Tiny Seed Farm Flower CSA — portal info',
    'Your flower CSA starts June 24 — log in at csa.tinyseedfarm.com to see your share.',
    E'Hi {{first_name}},\n\nYou can now manage your Flower CSA from your phone at https://csa.tinyseedfarm.com/login?email={{email}}\n\nSign in with your email — we''ll send you a one-time link. No password.\n\n**What''s there for you:**\n\n- **Schedule a vacation** when you''re out of town\n- **Change your pickup location** anytime\n- **Set notification preferences**\n- See your share details + weeks remaining\n\n**Why this is better for all of us:** when you tell us in advance, we can save your bouquet for someone who''ll enjoy it instead of composting it. And you get back from vacation to a fresh bouquet on the right week.\n\n**Week 1 starts Wednesday, June 24** — two weeks behind the Summer CSA so the field has time to bloom. Sixteen weeks of fresh-cut flowers ahead.\n\nAnything off? Just reply.\n\n— Farmer Todd and the Tiny Seed Crew',
    '{"share_types": ["flower"], "newsletter_opt_in": true}'::jsonb
  )
ON CONFLICT (name) DO NOTHING;

-- ───────────────────────────────────────────────────────────────────
-- 6. Verification (read-only).
-- ───────────────────────────────────────────────────────────────────
SELECT
  c.relname        AS table_name,
  c.relrowsecurity AS rls_enabled
FROM pg_class c
WHERE c.relname = 'campaign_templates';

SELECT
  pol.polname AS policy_name,
  pol.polcmd  AS cmd
FROM pg_policy pol
WHERE pol.polrelid::regclass::text = 'campaign_templates';

SELECT name, category FROM campaign_templates ORDER BY name;
