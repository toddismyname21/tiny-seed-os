/**
 * POST /api/admin/campaigns/send
 *
 * Trigger the real send for a campaign. Idempotent + resumable:
 *
 *   1. Loads the campaign.
 *   2. If status='sent': returns success no-op.
 *   3. If status in (draft, partial, failed): hands off to sendCampaign
 *      (lib/campaign.ts), which resolves recipients into
 *      campaign_recipients, sends in batches under DAILY_SEND_CAP, and
 *      transitions the campaign to either 'sent' or 'partial' depending
 *      on whether the cap was hit.
 *
 * The send loop uses the SERVICE-ROLE client (supabaseAdmin) so it
 * sees the full recipient set even though some joins (member_preferences
 * → members → customers) span tables RLS would otherwise scope. The
 * admin gate on this endpoint is the auth boundary; the service-role
 * read inside is the throughput tool.
 *
 * Body (JSON or form):
 *   campaign_id   UUID
 *
 * Response: full SendCampaignResult JSON.
 *
 * Security: isSameOriginPost CSRF + requireAdmin.
 */
import type { APIRoute } from 'astro';
import { z } from 'zod';
import { requireAdmin } from '../../../../lib/admin';
import { isSameOriginPost, PORTAL_ORIGIN } from '../../../../lib/onboarding';
import { supabaseAdmin } from '../../../../lib/supabase';
import { sendCampaign, resolveRecipients, normalizeRecipientFilter } from '../../../../lib/campaign';
import {
  RESEND_API_KEY,
  RESEND_FROM_EMAIL,
  UNSUBSCRIBE_SECRET,
} from 'astro:env/server';

export const prerender = false;

const Schema = z.object({
  campaign_id: z.string().uuid('invalid_campaign_id'),
  /** Deliberate override for the audience-drift guard below. Send the exact
   *  recipient count you intend to mail to proceed when it has changed. */
  confirm_recipients: z.coerce.number().int().nonnegative().optional(),
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

  // Stamp sent_by on the first transition out of 'draft' so the admin
  // who initiated the send is preserved.
  try {
    await supabaseAdmin
      .from('campaigns')
      .update({ sent_by: auth.ctx.user.id })
      .eq('id', parsed.data.campaign_id)
      .is('sent_by', null);
  } catch (e) {
    // Non-fatal — sent_by is a nice-to-have audit field, not a blocker.
    console.warn('[api/admin/campaigns/send] sent_by stamp failed:', e);
  }

  // ── AUDIENCE-DRIFT GUARD ──────────────────────────────────────────────
  // A campaign is reviewed at one size and sent later. Nothing previously
  // re-checked that the audience still matched: send.ts had ONLY auth + CSRF,
  // and recipients-count / send-test are advisory — both skippable. Editing a
  // filter after review, or a membership shift, silently changed who got mailed.
  //
  // So: re-resolve the audience NOW and compare it to total_recipients, the
  // number that was on screen when the campaign was reviewed. A material
  // difference means the audience is not what was approved — refuse and make a
  // human look. Pass confirm_recipients=<n> to proceed deliberately.
  //
  // Fail-OPEN by design: if the count cannot be re-resolved we log and send
  // rather than blocking a legitimate campaign on a transient read error. This
  // guard exists to catch a silent mistake, not to become a new outage source.
  {
    const { data: camp } = await supabaseAdmin
      .from('campaigns')
      .select('recipient_filter, total_recipients, status')
      .eq('id', parsed.data.campaign_id)
      .maybeSingle();

    const reviewedCount = Number(camp?.total_recipients ?? 0);
    // Only meaningful for a campaign that was reviewed at a known size and has
    // not already started sending (partial resumes must not be blocked).
    if (camp && reviewedCount > 0 && camp.status !== 'partial') {
      try {
        const live = await resolveRecipients(
          supabaseAdmin,
          normalizeRecipientFilter(camp.recipient_filter)
        );
        const liveCount = live.length;
        const drift = Math.abs(liveCount - reviewedCount);
        // Tolerate incidental churn (an unsubscribe or two between review and
        // send); block on anything that changes the audience materially.
        const tolerance = Math.max(2, Math.floor(reviewedCount * 0.05));
        if (drift > tolerance && parsed.data.confirm_recipients !== liveCount) {
          return json(
            {
              ok: false,
              error: 'recipient_count_changed',
              reviewed_recipients: reviewedCount,
              current_recipients: liveCount,
              message:
                `This campaign was reviewed for ${reviewedCount} recipients but now ` +
                `resolves to ${liveCount}. Re-send with confirm_recipients=${liveCount} ` +
                `if that is intended.`,
            },
            409
          );
        }
      } catch (e) {
        console.warn('[api/admin/campaigns/send] drift guard could not resolve; sending anyway:', e);
      }
    }
  }

  const result = await sendCampaign(supabaseAdmin, parsed.data.campaign_id, {
    apiKey: RESEND_API_KEY,
    from: RESEND_FROM_EMAIL,
    unsubscribeSecret: UNSUBSCRIBE_SECRET,
  });

  if (!result.ok) {
    console.error('[api/admin/campaigns/send] sendCampaign failed:', result.error);
    return json(result, 500);
  }
  return json(result);
};
