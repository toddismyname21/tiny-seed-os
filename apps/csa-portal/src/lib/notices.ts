/**
 * member_notices — "notes & notices" the farm promises a member that stay
 * OPEN until the team fulfills them, surfaced WHERE THE TEAM WORKS.
 *
 * Two consumers:
 *   1. The admin Notices page (/admin/notices) — the full list (open grouped
 *      by due week, plus recently completed). General notices (stop_hint NULL)
 *      live ONLY here.
 *   2. The pack sheets (/admin/pack-check + /admin/stop-manifest) — a LOUD
 *      per-stop checkbox block of the OPEN notices that target THAT stop and
 *      are DUE for the rendered week. This is the whole point: "How is my team
 *      going to know to pack the extra mushrooms for market?" (Todd) — the
 *      notice rides on the pack sheet for that stop.
 *
 * Data model (table exists in prod, 18 seeded rows):
 *   id uuid | customer_id uuid→customers (nullable) | title text |
 *   detail text | stop_hint text (a pickup stop NAME, or 'HOME DELIVERY',
 *   or NULL for general) | due_week date|null (week_starting it should be
 *   fulfilled BY; NULL = "next opportunity" → always due) |
 *   status 'open'|'done'|'cancelled' | created_by | created_at |
 *   fulfilled_by | fulfilled_at.
 *
 * RLS: admin/staff can do ALL via their customers.role — the cookie-aware
 * Astro.locals.supabase client (same one resolveCycle uses) reads/writes the
 * whole table for an admin caller. No member-id filter needed.
 *
 * stop_hint contract — the pack-sheet sentinel for home delivery is the
 * literal string 'HOME DELIVERY' (HOME_DELIVERY_HINT). The pack sheets map a
 * home-delivery stop section onto that hint; every other stop matches on its
 * exact stop NAME (case-sensitive, as stored).
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

/** stop_hint value that targets the home-delivery bucket on the pack sheets. */
export const HOME_DELIVERY_HINT = 'HOME DELIVERY';

/** A general notice has no stop target — it shows ONLY on the admin page. */
export type NoticeStatus = 'open' | 'done' | 'cancelled';

export interface MemberNotice {
  id: string;
  customer_id: string | null;
  title: string;
  detail: string | null;
  stop_hint: string | null;
  due_week: string | null;
  status: NoticeStatus;
  created_by: string | null;
  created_at: string;
  fulfilled_by: string | null;
  fulfilled_at: string | null;
}

/** A notice joined with the member's display name (admin list view). */
export interface NoticeWithMember extends MemberNotice {
  member_name: string | null;
}

type NoticeRow = MemberNotice & {
  customer: { contact_name: string | null } | null;
};

const SELECT_WITH_MEMBER =
  'id, customer_id, title, detail, stop_hint, due_week, status, created_by, created_at, fulfilled_by, fulfilled_at, customer:customers ( contact_name )';

function attachMemberName(rows: NoticeRow[]): NoticeWithMember[] {
  return rows.map((r) => {
    const { customer, ...rest } = r;
    return { ...rest, member_name: customer?.contact_name?.trim() || null };
  });
}

/**
 * Whether an OPEN notice is DUE for a given delivery week.
 *   - due_week NULL          → "next opportunity" → due EVERY week (always).
 *   - due_week <= weekMonday  → due (overdue or this week).
 *   - due_week >  weekMonday  → not yet due (a future promise).
 * weekMonday and due_week are both YYYY-MM-DD Mondays; string compare is a
 * correct chronological compare for that fixed format.
 */
export function isNoticeDue(due_week: string | null, weekMonday: string): boolean {
  if (due_week == null) return true;
  return due_week <= weekMonday;
}

/**
 * Explicit alias for `isNoticeDue` that NAMES the overdue semantics at the call
 * site. An OPEN make-up promise must keep showing on every pack surface until
 * status flips to 'done'/'cancelled' — INCLUDING ones whose due_week is in the
 * PAST (a missed make-good that's now overdue) and ones with NO due_week (a
 * "next opportunity" promise). The contract is identical to `isNoticeDue`
 * (open AND due_week <= weekMonday, plus null due_week = always) — this name
 * exists so pack-sheet / pick-pack / harvest read unambiguously and a future
 * editor can't mistake the semantics for "exact current week only". Use THIS on
 * the pack surfaces; `isNoticeDue` remains for the existing callers' contract.
 */
export function isNoticeDueOrOverdue(due_week: string | null, weekMonday: string): boolean {
  return isNoticeDue(due_week, weekMonday);
}

/**
 * Whether an open, due notice is OVERDUE for the rendered week — its due_week is
 * a real date STRICTLY before this week's Monday. (A null due_week is "next
 * opportunity", not overdue; a due_week === weekMonday is due THIS week, not
 * overdue.) The pack surfaces flag overdue make-ups in red so a missed promise
 * is visually distinct from one freshly due this week.
 */
export function isNoticeOverdue(due_week: string | null, weekMonday: string): boolean {
  if (due_week == null) return false;
  return due_week < weekMonday;
}

/**
 * Fetch the OPEN notices that target ANY of the given stop hints AND are DUE
 * for `weekMonday`, in ONE bounded query (in('stop_hint', hints)). The caller
 * (a pack sheet) groups the result by stop_hint itself — we never do a query
 * per stop. Returns [] on error (the pack sheet still prints; a notice block
 * is additive, never blocking) after logging.
 *
 * `hints` is the set of stop NAMES being rendered, PLUS HOME_DELIVERY_HINT
 * when a home-delivery section is on the sheet. Empty `hints` short-circuits
 * (PostgREST rejects an empty .in([])).
 */
export async function fetchDueNoticesForStops(
  supabase: SupabaseClient<Database>,
  hints: string[],
  weekMonday: string,
): Promise<MemberNotice[]> {
  const distinctHints = Array.from(new Set(hints.filter((h) => h && h.length > 0)));
  if (distinctHints.length === 0) return [];

  const { data, error } = await supabase
    .from('member_notices')
    .select(
      'id, customer_id, title, detail, stop_hint, due_week, status, created_by, created_at, fulfilled_by, fulfilled_at',
    )
    .eq('status', 'open')
    .in('stop_hint', distinctHints)
    .order('created_at', { ascending: true })
    .overrideTypes<MemberNotice[], { merge: false }>();

  if (error) {
    console.error('[notices] fetchDueNoticesForStops failed:', error.message);
    return [];
  }
  return (data ?? []).filter((n) => isNoticeDue(n.due_week, weekMonday));
}

/**
 * Like `fetchDueNoticesForStops`, but JOINS the member's display name so a pack
 * surface can render "Denise Fazio — owed double mushroom" explicitly (rather
 * than relying on the title carrying the name). Same bounded single-query shape
 * (one in('stop_hint', hints)), same overdue-persisting filter
 * (`isNoticeDueOrOverdue`), same [] on error. Used by /admin/pack-sheet's TOP
 * make-ups banner. The existing name-less fetch stays for pack-check /
 * stop-manifest (they print the title verbatim) — no caller is changed.
 */
export async function fetchDueNoticesWithMemberForStops(
  supabase: SupabaseClient<Database>,
  hints: string[],
  weekMonday: string,
): Promise<NoticeWithMember[]> {
  const distinctHints = Array.from(new Set(hints.filter((h) => h && h.length > 0)));
  if (distinctHints.length === 0) return [];

  const { data, error } = await supabase
    .from('member_notices')
    .select(SELECT_WITH_MEMBER)
    .eq('status', 'open')
    .in('stop_hint', distinctHints)
    .order('due_week', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true })
    .overrideTypes<NoticeRow[], { merge: false }>();

  if (error) {
    console.error('[notices] fetchDueNoticesWithMemberForStops failed:', error.message);
    return [];
  }
  return attachMemberName(data ?? []).filter((n) => isNoticeDueOrOverdue(n.due_week, weekMonday));
}

/**
 * Fetch EVERY open make-up due/overdue for the week — across ALL stops AND
 * general (stop_hint NULL) notices — with member name, for the upstream
 * "make-ups to add" subtotal on the harvest / pick-pack / pack-sheet pages.
 *
 * WHY this is unbounded by stop (unlike the pack-sheet banner): the harvest +
 * pick-pack lists drive WHAT THE CREW HARVESTS. If the farm owes a member a
 * double mushroom, the crew must pick that extra mushroom REGARDLESS of which
 * stop the member is on — a general (NULL stop_hint) promise still consumes
 * product. So the additive accounting counts ALL open + due/overdue notices.
 * Returns [] on error (the subtotal is additive, never blocks the page).
 */
export async function fetchAllOpenDueNoticesWithMember(
  supabase: SupabaseClient<Database>,
  weekMonday: string,
): Promise<NoticeWithMember[]> {
  const { data, error } = await supabase
    .from('member_notices')
    .select(SELECT_WITH_MEMBER)
    .eq('status', 'open')
    .order('due_week', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true })
    .overrideTypes<NoticeRow[], { merge: false }>();

  if (error) {
    console.error('[notices] fetchAllOpenDueNoticesWithMember failed:', error.message);
    return [];
  }
  return attachMemberName(data ?? []).filter((n) => isNoticeDueOrOverdue(n.due_week, weekMonday));
}

/**
 * Group a flat list of due notices by stop_hint into a Map keyed by the exact
 * hint string. The pack sheet then reads map.get(stopName) for a pickup stop
 * or map.get(HOME_DELIVERY_HINT) for the home-delivery section. NULL hints
 * can't appear here (the fetch filters status='open' AND in(hints), and the
 * pack sheet never passes NULL as a hint).
 */
export function groupNoticesByHint<T extends MemberNotice>(notices: T[]): Map<string, T[]> {
  const byHint = new Map<string, T[]>();
  for (const n of notices) {
    if (!n.stop_hint) continue;
    const arr = byHint.get(n.stop_hint);
    if (arr) arr.push(n);
    else byHint.set(n.stop_hint, [n]);
  }
  return byHint;
}

/**
 * Fetch ALL OPEN notices (any stop_hint, incl. NULL general ones) with the
 * member's name, for the admin Notices page. Ordered so NULL due_week (always
 * due) sorts last after dated ones; within that, oldest due first.
 */
export async function fetchOpenNoticesWithMember(
  supabase: SupabaseClient<Database>,
): Promise<NoticeWithMember[]> {
  const { data, error } = await supabase
    .from('member_notices')
    .select(SELECT_WITH_MEMBER)
    .eq('status', 'open')
    .order('due_week', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true })
    .overrideTypes<NoticeRow[], { merge: false }>();

  if (error) {
    console.error('[notices] fetchOpenNoticesWithMember failed:', error.message);
    return [];
  }
  return attachMemberName(data ?? []);
}

/**
 * Fetch the most recently COMPLETED notices (status='done'), newest-fulfilled
 * first, capped at `limit`, with member name — the admin "Recently completed"
 * section.
 */
export async function fetchRecentDoneNotices(
  supabase: SupabaseClient<Database>,
  limit = 20,
): Promise<NoticeWithMember[]> {
  const { data, error } = await supabase
    .from('member_notices')
    .select(SELECT_WITH_MEMBER)
    .eq('status', 'done')
    .order('fulfilled_at', { ascending: false, nullsFirst: false })
    .limit(limit)
    .overrideTypes<NoticeRow[], { merge: false }>();

  if (error) {
    console.error('[notices] fetchRecentDoneNotices failed:', error.message);
    return [];
  }
  return attachMemberName(data ?? []);
}

/**
 * Bucket OPEN notices for the admin list into overdue / this-week / upcoming /
 * someday, relative to the current cycle Monday. Buckets are mutually
 * exclusive and ordered for display (overdue first, "someday" = NULL due_week
 * last). Within each bucket the input order (oldest-due-first) is preserved.
 */
export type NoticeBucketKey = 'overdue' | 'this_week' | 'upcoming' | 'someday';

export interface NoticeBucket {
  key: NoticeBucketKey;
  label: string;
  notices: NoticeWithMember[];
}

export function bucketOpenNotices(
  notices: NoticeWithMember[],
  thisWeekMonday: string,
): NoticeBucket[] {
  const overdue: NoticeWithMember[] = [];
  const thisWeek: NoticeWithMember[] = [];
  const upcoming: NoticeWithMember[] = [];
  const someday: NoticeWithMember[] = [];

  for (const n of notices) {
    if (n.due_week == null) someday.push(n);
    else if (n.due_week < thisWeekMonday) overdue.push(n);
    else if (n.due_week === thisWeekMonday) thisWeek.push(n);
    else upcoming.push(n);
  }

  return [
    { key: 'overdue' as const, label: 'Overdue', notices: overdue },
    { key: 'this_week' as const, label: 'Due this week', notices: thisWeek },
    { key: 'upcoming' as const, label: 'Upcoming', notices: upcoming },
    { key: 'someday' as const, label: 'No date (next opportunity)', notices: someday },
  ].filter((b) => b.notices.length > 0);
}
