-- ═══════════════════════════════════════════════════════════════════
-- Migration 0015: Atomic box swap + undo functions
--
-- Adds two PL/pgSQL functions that the /api/box/swap and
-- /api/box/swap-undo endpoints call:
--
--   swap_box_item(member_id, week_date, original_item, swapped_for)
--     → INSERT into box_swaps + DECREMENT members.swap_credits in one
--       transaction, with `SELECT ... FOR UPDATE` on the members row to
--       serialize concurrent calls. Idempotent at the DB level via the
--       UNIQUE (member_id, week_date, original_item) constraint added
--       in 0006_member_data.sql.
--
--   undo_box_swap(member_id, week_date, original_item)
--     → DELETE the swap row + INCREMENT credits in the same transaction.
--       Idempotent — running it twice is a no-op the second time.
--
-- Both functions:
--   - Return JSON: {ok: true, remaining_credits: N} on success,
--                  {error: '<code>'} on failure.
--   - Run as SECURITY DEFINER so they can update members.swap_credits
--     even when the calling RLS context wouldn't permit it. The API
--     routes are responsible for verifying the caller owns the member
--     row before invoking these (they look up the member via the
--     cookie-aware RLS-scoped client, then pass the verified UUID).
--   - Lock down EXECUTE: GRANT to authenticated only.
--
-- Why SECURITY DEFINER instead of RLS-only writes?
--   The API route already authorizes the caller. We want a single
--   transaction with FOR UPDATE on the members row for race-safety;
--   doing this from the application layer would require either
--   transaction-scoped RPC (not available in supabase-js) or hand-rolled
--   advisory locks. A SECURITY DEFINER function is the canonical
--   Postgres pattern for this.
-- ═══════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────
-- swap_box_item: atomic swap + credit decrement
-- ───────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.swap_box_item(
  p_member_id     UUID,
  p_week_date     DATE,
  p_original_item TEXT,
  p_swapped_for   TEXT
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_credits INT;
  v_swap_id UUID;
BEGIN
  -- Defensive input checks. The API layer already validates these,
  -- but the function should refuse garbage too.
  IF p_member_id IS NULL OR p_week_date IS NULL
     OR p_original_item IS NULL OR p_original_item = ''
     OR p_swapped_for   IS NULL OR p_swapped_for   = '' THEN
    RETURN json_build_object('error', 'invalid_input');
  END IF;

  -- Lock the member row to serialize concurrent swap attempts. The
  -- transaction holds this row-level exclusive lock until COMMIT, so
  -- a second simultaneous swap_box_item() call on the same member
  -- waits here until we decide whether to consume a credit.
  SELECT swap_credits INTO v_credits
    FROM members
   WHERE id = p_member_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'member_not_found');
  END IF;

  IF v_credits < 1 THEN
    RETURN json_build_object('error', 'no_credits', 'remaining_credits', v_credits);
  END IF;

  -- Insert the swap. The UNIQUE (member_id, week_date, original_item)
  -- constraint on box_swaps means two callers racing on the same
  -- (member, week, item) collide here — one wins, the other catches
  -- unique_violation in the EXCEPTION block and returns 'already_swapped'
  -- WITHOUT decrementing credits.
  INSERT INTO box_swaps (member_id, week_date, original_item, swapped_for)
  VALUES (p_member_id, p_week_date, p_original_item, p_swapped_for)
  RETURNING id INTO v_swap_id;

  -- Decrement only after a successful insert.
  UPDATE members
     SET swap_credits = swap_credits - 1,
         updated_at   = NOW()
   WHERE id = p_member_id;

  RETURN json_build_object(
    'ok', true,
    'swap_id', v_swap_id,
    'remaining_credits', v_credits - 1
  );

EXCEPTION
  WHEN unique_violation THEN
    -- Already-swapped: do NOT consume a credit; surface the current
    -- remaining count so the client can update its UI without a refetch.
    RETURN json_build_object(
      'error', 'already_swapped',
      'remaining_credits', v_credits
    );
END;
$$;

COMMENT ON FUNCTION public.swap_box_item(UUID, DATE, TEXT, TEXT) IS
  'Atomic CSA box swap. Inserts into box_swaps and decrements members.swap_credits in one transaction with FOR UPDATE on members. Returns {ok|error, remaining_credits}.';

-- ───────────────────────────────────────────────────────────────────
-- undo_box_swap: atomic undo + credit refund
-- ───────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.undo_box_swap(
  p_member_id     UUID,
  p_week_date     DATE,
  p_original_item TEXT
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_credits INT;
  v_deleted INT;
BEGIN
  IF p_member_id IS NULL OR p_week_date IS NULL
     OR p_original_item IS NULL OR p_original_item = '' THEN
    RETURN json_build_object('error', 'invalid_input');
  END IF;

  -- Lock the member row first; same reasoning as swap_box_item.
  SELECT swap_credits INTO v_credits
    FROM members
   WHERE id = p_member_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'member_not_found');
  END IF;

  -- Delete the swap row. If no row matches (already undone, or there
  -- was never a swap to begin with), GET DIAGNOSTICS will report 0
  -- and we return ok=true with current credit count — undo is
  -- idempotent by design.
  DELETE FROM box_swaps
   WHERE member_id     = p_member_id
     AND week_date     = p_week_date
     AND original_item = p_original_item;

  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  IF v_deleted = 0 THEN
    -- No swap to undo. Return ok with current credit count so the
    -- client can reconcile its view; this also keeps the API truly
    -- idempotent (a retry of an already-applied undo is a no-op success).
    RETURN json_build_object(
      'ok', true,
      'no_op', true,
      'remaining_credits', v_credits
    );
  END IF;

  -- Refund the credit.
  UPDATE members
     SET swap_credits = swap_credits + 1,
         updated_at   = NOW()
   WHERE id = p_member_id;

  RETURN json_build_object(
    'ok', true,
    'no_op', false,
    'remaining_credits', v_credits + 1
  );
END;
$$;

COMMENT ON FUNCTION public.undo_box_swap(UUID, DATE, TEXT) IS
  'Atomic undo of a CSA box swap. Deletes from box_swaps and increments members.swap_credits. Idempotent — running twice is a no-op the second time.';

-- ───────────────────────────────────────────────────────────────────
-- Lock down EXECUTE
-- Default Postgres grants EXECUTE on functions to PUBLIC; we revoke
-- and re-grant only to `authenticated`. The anon role cannot call
-- these — only logged-in users via PostgREST RPC (or the service role).
-- ───────────────────────────────────────────────────────────────────

REVOKE EXECUTE ON FUNCTION public.swap_box_item(UUID, DATE, TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.undo_box_swap(UUID, DATE, TEXT)       FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.swap_box_item(UUID, DATE, TEXT, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.undo_box_swap(UUID, DATE, TEXT)       TO authenticated, service_role;
