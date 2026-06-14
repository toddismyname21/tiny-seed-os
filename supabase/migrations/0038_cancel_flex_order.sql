-- ═══════════════════════════════════════════════════════════════════
-- Migration 0038: cancel_flex_order() — atomic member flex-order cancel
--
-- The member ordering page (POST /api/account/flex-order/cancel) calls this
-- SECURITY DEFINER function to CANCEL the member's PENDING flex order for a
-- week. Removing all items from the cart only disables the submit button —
-- it does not undo an already-submitted order — so a member who changes
-- their mind needs an explicit "Cancel my order this week" action
-- (FLEX_ORDERING_AUDIT_FIX_2026-06-08 polish). This is that action's
-- backend.
--
-- Doing it in ONE function = ONE transaction is the only race-safe way to
-- RESTOCK each cancelled line and flip its status atomically — so the units
-- the member was holding are returned to remaining_qty exactly once, and a
-- concurrent re-submit can't strand or double-count stock.
--
-- Semantics (mirrors place_flex_order's restock loop):
--   • Lock the member's pending rows for the week FOR UPDATE.
--   • Add each row's qty back to flex_inventory.remaining_qty.
--   • Flip the row status pending → 'cancelled' (an audit trail, not a
--     DELETE — admin/reporting can see the member cancelled). Downstream
--     reads (resolveCycle flex totals) only count 'locked'/'fulfilled', so
--     cancelled rows are invisible to harvest/pack/manifest.
--   • LOCKED/FULFILLED orders are NOT touched (already paid — refunds are a
--     separate admin flow).
--
-- Because we set the rows to 'cancelled' (not pending) after restocking,
-- place_flex_order's pending-restock loop will never re-restock them: it
-- filters status='pending'. Stock stays exactly correct across submit ↔
-- cancel ↔ re-submit.
--
-- Auth: SECURITY DEFINER, re-checks the CALLER. The caller must own
-- p_member_id (member.customer_id = current_customer_id(), household-aware)
-- AND the member must be share_type='flex'. A hand-crafted call for someone
-- else's member_id is rejected with {error:'forbidden'}.
--
-- Returns JSON:
--   {ok:true, cancelled:N, restocked_cents:C}   (N may be 0 = nothing to cancel)
--   {error:'invalid_input'|'forbidden'|'not_flex'}
--
-- Idempotency: CREATE OR REPLACE FUNCTION; safe to re-run. Calling it twice
-- for the same week is harmless — the second call finds no pending rows and
-- returns {ok:true, cancelled:0}.
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.cancel_flex_order(
  p_member_id     uuid,
  p_week_starting date
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_customer_id    uuid;
  v_share_type     text;
  v_old            record;
  v_count          int := 0;
  v_restocked_cents int := 0;
BEGIN
  -- ── Basic input validation ────────────────────────────────────────
  IF p_member_id IS NULL OR p_week_starting IS NULL THEN
    RETURN json_build_object('error', 'invalid_input');
  END IF;

  -- ── Ownership + flex-membership check (re-assert the caller) ───────
  v_customer_id := current_customer_id();
  IF v_customer_id IS NULL THEN
    RETURN json_build_object('error', 'forbidden');
  END IF;

  SELECT share_type INTO v_share_type
  FROM members
  WHERE id = p_member_id AND customer_id = v_customer_id;

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'forbidden');
  END IF;
  IF v_share_type <> 'flex' THEN
    RETURN json_build_object('error', 'not_flex');
  END IF;

  -- ── Restock + cancel the member's pending order for this week ──────
  -- Lock the pending rows, add their qty back to remaining_qty, then set
  -- the row to 'cancelled'. Locked/fulfilled rows are left untouched.
  FOR v_old IN
    SELECT id, flex_item_id, qty, total_cents
    FROM flex_orders
    WHERE member_id = p_member_id
      AND cycle_code = 'WEEKLY'
      AND week_starting = p_week_starting
      AND status = 'pending'
    FOR UPDATE
  LOOP
    UPDATE flex_inventory
       SET remaining_qty = remaining_qty + v_old.qty
     WHERE id = v_old.flex_item_id;
    UPDATE flex_orders
       SET status = 'cancelled'
     WHERE id = v_old.id;
    v_count := v_count + 1;
    v_restocked_cents := v_restocked_cents + v_old.total_cents;
  END LOOP;

  RETURN json_build_object(
    'ok', true,
    'cancelled', v_count,
    'restocked_cents', v_restocked_cents
  );
END;
$function$;

COMMENT ON FUNCTION public.cancel_flex_order(uuid, date) IS
  'Atomic member flex-order cancel: re-asserts caller owns the flex member, restocks each pending line back into flex_inventory.remaining_qty, and flips the rows pending→cancelled (audit trail). Locked/fulfilled untouched. Returns {ok:true,cancelled,restocked_cents} or {error:...}.';

-- Authenticated members call it; the function re-checks ownership.
GRANT EXECUTE ON FUNCTION public.cancel_flex_order(uuid, date) TO authenticated;
