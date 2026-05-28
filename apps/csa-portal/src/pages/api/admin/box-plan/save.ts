/**
 * POST /api/admin/box-plan/save
 *
 * Admin save / publish / unpublish for a single weekly_box_plan row.
 *
 * Form fields:
 *   action          'save_draft' | 'publish' | 'unpublish'
 *   week_starting   YYYY-MM-DD (Monday)
 *   share_size      'small' | 'large' | 'family' | 'regular' | 'light'
 *   contents        JSON string — array of {crop, qty, unit, notes?}
 *
 * Validation:
 *   - contents must parse as an array.
 *   - every line must have crop (non-empty string), qty (finite number),
 *     unit (non-empty string).
 *   - share_size must be in the allowed enum.
 *
 * Behavior:
 *   - save_draft: UPSERT row; published_at left null on insert, untouched
 *     on update (admin can keep editing a draft).
 *   - publish: UPSERT row; published_at = now().
 *   - unpublish: UPSERT row; published_at = null.
 *
 * Auth: requireAdmin. CSRF: isSameOriginPost.
 */
import type { APIRoute } from 'astro';
import { isSameOriginPost, PORTAL_ORIGIN } from '../../../../lib/onboarding';
import { requireAdmin } from '../../../../lib/admin';

export const prerender = false;

const ALLOWED_SIZES = new Set(['small', 'large', 'family', 'regular', 'light']);

function fail(redirect: (u: string, s: 303) => Response, week: string, code: string): Response {
  return redirect(`/admin/box-plan/${week}?error=${code}`, 303);
}

interface ContentLine {
  crop: string;
  qty: number;
  unit: string;
  notes?: string;
}

function validateContents(parsed: unknown): ContentLine[] | null {
  if (!Array.isArray(parsed)) return null;
  const out: ContentLine[] = [];
  for (const row of parsed) {
    if (!row || typeof row !== 'object') return null;
    const r = row as Record<string, unknown>;
    if (typeof r.crop !== 'string' || r.crop.trim().length === 0) return null;
    const qty = typeof r.qty === 'number' ? r.qty :
                typeof r.qty === 'string' ? Number(r.qty) : NaN;
    if (!Number.isFinite(qty) || qty < 0) return null;
    if (typeof r.unit !== 'string' || r.unit.trim().length === 0) return null;
    out.push({
      crop: r.crop.trim(),
      qty,
      unit: r.unit.trim(),
      notes: typeof r.notes === 'string' ? r.notes : undefined,
    });
  }
  return out;
}

export const POST: APIRoute = async ({ request, redirect, locals }) => {
  if (!isSameOriginPost(request, PORTAL_ORIGIN)) {
    return new Response('Forbidden', { status: 403 });
  }
  const { response } = await requireAdmin(locals.supabase, locals.user);
  if (response) return response;

  let form: FormData;
  try { form = await request.formData(); } catch {
    return new Response(JSON.stringify({ ok: false, error: 'bad_form' }), {
      status: 400, headers: { 'content-type': 'application/json' },
    });
  }

  const action = String(form.get('action') ?? '');
  const week = String(form.get('week_starting') ?? '');
  const size = String(form.get('share_size') ?? '');
  const contentsStr = String(form.get('contents') ?? '');

  if (!['save_draft', 'publish', 'unpublish'].includes(action) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(week)) {
    return fail(redirect, week || 'invalid', 'invalid_input');
  }
  if (!ALLOWED_SIZES.has(size)) {
    return fail(redirect, week, 'bad_size');
  }

  let parsed: unknown;
  try { parsed = JSON.parse(contentsStr); } catch {
    return fail(redirect, week, 'invalid_input');
  }
  const contents = validateContents(parsed);
  if (contents === null) {
    return fail(redirect, week, 'invalid_input');
  }

  // Cast `size` through the narrow enum so the typed Supabase client
  // accepts the .eq filter (validateContents above already ensures it's
  // one of the allowed values).
  const sizeEnum = size as 'small' | 'large' | 'family' | 'regular' | 'light';

  // Fetch any existing row so an update keeps the existing published_at
  // intact for save_draft.
  const { data: existing } = await locals.supabase
    .from('weekly_box_plan')
    .select('id, published_at')
    .eq('cycle_code', 'WEEKLY')
    .eq('week_starting', week)
    .eq('share_size', sizeEnum)
    .maybeSingle();

  let published_at: string | null = existing?.published_at ?? null;
  if (action === 'publish') published_at = new Date().toISOString();
  else if (action === 'unpublish') published_at = null;

  const { error: upErr } = await locals.supabase
    .from('weekly_box_plan')
    .upsert({
      cycle_code: 'WEEKLY',
      week_starting: week,
      share_size: sizeEnum,
      contents: contents as unknown as never,
      published_at,
    }, { onConflict: 'cycle_code,week_starting,share_size' });

  if (upErr) {
    console.error('[box-plan/save] upsert failed:', upErr.message);
    return fail(redirect, week, 'db_save_failed');
  }

  const okMap: Record<string, string> = {
    save_draft: 'saved',
    publish: 'published',
    unpublish: 'unpublished',
  };
  return redirect(`/admin/box-plan/${week}?ok=${okMap[action]}`, 303);
};
