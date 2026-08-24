/**
 * POST /api/admin/wholesale/deliver   (admin only, JSON)
 *
 * Mark a wholesale order DELIVERED and — in the same tap — create its
 * QuickBooks invoice. The second half of the PACK → DELIVER → INVOICE lifecycle
 * migration 0088 opened up, and the first code anywhere that calls
 * quickbooks.ts's createInvoice().
 *
 * ── WHY THIS EXISTS ──────────────────────────────────────────────────────────
 * Todd invoices by hand in QuickBooks and nothing ever writes the invoice
 * number back to the order, so the portal cannot tell which deliveries were
 * billed. Measured 2026-08-16: 74 wholesale orders, 14 with an invoice_number,
 * against 77 QuickBooks invoices for 2026. That gap is why $2,300 of real
 * deliveries went unbilled for weeks and why every "uninvoiced" report was
 * wrong. Marking delivery and creating the invoice must be ONE action, or the
 * link goes missing again.
 *
 * Body (zod-validated):
 *   { order_id: uuid, create_invoice?: boolean (default true) }
 *
 * ── INVARIANTS (each one is a way to bill a chef wrongly) ────────────────────
 *  • invoiced_at IS NOT NULL ⇒ 409, before ANY QuickBooks call. This is the
 *    guard that stops a double-tapped delivery from billing a restaurant twice,
 *    and it is re-asserted at write time so a concurrent tap cannot slip past
 *    the read.
 *  • THE INVOICE IS BUILT FROM qty_packed, NEVER FROM qty. A line with
 *    qty_packed 0/NULL was not delivered and is not billed. A chef is never
 *    charged for produce they did not receive.
 *  • Money comes from unit_price_cents only — the server-side priced source of
 *    truth. Nothing here recomputes a price from a catalog or a client value.
 *  • The order must be PACKED first: qty_packed is only meaningful once someone
 *    confirmed what went in the box. Unpacked ⇒ 400.
 *  • Item mapping is EXACT-normalised-name only, with a generic fallback item
 *    carrying the real product name in the Description. No fuzzy matching —
 *    it previously mapped "Kale (bunch)" onto "Curly Kale (12 ct)".
 *  • The customer must ALREADY exist in QuickBooks under that exact name. We
 *    never auto-create one (see the note on findCustomerByName below).
 *  • The invoice is CREATED, never sent. Todd reviews and emails it himself.
 *  • FAIL-SOFT: if QuickBooks is down, the delivery marking still persists and
 *    the response is { ok:true, invoiced:false, error } — a billing outage must
 *    never block a driver standing in a restaurant doorway. The order is left
 *    delivered-but-uninvoiced, which is a valid, retryable state (the
 *    wholesale_orders_uninvoiced_idx index exists for exactly this).
 *
 * Returns 200 { ok:true, ... } or { ok:false, error, message } with
 * 400/403/404/409/500.
 */
import type { APIRoute } from 'astro';
import { z } from 'zod';
import { requireAdmin } from '../../../../lib/admin';
import { isSameOriginPost, PORTAL_ORIGIN } from '../../../../lib/onboarding';
import {
  buildItemIndex,
  createInvoice,
  findCustomerByName,
  getConnection,
  resolveItemId,
  type InvoiceLineInput,
} from '../../../../lib/quickbooks';
import { supabaseAdmin } from '../../../../lib/supabase';

export const prerender = false;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

const Body = z.object({
  order_id: z.uuid(),
  // Default TRUE: the whole point is that delivering bills the order. `false`
  // is the deliberate "record the drop-off, I'll invoice this one myself" path.
  create_invoice: z.boolean().optional(),
});

type OrderRow = {
  id: string;
  status: string;
  delivery_date: string;
  account_id: string | null;
  total_amount: number | null;
  packed_at: string | null;
  delivered_at: string | null;
  delivered_by: string | null;
  invoiced_at: string | null;
  invoice_number: string | null;
};

type ItemRow = {
  id: string;
  product_name: string | null;
  qty: number | null;
  qty_packed: number | null;
  unit_price_cents: number | null;
};

export const POST: APIRoute = async ({ request, locals }) => {
  if (!isSameOriginPost(request, PORTAL_ORIGIN)) {
    return new Response('Forbidden', { status: 403 });
  }
  const auth = await requireAdmin(locals.supabase, locals.user);
  if (auth.response) return auth.response;
  const deliveredBy = auth.ctx.user.email ?? null;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return json({ ok: false, error: 'bad_body', message: 'Could not read the request.' }, 400);
  }

  const parsed = Body.safeParse(raw);
  if (!parsed.success) {
    return json(
      {
        ok: false,
        error: 'invalid_input',
        message: 'That request was not valid.',
        detail: parsed.error.issues,
      },
      400,
    );
  }
  const { order_id } = parsed.data;
  const wantInvoice = parsed.data.create_invoice !== false;

  // ── 1) Load the order and run every gate BEFORE touching QuickBooks. ───────
  const ORDER_COLS =
    'id, status, delivery_date, account_id, total_amount, packed_at, delivered_at, delivered_by, invoiced_at, invoice_number';
  const { data: order, error: orderErr } = await supabaseAdmin
    .from('wholesale_orders')
    .select(ORDER_COLS)
    .eq('id', order_id)
    .maybeSingle<OrderRow>();

  if (orderErr) {
    console.error('[wholesale/deliver] order fetch failed:', orderErr.message);
    return json({ ok: false, error: 'fetch_failed', detail: orderErr.message }, 500);
  }
  if (!order) {
    return json({ ok: false, error: 'not_found', message: 'That order no longer exists.' }, 404);
  }
  if (order.status === 'cancelled') {
    return json(
      {
        ok: false,
        error: 'order_cancelled',
        message: 'That order is cancelled — it cannot be delivered or invoiced.',
      },
      409,
    );
  }
  // THE guard. Nothing below this line may run for an already-invoiced order.
  if (order.invoiced_at) {
    return json(
      {
        ok: false,
        error: 'already_invoiced',
        invoice_number: order.invoice_number,
        invoiced_at: order.invoiced_at,
        message: order.invoice_number
          ? `Already invoiced — QuickBooks invoice ${order.invoice_number}. Nothing was billed again.`
          : 'Already invoiced. Nothing was billed again.',
      },
      409,
    );
  }
  if (!order.packed_at) {
    return json(
      {
        ok: false,
        error: 'not_packed',
        message:
          'Mark this order packed first — the invoice bills what was actually packed, so there is nothing to bill until then.',
      },
      400,
    );
  }

  // ── 2) Stamp the delivery. This persists even if QuickBooks then fails. ────
  const deliveredAt = new Date().toISOString();
  const { data: deliveredRows, error: deliverErr } = await supabaseAdmin
    .from('wholesale_orders')
    // updated_at is owned by the set_updated_at BEFORE UPDATE trigger.
    .update({
      status: 'delivered',
      delivered_at: deliveredAt,
      delivered_by: deliveredBy,
    })
    .eq('id', order_id)
    // Re-assert BOTH guards at write time: if another tap invoiced or cancelled
    // this order between our read and this write, match zero rows instead of
    // racing it.
    .is('invoiced_at', null)
    .neq('status', 'cancelled')
    .select('id');

  if (deliverErr) {
    console.error('[wholesale/deliver] delivery update failed:', deliverErr.message);
    return json(
      {
        ok: false,
        error: 'save_failed',
        message: 'Could not mark the order delivered. Nothing was invoiced.',
        detail: deliverErr.message,
      },
      500,
    );
  }
  if (!deliveredRows || deliveredRows.length === 0) {
    // Lost the race — re-read to tell the driver which of the two it was.
    const { data: now } = await supabaseAdmin
      .from('wholesale_orders')
      .select(ORDER_COLS)
      .eq('id', order_id)
      .maybeSingle<OrderRow>();
    return json(
      {
        ok: false,
        error: now?.invoiced_at ? 'already_invoiced' : 'order_cancelled',
        invoice_number: now?.invoice_number ?? null,
        message: now?.invoiced_at
          ? `Already invoiced${now.invoice_number ? ` — QuickBooks invoice ${now.invoice_number}` : ''}. Nothing was billed again.`
          : 'That order is cancelled — it cannot be delivered or invoiced.',
      },
      409,
    );
  }

  const base = {
    ok: true as const,
    order: {
      id: order_id,
      status: 'delivered',
      delivery_date: order.delivery_date,
      delivered_at: deliveredAt,
      delivered_by: deliveredBy,
    },
  };

  if (!wantInvoice) {
    return json({ ...base, invoiced: false, skipped_invoice: true });
  }

  // ── 3) Build the invoice from what was PACKED. ─────────────────────────────
  const { data: itemRows, error: itemsErr } = await supabaseAdmin
    .from('wholesale_order_items')
    .select('id, product_name, qty, qty_packed, unit_price_cents')
    .eq('order_id', order_id)
    .overrideTypes<ItemRow[], { merge: false }>();

  if (itemsErr) {
    console.error('[wholesale/deliver] item fetch failed:', itemsErr.message);
    return json({
      ...base,
      invoiced: false,
      error: 'fetch_failed',
      message: 'Delivered. Could not read the order lines, so no invoice was created.',
    });
  }

  const all = itemRows ?? [];
  // Not-delivered lines are DROPPED, not zero-billed: qty_packed 0 or NULL
  // means the chef never got it.
  const billable = all.filter((i) => Number(i.qty_packed) > 0);
  const notDelivered = all
    .filter((i) => !(Number(i.qty_packed) > 0))
    .map((i) => i.product_name ?? 'Item');

  if (billable.length === 0) {
    return json({
      ...base,
      invoiced: false,
      error: 'nothing_delivered',
      not_delivered: notDelivered,
      message:
        'Delivered, but no line had a packed quantity above zero — there is nothing to invoice.',
    });
  }
  // A billable line with no price is a data fault, not something to guess at.
  const unpriced = billable.filter((i) => !Number.isFinite(Number(i.unit_price_cents)));
  if (unpriced.length > 0) {
    return json({
      ...base,
      invoiced: false,
      error: 'missing_price',
      message: `Delivered. ${unpriced.length} line(s) have no unit price, so no invoice was created — fix the order and invoice it from QuickBooks.`,
    });
  }

  // Restaurant name = the QuickBooks DisplayName we bill under.
  let restaurantName = '';
  if (order.account_id) {
    const { data: acct } = await supabaseAdmin
      .from('wholesale_accounts')
      .select('restaurant_name')
      .eq('id', order.account_id)
      .maybeSingle<{ restaurant_name: string }>();
    restaurantName = (acct?.restaurant_name ?? '').trim();
  }
  if (!restaurantName) {
    return json({
      ...base,
      invoiced: false,
      error: 'no_account',
      message:
        'Delivered. This order has no wholesale account, so there is no customer to invoice — link an account and invoice it from QuickBooks.',
    });
  }

  const conn = await getConnection();
  if (!conn.connected) {
    return json({
      ...base,
      invoiced: false,
      error: 'quickbooks_not_connected',
      message: 'Delivered. QuickBooks is not connected, so no invoice was created.',
    });
  }

  let invoice: { id: string; number: string; total: number };
  const fellBack: string[] = [];
  try {
    // Exact-name customer only — never auto-created. A near-miss name would
    // open a SECOND QuickBooks customer for the same restaurant and split its
    // ledger, which is far more expensive to unpick than a "fix the name"
    // message. The delivery is already recorded either way.
    const customerId = await findCustomerByName(restaurantName);
    if (!customerId) {
      return json({
        ...base,
        invoiced: false,
        error: 'qb_customer_not_found',
        restaurant: restaurantName,
        message: `Delivered. No QuickBooks customer named exactly "${restaurantName}" — add or rename it in QuickBooks, then tap Delivered again.`,
      });
    }

    const index = await buildItemIndex();
    const lines: InvoiceLineInput[] = [];
    for (const it of billable) {
      const productName = (it.product_name ?? '').trim() || 'Wholesale produce';
      const { itemId, matched } = resolveItemId(index, productName);
      if (!matched) fellBack.push(productName);
      lines.push({
        item: productName,
        itemId, // pre-resolved: createInvoice will NOT find-or-create an item
        // Always the real product name, so a generic-item line still reads
        // correctly on the chef's invoice.
        description: productName,
        qty: Number(it.qty_packed),
        unitPrice: Number(it.unit_price_cents) / 100,
      });
    }

    const created = await createInvoice({
      customerName: restaurantName,
      customerId,
      lines,
      txnDate: order.delivery_date,
      privateNote: `Tiny Seed OS — delivery ${order.delivery_date} (portal order ${order_id.slice(0, 8)})`,
    });
    // DocNumber can come back empty when the company has custom transaction
    // numbers switched off — fall back to the Id so invoice_number is never
    // blank on an order we just billed.
    invoice = {
      id: created.id,
      number: (created.docNumber ?? '').trim() || created.id,
      total: Number(created.total) || 0,
    };
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    console.error('[wholesale/deliver] QuickBooks invoice failed:', detail);
    return json({
      ...base,
      invoiced: false,
      error: 'quickbooks_failed',
      message: 'Delivered. QuickBooks did not accept the invoice — create it there, or try again.',
      detail: detail.slice(0, 300),
    });
  }

  // ── 4) Write the link back. This is the row that was missing. ─────────────
  const invoicedAt = new Date().toISOString();
  const { error: linkErr } = await supabaseAdmin
    .from('wholesale_orders')
    .update({ invoice_number: invoice.number, invoiced_at: invoicedAt })
    .eq('id', order_id)
    // Still-null guard: if a concurrent request invoiced first, do not clobber
    // its number. The duplicate-invoice window is the QuickBooks round-trip
    // above; this at least keeps the recorded number the first one.
    .is('invoiced_at', null);

  if (linkErr) {
    // The invoice EXISTS in QuickBooks. Say so loudly and print the number —
    // silently swallowing this is how an order gets billed twice later.
    console.error(
      `[wholesale/deliver] invoice ${invoice.number} created in QuickBooks but write-back failed for order ${order_id}:`,
      linkErr.message,
    );
    return json({
      ...base,
      invoiced: true,
      invoice: { ...invoice, generic_lines: fellBack },
      error: 'writeback_failed',
      message: `QuickBooks invoice ${invoice.number} was created, but the portal could not record it. Do NOT tap Delivered again — check QuickBooks.`,
    });
  }

  return json({
    ...base,
    invoiced: true,
    invoice: {
      id: invoice.id,
      number: invoice.number,
      total: invoice.total,
      lines: billable.length,
      // Lines billed against the generic "Wholesale" item because no exact
      // QuickBooks item matched. Surfaced so Todd can add the item once and
      // have it map itself next week.
      generic_lines: fellBack,
    },
    invoiced_at: invoicedAt,
    not_delivered: notDelivered,
  });
};
