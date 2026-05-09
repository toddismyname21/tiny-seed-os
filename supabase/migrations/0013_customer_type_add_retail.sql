-- ═══════════════════════════════════════════════════════════════════
-- Migration 0013: Add 'retail' to customers.customer_type CHECK
-- Source data has 1503 retail customers (88% of all customers).
-- Original migration 0002 only allowed 'csa','market','wholesale','chef','employee'.
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE customers DROP CONSTRAINT customers_customer_type_check;
ALTER TABLE customers ADD CONSTRAINT customers_customer_type_check
  CHECK (customer_type IN ('csa','retail','market','wholesale','chef','employee'));
