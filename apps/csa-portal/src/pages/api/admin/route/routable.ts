/**
 * POST /api/admin/route/routable
 *
 * Flip a customer's `customers.routable` flag (migration 0062) — the
 * "manual / not-routable stops" control on the route planner.
 *
 *   routable=false → take this home-delivery customer OFF the route optimizer
 *                    (deliver by hand; shown as a manual stop).
 *   routable=true  → put them back ON the optimizer.
 *
 * Strictly reversible: a single boolean update, no other side effects. The
 * optimizer reads this flag in gatherDayStops; nothing else changes.
 *
 * Body (multipart/form-data — same-origin form POST):
 *   - customer_id  UUID (required)
 *   - routable     'true' | 'false' (required)
 *   - week, day    optional — echoed into the redirect so the planner stays put.
 *
 * Security: isSameOriginPost CSRF guard + requireAdmin (role admin/staff). The
 * UPDATE runs through the cookie-aware RLS-scoped client, whose customers
 * admin-all policy re-checks is_admin_caller() beneath the handler gate.
 *
 * On success: 303 → /admin/route-plan?...&routable_ok=<on|off>
 * On failure: 303 → /admin/route-plan?...&routable_error=<code>
 */
import type { APIRoute } from 'astro';
import { z } from 'zod';
import { requireAdmin } from '../../../../lib/admin';
import { isSameOriginPost, PORTAL_ORIGIN } from '../../../../lib/onboarding';

export const prerender = false;

const BASE = '/admin/route-plan';

/** Rebuild the planner URL, preserving week/day context if the form sent it. */
function plannerUrl(week: string, day: string, params: Record<string, string>): string {
  const u = new URLSearchParams();
  if (/^\d{4}-\d{2}-\d{2}$/.test(week)) u.set('week', week);
  if (['Tue', 'Wed', 'Sat'].includes(day)) u.set('day', day);
  for (const [k, v] of Object.entries(params)) u.set(k, v);
  const qs = u.toString();
  return qs ? `${BASE}?${qs}` : BASE;
}

export const POST: APIRoute = async ({ request, locals, redirect }) => {
  if (!isSameOriginPost(request, PORTAL_ORIGIN)) {
    return new Response('Forbidden', { status: 403 });
  }

  const auth = await requireAdmin(locals.supabase, locals.user);
  if (auth.response) return auth.response;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return redirect(plannerUrl('', '', { routable_error: 'invalid_input' }), 303);
  }

  const week = String(formData.get('week') ?? '');
  const day = String(formData.get('day') ?? '');

  const customerId = String(formData.get('customer_id') ?? '');
  if (!z.uuid().safeParse(customerId).success) {
    return redirect(plannerUrl(week, day, { routable_error: 'invalid_customer' }), 303);
  }

  const routableRaw = String(formData.get('routable') ?? '');
  if (routableRaw !== 'true' && routableRaw !== 'false') {
    return redirect(plannerUrl(week, day, { routable_error: 'invalid_value' }), 303);
  }
  const routable = routableRaw === 'true';

  // Confirm the target customer exists (clearer error than a silent no-op).
  const { data: cust, error: lookupErr } = await locals.supabase
    .from('customers')
    .select('id')
    .eq('id', customerId)
    .maybeSingle();
  if (lookupErr) {
    console.error('[api/admin/route/routable] lookup failed:', lookupErr.message);
    return redirect(plannerUrl(week, day, { routable_error: 'network' }), 303);
  }
  if (!cust) {
    return redirect(plannerUrl(week, day, { routable_error: 'not_found' }), 303);
  }

  const { error } = await locals.supabase
    .from('customers')
    .update({ routable })
    .eq('id', customerId);
  if (error) {
    console.error('[api/admin/route/routable] update failed:', error.message);
    return redirect(plannerUrl(week, day, { routable_error: 'network' }), 303);
  }

  return redirect(plannerUrl(week, day, { routable_ok: routable ? 'on' : 'off' }), 303);
};
