/**
 * POST /api/onboarding/preferences
 *
 * Step 3 mutation: persists dislikes, allergies, delivery_notes to
 * `member_preferences`. UPSERT keyed by member_id.
 *
 * Auth: enforced by middleware (only an authenticated onboarding-status
 *       member can reach this).
 * RLS:  the upsert is run as the user via cookie-aware client. RLS
 *       policy `prefs_self_all` (migration 0011) restricts the row
 *       to members owned by the user's customer_id.
 *
 * Validation:
 *   - dislikes / allergies: array of trimmed strings, each ≤ 64 chars,
 *     deduped (case-insensitive), capped at 50 items.
 *   - delivery_notes: optional, ≤ 500 chars.
 *
 * On success: 303 → /onboarding/contact.
 * On validation failure: 303 → /onboarding/preferences?error=<code>.
 *
 * The form submits with name="dislikes[]" / "allergies[]" — we read
 * via `formData.getAll('dislikes[]')`. We also accept the `dislikes`
 * (no brackets) name as a comma-separated string for the no-JS path.
 */
import type { APIRoute } from 'astro';
import { z } from 'zod';
import {
  resolveOnboardingContext,
  isSameOriginPost,
  PORTAL_ORIGIN,
} from '../../../lib/onboarding';

export const prerender = false;

const ChipSchema = z
  .string()
  .trim()
  .min(1)
  .max(64, 'Each item must be 64 characters or fewer.');

const FormSchema = z.object({
  dislikes: z.array(ChipSchema).max(50, 'too_many_dislikes'),
  allergies: z.array(ChipSchema).max(50, 'too_many_dislikes'),
  delivery_notes: z.string().max(500, 'notes_too_long').nullable(),
});

/**
 * Read a "chips" field from FormData.
 *
 * Supports two shapes:
 *   - bracketed JS-enabled form: `dislikes[]=cilantro&dislikes[]=eggplant`
 *   - no-JS fallback: `dislikes=cilantro,eggplant,beets`
 */
function readChips(formData: FormData, name: string): string[] {
  const bracketed = formData.getAll(`${name}[]`).map(String);
  if (bracketed.length > 0) return bracketed;
  const fallback = String(formData.get(name) ?? '');
  if (!fallback.trim()) return [];
  return fallback.split(/[,\n]/).map((s) => s.trim()).filter(Boolean);
}

/** Case-insensitive dedupe preserving first-seen casing. */
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
  // Hard CSRF: same-origin Origin header (Astro 6 also enforces this
  // for form POSTs by default, but we double-check inside the handler
  // since we'd rather fail closed if config drifts).
  if (!isSameOriginPost(request, PORTAL_ORIGIN)) {
    return new Response('Forbidden', { status: 403 });
  }

  const user = locals.user;
  if (!user || !user.email) {
    return redirect('/login', 303);
  }

  const ctx = await resolveOnboardingContext(locals.supabase, user.email);
  if (!ctx) {
    // Not in onboarding any more — bounce to dashboard.
    return redirect('/dashboard', 303);
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch (e) {
    console.error('[api/onboarding/preferences] formData parse failed', e);
    return redirect('/onboarding/preferences?error=invalid_input', 303);
  }

  const rawDislikes = dedupe(readChips(formData, 'dislikes'));
  const rawAllergies = dedupe(readChips(formData, 'allergies'));
  const rawNotes = String(formData.get('delivery_notes') ?? '').trim();

  const parsed = FormSchema.safeParse({
    dislikes: rawDislikes,
    allergies: rawAllergies,
    delivery_notes: rawNotes.length === 0 ? null : rawNotes,
  });

  if (!parsed.success) {
    // Map zod's first error to one of our redirect codes.
    const issue = parsed.error.issues[0];
    const code =
      issue?.message === 'too_many_dislikes'
        ? 'too_many_dislikes'
        : issue?.message === 'notes_too_long'
        ? 'notes_too_long'
        : 'invalid_input';
    console.warn('[api/onboarding/preferences] validation failed:', issue);
    return redirect(`/onboarding/preferences?error=${code}`, 303);
  }

  // Build the upsert payload. `preferred_swaps` we leave alone — if a
  // row already exists, the upsert below will preserve its existing
  // value because we don't overwrite that column. Onboarding flags
  // are preserved because we only write these specific columns.
  const payload = {
    member_id: ctx.member.id,
    dislikes: parsed.data.dislikes,
    allergies: parsed.data.allergies,
    delivery_notes: parsed.data.delivery_notes,
    updated_at: new Date().toISOString(),
  };

  const { error } = await locals.supabase
    .from('member_preferences')
    .upsert(payload, { onConflict: 'member_id' });

  if (error) {
    console.error('[api/onboarding/preferences] upsert failed:', error.message);
    return redirect('/onboarding/preferences?error=invalid_input', 303);
  }

  return redirect('/onboarding/contact', 303);
};
