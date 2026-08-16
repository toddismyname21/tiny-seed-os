/**
 * POST /api/box/swap-undo
 *
 * Undo a previously-made swap. Refunds the swap credit and deletes the
 * box_swaps row.
 *
 * Body (application/json):
 *   {
 *     member_id:     string,  // UUID
 *     week_date:     string,  // YYYY-MM-DD
 *     original_item: string,  // The item that was originally in the box
 *   }
 *
 * Response (application/json):
 *   200  { ok: true, no_op: boolean, remaining_credits: number }
 *   400  { ok: false, error: 'invalid_input' | 'invalid_member' }
 *   401  { ok: false, error: 'unauthenticated' }
 *   403  { ok: false, error: 'cutoff_passed' | 'forbidden' }
 *   500  { ok: false, error: 'internal' }
 *
 * Idempotent: calling twice for the same (member, week, item) returns
 * `ok: true, no_op: true` on the second call. The Postgres function
 * `undo_box_swap(...)` handles this by checking ROW_COUNT after the
 * DELETE and skipping the credit increment if nothing was deleted.
 *
 * Cutoff: still enforced. After Tuesday 8 AM Eastern, the box is final
 * — no swaps and no undos. (Letting members undo after cutoff would
 * leave the warehouse with the wrong item already pulled.)
 *
 * Authorization: same as /api/box/swap — caller must own the member
 * row (verified through RLS-scoped read), member must not be cancelled,
 * and the cutoff must not have passed.
 */
import type { APIRoute } from 'astro';
import { z } from 'zod';
import { isSameOriginPost, PORTAL_ORIGIN } from '../../../lib/onboarding';
import { isCutoffPassed, OWNER_EMAIL } from '../../../lib/box';

export const prerender = false;

const Body = z.object({
  member_id: z.uuid('invalid_input'),
  week_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'invalid_input'),
  original_item: z.string().trim().min(1, 'invalid_input').max(100, 'invalid_input'),
});

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

export const POST: APIRoute = async ({ request, locals, url }) => {
  if (!isSameOriginPost(request, PORTAL_ORIGIN)) {
    return jsonResponse(403, { ok: false, error: 'forbidden' });
  }

  const user = locals.user;
  if (!user || !user.email) {
    return jsonResponse(401, { ok: false, error: 'unauthenticated' });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return jsonResponse(400, { ok: false, error: 'invalid_input' });
  }

  const parsed = Body.safeParse(raw);
  if (!parsed.success) {
    return jsonResponse(400, { ok: false, error: 'invalid_input' });
  }
  const { member_id, week_date, original_item } = parsed.data;

  // ─── Authorization ─────────────────────────────────────────────────
  type MemberRow = { id: string; status: string; pickup_location: { day_of_week: string | null } | null };
  const { data: memberData, error: memberErr } = await locals.supabase
    .from('members')
    .select('id, status, pickup_location:pickup_locations ( day_of_week )')
    .eq('id', member_id)
    .maybeSingle()
    .overrideTypes<MemberRow, { merge: false }>();

  if (memberErr) {
    console.error('[api/box/swap-undo] member lookup failed:', memberErr.message);
    return jsonResponse(500, { ok: false, error: 'internal' });
  }
  if (!memberData) {
    return jsonResponse(400, { ok: false, error: 'invalid_member' });
  }

  if (!['active', 'paused', 'onboarding'].includes(memberData.status)) {
    return jsonResponse(403, { ok: false, error: 'forbidden' });
  }

  // ─── Cutoff enforcement (unified, pickup-day-aware) ────────────────
  // Same deadline as a forward swap / Flex: Sat/Sun → Thursday 7 AM ET;
  // everyone else → Monday 7 AM ET.
  const overrideCutoff =
    url.searchParams.get('override_cutoff') === 'true' &&
    user.email === OWNER_EMAIL;
  if (!overrideCutoff && isCutoffPassed(week_date, new Date(), memberData.pickup_location?.day_of_week ?? null)) {
    return jsonResponse(403, { ok: false, error: 'cutoff_passed' });
  }

  // ─── Atomic undo via Postgres function ─────────────────────────────
  type UndoResult =
    | { ok: true; no_op: boolean; remaining_credits: number }
    | { error: 'invalid_input' | 'member_not_found' };

  const { data: rpcData, error: rpcErr } = await locals.supabase.rpc('undo_box_swap', {
    p_member_id: member_id,
    p_week_date: week_date,
    p_original_item: original_item,
  });

  if (rpcErr) {
    console.error('[api/box/swap-undo] rpc failed:', rpcErr.message);
    return jsonResponse(500, { ok: false, error: 'internal' });
  }

  const result = rpcData as unknown as UndoResult;

  if ('error' in result) {
    if (result.error === 'member_not_found') {
      return jsonResponse(400, { ok: false, error: 'invalid_member' });
    }
    return jsonResponse(400, { ok: false, error: 'invalid_input' });
  }

  return jsonResponse(200, {
    ok: true,
    no_op: result.no_op,
    remaining_credits: result.remaining_credits,
  });
};
