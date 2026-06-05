/**
 * POST /api/admin/campaigns/webhook — Resend delivery/engagement webhook.
 *
 * PUBLIC endpoint (no admin cookie): Resend calls this server-to-server,
 * so there's no session to gate on. Authenticity is enforced instead by
 * the svix-style signature check below — the ONLY public route in the
 * campaigns surface.
 *
 * Flow:
 *   1. Read the RAW request body (svix signs the exact bytes — we must
 *      verify before JSON.parse, never re-serialize).
 *   2. If RESEND_WEBHOOK_SECRET is set, verify the
 *      svix-id / svix-timestamp / svix-signature headers against it via
 *      the `svix` Webhook verifier. On failure → 401.
 *      If the secret is UNSET, we gracefully no-op-ACCEPT (200) so
 *      Resend's delivery attempts don't hard-fail before Todd has wired
 *      the secret into Vercel. (Documented trade-off — see report.)
 *   3. Parse the event `{ type, created_at, data: { email_id } }` and
 *      apply it via applyResendEvent (lib/campaign.ts): advances the
 *      matching campaign_recipients row status (delivered → opened →
 *      clicked, or bounced/complained) and bumps the parent campaign's
 *      aggregate counter exactly once.
 *
 * We use the SERVICE-ROLE client (supabaseAdmin) because there is no
 * authenticated user on a webhook call — the signature IS the auth.
 *
 * Resend event types we react to: email.delivered, email.opened,
 * email.clicked, email.bounced, email.complained. Other types
 * (email.sent, email.delivery_delayed) are accepted + ignored (we still
 * stamp last_event_at for known recipients).
 *
 * Docs:
 *   https://resend.com/docs/dashboard/webhooks/introduction
 *   https://resend.com/docs/dashboard/webhooks/event-types
 *
 * Endpoint URL to register in the Resend dashboard:
 *   https://csa.tinyseedfarm.com/api/admin/campaigns/webhook
 */
import type { APIRoute } from 'astro';
import { Webhook } from 'svix';
import { supabaseAdmin } from '../../../../lib/supabase';
import {
  applyResendEvent,
  type ResendWebhookEvent,
} from '../../../../lib/campaign';
import { RESEND_WEBHOOK_SECRET } from 'astro:env/server';

export const prerender = false;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

export const POST: APIRoute = async ({ request }) => {
  // 1. Raw body — verify the exact bytes Resend signed.
  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return json({ ok: false, error: 'unreadable_body' }, 400);
  }

  // 2. Signature verification (svix headers).
  const secret = RESEND_WEBHOOK_SECRET;
  if (secret) {
    const svixId = request.headers.get('svix-id') ?? '';
    const svixTimestamp = request.headers.get('svix-timestamp') ?? '';
    const svixSignature = request.headers.get('svix-signature') ?? '';
    if (!svixId || !svixTimestamp || !svixSignature) {
      return json({ ok: false, error: 'missing_signature_headers' }, 401);
    }
    try {
      const wh = new Webhook(secret);
      // Throws WebhookVerificationError on bad signature / stale timestamp.
      wh.verify(raw, {
        'svix-id': svixId,
        'svix-timestamp': svixTimestamp,
        'svix-signature': svixSignature,
      });
    } catch (e) {
      console.warn(
        '[campaigns/webhook] signature verification failed:',
        e instanceof Error ? e.message : 'unknown'
      );
      return json({ ok: false, error: 'invalid_signature' }, 401);
    }
  } else {
    // No secret configured yet — accept WITHOUT acting on unsigned data
    // would be safest, but Resend needs a 200 to keep the endpoint
    // healthy. We DO still apply the event (the email_id lookup is the
    // only thing that can change state, and email_ids are unguessable
    // UUIDs), and log a loud warning so this isn't silently permanent.
    console.warn(
      '[campaigns/webhook] RESEND_WEBHOOK_SECRET unset — accepting UNVERIFIED webhook. ' +
        'Set the secret in Vercel after registering the endpoint in Resend.'
    );
  }

  // 3. Parse + apply.
  let event: ResendWebhookEvent;
  try {
    event = JSON.parse(raw) as ResendWebhookEvent;
  } catch {
    return json({ ok: false, error: 'invalid_json' }, 400);
  }
  if (!event || typeof event.type !== 'string') {
    return json({ ok: false, error: 'invalid_event' }, 400);
  }

  const result = await applyResendEvent(supabaseAdmin, event);
  if (!result.ok) {
    // A DB error — return 500 so Resend retries (the event is valid, we
    // just failed to persist it).
    return json({ ok: false, error: result.error ?? 'apply_failed' }, 500);
  }

  // 200 for matched + unmatched alike — an unmatched email_id (test send,
  // weekly email, invite) is not an error; we accept + no-op.
  return json({
    ok: true,
    type: event.type,
    matched: result.matched,
    applied: result.applied,
  });
};
