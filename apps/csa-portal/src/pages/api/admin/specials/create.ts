/**
 * POST /api/admin/specials/create   (admin only, JSON)
 *
 * SPECIALS quick-add (Phase 3, Todd-approved 2026-09-07): one call creates a
 * one-off offer (a flex_inventory item) and attaches member orders — the
 * workflow behind the tomato BONANZA (13 orders entered by hand over a
 * weekend), systematized. From here the item flows to the harvest sheet, pack
 * lists, and — when separate_container — per-unit "1 of N" label cells on the
 * Avery 6-up run, with NO hand-carried tickets.
 *
 * Body (zod):
 *   {
 *     week_starting: 'YYYY-MM-DD' (a Monday — the cycle key),
 *     name, unit, price_cents, separate_container,
 *     members: [{ member_id, qty, payment: 'flex' | 'invoice' | 'cash' }]
 *   }
 *
 * Payment:
 *   'flex'    → debit the member's Shopify store credit NOW + write the
 *               flex_transactions journal row (money canon: every movement has
 *               a ledger row). Insufficient balance = order stays, payment is
 *               reported back as 'flex_insufficient' — a human decides next.
 *   'invoice' → recorded; invoices go out via the existing QB flow (most CSA
 *               members have no QuickBooks customer — auto-creating them here
 *               would litter the ledger; deliberate non-goal for v1).
 *   'cash'    → recorded on the response; nothing moves.
 *
 * Idempotent-ish: an existing (member, item) order is skipped, never doubled —
 * re-posting a member list after a partial failure is safe.
 */
import type { APIRoute } from 'astro';
import { z } from 'zod';
import { requireAdmin } from '../../../../lib/admin';
import { isSameOriginPost, PORTAL_ORIGIN } from '../../../../lib/onboarding';
import { supabaseAdmin } from '../../../../lib/supabase';
import {
  debitStoreCredit,
  getCustomerGidByEmail,
  getStoreCreditAccount,
} from '../../../../lib/shopify';

export const prerender = false;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

const Body = z.object({
  week_starting: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  name: z.string().trim().min(2).max(120),
  unit: z.string().trim().min(1).max(40),
  price_cents: z.number().int().positive().max(10_000_000),
  separate_container: z.boolean().optional(),
  members: z
    .array(
      z.object({
        member_id: z.uuid(),
        qty: z.number().finite().positive().max(1000),
        payment: z.enum(['flex', 'invoice', 'cash']),
      }),
    )
    .min(1)
    .max(400),
});

export const POST: APIRoute = async ({ request, locals }) => {
  if (!isSameOriginPost(request, PORTAL_ORIGIN)) {
    return new Response('Forbidden', { status: 403 });
  }
  const auth = await requireAdmin(locals.supabase, locals.user);
  if (auth.response) return auth.response;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return json({ ok: false, error: 'bad_body' }, 400);
  }
  const parsed = Body.safeParse(raw);
  if (!parsed.success) {
    return json({ ok: false, error: 'invalid_input', detail: parsed.error.issues }, 400);
  }
  const { week_starting, name, unit, price_cents, members } = parsed.data;
  const separateContainer = parsed.data.separate_container === true;

  // Weekly cycles key on Mondays — a mis-keyed week would hide the item from
  // every pack/label surface, which is worse than a hard error here.
  const dow = new Date(`${week_starting}T12:00:00Z`).getUTCDay();
  if (dow !== 1) {
    return json(
      { ok: false, error: 'not_a_monday', message: 'week_starting must be the cycle Monday.' },
      400,
    );
  }

  // ── 1) Find-or-create the flex_inventory item for that week. ───────────────
  const { data: existing } = await supabaseAdmin
    .from('flex_inventory')
    .select('id, price_cents')
    .eq('cycle_code', 'WEEKLY')
    .eq('week_starting', week_starting)
    .eq('name', name)
    .maybeSingle<{ id: string; price_cents: number }>();

  let itemId: string;
  if (existing) {
    itemId = existing.id;
    // Keep flags/price current — the admin form is the operator's intent.
    await supabaseAdmin
      .from('flex_inventory')
      .update({ price_cents, unit, separate_container: separateContainer, is_active: true })
      .eq('id', itemId);
  } else {
    const { data: created, error: createErr } = await supabaseAdmin
      .from('flex_inventory')
      .insert({
        cycle_code: 'WEEKLY',
        week_starting,
        name,
        unit,
        price_cents,
        category: 'Specials',
        available_qty: 999,
        remaining_qty: 999,
        is_active: true,
        separate_container: separateContainer,
        description: `Special — created ${new Date().toISOString().slice(0, 10)} via /admin/specials.`,
      })
      .select('id')
      .single<{ id: string }>();
    if (createErr || !created) {
      return json({ ok: false, error: 'item_create_failed', detail: createErr?.message }, 500);
    }
    itemId = created.id;
  }

  // ── 2) Member orders + payment. ────────────────────────────────────────────
  const results: Array<{
    member_id: string;
    name: string | null;
    status: string;
    detail?: string;
  }> = [];

  for (const m of members) {
    const { data: mem } = await supabaseAdmin
      .from('members')
      .select('id, customer_id, customers ( email, contact_name )')
      .eq('id', m.member_id)
      .maybeSingle<{
        id: string;
        customer_id: string;
        customers: { email: string | null; contact_name: string | null } | null;
      }>();
    const email = (mem?.customers?.email ?? '').trim().toLowerCase();
    const displayName = mem?.customers?.contact_name ?? null;
    if (!mem) {
      results.push({ member_id: m.member_id, name: null, status: 'member_not_found' });
      continue;
    }

    // Skip an existing order for this item — never double a member.
    const { data: dup } = await supabaseAdmin
      .from('flex_orders')
      .select('id')
      .eq('member_id', m.member_id)
      .eq('flex_item_id', itemId)
      .limit(1);
    if (dup && dup.length > 0) {
      results.push({ member_id: m.member_id, name: displayName, status: 'already_ordered' });
      continue;
    }

    const totalCents = Math.round(price_cents * m.qty);
    const { error: orderErr } = await supabaseAdmin.from('flex_orders').insert({
      cycle_code: 'WEEKLY',
      week_starting,
      member_id: m.member_id,
      flex_item_id: itemId,
      qty: m.qty,
      unit_price_cents: price_cents,
      total_cents: totalCents,
      status: 'pending',
      ordered_at: new Date().toISOString(),
    });
    if (orderErr) {
      results.push({ member_id: m.member_id, name: displayName, status: 'order_failed', detail: orderErr.message });
      continue;
    }

    if (m.payment !== 'flex') {
      results.push({ member_id: m.member_id, name: displayName, status: `ordered_${m.payment}` });
      continue;
    }

    // FLEX: debit store credit now + journal row. Any failure leaves the order
    // standing with payment unresolved — surfaced, never silent.
    try {
      if (!email) throw new Error('member has no email');
      const gid = await getCustomerGidByEmail(email);
      if (!gid) throw new Error('no Shopify customer');
      const acct = await getStoreCreditAccount(gid);
      if (!acct) throw new Error('no store-credit account');
      const dollars = totalCents / 100;
      if (acct.balance < dollars) {
        results.push({
          member_id: m.member_id,
          name: displayName,
          status: 'flex_insufficient',
          detail: `balance $${acct.balance.toFixed(2)} < $${dollars.toFixed(2)}`,
        });
        continue;
      }
      const outcome = await debitStoreCredit(acct.accountId, dollars);
      const { error: jErr } = await supabaseAdmin.from('flex_transactions').insert({
        member_id: m.member_id,
        email,
        type: 'debit',
        amount: dollars,
        reason: `Special: ${name} ×${m.qty} — week of ${week_starting}`,
        order_id: `special:${itemId}:${m.member_id}`,
      });
      // Paid orders move to 'locked' — still packable (labels/pack read
      // pending|locked|fulfilled) but OUT of the pending pool the flex-debit
      // backfill sweeps, so a later backfill run can never double-charge.
      await supabaseAdmin
        .from('flex_orders')
        .update({ status: 'locked' })
        .eq('member_id', m.member_id)
        .eq('flex_item_id', itemId);
      if (jErr) {
        // Money moved but the ledger write failed — LOUD, this is the one
        // outcome that must never pass silently (money canon).
        results.push({
          member_id: m.member_id,
          name: displayName,
          status: 'flex_debited_JOURNAL_FAILED',
          detail: jErr.message,
        });
        continue;
      }
      results.push({
        member_id: m.member_id,
        name: displayName,
        status: 'flex_paid',
        detail: `new balance $${outcome.newBalance.toFixed(2)}`,
      });
    } catch (e) {
      results.push({
        member_id: m.member_id,
        name: displayName,
        status: 'flex_failed',
        detail: (e instanceof Error ? e.message : String(e)).slice(0, 160),
      });
    }
  }

  return json({ ok: true, item_id: itemId, week_starting, results });
};
