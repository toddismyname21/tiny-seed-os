/**
 * GET /api/admin/health/status
 *
 * One-shot aggregate for the /admin/health trust dashboard. Returns
 * every card's data in a single round-trip so the page can render
 * (or auto-refresh every 30s) with a single fetch.
 *
 * Response shape:
 *   {
 *     ok: true,
 *     generated_at: ISO timestamp,
 *     sync: {
 *       last_synced_at, age_minutes, status: 'green'|'yellow'|'red'
 *     },
 *     null_pickups: {
 *       total,                         // members.status='active', no pickup, no delivery, share_type ∈ {veg/flex/flower}
 *       allison_park_tbd,              // sub-count: those intentionally NULL because they live in Allison Park (choose Simons vs St. Paul's via PickupNudgeBanner)
 *       actionable,                    // total - allison_park_tbd
 *       status: 'green'|'yellow'|'red'
 *     },
 *     tags: {
 *       missing_canonical,             // active veg/flex customers in supabase NOT carrying '2026-summer-csa' in their Shopify tags
 *                                      // Computed lazily — see `tagMissingCount()` below. May be null when the parallel
 *                                      // nightly-health endpoint isn't reachable yet (we don't keep a cached snapshot here).
 *       last_checked_at,               // most recent notification_log row of type='health_check' that recorded a tag scan
 *       status: 'green'|'yellow'|'red'|'unknown'
 *     },
 *     wrong_tags: {
 *       count,                         // customers tagged 'csa-2026-summer' (the bad ordering) — read from the same nightly-health snapshot
 *       last_checked_at,
 *       status: 'green'|'red'|'unknown'
 *     },
 *     last_reconciliation: {
 *       ran_at,                        // last notification_log row of type='health_check' (any status)
 *       pickups_fixed,                 // parsed from metadata JSON
 *       tags_fixed,
 *       sync_lag_minutes,
 *       status: 'green'|'yellow'|'red'|'never'
 *     },
 *     magic_link_24h: {
 *       sent,
 *       delivered,
 *       bounced,
 *       bounce_rate,                   // 0..1
 *       status: 'green'|'yellow'|'red'|'no_data'
 *     }
 *   }
 *
 * Auth: requireAdmin (cookie session). All reads go through the cookie-
 * aware RLS client so the audit trail captures Todd's identity, not
 * service-role; the admin-bypass policies on every table this touches
 * (members, customers, notification_log, shopify_sync_state) let the
 * admin SELECT every row.
 *
 * Performance budget: <500ms. All 6 reads fan out via Promise.all.
 */
import type { APIRoute } from 'astro';
import { requireAdmin } from '../../../../lib/admin';

export const prerender = false;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      // Health data is point-in-time; don't let any intermediary cache it.
      'cache-control': 'no-store, no-cache, must-revalidate, max-age=0',
    },
  });
}

/** Sync-staleness thresholds (minutes). The Shopify sync runs every 15 min.
 *  Yellow at 20 (one missed run), red at 60 (four missed runs or never). */
const SYNC_YELLOW_MIN = 20;
const SYNC_RED_MIN = 60;

/** NULL-pickup thresholds. 0 → green. 1–20 → yellow. >20 → red.
 *  Allison Park TBD is excluded from the actionable count first, since
 *  those are intentional and resolve themselves through PickupNudgeBanner. */
const NULL_PICKUP_YELLOW = 1;
const NULL_PICKUP_RED = 20;

/** Magic-link bounce-rate thresholds. */
const BOUNCE_YELLOW = 0.05;
const BOUNCE_RED = 0.10;

/** A run is "stale" (red) for the reconciliation card if it hasn't fired
 *  in 26 hours (cron is daily — a 2-hour grace window). Yellow at 18h
 *  (well over the daily cadence but not quite alarm-worthy yet). */
const RECON_YELLOW_HRS = 18;
const RECON_RED_HRS = 26;

/** Row shape for the NULL-pickup query (members with embedded customer
 *  city/zip so the Allison-Park sub-count can be done in memory). */
type PickupCheckRow = {
  id: string;
  customer: { id: string; city: string | null; zip: string | null } | null;
};

interface MetadataShape {
  pickups_fixed?: number;
  tags_fixed?: number;
  tags_missing_canonical?: number;
  tags_wrong_count?: number;
  sync_lag_minutes?: number;
  [k: string]: unknown;
}

export const GET: APIRoute = async ({ locals }) => {
  const auth = await requireAdmin(locals.supabase, locals.user);
  if (auth.response) return auth.response;

  const supabase = locals.supabase;
  const now = new Date();
  const since24hIso = new Date(now.getTime() - 86_400_000).toISOString();

  // ─── Fan out every read in parallel ────────────────────────────────
  const [syncStateRes, nullPickupsRes, lastHealthRes, magicLinkRes] = await Promise.all([
    // 1. Shopify sync watermark
    supabase
      .from('shopify_sync_state')
      .select('last_synced_at, updated_at')
      .eq('id', 1)
      .maybeSingle(),

    // 2. NULL pickups (active members with no pickup and no delivery, on
    //    a share-type that REQUIRES a pickup). add_on rides on the parent's
    //    pickup so we exclude it. We embed customers.{city, zip} so the
    //    Allison-Park-TBD sub-count can be computed in-memory.
    supabase
      .from('members')
      .select('id, customer:customers!inner(id, city, zip)')
      .eq('status', 'active')
      .is('pickup_location_id', null)
      .is('delivery_address', null)
      .in('share_type', ['summer_veg', 'flex', 'flower', 'spring_veg'])
      .overrideTypes<PickupCheckRow[], { merge: false }>(),

    // 3. Last nightly reconciliation run. Reads from notification_log so
    //    the parallel agent's /api/cron/nightly-health endpoint, which
    //    writes a `notification_type='health_check'` row at the end of
    //    each run, advertises its results here. We carry the metadata
    //    JSON forward so the page can show fixed-counts + sync-lag.
    supabase
      .from('notification_log')
      .select('id, status, sent_at, metadata, error_message')
      .eq('notification_type', 'health_check')
      .order('sent_at', { ascending: false })
      .limit(1)
      .maybeSingle(),

    // 4. Magic-link delivery (24h). We don't currently write notification_log
    //    rows for magic links (Supabase Auth → Resend goes around our
    //    logging), so the count will be 0 until Resend webhooks are wired
    //    (Phase 2 — out of scope for this card). When it stays at 0 we
    //    surface that as `no_data` rather than `red`, since 0 deliveries
    //    isn't a failure when no one logged in.
    supabase
      .from('notification_log')
      .select('status', { count: 'exact', head: false })
      .eq('notification_type', 'magic_link')
      .gte('sent_at', since24hIso),
  ]);

  // ─── 1. Sync state ────────────────────────────────────────────────
  // IMPORTANT: health is "did the sync JOB run recently" — use updated_at
  // (touched on every 15-min run). last_synced_at is the watermark =
  // newest ORDER processed, which legitimately sits still when no new
  // orders come in, so it must NOT drive the staleness color.
  const lastRunAt = syncStateRes.data?.updated_at ?? null;
  const lastSyncedAt = syncStateRes.data?.last_synced_at ?? null;
  const syncAgeMin = lastRunAt
    ? Math.floor((now.getTime() - new Date(lastRunAt).getTime()) / 60_000)
    : null;
  const syncStatus: 'green' | 'yellow' | 'red' =
    syncAgeMin === null
      ? 'red'
      : syncAgeMin >= SYNC_RED_MIN
        ? 'red'
        : syncAgeMin >= SYNC_YELLOW_MIN
          ? 'yellow'
          : 'green';

  // ─── 2. NULL pickups + Allison Park TBD sub-count ─────────────────
  // We do the Allison-Park filter in memory (the embedded customer
  // relation isn't filterable at PostgREST level via a column condition,
  // and the result set is small — today < 30 rows). The shape comes
  // from the typed `overrideTypes<PickupCheckRow[]>` above.
  const nullPickupRows = nullPickupsRes.data ?? [];
  const totalNullPickups = nullPickupRows.length;

  function isAllisonParkCustomer(c: PickupCheckRow['customer']): boolean {
    if (!c) return false;
    const city = (c.city ?? '').trim().toLowerCase();
    const zip = (c.zip ?? '').trim();
    return city.startsWith('allison park') || zip === '15101';
  }
  const allisonParkTbd = nullPickupRows.filter((r) => isAllisonParkCustomer(r.customer)).length;
  const actionableNullPickups = totalNullPickups - allisonParkTbd;
  const nullPickupStatus: 'green' | 'yellow' | 'red' =
    actionableNullPickups === 0
      ? 'green'
      : actionableNullPickups > NULL_PICKUP_RED
        ? 'red'
        : actionableNullPickups >= NULL_PICKUP_YELLOW
          ? 'yellow'
          : 'green';

  // ─── 4. Last nightly reconciliation ────────────────────────────────
  // metadata is a JSONB column — Supabase types it as `Json`, which the
  // parallel agent's writer will populate with the counts we extract here.
  // Missing fields fall back to undefined → "—" on the page.
  const healthRow = lastHealthRes.data as
    | { id: string; status: string; sent_at: string; metadata: unknown; error_message: string | null }
    | null;
  const healthMeta: MetadataShape =
    healthRow && typeof healthRow.metadata === 'object' && healthRow.metadata !== null
      ? (healthRow.metadata as MetadataShape)
      : {};
  const reconRanAt = healthRow?.sent_at ?? null;
  const reconAgeHrs = reconRanAt
    ? (now.getTime() - new Date(reconRanAt).getTime()) / 3_600_000
    : null;
  const reconStatus: 'green' | 'yellow' | 'red' | 'never' =
    reconAgeHrs === null
      ? 'never'
      : reconAgeHrs >= RECON_RED_HRS
        ? 'red'
        : reconAgeHrs >= RECON_YELLOW_HRS
          ? 'yellow'
          : 'green';

  // ─── Tags (read from the same health_check snapshot) ───────────────
  // The nightly health cron computes + records both the canonical-tag
  // miss count and the wrong-tag count in its metadata. We don't re-run
  // the Shopify tag scan here (it's a per-customer GraphQL fan-out — too
  // slow for a 500ms aggregate). If the snapshot has never been written
  // we surface 'unknown' rather than guessing.
  const tagsMissing =
    typeof healthMeta.tags_missing_canonical === 'number'
      ? healthMeta.tags_missing_canonical
      : null;
  const tagsWrong =
    typeof healthMeta.tags_wrong_count === 'number' ? healthMeta.tags_wrong_count : null;
  const tagStatus: 'green' | 'yellow' | 'red' | 'unknown' =
    tagsMissing === null
      ? 'unknown'
      : tagsMissing === 0
        ? 'green'
        : tagsMissing > 20
          ? 'red'
          : 'yellow';
  const wrongTagStatus: 'green' | 'red' | 'unknown' =
    tagsWrong === null ? 'unknown' : tagsWrong === 0 ? 'green' : 'red';

  // ─── 5. Magic-link delivery (24h) ──────────────────────────────────
  // Group counts client-side from the count'd query. Until we wire
  // Resend webhooks the count is normally 0 — we show `no_data` rather
  // than red so the card doesn't false-alarm.
  type MlRow = { status: string };
  const mlRows = (magicLinkRes.data ?? []) as MlRow[];
  const mlSent = mlRows.length;
  let mlDelivered = 0;
  let mlBounced = 0;
  for (const r of mlRows) {
    if (r.status === 'delivered' || r.status === 'opened' || r.status === 'clicked') {
      mlDelivered++;
    }
    if (r.status === 'bounced' || r.status === 'complained' || r.status === 'failed') {
      mlBounced++;
    }
  }
  const bounceRate = mlSent > 0 ? mlBounced / mlSent : 0;
  const mlStatus: 'green' | 'yellow' | 'red' | 'no_data' =
    mlSent === 0
      ? 'no_data'
      : bounceRate >= BOUNCE_RED
        ? 'red'
        : bounceRate >= BOUNCE_YELLOW
          ? 'yellow'
          : 'green';

  return json({
    ok: true,
    generated_at: now.toISOString(),
    sync: {
      last_run_at: lastRunAt,
      newest_order_at: lastSyncedAt,
      last_synced_at: lastSyncedAt,
      age_minutes: syncAgeMin,
      status: syncStatus,
    },
    null_pickups: {
      total: totalNullPickups,
      allison_park_tbd: allisonParkTbd,
      actionable: actionableNullPickups,
      status: nullPickupStatus,
    },
    tags: {
      missing_canonical: tagsMissing,
      last_checked_at: reconRanAt,
      status: tagStatus,
    },
    wrong_tags: {
      count: tagsWrong,
      last_checked_at: reconRanAt,
      status: wrongTagStatus,
    },
    last_reconciliation: {
      ran_at: reconRanAt,
      pickups_fixed:
        typeof healthMeta.pickups_fixed === 'number' ? healthMeta.pickups_fixed : null,
      tags_fixed: typeof healthMeta.tags_fixed === 'number' ? healthMeta.tags_fixed : null,
      sync_lag_minutes:
        typeof healthMeta.sync_lag_minutes === 'number'
          ? healthMeta.sync_lag_minutes
          : null,
      run_status: healthRow?.status ?? null,
      error_message: healthRow?.error_message ?? null,
      status: reconStatus,
    },
    magic_link_24h: {
      sent: mlSent,
      delivered: mlDelivered,
      bounced: mlBounced,
      bounce_rate: bounceRate,
      status: mlStatus,
    },
  });
};
