/**
 * POST /api/onboarding/contact
 *
 * Step 4 mutation. Updates:
 *   - member_preferences.contact_preference
 *   - member_preferences.newsletter_opt_in
 *   - member_preferences.preferred_swaps._onboarding.contact_done = true
 *     (so resolveOnboardingContext knows step 4 is complete)
 *   - customers.phone (if a phone was supplied; trimmed + light validation)
 *
 * All writes go through the user's RLS-scoped client. Policies:
 *   - prefs_self_all      (migration 0011) — user owns prefs row
 *   - customers_self_update (migration 0011) — user owns customer row
 *
 * On success: 303 → /onboarding/confirm.
 * On validation failure: 303 → /onboarding/contact?error=<code>.
 */
import type { APIRoute } from 'astro';
import { z } from 'zod';
import {
  resolveOnboardingContext,
  isSameOriginPost,
  withOnboardingFlag,
  PORTAL_ORIGIN,
} from '../../../lib/onboarding';

export const prerender = false;

/**
 * Phone validation: we accept anything between 7-15 digits once
 * non-digits are stripped (per E.164 + national-format tolerance —
 * North American numbers are 10 digits + optional country code).
 *
 * Stored format: original-as-typed (so we don't fight the user's
 * preferred format) but we do normalize whitespace.
 */
const PhoneSchema = z
  .string()
  .trim()
  .max(32)
  .nullable()
  .refine(
    (v) => {
      if (v === null || v === '') return true;
      const digits = v.replace(/\D/g, '');
      return digits.length >= 7 && digits.length <= 15;
    },
    { message: 'invalid_phone' }
  );

const FormSchema = z.object({
  phone: PhoneSchema,
  contact_preference: z.enum(['email', 'sms', 'both', 'none'], {
    message: 'invalid_preference',
  }),
  newsletter_opt_in: z.boolean(),
});

export const POST: APIRoute = async ({ request, redirect, locals }) => {
  if (!isSameOriginPost(request, PORTAL_ORIGIN)) {
    return new Response('Forbidden', { status: 403 });
  }

  const user = locals.user;
  if (!user || !user.email) {
    return redirect('/login', 303);
  }

  const ctx = await resolveOnboardingContext(locals.supabase, user.email);
  if (!ctx) {
    return redirect('/dashboard', 303);
  }

  // Caller must have completed step 3 first.
  if (!ctx.preferencesDone) {
    return redirect('/onboarding/preferences', 303);
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch (e) {
    console.error('[api/onboarding/contact] formData parse failed', e);
    return redirect('/onboarding/contact?error=invalid_input', 303);
  }

  const rawPhone = String(formData.get('phone') ?? '').trim();
  const rawPreference = String(formData.get('contact_preference') ?? '');
  // Checkbox: present + value="true" → opted in. Missing → opted out.
  const rawNewsletter = formData.get('newsletter_opt_in') === 'true';

  const parsed = FormSchema.safeParse({
    phone: rawPhone === '' ? null : rawPhone,
    contact_preference: rawPreference,
    newsletter_opt_in: rawNewsletter,
  });

  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const code =
      issue?.message === 'invalid_phone'
        ? 'invalid_phone'
        : issue?.message === 'invalid_preference'
        ? 'invalid_preference'
        : 'invalid_input';
    console.warn('[api/onboarding/contact] validation failed:', issue);
    return redirect(`/onboarding/contact?error=${code}`, 303);
  }

  // ── Update member_preferences ────────────────────────────────────
  // We need to preserve any existing values on the row (dislikes,
  // allergies, delivery_notes, preferred_swaps from prior writes) and
  // add our new fields + the contact_done flag.
  const updatedSwaps = withOnboardingFlag(
    ctx.prefs?.preferred_swaps,
    'contact_done',
    true
  );

  const { error: prefsErr } = await locals.supabase
    .from('member_preferences')
    .update({
      contact_preference: parsed.data.contact_preference,
      newsletter_opt_in: parsed.data.newsletter_opt_in,
      preferred_swaps: updatedSwaps,
      updated_at: new Date().toISOString(),
    })
    .eq('member_id', ctx.member.id);

  if (prefsErr) {
    console.error('[api/onboarding/contact] prefs update failed:', prefsErr.message);
    return redirect('/onboarding/contact?error=invalid_input', 303);
  }

  // ── Update customer.phone (only if user supplied one) ────────────
  // We do not blank out an existing phone if the user submits empty —
  // that's a destructive change for an opt-in field. Make them clear it
  // explicitly via the dashboard later.
  if (parsed.data.phone) {
    const { error: custErr } = await locals.supabase
      .from('customers')
      .update({ phone: parsed.data.phone })
      .eq('id', ctx.customer.id);

    if (custErr) {
      // Phone is optional — log but don't fail the flow over it.
      console.error('[api/onboarding/contact] phone update failed:', custErr.message);
    }
  }

  return redirect('/onboarding/confirm', 303);
};
