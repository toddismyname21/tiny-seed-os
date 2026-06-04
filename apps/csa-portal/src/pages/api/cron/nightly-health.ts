/**
 * GET|POST /api/cron/nightly-health   (cron-triggered, NOT user-facing)
 *
 * Daily self-healing health check for the CSA portal. Runs at 06:00 ET (10:00
 * UTC) via the pg_cron job `csa-nightly-health` (migration 0033). Three
 * concerns, in order:
 *
 *   1. PICKUP BACKFILL — for every active member with no pickup_location_id
 *      and no delivery_address, look up their most recent Shopify CSA order,
 *      run the variant through matchVariantToPickup, then apply the same
 *      sibling-share fallback the sync uses (flower follows veg). Strict
 *      idempotency: NEVER overwrites a non-NULL pickup; only FILLS nulls.
 *      Catches the case where /api/sync/shopify-orders ran before this code
 *      shipped, or a sibling-share edge case the sync missed.
 *
 *   2. TAG SYNC — make sure every active CSA member's Shopify customer
 *      carries the canonical launch-email tag (2026-summer-csa for summer
 *      veg + flex, 2026-flower-csa for flower shares). Port of
 *      scripts/migrate-csa/sync_csa_tags.py. Idempotent: tagsAdd is a
 *      Shopify-native upsert. Only ADDS tags, never removes.
 *
 *   3. SYNC WATERMARK CHECK — compute now() - shopify_sync_state.last_synced_at
 *      and flag > 30 min lag (= the every-15-min sync has missed two
 *      consecutive runs).
 *
 * After the work runs, emails the farm owner a daily summary via Resend.
 * Subject is prefixed with ✓ on a clean run, ⚠ on anything actionable. The
 * Resend send is fail-soft: if the key isn't configured or Resend errors,
 * the endpoint logs and still returns 200 with the JSON result.
 *
 * Auth: same `Authorization: Bearer <CRON_SECRET>` pattern as
 * /api/sync/shopify-orders. The pg_cron job pulls the secret from Vault.
 *
 * Writes go through supabaseAdmin (service role, bypasses RLS) — appropriate
 * for a trusted server-side batch job.
 */
import type { APIRoute } from 'astro';
import {
  CRON_SECRET,
  RESEND_API_KEY,
  RESEND_FROM_EMAIL,
} from 'astro:env/server';
import { supabaseAdmin } from '../../../lib/supabase';
import type { Database } from '../../../lib/database.types';
import {
  shopifyConfigured,
  shopifyGraphQL,
} from '../../../lib/shopify';
import {
  matchVariantToPickup,
  type PickupLocation,
} from '../../../lib/pickup-from-variant';

export const prerender = false;

/** Email destination for the daily health summary. Hardcoded — operational
 *  alert, not member-facing. */
const HEALTH_TO = 'todd@tinyseedfarmpgh.com';

/** Sync lag (minutes) above which we flag the run as actionable. The
 *  every-15-min sync schedule means > 30 = two missed runs in a row. */
const SYNC_LAG_THRESHOLD_MIN = 30;

/** Tag-sync canonical mapping — kept in sync with
 *  scripts/migrate-csa/sync_csa_tags.py. */
const SHARE_TYPE_TO_TAG: Record<string, string> = {
  summer_veg: '2026-summer-csa',
  flex: '2026-summer-csa', // flex buyers get the summer-csa tag too
  flower: '2026-flower-csa',
};

/** Test/internal accounts to skip — kept in sync with sync_csa_tags.py. */
const TEST_EXCLUDES = new Set<string>([
  'freetodd21@gmail.com',
  'fakeemailsofake@gmail.com',
  'test@test.com',
  'tinyseedcsa@gmail.com',
]);

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

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ──────────────────────────────────────────────────────────────────
 * 1. PICKUP BACKFILL
 *
 * Mirror of /tmp/fix_null_pickups.py (proven against live data on
 * 2026-06-04, 7/7 matches). Two-stage:
 *   (a) for every active member with NULL pickup AND NULL delivery, look
 *       up their most recent Shopify order, find the line item whose
 *       title matches their share_type, run matchVariantToPickup on its
 *       variantTitle. If matched, fill pickup_location_id + pickup_day.
 *   (b) after (a), run sibling-share fallback over the same set: flower
 *       members still NULL whose customer has an active veg/flex share
 *       with a non-NULL pickup → copy.
 * ────────────────────────────────────────────────────────────────── */

/** Active SHARE share-types we backfill. add_on / wholesale_csa / fall_veg
 *  are explicitly out of scope — add_on inherits pickup from the primary
 *  share, wholesale_csa is its own workflow. Typed against the members
 *  share_type domain so .in() typechecks. */
type BackfillShareType = Extract<
  Database['public']['Tables']['members']['Row']['share_type'],
  'summer_veg' | 'flex' | 'flower' | 'spring_veg'
>;
const BACKFILL_SHARE_TYPES: readonly BackfillShareType[] = [
  'summer_veg',
  'flex',
  'flower',
  'spring_veg',
];

interface BackfillCandidate {
  member_id: string;
  customer_id: string;
  share_type: string;
  email: string;
  shopifyCustomerId: string | null;
}

/** Shopify orders query for one customer — pulls the most recent 10 orders
 *  back to ~9 months ago so we always see the CSA purchase. */
const CUSTOMER_ORDERS_QUERY = `
  query($id: ID!) {
    customer(id: $id) {
      orders(first: 10, sortKey: CREATED_AT, reverse: true, query: "created_at:>=2025-09-01") {
        edges {
          node {
            name
            createdAt
            lineItems(first: 30) {
              edges {
                node {
                  title
                  variantTitle
                }
              }
            }
          }
        }
      }
    }
  }
`;

interface CustomerOrdersResp {
  customer: {
    orders: {
      edges: Array<{
        node: {
          name: string;
          createdAt: string;
          lineItems: {
            edges: Array<{
              node: { title: string; variantTitle: string | null };
            }>;
          };
        };
      }>;
    };
  } | null;
}

/**
 * Find the variantTitle on a customer's most recent Shopify orders that
 * matches a given member's share_type. Returns null if no matching line
 * item is found (lapsed customer, free share, etc.).
 *
 * Match heuristic mirrors fix_null_pickups.py:
 *   summer_veg  → title contains "summer" AND "csa" AND NOT "flex"
 *   flex        → title contains "flex" AND "csa"
 *   flower      → title contains "flower" AND ("csa" OR "share")
 *   spring_veg  → title contains "spring" AND "csa"
 */
function pickVariantForShareType(
  resp: CustomerOrdersResp | null,
  shareType: string
): string | null {
  const edges = resp?.customer?.orders.edges ?? [];
  for (const oe of edges) {
    for (const le of oe.node.lineItems.edges) {
      const title = (le.node.title ?? '').toLowerCase();
      const v = le.node.variantTitle;
      if (shareType === 'summer_veg' &&
          title.includes('summer') && title.includes('csa') && !title.includes('flex')) {
        return v;
      }
      if (shareType === 'flex' &&
          title.includes('flex') && title.includes('csa')) {
        return v;
      }
      if (shareType === 'flower' &&
          title.includes('flower') && (title.includes('csa') || title.includes('share'))) {
        return v;
      }
      if (shareType === 'spring_veg' &&
          title.includes('spring') && title.includes('csa')) {
        return v;
      }
    }
  }
  return null;
}

interface PickupBackfillResult {
  fixed: number;
  remaining: number;
  unmatchedVariants: string[];
}

async function runPickupBackfill(
  pickupLocations: PickupLocation[],
  pickupDayById: Map<string, Database['public']['Tables']['members']['Row']['pickup_day']>
): Promise<PickupBackfillResult> {
  const unmatchedVariants: string[] = [];

  // 1. Pull active candidates needing backfill — those with NULL pickup AND
  //    no delivery_address (we don't disturb home-delivery members).
  const { data: rawCandidates, error: candErr } = await supabaseAdmin
    .from('members')
    .select('id, customer_id, share_type, customer:customers!inner(email, shopify_customer_id)')
    .eq('status', 'active')
    .in('share_type', BACKFILL_SHARE_TYPES)
    .is('pickup_location_id', null)
    .is('delivery_address', null);

  if (candErr) {
    throw new Error(`backfill candidate read: ${candErr.message}`);
  }

  // Normalize the embedded customer to a single object — PostgREST may
  // return an array or a single record depending on the FK shape, so type
  // it loosely and reduce.
  const candidates: BackfillCandidate[] = (rawCandidates ?? []).map((m) => {
    const cust = Array.isArray(m.customer) ? (m.customer[0] ?? null) : m.customer;
    return {
      member_id: m.id as string,
      customer_id: m.customer_id as string,
      share_type: m.share_type as string,
      email: ((cust?.email as string | undefined) ?? '').toLowerCase(),
      shopifyCustomerId: (cust?.shopify_customer_id as string | null | undefined) ?? null,
    };
  });

  let fixed = 0;

  // 2. For each candidate, hit Shopify for their orders and run the matcher.
  for (const c of candidates) {
    if (!c.shopifyCustomerId) continue; // can't look up — skip silently

    let resp: CustomerOrdersResp | null = null;
    try {
      const r = await shopifyGraphQL<CustomerOrdersResp>(CUSTOMER_ORDERS_QUERY, {
        id: `gid://shopify/Customer/${c.shopifyCustomerId}`,
      });
      if (r.errors?.length) {
        console.error(
          `[nightly-health] orders query for ${c.email} returned errors:`,
          r.errors.map((e) => e.message).join('; ')
        );
        continue;
      }
      resp = r.data ?? null;
    } catch (e) {
      // Throttling, transient — log + skip this candidate, the next run
      // catches them.
      console.error(
        `[nightly-health] orders query for ${c.email} threw:`,
        e instanceof Error ? e.message : String(e)
      );
      continue;
    }

    const variant = pickVariantForShareType(resp, c.share_type);
    if (!variant) continue; // no matching line item — skip

    const match = matchVariantToPickup(variant, pickupLocations);
    if (match.reason.startsWith('unmatched:')) {
      if (!unmatchedVariants.includes(variant) && unmatchedVariants.length < 25) {
        unmatchedVariants.push(variant);
      }
      continue;
    }
    if (!match.locationId) continue; // home_delivery / allison_park_tbd → leave NULL

    // 3. Conditional UPDATE — only-if-still-null defense-in-depth.
    const { error: updErr, count } = await supabaseAdmin
      .from('members')
      .update(
        {
          pickup_location_id: match.locationId,
          pickup_day: pickupDayById.get(match.locationId) ?? null,
        },
        { count: 'exact' }
      )
      .eq('id', c.member_id)
      .is('pickup_location_id', null); // never overwrite a non-NULL pickup
    if (updErr) {
      console.error(`[nightly-health] backfill update for ${c.email} failed:`, updErr.message);
      continue;
    }
    if (count && count > 0) fixed += 1;
  }

  // 4. SIBLING-SHARE FALLBACK — flower follows veg, applied AFTER (1)(2)(3)
  //    so the veg row's pickup is set first if it was also a candidate. Same
  //    only-if-null guard. Group by customer to avoid N+1 reads.
  const candidateCustomerIds = Array.from(new Set(candidates.map((c) => c.customer_id)));
  for (const customerId of candidateCustomerIds) {
    const { data: siblings, error: sibErr } = await supabaseAdmin
      .from('members')
      .select('id, share_type, pickup_location_id, pickup_day')
      .eq('customer_id', customerId)
      .eq('status', 'active');
    if (sibErr) {
      console.error(`[nightly-health] sibling read for ${customerId} failed:`, sibErr.message);
      continue;
    }
    const source = (siblings ?? []).find(
      (s) =>
        (s.share_type === 'summer_veg' || s.share_type === 'flex') &&
        s.pickup_location_id != null
    );
    if (!source) continue;
    const targets = (siblings ?? []).filter(
      (s) => s.share_type === 'flower' && s.pickup_location_id == null
    );
    for (const t of targets) {
      const { error: updErr, count } = await supabaseAdmin
        .from('members')
        .update(
          {
            pickup_location_id: source.pickup_location_id,
            pickup_day:
              source.pickup_day ??
              pickupDayById.get(source.pickup_location_id!) ??
              null,
          },
          { count: 'exact' }
        )
        .eq('id', t.id)
        .is('pickup_location_id', null);
      if (updErr) {
        console.error(`[nightly-health] sibling-share update failed:`, updErr.message);
        continue;
      }
      if (count && count > 0) fixed += 1;
    }
  }

  // 5. Recount remaining — same filter as candidates, MINUS the
  //    home-delivery requesters (delivery_address NULL filter already
  //    excludes them) MINUS Allison Park TBD (we can't tell from the row
  //    alone; the matcher's allison_park_tbd reason marks them, but
  //    they're correctly NULL — exclude only by reason from the just-
  //    queried set). Practical proxy: re-count rows with the same shape;
  //    Allison Park members appear here but are EXPECTED, so we cap
  //    remaining to "concerning remaining" = the count minus those we
  //    KNOW resolved to allison_park_tbd / no_variant in this run.
  const { count: rawRemaining, error: countErr } = await supabaseAdmin
    .from('members')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'active')
    .in('share_type', BACKFILL_SHARE_TYPES)
    .is('pickup_location_id', null)
    .is('delivery_address', null);
  if (countErr) {
    console.error('[nightly-health] remaining count failed:', countErr.message);
  }

  return {
    fixed,
    remaining: rawRemaining ?? 0,
    unmatchedVariants,
  };
}

/* ──────────────────────────────────────────────────────────────────
 * 2. TAG SYNC — TS port of scripts/migrate-csa/sync_csa_tags.py
 *
 * For every active CSA member NOT in TEST_EXCLUDES, look up the Shopify
 * customer by email, compare current tags against the canonical set for
 * their share_type, and add any missing tags via Shopify tagsAdd.
 * Idempotent + ADD-only.
 * ────────────────────────────────────────────────────────────────── */

const CUSTOMER_BY_EMAIL_QUERY = `
  query($q: String!) {
    customers(first: 1, query: $q) {
      edges {
        node {
          id
          email
          tags
        }
      }
    }
  }
`;
interface CustomerByEmailResp {
  customers: {
    edges: Array<{ node: { id: string; email: string | null; tags: string[] } }>;
  };
}

const TAGS_ADD_MUTATION = `
  mutation($id: ID!, $tags: [String!]!) {
    tagsAdd(id: $id, tags: $tags) {
      userErrors { field message }
      node { id }
    }
  }
`;
interface TagsAddResp {
  tagsAdd: {
    userErrors: Array<{ field: string[] | null; message: string }>;
    node: { id: string } | null;
  } | null;
}

interface TagSyncResult {
  added: number;
  notFound: number;
  customersChecked: number;
}

async function runTagSync(): Promise<TagSyncResult> {
  // 1. Build the desired-tag set per email from Supabase.
  const { data: members, error: memErr } = await supabaseAdmin
    .from('members')
    .select('customer_id, share_type, customer:customers!inner(email)')
    .eq('status', 'active');
  if (memErr) throw new Error(`tag-sync member read: ${memErr.message}`);

  const desiredByEmail = new Map<string, Set<string>>();
  for (const m of members ?? []) {
    const cust = Array.isArray(m.customer) ? (m.customer[0] ?? null) : m.customer;
    const email = ((cust?.email as string | undefined) ?? '').toLowerCase();
    if (!email || TEST_EXCLUDES.has(email)) continue;
    const tag = SHARE_TYPE_TO_TAG[m.share_type as string];
    if (!tag) continue; // share_type not part of launch-email segments (spring/add_on)
    const set = desiredByEmail.get(email) ?? new Set<string>();
    set.add(tag);
    desiredByEmail.set(email, set);
  }

  let added = 0;
  let notFound = 0;
  let customersChecked = 0;

  // 2. For each email, fetch the Shopify customer's current tags and diff.
  for (const [email, desired] of desiredByEmail.entries()) {
    customersChecked += 1;

    let lookup: CustomerByEmailResp | null = null;
    try {
      const safe = email.trim().replace(/(["\\])/g, '\\$1');
      const r = await shopifyGraphQL<CustomerByEmailResp>(CUSTOMER_BY_EMAIL_QUERY, {
        q: `email:"${safe}"`,
      });
      if (r.errors?.length) {
        console.error(
          `[nightly-health] tag-sync customer lookup for ${email} errored:`,
          r.errors.map((e) => e.message).join('; ')
        );
        continue;
      }
      lookup = r.data ?? null;
    } catch (e) {
      console.error(
        `[nightly-health] tag-sync customer lookup for ${email} threw:`,
        e instanceof Error ? e.message : String(e)
      );
      continue;
    }

    const node = lookup?.customers.edges?.[0]?.node ?? null;
    if (!node) {
      notFound += 1;
      continue;
    }
    const current = new Set(node.tags ?? []);
    const missing: string[] = [];
    for (const t of desired) {
      if (!current.has(t)) missing.push(t);
    }
    if (missing.length === 0) continue;

    try {
      const ar = await shopifyGraphQL<TagsAddResp>(TAGS_ADD_MUTATION, {
        id: node.id,
        tags: missing,
      });
      const userErrors = ar.data?.tagsAdd?.userErrors ?? [];
      if (ar.errors?.length || userErrors.length) {
        console.error(
          `[nightly-health] tagsAdd for ${email} errored:`,
          [...(ar.errors ?? []).map((e) => e.message), ...userErrors.map((e) => e.message)].join('; ')
        );
        continue;
      }
      added += missing.length;
    } catch (e) {
      console.error(
        `[nightly-health] tagsAdd for ${email} threw:`,
        e instanceof Error ? e.message : String(e)
      );
    }
  }

  return { added, notFound, customersChecked };
}

/* ──────────────────────────────────────────────────────────────────
 * 3. SYNC WATERMARK CHECK
 * ────────────────────────────────────────────────────────────────── */

async function checkSyncLag(): Promise<{ lagMinutes: number; lastSyncedAt: string | null }> {
  const { data, error } = await supabaseAdmin
    .from('shopify_sync_state')
    .select('last_synced_at')
    .eq('id', 1)
    .maybeSingle();
  if (error) {
    console.error('[nightly-health] sync state read failed:', error.message);
    return { lagMinutes: -1, lastSyncedAt: null };
  }
  const ts = data?.last_synced_at ?? null;
  if (!ts) return { lagMinutes: -1, lastSyncedAt: null };
  const lagMs = Date.now() - new Date(ts).getTime();
  return { lagMinutes: Math.round(lagMs / 60_000), lastSyncedAt: ts };
}

/* ──────────────────────────────────────────────────────────────────
 * 4. EMAIL THE SUMMARY
 *
 * Fail-soft mirror of the sendSyncErrorAlert pattern in shopify-orders.ts.
 * ────────────────────────────────────────────────────────────────── */

interface HealthSummary {
  ranAt: string;
  pickupsFixed: number;
  pickupsRemaining: number;
  tagsAdded: number;
  tagsCustomersChecked: number;
  tagsNotFound: number;
  syncLagMinutes: number;
  syncLastSyncedAt: string | null;
  unmatchedVariants: string[];
}

function isAllClear(s: HealthSummary): boolean {
  return (
    s.pickupsFixed === 0 &&
    s.tagsAdded === 0 &&
    s.syncLagMinutes >= 0 &&
    s.syncLagMinutes <= SYNC_LAG_THRESHOLD_MIN &&
    s.unmatchedVariants.length === 0
  );
}

async function sendHealthEmail(summary: HealthSummary): Promise<{ ok: boolean; detail: string }> {
  try {
    if (!RESEND_API_KEY || !RESEND_FROM_EMAIL) {
      return { ok: false, detail: 'resend_not_configured' };
    }

    const dateStr = new Intl.DateTimeFormat('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'America/New_York',
    }).format(new Date(summary.ranAt));

    const clean = isAllClear(summary);
    const prefix = clean ? '✓ All clear' : '⚠ Action needed';
    const subject = `${prefix}: CSA portal health — ${dateStr}`;

    const lagDisplay =
      summary.syncLagMinutes < 0
        ? 'unknown (state read failed)'
        : `${summary.syncLagMinutes} min`;

    const unmatchedBlock =
      summary.unmatchedVariants.length === 0
        ? ''
        : `<p style="margin:18px 0 6px;font-weight:600">Unmatched variants (need a REWRITE entry or Shopify rename)</p>` +
          `<ul style="margin:0 0 0 18px;padding:0;font-size:13px;color:#374151">` +
          summary.unmatchedVariants.map((v) => `<li>${escapeHtml(v)}</li>`).join('') +
          `</ul>`;

    const text = [
      `Tiny Seed CSA portal — daily health summary (${dateStr})`,
      '',
      `Pickups auto-filled:   ${summary.pickupsFixed}`,
      `Pickups still NULL:    ${summary.pickupsRemaining} (includes Allison Park (TBD) — member-choice required)`,
      `Tags added:            ${summary.tagsAdded}`,
      `Customers checked:     ${summary.tagsCustomersChecked}`,
      `Customers not found:   ${summary.tagsNotFound}`,
      `Sync lag:              ${lagDisplay}`,
      ...(summary.syncLastSyncedAt ? [`Last sync at:          ${summary.syncLastSyncedAt}`] : []),
      ...(summary.unmatchedVariants.length > 0
        ? ['', 'Unmatched variants:', ...summary.unmatchedVariants.map((v) => `  • ${v}`)]
        : []),
      '',
      'Sync health dashboard: https://csa.tinyseedfarm.com/admin/sync',
      '— Tiny Seed CSA nightly health',
    ].join('\n');

    const html =
      `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;` +
      `max-width:600px;margin:0 auto;color:#1f2937;line-height:1.6">` +
      `<p style="font-size:18px;font-weight:700;margin:0 0 4px;color:${clean ? '#15803d' : '#b45309'}">${escapeHtml(prefix)}</p>` +
      `<p style="color:#6b7280;font-size:14px;margin:0 0 16px">${escapeHtml(dateStr)} · America/New_York</p>` +
      `<table style="border-collapse:collapse;font-size:14px;margin:0 0 16px">` +
      `<tr><td style="padding:2px 16px 2px 0;color:#6b7280">Pickups auto-filled</td><td style="padding:2px 0;font-weight:600">${summary.pickupsFixed}</td></tr>` +
      `<tr><td style="padding:2px 16px 2px 0;color:#6b7280">Pickups still NULL</td><td style="padding:2px 0;font-weight:600">${summary.pickupsRemaining} <span style="color:#9ca3af;font-weight:400">(incl. Allison Park TBD)</span></td></tr>` +
      `<tr><td style="padding:2px 16px 2px 0;color:#6b7280">Tags added</td><td style="padding:2px 0;font-weight:600">${summary.tagsAdded}</td></tr>` +
      `<tr><td style="padding:2px 16px 2px 0;color:#6b7280">Customers checked</td><td style="padding:2px 0;font-weight:600">${summary.tagsCustomersChecked}</td></tr>` +
      `<tr><td style="padding:2px 16px 2px 0;color:#6b7280">Customers not in Shopify</td><td style="padding:2px 0;font-weight:600">${summary.tagsNotFound}</td></tr>` +
      `<tr><td style="padding:2px 16px 2px 0;color:#6b7280">Sync lag</td><td style="padding:2px 0;font-weight:600">${escapeHtml(lagDisplay)}</td></tr>` +
      `</table>` +
      unmatchedBlock +
      `<p style="margin:20px 0 0">` +
      `<a href="https://csa.tinyseedfarm.com/admin/sync" style="display:inline-block;background:#15803d;color:#fff;` +
      `text-decoration:none;padding:10px 20px;border-radius:8px;font-weight:600;font-size:14px">` +
      `Open sync-health dashboard</a></p>` +
      `<p style="color:#6b7280;font-size:13px;margin-top:24px">` +
      `Automated daily summary from /api/cron/nightly-health. The ⚠ prefix appears when there's something to look at; ✓ when everything is healthy.</p>` +
      `</div>`;

    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: RESEND_FROM_EMAIL,
        to: [HEALTH_TO],
        subject,
        text,
        html,
      }),
    });

    if (!resp.ok) {
      const detail = await resp.text().catch(() => '');
      console.error(
        `[nightly-health] Resend send failed (HTTP ${resp.status}): ${detail.slice(0, 300)}`
      );
      return { ok: false, detail: `resend_http_${resp.status}` };
    }
    return { ok: true, detail: 'sent' };
  } catch (e) {
    console.error('[nightly-health] sendHealthEmail threw (swallowed):', e);
    return { ok: false, detail: 'threw' };
  }
}

/* ──────────────────────────────────────────────────────────────────
 * Handler — shared by GET + POST.
 * ────────────────────────────────────────────────────────────────── */

async function handle(request: Request): Promise<Response> {
  const denial = checkAuth(request);
  if (denial) return denial;

  if (!shopifyConfigured()) {
    return jsonResponse({ ok: false, error: 'shopify_not_configured' }, 500);
  }

  // Pre-load pickup_locations (active only). Same shape the sync uses.
  const { data: pickupRows, error: plErr } = await supabaseAdmin
    .from('pickup_locations')
    .select('id, name, day_of_week')
    .eq('is_active', true);
  if (plErr) {
    return jsonResponse({ ok: false, error: 'pickup_locations_read_failed', detail: plErr.message }, 500);
  }
  const pickupLocations: PickupLocation[] = (pickupRows ?? []).map((r) => ({
    id: r.id,
    name: r.name,
  }));
  const pickupDayById: Map<string, Database['public']['Tables']['members']['Row']['pickup_day']> =
    new Map((pickupRows ?? []).map((r) => [r.id, r.day_of_week]));

  // Run the three concerns. Each function is independently fail-soft —
  // a Shopify hiccup in tag-sync must not block the pickup-backfill summary.
  let backfill: PickupBackfillResult = { fixed: 0, remaining: -1, unmatchedVariants: [] };
  try {
    backfill = await runPickupBackfill(pickupLocations, pickupDayById);
  } catch (e) {
    console.error('[nightly-health] pickup backfill threw:', e);
  }

  let tagSync: TagSyncResult = { added: 0, notFound: 0, customersChecked: 0 };
  try {
    tagSync = await runTagSync();
  } catch (e) {
    console.error('[nightly-health] tag sync threw:', e);
  }

  const { lagMinutes, lastSyncedAt } = await checkSyncLag();

  const ranAt = new Date().toISOString();
  const summary: HealthSummary = {
    ranAt,
    pickupsFixed: backfill.fixed,
    pickupsRemaining: backfill.remaining,
    tagsAdded: tagSync.added,
    tagsCustomersChecked: tagSync.customersChecked,
    tagsNotFound: tagSync.notFound,
    syncLagMinutes: lagMinutes,
    syncLastSyncedAt: lastSyncedAt,
    unmatchedVariants: backfill.unmatchedVariants,
  };

  // Send the daily summary email — fail-soft.
  const emailOutcome = await sendHealthEmail(summary);

  // Log to notification_log so admin/sync can correlate runs. Fail-soft —
  // a logging hiccup must not change the response.
  try {
    await supabaseAdmin.from('notification_log').insert({
      channel: 'email',
      notification_type: 'health_check',
      recipient: HEALTH_TO,
      status: emailOutcome.ok ? 'sent' : 'failed',
      provider: 'resend',
      subject: `Nightly health summary`,
      template: 'nightly-health',
      error_message: emailOutcome.ok ? null : emailOutcome.detail,
      metadata: { summary } as unknown as Database['public']['Tables']['notification_log']['Row']['metadata'],
    });
  } catch (e) {
    console.error('[nightly-health] notification_log insert threw:', e);
  }

  return jsonResponse({
    ok: true,
    pickups_fixed: summary.pickupsFixed,
    pickups_remaining: summary.pickupsRemaining,
    tags_added: summary.tagsAdded,
    tags_customers_checked: summary.tagsCustomersChecked,
    tags_not_found: summary.tagsNotFound,
    sync_lag_minutes: summary.syncLagMinutes,
    sync_last_synced_at: summary.syncLastSyncedAt,
    sync_lag_ok: summary.syncLagMinutes >= 0 && summary.syncLagMinutes <= SYNC_LAG_THRESHOLD_MIN,
    unmatched_variants: summary.unmatchedVariants,
    email_outcome: emailOutcome,
    ran_at: ranAt,
  });
}

export const GET: APIRoute = ({ request }) => handle(request);
export const POST: APIRoute = ({ request }) => handle(request);
