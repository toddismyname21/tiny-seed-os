/**
 * GET /api/admin/box-contents/list?week=YYYY-MM-DD&share_type=<canonical>
 *
 * Returns { items: [...] } for the box-content editor's "Copy from
 * previous week" button. Lives under /api/admin/* so it's gated by
 * the same admin check as the page UI.
 *
 * Response shape (matches the editor's JS expectation):
 *   {
 *     "items": [
 *       { product_name, variety, quantity, unit, is_swappable, swap_options }
 *     ]
 *   }
 */
import type { APIRoute } from 'astro';
import { requireAdmin } from '../../../../lib/admin';

export const prerender = false;

const CANONICAL_SHARES = new Set([
  'spring_veg', 'summer_veg', 'fall_veg', 'flower', 'flex', 'add_on', 'wholesale_csa',
]);

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

export const GET: APIRoute = async ({ url, locals }) => {
  const auth = await requireAdmin(locals.supabase, locals.user);
  if (auth.response) return auth.response;

  const week = url.searchParams.get('week') ?? '';
  const shareType = url.searchParams.get('share_type') ?? '';

  if (!/^\d{4}-\d{2}-\d{2}$/.test(week)) {
    return jsonResponse(400, { error: 'invalid_week' });
  }
  if (!CANONICAL_SHARES.has(shareType)) {
    return jsonResponse(400, { error: 'invalid_share_type' });
  }

  const { data, error } = await locals.supabase
    .from('box_contents')
    .select('product_name, variety, quantity, unit, is_swappable, swap_options')
    .eq('week_date', week)
    .eq('share_type', shareType)
    .order('product_name', { ascending: true });

  if (error) {
    console.error('[api/admin/box-contents/list] fetch failed:', error.message);
    return jsonResponse(500, { error: 'internal' });
  }

  return jsonResponse(200, { items: data ?? [] });
};
