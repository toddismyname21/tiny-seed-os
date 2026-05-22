/**
 * POST /api/account/profile
 *
 * Self-service profile editing for a CSA member. Updates the caller's OWN
 * row in `customers` — name + contact + mailing address. Email is NOT
 * editable here: it's the auth identity and changing it needs a
 * re-verification flow (out of scope). The form renders email read-only.
 *
 * Body (application/x-www-form-urlencoded / multipart):
 *   - contact_name   String, 1–120 chars (required)
 *   - phone          String, ≤ 20 chars after stripping (optional)
 *   - address        String, ≤ 200 chars (optional)
 *   - city           String, ≤ 200 chars (optional)
 *   - state          String, ≤ 200 chars (optional)
 *   - zip            String, ≤ 200 chars (optional)
 *
 * On success: 303 → /account/profile?ok=saved
 * On failure: 303 → /account/profile?error=<code>
 *
 * The update runs through the cookie-aware RLS-scoped client and is
 * filtered by `email = user.email`, which matches the RLS predicate of
 * policy `customers_self_update` (migration 0011) exactly — a member can
 * only ever touch their own customer row, and the policy's WITH CHECK
 * blocks any email change.
 *
 * Mirrors the CSRF + auth + Zod + redirect contract of
 * /api/account/preferences. Reuses isSameOriginPost / PORTAL_ORIGIN.
 */
import type { APIRoute } from 'astro';
import { z } from 'zod';
import { isSameOriginPost, PORTAL_ORIGIN } from '../../../lib/onboarding';

export const prerender = false;

/**
 * Optional free-text field: trims, treats empty as null, caps at 200.
 * `.transform` runs before validation so the length check sees the
 * trimmed value.
 */
const OptionalText = z
  .string()
  .trim()
  .max(200, 'invalid_input')
  .transform((s) => (s.length === 0 ? null : s))
  .nullable();

const FormSchema = z.object({
  // Name is required — it's used in greetings, the box label, and on the
  // pack list. Cap at 120 to match a sane DB/UI bound.
  contact_name: z
    .string()
    .trim()
    .min(1, 'name_required')
    .max(120, 'name_too_long'),
  // Phone: optional, nullable. We validate the LENGTH of the stripped
  // digits/separators (so a formatted "(412) 555-1212" fits under 20)
  // but persist the user's trimmed original. Empty → null.
  phone: z
    .string()
    .trim()
    .nullable()
    .refine(
      (s) => s == null || s.replace(/[\s().+-]/g, '').length <= 20,
      'phone_too_long'
    )
    .transform((s) => (s == null || s.length === 0 ? null : s)),
  address: OptionalText,
  city: OptionalText,
  state: OptionalText,
  zip: OptionalText,
});

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
    console.error('[api/account/profile] formData parse failed', e);
    return redirect('/account/profile?error=invalid_input', 303);
  }

  // Raw reads. The schema trims, validates, and nulls-out empties.
  const parsed = FormSchema.safeParse({
    contact_name: String(formData.get('contact_name') ?? ''),
    phone: String(formData.get('phone') ?? ''),
    address: String(formData.get('address') ?? ''),
    city: String(formData.get('city') ?? ''),
    state: String(formData.get('state') ?? ''),
    zip: String(formData.get('zip') ?? ''),
  });

  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const code =
      issue?.message === 'name_required' ? 'name_required' :
      issue?.message === 'name_too_long' ? 'name_too_long' :
      issue?.message === 'phone_too_long' ? 'phone_too_long' :
      'invalid_input';
    return redirect(`/account/profile?error=${code}`, 303);
  }

  const payload = {
    contact_name: parsed.data.contact_name,
    phone: parsed.data.phone,
    address: parsed.data.address,
    city: parsed.data.city,
    state: parsed.data.state,
    zip: parsed.data.zip,
    updated_at: new Date().toISOString(),
  };

  // RLS-scoped update. Filtering by `email` matches the
  // customers_self_update predicate, so this can only ever touch the
  // caller's own row. We do NOT write `email` — it stays the auth identity.
  const { error } = await locals.supabase
    .from('customers')
    .update(payload)
    .eq('email', user.email);

  if (error) {
    console.error('[api/account/profile] update failed:', error.message);
    return redirect('/account/profile?error=invalid_input', 303);
  }

  return redirect('/account/profile?ok=saved', 303);
};
