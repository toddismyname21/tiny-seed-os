/**
 * POST /api/waitlist/join
 *
 * PUBLIC waitlist submission (NO login). PHASE 2 · WAVE 1 (gap 4 / proposal
 * 2.2). Same trust model as the onboarding endpoints: there is NO anon RLS
 * INSERT path — the row is written by the SERVICE-ROLE client AFTER validation.
 *
 * Defenses (in order):
 *   1. isSameOriginPost() — CSRF (belt + suspenders to Astro's built-in).
 *   2. Honeypot — a hidden `website` field; a non-empty value is a bot, so we
 *      short-circuit to the friendly success state WITHOUT writing (never tip
 *      off the bot that it was caught).
 *   3. zod — name + email required + length caps; the rest optional + trimmed.
 *   4. UPSERT by email (waitlist_signups_email_uniq) — a repeat signup refreshes
 *      the row's details but PRESERVES its admin-set status (status is omitted
 *      from the payload, so ON CONFLICT only updates the provided columns).
 *
 * Redirects (303, PRG pattern) back to /waitlist:
 *   ?status=joined  → success (also the honeypot decoy path)
 *   ?status=invalid → zod validation failed
 *   ?status=error   → DB write failed
 */
import type { APIRoute } from 'astro';
import { z } from 'zod';
import { isSameOriginPost, PORTAL_ORIGIN } from '../../../lib/onboarding';
import { supabaseAdmin } from '../../../lib/supabase';

export const prerender = false;

const REDIRECT = '/waitlist';

// Trim + cap every field; name + email are required.
const JoinSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.email().max(200),
  phone: z.string().trim().max(40).optional(),
  share_interest: z.string().trim().max(100).optional(),
  pickup_preference: z.string().trim().max(200).optional(),
  notes: z.string().trim().max(1000).optional(),
});

/** Empty string → undefined, so optional fields don't store blanks. */
function clean(v: FormDataEntryValue | null): string | undefined {
  if (v == null) return undefined;
  const s = String(v).trim();
  return s.length > 0 ? s : undefined;
}

export const POST: APIRoute = async ({ request, redirect }) => {
  if (!isSameOriginPost(request, PORTAL_ORIGIN)) {
    return new Response('Forbidden', { status: 403 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return redirect(`${REDIRECT}?status=invalid`, 303);
  }

  // Honeypot: a real human never fills the off-screen `website` field. Treat a
  // filled honeypot as a success (decoy) with no DB write.
  if (clean(formData.get('website'))) {
    return redirect(`${REDIRECT}?status=joined`, 303);
  }

  const parsed = JoinSchema.safeParse({
    name: clean(formData.get('name')),
    email: clean(formData.get('email')),
    phone: clean(formData.get('phone')),
    share_interest: clean(formData.get('share_interest')),
    pickup_preference: clean(formData.get('pickup_preference')),
    notes: clean(formData.get('notes')),
  });

  if (!parsed.success) {
    return redirect(`${REDIRECT}?status=invalid`, 303);
  }

  const data = parsed.data;
  const email = data.email.toLowerCase();

  // UPSERT by email. status is intentionally omitted → new rows default to
  // 'new'; an existing row keeps whatever status the admin set (only the
  // provided columns land in the ON CONFLICT SET clause).
  const { error } = await supabaseAdmin.from('waitlist_signups').upsert(
    {
      name: data.name,
      email,
      phone: data.phone ?? null,
      share_interest: data.share_interest ?? null,
      pickup_preference: data.pickup_preference ?? null,
      notes: data.notes ?? null,
    },
    { onConflict: 'email' },
  );

  if (error) {
    console.error('[api/waitlist/join] upsert failed:', error.message);
    return redirect(`${REDIRECT}?status=error`, 303);
  }

  return redirect(`${REDIRECT}?status=joined`, 303);
};
