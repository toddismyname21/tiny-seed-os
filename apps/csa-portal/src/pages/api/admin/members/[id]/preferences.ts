/**
 * POST /api/admin/members/[id]/preferences
 *
 * Form body (multipart/form-data):
 *   - form           'preferences' | 'contact' — which subform was submitted
 *   - dislikes[]     repeating string (preferences form)
 *   - allergies[]    repeating string (preferences form)
 *   - delivery_notes string ≤500 chars (preferences form)
 *   - contact_preference 'email'|'sms'|'both'|'none' (preferences form)
 *   - newsletter_opt_in  'true' | (absent) (preferences form)
 *   - phone          string ≤30 chars (contact form — updates customers.phone)
 *
 * Two submodes share this endpoint:
 *   - form=preferences updates the member_preferences row
 *   - form=contact updates customers.phone (the customer row, looked up
 *     via the member's customer_id)
 *
 * Authorization via requireAdmin(). Writes go through the cookie-aware
 * RLS-scoped client (admin policies pass).
 *
 * On success: 303 → /admin/members/[id]?ok=preferences_updated
 * On failure: 303 → /admin/members/[id]?error=<code>
 */
import type { APIRoute } from 'astro';
import { z } from 'zod';
import { requireAdmin } from '../../../../../lib/admin';
import { isSameOriginPost, PORTAL_ORIGIN } from '../../../../../lib/onboarding';

export const prerender = false;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const Chip = z.string().trim().min(1).max(64);

const PreferencesSchema = z.object({
  dislikes: z.array(Chip).max(50),
  allergies: z.array(Chip).max(50),
  delivery_notes: z.string().max(500).nullable(),
  contact_preference: z.enum(['email', 'sms', 'both', 'none']),
  newsletter_opt_in: z.boolean(),
});

const PhoneSchema = z.object({
  phone: z.string().trim().max(30).nullable(),
});

function readChips(formData: FormData, name: string): string[] {
  const bracketed = formData.getAll(`${name}[]`).map(String);
  if (bracketed.length > 0) return bracketed;
  const fallback = String(formData.get(name) ?? '');
  if (!fallback.trim()) return [];
  return fallback.split(/[,\n]/).map((s) => s.trim()).filter(Boolean);
}

function dedupe(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    const key = v.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(v);
  }
  return out;
}

export const POST: APIRoute = async ({ request, locals, params, redirect }) => {
  if (!isSameOriginPost(request, PORTAL_ORIGIN)) {
    return new Response('Forbidden', { status: 403 });
  }

  const auth = await requireAdmin(locals.supabase, locals.user);
  if (auth.response) return auth.response;

  const memberId = params.id ?? '';
  if (!UUID_RE.test(memberId)) {
    return redirect('/admin/members?error=invalid_input', 303);
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return redirect(`/admin/members/${memberId}?error=invalid_input`, 303);
  }

  const formKind = String(formData.get('form') ?? 'preferences');

  // ─── Branch: contact ──────────────────────────────────────────────
  if (formKind === 'contact') {
    const rawPhone = String(formData.get('phone') ?? '').trim();
    const parsed = PhoneSchema.safeParse({ phone: rawPhone.length === 0 ? null : rawPhone });
    if (!parsed.success) {
      return redirect(`/admin/members/${memberId}?error=invalid_input`, 303);
    }

    // Look up customer_id via the member row.
    const { data: memberRow, error: memberErr } = await locals.supabase
      .from('members')
      .select('customer_id')
      .eq('id', memberId)
      .maybeSingle();
    if (memberErr || !memberRow) {
      return redirect(`/admin/members/${memberId}?error=member_not_found`, 303);
    }

    const { error: phoneErr } = await locals.supabase
      .from('customers')
      .update({ phone: parsed.data.phone, updated_at: new Date().toISOString() })
      .eq('id', memberRow.customer_id);
    if (phoneErr) {
      console.error('[api/admin/members/preferences] customer phone update failed:', phoneErr.message);
      return redirect(`/admin/members/${memberId}?error=invalid_input`, 303);
    }
    return redirect(`/admin/members/${memberId}?ok=preferences_updated`, 303);
  }

  // ─── Branch: preferences ──────────────────────────────────────────
  const dislikes = dedupe(readChips(formData, 'dislikes'));
  const allergies = dedupe(readChips(formData, 'allergies'));
  const deliveryNotes = String(formData.get('delivery_notes') ?? '').trim();
  const contactPref = String(formData.get('contact_preference') ?? '');
  const newsletter = formData.get('newsletter_opt_in') === 'true';

  const parsed = PreferencesSchema.safeParse({
    dislikes,
    allergies,
    delivery_notes: deliveryNotes.length === 0 ? null : deliveryNotes,
    contact_preference: contactPref,
    newsletter_opt_in: newsletter,
  });
  if (!parsed.success) {
    return redirect(`/admin/members/${memberId}?error=invalid_input`, 303);
  }

  const payload = {
    member_id: memberId,
    dislikes: parsed.data.dislikes,
    allergies: parsed.data.allergies,
    delivery_notes: parsed.data.delivery_notes,
    contact_preference: parsed.data.contact_preference,
    newsletter_opt_in: parsed.data.newsletter_opt_in,
    updated_at: new Date().toISOString(),
  };

  const { error } = await locals.supabase
    .from('member_preferences')
    .upsert(payload, { onConflict: 'member_id' });

  if (error) {
    console.error('[api/admin/members/preferences] upsert failed:', error.message);
    return redirect(`/admin/members/${memberId}?error=invalid_input`, 303);
  }

  return redirect(`/admin/members/${memberId}?ok=preferences_updated`, 303);
};
