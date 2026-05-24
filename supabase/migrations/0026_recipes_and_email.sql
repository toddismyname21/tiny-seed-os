-- ═══════════════════════════════════════════════════════════════════
-- Migration 0026: Recipe library + weekly CSA email
--
-- TWO new tables + one SECURITY DEFINER unsubscribe helper.
--
-- ─── recipes ─────────────────────────────────────────────────────────
--   A tagged recipe LIBRARY, built over time by the admin. Each recipe
--   is EITHER a 'link' out to the internet (url) OR 'farm' content
--   written by us (body). `crops` is a text[] of crop/ingredient names
--   that should match names appearing in box_contents.product_name —
--   the weekly-email matcher overlaps these against the upcoming box.
--
--   RLS: ADMIN-ONLY for all CRUD (is_admin_caller(), migration 0017).
--        The weekly email reads recipes with the SERVICE ROLE client,
--        which bypasses RLS — so we deliberately add NO member/anon
--        read policy (recipes are surfaced to members only inside the
--        composed email, never via a public query).
--
-- ─── email_log ───────────────────────────────────────────────────────
--   One row per (member_email, email_type, week_date) send attempt.
--   Drives BOTH compliance auditing AND per-week idempotency: the send
--   handler skips any (email_type, week_date, member_email) already
--   logged 'sent', so re-running the send (e.g. to finish after a
--   rate-limit) never double-mails anyone.
--
--   The UNIQUE (email_type, week_date, member_email) constraint is the
--   hard idempotency guard at the DB layer (defense-in-depth beneath
--   the application-level skip check).
--
--   RLS: NO authenticated/anon policies at all — only the service role
--   (supabaseAdmin, RLS-bypass) reads/writes it. Admins view send
--   summaries through the server-rendered /admin/weekly-email page
--   (which queries via the cookie-aware client + is_admin_caller()
--   bypass), so we add an admin SELECT policy for that surface.
--
-- ─── unsubscribe_member_by_email() ───────────────────────────────────
--   CAN-SPAM requires a working one-click unsubscribe with NO login.
--   The /unsubscribe endpoint verifies an HMAC-signed token encoding the
--   member email, then calls this SECURITY DEFINER function (executed as
--   anon) to flip member_preferences.newsletter_opt_in = false for every
--   member row owned by that customer email. Returns the number of
--   preference rows updated (0 if the email has no members / already
--   opted out — still a friendly "you're unsubscribed" UX).
-- ═══════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────
-- 1. recipes
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS recipes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL CHECK (length(trim(title)) > 0),
  source      TEXT NOT NULL CHECK (source IN ('farm', 'link')),
  url         TEXT,
  body        TEXT,
  crops       TEXT[] NOT NULL DEFAULT '{}',
  image_url   TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- A 'link' recipe must carry a url; a 'farm' recipe must carry a body.
  -- Enforced so the email template never renders a broken/empty card.
  CONSTRAINT recipes_link_has_url
    CHECK (source <> 'link' OR (url IS NOT NULL AND length(trim(url)) > 0)),
  CONSTRAINT recipes_farm_has_body
    CHECK (source <> 'farm' OR (body IS NOT NULL AND length(trim(body)) > 0))
);

COMMENT ON TABLE recipes IS
  'Tagged recipe library. source=link → external url; source=farm → our own body. crops[] overlaps box_contents.product_name for weekly-email matching.';

-- Index on is_active so the matcher's "active recipes" scan is cheap.
CREATE INDEX IF NOT EXISTS recipes_active_idx ON recipes (is_active) WHERE is_active;
-- GIN index on crops so the array-overlap match (`crops && ARRAY[...]`)
-- can use an index once the library grows.
CREATE INDEX IF NOT EXISTS recipes_crops_gin ON recipes USING GIN (crops);

ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;

-- Admin-only CRUD (mirrors migration 0017's additive-admin pattern).
-- No member/anon policy → members never read recipes directly; they
-- only see them inside the composed weekly email (built server-side
-- with the service-role client, which bypasses RLS).
DROP POLICY IF EXISTS admin_all_recipes ON recipes;
CREATE POLICY admin_all_recipes ON recipes FOR ALL TO authenticated
  USING (is_admin_caller())
  WITH CHECK (is_admin_caller());

-- updated_at auto-touch (reuses set_updated_at() from migration 0010).
DROP TRIGGER IF EXISTS recipes_updated_at ON recipes;
CREATE TRIGGER recipes_updated_at
  BEFORE UPDATE ON recipes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ───────────────────────────────────────────────────────────────────
-- 2. email_log
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS email_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_email  TEXT NOT NULL,
  email_type    TEXT NOT NULL,           -- e.g. 'weekly_box'
  week_date     DATE NOT NULL,           -- the upcoming Wednesday this send covers
  status        TEXT NOT NULL DEFAULT 'sent'
                  CHECK (status IN ('sent', 'failed', 'skipped')),
  resend_id     TEXT,                    -- Resend message id, when status='sent'
  error_message TEXT,                    -- populated when status='failed'
  sent_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Per-week idempotency at the DB layer. One log row per recipient per
  -- email type per week. The send handler ALSO checks this before
  -- sending (application-level skip), but the constraint guarantees no
  -- duplicate even under a race.
  CONSTRAINT email_log_unique_send
    UNIQUE (email_type, week_date, member_email)
);

COMMENT ON TABLE email_log IS
  'Per-recipient send ledger for transactional/bulk email. UNIQUE(email_type,week_date,member_email) enforces per-week idempotency. Service-role write; admin read.';

CREATE INDEX IF NOT EXISTS email_log_week_idx ON email_log (email_type, week_date);

ALTER TABLE email_log ENABLE ROW LEVEL SECURITY;

-- Admin READ only (for the /admin/weekly-email summary). All WRITES go
-- through the service-role client (supabaseAdmin), which bypasses RLS —
-- there is intentionally NO authenticated write policy.
DROP POLICY IF EXISTS admin_read_email_log ON email_log;
CREATE POLICY admin_read_email_log ON email_log FOR SELECT TO authenticated
  USING (is_admin_caller());

-- ───────────────────────────────────────────────────────────────────
-- 3. unsubscribe_member_by_email()
--
-- Flips newsletter_opt_in = FALSE for EVERY member_preferences row whose
-- member belongs to the customer with the given email. SECURITY DEFINER
-- so the unauthenticated /unsubscribe endpoint (running as anon after
-- verifying the HMAC token) can perform the write without a login.
--
-- Returns the count of preference rows updated. We only update rows that
-- are currently TRUE so the count reflects an actual state change (an
-- already-unsubscribed email returns 0 but the endpoint still shows a
-- friendly confirmation — the email is unsubscribed either way).
--
-- Idempotent: calling it twice is harmless (second call updates 0 rows).
-- ───────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.unsubscribe_member_by_email(p_email TEXT)
  RETURNS INTEGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public, pg_temp
AS $$
DECLARE
  v_updated INTEGER;
BEGIN
  IF p_email IS NULL OR length(trim(p_email)) = 0 THEN
    RETURN 0;
  END IF;

  WITH targets AS (
    SELECT mp.member_id
      FROM member_preferences mp
      JOIN members   m ON m.id = mp.member_id
      JOIN customers c ON c.id = m.customer_id
     WHERE lower(c.email) = lower(trim(p_email))
       AND mp.newsletter_opt_in = TRUE
  )
  UPDATE member_preferences mp
     SET newsletter_opt_in = FALSE,
         updated_at = NOW()
    FROM targets t
   WHERE mp.member_id = t.member_id;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated;
END;
$$;

COMMENT ON FUNCTION public.unsubscribe_member_by_email(TEXT) IS
  'CAN-SPAM one-click unsubscribe. Sets newsletter_opt_in=false for all members owned by the given customer email. SECURITY DEFINER so the tokenized /unsubscribe endpoint can run it as anon. Idempotent; returns rows changed.';

-- The token is verified server-side BEFORE this is called; even so we
-- only grant EXECUTE to anon + authenticated (not PUBLIC broadly) and
-- the function reveals no data (returns a count only).
REVOKE EXECUTE ON FUNCTION public.unsubscribe_member_by_email(TEXT) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.unsubscribe_member_by_email(TEXT) TO anon, authenticated, service_role;
