/**
 * wholesale-deliver.ts — THE deliver-and-invoice engine, extracted from
 * /api/admin/wholesale/deliver so the DRIVER'S route screen can fire it too.
 *
 * WHY (Todd, 2026-09-09, all caps): "SHE SAID SHE IS HITTING DELIVERED. SO IT
 * NEEDS TO BE IN THE SAME PLACE AS THE DELIVERED FOR THE CSA STOPS… TOOOOOO
 * MUCH FRICTION." The driver marks every stop delivered on /admin/route/[id];
 * wholesale invoicing lived on a different page, so on the first live day the
 * crew packed 8 orders and ZERO invoices fired. One tap must do both.
 *
 * Callers:
 *   - /api/admin/wholesale/deliver (the original button — now a thin wrapper)
 *   - /api/admin/route/[id]/stops/[stopId]/status (driver's Delivered tap on a
 *     wholesale stop → auto-deliver+invoice that restaurant's packed orders)
 *
 * EVERY invariant from the original endpoint is preserved verbatim:
 *   • invoiced_at IS NOT NULL ⇒ refuse before ANY QuickBooks call, re-asserted
 *     at write time (double-tap cannot double-bill).
 *   • Invoice is built from qty_packed, NEVER qty. Unpacked ⇒ refuse.
 *   • Server-side prices only. Unpriced billable line ⇒ refuse.
 *   • Customer resolution: mapped qbo_customer_id wins; exact-name fallback;
 *     never auto-created here.
 *   • FAIL-SOFT: delivery marking persists even when QuickBooks fails.
 *   • AUTO-SEND (per-account auto_send_invoice) immediately after creation,
 *     audit row in notification_log either way.
 */
import {
  buildItemIndex,
  createInvoice,
  findCustomerByName,
  getConnection,
  resolveItemId,
  sendInvoice,
  type InvoiceLineInput,
} from './quickbooks';
import { supabaseAdmin } from './supabase';

export interface DeliverResult {
  ok: boolean;
  error?: string;
  message?: string;
  status?: number;
  invoiced?: boolean;
  invoice?: { id: string; number: string; total: number; lines?: number; generic_lines?: string[] };
  invoice_number?: string | null;
  invoiced_at?: string | null;
  not_delivered?: string[];
  delivered_at?: string;
  sent?: boolean;
  sent_to?: string | null;
  send_skipped?: string | null;
  send_error?: string | null;
  detail?: string;
}

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

const ORDER_COLS =
  'id, status, delivery_date, account_id, total_amount, packed_at, delivered_at, delivered_by, invoiced_at, invoice_number';

export async function deliverAndInvoice(
  orderId: string,
  deliveredBy: string | null,
  opts: { createInvoice?: boolean } = {},
): Promise<DeliverResult> {
  const wantInvoice = opts.createInvoice !== false;

  // ── 1) Load the order and run every gate BEFORE touching QuickBooks. ───────
  const { data: order, error: orderErr } = await supabaseAdmin
    .from('wholesale_orders')
    .select(ORDER_COLS)
    .eq('id', orderId)
    .maybeSingle<OrderRow>();
  if (orderErr) {
    console.error('[wholesale-deliver] order fetch failed:', orderErr.message);
    return { ok: false, error: 'fetch_failed', detail: orderErr.message, status: 500 };
  }
  if (!order) return { ok: false, error: 'not_found', message: 'That order no longer exists.', status: 404 };
  if (order.status === 'cancelled') {
    return { ok: false, error: 'order_cancelled', message: 'That order is cancelled — it cannot be delivered or invoiced.', status: 409 };
  }
  // THE guard. Nothing below may run for an already-invoiced order.
  if (order.invoiced_at) {
    return {
      ok: false,
      error: 'already_invoiced',
      invoice_number: order.invoice_number,
      invoiced_at: order.invoiced_at,
      message: order.invoice_number
        ? `Already invoiced — QuickBooks invoice ${order.invoice_number}. Nothing was billed again.`
        : 'Already invoiced. Nothing was billed again.',
      status: 409,
    };
  }
  if (!order.packed_at) {
    return {
      ok: false,
      error: 'not_packed',
      message: 'Mark this order packed first — the invoice bills what was actually packed, so there is nothing to bill until then.',
      status: 400,
    };
  }

  // ── 2) Stamp the delivery. Persists even if QuickBooks then fails. ─────────
  const deliveredAt = new Date().toISOString();
  const { data: deliveredRows, error: deliverErr } = await supabaseAdmin
    .from('wholesale_orders')
    .update({ status: 'delivered', delivered_at: deliveredAt, delivered_by: deliveredBy })
    .eq('id', orderId)
    .is('invoiced_at', null)
    .neq('status', 'cancelled')
    .select('id');
  if (deliverErr) {
    console.error('[wholesale-deliver] delivery update failed:', deliverErr.message);
    return { ok: false, error: 'save_failed', message: 'Could not mark the order delivered. Nothing was invoiced.', detail: deliverErr.message, status: 500 };
  }
  if (!deliveredRows || deliveredRows.length === 0) {
    const { data: nowRow } = await supabaseAdmin
      .from('wholesale_orders')
      .select(ORDER_COLS)
      .eq('id', orderId)
      .maybeSingle<OrderRow>();
    return {
      ok: false,
      error: nowRow?.invoiced_at ? 'already_invoiced' : 'order_cancelled',
      invoice_number: nowRow?.invoice_number ?? null,
      message: nowRow?.invoiced_at
        ? `Already invoiced${nowRow.invoice_number ? ` — QuickBooks invoice ${nowRow.invoice_number}` : ''}. Nothing was billed again.`
        : 'That order is cancelled — it cannot be delivered or invoiced.',
      status: 409,
    };
  }

  const base: DeliverResult = { ok: true, delivered_at: deliveredAt };
  if (!wantInvoice) return { ...base, invoiced: false };

  // ── 3) Build the invoice from what was PACKED. ─────────────────────────────
  const { data: itemRows, error: itemsErr } = await supabaseAdmin
    .from('wholesale_order_items')
    .select('id, product_name, qty, qty_packed, unit_price_cents')
    .eq('order_id', orderId)
    .overrideTypes<ItemRow[], { merge: false }>();
  if (itemsErr) {
    console.error('[wholesale-deliver] item fetch failed:', itemsErr.message);
    return { ...base, invoiced: false, error: 'fetch_failed', message: 'Delivered. Could not read the order lines, so no invoice was created.' };
  }
  const all = itemRows ?? [];
  const billable = all.filter((i) => Number(i.qty_packed) > 0);
  const notDelivered = all.filter((i) => !(Number(i.qty_packed) > 0)).map((i) => i.product_name ?? 'Item');
  if (billable.length === 0) {
    return { ...base, invoiced: false, error: 'nothing_delivered', not_delivered: notDelivered, message: 'Delivered, but no line had a packed quantity above zero — there is nothing to invoice.' };
  }
  const unpriced = billable.filter((i) => !Number.isFinite(Number(i.unit_price_cents)));
  if (unpriced.length > 0) {
    return { ...base, invoiced: false, error: 'missing_price', message: `Delivered. ${unpriced.length} line(s) have no unit price, so no invoice was created — fix the order and invoice it from QuickBooks.` };
  }

  let restaurantName = '';
  let mappedCustomerId: string | null = null;
  let autoSend = false;
  let accountEmail = '';
  if (order.account_id) {
    const { data: acct } = await supabaseAdmin
      .from('wholesale_accounts')
      .select('restaurant_name, qbo_customer_id, auto_send_invoice, email')
      .eq('id', order.account_id)
      .maybeSingle<{ restaurant_name: string; qbo_customer_id: string | null; auto_send_invoice: boolean | null; email: string | null }>();
    restaurantName = (acct?.restaurant_name ?? '').trim();
    mappedCustomerId = (acct?.qbo_customer_id ?? '').trim() || null;
    autoSend = acct?.auto_send_invoice === true;
    accountEmail = (acct?.email ?? '').trim();
  }
  if (!restaurantName) {
    return { ...base, invoiced: false, error: 'no_account', message: 'Delivered. This order has no wholesale account, so there is no customer to invoice — link an account and invoice it from QuickBooks.' };
  }

  const conn = await getConnection();
  if (!conn.connected) {
    return { ...base, invoiced: false, error: 'quickbooks_not_connected', message: 'Delivered. QuickBooks is not connected, so no invoice was created.' };
  }

  let invoice: { id: string; number: string; total: number };
  const fellBack: string[] = [];
  try {
    const customerId = mappedCustomerId ?? (await findCustomerByName(restaurantName));
    if (!customerId) {
      return { ...base, invoiced: false, error: 'qb_customer_not_found', message: `Delivered. This account is not linked to a QuickBooks customer, and none is named exactly "${restaurantName}". Open the account and set its QuickBooks customer, then invoice again.` };
    }
    const index = await buildItemIndex();
    const lines: InvoiceLineInput[] = [];
    for (const it of billable) {
      const productName = (it.product_name ?? '').trim() || 'Wholesale produce';
      const { itemId, matched } = resolveItemId(index, productName);
      if (!matched) fellBack.push(productName);
      lines.push({
        item: productName,
        itemId,
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
      privateNote: `Tiny Seed OS — delivery ${order.delivery_date} (portal order ${orderId.slice(0, 8)})`,
    });
    invoice = {
      id: created.id,
      number: (created.docNumber ?? '').trim() || created.id,
      total: Number(created.total) || 0,
    };
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    console.error('[wholesale-deliver] QuickBooks invoice failed:', detail);
    return { ...base, invoiced: false, error: 'quickbooks_failed', message: 'Delivered. QuickBooks did not accept the invoice — create it there, or try again.', detail: detail.slice(0, 300) };
  }

  // ── 4) Write the link back. ────────────────────────────────────────────────
  const invoicedAt = new Date().toISOString();
  const { error: linkErr } = await supabaseAdmin
    .from('wholesale_orders')
    .update({ invoice_number: invoice.number, invoiced_at: invoicedAt })
    .eq('id', orderId)
    .is('invoiced_at', null);
  if (linkErr) {
    console.error(`[wholesale-deliver] invoice ${invoice.number} created in QuickBooks but write-back failed for order ${orderId}:`, linkErr.message);
    return { ...base, invoiced: true, invoice: { ...invoice, generic_lines: fellBack }, error: 'writeback_failed', message: `QuickBooks invoice ${invoice.number} was created, but the portal could not record it. Do NOT deliver again — check QuickBooks.` };
  }

  // ── 5) AUTO-SEND (per-account), immediately after creation. ────────────────
  let sent = false;
  let sentTo = '';
  let sendError: string | null = null;
  if (autoSend) {
    const recipients: string[] = [];
    if (order.account_id) {
      const { data: contactRows } = await supabaseAdmin
        .from('wholesale_account_contacts')
        .select('email, receives_invoices')
        .eq('account_id', order.account_id);
      for (const c of contactRows ?? []) {
        const e = (c.email ?? '').trim();
        if (c.receives_invoices && e && !recipients.includes(e)) recipients.push(e);
      }
    }
    if (recipients.length === 0 && accountEmail) recipients.push(accountEmail);
    if (recipients.length === 0) {
      sendError = 'no_billing_email';
    } else {
      sentTo = recipients.join(',');
      try {
        const status = await sendInvoice(invoice.id, sentTo);
        sent = status === 'EmailSent';
        if (!sent) sendError = `email_status_${status}`;
      } catch (e) {
        sendError = (e instanceof Error ? e.message : String(e)).slice(0, 200);
        console.error(`[wholesale-deliver] invoice ${invoice.number} created but auto-send failed:`, sendError);
      }
      const { error: logErr } = await supabaseAdmin.from('notification_log').insert({
        channel: 'email',
        notification_type: 'wholesale_invoice_autosent',
        recipient: sentTo || '(none)',
        status: sent ? 'sent' : 'failed',
        provider: 'quickbooks',
        subject: `Invoice ${invoice.number} — ${restaurantName}`,
        metadata: { order_id: orderId, invoice_number: invoice.number, total: invoice.total, error: sendError },
      });
      if (logErr) console.error('[wholesale-deliver] notification_log insert failed:', logErr.message);
    }
  }

  return {
    ...base,
    invoiced: true,
    invoice: { id: invoice.id, number: invoice.number, total: invoice.total, lines: billable.length, generic_lines: fellBack },
    invoiced_at: invoicedAt,
    not_delivered: notDelivered,
    sent,
    sent_to: sent ? sentTo : null,
    send_skipped: !autoSend ? 'auto_send_off' : null,
    send_error: sendError,
  };
}

/**
 * Driver-tap hook: given a route stop's wholesale CUSTOMER id and the route's
 * date, deliver+invoice every packed, uninvoiced order for that restaurant on
 * that date. Fail-soft by design — the stop completion NEVER depends on this.
 */
export async function deliverWholesaleStop(
  wholesaleCustomerId: string,
  deliveryDate: string,
  deliveredBy: string | null,
): Promise<Array<{ order_id: string; restaurant: string; result: DeliverResult }>> {
  const out: Array<{ order_id: string; restaurant: string; result: DeliverResult }> = [];
  const { data: acct } = await supabaseAdmin
    .from('wholesale_accounts')
    .select('id, restaurant_name')
    .eq('customer_id', wholesaleCustomerId)
    .maybeSingle<{ id: string; restaurant_name: string }>();
  if (!acct) return out;
  const { data: orders } = await supabaseAdmin
    .from('wholesale_orders')
    .select('id, packed_at, invoiced_at, status')
    .eq('account_id', acct.id)
    .eq('delivery_date', deliveryDate)
    .neq('status', 'cancelled')
    .is('invoiced_at', null);
  for (const o of orders ?? []) {
    if (!o.packed_at) {
      out.push({ order_id: o.id, restaurant: acct.restaurant_name, result: { ok: false, error: 'not_packed', message: 'Order not packed — no invoice created.' } });
      continue;
    }
    out.push({ order_id: o.id, restaurant: acct.restaurant_name, result: await deliverAndInvoice(o.id, deliveredBy) });
  }
  return out;
}
