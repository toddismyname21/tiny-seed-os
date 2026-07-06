/**
 * POST /api/admin/harvie-ingest-now   (admin only)
 *
 * The on-demand "Check inbox & import now" button on the Monday Ops page
 * (/admin/monday). Todd sees the Harvie PO land in his inbox and taps this
 * instead of waiting for the next cron tick (11:45 / 12:45 / 1:45 ET).
 *
 * It runs the EXACT SAME engine as the Monday cron — lib/harvie-ingest.
 * runHarvieIngest — so the Gmail search, PDF parse, skip-if-exists commit,
 * Todd notification, and notification_log audit row are all identical. The
 * only difference is the trigger provenance recorded in the log metadata
 * ('admin' vs 'cron'). Because the commit uses onExisting:'skip', pressing the
 * button after a cron already imported (or twice in a row) is a safe no-op.
 *
 * Auth: requireAdmin + isSameOriginPost (same guards as every other admin
 * mutation). Returns { ok, imported, skipped, detail } as JSON for inline
 * display on the Monday page (plus imported_detail + message_errors for a
 * richer readout). Fail-soft: even a Gmail outage returns ok:true with a
 * human `detail` string rather than a 500.
 */
import type { APIRoute } from 'astro';
import { requireAdmin } from '../../../lib/admin';
import { isSameOriginPost, PORTAL_ORIGIN } from '../../../lib/onboarding';
import { runHarvieIngest, type HarvieIngestSummary } from '../../../lib/harvie-ingest';

export const prerender = false;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

/** Build a short, human sentence for the inline result banner. */
function summarize(s: HarvieIngestSummary): string {
  if (s.error) {
    return `Couldn't check the inbox: ${s.error}. The manual upload still works.`;
  }
  if (s.imported > 0) {
    const refs = s.imported_detail
      .map((p) => p.external_ref ?? p.delivery_date)
      .filter(Boolean)
      .join(', ');
    const noun = s.imported === 1 ? 'order' : 'orders';
    return `Imported ${s.imported} Harvie ${noun}${refs ? ` (PO ${refs})` : ''}.`;
  }
  if (s.message_errors.length > 0) {
    return `Nothing imported — ${s.message_errors.join('; ')}`;
  }
  if (s.skipped > 0) {
    const noun = s.skipped === 1 ? 'order was' : 'orders were';
    return `Nothing new — ${s.skipped} ${noun} already imported.`;
  }
  return 'No new Harvie email found yet. Try again once the PO lands, or upload it manually.';
}

export const POST: APIRoute = async ({ request, locals }) => {
  if (!isSameOriginPost(request, PORTAL_ORIGIN)) {
    return jsonResponse({ ok: false, error: 'forbidden' }, 403);
  }
  const auth = await requireAdmin(locals.supabase, locals.user);
  if (auth.response) return auth.response;

  const summary = await runHarvieIngest('admin');

  return jsonResponse({
    ok: summary.ok,
    imported: summary.imported,
    skipped: summary.skipped,
    detail: summarize(summary),
    imported_detail: summary.imported_detail,
    message_errors: summary.message_errors,
  });
};
