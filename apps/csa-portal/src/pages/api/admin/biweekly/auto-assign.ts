/**
 * /api/admin/biweekly/auto-assign
 *
 * Two modes:
 *   GET  ?preview=1   → returns AssignmentPreview JSON (no writes)
 *   POST              → commits the assignment (writes to members.biweekly_week)
 *
 * Algorithm: see lib/biweekly-assign.ts
 *   1. Pull all members with status='active' AND cadence='biweekly' AND
 *      biweekly_week IS NULL (migration 0073 — only genuinely biweekly
 *      members need an A/B parity; a WEEKLY member with a NULL week is NOT
 *      "unassigned" and must never be auto-assigned a parity)
 *   2. Pull current Week A/B counts grouped by pickup_location_id
 *   3. computeAssignments() → Map<member_id, 'A'|'B'>
 *   4. (POST only) UPDATE every assigned member in chunks of 200
 *   5. Return the per-location preview + totals.
 *
 * Why chunks of 200: Supabase + PostgREST handle large IN() lists
 * fine, but a single .update().in('id', […]) sets every row to the
 * *same* week — we need per-row values. We could do a SQL CASE/WHEN
 * RPC, but that requires a migration. Instead we fan out one .update()
 * per (id, week) pair, in parallel. For 197 members that's ~200 small
 * UPDATEs — fast enough (<5s) and trivially idempotent on retry.
 *
 * Authorization:
 *   - requireAdmin() — verifies admin/staff role on customers row.
 *   - isSameOriginPost() — CSRF defense in depth for POST.
 *
 * RLS:
 *   - admin_all_members policy (migration 0017) lets the cookie-aware
 *     client SELECT every member row and UPDATE any of them.
 *   - audit_log trigger captures Todd's email on every UPDATE.
 *
 * Idempotency: re-running this endpoint after a successful run does
 * nothing — there are no more unassigned members to process.
 */
import type { APIRoute } from 'astro';
import { requireAdmin } from '../../../../lib/admin';
import { isSameOriginPost, PORTAL_ORIGIN } from '../../../../lib/onboarding';
import {
  buildPreview,
  computeAssignments,
  type AssignmentPreview,
  type LocationCurrent,
  type MemberToAssign,
} from '../../../../lib/biweekly-assign';

export const prerender = false;

interface PostResult {
  ok: true;
  assigned: { to_a: number; to_b: number; total: number };
  by_location: AssignmentPreview['byLocation'];
}

interface ErrorResult {
  ok: false;
  error: string;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

// ─── Shared loader: build the (unassigned + current + names) bundle ──
async function loadState(supabase: App.Locals['supabase']): Promise<
  | { ok: true; unassigned: MemberToAssign[]; current: LocationCurrent[]; names: Map<string, string> }
  | { ok: false; error: string }
> {
  // 1. Unassigned active BIWEEKLY members (migration 0073). A weekly member
  //    with a NULL biweekly_week is NOT unassigned — cadence='biweekly' is the
  //    gate so we never stamp an A/B parity onto a weekly member.
  type UnassignedRow = { id: string; pickup_location_id: string | null; legacy_id: string | null };
  const { data: unassignedData, error: unassignedErr } = await supabase
    .from('members')
    .select('id, pickup_location_id, legacy_id')
    .eq('status', 'active')
    .eq('cadence', 'biweekly')
    .is('biweekly_week', null)
    .overrideTypes<UnassignedRow[], { merge: false }>();

  if (unassignedErr) {
    console.error('[api/admin/biweekly/auto-assign] unassigned fetch failed:', unassignedErr.message);
    return { ok: false, error: 'fetch_failed' };
  }
  const unassigned: MemberToAssign[] = (unassignedData ?? []).map((r) => ({
    id: r.id,
    pickup_location_id: r.pickup_location_id,
    legacy_id: r.legacy_id,
  }));

  // 2. Current A/B counts (active members per location).
  //    We pull every active member's (pickup_location_id, biweekly_week)
  //    and roll them up in JS — Supabase PostgREST doesn't expose a
  //    GROUP BY aggregate that's friendlier than this for our size.
  type CountRow = { pickup_location_id: string | null; biweekly_week: 'A' | 'B' | null };
  const { data: countData, error: countErr } = await supabase
    .from('members')
    .select('pickup_location_id, biweekly_week')
    .eq('status', 'active')
    .overrideTypes<CountRow[], { merge: false }>();

  if (countErr) {
    console.error('[api/admin/biweekly/auto-assign] count fetch failed:', countErr.message);
    return { ok: false, error: 'fetch_failed' };
  }

  const countMap = new Map<string | null, { a: number; b: number }>();
  for (const row of countData ?? []) {
    if (row.biweekly_week !== 'A' && row.biweekly_week !== 'B') continue;
    const cur = countMap.get(row.pickup_location_id) ?? { a: 0, b: 0 };
    if (row.biweekly_week === 'A') cur.a += 1;
    else cur.b += 1;
    countMap.set(row.pickup_location_id, cur);
  }
  const current: LocationCurrent[] = Array.from(countMap.entries()).map(([loc, c]) => ({
    pickup_location_id: loc,
    current_a: c.a,
    current_b: c.b,
  }));

  // 3. Pickup-location names for the preview.
  type LocNameRow = { id: string; name: string };
  const { data: locData, error: locErr } = await supabase
    .from('pickup_locations')
    .select('id, name')
    .overrideTypes<LocNameRow[], { merge: false }>();

  if (locErr) {
    console.error('[api/admin/biweekly/auto-assign] location fetch failed:', locErr.message);
    return { ok: false, error: 'fetch_failed' };
  }
  const names = new Map<string, string>();
  for (const l of locData ?? []) names.set(l.id, l.name);

  return { ok: true, unassigned, current, names };
}

// ─── GET: preview ───────────────────────────────────────────────────
export const GET: APIRoute = async ({ url, locals }) => {
  const auth = await requireAdmin(locals.supabase, locals.user);
  if (auth.response) return auth.response;

  if (url.searchParams.get('preview') !== '1') {
    return jsonResponse({ ok: false, error: 'preview query param required' } satisfies ErrorResult, 400);
  }

  const state = await loadState(locals.supabase);
  if (!state.ok) {
    return jsonResponse({ ok: false, error: state.error } satisfies ErrorResult, 500);
  }

  const preview = buildPreview(state.unassigned, state.current, state.names);
  return jsonResponse({ ok: true, ...preview });
};

// ─── POST: commit ────────────────────────────────────────────────────
export const POST: APIRoute = async ({ request, locals }) => {
  if (!isSameOriginPost(request, PORTAL_ORIGIN)) {
    return jsonResponse({ ok: false, error: 'forbidden' } satisfies ErrorResult, 403);
  }

  const auth = await requireAdmin(locals.supabase, locals.user);
  if (auth.response) return auth.response;

  const state = await loadState(locals.supabase);
  if (!state.ok) {
    return jsonResponse({ ok: false, error: state.error } satisfies ErrorResult, 500);
  }

  if (state.unassigned.length === 0) {
    // Nothing to do. Return a clean success with all-zero counts.
    return jsonResponse({
      ok: true,
      assigned: { to_a: 0, to_b: 0, total: 0 },
      by_location: [],
    } satisfies PostResult);
  }

  const assignments = computeAssignments(state.unassigned, state.current);

  // ─── Commit: bucket member ids by week, do TWO UPDATEs total ─────
  // Both Week A and Week B get a single .update().in('id', […]) call —
  // this is much faster than per-row UPDATEs, and Postgres handles
  // ~200-element IN() lists trivially. Audit trigger fires once per
  // row.
  const aIds: string[] = [];
  const bIds: string[] = [];
  for (const [id, week] of assignments) {
    if (week === 'A') aIds.push(id);
    else bIds.push(id);
  }

  const now = new Date().toISOString();

  // Run in parallel — each .update() with a different value, scoped
  // to the right IN-list. RLS lets admin write any member row.
  const [aRes, bRes] = await Promise.all([
    aIds.length > 0
      ? locals.supabase
          .from('members')
          .update({ biweekly_week: 'A', updated_at: now })
          .in('id', aIds)
      : Promise.resolve({ error: null }),
    bIds.length > 0
      ? locals.supabase
          .from('members')
          .update({ biweekly_week: 'B', updated_at: now })
          .in('id', bIds)
      : Promise.resolve({ error: null }),
  ]);

  if (aRes.error || bRes.error) {
    console.error(
      '[api/admin/biweekly/auto-assign] update failed:',
      aRes.error?.message ?? '',
      bRes.error?.message ?? ''
    );
    return jsonResponse({ ok: false, error: 'update_failed' } satisfies ErrorResult, 500);
  }

  const preview = buildPreview(state.unassigned, state.current, state.names);
  return jsonResponse({
    ok: true,
    assigned: { to_a: aIds.length, to_b: bIds.length, total: aIds.length + bIds.length },
    by_location: preview.byLocation,
  } satisfies PostResult);
};
