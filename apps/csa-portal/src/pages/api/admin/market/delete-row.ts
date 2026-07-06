/**
 * POST /api/admin/market/delete-row   (admin only, JSON)
 *
 * Delete ONE market_offerings row from the interactive market-list editor
 * (/admin/market) — the write behind the one-tap "Remove" (styled inline
 * confirm, then optimistic removal from the list). "Remove what we no longer
 * have" from Todd's rebuild brief.
 *
 * Body (JSON, same-origin fetch):
 *   - id   market_offerings UUID   (required)
 *
 * A hard DELETE, mirroring op=remove in /api/admin/market/save. Only touches
 * market_offerings — the printable price list, product signs, and Pick & Pack
 * all read the same table, so the item simply disappears from them too.
 *
 * Authorization: requireAdmin + isSameOriginPost. Runs through the cookie-aware
 * RLS client (market_offerings_staff = is_admin_caller, FOR ALL).
 *
 * Returns { ok:true } / { ok:false, error }.
 */
import type { APIRoute } from 'astro';
import { z } from 'zod';
import { requireAdmin } from '../../../../lib/admin';
import { isSameOriginPost, PORTAL_ORIGIN } from '../../../../lib/onboarding';

export const prerender = false;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

const Body = z.object({ id: z.string().uuid() });

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

  const { error } = await locals.supabase
    .from('market_offerings')
    .delete()
    .eq('id', parsed.data.id);

  if (error) {
    console.error('[api/admin/market/delete-row] delete failed:', error.message);
    return json({ ok: false, error: 'delete_failed' }, 500);
  }

  return json({ ok: true });
};
