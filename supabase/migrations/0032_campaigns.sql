-- ═══════════════════════════════════════════════════════════════════
-- Migration 0032: Admin Campaign Sender (in-portal email campaigns)
--
-- Replaces Shopify Email as the marketing-blast tool. Todd composes a
-- branded email at /admin/campaigns/new, previews it, sends a test to
-- himself, then sends it to a Supabase-resolved recipient set (joined
-- through customers → members → member_preferences, share_type filter
-- + newsletter_opt_in respected, test-account excludes baked in).
--
-- Two new tables:
--   campaigns            — one row per composed campaign (draft → sending
--                          → sent / partial / failed), holds the body +
--                          recipient_filter + aggregate stats.
--   campaign_recipients  — one row per (campaign, customer); idempotent
--                          UNIQUE(campaign_id, customer_id). Drives the
--                          retry-without-double-send loop in
--                          lib/campaign.ts → sendCampaign().
--
-- One existing-table touch:
--   notification_log     — add `campaign_id UUID NULL` so per-recipient
--                          sends are joinable to their campaign. Nullable
--                          so existing rows (weekly emails, magic-link
--                          sends, etc.) keep working unchanged.
--
-- ── RLS ──────────────────────────────────────────────────────────────
--   Admin/staff full access via is_admin_caller() (migration 0017).
--   NO member/anon policy: members never see campaign drafts, the
--   recipient ledger, or aggregate stats. The send loop writes via the
--   service-role client (supabaseAdmin) which bypasses RLS regardless.
--
-- ── Triggers ─────────────────────────────────────────────────────────
--   - set_updated_at on campaigns (created in migration 0010, reused
--     throughout — see 0031 for the canonical pattern).
--   - log_audit_event on campaigns ONLY. We do NOT audit
--     campaign_recipients: it's a high-cardinality append-style table
--     (one row per send), matching the existing notification_log /
--     email_log convention of skipping audit triggers on logs.
--
-- ── Idempotency for re-applying this migration ───────────────────────
--   CREATE TABLE IF NOT EXISTS + ALTER TABLE … ADD COLUMN IF NOT EXISTS
--   throughout, so re-running this migration is a no-op. DDL is NOT
--   wrapped in a transaction with a trailing ROLLBACK — the Management
--   API runner wraps each submission in one implicit txn; a ROLLBACK
--   here would undo everything. The verification SELECTs at the end are
--   read-only.
-- ═══════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────
-- 1. campaigns
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS campaigns (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Admin-facing label (NOT sent in the email). Used to find the
  -- campaign in the admin index. Free text, 1..160 chars.
  name                TEXT NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 160),
  -- Inbox subject. Required, 1..200 chars.
  subject             TEXT NOT NULL CHECK (length(btrim(subject)) BETWEEN 1 AND 200),
  -- The ~80-char inbox preview snippet. Required (we always want a
  -- preview header rendered) but loose on length so Todd can paste
  -- whatever he likes; the template truncates visually.
  preview_text        TEXT NOT NULL CHECK (length(btrim(preview_text)) BETWEEN 1 AND 200),
  -- The editable body HTML. Plain HTML — wrapped in the branded shell
  -- at render time by lib/campaign.ts → renderCampaignHtml().
  body_html           TEXT NOT NULL CHECK (length(btrim(body_html)) BETWEEN 1 AND 200000),
  -- JSONB filter resolved against members/preferences at send time:
  --   { "share_types": ["summer_veg","flex"], "newsletter_opt_in": true }
  recipient_filter    JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Lifecycle state:
  --   draft   — composed but not yet sent (editable)
  --   sending — a send loop is in flight (advisory lock guards it)
  --   sent    — every recipient processed (sent_at set)
  --   partial — daily cap hit; remaining recipients await tomorrow's run
  --   failed  — send aborted for a non-recipient-specific reason
  status              TEXT NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft','sending','sent','failed','partial')),
  -- When to fire the next/first batch. NULL = immediate. Used by the
  -- daily-cap auto-stagger: when a run hits the cap, we set
  -- scheduled_for = tomorrow midnight ET so the next run is gated on
  -- the wall clock rather than fired immediately.
  scheduled_for       TIMESTAMPTZ,
  -- When fully sent (status='sent').
  sent_at             TIMESTAMPTZ,
  -- Admin who clicked Send. auth.users.id (nullable for system-staged
  -- or imported campaigns). Not FK'd — auth.users is in the auth
  -- schema; matching by uuid is sufficient.
  sent_by             UUID,
  -- Aggregate stats (maintained by sendCampaign + the webhook stub).
  total_recipients    INT NOT NULL DEFAULT 0 CHECK (total_recipients >= 0),
  total_sent          INT NOT NULL DEFAULT 0 CHECK (total_sent >= 0),
  total_delivered     INT NOT NULL DEFAULT 0 CHECK (total_delivered >= 0),
  total_opened        INT NOT NULL DEFAULT 0 CHECK (total_opened >= 0),
  total_clicked       INT NOT NULL DEFAULT 0 CHECK (total_clicked >= 0),
  total_bounced       INT NOT NULL DEFAULT 0 CHECK (total_bounced >= 0),
  total_complained    INT NOT NULL DEFAULT 0 CHECK (total_complained >= 0),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE campaigns IS
  'In-portal email campaigns. One row per composed campaign. recipient_filter is resolved at send time against customers/members/member_preferences. status: draft → sending → sent | partial | failed. Replaces Shopify Email for marketing blasts.';

CREATE INDEX IF NOT EXISTS campaigns_status_created_idx
  ON campaigns (status, created_at DESC);

-- ───────────────────────────────────────────────────────────────────
-- 2. campaign_recipients
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS campaign_recipients (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id     UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  customer_id     UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  -- Snapshot of the recipient's email at send time. Even if the
  -- customer's email later changes, the campaign ledger preserves who
  -- it actually went to. Required.
  email           TEXT NOT NULL CHECK (length(btrim(email)) > 0),
  -- Lifecycle per-recipient.
  --   pending      — resolved into the campaign, not yet attempted
  --   sending      — handed to Resend, awaiting response
  --   sent         — Resend accepted the send (HTTP 200, has resend_email_id)
  --   delivered    — Resend webhook confirmed delivery
  --   opened       — Resend webhook recorded an open
  --   clicked      — Resend webhook recorded a click
  --   bounced      — Resend rejected / hard bounce
  --   complained   — recipient marked as spam
  --   unsubscribed — recipient opted out (we don't re-send)
  --   failed       — transport error (HTTP non-200, network, etc.)
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','sending','sent','delivered','opened','clicked','bounced','complained','unsubscribed','failed')),
  resend_email_id TEXT,
  sent_at         TIMESTAMPTZ,
  last_event_at   TIMESTAMPTZ,
  error_text      TEXT,
  -- One row per (campaign, customer). Guards against double-resolve and
  -- (with the application-level skip check) lets a partial/failed run
  -- be resumed with no double-sends.
  UNIQUE (campaign_id, customer_id)
);

COMMENT ON TABLE campaign_recipients IS
  'Per-recipient ledger for a campaign send. UNIQUE(campaign_id,customer_id) is the idempotency backstop. status tracks lifecycle; the webhook (Phase 2) updates delivered/opened/clicked/bounced.';

CREATE INDEX IF NOT EXISTS campaign_recipients_campaign_idx
  ON campaign_recipients (campaign_id);
CREATE INDEX IF NOT EXISTS campaign_recipients_campaign_status_idx
  ON campaign_recipients (campaign_id, status);
CREATE INDEX IF NOT EXISTS campaign_recipients_resend_idx
  ON campaign_recipients (resend_email_id) WHERE resend_email_id IS NOT NULL;

-- ───────────────────────────────────────────────────────────────────
-- 3. notification_log: tag campaign sends with the originating campaign
-- ───────────────────────────────────────────────────────────────────
-- Nullable so historical rows (weekly emails, magic-link sends) keep
-- working with no change. campaign sends populate this column so a
-- campaign's row in /admin/campaigns/[id] can pull the delivery
-- breakdown out of the canonical notification_log.
ALTER TABLE notification_log
  ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS notif_log_campaign_idx
  ON notification_log (campaign_id) WHERE campaign_id IS NOT NULL;

-- ───────────────────────────────────────────────────────────────────
-- 4. updated_at trigger (reuse the existing set_updated_at fn)
-- ───────────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_campaigns_updated_at ON campaigns;
CREATE TRIGGER trg_campaigns_updated_at
  BEFORE UPDATE ON campaigns
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ───────────────────────────────────────────────────────────────────
-- 5. audit_log trigger on campaigns ONLY
--
-- Skipped on campaign_recipients: it's an append-style ledger (one row
-- per send, often 100+ per campaign). The existing convention skips
-- audit triggers on logs (notification_log, email_log, flex_transactions,
-- audit_log itself — see migration 0009 comments).
-- ───────────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_audit_campaigns ON campaigns;
CREATE TRIGGER trg_audit_campaigns
  AFTER INSERT OR UPDATE OR DELETE ON campaigns
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- ───────────────────────────────────────────────────────────────────
-- 6. RLS
-- ───────────────────────────────────────────────────────────────────
ALTER TABLE campaigns           ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_recipients ENABLE ROW LEVEL SECURITY;

-- ── campaigns: admin/staff full; no member policy ──────────────────
DROP POLICY IF EXISTS campaigns_admin_all ON campaigns;
CREATE POLICY campaigns_admin_all ON campaigns FOR ALL TO authenticated
  USING (is_admin_caller())
  WITH CHECK (is_admin_caller());

-- ── campaign_recipients: admin/staff full; no member policy ────────
DROP POLICY IF EXISTS campaign_recipients_admin_all ON campaign_recipients;
CREATE POLICY campaign_recipients_admin_all ON campaign_recipients FOR ALL TO authenticated
  USING (is_admin_caller())
  WITH CHECK (is_admin_caller());

-- ───────────────────────────────────────────────────────────────────
-- 7. Verification (read-only — safe to leave; the Management API runner
-- prints the last SELECT's rows).
-- ───────────────────────────────────────────────────────────────────
SELECT
  c.relname              AS table_name,
  c.relrowsecurity       AS rls_enabled
FROM pg_class c
WHERE c.relname IN ('campaigns','campaign_recipients')
ORDER BY c.relname;

SELECT
  pol.polname  AS policy_name,
  pol.polrelid::regclass::text AS table_name,
  pol.polcmd   AS cmd
FROM pg_policy pol
WHERE pol.polrelid::regclass::text IN ('campaigns','campaign_recipients')
ORDER BY table_name, pol.polname;

SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'notification_log'
  AND column_name = 'campaign_id';
