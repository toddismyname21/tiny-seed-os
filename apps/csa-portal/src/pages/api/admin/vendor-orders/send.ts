/**
 * POST /api/admin/vendor-orders/send
 *
 * Admin save-draft or send for a vendor's per-cycle order.
 *
 * Form fields:
 *   - action          'save_draft' | 'send'
 *   - vendor_id       UUID
 *   - week_starting   YYYY-MM-DD (Monday)
 *   - subject         email subject line
 *   - body            email body (plain text)
 *   - override_<vendor_id>_<type>  optional numeric overrides per add-on type
 *
 * Behavior:
 *   - save_draft: UPSERT vendor_orders with computed totals + override_qty
 *     + email_subject + email_body. NO email sent.
 *   - send: same UPSERT + Resend → vendor.contact_email. sets sent_at.
 *
 * Auth: requireAdmin via the cookie-aware RLS client.
 * CSRF: isSameOriginPost guard.
 *
 * On success: 303 → /admin/vendor-orders/<week>?ok=<action>
 * On failure: 303 → /admin/vendor-orders/<week>?error=<code>
 */
import type { APIRoute } from 'astro';
import { isSameOriginPost, PORTAL_ORIGIN } from '../../../../lib/onboarding';
import { requireAdmin } from '../../../../lib/admin';
import { resolveCycle, type AddOnType } from '../../../../lib/cycle';
import { RESEND_API_KEY, RESEND_FROM_EMAIL } from 'astro:env/server';

export const prerender = false;

function fail(redirect: (u: string, s: 303) => Response, week: string, code: string): Response {
  return redirect(`/admin/vendor-orders/${week}?error=${code}`, 303);
}

export const POST: APIRoute = async ({ request, redirect, locals }) => {
  if (!isSameOriginPost(request, PORTAL_ORIGIN)) {
    return new Response('Forbidden', { status: 403 });
  }
  const { ctx, response } = await requireAdmin(locals.supabase, locals.user);
  if (response) return response;

  let form: FormData;
  try { form = await request.formData(); } catch {
    return new Response(JSON.stringify({ ok: false, error: 'bad_form' }), {
      status: 400, headers: { 'content-type': 'application/json' },
    });
  }

  const action = String(form.get('action') ?? '');
  const vendorId = String(form.get('vendor_id') ?? '');
  const week = String(form.get('week_starting') ?? '');
  const subject = String(form.get('subject') ?? '').trim();
  const body = String(form.get('body') ?? '').trim();

  if (!['save_draft', 'send'].includes(action) ||
      !/^[0-9a-f-]{36}$/i.test(vendorId) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(week) ||
      subject.length === 0 || body.length === 0) {
    return fail(redirect, week || 'invalid', 'invalid_input');
  }

  // Fetch the vendor first to know which add_on_types to compute totals for.
  const { data: vendor, error: vErr } = await locals.supabase
    .from('vendors')
    .select('id, name, contact_email, add_on_types')
    .eq('id', vendorId)
    .maybeSingle();
  if (vErr || !vendor) {
    return fail(redirect, week, 'vendor_not_found');
  }

  // Resolve the cycle to recompute the auto totals (so the saved record
  // reflects the live data at the time of action, not whatever stale
  // value might have been on the form).
  const cycle = await resolveCycle(locals.supabase, week);
  const totals: Record<string, number> = {};
  const overrides: Record<string, number> = {};
  for (const t of (vendor.add_on_types ?? [])) {
    const bucket = cycle.addOnTotals[t as AddOnType] ?? { total: 0 };
    totals[t] = bucket.total;
    const ovRaw = form.get(`override_${vendorId}_${t}`);
    if (ovRaw !== null && String(ovRaw).trim() !== '') {
      const n = Number(ovRaw);
      if (Number.isFinite(n) && n >= 0) overrides[t] = n;
    }
  }

  // UPSERT vendor_orders for (cycle, week, vendor). Use the unique
  // constraint for ON CONFLICT.
  type Patch = {
    cycle_code: 'WEEKLY';
    week_starting: string;
    vendor_id: string;
    totals: Record<string, number>;
    email_subject: string;
    email_body: string;
    override_qty: Record<string, number> | null;
    sent_at?: string | null;
    sent_to?: string | null;
  };
  const patch: Patch = {
    cycle_code: 'WEEKLY',
    week_starting: week,
    vendor_id: vendorId,
    totals,
    email_subject: subject,
    email_body: body,
    override_qty: Object.keys(overrides).length > 0 ? overrides : null,
  };
  if (action === 'send') {
    patch.sent_at = new Date().toISOString();
    patch.sent_to = vendor.contact_email;
  }

  const { error: upErr } = await locals.supabase
    .from('vendor_orders')
    .upsert(patch as never, { onConflict: 'cycle_code,week_starting,vendor_id' });
  if (upErr) {
    console.error('[vendor-orders/send] upsert failed:', upErr.message);
    return fail(redirect, week, 'db_save_failed');
  }

  if (action === 'save_draft') {
    return redirect(`/admin/vendor-orders/${week}?ok=draft_saved`, 303);
  }

  // ─── Actually send ──────────────────────────────────────────────
  if (!RESEND_API_KEY || !RESEND_FROM_EMAIL) {
    console.error('[vendor-orders/send] Resend not configured');
    return fail(redirect, week, 'email_not_configured');
  }
  try {
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: RESEND_FROM_EMAIL,
        to: [vendor.contact_email],
        reply_to: ctx.user.email,
        subject,
        text: body,
      }),
    });
    if (!resp.ok) {
      const detail = await resp.text().catch(() => '');
      console.error(`[vendor-orders/send] Resend HTTP ${resp.status}: ${detail.slice(0, 300)}`);
      // Don't rollback the sent_at — the admin sees "sent" but the email
      // didn't go. We surface this as an error redirect so admin retries.
      return fail(redirect, week, 'email_send_failed');
    }
  } catch (e) {
    console.error('[vendor-orders/send] Resend threw:', e);
    return fail(redirect, week, 'email_send_failed');
  }

  return redirect(`/admin/vendor-orders/${week}?ok=sent`, 303);
};
