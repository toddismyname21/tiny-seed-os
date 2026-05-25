/**
 * POST /api/account/request-delivery
 *
 * A MEMBER requests home delivery. Home delivery is PAID ($15/week) and
 * ADMIN-APPROVED — a member can NOT switch themselves to delivery (that
 * gate lives in the change_pickup_location RPC, migration 0030). This route
 * is the member-facing REQUEST: it captures the desired address and routes
 * it to staff WITHOUT setting delivery_address or charging anything.
 *
 * What it does (and ONLY this):
 *   1. Marks the member's active share(s) as having a PENDING request:
 *      members.home_delivery_requested_at = now(),
 *      members.home_delivery_requested_address = <supplied address>.
 *      Idempotent — re-submitting just refreshes the marker; the chooser
 *      shows the pending state so we don't spam.
 *   2. Logs the request to the member_comms ledger (channel 'other') so it
 *      surfaces on the admin member-detail page where staff already look.
 *      member_comms is admin/staff-write only under RLS, so this insert
 *      goes through supabaseAdmin (service role) AFTER we've resolved the
 *      caller's own customer_id via the RLS-scoped client.
 *   3. Emails BOTH staff inboxes (CSA_CONTACT_EMAILS = Frankie + Todd) via
 *      Resend (best-effort, fail-soft — never blocks the request).
 *
 * What it does NOT do (out of scope — PM is planning the payment path):
 *   - NO delivery_address set. NO Shopify charge / invoice / subscription /
 *     store-credit deduction. The $15/week is collected MANUALLY by Todd in
 *     Shopify after approval.
 *
 * On success: 303 → /account/pickup?ok=requested
 * On failure: 303 → /account/pickup?error=<code>
 *
 * Mirrors the CSRF + auth + Zod + redirect contract of the sibling account
 * routes (pickup-location, household, profile).
 */
import type { APIRoute } from 'astro';
import { z } from 'zod';
import { isSameOriginPost, PORTAL_ORIGIN } from '../../../lib/onboarding';
import { supabaseAdmin } from '../../../lib/supabase';
import { CSA_CONTACT_EMAILS } from '../../../lib/contact';
import { RESEND_API_KEY, RESEND_FROM_EMAIL } from 'astro:env/server';

export const prerender = false;

const REDIRECT = '/account/pickup';

const AddressSchema = z
  .string()
  .trim()
  .min(8, 'invalid_input')
  .max(500, 'invalid_input');

function fail(redirect: (url: string, status: 303) => Response, code: string): Response {
  return redirect(`${REDIRECT}?error=${code}`, 303);
}

export const POST: APIRoute = async ({ request, redirect, locals }) => {
  if (!isSameOriginPost(request, PORTAL_ORIGIN)) {
    return new Response('Forbidden', { status: 403 });
  }

  const user = locals.user;
  if (!user || !user.email) {
    return redirect('/login', 303);
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch (e) {
    console.error('[api/account/request-delivery] formData parse failed', e);
    return fail(redirect, 'invalid_input');
  }

  const addrParsed = AddressSchema.safeParse(String(formData.get('delivery_address') ?? ''));
  if (!addrParsed.success) {
    return fail(redirect, 'invalid_input');
  }
  const address = addrParsed.data;

  // ─── Resolve the caller's active share(s) via the RLS-scoped client ──
  // The member-self read policy means this only ever returns the caller's
  // own rows. We mark the request on every ACTIVE share (a member with one
  // active share is the common case; multi-share members get the marker on
  // all of them so the chooser reads "pending" regardless of which it shows).
  type MemberRow = {
    id: string;
    customer_id: string;
    status: string;
    delivery_address: string | null;
    home_delivery_requested_at: string | null;
  };
  const { data: memberRows, error: memberErr } = await locals.supabase
    .from('members')
    .select('id, customer_id, status, delivery_address, home_delivery_requested_at')
    .eq('status', 'active')
    .overrideTypes<MemberRow[], { merge: false }>();

  if (memberErr) {
    console.error('[api/account/request-delivery] member fetch failed:', memberErr.message);
    return fail(redirect, 'network');
  }

  const active = memberRows ?? [];
  if (active.length === 0) {
    // No active share to deliver to — nothing to request against.
    return fail(redirect, 'no_active_share');
  }

  // Already on home delivery? Then there is nothing to "request" — they
  // should contact the farm to CHANGE it (change is admin-gated now).
  const alreadyDelivery = active.some(
    (m) => typeof m.delivery_address === 'string' && m.delivery_address.trim().length > 0
  );
  if (alreadyDelivery) {
    return fail(redirect, 'already_delivery');
  }

  // ─── Mark the request (idempotent) on every active share ────────────
  // This write goes through the member's own RLS-scoped client (members
  // self-update policy permits the member to edit their own row), so we do
  // NOT need the service role here.
  const ids = active.map((m) => m.id);
  const { error: markErr } = await locals.supabase
    .from('members')
    .update({
      home_delivery_requested_at: new Date().toISOString(),
      home_delivery_requested_address: address,
    })
    .in('id', ids);

  if (markErr) {
    console.error('[api/account/request-delivery] request mark failed:', markErr.message);
    return fail(redirect, 'network');
  }

  // ─── Log to member_comms (admin/staff-write only → supabaseAdmin) ────
  // Keyed on the CUSTOMER (the person), matching how the admin comms log
  // works. All active shares share one customer_id; use the first.
  const customerId = active[0].customer_id;
  const summary =
    `MEMBER REQUESTED HOME DELIVERY ($15/week, pending approval). ` +
    `Requested address: ${address}. ` +
    `Submitted via member portal by ${user.email}. ` +
    `No charge applied and delivery NOT set — approve + collect $15/wk in Shopify, ` +
    `then set the delivery address from this member's admin page.`;

  const { error: commErr } = await supabaseAdmin.from('member_comms').insert({
    customer_id: customerId,
    author_email: user.email,
    channel: 'other',
    summary,
  });
  if (commErr) {
    // Non-fatal: the request marker + email still go out. Log loudly.
    console.error('[api/account/request-delivery] member_comms log failed:', commErr.message);
  }

  // ─── Email staff (best-effort, fail-soft — never blocks the request) ─
  await notifyStaff(user.email, address);

  return redirect(`${REDIRECT}?ok=requested`, 303);
};

/**
 * Best-effort staff notification via the Resend REST API. Sends to BOTH the
 * CSA comms inbox (Frankie) and the owner (Todd) — CSA_CONTACT_EMAILS. Any
 * error (missing key, Resend down, non-2xx) is logged and swallowed so the
 * request always succeeds. Never throws.
 */
async function notifyStaff(memberEmail: string, address: string): Promise<void> {
  try {
    if (!RESEND_API_KEY || !RESEND_FROM_EMAIL) {
      console.warn('[api/account/request-delivery] Resend not configured — skipping staff email');
      return;
    }

    const subject = `Home delivery request — ${memberEmail}`;
    const safeEmail = escapeHtml(memberEmail);
    const safeAddr = escapeHtml(address);

    const text =
      `A CSA member has requested home delivery ($15/week, pending your approval).\n\n` +
      `Member: ${memberEmail}\n` +
      `Requested address:\n${address}\n\n` +
      `NEXT STEPS (manual — no charge was applied):\n` +
      `  1. Approve the member and collect the $15/week in Shopify.\n` +
      `  2. Set the delivery address from the member's admin page\n` +
      `     (Admin → Members → this member → Pickup → "Set home delivery").\n\n` +
      `Tiny Seed Farm CSA portal`;

    const html =
      `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;` +
      `max-width:520px;margin:0 auto;color:#0f172a;line-height:1.6">` +
      `<p style="font-size:18px;font-weight:700;margin:0 0 12px">🏡 Home delivery request</p>` +
      `<p>A CSA member has requested home delivery ` +
      `(<strong>$15/week, pending your approval</strong>).</p>` +
      `<table style="margin:16px 0;font-size:15px">` +
      `<tr><td style="padding:2px 12px 2px 0;color:#475569">Member</td>` +
      `<td><strong>${safeEmail}</strong></td></tr>` +
      `<tr><td style="padding:2px 12px 2px 0;color:#475569;vertical-align:top">Address</td>` +
      `<td style="white-space:pre-line">${safeAddr}</td></tr>` +
      `</table>` +
      `<p style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:14px 16px;font-size:14px;color:#166534;margin:16px 0">` +
      `<strong>Next steps (manual — no charge was applied):</strong><br>` +
      `1. Approve + collect the $15/week in Shopify.<br>` +
      `2. Set the delivery address from the member's admin page ` +
      `(Admin &rarr; Members &rarr; this member &rarr; Pickup).</p>` +
      `<p style="color:#6b7280;font-size:13px;margin-top:20px">` +
      `Tiny Seed Farm · 257 Zeigler Rd, Rochester, PA · Certified Organic</p>` +
      `</div>`;

    // CSA_CONTACT_EMAILS is a comma-separated "Frankie,Todd" string; Resend's
    // `to` takes an array, so split it.
    const recipients = CSA_CONTACT_EMAILS.split(',').map((e) => e.trim()).filter(Boolean);

    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: RESEND_FROM_EMAIL,
        to: recipients,
        reply_to: memberEmail,
        subject,
        text,
        html,
      }),
    });

    if (!resp.ok) {
      const detail = await resp.text().catch(() => '');
      console.error(
        `[api/account/request-delivery] Resend send failed (HTTP ${resp.status}): ${detail.slice(0, 300)}`
      );
    }
  } catch (e) {
    console.error('[api/account/request-delivery] Resend send threw (swallowed):', e);
  }
}

/** Minimal HTML escaping for interpolated strings in the email body. */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
