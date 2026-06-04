/**
 * GET|POST /api/sync/shopify-orders   (cron-triggered, NOT user-facing)
 *
 * Catch-up sync: pulls Shopify orders updated since the last watermark,
 * upserts customers + CSA member rows into Supabase, and issues Shopify
 * store credit for flex-funds line items (the flex SHARE *and* the "CSA
 * Farm Flex Top-Up" product). Flex purchases credit the principal PLUS a
 * ladder loyalty bonus (<$250 +5%, $250–$499 +10%, $500+ +12%), with the
 * bonus portion recorded as a flex_transactions row. SENSITIVE — it
 * creates member rows and issues real money — so it is built defensively:
 *
 *   IDEMPOTENT  Every order is keyed in `shopify_order_sync` by its
 *               Shopify order id; an order with a row is skipped. Member
 *               rows use a deterministic `legacy_id =
 *               'SYNC-<orderId>-<lineItemId>'` so an upsert can never
 *               duplicate. Flex credit is double-guarded (ledger
 *               flex_credited == 0 + Shopify balance check).
 *
 *   DRY-RUN     `?dry_run=1` performs ALL reads and reports the planned
 *               actions as JSON, but does ZERO writes (no member upserts,
 *               no store credit, no watermark advance, no ledger rows).
 *
 *   RESILIENT   Each order is wrapped in try/catch. A failing order
 *               records `last_error` on its ledger row and the run
 *               continues. The watermark only advances at the very end of
 *               a completed run, so a mid-run crash never strands state.
 *
 *   AUTH        Requires `Authorization: Bearer <CRON_SECRET>`. No cookie
 *               session, no admin role — this is machine-to-machine. The
 *               scheduler (Supabase pg_cron / GitHub Actions, wired
 *               separately by PM) sends the header.
 *
 * Writes go through the service-role client (`supabaseAdmin`), which
 * bypasses RLS — appropriate for a trusted server-side batch job.
 *
 * Returns:
 *   { ok, dry_run, orders_seen, orders_processed, members_upserted,
 *     flex_credited_total, flex_bonus_total, watermark_advanced_to,
 *     planned?, errors[] }
 */
import type { APIRoute } from 'astro';
import { CRON_SECRET, RESEND_API_KEY, RESEND_FROM_EMAIL } from 'astro:env/server';
import { supabaseAdmin } from '../../../lib/supabase';
import type { Database } from '../../../lib/database.types';
import {
  getSchedule,
  lastDelivery,
  type SeasonSchedule,
} from '../../../lib/season';
import {
  shopifyConfigured,
  fetchOrders,
  hasCsaLineItem,
  isOrderSkippable,
  isOrderPaid,
  categorize,
  issueStoreCreditDelta,
  getCustomerGidByEmail,
  type ShopifyOrder,
  type Category,
} from '../../../lib/shopify';
import { isFlexFundsTitle, planFlexCredit } from '../../../lib/flex';
import { REFERRAL_BONUS_AMOUNT } from '../../../lib/referral';
import {
  matchVariantToPickup,
  type PickupLocation,
} from '../../../lib/pickup-from-variant';

export const prerender = false;

/** Minimum referred-order total for a referral bonus to pay out ($300). */
const REFERRAL_MINIMUM_TOTAL = 300;

/** Where the error-alert email goes. Hardcoded to the farm owner — this is
 *  an operational alert, not a member-facing send. */
const SYNC_ALERT_TO = 'todd@tinyseedfarmpgh.com';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

/** Minimal HTML escaping for interpolated strings in the alert email body. */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ──────────────────────────────────────────────────────────────────
 * ERROR ALERTING
 *
 * The sync runs unattended every 15 min and moves REAL money (store
 * credit + referral payouts). Silent failure is exactly what caused the
 * original ~100-customer data gap, so when a run touches ANY error we
 * email the farm owner a summary. STRICTLY BEST-EFFORT:
 *
 *   - Only fires when there ARE errors (no spam on healthy runs — the
 *     caller guards on this; we double-guard with an empty-check).
 *   - Wrapped in try/catch end-to-end: a missing Resend key, Resend
 *     being down, or a non-2xx response is logged and SWALLOWED. An
 *     alerting failure must NEVER break the sync (the run already
 *     completed + the watermark already advanced before we get here).
 *   - Never throws.
 * ────────────────────────────────────────────────────────────────── */

interface SyncRunSummary {
  ordersSeen: number;
  ordersProcessed: number;
  membersUpserted: number;
  flexCreditedTotal: number;
  flexBonusTotal: number;
  referralBonusTotal: number;
  errors: Array<{ order: string; message: string }>;
}

async function sendSyncErrorAlert(summary: SyncRunSummary): Promise<void> {
  try {
    if (summary.errors.length === 0) return; // never alert on a clean run

    if (!RESEND_API_KEY || !RESEND_FROM_EMAIL) {
      console.warn(
        '[sync] error alert: Resend not configured — skipping email ' +
          `(${summary.errors.length} error(s) this run)`
      );
      return;
    }

    const n = summary.errors.length;
    const dateStr = new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZone: 'America/New_York',
    }).format(new Date());

    const subject = `⚠️ CSA sync: ${n} order(s) errored on ${dateStr}`;

    const money = (v: number): string =>
      new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v);

    // ── Plain-text body ──────────────────────────────────────────────
    const textLines = [
      `Tiny Seed CSA sync hit ${n} error(s) at ${dateStr} (America/New_York).`,
      '',
      `Orders seen:        ${summary.ordersSeen}`,
      `Orders processed:   ${summary.ordersProcessed}`,
      `Members upserted:   ${summary.membersUpserted}`,
      `Flex credited:      ${money(summary.flexCreditedTotal)} (incl. ${money(summary.flexBonusTotal)} loyalty bonus)`,
      `Referral payouts:   ${money(summary.referralBonusTotal)}`,
      '',
      'Failing orders:',
      ...summary.errors.map((e) => `  • ${e.order}: ${e.message}`),
      '',
      'Review the sync-health page: https://csa.tinyseedfarm.com/admin/sync',
      '— Tiny Seed CSA sync',
    ];
    const text = textLines.join('\n');

    // ── HTML body ────────────────────────────────────────────────────
    const errorRows = summary.errors
      .map(
        (e) =>
          `<tr>` +
          `<td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;font-weight:600;white-space:nowrap;vertical-align:top">${escapeHtml(e.order)}</td>` +
          `<td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;color:#b91c1c">${escapeHtml(e.message)}</td>` +
          `</tr>`
      )
      .join('');

    const html =
      `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;` +
      `max-width:600px;margin:0 auto;color:#1f2937;line-height:1.6">` +
      `<p style="font-size:18px;font-weight:700;margin:0 0 4px;color:#b91c1c">` +
      `⚠️ CSA sync hit ${n} error${n === 1 ? '' : 's'}</p>` +
      `<p style="color:#6b7280;font-size:14px;margin:0 0 16px">${escapeHtml(dateStr)} · America/New_York</p>` +
      `<table style="border-collapse:collapse;font-size:14px;margin:0 0 16px">` +
      `<tr><td style="padding:2px 16px 2px 0;color:#6b7280">Orders seen</td><td style="padding:2px 0;font-weight:600">${summary.ordersSeen}</td></tr>` +
      `<tr><td style="padding:2px 16px 2px 0;color:#6b7280">Orders processed</td><td style="padding:2px 0;font-weight:600">${summary.ordersProcessed}</td></tr>` +
      `<tr><td style="padding:2px 16px 2px 0;color:#6b7280">Members upserted</td><td style="padding:2px 0;font-weight:600">${summary.membersUpserted}</td></tr>` +
      `<tr><td style="padding:2px 16px 2px 0;color:#6b7280">Flex credited</td><td style="padding:2px 0;font-weight:600">${money(summary.flexCreditedTotal)} <span style="color:#6b7280;font-weight:400">(incl. ${money(summary.flexBonusTotal)} bonus)</span></td></tr>` +
      `<tr><td style="padding:2px 16px 2px 0;color:#6b7280">Referral payouts</td><td style="padding:2px 0;font-weight:600">${money(summary.referralBonusTotal)}</td></tr>` +
      `</table>` +
      `<p style="font-size:14px;font-weight:600;margin:0 0 6px">Failing orders</p>` +
      `<table style="border-collapse:collapse;font-size:13px;width:100%;border:1px solid #e5e7eb">${errorRows}</table>` +
      `<p style="margin:20px 0 0">` +
      `<a href="https://csa.tinyseedfarm.com/admin/sync" style="display:inline-block;background:#15803d;color:#fff;` +
      `text-decoration:none;padding:10px 20px;border-radius:8px;font-weight:600;font-size:14px">` +
      `Open sync-health page</a></p>` +
      `<p style="color:#6b7280;font-size:13px;margin-top:24px">` +
      `Automated alert from the Shopify → Supabase CSA sync. You only receive this when a run has errors.</p>` +
      `</div>`;

    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: RESEND_FROM_EMAIL,
        to: [SYNC_ALERT_TO],
        subject,
        text,
        html,
      }),
    });

    if (!resp.ok) {
      const detail = await resp.text().catch(() => '');
      console.error(
        `[sync] error alert: Resend send failed (HTTP ${resp.status}): ${detail.slice(0, 300)}`
      );
    } else {
      console.log(`[sync] error alert sent to ${SYNC_ALERT_TO} (${n} error(s))`);
    }
  } catch (e) {
    // Alerting must never break the sync — log + swallow.
    console.error('[sync] error alert send threw (swallowed):', e);
  }
}

/* ──────────────────────────────────────────────────────────────────
 * Auth — constant-time-ish bearer compare against CRON_SECRET.
 * ────────────────────────────────────────────────────────────────── */

function checkAuth(request: Request): Response | null {
  const expected = CRON_SECRET;
  if (!expected) {
    // Misconfiguration — fail closed. Never run the sync without a secret.
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

/* ──────────────────────────────────────────────────────────────────
 * Season-date derivation. The season comes from the line-item title:
 * spring veg → Spring config; everything else in the 2026 catalog →
 * Summer config (the canonical season for flex/flower/summer/add-on).
 * total_weeks: weekly = totalWeeks, biweekly = ceil(totalWeeks/2).
 * ────────────────────────────────────────────────────────────────── */

interface SeasonDates {
  season: 'Spring' | 'Summer';
  start_date: string;
  end_date: string;
  total_weeks: number;
}

/**
 * Resolve start/end dates + week count for a categorized line item.
 * Returns null if no season schedule is configured for the chosen
 * share type (shouldn't happen for spring/summer in 2026, but we never
 * guess dates we don't have).
 */
function resolveSeasonDates(cat: Category): SeasonDates | null {
  const isSpring = cat.spring === true || cat.share_type === 'spring_veg';
  const scheduleKey = isSpring ? 'spring_veg' : 'summer_veg';
  const schedule: SeasonSchedule | null = getSchedule(scheduleKey);
  if (!schedule) return null;

  const totalWeeks =
    cat.freq === 'biweekly' ? Math.ceil(schedule.totalWeeks / 2) : schedule.totalWeeks;

  return {
    season: isSpring ? 'Spring' : 'Summer',
    start_date: schedule.firstDelivery,
    end_date: lastDelivery(schedule),
    total_weeks: totalWeeks,
  };
}

/* ──────────────────────────────────────────────────────────────────
 * Per-order planning. Pure-ish: classifies an order's line items into
 * member rows + flex amount + skipped home-delivery count. No writes.
 * ────────────────────────────────────────────────────────────────── */

/** The members-table share_type domain (narrower than Category — excludes
 *  home_delivery + flex, which never become member rows). */
type MemberShareType = Database['public']['Tables']['members']['Row']['share_type'];
type MemberShareSize = Database['public']['Tables']['members']['Row']['share_size'];

interface PlannedMember {
  legacy_id: string;
  share_type: MemberShareType;
  share_size: MemberShareSize;
  season: 'Spring' | 'Summer';
  start_date: string;
  end_date: string;
  total_weeks: number;
  amount_paid: number;
  title: string;
  /** The Shopify variant title for this line item — feeds the
   *  pickup_location matcher (see lib/pickup-from-variant.ts). May be null
   *  for legacy variant-less products. */
  variantTitle: string | null;
}

interface OrderPlan {
  members: PlannedMember[];
  flexAmount: number;
  homeDeliveryCount: number;
  unschedulable: string[]; // titles we categorized but had no season config for
}

function planOrder(order: ShopifyOrder): OrderPlan {
  const members: PlannedMember[] = [];
  let flexAmount = 0;
  let homeDeliveryCount = 0;
  const unschedulable: string[] = [];

  for (const li of order.lineItems) {
    // Flex FUNDS line items load store credit, not a member row. This is
    // broader than categorize()'s flex SHARE: it also catches the new
    // "CSA Farm Flex Top-Up" product (whose title carries no "2026" /
    // "summer csa", so categorize() would skip it). Any title containing
    // "flex" loads the wallet → accumulate as principal here. Handle this
    // BEFORE categorize() since top-ups categorize() to null.
    if (isFlexFundsTitle(li.title)) {
      flexAmount += li.amount;
      continue;
    }

    const cat = categorize(li.title);
    if (!cat) continue;

    // Home delivery is a delivery method, not a share — count separately.
    if (cat.share_type === 'home_delivery') {
      homeDeliveryCount += 1;
      continue;
    }

    // Defensive: categorize() may still tag a flex SHARE as 'flex' for
    // titles that contain "flex" but somehow slipped past the check above.
    // Treat it as funds, never a member row.
    if (cat.share_type === 'flex') {
      flexAmount += li.amount;
      continue;
    }

    const dates = resolveSeasonDates(cat);
    if (!dates) {
      unschedulable.push(li.title);
      continue;
    }

    // After the home_delivery + flex early-continues above, cat.share_type
    // is one of spring_veg | summer_veg | fall_veg | flower | add_on — all
    // valid members-table share_types. Narrow explicitly for the compiler.
    members.push({
      legacy_id: `SYNC-${order.id}-${li.id}`,
      share_type: cat.share_type as MemberShareType,
      share_size: cat.share_size as MemberShareSize,
      season: dates.season,
      start_date: dates.start_date,
      end_date: dates.end_date,
      total_weeks: dates.total_weeks,
      amount_paid: li.amount,
      title: li.title,
      variantTitle: li.variantTitle ?? null,
    });
  }

  return { members, flexAmount, homeDeliveryCount, unschedulable };
}

/** Order-level prefilter: does any line item load flex funds? */
function hasFlexFundsLineItem(order: ShopifyOrder): boolean {
  return order.lineItems.some((li) => isFlexFundsTitle(li.title));
}

function bestEmail(order: ShopifyOrder): string | null {
  const e = (order.customerEmail ?? order.email ?? '').trim().toLowerCase();
  return e.length > 0 ? e : null;
}

function bestName(order: ShopifyOrder, email: string): string {
  const n = `${order.firstName ?? ''} ${order.lastName ?? ''}`.trim();
  return n.length > 0 ? n : email;
}

/* ──────────────────────────────────────────────────────────────────
 * REFERRAL ATTRIBUTION
 *
 * When a referred order COMPLETES and QUALIFIES, the REFERRER earns $25
 * in Farm Flex (Shopify store credit). Qualification:
 *   - the order has a 2026 CSA line item (hasCsaLineItem), AND
 *   - order total > $300, AND
 *   - the order is paid + not cancelled/refunded (checked by the caller),
 *   - it used a discount code that matches a referral_codes.code, AND
 *   - no referrals row exists yet for this referred_order_id.
 *
 * Guards:
 *   - SELF-REFERRAL: skip if the referred order's email == the referrer's
 *     email (a member can't refer themselves).
 *   - IDEMPOTENCY: `referrals.referred_order_id` is UNIQUE. We credit the
 *     referrer, THEN insert the referrals row. On a duplicate insert
 *     (re-run / race) the UNIQUE constraint rejects it — but the per-order
 *     `shopify_order_sync` ledger guard upstream means this code runs at
 *     most once per order anyway, so the UNIQUE constraint is
 *     belt-and-suspenders. We re-check for an existing referrals row
 *     FIRST as a cheap short-circuit.
 *
 * Returns the bonus dollars actually paid (0 when nothing qualified /
 * was skipped). NEVER throws — a referral failure must not fail the
 * order's core sync (members + flex are already committed). It logs +
 * records into `errors` via the returned message.
 * ────────────────────────────────────────────────────────────────── */

interface ReferralOutcome {
  /** Bonus dollars credited to the referrer this order (0 if none). */
  credited: number;
  /** Non-fatal message to surface in the run's errors[] (null = clean). */
  error: string | null;
  /** The matched code (for dry-run / logging), or null. */
  matchedCode: string | null;
}

async function attributeReferral(
  order: ShopifyOrder,
  referredEmail: string
): Promise<ReferralOutcome> {
  const none: ReferralOutcome = { credited: 0, error: null, matchedCode: null };
  try {
    // No discount codes → nothing to attribute.
    const codes = order.discountCodes.filter((c) => c && c.trim().length > 0);
    if (codes.length === 0) return none;

    // QUALIFIER: must have a CSA line item AND total > $300. (paid /
    // not-cancelled is enforced by the caller before we get here.)
    if (!hasCsaLineItem(order)) return none;
    if (!(order.totalPrice > REFERRAL_MINIMUM_TOTAL)) return none;

    // Find a referral_codes row matching ANY code on the order. Shopify
    // uppercases codes; our codes are stored uppercase, but compare
    // case-insensitively to be safe.
    const { data: codeRows, error: codeErr } = await supabaseAdmin
      .from('referral_codes')
      .select('code, customer_id')
      .in('code', codes);
    if (codeErr) throw new Error(`referral_codes lookup: ${codeErr.message}`);

    // Case-insensitive match (defensive — `.in` is case-sensitive).
    const upper = new Set(codes.map((c) => c.trim().toUpperCase()));
    const match =
      (codeRows ?? []).find((r) => upper.has(r.code.trim().toUpperCase())) ?? null;
    if (!match) return none; // a discount code, but not one of ours

    // Resolve the REFERRER's customer (email needed for self-ref guard +
    // flex_transactions row + Shopify credit).
    const { data: referrer, error: refErr } = await supabaseAdmin
      .from('customers')
      .select('email')
      .eq('id', match.customer_id)
      .maybeSingle();
    if (refErr) throw new Error(`referrer lookup: ${refErr.message}`);
    if (!referrer?.email) {
      return { credited: 0, error: null, matchedCode: match.code };
    }
    const referrerEmail = referrer.email.trim().toLowerCase();

    // SELF-REFERRAL GUARD: a member can't refer themselves.
    if (referrerEmail === referredEmail.trim().toLowerCase()) {
      console.warn(
        `[sync] referral self-use skipped: order ${order.name}, code ${match.code}`
      );
      return { credited: 0, error: null, matchedCode: match.code };
    }

    // IDEMPOTENCY short-circuit: already attributed this order?
    const { data: existingRef, error: existRefErr } = await supabaseAdmin
      .from('referrals')
      .select('id')
      .eq('referred_order_id', order.id)
      .maybeSingle();
    if (existRefErr) throw new Error(`referrals dedupe read: ${existRefErr.message}`);
    if (existingRef) return { credited: 0, error: null, matchedCode: match.code };

    // Resolve the referrer's Shopify customer to credit store credit.
    const referrerGid = await getCustomerGidByEmail(referrerEmail);
    if (!referrerGid) {
      // The referrer has no Shopify customer — can't credit. Surface so a
      // human can reconcile, but don't fail the whole order.
      return {
        credited: 0,
        error: `referral: referrer ${referrerEmail} has no Shopify customer (order ${order.name}, code ${match.code})`,
        matchedCode: match.code,
      };
    }

    // CREDIT the referrer $25 in store credit (Farm Flex) as a PURE ADDITIVE
    // delta. issueStoreCreditDelta ADDS $25 server-side — there is NO
    // read-then-set, so a fail-soft balance read can never under-credit while
    // the ledger row claims +$25 (Shopify↔ledger drift). If Shopify rejects
    // the credit it THROWS → caught below → NO ledger rows are written, so we
    // never record a credit that didn't happen.
    //
    // ORDERING (credit success → ledger write):
    //   1. issueStoreCreditDelta($25) — if it throws, we abort before any
    //      Supabase write (the catch returns an error, no rows).
    //   2. ONLY after a confirmed-successful credit do we write the
    //      flex_transactions + referrals rows.
    // Idempotency is owned UPSTREAM by the per-order shopify_order_sync
    // ledger guard (checked at 5a before this code runs), so this path
    // executes at most once per order; the referrals.referred_order_id
    // UNIQUE is the durable belt-and-suspenders backstop.
    const outcome = await issueStoreCreditDelta(referrerGid, REFERRAL_BONUS_AMOUNT);
    const credited = outcome.credited;
    if (!(credited > 0)) {
      // Defensive: a positive amount should always credit. If Shopify
      // somehow no-op'd it, do NOT write a ledger row claiming a credit
      // that didn't happen — surface for reconciliation instead.
      return {
        credited: 0,
        error: `referral: store credit did not post for ${referrerEmail} (order ${order.name}, code ${match.code})`,
        matchedCode: match.code,
      };
    }

    // ── Credit confirmed. NOW write the ledger rows. ──────────────────
    // Record the flex transaction for the referrer (their ledger).
    const { error: ftErr } = await supabaseAdmin.from('flex_transactions').insert({
      email: referrerEmail,
      type: 'credit',
      amount: REFERRAL_BONUS_AMOUNT,
      reason: `Referral bonus — order ${order.name}`,
      order_id: order.id,
    });
    if (ftErr) {
      // Store credit is already issued in Shopify — surface loudly so the
      // ledger can be reconciled, but the referrals row (the durable
      // once-only proof) still proceeds.
      console.error(`[sync] referral flex_transactions insert failed: ${ftErr.message}`);
    }

    // Insert the referrals row — the UNIQUE referred_order_id makes this
    // the durable once-only record. A duplicate (race) is reported as
    // already-credited so we don't double-count the $ in this run.
    const { error: insErr } = await supabaseAdmin.from('referrals').insert({
      referrer_customer_id: match.customer_id,
      code: match.code,
      referred_order_id: order.id,
      referred_email: referredEmail,
      amount: REFERRAL_BONUS_AMOUNT,
    });
    if (insErr) {
      if (insErr.code === '23505') {
        // Lost a race — another run already recorded this order. The credit
        // we just posted is a DUPLICATE; surface it so a human can claw it
        // back (the upstream per-order ledger guard makes this effectively
        // impossible, hence belt-and-suspenders). Report credited:0 so the
        // run total doesn't double-count.
        return {
          credited: 0,
          error: `referral: duplicate attribution for order ${order.name} — a second $${REFERRAL_BONUS_AMOUNT} credit may have posted to ${referrerEmail}; verify in Shopify`,
          matchedCode: match.code,
        };
      }
      // The credit is issued + the flex row written; surface so the
      // referrals ledger can be reconciled.
      return {
        credited,
        error: `referral row insert (order ${order.name}): ${insErr.message}`,
        matchedCode: match.code,
      };
    }

    console.log(
      `[sync] referral credited: ${referrerEmail} +$${REFERRAL_BONUS_AMOUNT} (order ${order.name}, code ${match.code})`
    );
    return { credited, error: null, matchedCode: match.code };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error(`[sync] referral attribution failed for ${order.name}:`, message);
    return { credited: 0, error: `referral (${order.name}): ${message}`, matchedCode: null };
  }
}

/**
 * Dry-run preview of what attributeReferral WOULD do — read-only (no
 * credit, no inserts). Returns flags for the planned[] report. Mirrors the
 * live qualifier logic but stops before any write. Fail-soft → no-referral.
 */
async function planReferralPreview(
  order: ShopifyOrder,
  referredEmail: string
): Promise<{ would_credit_referral_bonus: boolean; referral_code_matched: string | null; referral_skip_reason?: string }> {
  const noRef = { would_credit_referral_bonus: false, referral_code_matched: null };
  try {
    const codes = order.discountCodes.filter((c) => c && c.trim().length > 0);
    if (codes.length === 0) return noRef;
    if (!hasCsaLineItem(order)) return { ...noRef, referral_skip_reason: 'no CSA line item' };
    if (!(order.totalPrice > REFERRAL_MINIMUM_TOTAL))
      return { ...noRef, referral_skip_reason: `total ${order.totalPrice} <= ${REFERRAL_MINIMUM_TOTAL}` };
    if (!isOrderPaid(order)) return { ...noRef, referral_skip_reason: 'not paid' };

    const { data: codeRows } = await supabaseAdmin
      .from('referral_codes')
      .select('code, customer_id')
      .in('code', codes);
    const upper = new Set(codes.map((c) => c.trim().toUpperCase()));
    const match = (codeRows ?? []).find((r) => upper.has(r.code.trim().toUpperCase())) ?? null;
    if (!match) return noRef; // a code, but not one of ours

    const { data: referrer } = await supabaseAdmin
      .from('customers')
      .select('email')
      .eq('id', match.customer_id)
      .maybeSingle();
    if (
      referrer?.email &&
      referrer.email.trim().toLowerCase() === referredEmail.trim().toLowerCase()
    ) {
      return { would_credit_referral_bonus: false, referral_code_matched: match.code, referral_skip_reason: 'self-referral' };
    }

    const { data: existingRef } = await supabaseAdmin
      .from('referrals')
      .select('id')
      .eq('referred_order_id', order.id)
      .maybeSingle();
    if (existingRef) {
      return { would_credit_referral_bonus: false, referral_code_matched: match.code, referral_skip_reason: 'already attributed' };
    }

    return { would_credit_referral_bonus: true, referral_code_matched: match.code };
  } catch (e) {
    console.error('[sync] referral preview failed (→ no-referral):', e);
    return noRef;
  }
}

/* ──────────────────────────────────────────────────────────────────
 * The handler (shared by GET + POST).
 * ────────────────────────────────────────────────────────────────── */

async function handle(request: Request, url: URL): Promise<Response> {
  // 1. Auth.
  const denial = checkAuth(request);
  if (denial) return denial;

  // 2. Config sanity.
  if (!shopifyConfigured()) {
    return jsonResponse({ ok: false, error: 'shopify_not_configured' }, 500);
  }

  const dryRun = url.searchParams.get('dry_run') === '1';
  const errors: Array<{ order: string; message: string }> = [];

  // 3. Read watermark.
  const { data: stateRow, error: stateErr } = await supabaseAdmin
    .from('shopify_sync_state')
    .select('last_synced_at')
    .eq('id', 1)
    .maybeSingle();

  if (stateErr) {
    console.error('[sync] state read failed:', stateErr.message);
    return jsonResponse({ ok: false, error: 'state_read_failed' }, 500);
  }
  // If the seed row is somehow missing, fall back to "now" so we never
  // accidentally re-import the entire order history.
  const lastSyncedAt = stateRow?.last_synced_at ?? new Date().toISOString();

  // 4. Pull candidate orders (paginated) updated since the watermark.
  let orders: ShopifyOrder[];
  try {
    orders = await fetchOrders(`updated_at:>=${lastSyncedAt}`);
  } catch (e) {
    console.error('[sync] fetchOrders failed:', e);
    return jsonResponse(
      { ok: false, error: 'shopify_fetch_failed', detail: e instanceof Error ? e.message : String(e) },
      502
    );
  }

  const ordersSeen = orders.length;
  // Keep non-cancelled orders that carry either a 2026 CSA line item OR a
  // flex-funds line item. A pure "Flex Top-Up" order has no "2026"/CSA
  // title, so hasCsaLineItem() alone would drop it — we must also admit
  // any order with a flex-funds line item so it gets credited.
  const candidates = orders.filter(
    (o) => !isOrderSkippable(o) && (hasCsaLineItem(o) || hasFlexFundsLineItem(o))
  );

  // Track the max updated_at we observe so the watermark advances exactly
  // to the frontier we've covered (never past unseen orders).
  let maxUpdatedAt = lastSyncedAt;
  for (const o of orders) {
    if (o.updatedAt > maxUpdatedAt) maxUpdatedAt = o.updatedAt;
  }

  // 4b. Pre-load the active pickup_locations once for the whole run. The
  //     pickup-from-variant matcher only depends on (id, name), and
  //     day_of_week is consumed when we set the member's pickup_day. Empty
  //     array on read failure (matching becomes a no-op rather than crashing
  //     the sync — pickup-fill is non-fatal for member creation).
  const { data: pickupRows, error: pickupErr } = await supabaseAdmin
    .from('pickup_locations')
    .select('id, name, day_of_week')
    .eq('is_active', true);
  if (pickupErr) {
    console.error('[sync] pickup_locations read failed (proceeding with no auto-pickup):', pickupErr.message);
  }
  const pickupLocations: PickupLocation[] = (pickupRows ?? []).map((r) => ({
    id: r.id,
    name: r.name,
  }));
  /** id → day_of_week (Mon/Tue/.../Sat), used to set members.pickup_day on a match. */
  const pickupDayById: Map<string, Database['public']['Tables']['members']['Row']['pickup_day']> =
    new Map((pickupRows ?? []).map((r) => [r.id, r.day_of_week]));

  let ordersProcessed = 0;
  let membersUpserted = 0;
  let flexCreditedTotal = 0;
  let flexBonusTotal = 0;
  let referralBonusTotal = 0;
  let pickupsAutoAssigned = 0;
  const planned: Array<Record<string, unknown>> = [];
  /** Variants we saw on CSA line items that the matcher could NOT resolve.
   *  Surfaced in the response so the PM can investigate naming drift. Each
   *  entry is the verbatim variantTitle, kept short to bound payload size. */
  const unmatchedVariants: string[] = [];

  // 5. Per-order processing.
  for (const order of candidates) {
    try {
      // 5a. Idempotency: already in the ledger? Skip.
      const { data: existing, error: existErr } = await supabaseAdmin
        .from('shopify_order_sync')
        .select('shopify_order_id, flex_credited')
        .eq('shopify_order_id', order.id)
        .maybeSingle();
      if (existErr) throw new Error(`ledger read: ${existErr.message}`);
      if (existing) continue; // already processed

      const email = bestEmail(order);
      if (!email) throw new Error('order has no usable email');

      const plan = planOrder(order);

      // ── DRY RUN: record the plan, write nothing ──────────────────
      if (dryRun) {
        const creditPlan = planFlexCredit(plan.flexAmount);
        const refPreview = await planReferralPreview(order, email);
        planned.push({
          order: order.name,
          order_id: order.id,
          email,
          customer_gid: order.customerGid,
          would_upsert_members: plan.members.map((m) => {
            const match = matchVariantToPickup(m.variantTitle, pickupLocations);
            return {
              legacy_id: m.legacy_id,
              share_type: m.share_type,
              share_size: m.share_size,
              season: m.season,
              start_date: m.start_date,
              end_date: m.end_date,
              total_weeks: m.total_weeks,
              amount_paid: m.amount_paid,
              variant_title: m.variantTitle,
              would_fill_pickup_location_id: match.locationId,
              pickup_match_reason: match.reason,
            };
          }),
          would_credit_flex_principal: creditPlan.principal,
          would_credit_flex_bonus: creditPlan.bonus,
          would_credit_flex_bonus_pct: Math.round(creditPlan.bonusRate * 100),
          would_credit_flex_total: creditPlan.total,
          home_delivery_items_skipped: plan.homeDeliveryCount,
          unschedulable_titles: plan.unschedulable,
          ...refPreview,
        });
        ordersProcessed += 1;
        membersUpserted += plan.members.length;
        flexCreditedTotal += creditPlan.total;
        flexBonusTotal += creditPlan.bonus;
        if (refPreview.would_credit_referral_bonus) {
          referralBonusTotal += REFERRAL_BONUS_AMOUNT;
        }
        continue;
      }

      // ── LIVE: upsert customer ────────────────────────────────────
      const addr = order.address;
      const { data: custRow, error: custErr } = await supabaseAdmin
        .from('customers')
        .upsert(
          {
            email,
            contact_name: bestName(order, email),
            customer_type: 'csa',
            shopify_customer_id: order.customerGid ? gidNumericOrNull(order.customerGid) : null,
            phone: order.phone ?? null,
            city: addr?.city ?? null,
            state: addr?.province ?? null,
            zip: addr?.zip ?? null,
          },
          { onConflict: 'email' }
        )
        .select('id')
        .maybeSingle();

      if (custErr || !custRow) {
        throw new Error(`customer upsert: ${custErr?.message ?? 'no row returned'}`);
      }
      const customerId = custRow.id;

      // ── LIVE: upsert each member row (idempotent on legacy_id) ────
      //
      // PICKUP AUTO-ASSIGN (2026-06-04): for every CSA line item with a
      // resolvable variantTitle, set members.pickup_location_id + pickup_day
      // from the matcher. Strict idempotency: NEVER overwrite a non-NULL
      // pickup_location_id (a member may have manually changed pickup via
      // /account/pickup — the sync must only FILL IN nulls).
      //
      // Implementation: pre-read each member's existing row. If it doesn't
      // exist yet (new member) OR exists with pickup_location_id IS NULL,
      // include the matched pickup in the upsert payload. Otherwise omit
      // both pickup fields so the upsert leaves them untouched.
      let upsertedThisOrder = 0;
      /** member.id of every row we touched this order — feeds the sibling-
       *  share fallback below. We need .id (not legacy_id) because the
       *  fallback queries the customer's full member set by customer_id. */
      const touchedMemberIds: string[] = [];
      for (const m of plan.members) {
        // Resolve the pickup match up-front (pure, no IO).
        const match = matchVariantToPickup(m.variantTitle, pickupLocations);
        if (match.reason.startsWith('unmatched:') && m.variantTitle) {
          // Surface for human review (de-dup'd at end, capped at 25).
          if (!unmatchedVariants.includes(m.variantTitle) && unmatchedVariants.length < 25) {
            unmatchedVariants.push(m.variantTitle);
          }
        }

        // Read existing row (if any) so we never overwrite a non-NULL pickup.
        const { data: existingMember, error: existingMemErr } = await supabaseAdmin
          .from('members')
          .select('id, pickup_location_id')
          .eq('legacy_id', m.legacy_id)
          .maybeSingle();
        if (existingMemErr) {
          throw new Error(`member existence check (${m.legacy_id}): ${existingMemErr.message}`);
        }
        const existingHasPickup =
          existingMember != null && existingMember.pickup_location_id != null;

        // Build the upsert payload. The pickup fields are CONDITIONALLY
        // included so a re-run can't NULL out a manually-set pickup.
        const basePayload = {
          legacy_id: m.legacy_id,
          customer_id: customerId,
          share_type: m.share_type,
          share_size: m.share_size,
          season: m.season,
          start_date: m.start_date,
          end_date: m.end_date,
          total_weeks: m.total_weeks,
          weeks_remaining: m.total_weeks,
          status: 'active' as const,
          payment_status: 'Paid',
          amount_paid: m.amount_paid,
          notes: `Synced from Shopify ${order.name} on ${new Date().toISOString().slice(0, 10)}. ${m.title}`,
        };

        const pickupPayload: {
          pickup_location_id?: string | null;
          pickup_day?: Database['public']['Tables']['members']['Row']['pickup_day'];
        } = {};
        let wouldFillPickup = false;
        if (existingHasPickup) {
          // Leave both fields untouched. Member-chosen pickup wins forever.
        } else if (match.locationId) {
          // No prior pickup (or row didn't exist) AND we matched → fill in.
          pickupPayload.pickup_location_id = match.locationId;
          pickupPayload.pickup_day = pickupDayById.get(match.locationId) ?? null;
          wouldFillPickup = true;
        } else {
          // No match (home_delivery, allison_park_tbd, unmatched:*, no_variant).
          // Force the field to NULL on a fresh insert only; on an update of an
          // existing NULL-pickup row this is a harmless no-op.
          pickupPayload.pickup_location_id = null;
        }

        const { data: upserted, error: memErr } = await supabaseAdmin
          .from('members')
          .upsert(
            { ...basePayload, ...pickupPayload },
            { onConflict: 'legacy_id' }
          )
          .select('id')
          .maybeSingle();
        if (memErr) throw new Error(`member upsert (${m.legacy_id}): ${memErr.message}`);
        upsertedThisOrder += 1;
        if (wouldFillPickup) pickupsAutoAssigned += 1;
        if (upserted?.id) touchedMemberIds.push(upserted.id);
      }

      // ── LIVE: SIBLING-SHARE FALLBACK (flower follows veg) ─────────
      //
      // For each member in THIS order that's still NULL on pickup AND is a
      // flower share, copy the pickup from the SAME customer's active veg/
      // flex share (real-world rule: flower customers who also buy veg pick
      // up flowers at the same stop). Same strict idempotency: only fills
      // nulls, never overwrites. Best-effort: a query failure here logs and
      // does not block the order's core sync.
      try {
        if (touchedMemberIds.length > 0) {
          const { data: customerActiveMembers, error: siblingsErr } = await supabaseAdmin
            .from('members')
            .select('id, share_type, pickup_location_id, pickup_day')
            .eq('customer_id', customerId)
            .eq('status', 'active');
          if (siblingsErr) throw new Error(`sibling-share read: ${siblingsErr.message}`);

          const sourceMember = (customerActiveMembers ?? []).find(
            (m) =>
              (m.share_type === 'summer_veg' || m.share_type === 'flex') &&
              m.pickup_location_id != null
          );
          if (sourceMember) {
            const targets = (customerActiveMembers ?? []).filter(
              (m) =>
                m.share_type === 'flower' &&
                m.pickup_location_id == null &&
                touchedMemberIds.includes(m.id)
            );
            for (const t of targets) {
              const { error: updErr } = await supabaseAdmin
                .from('members')
                .update({
                  pickup_location_id: sourceMember.pickup_location_id,
                  pickup_day:
                    sourceMember.pickup_day ??
                    pickupDayById.get(sourceMember.pickup_location_id!) ??
                    null,
                })
                .eq('id', t.id)
                .is('pickup_location_id', null); // defensive: only-if-still-null
              if (updErr) {
                console.error(
                  `[sync] sibling-share fill failed for member ${t.id}: ${updErr.message}`
                );
              } else {
                pickupsAutoAssigned += 1;
              }
            }
          }
        }
      } catch (e) {
        // Sibling-fill is best-effort; the order's member rows are already
        // committed. Log + continue.
        console.error(
          `[sync] sibling-share fallback failed for order ${order.name}:`,
          e instanceof Error ? e.message : String(e)
        );
      }

      // ── LIVE: issue flex store credit + loyalty bonus ────────────
      //
      // The member paid `plan.flexAmount` (principal). On top, they earn
      // a ladder bonus (planFlexCredit: <$250 +5%, $250–$499 +10%,
      // $500+ +12%). We credit principal + bonus as ONE store-credit ADD
      // (issueStoreCreditDelta — PURE additive, no read-then-set), then
      // record the BONUS portion as a flex_transactions row so accounting
      // can split escheatment-exempt principal from the goodwill bonus
      // (getLoyaltyBonusTotal reads these rows).
      //
      // Why additive (not balance-targeted): a balance-TARGETED top-up
      // (issueStoreCredit) reads the current balance and tops up to a
      // target. A fail-soft balance read of 0 would top up only to
      // `total` instead of `current + total` → UNDER-CREDIT, while the
      // ledger still records the full bonus. issueStoreCreditDelta ADDS
      // `total` server-side, so the money posted always matches the plan.
      //
      // Idempotency: the shopify_order_sync ledger row (checked at 5a)
      // means this whole block runs at most once per order. A re-run sees
      // the ledger row and `continue`s before reaching here, so neither
      // principal nor bonus can be issued twice. (The additive call has NO
      // self-guard by design — additive credit can't be made idempotent
      // by a balance read; the per-order ledger is the guard.)
      //
      // ORDERING (credit success → ledger write): issueStoreCreditDelta
      // THROWS on a Shopify error → the per-order try/catch records the
      // failure on the ledger and NO bonus row is written. We only write
      // the bonus flex_transactions row AFTER a confirmed-successful credit.
      let flexCreditedThisOrder = 0;
      let flexBonusThisOrder = 0;
      if (plan.flexAmount > 0) {
        if (!order.customerGid) {
          throw new Error('flex line item but order has no Shopify customer GID');
        }
        const creditPlan = planFlexCredit(plan.flexAmount);
        // ADD principal + bonus together (throws on Shopify error → no
        // ledger row written by the surrounding try/catch).
        const outcome = await issueStoreCreditDelta(order.customerGid, creditPlan.total);
        flexCreditedThisOrder = outcome.credited;

        // Record the loyalty-bonus portion in Supabase — ONLY after a
        // confirmed credit (credited > 0) and when a bonus is owed. The
        // per-order ledger guard above is what guarantees this row is
        // written at most once. We count flexBonusThisOrder only when the
        // row is actually written, so flex_bonus_total reflects real
        // recorded bonuses.
        if (outcome.credited > 0 && creditPlan.bonus > 0) {
          const pct = Math.round(creditPlan.bonusRate * 100);
          const { error: bonusErr } = await supabaseAdmin.from('flex_transactions').insert({
            email,
            type: 'credit',
            amount: creditPlan.bonus,
            reason: `Flex loyalty bonus (auto, ${pct}%)`,
            order_id: order.id,
          });
          if (bonusErr) {
            // The store credit (principal + bonus) is already issued in
            // Shopify — surface loudly so the bonus ledger row can be
            // reconciled, but the credit itself stands.
            throw new Error(`flex bonus row insert: ${bonusErr.message}`);
          }
          flexBonusThisOrder = creditPlan.bonus;
        }
      }

      // ── LIVE: write the idempotency ledger row ───────────────────
      const { error: ledgerErr } = await supabaseAdmin.from('shopify_order_sync').insert({
        shopify_order_id: order.id,
        order_name: order.name,
        members_upserted: upsertedThisOrder,
        flex_credited: flexCreditedThisOrder,
        last_error: null,
      });
      if (ledgerErr) {
        // The member rows + credit already happened; the ledger insert is
        // the durable proof. Surface loudly — a missing ledger row would
        // make a re-run re-process this order. Re-runs are still safe
        // (legacy_id upsert + balance-guarded credit), but we want to know.
        throw new Error(`ledger insert: ${ledgerErr.message}`);
      }

      // ── LIVE: referral attribution (runs AFTER the core order sync) ──
      //
      // If this PAID order used a referral code that belongs to another
      // member and qualifies (CSA line item + total > $300), credit the
      // REFERRER $25 in Farm Flex and record the referrals row. This is a
      // SEPARATE concern from the per-order ledger above: attributeReferral
      // NEVER throws (a referral hiccup must not fail an order whose
      // members + flex are already committed). It has its own idempotency
      // (referrals.referred_order_id UNIQUE) on top of the per-order ledger
      // guard. We only attempt it for paid orders.
      if (isOrderPaid(order)) {
        const refOutcome = await attributeReferral(order, email);
        referralBonusTotal += refOutcome.credited;
        if (refOutcome.error) {
          errors.push({ order: order.name, message: refOutcome.error });
        }
      }

      ordersProcessed += 1;
      membersUpserted += upsertedThisOrder;
      flexCreditedTotal += flexCreditedThisOrder;
      flexBonusTotal += flexBonusThisOrder;
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      console.error(`[sync] order ${order.name} (${order.id}) failed:`, message);
      errors.push({ order: order.name, message });

      // Record the failure on the ledger so the next run can see it and a
      // human can find it. Upsert (not insert) so a partial earlier write
      // doesn't collide. Skip ledger writes in dry-run.
      if (!dryRun) {
        const { error: errLedgerErr } = await supabaseAdmin.from('shopify_order_sync').upsert(
          {
            shopify_order_id: order.id,
            order_name: order.name,
            last_error: message.slice(0, 1000),
          },
          { onConflict: 'shopify_order_id' }
        );
        if (errLedgerErr) {
          console.error('[sync] failed to record order error:', errLedgerErr.message);
        }
      }
      // Continue with the next order — one bad order never fails the run.
    }
  }

  // 6. Advance the watermark — ONLY on a completed run, ONLY when live.
  //    A dry-run never touches state. We advance to the max updated_at we
  //    actually observed (clamped to never go backwards).
  let watermarkAdvancedTo: string | null = null;
  if (!dryRun) {
    const advanceTo = maxUpdatedAt > lastSyncedAt ? maxUpdatedAt : lastSyncedAt;
    const { error: updErr } = await supabaseAdmin
      .from('shopify_sync_state')
      .update({ last_synced_at: advanceTo })
      .eq('id', 1);
    if (updErr) {
      console.error('[sync] watermark advance failed:', updErr.message);
      errors.push({ order: '(watermark)', message: updErr.message });
    } else {
      watermarkAdvancedTo = advanceTo;
    }
  }

  // 7. ERROR ALERT — best-effort email to the farm owner if this run hit
  //    ANY error. errors[] aggregates BOTH a thrown order failure (which
  //    also stamps last_error on that order's ledger row) AND non-fatal
  //    referral / watermark issues, so it's the complete "touched an
  //    error" signal. Only live runs alert (a dry-run writes nothing and
  //    is operator-initiated). sendSyncErrorAlert is fail-soft + only
  //    sends when errors.length > 0, so this never spams a healthy run
  //    and never throws.
  if (!dryRun && errors.length > 0) {
    await sendSyncErrorAlert({
      ordersSeen,
      ordersProcessed,
      membersUpserted,
      flexCreditedTotal,
      flexBonusTotal,
      referralBonusTotal,
      errors,
    });
  }

  return jsonResponse({
    ok: errors.length === 0,
    dry_run: dryRun,
    orders_seen: ordersSeen,
    orders_processed: ordersProcessed,
    members_upserted: membersUpserted,
    /** Number of member rows whose pickup_location_id was filled in this run
     *  (incl. sibling-share fallback). Surfaces "auto-pickup is working" to
     *  the admin sync page. Always 0 on dry-run (no writes happen). */
    pickups_auto_assigned: pickupsAutoAssigned,
    /** Variants seen on CSA line items that the matcher could not resolve.
     *  De-dup'd, capped at 25. Surfaces drift in Shopify variant naming so
     *  it can be fixed (either as a new REWRITE entry or by renaming the
     *  Shopify variant). Empty array on a clean run. */
    unmatched_variants: unmatchedVariants,
    flex_credited_total: flexCreditedTotal,
    flex_bonus_total: flexBonusTotal,
    referral_bonus_total: referralBonusTotal,
    watermark_was: lastSyncedAt,
    watermark_advanced_to: watermarkAdvancedTo,
    ...(dryRun ? { planned } : {}),
    errors,
  });
}

/** gid://shopify/Customer/123 → "123"; passthrough if already numeric. */
function gidNumericOrNull(gid: string): string {
  const parts = gid.split('/');
  return parts[parts.length - 1] ?? gid;
}

export const GET: APIRoute = ({ request, url }) => handle(request, url);
export const POST: APIRoute = ({ request, url }) => handle(request, url);
