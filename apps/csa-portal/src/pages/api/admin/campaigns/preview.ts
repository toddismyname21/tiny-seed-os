/**
 * POST /api/admin/campaigns/preview
 *
 * Renders the branded campaign shell around the supplied body_html and
 * returns the resulting HTML. Used by the /admin/campaigns/new composer
 * to populate an iframe preview without persisting the draft.
 *
 * Body:
 *   body_html      string (1..200000)
 *   subject        string (1..200)
 *   preview_text   string (1..200)
 *   first_name?    string — preview the {{first_name}} substitution
 *                  (default "there")
 *
 * Returns `text/html` (the rendered email), or a JSON error.
 *
 * Security: isSameOriginPost CSRF + requireAdmin. The handler does NOT
 * send anything; it's a pure render.
 */
import type { APIRoute } from 'astro';
import { z } from 'zod';
import { requireAdmin } from '../../../../lib/admin';
import { isSameOriginPost, PORTAL_ORIGIN } from '../../../../lib/onboarding';
import { renderCampaignHtml, fetchRenewalUrl } from '../../../../lib/campaign';
import { PORTAL_BASE_URL } from '../../../../lib/weekly-email';

export const prerender = false;

const PreviewSchema = z.object({
  body_html: z
    .string()
    .trim()
    .min(1, 'body_required')
    .max(200_000, 'body_too_long'),
  subject: z.string().trim().min(1, 'subject_required').max(200, 'subject_too_long'),
  preview_text: z
    .string()
    .trim()
    .min(1, 'preview_required')
    .max(200, 'preview_too_long'),
  first_name: z.string().trim().max(100).optional(),
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

async function parseBody(request: Request): Promise<Record<string, unknown> | null> {
  const ct = (request.headers.get('content-type') ?? '').toLowerCase();
  try {
    if (ct.includes('application/json')) {
      return (await request.json()) as Record<string, unknown>;
    }
    const fd = await request.formData();
    const out: Record<string, unknown> = {};
    for (const [k, v] of fd.entries()) out[k] = String(v);
    return out;
  } catch {
    return null;
  }
}

export const POST: APIRoute = async ({ request, locals }) => {
  if (!isSameOriginPost(request, PORTAL_ORIGIN)) {
    return json({ ok: false, error: 'forbidden' }, 403);
  }
  const auth = await requireAdmin(locals.supabase, locals.user);
  if (auth.response) return auth.response;

  const raw = await parseBody(request);
  if (!raw) return json({ ok: false, error: 'invalid_input' }, 400);
  const parsed = PreviewSchema.safeParse(raw);
  if (!parsed.success) {
    const code = parsed.error.issues[0]?.message ?? 'invalid_input';
    return json({ ok: false, error: code }, 400);
  }
  const { body_html, subject, preview_text, first_name } = parsed.data;

  // Live renewal_url so a preview of a renewal/win-back template shows the real
  // CTA link (not an empty {{renewal_url}}). Admin cookie client can read
  // portal_settings (authenticated SELECT policy, migration 0070).
  const renewalUrl = await fetchRenewalUrl(locals.supabase);

  // Preview links use the live portal base + a SHAPE (no real token —
  // we don't mint signed unsubscribe tokens for a preview render). The
  // iframe is sandboxed by the page anyway.
  const rendered = renderCampaignHtml(
    { body_html, subject, preview_text },
    {
      unsubscribeHref: `${PORTAL_BASE_URL}/unsubscribe`,
      preferencesHref: `${PORTAL_BASE_URL}/account/preferences`,
      recipient: {
        first_name: first_name || 'there',
        email: 'preview@example.com',
        renewal_url: renewalUrl,
      },
    }
  );

  return new Response(rendered.html, {
    status: 200,
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
};
