/**
 * POST /api/admin/market/update-row   (admin only, JSON)
 *
 * Optimistic INLINE edit of ONE market_offerings row from the interactive
 * market-list editor (/admin/market). This is the write behind tap-a-number-
 * type-a-number-blur — the client updates the cell immediately and POSTs here;
 * on failure it reverts (mirrors the Pick & Pack /mark optimistic pattern).
 *
 * Body (JSON, same-origin fetch). `id` required; send ONLY the field(s) that
 * changed — at least one of:
 *   - id             market_offerings UUID                (required)
 *   - planned_qty    number >= 0 | null (blank clears)    (optional)
 *   - unit           text 1..30                           (optional)
 *   - price_dollars  dollars >= 0 → price_cents           (optional)
 *
 * Writes ONLY to market_offerings (the one source of truth the printable price
 * list, product signs, and Pick & Pack all read). Same columns, no schema
 * change — those consumers are unaffected.
 *
 * Authorization: requireAdmin + isSameOriginPost. The update runs through the
 * cookie-aware RLS client (market_offerings_staff = is_admin_caller, FOR ALL),
 * consistent with /api/admin/market/save.
 *
 * Returns { ok:true, planned_qty?, unit?, price_cents? } / { ok:false, error }.
 */
import type { APIRoute } from 'astro';
import { z } from 'zod';
import { requireAdmin } from '../../../../lib/admin';
import { isSameOriginPost, PORTAL_ORIGIN } from '../../../../lib/onboarding';
import { dollarsToCents } from '../../../../lib/flex-order';
import type { Database } from '../../../../lib/database.types';

export const prerender = false;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

const Body = z.object({
  id: z.string().uuid(),
  // planned_qty: number >= 0, or null to clear. Omit to leave unchanged.
  planned_qty: z.number().finite().nonnegative().max(1_000_000).nullable().optional(),
  unit: z.string().trim().min(1).max(30).optional(),
  // Free-typed dollars; converted below. Omit to leave unchanged.
  price_dollars: z.string().optional(),
  // Show/hide at market (price list + signs + Pick & Pack read is_active=true).
  is_active: z.boolean().optional(),
});

export const POST: APIRoute = async ({ request, locals }) => {
  if (!isSameOriginPost(request, PORTAL_ORIGIN)) {
    return json({ ok: false, error: 'forbidden' }, 403);
  }
  const auth = await requireAdmin(locals.supabase, locals.user);
  if (auth.response) return auth.response;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return json({ ok: false, error: 'bad_body' }, 400);
  }
  const parsed = Body.safeParse(raw);
  if (!parsed.success) {
    return json({ ok: false, error: 'invalid_input' }, 400);
  }
  const b = parsed.data;

  // Build the patch from ONLY the fields the client sent. `planned_qty: null`
  // is a meaningful clear, so we test for the KEY, not truthiness.
  const patch: Database['public']['Tables']['market_offerings']['Update'] = {
    updated_at: new Date().toISOString(),
  };
  let touched = false;

  if ('planned_qty' in b) {
    patch.planned_qty = b.planned_qty ?? null;
    touched = true;
  }
  if (b.unit !== undefined) {
    patch.unit = b.unit;
    touched = true;
  }
  if (b.price_dollars !== undefined) {
    const trimmed = b.price_dollars.trim();
    // Blank price → $0 (a valid "hand-write it" state, same as sign-edit).
    const cents = trimmed.length === 0 ? 0 : dollarsToCents(trimmed);
    if (cents === null || cents < 0) {
      return json({ ok: false, error: 'invalid_price' }, 400);
    }
    patch.price_cents = cents;
    touched = true;
  }
  if (b.is_active !== undefined) {
    patch.is_active = b.is_active;
    touched = true;
  }

  if (!touched) {
    return json({ ok: false, error: 'no_fields' }, 400);
  }

  const { data, error } = await locals.supabase
    .from('market_offerings')
    .update(patch)
    .eq('id', b.id)
    .select('id, planned_qty, unit, price_cents, is_active')
    .maybeSingle();

  if (error) {
    console.error('[api/admin/market/update-row] update failed:', error.message);
    return json({ ok: false, error: 'save_failed' }, 500);
  }
  if (!data) {
    // RLS blocked it, or the row is gone — tell the client so it can revert.
    return json({ ok: false, error: 'not_found' }, 404);
  }

  return json({
    ok: true,
    planned_qty: data.planned_qty,
    unit: data.unit,
    price_cents: data.price_cents,
    is_active: data.is_active,
  });
};
