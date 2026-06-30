-- ═══════════════════════════════════════════════════════════════════
-- Migration 0060: Pixel-based open tracking for 1:1 Gmail sends
--
-- WHY: Todd sends 1:1 wholesale emails from his PERSONAL Gmail
-- (todd@tinyseedfarmpgh.com) and gets NO open data — Resend's
-- webhook-based tracking (migration 0032) only covers blasts sent
-- THROUGH Resend. This is a SEPARATE path: a tracking pixel embedded in
-- a Gmail-API send. The From stays todd@ (chefs reply to a human), but
-- each email carries a unique 1×1 transparent GIF whose URL encodes an
-- opaque per-recipient token. When the recipient's client loads images,
-- the public pixel endpoint (/api/track/o/<token>.gif) stamps the open.
--
-- Two new tables (mirroring the campaigns / campaign_recipients shape):
--   tracked_email_sends       — one row per send batch (a labelled blast
--                               of 1:1 emails). Holds the admin label +
--                               subject + aggregate recipient_count.
--   tracked_email_recipients  — one row per (send, recipient). token is
--                               the opaque secret in the pixel URL; the
--                               open stamp (first/last/count + UA) lands
--                               here. account_id optionally links a
--                               recipient to a wholesale_accounts row so
--                               the report can cross-reference whether
--                               they later placed a wholesale_orders order.
--
-- ── RLS ──────────────────────────────────────────────────────────────
--   Admin/staff full access via is_admin_caller() (migration 0017/0030),
--   exactly like campaigns/campaign_recipients. NO member/anon policy.
--   The pixel endpoint writes the open stamp via the SERVICE-ROLE client
--   (supabaseAdmin), which bypasses RLS entirely — so the anon/email
--   client never needs (and never gets) a direct table grant. The token
--   lookup + stamp happens server-side in the Astro endpoint.
--
-- ── Atomic open stamp ────────────────────────────────────────────────
--   supabase-js cannot express `open_count = open_count + 1` in an
--   .update(), so we ship a SECURITY DEFINER function
--   stamp_email_open(p_token, p_user_agent) that does the increment +
--   first/last timestamps in one statement and returns whether the token
--   matched (the endpoint ignores the result — it always returns the GIF).
--
-- ── Idempotency ──────────────────────────────────────────────────────
--   CREATE TABLE IF NOT EXISTS + CREATE INDEX IF NOT EXISTS +
--   CREATE OR REPLACE FUNCTION + DROP POLICY IF EXISTS throughout, so
--   re-applying this migration is a no-op. No trailing ROLLBACK (the
--   Management API runner wraps the submission in one implicit txn).
-- ═══════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────
-- 1. tracked_email_sends
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tracked_email_sends (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Admin-facing label for this batch (NOT shown to recipients).
  -- e.g. "Wholesale update — week of June 29". Required.
  label           text NOT NULL,
  -- Inbox subject line actually sent (for the report; nullable so a
  -- send can be created before the subject is finalised).
  subject         text,
  -- How it was sent. 'gmail' for the 1:1 Gmail-API path (the only path
  -- today); left as a column so a future Resend/SMTP pixel send is
  -- distinguishable in the report.
  channel         text DEFAULT 'gmail',
  -- Who sent it (free text email; default the owner).
  sent_by         text,
  -- Maintained by the sender after all recipient rows are inserted.
  recipient_count int DEFAULT 0,
  created_at      timestamptz DEFAULT now()
);

COMMENT ON TABLE tracked_email_sends IS
  'One row per labelled batch of 1:1 tracked Gmail sends. Pixel-based open tracking for emails sent from Todd''s personal Gmail (separate from Resend campaign tracking in migration 0032).';

-- ───────────────────────────────────────────────────────────────────
-- 2. tracked_email_recipients
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tracked_email_recipients (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  send_id         uuid NOT NULL REFERENCES tracked_email_sends(id) ON DELETE CASCADE,
  -- Opaque, unguessable secret embedded in the pixel URL
  -- (/api/track/o/<token>.gif). >=24 url-safe random chars. UNIQUE so a
  -- token resolves to exactly one recipient. This is the ONLY identifier
  -- the public endpoint accepts — it never echoes the email back.
  token           text UNIQUE NOT NULL,
  -- Snapshot of the recipient's email at send time.
  email           text NOT NULL,
  name            text,
  -- Optional link to the chef's wholesale account, so the report can
  -- cross-reference whether they later placed a wholesale_orders order.
  -- Nullable (ON DELETE SET NULL keeps the open data if the account is
  -- removed).
  account_id      uuid REFERENCES wholesale_accounts(id) ON DELETE SET NULL,
  sent_at         timestamptz,
  -- Open stamps. first_* is set once (coalesce); last_* + open_count
  -- advance on every pixel load the client allows.
  first_opened_at timestamptz,
  last_opened_at  timestamptz,
  open_count      int DEFAULT 0,
  -- User-Agent of the FIRST/most-recent open (helps spot Apple Mail
  -- Privacy pre-fetches vs. a real human open — directional only).
  user_agent      text
);

COMMENT ON TABLE tracked_email_recipients IS
  'Per-recipient row for a tracked Gmail send. token is the opaque secret in the pixel URL. The open stamp (first/last/count + UA) is written by the public pixel endpoint via the service-role client.';

CREATE INDEX IF NOT EXISTS idx_tracked_recip_token ON tracked_email_recipients(token);
CREATE INDEX IF NOT EXISTS idx_tracked_recip_send  ON tracked_email_recipients(send_id);

-- ───────────────────────────────────────────────────────────────────
-- 3. Atomic open-stamp function
--
-- SECURITY DEFINER so it runs as the table owner regardless of caller.
-- The pixel endpoint calls this with the service-role client (which
-- already bypasses RLS), but defining it SECURITY DEFINER + granting to
-- service_role keeps the contract explicit and lets the increment be a
-- single round-trip. Returns true if the token matched a recipient
-- (the endpoint ignores the result and always serves the GIF — we never
-- leak token existence to the email client).
-- ───────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.stamp_email_open(p_token text, p_user_agent text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_matched boolean := false;
BEGIN
  UPDATE public.tracked_email_recipients
     SET first_opened_at = coalesce(first_opened_at, now()),
         last_opened_at  = now(),
         open_count      = coalesce(open_count, 0) + 1,
         user_agent      = coalesce(p_user_agent, user_agent)
   WHERE token = p_token;

  GET DIAGNOSTICS v_matched = ROW_COUNT;
  RETURN v_matched;
END;
$$;

GRANT EXECUTE ON FUNCTION public.stamp_email_open(text, text) TO service_role;

-- ───────────────────────────────────────────────────────────────────
-- 4. RLS — admin/staff full; no member/anon policy
-- ───────────────────────────────────────────────────────────────────
ALTER TABLE tracked_email_sends      ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracked_email_recipients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tracked_email_sends_admin_all ON tracked_email_sends;
CREATE POLICY tracked_email_sends_admin_all ON tracked_email_sends FOR ALL TO authenticated
  USING (is_admin_caller())
  WITH CHECK (is_admin_caller());

DROP POLICY IF EXISTS tracked_email_recipients_admin_all ON tracked_email_recipients;
CREATE POLICY tracked_email_recipients_admin_all ON tracked_email_recipients FOR ALL TO authenticated
  USING (is_admin_caller())
  WITH CHECK (is_admin_caller());

-- ───────────────────────────────────────────────────────────────────
-- 5. Verification (read-only — the Management API runner prints the
-- last SELECT's rows).
-- ───────────────────────────────────────────────────────────────────
SELECT
  c.relname        AS table_name,
  c.relrowsecurity AS rls_enabled
FROM pg_class c
WHERE c.relname IN ('tracked_email_sends','tracked_email_recipients')
ORDER BY c.relname;
