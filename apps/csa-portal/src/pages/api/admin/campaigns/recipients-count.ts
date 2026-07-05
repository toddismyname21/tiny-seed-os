/**
 * GET /api/admin/campaigns/recipients-count
 *
 * Live count for the recipient picker in /admin/campaigns/new.
 *
 * Query params:
 *   share_types        comma-separated TargetableShareType list
 *                      (e.g. "summer_veg,flex"). Required (empty → 0).
 *   newsletter_opt_in  "true" | "false" (default "true")
 *
 * Response: { count, deliverable_count }
 *   - count            raw matches (before TEST_EXCLUDES)
 *   - deliverable_count  what we would actually mail (after excludes)
 *
 * Admin-only via requireAdmin. Uses the cookie-aware client; the admin
 * RLS bypass policy on member_preferences (migration 0017) makes the
 * cross-customer read possible without service-role.
 */
import type { APIRoute } from 'astro';
import { requireAdmin } from '../../../../lib/admin';
import {
  countRecipients,
  normalizeRecipientFilter,
  TARGETABLE_SHARE_TYPES,
  SEGMENT_KINDS,
  type TargetableShareType,
  type SegmentKind,
} from '../../../../lib/campaign';

export const prerender = false;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

export const GET: APIRoute = async ({ url, locals }) => {
  const auth = await requireAdmin(locals.supabase, locals.user);
  if (auth.response) return auth.response;

  const allowed = new Set<TargetableShareType>(TARGETABLE_SHARE_TYPES);
  const rawShares = (url.searchParams.get('share_types') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const shareTypes = rawShares.filter(
    (s): s is TargetableShareType => allowed.has(s as TargetableShareType)
  );

  // newsletter_opt_in defaults to true (the safe / opt-in-respecting case).
  const rawOptIn = url.searchParams.get('newsletter_opt_in');
  const newsletterOptIn = rawOptIn === null ? true : rawOptIn !== 'false';

  // Segment (Phase 2 Wave 2). Absent/unknown → 'active' (legacy model).
  const allowedSegments = new Set<SegmentKind>(SEGMENT_KINDS);
  const rawSegment = url.searchParams.get('segment') ?? '';
  const segment: SegmentKind = allowedSegments.has(rawSegment as SegmentKind)
    ? (rawSegment as SegmentKind)
    : 'active';
  const rawThreshold = url.searchParams.get('weeks_threshold');

  const filter = normalizeRecipientFilter({
    share_types: shareTypes,
    newsletter_opt_in: newsletterOptIn,
    segment,
    renewal_weeks_threshold: rawThreshold ?? undefined,
  });

  const result = await countRecipients(locals.supabase, filter);
  return json({ ok: true, ...result, filter });
};
