/**
 * POST /api/survey/flowers — public endpoint for the /survey/flowers flower
 * CSA season survey (Loren, approved 2026-09-24; email send held until Loren
 * releases it).
 *
 * Security posture mirrors /api/survey/submit (public form, lowest-sensitivity
 * table):
 *   - Service-role INSERT into flower_survey_responses ONLY — no reads, no
 *     other tables touched; worst case a bad actor adds noise rows.
 *   - Honeypot: hidden `website` field must be empty; bots that fill it get a
 *     silent success redirect.
 *   - All fields length-clamped and enum-checked server-side; interests
 *     whitelist-filtered to the approved option keys.
 *   - Same-origin form POST enforced.
 *
 * On success (or honeypot): 303 → /survey/flowers?thanks=1
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
const oneOf = <T extends string>(v: FormDataEntryValue | null, allowed: readonly T[]): T | null => {
  const s = String(v ?? '').trim() as T;
  return allowed.includes(s) ? s : null;
};

const INTEREST_KEYS = [
  'spring_csa',
  'dahlia_csa',
  'dried_csa',
  'pick_your_own',
  'arrangement_workshops',
  'wreath_workshops',
  'holiday_wreaths',
  'keep_same',
];

export const POST: APIRoute = async ({ request, redirect }) => {
  if (!isSameOriginPost(request, PORTAL_ORIGIN)) {
    return new Response('Forbidden', { status: 403 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return redirect('/survey/flowers', 303);
  }

  // Honeypot — pretend success so bots don't adapt.
  if (String(form.get('website') ?? '').trim().length > 0) {
    return redirect('/survey/flowers?thanks=1', 303);
  }

  const interests = form
    .getAll('interests')
    .map((v) => String(v).trim())
    .filter((v) => INTEREST_KEYS.includes(v));

  const row = {
    email: clamp(form.get('email'), 200),
    name: clamp(form.get('name'), 200),
    overall_rating: rating(form.get('overall_rating')),
    loved: clamp(form.get('loved'), 4000),
    change_request: clamp(form.get('change_request'), 4000),
    vase_life: oneOf(form.get('vase_life'), ['week_plus', 'four_five_days', 'few_days', 'varied'] as const),
    renew_2027: oneOf(form.get('renew_2027'), ['definitely', 'probably', 'not_sure', 'probably_not'] as const),
    interests,
    comments: clamp(form.get('comments'), 4000),
    source: 'flower_2026_email',
  };

  const { error } = await supabaseAdmin.from('flower_survey_responses').insert(row);
  if (error) {
    console.error('[api/survey/flowers] insert failed:', error.message);
    // Still thank the member — losing their goodwill over a DB hiccup is
    // worse than losing one row; the error is logged for follow-up.
  }
  return redirect('/survey/flowers?thanks=1', 303);
};
