/**
 * POST /api/account/preferences
 *
 * Body (multipart/form-data):
 *   - member_id           UUID — which member's prefs to update
 *   - dislikes[]          Array of strings (chips form)
 *   - allergies[]         Array of strings (chips form)
 *   - delivery_notes      String, ≤ 500 chars
 *   - contact_preference  'email' | 'sms' | 'both' | 'none'
 *   - newsletter_opt_in   'true' | (absent → false)
 *
 * On success: 303 → /account/preferences?ok=saved
 * On failure: 303 → /account/preferences?error=<code>
 *
 * The upsert is keyed by member_id and runs through the cookie-aware
 * RLS-scoped client. RLS policy `prefs_self_all` (migration 0011)
 * restricts the row to members owned by the user's customer.
 *
 * Mirrors the validation rules of /api/onboarding/preferences but
 * also handles contact_preference + newsletter (which are owned by the
 * onboarding /api/onboarding/contact route during onboarding).
 */
import type { APIRoute } from 'astro';
import { z } from 'zod';
import { isSameOriginPost, PORTAL_ORIGIN } from '../../../lib/onboarding';

export const prerender = false;

const ChipSchema = z.string().trim().min(1).max(64, 'invalid_input');

const FormSchema = z.object({
  member_id: z.uuid('invalid_input'),
  dislikes: z.array(ChipSchema).max(50, 'too_many_dislikes'),
  allergies: z.array(ChipSchema).max(50, 'too_many_dislikes'),
  delivery_notes: z.string().max(500, 'notes_too_long').nullable(),
  contact_preference: z.enum(['email', 'sms', 'both', 'none'], {
    message: 'invalid_preference',
  }),
  newsletter_opt_in: z.boolean(),
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

export const POST: APIRoute = async ({ request, redirect, locals }) => {
  if (!isSameOriginPost(request, PORTAL_ORIGIN)) {
    return new Response('Forbidden', { status: 403 });
  }

  const user = locals.user;
  if (!user || !user.email) {
    return redirect('/login', 303);
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch (e) {
    console.error('[api/account/preferences] formData parse failed', e);
    return redirect('/account/preferences?error=invalid_input', 303);
  }

  const memberId = String(formData.get('member_id') ?? '');
  const rawDislikes = dedupe(readChips(formData, 'dislikes'));
  const rawAllergies = dedupe(readChips(formData, 'allergies'));
  const rawNotes = String(formData.get('delivery_notes') ?? '').trim();
  const rawPreference = String(formData.get('contact_preference') ?? '');
  const rawNewsletter = formData.get('newsletter_opt_in') === 'true';

  const parsed = FormSchema.safeParse({
    member_id: memberId,
    dislikes: rawDislikes,
    allergies: rawAllergies,
    delivery_notes: rawNotes.length === 0 ? null : rawNotes,
    contact_preference: rawPreference,
    newsletter_opt_in: rawNewsletter,
  });

  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const code =
      issue?.message === 'too_many_dislikes' ? 'too_many_dislikes' :
      issue?.message === 'notes_too_long' ? 'notes_too_long' :
      issue?.message === 'invalid_preference' ? 'invalid_preference' :
      'invalid_input';
    return redirect(`/account/preferences?error=${code}`, 303);
  }

  // ─── Authorization: confirm caller owns this member ───────────────
  type MemberRow = { id: string };
  const { data: memberData, error: memberErr } = await locals.supabase
    .from('members')
    .select('id')
    .eq('id', parsed.data.member_id)
    .maybeSingle()
    .overrideTypes<MemberRow, { merge: false }>();

  if (memberErr) {
    console.error('[api/account/preferences] member lookup failed:', memberErr.message);
    return redirect('/account/preferences?error=invalid_input', 303);
  }
  if (!memberData) {
    return redirect('/account/preferences?error=invalid_input', 303);
  }

  // ─── Upsert ───────────────────────────────────────────────────────
  // We don't touch `preferred_swaps` — the onboarding flow uses it for
  // a transient flag. Once a member is 'active', the column is unused
  // and we just leave whatever's there.
  const payload = {
    member_id: parsed.data.member_id,
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
    console.error('[api/account/preferences] upsert failed:', error.message);
    return redirect('/account/preferences?error=invalid_input', 303);
  }

  return redirect('/account/preferences?ok=saved', 303);
};
