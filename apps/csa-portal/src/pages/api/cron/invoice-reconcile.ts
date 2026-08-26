/**
 * GET|POST /api/cron/invoice-reconcile   (cron-triggered or admin-triggered)
 *
 * Links wholesale orders to the QuickBooks invoices that billed them, for
 * invoices the portal did NOT create.
 *
 * ── WHY ─────────────────────────────────────────────────────────────────────
 * /api/admin/wholesale/deliver writes invoice_number back when IT creates the
 * invoice. Todd also invoices by hand in QuickBooks, and nothing linked those.
 * Measured 2026-08-24: 65 orders read "uninvoiced" while QuickBooks had billed
 * $25,096 since June — about $11,400 billed-but-unlinked. Any "what needs
 * invoicing?" report built on that data would have double-billed the farm's
 * biggest accounts. This job makes the link exist regardless of which side
 * created the invoice.
 *
 * ── SAFETY ──────────────────────────────────────────────────────────────────
 *  • READ-ONLY against QuickBooks. Creates nothing, sends nothing, voids
 *    nothing. The only writes are invoice_number/invoiced_at on portal orders.
 *  • Never relinks an order that already has an invoice_number (guarded both
 *    in reconcile() and again in the UPDATE's .is('invoice_number', null)).
 *  • Ambiguous candidates are reported, never guessed — see invoice-reconcile.ts.
 *  • `?dry=1` runs the full match and returns the plan WITHOUT writing, so a
 *    run can always be inspected first. Same code path either way.
 *
 * Auth: `Authorization: Bearer <CRON_SECRET>`, or an admin session (so Todd can
 * trigger it from the portal).
 *
 * Returns 200 { ok, dry, linked, matches[], ambiguous[], unmatched_orders[],
 *               needs_review[] }.
 */
import type { APIRoute } from 'astro';
import { CRON_SECRET } from 'astro:env/server';
import { requireAdmin } from '../../../lib/admin';
import {
  getConnection,
  qbApi,
} from '../../../lib/quickbooks';
import {
  reconcile,
  type PortalOrderLite,
  type QbInvoiceLite,
} from '../../../lib/invoice-reconcile';
import { supabaseAdmin } from '../../../lib/supabase';

export const prerender = false;

/** How far back to reconcile. The 2026 wholesale season starts in June. */
const SINCE = '2026-06-01';
const QB_MINOR = 73;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

interface QbInvoiceRaw {
  Id: string;
  Line?: Array<{
    DetailType?: string;
    SalesItemLineDetail?: { ItemRef?: { name?: string } };
  }>;
  DocNumber?: string;
  TxnDate: string;
  TotalAmt: number;
  CustomerRef?: { value?: string };
  PrivateNote?: string;
  CustomerMemo?: { value?: string };
}

/** Page through every invoice since SINCE. QuickBooks caps a page at 100. */
async function fetchInvoices(): Promise<QbInvoiceLite[]> {
  const out: QbInvoiceLite[] = [];
  for (let start = 1; ; start += 100) {
    const q = `SELECT * FROM Invoice WHERE TxnDate >= '${SINCE}' ORDERBY TxnDate STARTPOSITION ${start} MAXRESULTS 100`;
    const res = await qbApi<{ QueryResponse: { Invoice?: QbInvoiceRaw[] } }>(
      `/query?query=${encodeURIComponent(q)}&minorversion=${QB_MINOR}`,
    );
    const page = res.QueryResponse.Invoice ?? [];
    for (const i of page) {
      // Loren invoices flowers separately; those never match a vegetable order.
      // QuickBooks nests them under the "FLOWER SALES" item parent.
      const billable = (i.Line ?? []).filter((L) => L.DetailType === 'SalesItemLineDetail');
      const isFloral =
        billable.length > 0 &&
        billable.every((L) =>
          /flower/i.test(String(L.SalesItemLineDetail?.ItemRef?.name ?? '')),
        );
      out.push({
        id: i.Id,
        isFloral,
        docNumber: (i.DocNumber ?? '').trim(),
        txnDate: i.TxnDate,
        totalCents: Math.round(Number(i.TotalAmt) * 100),
        customerId: i.CustomerRef?.value ?? '',
        privateNote: i.PrivateNote ?? '',
        memo: i.CustomerMemo?.value ?? '',
      });
    }
    if (page.length < 100) break;
  }
  return out;
}

export const GET: APIRoute = async (ctx) => run(ctx);
export const POST: APIRoute = async (ctx) => run(ctx);

async function run({ request, locals, url }: Parameters<APIRoute>[0]): Promise<Response> {
  // Cron secret, else an admin session.
  const header = request.headers.get('authorization') ?? '';
  const provided = /^Bearer\s+(.+)$/i.exec(header)?.[1]?.trim() ?? '';
  const cronOk = Boolean(CRON_SECRET) && provided === CRON_SECRET;
  if (!cronOk) {
    const auth = await requireAdmin(locals.supabase, locals.user);
    if (auth.response) return auth.response;
  }

  const dry = url.searchParams.get('dry') === '1';

  const conn = await getConnection();
  if (!conn.connected) {
    return json({ ok: false, error: 'quickbooks_not_connected' }, 503);
  }

  // ── Load both sides ───────────────────────────────────────────────────────
  let invoices: QbInvoiceLite[];
  try {
    invoices = await fetchInvoices();
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    console.error('[invoice-reconcile] QuickBooks read failed:', detail);
    return json({ ok: false, error: 'quickbooks_failed', detail: detail.slice(0, 300) }, 502);
  }

  const { data: accts, error: acctErr } = await supabaseAdmin
    .from('wholesale_accounts')
    .select('id, restaurant_name, qbo_customer_id');
  if (acctErr) return json({ ok: false, error: 'fetch_failed', detail: acctErr.message }, 500);
  const acctById = new Map(
    (accts ?? []).map((a) => [
      a.id as string,
      a as { id: string; restaurant_name: string | null; qbo_customer_id: string | null },
    ]),
  );

  const { data: orderRows, error: ordErr } = await supabaseAdmin
    .from('wholesale_orders')
    .select('id, account_id, delivery_date, status, invoice_number')
    .gte('delivery_date', SINCE);
  if (ordErr) return json({ ok: false, error: 'fetch_failed', detail: ordErr.message }, 500);

  const live = (orderRows ?? []).filter(
    (o) => o.status !== 'cancelled' && o.status !== 'draft',
  );

  // Order value = what was PACKED (falling back to ordered when packing has not
  // happened). Same rule deliver.ts bills on, so totals are comparable.
  const { data: itemRows, error: itemErr } = await supabaseAdmin
    .from('wholesale_order_items')
    .select('order_id, qty, qty_packed, line_total_cents');
  if (itemErr) return json({ ok: false, error: 'fetch_failed', detail: itemErr.message }, 500);
  const cents = new Map<string, number>();
  for (const it of itemRows ?? []) {
    const eff = it.qty_packed ?? it.qty;
    if (!eff) continue;
    cents.set(it.order_id as string, (cents.get(it.order_id as string) ?? 0) + (it.line_total_cents ?? 0));
  }

  const orders: PortalOrderLite[] = live.map((o) => ({
    id: o.id as string,
    qboCustomerId: acctById.get(o.account_id as string)?.qbo_customer_id ?? null,
    deliveryDate: o.delivery_date as string,
    totalCents: cents.get(o.id as string) ?? 0,
    invoiceNumber: (o.invoice_number as string | null) ?? null,
  }));

  const result = reconcile(invoices, orders);

  const nameOf = (orderId: string): string => {
    const o = live.find((r) => r.id === orderId);
    return acctById.get(o?.account_id as string)?.restaurant_name ?? 'unknown';
  };
  const dateOf = (orderId: string): string =>
    orders.find((o) => o.id === orderId)?.deliveryDate ?? '';

  // ── Write the links ───────────────────────────────────────────────────────
  const linked: Array<Record<string, unknown>> = [];
  const failed: Array<{ order_id: string; detail: string }> = [];
  if (!dry) {
    const now = new Date().toISOString();
    for (const m of result.matches) {
      const { error, data } = await supabaseAdmin
        .from('wholesale_orders')
        .update({ invoice_number: m.invoiceNumber, invoiced_at: now })
        .eq('id', m.orderId)
        // Belt and braces: reconcile() already excluded linked orders, but a
        // concurrent Deliver tap between the read and here must win, not lose.
        .is('invoice_number', null)
        .select('id');
      if (error) failed.push({ order_id: m.orderId, detail: error.message });
      else if (data && data.length > 0) linked.push({ ...m, account: nameOf(m.orderId), delivery_date: dateOf(m.orderId) });
    }
  }

  // Same customer + same delivery date, but the money disagrees — so it may not
  // be the same sale at all. NOT linked, reported for a person to judge. On
  // 2026-08-24 this pattern paired Black Radish's $299 veg delivery with a $100
  // Bulk Flower Bucket invoice dated the same day.
  const needsReview = result.review.map((r) => ({
    account: nameOf(r.orderId),
    delivery_date: r.deliveryDate,
    invoice_number: r.invoiceNumber,
    // Positive => QuickBooks billed MORE than the order is worth.
    difference_dollars: r.differenceCents / 100,
  }));

  return json({
    ok: true,
    dry,
    scanned: { invoices: invoices.length, orders: orders.length },
    matched: result.matches.length,
    linked: dry ? 0 : linked.length,
    by_tier: result.matches.reduce<Record<string, number>>((a, m) => {
      a[m.tier] = (a[m.tier] ?? 0) + 1;
      return a;
    }, {}),
    matches: (dry ? result.matches.map((m) => ({ ...m, account: nameOf(m.orderId), delivery_date: dateOf(m.orderId) })) : linked),
    needs_review: needsReview,
    ambiguous: result.ambiguous.map((a) => ({
      ...a,
      orders: a.orderIds.map((id) => `${nameOf(id)} ${dateOf(id)}`),
    })),
    unmatched_orders: result.unmatchedOrders
      .filter((o) => o.totalCents > 0)
      .map((o) => ({
        account: nameOf(o.id),
        delivery_date: o.deliveryDate,
        amount: o.totalCents / 100,
      }))
      .sort((a, b) => a.delivery_date.localeCompare(b.delivery_date)),
    write_failures: failed,
  });
}
