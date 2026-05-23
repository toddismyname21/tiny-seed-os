/**
 * POST /api/account/household
 *
 * Household sharing — a PRIMARY CSA member invites another person
 * (couple / roommate) to SHARE their account, or removes someone they
 * previously invited. The invited person gets their own magic-link login
 * that resolves to the SAME account (see migration 0023 +
 * `current_customer_id()`'s household fallback).
 *
 * Body (application/x-www-form-urlencoded / multipart):
 *   - action   'invite' | 'remove'   (required, whitelisted)
 *   - email    String (required for 'invite')  — the person to add
 *   - email    String (required for 'remove')  — the member_email to drop
 *
 * Authorization model:
 *   Only the PRIMARY (the direct customers-row owner) may manage the
 *   household. We resolve the caller's OWN customer id server-side via the
 *   `auth_primary_customer_id()` RPC. An invited member's email has no
 *   customers row → the RPC returns NULL → we reject with `not_primary`.
 *   The INSERT/UPDATE then runs through the cookie-aware RLS-scoped client,
 *   whose `account_members_owner_write` policy independently re-checks
 *   `owner_customer_id = auth_primary_customer_id()` (defense-in-depth).
 *
 * v1 invite rules:
 *   - REJECT if the email already exists in `customers` (`already_member`)
 *     — one email = one account; multi-account switching is later scope.
 *   - REJECT if the email is already an active member of THIS account
 *     (`already_invited`).
 *   - Else INSERT an active account_members row, then send a best-effort
 *     Resend invite email (fail-soft — never blocks the invite).
 *
 * On success: 303 → /account/household?ok=<invited|removed>
 * On failure: 303 → /account/household?error=<code>
 *
 * Mirrors the CSRF + auth + Zod + redirect contract of
 * /api/account/profile + /api/account/preferences.
 */
import type { APIRoute } from 'astro';
import { z } from 'zod';
import { isSameOriginPost, PORTAL_ORIGIN } from '../../../lib/onboarding';
import { RESEND_API_KEY, RESEND_FROM_EMAIL } from 'astro:env/server';

export const prerender = false;

const REDIRECT = '/account/household';

/** A trimmed, lowercased, validated email. Empty/invalid → error. */
const EmailSchema = z
  .string()
  .trim()
  .min(1, 'invalid_input')
  .max(254, 'invalid_input')
  .pipe(z.email('invalid_email'))
  .transform((s) => s.toLowerCase());

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
    console.error('[api/account/household] formData parse failed', e);
    return fail(redirect, 'invalid_input');
  }

  const action = String(formData.get('action') ?? '');
  if (action !== 'invite' && action !== 'remove') {
    return fail(redirect, 'invalid_input');
  }

  const emailParsed = EmailSchema.safeParse(String(formData.get('email') ?? ''));
  if (!emailParsed.success) {
    const code = emailParsed.error.issues[0]?.message === 'invalid_email'
      ? 'invalid_email'
      : 'invalid_input';
    return fail(redirect, code);
  }
  const targetEmail = emailParsed.data;

  // ─── Authorization: caller must be a PRIMARY (own customers row) ─────
  // auth_primary_customer_id() returns the caller's OWN customer id, or
  // NULL if they're an invited member (no customers row). Only a primary
  // may manage the household.
  const { data: ownerId, error: ownerErr } = await locals.supabase.rpc(
    'auth_primary_customer_id'
  );
  if (ownerErr) {
    console.error('[api/account/household] owner resolve failed:', ownerErr.message);
    return fail(redirect, 'network');
  }
  if (!ownerId) {
    // Either no account at all, or an invited member trying to manage.
    return fail(redirect, 'not_primary');
  }

  // A primary can't invite/remove their own login email.
  if (targetEmail === user.email.toLowerCase()) {
    return fail(redirect, 'self_invite');
  }

  // ─────────────────────────────────────────────────────────────────────
  // REMOVE
  // ─────────────────────────────────────────────────────────────────────
  if (action === 'remove') {
    // Soft-delete: set status='removed'. RLS owner_write enforces that
    // only the primary can touch rows on their own account, and we also
    // scope by owner_customer_id for clarity. citext match is
    // case-insensitive, so the lowercased email matches regardless of how
    // it was stored.
    const { error } = await locals.supabase
      .from('account_members')
      .update({ status: 'removed' })
      .eq('owner_customer_id', ownerId)
      .eq('member_email', targetEmail);

    if (error) {
      console.error('[api/account/household] remove failed:', error.message);
      return fail(redirect, 'network');
    }
    return redirect(`${REDIRECT}?ok=removed`, 303);
  }

  // ─────────────────────────────────────────────────────────────────────
  // INVITE
  // ─────────────────────────────────────────────────────────────────────

  // v1 block: the invited email must NOT already be its OWN CSA account.
  // One email = one account (multi-account switching is later scope).
  //
  // The member RLS client can only see its OWN customers row
  // (customers_self_read), so a plain `.from('customers')` lookup would
  // return a FALSE negative for someone else's email. We therefore check
  // existence via the `email_is_customer(p_email)` SECURITY DEFINER helper
  // (migration 0023), which bypasses RLS to return a boolean only.
  const { data: emailIsCustomer, error: existsErr } = await locals.supabase.rpc(
    'email_is_customer',
    { p_email: targetEmail }
  );
  if (existsErr) {
    console.error('[api/account/household] customer-existence check failed:', existsErr.message);
    return fail(redirect, 'network');
  }
  if (emailIsCustomer === true) {
    return fail(redirect, 'already_member');
  }

  // Already an ACTIVE member of THIS account? (The caller CAN see their
  // own household via account_members_select.)
  const { data: existing, error: existingErr } = await locals.supabase
    .from('account_members')
    .select('id, status')
    .eq('owner_customer_id', ownerId)
    .eq('member_email', targetEmail)
    .maybeSingle();

  if (existingErr) {
    console.error('[api/account/household] existing-member check failed:', existingErr.message);
    return fail(redirect, 'network');
  }

  if (existing && existing.status === 'active') {
    return fail(redirect, 'already_invited');
  }

  // INSERT (or re-activate a previously-removed row). We upsert on the
  // UNIQUE (owner_customer_id, member_email) constraint so re-inviting
  // someone you removed flips them back to 'active' instead of erroring.
  // The owner_write RLS policy re-checks owner = auth_primary_customer_id().
  const { error: insertErr } = await locals.supabase
    .from('account_members')
    .upsert(
      {
        owner_customer_id: ownerId,
        member_email: targetEmail,
        status: 'active',
        invited_by: user.email.toLowerCase(),
      },
      { onConflict: 'owner_customer_id,member_email' }
    );

  if (insertErr) {
    console.error('[api/account/household] insert failed:', insertErr.message);
    return fail(redirect, 'network');
  }

  // ─── Best-effort invite email (fail-soft — NEVER blocks the invite) ──
  // Resolve the primary's display name for a warmer subject/body.
  let primaryName = user.email.split('@')[0];
  try {
    const { data: me } = await locals.supabase
      .from('customers')
      .select('contact_name')
      .eq('email', user.email)
      .maybeSingle()
      .overrideTypes<{ contact_name: string }, { merge: false }>();
    if (me?.contact_name) primaryName = me.contact_name;
  } catch {
    // Non-fatal — fall back to the email local-part.
  }

  await sendInviteEmail(targetEmail, primaryName);

  return redirect(`${REDIRECT}?ok=invited`, 303);
};

/**
 * Best-effort invite email via the Resend REST API. Fail-soft: any error
 * (missing key, Resend down, non-2xx) is logged and swallowed so the
 * invite always succeeds. Never throws.
 */
async function sendInviteEmail(toEmail: string, primaryName: string): Promise<void> {
  try {
    if (!RESEND_API_KEY || !RESEND_FROM_EMAIL) {
      console.warn('[api/account/household] Resend not configured — skipping invite email');
      return;
    }

    const loginUrl = 'https://csa.tinyseedfarm.com/login';
    const safeName = escapeHtml(primaryName);
    const subject = `You've been added to ${primaryName}'s Tiny Seed Farm CSA`;

    const text =
      `You've been added to ${primaryName}'s Tiny Seed Farm CSA.\n\n` +
      `Sign in at ${loginUrl} with this email address (${toEmail}) to ` +
      `view your box, swap items, set vacation holds, and more.\n\n` +
      `— Tiny Seed Farm`;

    const html =
      `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;` +
      `max-width:480px;margin:0 auto;color:#1f2937;line-height:1.6">` +
      `<p style="font-size:18px;font-weight:600;margin:0 0 12px">🌱 Welcome to the farm</p>` +
      `<p>You've been added to <strong>${safeName}'s</strong> Tiny Seed Farm CSA.</p>` +
      `<p>Sign in with <strong>this email address</strong> to view your box, ` +
      `swap items, set vacation holds, and see your Farm Flex balance:</p>` +
      `<p style="margin:20px 0">` +
      `<a href="${loginUrl}" style="display:inline-block;background:#15803d;color:#fff;` +
      `text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600">` +
      `Sign in to your CSA</a></p>` +
      `<p style="color:#6b7280;font-size:14px">Or go to ${loginUrl} and enter ` +
      `<strong>${escapeHtml(toEmail)}</strong>.</p>` +
      `<p style="color:#6b7280;font-size:13px;margin-top:24px">` +
      `Tiny Seed Farm · 257 Zeigler Rd, Rochester, PA · Certified Organic</p>` +
      `</div>`;

    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: RESEND_FROM_EMAIL,
        to: [toEmail],
        subject,
        text,
        html,
      }),
    });

    if (!resp.ok) {
      const detail = await resp.text().catch(() => '');
      console.error(
        `[api/account/household] Resend send failed (HTTP ${resp.status}): ${detail.slice(0, 300)}`
      );
    }
  } catch (e) {
    console.error('[api/account/household] Resend send threw (swallowed):', e);
  }
}

/** Minimal HTML escaping for interpolated user/display strings in email. */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
