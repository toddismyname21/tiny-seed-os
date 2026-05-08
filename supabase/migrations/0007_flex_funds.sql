-- ═══════════════════════════════════════════════════════════════════
-- Migration 0007: Flex Funds (member balance / credit system)
-- Replaces FlexFunds_Log sheet (10 cols → relational)
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE flex_transactions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id     UUID REFERENCES members(id) ON DELETE SET NULL,
  email         CITEXT NOT NULL,                              -- denormalized — survives member deletion
  type          TEXT NOT NULL CHECK (type IN ('credit','debit','refund','transfer','adjustment')),
  amount        DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  reason        TEXT,
  admin_email   CITEXT,                                       -- who issued the transaction
  gift_card_id  TEXT,
  order_id      TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX flex_member_idx ON flex_transactions(member_id);
CREATE INDEX flex_email_idx  ON flex_transactions(email);
CREATE INDEX flex_created_idx ON flex_transactions(created_at DESC);

COMMENT ON TABLE flex_transactions IS 'Append-only ledger of flex fund credits/debits. Member balance derived via SUM.';

-- View for current member balances
CREATE VIEW member_flex_balance AS
SELECT
  m.id AS member_id,
  m.customer_id,
  c.email,
  COALESCE(SUM(CASE WHEN ft.type IN ('credit','refund') THEN ft.amount ELSE -ft.amount END), 0) AS balance,
  COUNT(ft.id) AS transaction_count
FROM members m
JOIN customers c ON c.id = m.customer_id
LEFT JOIN flex_transactions ft ON ft.member_id = m.id
GROUP BY m.id, m.customer_id, c.email;

COMMENT ON VIEW member_flex_balance IS 'Live member balance derived from flex_transactions ledger.';
