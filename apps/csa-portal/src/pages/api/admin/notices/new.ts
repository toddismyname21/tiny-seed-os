/**
 * POST /api/admin/notices/new
 *
 * Create a member notice — a promise/note the farm owes a member that stays
 * OPEN until the team fulfills it. When stop_hint targets a stop it will print
 * on that stop's pack sheet (see lib/notices); when stop_hint is empty it's a
 * GENERAL notice that lives only on the admin Notices page.
 *
 * Form body (multipart/form-data):
 *   - title      String 1..200      (required)
 *   - detail     String 0..2000     (optional)
 *   - customer_id  UUID             (optional — the member the promise is for)
 *   - stop_hint  String             (optional — a pickup stop NAME, the
 *                                    literal 'HOME DELIVERY', or '' / 'general'
 *                                    for a general notice → stored NULL)
 *   - due_week   YYYY-MM-DD (Monday) (optional — "" → NULL = next opportunity)
 *
 * The stop_hint and due_week are submitted from the page's own dropdowns
 * (active pickup stop names + 'HOME DELIVERY' + 'general'; week-picker
 * Mondays), so we accept the raw strings and normalise: 'general'/'' → NULL.
 *
 * On success: 303 → /admin/notices?ok=created
 * On failure: 303 → /admin/notices?error=<code>
 *
 * Authorization: isSameOriginPost (CSRF) + requireAdmin (role admin/staff).
 * Write via the cookie-aware RLS client (table admin/staff ALL policy).
 * created_by is stamped with the staff email; status defaults to 'open'.
 */
import type { APIRoute } from 'astro';
import { z } from 'zod';
import { requireAdmin } from '../../../../lib/admin';
import { isSameOriginPost, PORTAL_ORIGIN } from '../../../../lib/onboarding';

export const prerender = false;

const REDIRECT = '/admin/notices';

const TitleSchema = z.string().trim().min(1, 'title_required').max(200, 'title_too_long');
const DetailSchema = z.string().trim().max(2000, 'detail_too_long');
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
// Sentinel the form uses for "this is a general notice (no stop)".
const GENERAL_HINT = 'general';

function fail(redirect: (url: string, status: 303) => Response, code: string): Response {
  return redirect(`${REDIRECT}?error=${code}`, 303);
}

export const POST: APIRoute = async ({ request, locals, redirect }) => {
  if (!isSameOriginPost(request, PORTAL_ORIGIN)) {
    return new Response('Forbidden', { status: 403 });
  }

  const auth = await requireAdmin(locals.supabase, locals.user);
  if (auth.response) return auth.response;
  const ctx = auth.ctx;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return fail(redirect, 'invalid_input');
  }

  // ── title (required) ──────────────────────────────────────────────
  const parsedTitle = TitleSchema.safeParse(String(formData.get('title') ?? ''));
  if (!parsedTitle.success) {
    return fail(redirect, parsedTitle.error.issues[0]?.message ?? 'title_required');
  }

  // ── detail (optional) ─────────────────────────────────────────────
  const detailRaw = String(formData.get('detail') ?? '');
  const parsedDetail = DetailSchema.safeParse(detailRaw);
  if (!parsedDetail.success) {
    return fail(redirect, parsedDetail.error.issues[0]?.message ?? 'detail_too_long');
  }
  const detail = parsedDetail.data.length > 0 ? parsedDetail.data : null;

  // ── customer_id (optional, must be a UUID if present) ─────────────
  const customerRaw = String(formData.get('customer_id') ?? '').trim();
  let customer_id: string | null = null;
  if (customerRaw.length > 0) {
    if (!z.uuid().safeParse(customerRaw).success) {
      return fail(redirect, 'invalid_member');
    }
    customer_id = customerRaw;
  }

  // ── stop_hint (optional) — 'general' / '' → NULL (general notice) ──
  const hintRaw = String(formData.get('stop_hint') ?? '').trim();
  const stop_hint = hintRaw.length === 0 || hintRaw === GENERAL_HINT ? null : hintRaw;

  // ── due_week (optional) — '' → NULL; else must be YYYY-MM-DD ───────
  const dueRaw = String(formData.get('due_week') ?? '').trim();
  let due_week: string | null = null;
  if (dueRaw.length > 0) {
    if (!DATE_RE.test(dueRaw)) {
      return fail(redirect, 'invalid_due_week');
    }
    due_week = dueRaw;
  }

  // Defensive: if a member was named, confirm the row exists (admin RLS reads
  // all customers). Clearer than a downstream FK violation.
  if (customer_id) {
    const { data: cust, error: custErr } = await locals.supabase
      .from('customers')
      .select('id')
      .eq('id', customer_id)
      .maybeSingle();
    if (custErr) {
      console.error('[api/admin/notices/new] customer lookup failed:', custErr.message);
      return fail(redirect, 'network');
    }
    if (!cust) {
      return fail(redirect, 'member_not_found');
    }
  }

  const { error } = await locals.supabase.from('member_notices').insert({
    customer_id,
    title: parsedTitle.data,
    detail,
    stop_hint,
    due_week,
    status: 'open',
    created_by: ctx.user.email ?? null,
  });

  if (error) {
    console.error('[api/admin/notices/new] insert failed:', error.message);
    return fail(redirect, 'network');
  }

  return redirect(`${REDIRECT}?ok=created`, 303);
};
