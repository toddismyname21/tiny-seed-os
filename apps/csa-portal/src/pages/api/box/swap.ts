/**
 * POST /api/box/swap
 *
 * Body (application/json):
 *   {
 *     member_id:     string,  // UUID of the active member row
 *     week_date:     string,  // YYYY-MM-DD — the cycle MONDAY (the key
 *                             //   box_contents/box_swaps are stored under).
 *                             //   The /box page derives it via mondayOfWeek
 *                             //   of the delivery Wednesday and sends it here
 *                             //   so swap reads + writes share one key. The
 *                             //   Tuesday-8AM-ET cutoff is anchored on the
 *                             //   cycle week inside isCutoffPassed, so passing
 *                             //   the Monday does NOT shift the cutoff.
 *     original_item: string,  // product_name on box_contents
 *     swapped_for:   string,  // product_name from the original's swap_options
 *   }
 *
 * Response (application/json):
 *   200  { ok: true,  remaining_credits: number, swap_id: string }
 *   400  { ok: false, error: 'invalid_input' | 'invalid_member' | 'invalid_item' | 'invalid_swap' }
 *   401  { ok: false, error: 'unauthenticated' }
 *   402  { ok: false, error: 'no_credits',     remaining_credits: 0 }
 *   403  { ok: false, error: 'cutoff_passed' | 'forbidden' }
 *   409  { ok: false, error: 'already_swapped', remaining_credits: number }
 *   500  { ok: false, error: 'internal' }
 *
 * Authentication is enforced by `Astro.locals.user` (set in middleware).
 *
 * Authorization is layered:
 *   1. The member_id must belong to a `members` row whose customer_id
 *      maps to the caller's `auth.jwt()->>'email'`. We verify this by
 *      SELECTING the row through the cookie-aware (RLS-scoped) client —
 *      RLS returns zero rows if the user doesn't own this member.
 *   2. The member's status must be 'active' or 'paused' or 'onboarding'.
 *      A 'cancelled' / 'lapsed' member cannot swap.
 *   3. The (week_date, box_contents bucket, original_item) must exist in
 *      box_contents AND have is_swappable=true AND swapped_for must
 *      appear in its swap_options array. The "bucket" is resolved from the
 *      member's share_type + share_size via boxContentsShareTypesFor()
 *      because veg box_contents rows are keyed by SIZE ('small'/'family'/
 *      'large'), NOT the member's enum share_type ('summer_veg').
 *   4. The 8 AM Eastern cutoff (Tuesday 8 AM, since boxes deliver Wed)
 *      must not have passed. Override allowed only for the owner email
 *      (todd@tinyseedfarmpgh.com) when ?override_cutoff=true is set —
 *      this is for QA, not a member-facing feature.
 *
 * After all validation, the actual write is delegated to the Postgres
 * function `swap_box_item(...)` (migration 0015), which uses
 * `SELECT ... FOR UPDATE` on the members row to serialize concurrent
 * swap attempts and the UNIQUE (member_id, week_date, original_item)
 * constraint on box_swaps to make repeated calls idempotent at the DB
 * level. We invoke this RPC via the cookie-aware client so Postgres
 * audit logs attribute the call to the authenticated user.
 */
import type { APIRoute } from 'astro';
import { z } from 'zod';
import { isSameOriginPost, PORTAL_ORIGIN } from '../../../lib/onboarding';
import { isCutoffPassed, OWNER_EMAIL, boxContentsShareTypesFor } from '../../../lib/box';
import { asPickupDay } from '../../../lib/flex-order';

export const prerender = false;

const Body = z.object({
  member_id: z.uuid('invalid_input'),
  week_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'invalid_input'),
  original_item: z.string().trim().min(1, 'invalid_input').max(100, 'invalid_input'),
  swapped_for: z.string().trim().min(1, 'invalid_input').max(100, 'invalid_input'),
});

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

export const POST: APIRoute = async ({ request, locals, url }) => {
  // CSRF: only accept same-origin POSTs. Astro 6 enforces Origin checks
  // on form posts by default, but this route is JSON-only — we belt-
  // and-suspenders the check ourselves.
  if (!isSameOriginPost(request, PORTAL_ORIGIN)) {
    return jsonResponse(403, { ok: false, error: 'forbidden' });
  }

  const user = locals.user;
  if (!user || !user.email) {
    return jsonResponse(401, { ok: false, error: 'unauthenticated' });
  }

  // Body parsing.
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
  const { member_id, week_date, original_item, swapped_for } = parsed.data;

  // ─── Authorization: confirm caller owns this member ────────────────
  // RLS on members restricts SELECT to rows where customer_id matches
  // current_customer_id() (the user's customer row). If the user doesn't
  // own this member, the query returns zero rows.
  type MemberRow = {
    id: string;
    share_type: string;
    share_size: string | null;
    status: string;
    swap_credits: number;
    pickup_location: { day_of_week: string | null } | null;
  };

  const { data: memberData, error: memberErr } = await locals.supabase
    .from('members')
    .select('id, share_type, share_size, status, swap_credits, pickup_location:pickup_locations ( day_of_week )')
    .eq('id', member_id)
    .maybeSingle()
    .overrideTypes<MemberRow, { merge: false }>();

  if (memberErr) {
    console.error('[api/box/swap] member lookup failed:', memberErr.message);
    return jsonResponse(500, { ok: false, error: 'internal' });
  }
  if (!memberData) {
    return jsonResponse(400, { ok: false, error: 'invalid_member' });
  }

  // Block swaps for cancelled / lapsed / expired shares — those rows
  // shouldn't have credits anyway, but defense in depth.
  if (!['active', 'paused', 'onboarding'].includes(memberData.status)) {
    return jsonResponse(403, { ok: false, error: 'forbidden' });
  }

  // ─── Cutoff enforcement (unified, pickup-day-aware) ────────────────
  // The swap cutoff is the SAME deadline as Farm Flex (lib/flex-order.ts):
  // Sat/Sun-market members → Thursday 7 AM ET; everyone else → Monday 7 AM ET.
  // isCutoffPassed normalizes whatever cycle date it's given (here: the cycle
  // Monday) to that week's Monday. After cutoff, swaps are frozen. Owner bypass
  // via ?override_cutoff=true.
  const overrideCutoff =
    url.searchParams.get('override_cutoff') === 'true' &&
    user.email === OWNER_EMAIL;
  if (!overrideCutoff && isCutoffPassed(week_date, new Date(), asPickupDay(memberData.pickup_location?.day_of_week))) {
    return jsonResponse(403, { ok: false, error: 'cutoff_passed' });
  }

  // ─── Validate the box-contents row + swap option ───────────────────
  // Look up the original item on this week for the member's box_contents
  // BUCKET(s). box_contents has RLS allowing all authenticated reads.
  //
  // BUG FIX (2026-06-16): veg box_contents rows are published by SIZE bucket
  // ('small' / 'family' / 'large'), NOT the member's ENUM share_type
  // ('summer_veg'). The old `.eq('share_type', memberData.share_type)` lookup
  // therefore matched NOTHING for any veg member, so every real veg swap
  // returned `invalid_item`. boxContentsShareTypesFor() maps the member onto
  // their bucket(s) — small→['small'], family/large→['family','large'], etc.
  // (See lib/box.ts; this is the SAME mapping the /box display page uses.)
  // For flower/flex/add_on it's a passthrough of the enum, preserving prior
  // behavior for those share types.
  const boxBuckets = boxContentsShareTypesFor({
    share_type: memberData.share_type,
    share_size: memberData.share_size,
  });

  type BoxRow = {
    is_swappable: boolean;
    swap_options: string[] | null;
  };

  // The same item may appear under multiple buckets in the union (e.g. a
  // Family member whose box was published under both 'family' and 'large').
  // Fetch all matches for this (week, item) across the member's buckets and
  // accept the item if ANY matched row is swappable and offers swapped_for.
  const { data: boxRows, error: boxErr } = await locals.supabase
    .from('box_contents')
    .select('is_swappable, swap_options')
    .eq('week_date', week_date)
    .in('share_type', boxBuckets)
    .eq('product_name', original_item)
    .overrideTypes<BoxRow[], { merge: false }>();

  if (boxErr) {
    console.error('[api/box/swap] box lookup failed:', boxErr.message);
    return jsonResponse(500, { ok: false, error: 'internal' });
  }
  if (!boxRows || boxRows.length === 0) {
    return jsonResponse(400, { ok: false, error: 'invalid_item' });
  }
  // The item exists in the member's box. It's a valid swap iff at least one
  // matching row is swappable AND lists swapped_for in its swap_options.
  const swappableMatch = boxRows.some(
    (r) => r.is_swappable && (r.swap_options ?? []).includes(swapped_for),
  );
  if (!swappableMatch) {
    // Distinguish "item isn't swappable / option not offered" (invalid_swap)
    // from "item not in box" (invalid_item, handled above). If no row is even
    // swappable, it's an invalid swap attempt.
    return jsonResponse(400, { ok: false, error: 'invalid_swap' });
  }

  // ─── Atomic mutation via Postgres function ─────────────────────────
  // FOR UPDATE on the members row + UNIQUE constraint on box_swaps
  // give us race-safety + idempotency without an application-level
  // transaction. See migration 0015 for the function body.
  type SwapResult =
    | { ok: true; swap_id: string; remaining_credits: number }
    | { error: 'already_swapped' | 'no_credits' | 'member_not_found' | 'invalid_input';
        remaining_credits?: number };

  const { data: rpcData, error: rpcErr } = await locals.supabase.rpc('swap_box_item', {
    p_member_id: member_id,
    p_week_date: week_date,
    p_original_item: original_item,
    p_swapped_for: swapped_for,
  });

  if (rpcErr) {
    console.error('[api/box/swap] rpc failed:', rpcErr.message);
    return jsonResponse(500, { ok: false, error: 'internal' });
  }

  const result = rpcData as unknown as SwapResult;

  if ('error' in result) {
    if (result.error === 'already_swapped') {
      return jsonResponse(409, {
        ok: false,
        error: 'already_swapped',
        remaining_credits: result.remaining_credits ?? memberData.swap_credits,
      });
    }
    if (result.error === 'no_credits') {
      return jsonResponse(402, {
        ok: false,
        error: 'no_credits',
        remaining_credits: result.remaining_credits ?? 0,
      });
    }
    if (result.error === 'member_not_found') {
      return jsonResponse(400, { ok: false, error: 'invalid_member' });
    }
    // 'invalid_input' from the function — should never happen since
    // we validated above, but surface as 400 just in case.
    return jsonResponse(400, { ok: false, error: 'invalid_input' });
  }

  return jsonResponse(200, {
    ok: true,
    swap_id: result.swap_id,
    remaining_credits: result.remaining_credits,
  });
};
