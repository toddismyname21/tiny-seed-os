/**
 * POST /api/feedback/submit
 *
 * PUBLIC post-pickup micro-survey write (NO login). PHASE 2 · WAVE 1 (gap 6 /
 * proposal 2.3). The HMAC token IS the access — it's verified server-side,
 * exactly like the one-click unsubscribe. There is NO anon RLS INSERT path; the
 * row is written by the SERVICE-ROLE client after the token verifies.
 *
 * Body (application/json):
 *   { token: string, rating: 1|2|3|4, comment?: string }
 *
 * The page POSTs TWICE against the same token+week+customer: first on the tap
 * (rating only), then again if the member adds a comment. Both UPSERT on
 * box_feedback (week_date, customer_id), so the second call updates the same
 * row (idempotent, latest-wins).
 *
 * Responses (JSON):
 *   200 { ok: true }
 *   400 { ok: false, error: 'invalid_token' | 'invalid_input' }
 *   500 { ok: false, error: 'not_configured' | 'save_failed' }
 *
 * Defenses: isSameOriginPost() CSRF (the /feedback/<token> page fetches this
 * same-origin) + HMAC token verification. The token secret is FEEDBACK_SECRET,
 * falling back to UNSUBSCRIBE_SECRET so the survey works before a distinct
 * secret is provisioned (matches lib/feedback.ts).
 */
import type { APIRoute } from 'astro';
import { z } from 'zod';
import { isSameOriginPost, PORTAL_ORIGIN } from '../../../lib/onboarding';
import { supabaseAdmin } from '../../../lib/supabase';
import { verifyFeedbackToken } from '../../../lib/feedback';
import { FEEDBACK_SECRET, UNSUBSCRIBE_SECRET } from 'astro:env/server';

export const prerender = false;

const BodySchema = z.object({
  token: z.string().min(1),
  rating: z.number().int().min(1).max(4),
  comment: z.string().max(2000).optional(),
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

export const POST: APIRoute = async ({ request }) => {
  if (!isSameOriginPost(request, PORTAL_ORIGIN)) {
    return json({ ok: false, error: 'forbidden' }, 403);
  }

  const secret = FEEDBACK_SECRET || UNSUBSCRIBE_SECRET;
  if (!secret) {
    console.error('[api/feedback/submit] no FEEDBACK_SECRET / UNSUBSCRIBE_SECRET configured');
    return json({ ok: false, error: 'not_configured' }, 500);
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return json({ ok: false, error: 'invalid_input' }, 400);
  }

  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return json({ ok: false, error: 'invalid_input' }, 400);
  }
  const { token, rating } = parsed.data;
  const comment = parsed.data.comment?.trim() || null;

  const verified = verifyFeedbackToken(token, secret);
  if (!verified) {
    return json({ ok: false, error: 'invalid_token' }, 400);
  }
  const { customerId, weekDate } = verified;

  // Resolve the member email for display/search (service-role read).
  const { data: cust, error: custErr } = await supabaseAdmin
    .from('customers')
    .select('email')
    .eq('id', customerId)
    .maybeSingle();
  if (custErr) {
    console.error('[api/feedback/submit] customer lookup failed:', custErr.message);
  }

  const { error } = await supabaseAdmin.from('box_feedback').upsert(
    {
      week_date: weekDate,
      customer_id: customerId,
      member_email: cust?.email ?? null,
      rating,
      comment,
      token,
    },
    { onConflict: 'week_date,customer_id' },
  );

  if (error) {
    console.error('[api/feedback/submit] upsert failed:', error.message);
    return json({ ok: false, error: 'save_failed' }, 500);
  }

  return json({ ok: true });
};
