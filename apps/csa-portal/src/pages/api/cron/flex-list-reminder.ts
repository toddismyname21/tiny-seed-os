/**
 * GET|POST /api/cron/flex-list-reminder   (cron-triggered, NOT user-facing)
 *
 * Weekly "set up next week" nudge to Todd. Originally a flex-only reminder; now
 * broadened (2026-06-22) to cover ALL THREE weekly editor surfaces — the
 * standard box, the Farm Flex extras catalog, AND the farmers-market list —
 * because the same window (it fires the morning the flex list goes live) is the
 * right moment to make sure the whole week is staged, not just flex.
 *
 * It runs the SAME readiness check the admin-home banner uses
 * (lib/week-setup.resolveWeekSetup over the upcoming cycle Monday) and only
 * lists the surfaces that are STILL EMPTY for that week — so a week that's
 * already mostly set produces a short, targeted email (or a calm "all set" note
 * when nothing is missing). Each listed surface carries its editor link:
 *   Box    → /admin/share-contents
 *   Flex   → /admin/flex-inventory
 *   Market → /admin/market
 *
 * One short, plain email via Resend to the farm owner. No member-facing
 * surface — purely an operational reminder.
 *
 * Auth: same `Authorization: Bearer <CRON_SECRET>` pattern as
 * /api/cron/nightly-health and /api/sync/shopify-orders. Vercel cron jobs
 * include this header automatically when the CRON_SECRET env var is set.
 * UNCHANGED — the schedule + guard are exactly as before.
 *
 * The Resend send is fail-soft: if the key isn't configured or Resend errors,
 * the endpoint logs and still returns 200 with the JSON result (mirrors
 * nightly-health). A best-effort notification_log row records the outcome.
 */
import type { APIRoute } from 'astro';
import {
  CRON_SECRET,
  RESEND_API_KEY,
  RESEND_FROM_EMAIL,
} from 'astro:env/server';
import { supabaseAdmin } from '../../../lib/supabase';
import type { Database } from '../../../lib/database.types';
import {
  resolveWeekSetup, upcomingSetupWeek, type WeekSetupReadiness,
} from '../../../lib/week-setup';

export const prerender = false;

/** Email destination for the weekly reminder. Hardcoded — operational nudge,
 *  not member-facing. UNCHANGED owner-email convention. */
const REMINDER_TO = 'todd@tinyseedfarmpgh.com';

/** Production origin — editor links are built as `${ORIGIN}${item.href}`. */
const ADMIN_ORIGIN = 'https://csa.tinyseedfarm.com';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

function checkAuth(request: Request): Response | null {
  const expected = CRON_SECRET;
  if (!expected) {
    return jsonResponse({ ok: false, error: 'cron_secret_not_configured' }, 500);
  }
  const header = request.headers.get('authorization') ?? '';
  const m = /^Bearer\s+(.+)$/i.exec(header);
  const provided = m?.[1]?.trim() ?? '';
  if (provided.length === 0 || provided !== expected) {
    return jsonResponse({ ok: false, error: 'unauthorized' }, 401);
  }
  return null;
}

/** Escape a string for safe interpolation into the HTML email body. */
function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string
  ));
}

async function sendReminderEmail(
  setup: WeekSetupReadiness,
): Promise<{ ok: boolean; detail: string }> {
  try {
    if (!RESEND_API_KEY || !RESEND_FROM_EMAIL) {
      return { ok: false, detail: 'resend_not_configured' };
    }

    const dateStr = new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'America/New_York',
    }).format(new Date());

    // Only nudge about the surfaces that are STILL EMPTY for the upcoming week.
    // When nothing is missing the email is a calm "all set" confirmation.
    const missing = setup.missing;
    const allReady = setup.allReady;

    const subject = allReady
      ? `Next week is set up — ${setup.weekLabel}`
      : `Set up next week — ${missing.map((m) => m.label).join(' · ')}`;

    const linkFor = (href: string): string => `${ADMIN_ORIGIN}${href}`;

    // Plain-text body.
    const textLines: string[] = [
      'Good morning Todd — the weekly setup window is open (the Flex list goes live to members today, Thursday).',
      '',
      `For ${setup.weekLabel}:`,
      '',
    ];
    if (allReady) {
      textLines.push('Everything is set — Box, Flex, and Market all have items for next week. Nothing to do.');
    } else {
      textLines.push('These still need setting:');
      for (const item of missing) {
        const what =
          item.area === 'box'
            ? 'Box — publish next week’s standard box (what members swap from)'
            : item.area === 'flex'
              ? 'Flex — toggle on what you have, set prices/qty (this is also the swap menu)'
              : 'Market — set the farmers-market stall list (units + prices)';
        textLines.push(`  • ${what}`);
        textLines.push(`    ${linkFor(item.href)}`);
      }
      textLines.push('');
      textLines.push('Flex window opens Thursday, closes Tuesday 6 AM.');
    }
    textLines.push('');
    textLines.push(`— Tiny Seed CSA (${dateStr})`);
    const text = textLines.join('\n');

    // HTML body.
    const AREA_BLURB: Record<string, string> = {
      box: 'Publish next week’s standard box — that’s what members swap from.',
      flex: 'Toggle on what you have (add from your archive), set prices &amp; quantities. Your Flex availability is also the swap menu.',
      market: 'Set the farmers-market stall list — units &amp; prices for the week.',
    };

    const bodyHtml = allReady
      ? `<p style="margin:0 0 14px">Everything is set — <b>Box</b>, <b>Flex</b>, and <b>Market</b> all have items for next week. Nothing to do. 🎉</p>`
      : `<p style="margin:0 0 14px">These still need setting for next week:</p>` +
        `<table role="presentation" style="width:100%;border-collapse:collapse;margin:0 0 14px">` +
        missing.map((item) => (
          `<tr><td style="padding:8px 0;border-bottom:1px solid #e5e7eb">` +
          `<p style="margin:0 0 4px;font-weight:700;color:#111827">${escapeHtml(item.label)}</p>` +
          `<p style="margin:0 0 6px;color:#4b5563;font-size:13px">${AREA_BLURB[item.area]}</p>` +
          `<a href="${linkFor(item.href)}" style="display:inline-block;background:#15803d;color:#fff;` +
          `text-decoration:none;padding:7px 14px;border-radius:6px;font-weight:600;font-size:13px">` +
          `Set ${escapeHtml(item.label)} →</a>` +
          `</td></tr>`
        )).join('') +
        `</table>` +
        `<p style="margin:0 0 14px;color:#6b7280;font-size:13px">Flex window opens Thursday, closes Tuesday 6&nbsp;AM.</p>`;

    const html =
      `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;` +
      `max-width:600px;margin:0 auto;color:#1f2937;line-height:1.6">` +
      `<p style="font-size:18px;font-weight:700;margin:0 0 4px;color:#15803d">${escapeHtml(subject)}</p>` +
      `<p style="color:#6b7280;font-size:14px;margin:0 0 16px">${escapeHtml(setup.weekLabel)} · ${dateStr} · America/New_York</p>` +
      `<p style="margin:0 0 14px">Good morning Todd — the weekly setup window is open (the Flex list goes live to members today, Thursday).</p>` +
      bodyHtml +
      `<p style="color:#6b7280;font-size:13px;margin-top:24px">` +
      `Automated weekly reminder from /api/cron/flex-list-reminder.</p>` +
      `</div>`;

    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: RESEND_FROM_EMAIL,
        to: [REMINDER_TO],
        subject,
        text,
        html,
      }),
    });

    if (!resp.ok) {
      const detail = await resp.text().catch(() => '');
      console.error(
        `[flex-list-reminder] Resend send failed (HTTP ${resp.status}): ${detail.slice(0, 300)}`
      );
      return { ok: false, detail: `resend_http_${resp.status}` };
    }
    return { ok: true, detail: 'sent' };
  } catch (e) {
    console.error('[flex-list-reminder] sendReminderEmail threw (swallowed):', e);
    return { ok: false, detail: 'threw' };
  }
}

async function handle(request: Request): Promise<Response> {
  const denial = checkAuth(request);
  if (denial) return denial;

  const ranAt = new Date().toISOString();

  // Resolve the box/flex/market readiness for the upcoming cycle (the SAME
  // check the admin-home banner uses). Service-role client — no cookies in
  // cron. If it throws (transient DB issue) we stay fail-soft and skip the
  // send rather than 500 the cron.
  let setup: WeekSetupReadiness | null = null;
  try {
    setup = await resolveWeekSetup(supabaseAdmin, upcomingSetupWeek());
  } catch (e) {
    console.error('[flex-list-reminder] resolveWeekSetup threw (swallowed):', e);
  }

  const emailOutcome = setup
    ? await sendReminderEmail(setup)
    : { ok: false, detail: 'readiness_unavailable' };

  // Best-effort audit row so admin/sync can correlate runs. Fail-soft — a
  // logging hiccup must not change the response.
  try {
    await supabaseAdmin.from('notification_log').insert({
      channel: 'email',
      notification_type: 'flex_list_reminder',
      recipient: REMINDER_TO,
      status: emailOutcome.ok ? 'sent' : 'failed',
      provider: 'resend',
      subject: 'Set up next week (box · flex · market)',
      template: 'flex-list-reminder',
      error_message: emailOutcome.ok ? null : emailOutcome.detail,
      metadata: {
        ranAt,
        week: setup?.week ?? null,
        missing: setup?.missing.map((m) => m.area) ?? null,
        all_ready: setup?.allReady ?? null,
      } as unknown as Database['public']['Tables']['notification_log']['Row']['metadata'],
    });
  } catch (e) {
    console.error('[flex-list-reminder] notification_log insert threw:', e);
  }

  return jsonResponse({
    ok: true,
    week: setup?.week ?? null,
    missing: setup?.missing.map((m) => m.area) ?? null,
    all_ready: setup?.allReady ?? null,
    email_outcome: emailOutcome,
    ran_at: ranAt,
  });
}

export const GET: APIRoute = ({ request }) => handle(request);
export const POST: APIRoute = ({ request }) => handle(request);
