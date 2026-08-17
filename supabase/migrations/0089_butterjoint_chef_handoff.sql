-- 0089_butterjoint_chef_handoff.sql
--
-- Butter Joint chef handoff: route availability lists to the CURRENT chef.
--
-- ── WHY ──────────────────────────────────────────────────────────────────────
-- Butter Joint changed chefs in July and the contact records were never updated,
-- so every availability list has been addressed to a chef who no longer works
-- there while the person who actually decides what to buy has never received one.
--
-- From Todd's text thread with George Austin (owner, 412-508-7939):
--   Jul 22  George: "Did you hear that Peter has moved on... We have promoted
--                    Brian who has been the kitchen manager for a long time,
--                    but our ordering may be a little rocky for a minute"
--   Jul 23  George: "I have been getting your list on email, that's great.
--                    Can you add Brian's email it's brian@butterjoint.com"
--   Jul 27  George: "I've added Brian Selya to this text chain, he's the new
--                    chef at Butterjoint."
--
-- That request was never actioned. Measured 2026-08-17 against production:
--   • wholesale_account_contacts for Butter Joint = peter@ (receives_orders=t),
--     george@ (receives_orders=t, receives_invoices=t). No Brian.
--   • 8 of the last 10 orders are source='standing' — the auto-created 10 lb
--     King Spring Mix, $100. Nobody has touched the order.
--   • The only two weeks they bought anything else were Jun 24 (Peter, via the
--     chef portal) and Jul 24 (Todd hand-entering George's texted order, $353 —
--     their largest week on record).
--   • last_portal_visit_at = 2026-07-22. Nobody has opened the order page since
--     the week Peter left.
--
-- resolveOrderRecipients() (src/lib/wholesale-contacts.ts) builds the
-- availability-list audience from contacts flagged receives_orders, so this data
-- fix is what actually puts the new chef on the list — no code change needed.
--
-- ── DESIGN ───────────────────────────────────────────────────────────────────
-- Peter's row is RETAINED, not deleted. He is real history: he placed the
-- Jun 24 order, and deleting the row would orphan that context and lose the
-- audit trail of who ordered what. Flipping receives_orders to false stops the
-- mail without rewriting the past. Same reasoning as any is_active flag.
--
-- Brian's phone is set so an inbound text from him resolves to this account via
-- the migration 0087 phone identity path. (267) 342-0200 is confirmed as the
-- second participant in the group iMessage George created on Jul 27 for this
-- handoff.
--
-- Idempotent: safe to re-run.

BEGIN;

-- The new chef. ON CONFLICT keeps this re-runnable without duplicating.
INSERT INTO wholesale_account_contacts
  (account_id, email, name, receives_orders, receives_invoices, phone)
SELECT
  a.id,
  'brian@butterjoint.com',
  'Brian Selya (chef)',
  TRUE,   -- availability lists + order confirmations
  FALSE,  -- billing stays with George
  '2673420200'
FROM wholesale_accounts a
WHERE a.restaurant_name = 'Butter Joint'
  AND NOT EXISTS (
    SELECT 1 FROM wholesale_account_contacts c
    WHERE c.account_id = a.id
      AND lower(c.email) = 'brian@butterjoint.com'
  );

-- George stays on orders AND invoices (he is the owner and pays the bills);
-- backfill his cell so his texts attribute to the account.
UPDATE wholesale_account_contacts c
SET receives_orders   = TRUE,
    receives_invoices = TRUE,
    name              = COALESCE(NULLIF(c.name, ''), 'George Austin (owner)'),
    phone             = COALESCE(c.phone, '4125087939')
FROM wholesale_accounts a
WHERE c.account_id = a.id
  AND a.restaurant_name = 'Butter Joint'
  AND lower(c.email) = 'george@butterjoint.com';

-- Peter has left the restaurant. Stop the mail; keep the record.
UPDATE wholesale_account_contacts c
SET receives_orders   = FALSE,
    receives_invoices = FALSE,
    name              = 'Peter (former chef — departed Jul 2026)'
FROM wholesale_accounts a
WHERE c.account_id = a.id
  AND a.restaurant_name = 'Butter Joint'
  AND lower(c.email) = 'peter@butterjoint.com';

COMMIT;
