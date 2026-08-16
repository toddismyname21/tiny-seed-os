/**
 * POST /api/admin/pack-load/note   (admin only)
 *
 * Resolve ONE owed make-up/notice from the live Pack & Load view, inline,
 * without leaving the page. Two actions:
 *
 *   'fulfill' → the promise was kept this week. Mirrors
 *               /api/admin/notices/[id]/done: status='done',
 *               fulfilled_by=<staff email>, fulfilled_at=now(). Only flips a
 *               still-OPEN notice (idempotent on double-click).
 *
 *   'carry'   → the promise was NOT done this week; push it to the NEXT cycle
 *               week. We set due_week to the Monday AFTER the week being worked
 *               (week_starting + 7) and KEEP status='open' so it re-appears on
 *               next week's pack surfaces. We do NOT mark it done — a carried
 *               promise is still owed.
 *
 * Body (JSON, same-origin fetch):
 *   notice_id        uuid of the member_notices row
 *   action           'fulfill' | 'carry'
 *   week_starting    YYYY-MM-DD Monday of the week being worked (carry uses it
 *                    to compute next week's Monday; snapped to Monday if not)
 *
 * Authorization: isSameOriginPost (CSRF) + requireAdmin (role admin/staff).
 * RLS: notices_staff_all lets the cookie-aware client write member_notices.
 *
 * Returns { ok: true, ... } / { ok: false, error } JSON.
 */
import type { APIRoute } from 'astro';
import { requireAdmin } from '../../../../lib/admin';
import { isSameOriginPost, PORTAL_ORIGIN } from '../../../../lib/onboarding';
import { isMonday, mondayOfWeek, addDays } from '../../../../lib/cycle';

export const prerender = false;

// uuid v4-ish shape guard (matches the notices/done.ts z.uuid() intent without
// pulling zod into this tiny handler).
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

export const POST: APIRoute = async ({ request, locals }) => {
  if (!isSameOriginPost(request, PORTAL_ORIGIN)) {
    return jsonResponse({ ok: false, error: 'forbidden' }, 403);
  }
  const auth = await requireAdmin(locals.supabase, locals.user);
  if (auth.response) return auth.response;
  const ctx = auth.ctx;

  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonResponse({ ok: false, error: 'bad_body' }, 400);
  }

  const notice_id = String(body.notice_id ?? '').trim();
  if (!UUID_RE.test(notice_id)) {
    return jsonResponse({ ok: false, error: 'invalid_notice_id' }, 400);
  }

  const action = String(body.action ?? '').trim();
  if (action !== 'fulfill' && action !== 'carry') {
    return jsonResponse({ ok: false, error: 'invalid_action' }, 400);
  }

  const supabase = locals.supabase;
  const nowIso = new Date().toISOString();

  if (action === 'fulfill') {
    // Mirror notices/done.ts: only flip a still-OPEN notice (idempotent).
    const { data, error } = await supabase
      .from('member_notices')
      .update({
        status: 'done',
        fulfilled_by: ctx.user.email ?? null,
        fulfilled_at: nowIso,
      })
      .eq('id', notice_id)
      .eq('status', 'open')
      .select('id')
      .maybeSingle();

    if (error) {
      console.error('[api/admin/pack-load/note] fulfill failed:', error.message);
      return jsonResponse({ ok: false, error: 'update_failed', detail: error.message }, 500);
    }
    // data === null means already closed/missing — treat as a harmless no-op.
    return jsonResponse({ ok: true, action: 'fulfill', notice_id });
  }

  // action === 'carry': push due_week to NEXT cycle Monday, keep status='open'.
  const weekRaw = String(body.week_starting ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekRaw)) {
    return jsonResponse({ ok: false, error: 'invalid_week' }, 400);
  }
  const week_starting = isMonday(weekRaw) ? weekRaw : mondayOfWeek(weekRaw);
  const next_week = addDays(week_starting, 7); // the next cycle's Monday

  const { data, error } = await supabase
    .from('member_notices')
    .update({
      due_week: next_week,
      // status stays 'open' — a carried promise is still owed.
    })
    .eq('id', notice_id)
    .eq('status', 'open')
    .select('id')
    .maybeSingle();

  if (error) {
    console.error('[api/admin/pack-load/note] carry failed:', error.message);
    return jsonResponse({ ok: false, error: 'update_failed', detail: error.message }, 500);
  }
  return jsonResponse({ ok: true, action: 'carry', notice_id, due_week: next_week });
};
