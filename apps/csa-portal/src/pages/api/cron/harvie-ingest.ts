/**
 * GET|POST /api/cron/harvie-ingest   (cron-triggered, NOT user-facing)
 *
 * MONDAY auto-import of the weekly Harvie purchase order out of Gmail.
 *
 * Every Monday the Harvie PO email lands ~11:00–12:00 ET (sender
 * noreply@procurementexpress.com, subject "New Purchase Order <n> | Harvie
 * Pittsburgh …") with the PO PDF attached. This cron:
 *
 *   1. Refreshes a Gmail access token and searches for recent Harvie PO messages.
 *   2. Downloads + parses each PDF (unpdf → parseWholesalePdf → vendor 'harvie').
 *   3. Resolves product mappings from vendor_product_map.
 *   4. Commits via the SHARED lib with onExisting:'skip' — a PO that already
 *      exists (a prior tick this Monday, or a manual upload) is LEFT UNTOUCHED.
 *   5. Notifies Todd (Resend, fail-soft) + writes a notification_log row.
 *
 * ── EXTRACTION (2026-07-06) ──────────────────────────────────────────
 * The engine now lives in lib/harvie-ingest.runHarvieIngest() so the SAME
 * search → parse → commit → summary path backs both this cron AND the admin
 * "Check inbox & import now" button (/api/admin/harvie-ingest-now). This file
 * is now just the CRON-authenticated wrapper — the run behavior (Gmail query,
 * skip-if-exists, the exact email copy, the notification_log row) is byte-for-
 * byte what it was before the extraction. The 3× Monday schedule (migration
 * 0074) is unchanged and still safe because step 4 skips any PO already present.
 *
 * FAIL-SOFT CONTRACT: a Gmail outage, a token-refresh failure, or one bad PDF
 * must NOT 500 the cron. runHarvieIngest catches everything and returns an
 * `ok:true` summary; this wrapper serializes it as a 200 JSON response.
 *
 * Auth: same `Authorization: Bearer <CRON_SECRET>` guard as
 * /api/cron/flex-list-reminder. The pg_cron schedule sends the bearer from
 * Supabase Vault.
 */
import type { APIRoute } from 'astro';
import { CRON_SECRET } from 'astro:env/server';
import { runHarvieIngest } from '../../../lib/harvie-ingest';

export const prerender = false;

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

async function handle(request: Request): Promise<Response> {
  const denial = checkAuth(request);
  if (denial) return denial;
  const summary = await runHarvieIngest('cron');
  return jsonResponse(summary);
}

export const GET: APIRoute = ({ request }) => handle(request);
export const POST: APIRoute = ({ request }) => handle(request);
