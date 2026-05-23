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
import { CRON_SECRET } from 'astro:env/server';
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
  categorize,
  issueStoreCredit,
  type ShopifyOrder,
  type Category,
} from '../../../lib/shopify';
import { isFlexFundsTitle, planFlexCredit } from '../../../lib/flex';

export const prerender = false;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
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

  let ordersProcessed = 0;
  let membersUpserted = 0;
  let flexCreditedTotal = 0;
  let flexBonusTotal = 0;
  const planned: Array<Record<string, unknown>> = [];

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
        planned.push({
          order: order.name,
          order_id: order.id,
          email,
          customer_gid: order.customerGid,
          would_upsert_members: plan.members.map((m) => ({
            legacy_id: m.legacy_id,
            share_type: m.share_type,
            share_size: m.share_size,
            season: m.season,
            start_date: m.start_date,
            end_date: m.end_date,
            total_weeks: m.total_weeks,
            amount_paid: m.amount_paid,
          })),
          would_credit_flex_principal: creditPlan.principal,
          would_credit_flex_bonus: creditPlan.bonus,
          would_credit_flex_bonus_pct: Math.round(creditPlan.bonusRate * 100),
          would_credit_flex_total: creditPlan.total,
          home_delivery_items_skipped: plan.homeDeliveryCount,
          unschedulable_titles: plan.unschedulable,
        });
        ordersProcessed += 1;
        membersUpserted += plan.members.length;
        flexCreditedTotal += creditPlan.total;
        flexBonusTotal += creditPlan.bonus;
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
      let upsertedThisOrder = 0;
      for (const m of plan.members) {
        const { error: memErr } = await supabaseAdmin
          .from('members')
          .upsert(
            {
              legacy_id: m.legacy_id,
              customer_id: customerId,
              share_type: m.share_type,
              share_size: m.share_size,
              season: m.season,
              start_date: m.start_date,
              end_date: m.end_date,
              total_weeks: m.total_weeks,
              weeks_remaining: m.total_weeks,
              status: 'active',
              payment_status: 'Paid',
              amount_paid: m.amount_paid,
              pickup_location_id: null,
              notes: `Synced from Shopify ${order.name} on ${new Date().toISOString().slice(0, 10)}. ${m.title}`,
            },
            { onConflict: 'legacy_id' }
          );
        if (memErr) throw new Error(`member upsert (${m.legacy_id}): ${memErr.message}`);
        upsertedThisOrder += 1;
      }

      // ── LIVE: issue flex store credit + loyalty bonus ────────────
      //
      // The member paid `plan.flexAmount` (principal). On top, they earn
      // a ladder bonus (planFlexCredit: <$250 +5%, $250–$499 +10%,
      // $500+ +12%). We credit principal + bonus as ONE store-credit
      // top-up, then record the BONUS portion as a flex_transactions row
      // so accounting can split escheatment-exempt principal from the
      // goodwill bonus (getLoyaltyBonusTotal reads these rows).
      //
      // Idempotency:
      //   1. PRIMARY — the shopify_order_sync ledger row (checked at 5a)
      //      means this whole block runs at most once per order. A re-run
      //      sees the ledger row and `continue`s before reaching here, so
      //      neither principal nor bonus can be issued twice.
      //   2. SECONDARY — issueStoreCredit keeps its skip-if-already
      //      balance guard intact (credits only up to the target, skips
      //      if the balance already covers it).
      let flexCreditedThisOrder = 0;
      let flexBonusThisOrder = 0;
      if (plan.flexAmount > 0) {
        if (!order.customerGid) {
          throw new Error('flex line item but order has no Shopify customer GID');
        }
        const creditPlan = planFlexCredit(plan.flexAmount);
        // Credit principal + bonus together (skip-if-already preserved).
        const outcome = await issueStoreCredit(order.customerGid, creditPlan.total);
        flexCreditedThisOrder = outcome.credited;

        // Record the loyalty-bonus portion in Supabase. Only if a credit
        // actually happened (not skipped) and a bonus is owed — a skipped
        // credit means the balance already covered it (no new money), so
        // we don't log a phantom bonus. The per-order ledger guard above
        // is what guarantees this row is written at most once. We count
        // flexBonusThisOrder only when the row is actually written, so the
        // reported flex_bonus_total reflects real recorded bonuses.
        if (!outcome.skipped && creditPlan.bonus > 0) {
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

  return jsonResponse({
    ok: errors.length === 0,
    dry_run: dryRun,
    orders_seen: ordersSeen,
    orders_processed: ordersProcessed,
    members_upserted: membersUpserted,
    flex_credited_total: flexCreditedTotal,
    flex_bonus_total: flexBonusTotal,
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
