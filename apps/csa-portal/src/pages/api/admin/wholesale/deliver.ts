/**
 * POST /api/admin/wholesale/deliver   (admin only, JSON)
 *
 * Mark a wholesale order DELIVERED and — in the same tap — create AND (per the
 * account's auto_send_invoice flag) EMAIL its QuickBooks invoice.
 *
 * 2026-09-09: the entire engine moved to src/lib/wholesale-deliver.ts so the
 * DRIVER'S route screen fires the identical logic on her existing Delivered
 * tap (Todd: "one tap, same place as the CSA stops"). This endpoint is now a
 * thin wrapper — every guard (double-invoice 409, bill-from-qty_packed only,
 * server prices, fail-soft QuickBooks) lives in the lib, ONCE.
 *
 * Body: { order_id: uuid, create_invoice?: boolean (default true) }
 */
import type { APIRoute } from 'astro';
import { z } from 'zod';
import { requireAdmin } from '../../../../lib/admin';
import { isSameOriginPost, PORTAL_ORIGIN } from '../../../../lib/onboarding';
import { deliverAndInvoice } from '../../../../lib/wholesale-deliver';

export const prerender = false;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

const Body = z.object({
  order_id: z.uuid(),
  create_invoice: z.boolean().optional(),
});

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
    return json({ ok: false, error: 'invalid_input', message: 'That request was not valid.', detail: parsed.error.issues }, 400);
  }

  const result = await deliverAndInvoice(parsed.data.order_id, deliveredBy, {
    createInvoice: parsed.data.create_invoice !== false,
  });
  const { status: httpStatus, ...payload } = result;
  const order = result.ok
    ? { id: parsed.data.order_id, status: 'delivered', delivered_at: result.delivered_at, delivered_by: deliveredBy }
    : undefined;
  return json(order ? { ...payload, order, skipped_invoice: result.invoiced === false && !result.error ? true : undefined } : payload, httpStatus ?? 200);
};
