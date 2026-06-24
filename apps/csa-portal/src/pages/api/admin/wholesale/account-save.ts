/**
 * POST /api/admin/wholesale/account-save   (admin only)
 *
 * Edit a single wholesale (chef) account's contact + delivery details from the
 * /admin/wholesale/accounts editor. The driver crate labels print the account's
 * PHONE, and most accounts had none on file — this is the screen that fills that
 * gap, plus name / contact / email / address / delivery day / min order / notes.
 *
 * Form fields (multipart/form-data):
 *   - id                 UUID (required)
 *   - restaurant_name    required, 1–160 chars
 *   - contact_name       optional
 *   - email              optional (validated if present)
 *   - phone              optional (free text; normalized for display elsewhere)
 *   - address            optional
 *   - delivery_day       optional (Mon/Tue/Wed/Thu/Fri/Sat/Sun or blank)
 *   - min_order_dollars  optional dollars >= 0 -> min_order_cents
 *   - status             active | inactive
 *   - delivery_hours     optional
 *   - delivery_instructions optional
 *   - notes              optional
 *
 * Auth: requireAdmin + isSameOriginPost. The write uses the service-role client
 * (admin-gated endpoint) because wholesale_accounts has no staff UPDATE policy.
 *
 * On success: 303 -> /admin/wholesale/accounts?ok=saved#a-<id>
 * On failure: 303 -> /admin/wholesale/accounts?error=<code>#a-<id>
 */
import type { APIRoute } from 'astro';
import { z } from 'zod';
import { requireAdmin } from '../../../../lib/admin';
import { isSameOriginPost, PORTAL_ORIGIN } from '../../../../lib/onboarding';
import { supabaseAdmin } from '../../../../lib/supabase';

export const prerender = false;

const BASE = '/admin/wholesale/accounts';
function back(key: 'ok' | 'error', val: string, anchor?: string): string {
  return `${BASE}?${key}=${val}${anchor ? `#${anchor}` : ''}`;
}
function strOrNull(v: FormDataEntryValue | null): string | null {
  if (v === null) return null;
  const s = String(v).trim();
  return s.length === 0 ? null : s;
}

const Body = z.object({
  id: z.string().uuid(),
  restaurant_name: z.string().trim().min(1).max(160),
  contact_name: z.string().trim().max(160).nullable(),
  email: z.string().trim().email().max(200).nullable(),
  phone: z.string().trim().max(40).nullable(),
  address: z.string().trim().max(300).nullable(),
  delivery_day: z.enum(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']).nullable(),
  // Lenient on purpose: accounts can be 'draft' (all are at launch), 'active',
  // 'inactive', etc. A strict enum here rejected every save (Todd 2026-06-24).
  status: z.string().trim().min(1).max(40),
  delivery_hours: z.string().trim().max(200).nullable(),
  delivery_instructions: z.string().trim().max(500).nullable(),
  notes: z.string().trim().max(1000).nullable(),
});

function parseDollarsToCents(v: FormDataEntryValue | null): number | null | 'invalid' {
  const s = strOrNull(v);
  if (s === null) return null;
  const n = Number(s.replace(/[$,]/g, ''));
  if (!Number.isFinite(n) || n < 0) return 'invalid';
  return Math.round(n * 100);
}

export const POST: APIRoute = async ({ request, locals, redirect }) => {
  if (!isSameOriginPost(request, PORTAL_ORIGIN)) return new Response('Forbidden', { status: 403 });
  const auth = await requireAdmin(locals.supabase, locals.user);
  if (auth.response) return auth.response;

  let form: FormData;
  try { form = await request.formData(); } catch { return redirect(back('error', 'invalid_input'), 303); }

  const id = strOrNull(form.get('id'));
  const minCents = parseDollarsToCents(form.get('min_order_dollars'));
  if (minCents === 'invalid') return redirect(back('error', 'bad_min_order', id ? `a-${id}` : undefined), 303);

  const parsed = Body.safeParse({
    id,
    restaurant_name: strOrNull(form.get('restaurant_name')),
    contact_name: strOrNull(form.get('contact_name')),
    email: strOrNull(form.get('email')),
    phone: strOrNull(form.get('phone')),
    address: strOrNull(form.get('address')),
    delivery_day: strOrNull(form.get('delivery_day')),
    status: strOrNull(form.get('status')) ?? 'draft',
    delivery_hours: strOrNull(form.get('delivery_hours')),
    delivery_instructions: strOrNull(form.get('delivery_instructions')),
    notes: strOrNull(form.get('notes')),
  });
  if (!parsed.success) {
    return redirect(back('error', 'invalid_input', id ? `a-${id}` : undefined), 303);
  }
  const d = parsed.data;

  const { error } = await supabaseAdmin
    .from('wholesale_accounts')
    .update({
      restaurant_name: d.restaurant_name,
      contact_name: d.contact_name,
      email: d.email,
      phone: d.phone,
      address: d.address,
      delivery_day: d.delivery_day,
      min_order_cents: minCents,
      status: d.status,
      delivery_hours: d.delivery_hours,
      delivery_instructions: d.delivery_instructions,
      notes: d.notes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', d.id);

  if (error) {
    console.error('[api/admin/wholesale/account-save] update failed:', error.message);
    return redirect(back('error', 'save_failed', `a-${d.id}`), 303);
  }
  return redirect(back('ok', 'saved', `a-${d.id}`), 303);
};
