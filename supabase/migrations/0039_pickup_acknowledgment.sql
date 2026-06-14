-- 0039_pickup_acknowledgment.sql
--
-- FORCED pickup-location acknowledgment (Todd directive, 2026-06-08).
--
-- Every CSA member MUST confirm they understand WHERE and WHEN they pick up
-- their share before reaching the portal — the same forcing pattern as the
-- required phone gate (migration-less; lib/phone.ts + middleware). Missed
-- pickups are the #1 source of wasted boxes + member friction, so we make the
-- member acknowledge their resolved pickup location once.
--
-- middleware.ts gates every protected member route on this column: a non-admin
-- member with pickup_acknowledged_at IS NULL is redirected to
-- /account/confirm-pickup and cannot reach the dashboard / box / flex until
-- they confirm. /api/account/confirm-pickup sets this timestamp via the
-- RLS-scoped, email-filtered self-update (policy customers_self_update,
-- migration 0011). Admins/staff are exempt (they aren't CSA members who pick
-- up boxes).
--
-- Idempotent: ADD COLUMN IF NOT EXISTS. No backfill — a NULL value (the
-- default for every existing + future row) is exactly the "not yet
-- acknowledged" state the gate keys on, so all current members are prompted
-- once on their next visit.

ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS pickup_acknowledged_at timestamptz;

COMMENT ON COLUMN public.customers.pickup_acknowledged_at IS
  'When the member confirmed they understand their pickup location + day/time '
  'via /account/confirm-pickup (Todd directive 2026-06-08). NULL = not yet '
  'acknowledged → middleware forces the confirm-pickup interstitial. Set by '
  '/api/account/confirm-pickup. Admins/staff are never gated.';
