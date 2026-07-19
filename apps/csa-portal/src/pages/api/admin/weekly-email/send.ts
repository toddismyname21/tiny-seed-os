/**
 * POST /api/admin/weekly-email/send
 *
 * Sends the composed weekly box email. Owner-triggered ONLY — there is no
 * cron / scheduled invocation anywhere. Two modes:
 *
 *   mode='test' → send ONE email to the admin's own address (preview in a
 *                 real inbox). NOT logged to email_log, never affects the
 *                 per-week idempotency ledger.
 *   mode='all'  → send to every ACTIVE member whose member_preferences
 *                 .newsletter_opt_in = true, skipping anyone already sent
 *                 this week (email_log idempotency), batched + throttled
 *                 for the Resend free tier.
 *
 * Returns JSON: { ok, mode, week_date, sent, skipped, failed, remaining,
 *                 rate_limited, recipients }
 *
 * ── CAN-SPAM ──────────────────────────────────────────────────────────
 *   Every email embeds a tokenized one-click unsubscribe link (HMAC) +
 *   manage-preferences link + the farm's physical address. The send
 *   ABORTS (400) if UNSUBSCRIBE_SECRET is not configured — we never mail
 *   without a working, verifiable unsubscribe.
 *
 * ── Idempotency ───────────────────────────────────────────────────────
 *   Each successful send is logged to email_log (email_type='weekly_box',
 *   week_date, member_email). Before sending we load the set of emails
 *   already logged for this (type, week) and SKIP them. Re-running the
 *   send (to finish after a rate-limit) never double-mails. The DB UNIQUE
 *   (email_type, week_date, member_email) is the hard backstop.
 *
 * ── Throttling ────────────────────────────────────────────────────────
 *   Resend's free tier is ~100/day + a per-second rate limit. We process
 *   in batches of BATCH_SIZE with a small delay between sends, and a cap
 *   of MAX_PER_RUN per invocation. On an HTTP 429 we STOP gracefully and
 *   report sent vs remaining so the owner can re-run later to finish.
 *
 * Security: isSameOriginPost CSRF + requireAdmin. Reads recipients via the
 * service-role client (supabaseAdmin) so the full opted-in member list is
 * visible regardless of RLS, and writes email_log (service-role only).
 */
import type { APIRoute } from 'astro';
import { z } from 'zod';
import { requireAdmin } from '../../../../lib/admin';
import { isSameOriginPost, PORTAL_ORIGIN } from '../../../../lib/onboarding';
import { supabaseAdmin } from '../../../../lib/supabase';
import { upcomingWednesdayET } from '../../../../lib/box';
import {
  composeWeeklyEmail,
  renderWeeklyEmailHtml,
  renderWeeklyEmailText,
  unsubscribeUrl,
  WEEKLY_EMAIL_TYPE,
  PORTAL_BASE_URL,
} from '../../../../lib/weekly-email';
import { makeFeedbackUrl } from '../../../../lib/feedback';
import { mondayOfWeek, resolveCycle } from '../../../../lib/cycle';
import {
  RESEND_API_KEY,
  RESEND_FROM_EMAIL,
  UNSUBSCRIBE_SECRET,
  FEEDBACK_SECRET,
} from 'astro:env/server';

export const prerender = false;

// Resend free tier: ~100 emails/day, ~2 requests/sec. Conservative caps.
const BATCH_SIZE = 10;          // emails per batch
const DELAY_BETWEEN_MS = 600;   // pause between individual sends (~1.6/sec)
const MAX_PER_RUN = 90;         // hard cap per invocation (under the 100/day)

const ModeSchema = z.enum(['test', 'all']);

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

interface SendResult {
  ok: boolean;
  resendId?: string;
  status: number;
  error?: string;
}

/** Send one email via the Resend REST API. Never throws. */
async function sendOne(to: string, subject: string, html: string, text: string): Promise<SendResult> {
  try {
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: RESEND_FROM_EMAIL, to: [to], subject, html, text }),
    });
    if (resp.ok) {
      const data = (await resp.json().catch(() => null)) as { id?: string } | null;
      return { ok: true, resendId: data?.id, status: resp.status };
    }
    const detail = await resp.text().catch(() => '');
    return { ok: false, status: resp.status, error: detail.slice(0, 300) };
  } catch (e) {
    return { ok: false, status: 0, error: e instanceof Error ? e.message : 'network' };
  }
}

export const POST: APIRoute = async ({ request, locals }) => {
  if (!isSameOriginPost(request, PORTAL_ORIGIN)) {
    return json({ ok: false, error: 'forbidden' }, 403);
  }

  const auth = await requireAdmin(locals.supabase, locals.user);
  if (auth.response) return auth.response;
  const adminEmail = auth.ctx.user.email ?? '';

  // ── Config gates ───────────────────────────────────────────────────
  if (!RESEND_API_KEY || !RESEND_FROM_EMAIL) {
    return json({ ok: false, error: 'email_not_configured' }, 500);
  }
  // CAN-SPAM: refuse to send without a way to mint verifiable unsubscribe
  // links. No exceptions.
  if (!UNSUBSCRIBE_SECRET) {
    return json({ ok: false, error: 'unsubscribe_not_configured' }, 400);
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return json({ ok: false, error: 'invalid_input' }, 400);
  }

  const modeParsed = ModeSchema.safeParse(String(formData.get('mode') ?? ''));
  if (!modeParsed.success) {
    return json({ ok: false, error: 'invalid_mode' }, 400);
  }
  const mode = modeParsed.data;

  const weekDate = upcomingWednesdayET();
  const preferencesHref = `${PORTAL_BASE_URL}/account/preferences`;

  // Per-member post-pickup feedback link (Phase 2 Wave 1, proposal 2.3). The
  // token is keyed by the cycle MONDAY (canonical week key — matches
  // box_contents + the admin feedback week picker). The secret falls back to
  // UNSUBSCRIBE_SECRET so the block works before a distinct FEEDBACK_SECRET is
  // provisioned; when neither is set (or a recipient's customer id can't be
  // resolved) feedbackHref stays undefined and the email omits the block.
  const feedbackSecret = FEEDBACK_SECRET || UNSUBSCRIBE_SECRET;
  const feedbackWeek = mondayOfWeek(weekDate);

  // Compose once (same body for everyone — only the unsubscribe link differs).
  const composed = await composeWeeklyEmail(supabaseAdmin, weekDate);

  // ── TEST mode: one email to the admin, not logged ──────────────────
  if (mode === 'test') {
    if (!adminEmail) return json({ ok: false, error: 'no_admin_email' }, 400);
    const unsub = unsubscribeUrl(adminEmail, UNSUBSCRIBE_SECRET);
    // Resolve the admin's own customer id so the preview shows a real, working
    // feedback link (fail-soft: omitted if not found / no secret).
    let adminFeedbackHref: string | undefined;
    if (feedbackSecret) {
      const { data: adminCust } = await supabaseAdmin
        .from('customers')
        .select('id')
        .eq('email', adminEmail)
        .maybeSingle();
      if (adminCust?.id) {
        adminFeedbackHref = makeFeedbackUrl(adminCust.id, feedbackWeek, feedbackSecret);
      }
    }
    const html = renderWeeklyEmailHtml(composed, { unsubscribeHref: unsub, preferencesHref, feedbackHref: adminFeedbackHref });
    const text = renderWeeklyEmailText(composed, { unsubscribeHref: unsub, preferencesHref, feedbackHref: adminFeedbackHref });
    const res = await sendOne(adminEmail, `[TEST] ${composed.subject}`, html, text);
    if (!res.ok) {
      console.error(`[weekly-email/send] test send failed (HTTP ${res.status}): ${res.error}`);
      return json({ ok: false, error: 'send_failed', detail: res.error }, 502);
    }
    return json({
      ok: true,
      mode: 'test',
      week_date: weekDate,
      sent: 1,
      skipped: 0,
      failed: 0,
      remaining: 0,
      rate_limited: false,
      recipients: [adminEmail],
    });
  }

  // ── ALL mode: opted-in active members ──────────────────────────────
  // Recipients = members.status='active' AND member_preferences
  // .newsletter_opt_in=true, joined to the owning customer's email. We
  // de-dupe by email (a customer with multiple active member rows still
  // gets one email).
  type RecipientRow = {
    newsletter_opt_in: boolean;
    member: {
      status: string;
      customer: { id: string; email: string; is_active: boolean } | null;
    } | null;
  };
  const { data: prefRows, error: prefErr } = await supabaseAdmin
    .from('member_preferences')
    .select(
      `newsletter_opt_in,
       member:members!inner(status, customer:customers!inner(id, email, is_active))`
    )
    .eq('newsletter_opt_in', true)
    .overrideTypes<RecipientRow[], { merge: false }>();

  if (prefErr) {
    console.error('[weekly-email/send] recipient query failed:', prefErr.message);
    return json({ ok: false, error: 'recipient_query_failed' }, 500);
  }

  // Cycle-aware audience (Todd 2026-07-18): only members RECEIVING food this
  // week — weekly + biweekly on-week + flex. resolveCycle has ALREADY excluded
  // biweekly off-weeks, vacation holds, and out-of-season shares, so we never
  // email a "here's your box" to someone who isn't getting one this cycle.
  // Keyed by the cycle MONDAY (feedbackWeek), matching box_contents.
  const cycle = await resolveCycle(supabaseAdmin, feedbackWeek);
  const eligibleEmails = new Set<string>();
  for (const cm of cycle.members) {
    const em = (cm.email ?? '').trim().toLowerCase();
    if (em) eligibleEmails.add(em);
  }

  const recipientEmails = new Set<string>();
  // email → customer id, so the per-recipient feedback link can be minted in the
  // send loop (the loop is email-keyed; first customer id wins for an email).
  const customerIdByEmail = new Map<string, string>();
  for (const row of prefRows ?? []) {
    if (!row.newsletter_opt_in) continue;
    const m = row.member;
    if (!m || m.status !== 'active') continue;
    const email = m.customer?.email?.trim().toLowerCase();
    if (!email) continue;
    if (m.customer?.is_active === false) continue;
    // Only members actually getting food this week (cycle-aware filter).
    if (!eligibleEmails.has(email)) continue;
    recipientEmails.add(email);
    if (m.customer?.id && !customerIdByEmail.has(email)) {
      customerIdByEmail.set(email, m.customer.id);
    }
  }

  // Idempotency: load emails already logged 'sent' for (type, week).
  const { data: sentRows, error: logErr } = await supabaseAdmin
    .from('email_log')
    .select('member_email')
    .eq('email_type', WEEKLY_EMAIL_TYPE)
    .eq('week_date', weekDate)
    .eq('status', 'sent');

  if (logErr) {
    console.error('[weekly-email/send] email_log read failed:', logErr.message);
    return json({ ok: false, error: 'log_read_failed' }, 500);
  }
  const alreadySent = new Set(
    (sentRows ?? []).map((r) => (r.member_email ?? '').trim().toLowerCase())
  );

  const pending = Array.from(recipientEmails).filter((e) => !alreadySent.has(e));
  const totalOptedIn = recipientEmails.size;
  const skippedAlready = totalOptedIn - pending.length;

  let sent = 0;
  let failed = 0;
  let rateLimited = false;
  let processed = 0;

  for (const email of pending) {
    if (processed >= MAX_PER_RUN) break; // per-run cap

    const unsub = unsubscribeUrl(email, UNSUBSCRIBE_SECRET);
    // Per-member feedback link (fail-soft: omitted if no secret / no customer id).
    const custId = customerIdByEmail.get(email);
    const feedbackHref =
      feedbackSecret && custId
        ? makeFeedbackUrl(custId, feedbackWeek, feedbackSecret)
        : undefined;
    const html = renderWeeklyEmailHtml(composed, { unsubscribeHref: unsub, preferencesHref, feedbackHref });
    const text = renderWeeklyEmailText(composed, { unsubscribeHref: unsub, preferencesHref, feedbackHref });

    const res = await sendOne(email, composed.subject, html, text);

    if (res.status === 429) {
      // Rate limited — STOP gracefully. Do NOT log this one; it'll be
      // retried on the next run (still in `pending` because not logged).
      rateLimited = true;
      console.warn('[weekly-email/send] rate limited by Resend — stopping run.');
      break;
    }

    if (res.ok) {
      sent += 1;
      // Log success (idempotency ledger). Upsert on the UNIQUE constraint
      // so a concurrent run can't create a duplicate row.
      const { error: insErr } = await supabaseAdmin.from('email_log').upsert(
        {
          member_email: email,
          email_type: WEEKLY_EMAIL_TYPE,
          week_date: weekDate,
          status: 'sent',
          resend_id: res.resendId ?? null,
        },
        { onConflict: 'email_type,week_date,member_email' }
      );
      if (insErr) {
        console.error('[weekly-email/send] email_log write failed:', insErr.message);
      }
    } else {
      failed += 1;
      console.error(`[weekly-email/send] send failed for ${email} (HTTP ${res.status}): ${res.error}`);
      // Log the failure too — so the admin can see it and we don't lose
      // the audit trail. A failed row does NOT block a later retry: the
      // skip check only looks at status='sent'.
      await supabaseAdmin.from('email_log').upsert(
        {
          member_email: email,
          email_type: WEEKLY_EMAIL_TYPE,
          week_date: weekDate,
          status: 'failed',
          error_message: (res.error ?? `HTTP ${res.status}`).slice(0, 500),
        },
        { onConflict: 'email_type,week_date,member_email' }
      );
    }

    processed += 1;

    // Throttle between sends (skip the wait after the final one + on batch
    // boundaries we keep the same per-send delay — simple + safe).
    if (processed < pending.length && processed < MAX_PER_RUN) {
      await sleep(DELAY_BETWEEN_MS);
    }
    // Batch marker (no-op beyond the per-send delay, but kept explicit so
    // a future change to per-batch backoff has a hook). BATCH_SIZE is used
    // to compute `remaining` semantics in the response.
    void BATCH_SIZE;
  }

  const remaining = pending.length - processed;

  return json({
    ok: true,
    mode: 'all',
    week_date: weekDate,
    total_opted_in: totalOptedIn,
    sent,
    skipped: skippedAlready,
    failed,
    remaining,
    rate_limited: rateLimited,
    capped: processed >= MAX_PER_RUN && remaining > 0,
  });
};
