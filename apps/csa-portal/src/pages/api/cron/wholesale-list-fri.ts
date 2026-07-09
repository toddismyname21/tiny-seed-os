/**
 * GET|POST /api/cron/wholesale-list-fri   (cron-triggered, NOT user-facing)
 *
 * The FRIDAY-period twin of /api/cron/wholesale-list-wed. Same "the list is
 * open" availability email (products + tier prices + personal order link), but
 * for FRIDAY delivery (cutoff Thursday 7 AM ET), and every link carries
 * ?day=fri so the chef lands in the Friday-delivery flow. Scheduled Wednesdays
 * 15:00 UTC (~11:00 AM ET).
 *
 * Historically the Friday period got NOTHING chef-facing automatically (audit
 * §3): it depended on Todd acting on a 3:30 PM reminder to himself, and the
 * order page hid Friday behind a ?day=fri link nobody sent. This closes that.
 *
 * AUDIENCE (Todd's chosen overall-list audience): EVERY account with an order
 * token AND at least one order recipient — INCLUDING accounts already in for
 * this Friday (they get an extra "you're already in — reply to change anything"
 * line). Vendor accounts (Harvie / Market Wagon) + TEST_EXCLUDES are excluded.
 *
 * GATED behind portal_settings 'wholesale_list_fri_enabled' (seeded false). Same
 * Bearer CRON_SECRET guard; Resend send is fail-soft; notification_log per
 * account.
 */
import type { APIRoute } from 'astro';
import { CRON_SECRET, RESEND_API_KEY, RESEND_FROM_EMAIL } from 'astro:env/server';
import { supabaseAdmin } from '../../../lib/supabase';
import type { Json } from '../../../lib/database.types';
import {
  nextDeliveryFriday, prettyDeliveryDate, formatCents, effectiveUnitCents, CUTOFF_LABEL_FRIDAY,
} from '../../../lib/wholesale-order';
import { groupByCategory } from '../../../lib/wholesale-categories';
import { categoryEmoji } from '../../../lib/flex-order';
import { resolveOrderRecipients, type WholesaleContact } from '../../../lib/wholesale-contacts';
import { TEST_EXCLUDES } from '../../../lib/campaign';

export const prerender = false;

const ADMIN_ORIGIN = 'https://csa.tinyseedfarm.com';
/** Replies land in a monitored human inbox (Todd + the CSA staff inbox). */
const REPLY_TO = ['todd@tinyseedfarmpgh.com', 'tinyseedcsa@gmail.com'];
/** Vendor accounts the PO importer creates — never an availability recipient. */
const VENDOR_ACCOUNT_NAMES = new Set(['harvie', 'market wagon']);
/** portal_settings gate flag + the notification_log type for this send. */
const GATE_FLAG = 'wholesale_list_fri_enabled';
const NOTIFICATION_TYPE = 'chef_availability_fri';
const TEMPLATE = 'wholesale-list-fri';
const SUBJECT = "This week's list is open — Friday delivery, order by Thursday 7 AM";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

function checkAuth(request: Request): Response | null {
  const expected = CRON_SECRET;
  if (!expected) return jsonResponse({ ok: false, error: 'cron_secret_not_configured' }, 500);
  const header = request.headers.get('authorization') ?? '';
  const m = /^Bearer\s+(.+)$/i.exec(header);
  const provided = m?.[1]?.trim() ?? '';
  if (provided.length === 0 || provided !== expected) {
    return jsonResponse({ ok: false, error: 'unauthorized' }, 401);
  }
  return null;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string
  ));
}

/** Read a portal_settings flag; true only when the stored value === 'true'. */
async function readFlag(key: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from('portal_settings')
    .select('value')
    .eq('key', key)
    .maybeSingle();
  if (error) {
    console.error(`[${TEMPLATE}] portal_settings read failed (${key}):`, error.message);
    return false;
  }
  return (data as { value: string | null } | null)?.value === 'true';
}

/* ── Availability table (priced per account) ─────────────────────────────── */
interface CatalogItem {
  name: string; category: string | null; unit: string; sort_order: number; unitCents: number;
}

/** Text-alternative availability list, grouped by category. */
function availabilityText(items: CatalogItem[]): string {
  const groups = groupByCategory(items);
  const lines: string[] = [];
  for (const g of groups) {
    lines.push(g.category.toUpperCase());
    for (const it of g.items) {
      lines.push(`  ${it.name} — ${formatCents(it.unitCents)} / ${it.unit}`);
    }
    lines.push('');
  }
  return lines.join('\n').trimEnd();
}

/** HTML availability table, grouped by category (light, simple, mobile-safe). */
function availabilityHtml(items: CatalogItem[]): string {
  const groups = groupByCategory(items);
  const rows = groups.map((g) => {
    const head =
      `<tr><td colspan="2" style="padding:16px 0 4px;font-weight:700;font-size:13px;` +
      `text-transform:uppercase;letter-spacing:.04em;color:#166534">` +
      `${escapeHtml(categoryEmoji(g.category))} ${escapeHtml(g.category)}</td></tr>`;
    const body = g.items.map((it) =>
      `<tr>` +
      `<td style="padding:3px 0;border-bottom:1px solid #f1f5f1;color:#1f2937">${escapeHtml(it.name)}</td>` +
      `<td style="padding:3px 0;border-bottom:1px solid #f1f5f1;color:#374151;text-align:right;white-space:nowrap">` +
      `<strong>${escapeHtml(formatCents(it.unitCents))}</strong> <span style="color:#9ca3af">/ ${escapeHtml(it.unit)}</span></td>` +
      `</tr>`
    ).join('');
    return head + body;
  }).join('');
  return `<table style="width:100%;border-collapse:collapse;font-size:14px;margin:8px 0 4px">${rows}</table>`;
}

function bodyText(items: CatalogItem[], deliveryLabel: string, orderUrl: string, alreadyOrdered: boolean): string {
  return (
    'Good morning from Tiny Seed Farm —\n\n' +
    `This week's wholesale availability is open for ${deliveryLabel} delivery. ` +
    `Order by ${CUTOFF_LABEL_FRIDAY} ET.\n\n` +
    (alreadyOrdered
      ? "You're already in for Friday — reply to this email to change anything.\n\n"
      : '') +
    "Here's what's fresh this week:\n\n" +
    availabilityText(items) + '\n\n' +
    `Order here: ${orderUrl}\n\n` +
    'Questions or changes? Just reply to this email.\n' +
    '— Tiny Seed Farm'
  );
}

function bodyHtml(items: CatalogItem[], deliveryLabel: string, orderUrl: string, alreadyOrdered: boolean): string {
  return (
    `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:600px;margin:0 auto;color:#1f2937;line-height:1.6;font-size:15px">` +
    `<p style="margin:0 0 6px;font-weight:700;color:#166534">🌱 Tiny Seed Farm — Wholesale</p>` +
    `<p style="margin:0 0 14px">This week's availability is open for <strong>${escapeHtml(deliveryLabel)}</strong> delivery. Order by <strong>${escapeHtml(CUTOFF_LABEL_FRIDAY)} ET</strong>.</p>` +
    (alreadyOrdered
      ? `<p style="margin:0 0 14px;padding:10px 14px;background:#f0fdf4;border-radius:8px;color:#166534">You're already in for Friday — reply to this email to change anything.</p>`
      : '') +
    `<p style="margin:14px 0 0;font-weight:600">What's fresh this week</p>` +
    availabilityHtml(items) +
    `<p style="margin:18px 0 14px">` +
    `<a href="${escapeHtml(orderUrl)}" style="display:inline-block;background:#166534;color:#fff;text-decoration:none;padding:11px 22px;border-radius:8px;font-weight:600">Order for ${escapeHtml(deliveryLabel)} →</a></p>` +
    `<p style="margin:0 0 14px;color:#374151">Questions or changes? Just reply to this email.</p>` +
    `<p style="margin:0">— Tiny Seed Farm</p>` +
    `</div>`
  );
}

async function sendOne(to: string[], text: string, html: string): Promise<{ ok: boolean; detail: string }> {
  try {
    if (!RESEND_API_KEY || !RESEND_FROM_EMAIL) return { ok: false, detail: 'resend_not_configured' };
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: RESEND_FROM_EMAIL, to, reply_to: REPLY_TO, subject: SUBJECT, text, html }),
    });
    if (!resp.ok) {
      const detail = await resp.text().catch(() => '');
      console.error(`[${TEMPLATE}] Resend failed (HTTP ${resp.status}): ${detail.slice(0, 200)}`);
      return { ok: false, detail: `resend_http_${resp.status}` };
    }
    return { ok: true, detail: 'sent' };
  } catch (e) {
    console.error(`[${TEMPLATE}] sendOne threw (swallowed):`, e);
    return { ok: false, detail: 'threw' };
  }
}

async function logRow(recipient: string, status: 'sent' | 'failed', detail: string | null, metadata: Record<string, unknown>): Promise<void> {
  try {
    await supabaseAdmin.from('notification_log').insert({
      channel: 'email',
      notification_type: NOTIFICATION_TYPE,
      recipient,
      status,
      provider: 'resend',
      subject: SUBJECT,
      template: TEMPLATE,
      error_message: detail,
      metadata: metadata as unknown as Json,
    });
  } catch (e) {
    console.error(`[${TEMPLATE}] notification_log insert threw (swallowed):`, e);
  }
}

async function handle(request: Request): Promise<Response> {
  const denial = checkAuth(request);
  if (denial) return denial;
  const ranAt = new Date().toISOString();

  // GATE — deploy-safe until Todd approves the copy + arms the flag.
  if (!(await readFlag(GATE_FLAG))) {
    return jsonResponse({ ok: true, skipped: 'disabled', ran_at: ranAt });
  }

  const deliveryDate = nextDeliveryFriday();
  const deliveryLabel = prettyDeliveryDate(deliveryDate);

  // Active catalog — the list is built ONCE (price differs only by tier, applied
  // per account below). Refuse to send an empty list.
  type ProdRow = { name: string; category: string | null; unit: string; sort_order: number; price_cents: number };
  const { data: prodData, error: prodErr } = await supabaseAdmin
    .from('wholesale_products')
    .select('name, category, unit, sort_order, price_cents')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })
    .overrideTypes<ProdRow[], { merge: false }>();
  if (prodErr) {
    console.error(`[${TEMPLATE}] product query failed:`, prodErr.message);
    return jsonResponse({ ok: false, error: 'product_query_failed', detail: prodErr.message }, 500);
  }
  const products = prodData ?? [];
  if (products.length === 0) {
    // Never mail an empty availability list.
    return jsonResponse({ ok: true, skipped: 'no_active_products', delivery_date: deliveryDate, ran_at: ranAt });
  }

  // Pricing tiers → discount by id (one row today; correct for future tiers).
  const { data: tierData } = await supabaseAdmin
    .from('wholesale_pricing_tiers')
    .select('id, discount_pct')
    .overrideTypes<Array<{ id: string; discount_pct: number }>, { merge: false }>();
  const discountByTier = new Map<string, number>();
  for (const t of tierData ?? []) discountByTier.set(t.id, t.discount_pct ?? 0);

  // Accounts with a token (audience = the overall list, incl. already-ordered).
  type Acct = { id: string; restaurant_name: string; email: string | null; order_token: string | null; pricing_tier_id: string | null };
  const { data: acctData, error: acctErr } = await supabaseAdmin
    .from('wholesale_accounts')
    .select('id, restaurant_name, email, order_token, pricing_tier_id')
    .not('order_token', 'is', null)
    .overrideTypes<Acct[], { merge: false }>();
  if (acctErr) {
    console.error(`[${TEMPLATE}] accounts query failed:`, acctErr.message);
    return jsonResponse({ ok: false, error: 'accounts_query_failed', detail: acctErr.message }, 500);
  }
  const accounts = (acctData ?? []).filter(
    (a) => a.order_token && !VENDOR_ACCOUNT_NAMES.has(a.restaurant_name.trim().toLowerCase())
  );
  const accountIds = accounts.map((a) => a.id);

  // Which accounts already have a (non-cancelled) order for this Friday — for
  // the personalized "you're already in" line (NOT a skip).
  const orderedSet = new Set<string>();
  if (accountIds.length > 0) {
    const { data: ordRows } = await supabaseAdmin
      .from('wholesale_orders')
      .select('account_id, status')
      .eq('delivery_date', deliveryDate)
      .in('account_id', accountIds);
    for (const o of (ordRows ?? []) as Array<{ account_id: string | null; status: string }>) {
      if (o.account_id && o.status !== 'cancelled') orderedSet.add(o.account_id);
    }
  }

  // Contacts by account.
  const contactsByAccount = new Map<string, WholesaleContact[]>();
  if (accountIds.length > 0) {
    const { data: contactRows } = await supabaseAdmin
      .from('wholesale_account_contacts')
      .select('account_id, email, name, receives_orders, receives_invoices')
      .in('account_id', accountIds);
    for (const c of (contactRows ?? []) as Array<{
      account_id: string | null; email: string; name: string | null;
      receives_orders: boolean; receives_invoices: boolean;
    }>) {
      if (!c.account_id) continue;
      const list = contactsByAccount.get(c.account_id) ?? [];
      list.push({ email: c.email, name: c.name, receives_orders: c.receives_orders, receives_invoices: c.receives_invoices });
      contactsByAccount.set(c.account_id, list);
    }
  }

  let sent = 0;
  let failed = 0;
  let skippedNoRecipient = 0;
  const results: Array<{ account: string; to: string[]; outcome: string; already_ordered: boolean }> = [];

  for (const acct of accounts) {
    const recipients = resolveOrderRecipients(contactsByAccount.get(acct.id) ?? [], acct.email)
      .filter((e) => !TEST_EXCLUDES.has(e.trim().toLowerCase()));
    if (recipients.length === 0) { skippedNoRecipient += 1; continue; }

    const discountPct = acct.pricing_tier_id ? (discountByTier.get(acct.pricing_tier_id) ?? 0) : 0;
    const items: CatalogItem[] = products.map((p) => ({
      name: p.name, category: p.category, unit: p.unit, sort_order: p.sort_order,
      unitCents: effectiveUnitCents(p.price_cents, discountPct),
    }));

    const alreadyOrdered = orderedSet.has(acct.id);
    // Friday links carry ?day=fri so the chef lands in the Friday-delivery flow.
    const orderUrl = `${ADMIN_ORIGIN}/order/${acct.order_token}?day=fri`;
    const outcome = await sendOne(
      recipients,
      bodyText(items, deliveryLabel, orderUrl, alreadyOrdered),
      bodyHtml(items, deliveryLabel, orderUrl, alreadyOrdered),
    );
    if (outcome.ok) sent += 1; else failed += 1;
    await logRow(recipients.join(','), outcome.ok ? 'sent' : 'failed', outcome.ok ? null : outcome.detail, {
      ranAt, account_id: acct.id, restaurant_name: acct.restaurant_name,
      delivery_date: deliveryDate, already_ordered: alreadyOrdered, period: 'fri',
    });
    results.push({ account: acct.restaurant_name, to: recipients, outcome: outcome.detail, already_ordered: alreadyOrdered });
  }

  return jsonResponse({
    ok: true,
    period: 'fri',
    delivery_date: deliveryDate,
    active_products: products.length,
    accounts_considered: accounts.length,
    sent,
    failed,
    skipped_no_recipient: skippedNoRecipient,
    results,
    ran_at: ranAt,
  });
}

export const GET: APIRoute = ({ request }) => handle(request);
export const POST: APIRoute = ({ request }) => handle(request);
