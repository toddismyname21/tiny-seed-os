/**
 * POST /api/survey/submit — public endpoint for the /survey member feedback
 * form (Fall 2026 survey, Todd 2026-09-23).
 *
 * Security posture (public form, lowest-sensitivity table):
 *   - Service-role INSERT into member_survey_responses ONLY — no reads, no
 *     other tables touched, so the worst a bad actor can do is add noise rows.
 *   - Honeypot: the hidden `website` field must be empty; bots that fill it
 *     get a silent success redirect (they learn nothing).
 *   - All fields length-clamped and enum-checked server-side; ratings must be
 *     1..5 integers or they're stored null.
 *   - Same-origin form POST enforced (blocks cross-site drive-by spam).
 *
 * On success (or honeypot): 303 → /survey?thanks=1
 */
import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/supabase';
import { isSameOriginPost, PORTAL_ORIGIN } from '../../../lib/onboarding';

export const prerender = false;

const clamp = (v: FormDataEntryValue | null, max: number): string | null => {
  const s = String(v ?? '').trim().slice(0, max);
  return s.length ? s : null;
};
const rating = (v: FormDataEntryValue | null): number | null => {
  const n = Number(String(v ?? ''));
  return Number.isInteger(n) && n >= 1 && n <= 5 ? n : null;
};
const oneOf = (v: FormDataEntryValue | null, allowed: string[]): string | null => {
  const s = String(v ?? '').trim();
  return allowed.includes(s) ? s : null;
};

export const POST: APIRoute = async ({ request, redirect }) => {
  if (!isSameOriginPost(request, PORTAL_ORIGIN)) {
    return new Response('Forbidden', { status: 403 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return redirect('/survey', 303);
  }

  // Honeypot — pretend success so bots don't adapt.
  if (String(form.get('website') ?? '').trim().length > 0) {
    return redirect('/survey?thanks=1', 303);
  }

  const row = {
    email: clamp(form.get('email'), 200),
    name: clamp(form.get('name'), 200),
    overall_rating: rating(form.get('overall_rating')),
    working_well: clamp(form.get('working_well'), 4000),
    improve: clamp(form.get('improve'), 4000),
    delivery_rating: rating(form.get('delivery_rating')),
    used_tracker: oneOf(form.get('used_tracker'), ['yes', 'no', 'didnt_know']),
    gets_arrival_texts: oneOf(form.get('gets_arrival_texts'), ['always', 'sometimes', 'never', 'not_sure']),
    tools_helpful: clamp(form.get('tools_helpful'), 4000),
    comments: clamp(form.get('comments'), 4000),
    source: 'fall_2026_email',
  };

  const { error } = await supabaseAdmin.from('member_survey_responses').insert(row);
  if (error) {
    console.error('[api/survey/submit] insert failed:', error.message);
    // Still thank the member — losing their goodwill over a DB hiccup is
    // worse than losing one row; the error is logged for follow-up.
  }

  return redirect('/survey?thanks=1', 303);
};
