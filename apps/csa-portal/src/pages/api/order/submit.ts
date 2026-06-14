/**
 * POST /api/order/submit — PUBLIC, token-authenticated chef order submit.
 *
 * NO login. The permanent secret `wholesale_accounts.order_token` is the gate
 * (validated inside the place_wholesale_order RPC, which runs SECURITY DEFINER).
 * This handler:
 *
 *   1. CSRF (isSameOriginPost) — the form posts from /order/<token> same-origin.
 *   2. Parse + Zod-validate the token + the cart lines [{ product_id, qty }].
 *   3. Compute the NEXT-WEDNESDAY delivery date server-side (never from client).
 *   4. Call place_wholesale_order — which does the SERVER-SIDE PRICE LOOKUP from
 *      wholesale_products (active only) + applies the account's tier discount,
 *      then writes the order + items atomically. We NEVER trust client prices
 *      (this fixes the old system's P0 bug).
 *   5. Fire a fail-soft confirmation email (Resend) to the chef + BCC Todd.
 *   6. Redirect 303 → /order/<token>/confirmed?o=<order_id> (the confirmation
 *      screen), or back to /order/<token>?error=<code> on a soft failure.
 *
 * Body (multipart/form-data):
 *   - token   the account's order_token
 *   - lines   JSON string: [{ "product_id": uuid, "qty": int }, ...]
 */
import type { APIRoute } from 'astro';
import { z } from 'zod';
import { RESEND_API_KEY, RESEND_FROM_EMAIL } from 'astro:env/server';
import { isSameOriginPost, PORTAL_ORIGIN } from '../../../lib/onboarding';
import { supabaseAdmin } from '../../../lib/supabase';
import { nextDeliveryWednesday, prettyDeliveryDate, CUTOFF_LABEL } from '../../../lib/wholesale-order';
import {
  sendWholesaleOrderConfirmation,
  type WholesaleOrderEmailLine,
} from '../../../lib/wholesale-order-email';
import {
  resolveOrderRecipients,
  type WholesaleContact,
} from '../../../lib/wholesale-contacts';

export const prerender = false;

const LineSchema = z.object({
  product_id: z.uuid(),
  qty: z.number().int().positive().max(100000),
});

/** Redirect target back to a token's order page with a flash code. */
function backToOrder(token: string, code: string): string {
  return `/order/${encodeURIComponent(token)}?error=${code}`;
}

export const POST: APIRoute = async ({ request, redirect }) => {
  if (!isSameOriginPost(request, PORTAL_ORIGIN)) {
    return new Response('Forbidden', { status: 403 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    // No token to redirect back to — fall back to a generic landing.
    return new Response('Bad Request', { status: 400 });
  }

  const token = String(form.get('token') ?? '').trim();
  const linesRaw = String(form.get('lines') ?? '').trim();

  if (!token) {
    return new Response('Bad Request', { status: 400 });
  }

  // ── Parse + validate the cart lines. ────────────────────────────────
  let parsedLines: Array<{ product_id: string; qty: number }>;
  try {
    const arr = JSON.parse(linesRaw);
    const result = z.array(LineSchema).min(1).max(200).safeParse(arr);
    if (!result.success) {
      return redirect(backToOrder(token, 'empty'), 303);
    }
    // Collapse duplicate product ids (defensive — sum their qty).
    const byId = new Map<string, number>();
    for (const l of result.data) {
      byId.set(l.product_id, (byId.get(l.product_id) ?? 0) + l.qty);
    }
    parsedLines = Array.from(byId.entries()).map(([product_id, qty]) => ({ product_id, qty }));
  } catch {
    return redirect(backToOrder(token, 'invalid_input'), 303);
  }

  if (parsedLines.length === 0) {
    return redirect(backToOrder(token, 'empty'), 303);
  }

  // ── Server-computed delivery date (NEXT Wednesday) — never from client. ──
  const deliveryDate = nextDeliveryWednesday();

  // ── Place the order atomically with a SERVER-SIDE price lookup. The token
  //    is validated INSIDE the RPC (the gate). ──────────────────────────────
  const { data: rpcData, error: rpcErr } = await supabaseAdmin.rpc('place_wholesale_order', {
    p_token: token,
    p_lines: parsedLines,
    p_delivery_date: deliveryDate,
  });

  if (rpcErr) {
    console.error('[api/order/submit] rpc failed:', rpcErr.message);
    return redirect(backToOrder(token, 'submit_failed'), 303);
  }

  const result = rpcData as unknown as
    | { ok: true; order_id: string; total_cents: number; item_count: number; delivery_date: string; restaurant_name: string }
    | { error: string };

  if (!result || 'error' in result) {
    const code = (result && 'error' in result) ? result.error : 'submit_failed';
    const known = new Set(['empty', 'no_available_items', 'invalid_token', 'invalid_input']);
    return redirect(backToOrder(token, known.has(code) ? code : 'submit_failed'), 303);
  }

  // ── Fail-soft confirmation email. The order is already placed; nothing below
  //    may block or change that. We re-read the saved items + the account email
  //    and hand it to the Resend helper (which itself never throws). ──────────
  try {
    // Pull each item with its product unit so the email reads "× Arugula (lb)".
    // product_name + the exact line money were snapshotted onto the item row at
    // place time; we join wholesale_products only for the unit label.
    type ItemRow = {
      product_name: string | null;
      qty: number;
      line_total_cents: number;
      product: { unit: string } | null;
    };
    const { data: items } = await supabaseAdmin
      .from('wholesale_order_items')
      .select('product_name, qty, line_total_cents, product:wholesale_products ( unit )')
      .eq('order_id', result.order_id)
      .overrideTypes<ItemRow[], { merge: false }>();

    const emailLines: WholesaleOrderEmailLine[] = (items ?? []).map((r) => ({
      name: r.product_name ?? 'Item',
      unit: r.product?.unit ?? '',
      qty: r.qty,
      lineCents: r.line_total_cents,
    }));

    // Resolve the order recipients. Each account can have MULTIPLE contact
    // emails (`wholesale_account_contacts`), each flagged for what it receives.
    // Order confirmations go to every contact with receives_orders=true; if
    // none are flagged (or no contacts exist), we fall back to the legacy
    // wholesale_accounts.email, then (inside the email helper) to the owner.
    // The contacts table is admin-RLS-only, so we read it with supabaseAdmin —
    // but STRICTLY scoped to this token's account_id (never trust a client id).
    const { data: acct } = await supabaseAdmin
      .from('wholesale_accounts')
      .select('id, email')
      .eq('order_token', token)
      .maybeSingle()
      .overrideTypes<{ id: string; email: string | null }, { merge: false }>();

    let contacts: WholesaleContact[] = [];
    if (acct?.id) {
      const { data: contactRows } = await supabaseAdmin
        .from('wholesale_account_contacts')
        .select('email, name, receives_orders, receives_invoices')
        .eq('account_id', acct.id)
        .overrideTypes<WholesaleContact[], { merge: false }>();
      contacts = contactRows ?? [];
    }

    const orderRecipients = resolveOrderRecipients(contacts, acct?.email ?? null);

    await sendWholesaleOrderConfirmation({
      to: orderRecipients,
      restaurantName: result.restaurant_name,
      lines: emailLines,
      totalCents: result.total_cents,
      deliveryLabel: prettyDeliveryDate(result.delivery_date),
      cutoffLabel: CUTOFF_LABEL,
      resendApiKey: RESEND_API_KEY,
      resendFromEmail: RESEND_FROM_EMAIL,
    });
  } catch (e) {
    console.error('[api/order/submit] confirmation email step threw (swallowed):', e);
  }

  // ── Confirmation screen. ────────────────────────────────────────────
  return redirect(`/order/${encodeURIComponent(token)}/confirmed?o=${encodeURIComponent(result.order_id)}`, 303);
};
