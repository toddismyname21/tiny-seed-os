-- ═══════════════════════════════════════════════════════════════════
-- Migration 0024: Referral bonus
--
-- A CSA member shares a unique REFERRAL DISCOUNT CODE. A friend enters it
-- at Shopify checkout and gets $25 off a CSA order ($300 minimum, CSA
-- collection only — enforced Shopify-side by discountCodeBasicCreate).
-- When that referred order completes (paid, not cancelled/refunded), the
-- REFERRER earns $25 in Farm Flex (Shopify store credit). Unlimited
-- referrals.
--
-- ─── Two tables ──────────────────────────────────────────────────────
--
--   referral_codes  ONE row per member — their personal code. Created
--                   on-demand the first time they open /account/refer
--                   (server-side: generate code → create the Shopify
--                   discount → store the row). shopify_discount_node_id
--                   records the created discount so it can be audited /
--                   deactivated later.
--
--   referrals       ONE row per QUALIFYING referred order. The order-sync
--                   job inserts it AFTER it has credited the referrer's
--                   $25. `referred_order_id` is UNIQUE — that's the
--                   idempotency guard: a re-synced order can never pay the
--                   referrer twice (the second insert violates the unique
--                   constraint and the sync skips it).
--
-- ─── RLS (mirrors the established patterns) ──────────────────────────
--
--   * SELECT  — a member sees only THEIR OWN rows:
--                 referral_codes : customer_id = current_customer_id()
--                 referrals      : referrer_customer_id = current_customer_id()
--               (current_customer_id() already resolves household members
--                to the owner account — migration 0023 — so a shared
--                household sees the owner's referral data.)
--   * admin   — is_admin_caller() bypass, identical to migration 0017.
--   * WRITES  — there is NO member/authenticated write policy. All writes
--               go through the service-role client (supabaseAdmin), which
--               BYPASSES RLS. The code-generation helper (server) and the
--               order sync (server) are the only writers, exactly like
--               flex_transactions (members read; service role writes).
--
-- citext on referred_email makes 'Jane@x.com' == 'jane@x.com', matching
-- how every other email comparison behaves (extension enabled in 0001).
-- ═══════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────
-- 1. referral_codes — one per member
-- ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS referral_codes (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- ONE code per customer. UNIQUE + ON DELETE CASCADE: if a customer is
  -- removed, their code row goes with them.
  customer_id              uuid NOT NULL UNIQUE
                             REFERENCES customers(id) ON DELETE CASCADE,
  -- The discount code string the member shares (also the Shopify code).
  code                     text NOT NULL UNIQUE,
  -- The Shopify DiscountCodeNode GID returned by discountCodeBasicCreate.
  -- Nullable only defensively — the helper never writes a row without it.
  shopify_discount_node_id text,
  created_at               timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE referral_codes IS
  'One referral discount code per CSA member. Created on-demand (server) the first time they open /account/refer: generate code, create the Shopify CSA-restricted $25-off discount, store the row.';

-- ───────────────────────────────────────────────────────────────────
-- 2. referrals — one per qualifying referred order
-- ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS referrals (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Who earns the bonus. SET NULL (not CASCADE) so the historical
  -- referral record survives if the referrer's customer row is deleted.
  referrer_customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  -- The code that was used (denormalized — survives code deletion).
  code                 text,
  -- The Shopify order that triggered the bonus. UNIQUE = idempotency:
  -- the sync inserts this AFTER crediting the referrer, so a re-synced
  -- order can never pay twice (the duplicate insert is rejected).
  referred_order_id    text NOT NULL UNIQUE,
  -- The friend's email (for the member's stats / audit). citext.
  referred_email       citext,
  -- Bonus paid to the referrer (USD). Defaults to the standing $25.
  amount               numeric NOT NULL DEFAULT 25,
  created_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS referrals_referrer_idx
  ON referrals(referrer_customer_id);
CREATE INDEX IF NOT EXISTS referrals_code_idx
  ON referrals(code);

COMMENT ON TABLE referrals IS
  'One row per QUALIFYING referred order (CSA line item, paid, > $300). Inserted by the order sync AFTER it credits the referrer $25 in Farm Flex. referred_order_id UNIQUE guarantees the bonus is paid at most once per order.';

-- ───────────────────────────────────────────────────────────────────
-- 3. RLS — members read own rows; admin bypass; writes are service-role
-- ───────────────────────────────────────────────────────────────────

ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals      ENABLE ROW LEVEL SECURITY;

-- referral_codes: a member reads only their own code row.
CREATE POLICY referral_codes_self_read ON referral_codes FOR SELECT
  USING (customer_id = current_customer_id());

-- referral_codes: admin bypass (read/write everything).
CREATE POLICY referral_codes_admin ON referral_codes FOR ALL
  USING (is_admin_caller()) WITH CHECK (is_admin_caller());

-- referrals: a member reads only the referrals THEY made.
CREATE POLICY referrals_self_read ON referrals FOR SELECT
  USING (referrer_customer_id = current_customer_id());

-- referrals: admin bypass (read/write everything).
CREATE POLICY referrals_admin ON referrals FOR ALL
  USING (is_admin_caller()) WITH CHECK (is_admin_caller());

-- NOTE: no FOR INSERT/UPDATE/DELETE policy for `authenticated`. All writes
-- come from the service-role client, which bypasses RLS. A member cannot
-- mint a code or fabricate a referral via the cookie-aware client.
