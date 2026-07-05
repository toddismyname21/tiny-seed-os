/**
 * POST /api/admin/campaigns/send-test
 *
 * Send ONE [TEST] copy of a campaign to a specified address.
 *
 * Body (JSON or form):
 *   campaign_id   UUID of an existing campaign (its current body is sent)
 *   to_email      target address. Defaults to the admin's own email.
 *
 * Response: { ok, recipient, resend_email_id?, error? }
 *
 * Security: isSameOriginPost CSRF + requireAdmin. Service-role client
 * is used to load the campaign (so a campaign in any status can be
 * test-sent — including drafts). NOTHING is written to
 * campaign_recipients or notification_log: a test send is invisible to
 * the per-recipient ledger.
 */
import type { APIRoute } from 'astro';
import { z } from 'zod';
import { requireAdmin } from '../../../../lib/admin';
import { isSameOriginPost, PORTAL_ORIGIN } from '../../../../lib/onboarding';
import { supabaseAdmin } from '../../../../lib/supabase';
import { sendTestEmail, fetchRenewalUrl, type Campaign } from '../../../../lib/campaign';
import {
  RESEND_API_KEY,
  RESEND_FROM_EMAIL,
  UNSUBSCRIBE_SECRET,
} from 'astro:env/server';

export const prerender = false;

const Schema = z.object({
  campaign_id: z.string().uuid('invalid_campaign_id'),
  to_email: z.string().trim().email('invalid_email').optional(),
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

  if (!RESEND_API_KEY || !RESEND_FROM_EMAIL) {
    return json({ ok: false, error: 'email_not_configured' }, 500);
  }
  if (!UNSUBSCRIBE_SECRET) {
    return json({ ok: false, error: 'unsubscribe_not_configured' }, 400);
  }

  const raw = await parseBody(request);
  if (!raw) return json({ ok: false, error: 'invalid_input' }, 400);
  const parsed = Schema.safeParse(raw);
  if (!parsed.success) {
    return json({ ok: false, error: parsed.error.issues[0]?.message ?? 'invalid_input' }, 400);
  }
  const { campaign_id, to_email } = parsed.data;

  const adminEmail = auth.ctx.user.email ?? '';
  const target = (to_email ?? adminEmail ?? '').trim();
  if (!target) {
    return json({ ok: false, error: 'no_to_email' }, 400);
  }

  // Service-role read so we can fetch a draft, not just admin-policy
  // visible rows. (The page already calls requireAdmin above; this is
  // defense-in-depth + symmetric with the actual send.)
  const { data: campaign, error } = await supabaseAdmin
    .from('campaigns')
    .select('id, name, subject, preview_text, body_html')
    .eq('id', campaign_id)
    .maybeSingle()
    .overrideTypes<
      Pick<Campaign, 'id' | 'name' | 'subject' | 'preview_text' | 'body_html'>,
      { merge: false }
    >();
  if (error) {
    console.error('[api/admin/campaigns/send-test] load failed:', error.message);
    return json({ ok: false, error: 'load_failed' }, 500);
  }
  if (!campaign) {
    return json({ ok: false, error: 'campaign_not_found' }, 404);
  }

  // Live renewal_url so a test of a renewal/win-back template shows the real CTA.
  const renewalUrl = await fetchRenewalUrl(supabaseAdmin);

  const result = await sendTestEmail({
    apiKey: RESEND_API_KEY,
    from: RESEND_FROM_EMAIL,
    unsubscribeSecret: UNSUBSCRIBE_SECRET,
    toEmail: target,
    renewalUrl,
    campaign: {
      name: campaign.name ?? '',
      subject: campaign.subject,
      preview_text: campaign.preview_text,
      body_html: campaign.body_html,
    },
  });

  if (!result.ok) {
    console.error(
      `[api/admin/campaigns/send-test] resend failed (HTTP ${result.status}): ${result.error}`
    );
    return json(
      { ok: false, error: 'send_failed', detail: result.error, status: result.status },
      502
    );
  }

  return json({
    ok: true,
    recipient: target,
    resend_email_id: result.resendId ?? null,
    message: `Test sent to ${target}`,
  });
};
