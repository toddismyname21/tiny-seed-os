/**
 * POST /api/admin/campaigns/webhook (STUB — Phase 2)
 *
 * Placeholder for Resend's delivery/open/click/bounce webhook. The full
 * implementation will:
 *
 *   1. Verify Resend's webhook signature header
 *   2. Parse the `type` field (email.delivered, email.opened, etc.)
 *   3. Update campaign_recipients (status + last_event_at) keyed on
 *      resend_email_id
 *   4. Update the aggregate counter on campaigns
 *      (total_delivered, total_opened, total_clicked, total_bounced,
 *       total_complained)
 *
 * For tonight's launch this endpoint accepts a POST and returns 200
 * (acknowledging Resend's delivery attempts without doing anything).
 * The delivery/open/click counts on /admin/campaigns/[id] remain at
 * their initial values until Phase 2 ships.
 *
 * IMPORTANT: this is a public endpoint (Resend's webhook caller is not
 * an authenticated CSA admin). It MUST NOT be wired up until Phase 2
 * adds signature verification. Today it's harmless — it does nothing.
 */
import type { APIRoute } from 'astro';

export const prerender = false;

export const POST: APIRoute = async () => {
  // Phase 2 will:
  //   const signature = request.headers.get('resend-signature');
  //   if (!verifyResendSignature(body, signature, secret)) return 401;
  //   const event = JSON.parse(body) as ResendWebhookEvent;
  //   await applyEventToCampaign(event);
  return new Response(JSON.stringify({ ok: true, phase: 'stub' }), {
    status: 200,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
};
