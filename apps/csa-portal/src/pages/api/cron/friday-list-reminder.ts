/**
 * GET|POST /api/cron/friday-list-reminder   (SUPERSEDED — harmless no-op)
 *
 * This Monday-afternoon "send the Friday wholesale list" nudge to Todd was
 * replaced by the REVIEW → CONFIRM → SEND gate (Todd, 2026-07-10). Its pg_cron
 * job (`csa-friday-list-reminder`, migration 0076) is UNSCHEDULED by migration
 * 0082; the new reminders live in /api/cron/fresh-sheet-reminder?period=wed|fri
 * (Thu + Mon 20:00 UTC), which link Todd to the /admin/wholesale/fresh-sheet
 * review page where he confirms before anything goes to chefs.
 *
 * The endpoint file is kept as a HARMLESS no-op (behind the same Bearer
 * CRON_SECRET auth) so that if the old job is somehow still armed anywhere it
 * sends nothing and simply reports that it was superseded. No email, no writes.
 */
import type { APIRoute } from 'astro';
import { CRON_SECRET } from 'astro:env/server';

export const prerender = false;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

function checkAuth(request: Request): Response | null {
  const expected = CRON_SECRET;
  if (!expected) return jsonResponse({ ok: false, error: 'cron_secret_not_configured' }, 500);
  const header = request.headers.get('authorization') ?? '';
  const m = /^Bearer\s+(.+)$/i.exec(header);
  const provided = m?.[1]?.trim() ?? '';
  if (provided.length === 0 || provided !== expected) {
    return jsonResponse({ ok: false, error: 'unauthorized' }, 401);
  }
  return null;
}

function handle(request: Request): Response {
  const denial = checkAuth(request);
  if (denial) return denial;
  return jsonResponse({
    ok: true,
    superseded: true,
    note: 'Replaced by /api/cron/fresh-sheet-reminder?period=wed|fri (REVIEW → CONFIRM → SEND gate). No email sent.',
    ran_at: new Date().toISOString(),
  });
}

export const GET: APIRoute = ({ request }) => handle(request);
export const POST: APIRoute = ({ request }) => handle(request);
