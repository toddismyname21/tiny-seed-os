/**
 * GET|POST /api/cron/flex-list-reminder   (cron-triggered, NOT user-facing)
 *
 * Weekly nudge to Todd to refresh the Farm Flex (extras) catalog before the
 * member ordering window opens. The flex list OPENS the prior Thursday 00:00
 * ET (Todd 2026-06-17), so this fires Thursday morning ET — the day the list
 * goes live — to remind him to load that week's items/photos/quantities.
 *
 * One short, plain email via Resend to the farm owner with a direct link to
 * the catalog editor (/admin/flex-inventory). No DB work, no member-facing
 * surface — purely an operational reminder.
 *
 * Auth: same `Authorization: Bearer <CRON_SECRET>` pattern as
 * /api/cron/nightly-health and /api/sync/shopify-orders. Vercel cron jobs
 * include this header automatically when the CRON_SECRET env var is set.
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

export const prerender = false;

/** Email destination for the weekly reminder. Hardcoded — operational nudge,
 *  not member-facing. */
const REMINDER_TO = 'todd@tinyseedfarmpgh.com';

/** Direct link to the flex catalog editor (the page where the weekly flex
 *  list / store items are added and edited). Production origin. */
const FLEX_EDITOR_URL = 'https://csa.tinyseedfarm.com/admin/flex-inventory';

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

async function sendReminderEmail(): Promise<{ ok: boolean; detail: string }> {
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

    const subject = 'Update this week’s Farm Flex list';

    const text = [
      'Good morning Todd — the Flex list goes live to members today (Thursday).',
      '',
      'Please update this week’s flex list: add the items, photos, prices, and',
      'quantities members can order. The ordering window opens Thursday and closes',
      'Tuesday 8 AM.',
      '',
      `Edit the list here: ${FLEX_EDITOR_URL}`,
      '',
      `— Tiny Seed CSA (${dateStr})`,
    ].join('\n');

    const html =
      `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;` +
      `max-width:600px;margin:0 auto;color:#1f2937;line-height:1.6">` +
      `<p style="font-size:18px;font-weight:700;margin:0 0 4px;color:#15803d">Update this week’s Farm Flex list</p>` +
      `<p style="color:#6b7280;font-size:14px;margin:0 0 16px">${dateStr} · America/New_York</p>` +
      `<p style="margin:0 0 14px">Good morning Todd — the Flex list goes live to members today (Thursday).</p>` +
      `<p style="margin:0 0 14px">Please add this week’s items, photos, prices, and quantities. ` +
      `The ordering window opens Thursday and closes Tuesday 8&nbsp;AM.</p>` +
      `<p style="margin:20px 0 0">` +
      `<a href="${FLEX_EDITOR_URL}" style="display:inline-block;background:#15803d;color:#fff;` +
      `text-decoration:none;padding:10px 20px;border-radius:8px;font-weight:600;font-size:14px">` +
      `Edit the Flex list</a></p>` +
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
  const emailOutcome = await sendReminderEmail();

  // Best-effort audit row so admin/sync can correlate runs. Fail-soft — a
  // logging hiccup must not change the response.
  try {
    await supabaseAdmin.from('notification_log').insert({
      channel: 'email',
      notification_type: 'flex_list_reminder',
      recipient: REMINDER_TO,
      status: emailOutcome.ok ? 'sent' : 'failed',
      provider: 'resend',
      subject: 'Update this week’s Farm Flex list',
      template: 'flex-list-reminder',
      error_message: emailOutcome.ok ? null : emailOutcome.detail,
      metadata: { ranAt } as unknown as Database['public']['Tables']['notification_log']['Row']['metadata'],
    });
  } catch (e) {
    console.error('[flex-list-reminder] notification_log insert threw:', e);
  }

  return jsonResponse({
    ok: true,
    email_outcome: emailOutcome,
    ran_at: ranAt,
  });
}

export const GET: APIRoute = ({ request }) => handle(request);
export const POST: APIRoute = ({ request }) => handle(request);
