/**
 * GET /api/admin/reports/[name].csv
 *
 * Streams a CSV report. Known reports (the [name] route slug):
 *   - members.csv                       — full filtered members table
 *   - active-members-by-share.csv       — grouped counts by season/share/size
 *   - churn-risk.csv                    — active, last_order > 60 days
 *   - pickup-attendance.csv             — last 8 weeks of attendance
 *
 * Filtering: members.csv accepts the same q/status/share_type/pickup_location
 * params as the page UI, so what the admin sees in the filtered table is
 * what they get in the CSV.
 *
 * Output:
 *   - text/csv with Content-Disposition: attachment; filename="<name>.csv"
 *   - Header row, then quoted-as-needed data rows
 *   - UTF-8 BOM prefix so Excel opens cleanly without garbling
 *
 * No streaming for now — we buffer the result. At our scale (≤500 members,
 * ≤8 attendance rows, ≤30 share-counts) a single response payload is
 * < 100 KB. Worth revisiting if reports balloon.
 */
import type { APIRoute } from 'astro';
import { requireAdmin } from '../../../../lib/admin';
import {
  filtersFor,
  parseBucketId,
  LARGE_SIZES,
  SMALL_SIZES,
} from '../../../../lib/share-buckets';

export const prerender = false;

const CSV_HEADERS: Record<string, string[]> = {
  'members': [
    'member_id', 'legacy_id', 'name', 'email', 'phone',
    'share_type', 'share_size', 'season', 'status',
    'weeks_remaining', 'total_weeks', 'pickup_location', 'pickup_day',
    'delivery_address', 'created_at',
  ],
  'active-members-by-share': ['season', 'share_type', 'share_size', 'count'],
  'churn-risk': [
    'member_id', 'name', 'email', 'phone',
    'share_type', 'share_size', 'season',
    'weeks_remaining', 'last_order_date', 'days_since_last_order', 'total_orders',
  ],
  'pickup-attendance': ['week_date', 'tracked', 'picked_up', 'missed', 'rate_pct'],
};

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (s.length === 0) return '';
  // Quote if contains comma, quote, newline, or starts with leading space.
  if (/[",\r\n]/.test(s) || s.startsWith(' ')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function rowsToCsv(headers: string[], rows: unknown[][]): string {
  const headerLine = headers.map(csvEscape).join(',');
  const dataLines = rows.map((row) => row.map(csvEscape).join(','));
  // UTF-8 BOM so Excel doesn't mangle accented characters
  return '﻿' + [headerLine, ...dataLines].join('\r\n') + '\r\n';
}

function csvResponse(filename: string, body: string): Response {
  return new Response(body, {
    status: 200,
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="${filename}"`,
      'cache-control': 'private, no-store',
    },
  });
}

function notFound(): Response {
  return new Response('Unknown report', {
    status: 404,
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  });
}

export const GET: APIRoute = async ({ url, locals, params }) => {
  const auth = await requireAdmin(locals.supabase, locals.user);
  if (auth.response) return auth.response;

  // The slug from /api/admin/reports/<name>.csv arrives as `name=<name>.csv`
  // because Astro's dynamic-segment matcher treats the dot as part of the
  // filename. Strip the `.csv` suffix to get the canonical key.
  const slug = (params.name ?? '').replace(/\.csv$/, '');
  const headers = CSV_HEADERS[slug];
  if (!headers) return notFound();

  // ─── members.csv ────────────────────────────────────────────────────
  if (slug === 'members') {
    const q = (url.searchParams.get('q') ?? '').trim();
    // Default status follows the page (2026-06-04 redesign): 'active' unless
    // the URL explicitly asks for something else. Old links carrying
    // status=all keep working.
    const status = url.searchParams.get('status') ?? 'active';
    const pickupFilter = url.searchParams.get('pickup_location') ?? 'all';

    // share_types (plural, comma-sep) is the new multi-select param the
    // page uses. Legacy share_type (single) is still accepted for back-
    // compat with old CSV download links / saved searches. When NEITHER
    // is present we fall back to the page's default set (all except
    // add_on) so the download matches what's on screen.
    type ShareTypeEnum = 'spring_veg' | 'summer_veg' | 'fall_veg' | 'flower' | 'flex' | 'add_on' | 'wholesale_csa';
    const ALL_SHARE_TYPES: ShareTypeEnum[] = [
      'spring_veg', 'summer_veg', 'fall_veg', 'flower', 'flex', 'add_on', 'wholesale_csa',
    ];
    const DEFAULT_SHARE_TYPES: ShareTypeEnum[] = [
      'spring_veg', 'summer_veg', 'fall_veg', 'flower', 'flex', 'wholesale_csa',
    ];
    let shareTypes: ShareTypeEnum[];
    const rawMulti = url.searchParams.get('share_types');
    const legacy = url.searchParams.get('share_type');
    if (rawMulti !== null) {
      if (rawMulti === 'all') {
        shareTypes = ALL_SHARE_TYPES.slice();
      } else {
        const set = new Set<ShareTypeEnum>();
        for (const tok of rawMulti.split(',')) {
          const t = tok.trim();
          if ((ALL_SHARE_TYPES as string[]).includes(t)) set.add(t as ShareTypeEnum);
        }
        shareTypes = Array.from(set);
      }
    } else if (legacy && legacy !== 'all' && (ALL_SHARE_TYPES as string[]).includes(legacy)) {
      shareTypes = [legacy as ShareTypeEnum];
    } else if (legacy === 'all') {
      shareTypes = ALL_SHARE_TYPES.slice();
    } else {
      shareTypes = DEFAULT_SHARE_TYPES.slice();
    }

    let query = locals.supabase
      .from('members')
      .select(`
        id, legacy_id, share_type, share_size, season, status,
        weeks_remaining, total_weeks, pickup_location_id, pickup_day,
        delivery_address, created_at,
        customer:customers!inner(contact_name, email, phone),
        pickup_location:pickup_locations(name)
      `);
    // Same enum cast pattern as the page route — see /admin/members/index.astro.
    type MemberStatus = 'active' | 'inactive' | 'paused' | 'pending' | 'cancelled' | 'lapsed' | 'onboarding' | 'expired';
    if (status !== 'all') query = query.eq('status', status as MemberStatus);
    if (shareTypes.length > 0 && shareTypes.length < ALL_SHARE_TYPES.length) {
      query = query.in('share_type', shareTypes);
    }
    // share_bucket filter — kept in lock-step with /admin/members/index.astro
    // so the CSV download matches what's on screen.
    const shareBucket = parseBucketId(url.searchParams.get('share_bucket'));
    if (shareBucket === 'unknown') {
      const knownSizes = [...SMALL_SIZES, ...LARGE_SIZES];
      query = query
        .in('share_type', ['summer_veg', 'flower'] as ShareTypeEnum[])
        .or(`share_size.is.null,share_size.not.in.(${knownSizes.join(',')})`);
    } else if (shareBucket) {
      const f = filtersFor(shareBucket);
      if (f.share_type) query = query.eq('share_type', f.share_type as ShareTypeEnum);
      if (f.share_size_in && f.share_size_in.length > 0) {
        type ShareSizeEnum = 'small' | 'regular' | 'family' | 'petite' | 'large' | 'light' | 'full' | 'half' | 'quarter' | 'single' | 'double';
        query = query.in('share_size', f.share_size_in as ShareSizeEnum[]);
      }
      if (f.biweekly_week_is_null) query = query.is('biweekly_week', null);
      if (typeof f.biweekly_week_eq === 'string') query = query.eq('biweekly_week', f.biweekly_week_eq);
    }
    if (pickupFilter === 'home_delivery') query = query.is('pickup_location_id', null);
    else if (pickupFilter !== 'all') query = query.eq('pickup_location_id', pickupFilter);
    if (q.length > 0) {
      // SEARCH (FIX 2026-06-08) — mirrors /admin/members/index.astro. The old
      // top-level `.or()` mixing embedded `customer.*` columns with the base
      // `legacy_id` column made PostgREST fail to parse the logic tree, so a
      // CSV export with an active search erred out / returned nothing. Resolve
      // matching customer IDs first, then OR `customer_id IN (…)` with the
      // member's own legacy_id — both plain base columns.
      const safe = q.replace(/[%,]/g, '\\$&');
      const { data: matchedCustomers, error: custSearchError } = await locals.supabase
        .from('customers')
        .select('id')
        .or(`contact_name.ilike.%${safe}%,email.ilike.%${safe}%,legacy_id.ilike.%${safe}%`)
        .limit(5000);
      if (custSearchError) {
        console.error('[reports/members.csv] customer search failed:', custSearchError.message);
      }
      const matchedCustomerIds = (matchedCustomers ?? []).map((c) => c.id);
      const orClauses: string[] = [`legacy_id.ilike.%${safe}%`];
      if (matchedCustomerIds.length > 0) {
        orClauses.push(`customer_id.in.(${matchedCustomerIds.join(',')})`);
      }
      query = query.or(orClauses.join(','));
    }
    query = query.order('created_at', { ascending: false }).limit(5000);

    type Row = {
      id: string;
      legacy_id: string | null;
      share_type: string;
      share_size: string | null;
      season: string;
      status: string;
      weeks_remaining: number;
      total_weeks: number;
      pickup_location_id: string | null;
      pickup_day: string | null;
      delivery_address: string | null;
      created_at: string;
      customer: { contact_name: string; email: string; phone: string | null } | null;
      pickup_location: { name: string } | null;
    };
    const { data, error } = await query.overrideTypes<Row[], { merge: false }>();
    if (error) {
      console.error('[api/admin/reports/members.csv]', error.message);
      return new Response('internal error', { status: 500 });
    }
    const rows = (data ?? []).map((r) => [
      r.id,
      r.legacy_id ?? '',
      r.customer?.contact_name ?? '',
      r.customer?.email ?? '',
      r.customer?.phone ?? '',
      r.share_type,
      r.share_size ?? '',
      r.season,
      r.status,
      r.weeks_remaining,
      r.total_weeks,
      r.pickup_location?.name ?? '',
      r.pickup_day ?? '',
      r.delivery_address ?? '',
      r.created_at,
    ]);
    return csvResponse('members.csv', rowsToCsv(headers, rows));
  }

  // ─── active-members-by-share.csv ────────────────────────────────────
  if (slug === 'active-members-by-share') {
    const { data, error } = await locals.supabase
      .from('members')
      .select('share_type, share_size, season')
      .eq('status', 'active');
    if (error) {
      console.error('[api/admin/reports/active-members-by-share.csv]', error.message);
      return new Response('internal error', { status: 500 });
    }
    const grouped = new Map<string, { share: string; size: string | null; season: string; count: number }>();
    type Row = { share_type: string; share_size: string | null; season: string };
    for (const r of (data ?? []) as Row[]) {
      const key = `${r.season}|${r.share_type}|${r.share_size ?? ''}`;
      const existing = grouped.get(key);
      if (existing) existing.count += 1;
      else grouped.set(key, { share: r.share_type, size: r.share_size, season: r.season, count: 1 });
    }
    const rows = Array.from(grouped.values())
      .sort((a, b) => a.season.localeCompare(b.season) || a.share.localeCompare(b.share))
      .map((g) => [g.season, g.share, g.size ?? '', g.count]);
    return csvResponse('active-members-by-share.csv', rowsToCsv(headers, rows));
  }

  // ─── churn-risk.csv ─────────────────────────────────────────────────
  if (slug === 'churn-risk') {
    const sixtyDaysAgo = new Date(Date.now() - 60 * 86_400_000);
    const { data, error } = await locals.supabase
      .from('members')
      .select(`
        id, share_type, share_size, season, weeks_remaining,
        customer:customers!inner(contact_name, email, phone, last_order_date, total_orders)
      `)
      .eq('status', 'active')
      .limit(2000);
    if (error) {
      console.error('[api/admin/reports/churn-risk.csv]', error.message);
      return new Response('internal error', { status: 500 });
    }
    type Row = {
      id: string;
      share_type: string;
      share_size: string | null;
      season: string;
      weeks_remaining: number;
      customer: {
        contact_name: string; email: string; phone: string | null;
        last_order_date: string | null; total_orders: number;
      } | null;
    };
    const rows: unknown[][] = [];
    for (const r of (data ?? []) as unknown as Row[]) {
      const lod = r.customer?.last_order_date ?? null;
      if (lod && new Date(lod) >= sixtyDaysAgo) continue;
      const daysSince = lod
        ? Math.floor((Date.now() - new Date(lod).getTime()) / 86_400_000)
        : '';
      rows.push([
        r.id,
        r.customer?.contact_name ?? '',
        r.customer?.email ?? '',
        r.customer?.phone ?? '',
        r.share_type,
        r.share_size ?? '',
        r.season,
        r.weeks_remaining,
        lod ?? '',
        daysSince,
        r.customer?.total_orders ?? 0,
      ]);
    }
    return csvResponse('churn-risk.csv', rowsToCsv(headers, rows));
  }

  // ─── pickup-attendance.csv ──────────────────────────────────────────
  if (slug === 'pickup-attendance') {
    const eightWeeksAgo = new Date(Date.now() - 8 * 7 * 86_400_000).toISOString().slice(0, 10);
    const { data, error } = await locals.supabase
      .from('pickup_attendance')
      .select('week_date, picked_up')
      .gte('week_date', eightWeeksAgo);
    if (error) {
      console.error('[api/admin/reports/pickup-attendance.csv]', error.message);
      return new Response('internal error', { status: 500 });
    }
    const weekStats = new Map<string, { picked: number; missed: number }>();
    type Row = { week_date: string; picked_up: boolean };
    for (const r of (data ?? []) as unknown as Row[]) {
      const slot = weekStats.get(r.week_date) ?? { picked: 0, missed: 0 };
      if (r.picked_up) slot.picked += 1; else slot.missed += 1;
      weekStats.set(r.week_date, slot);
    }
    const rows = Array.from(weekStats.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([week, s]) => {
        const total = s.picked + s.missed;
        const rate = total > 0 ? Math.round((s.picked / total) * 100) : 0;
        return [week, total, s.picked, s.missed, `${rate}%`];
      });
    return csvResponse('pickup-attendance.csv', rowsToCsv(headers, rows));
  }

  return notFound();
};
