/**
 * fresh-sheet.ts — the ONE source of truth for the wholesale "fresh sheet"
 * availability emails (the Wednesday-period + Friday-period lists chefs get).
 *
 * WHY THIS FILE EXISTS
 * ────────────────────
 * The exact email body used to live, duplicated, inside the two crons
 * (/api/cron/wholesale-list-wed + wholesale-list-fri). Owner ask (Todd,
 * 2026-07-10): "Make sure the lists are updated before they are sent. I should
 * get a reminder and be able to update and confirm before send." That REVIEW →
 * CONFIRM → SEND gate means the SAME email now has to be rendered in THREE
 * places — the reminder link's preview page, the scheduled cron send, and the
 * "confirm & send now" button — so the body-builder + the send loop are
 * extracted here. Preview and send can never drift because they call the SAME
 * `bodyHtml` / `bodyText` and the SAME `sendFreshSheet`.
 *
 * WHAT MOVED HERE (byte-identical to the old crons when confirmed):
 *   - the per-account availability email (text + HTML), grouped by category,
 *     priced at the account's pricing tier, with the chef's personal order link;
 *   - the audience resolution (accounts with an order token + ≥1 order recipient,
 *     minus vendor accounts + TEST_EXCLUDES);
 *   - the send loop + per-account notification_log audit rows;
 *   - the double-send guard (a batch "sent" marker row per period+delivery date).
 *
 * The crons keep ONLY their policy (auth, the enabled flag, the confirm check,
 * the unconfirmed-alert-to-Todd) and delegate the actual send to
 * `sendFreshSheet` here. `confirm.ts` (Confirm & send NOW) calls the exact same
 * function, so the audience + logging + double-send protection are identical.
 *
 * Server-only (imports astro:env/server for Resend creds, like the crons +
 * several other libs). Never imported by client code.
 */
import { RESEND_API_KEY, RESEND_FROM_EMAIL } from 'astro:env/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json } from './database.types';
import {
  nextDeliveryWednesday, nextDeliveryFriday, prettyDeliveryDate,
  formatCents, effectiveUnitCents, CUTOFF_LABEL, CUTOFF_LABEL_FRIDAY,
} from './wholesale-order';
import { groupByCategory } from './wholesale-categories';
import { categoryEmoji } from './flex-order';
import { resolveOrderRecipients, type WholesaleContact } from './wholesale-contacts';
import { TEST_EXCLUDES } from './campaign';

type Db = SupabaseClient<Database>;

/* ── Shared constants (were duplicated across the two crons) ──────────────── */

/** Public portal origin — order links + the review-page link in reminders. */
export const ADMIN_ORIGIN = 'https://csa.tinyseedfarm.com';
/** Replies to chef availability emails land in a monitored human inbox. */
const REPLY_TO = ['todd@tinyseedfarmpgh.com', 'tinyseedfleurs@gmail.com'];
/** Vendor accounts the PO importer creates — never an availability recipient. */
const VENDOR_ACCOUNT_NAMES = new Set(['harvie', 'market wagon']);
/** Owner-only operational address (reminders + the not-sent alert). */
export const OWNER_EMAIL = 'todd@tinyseedfarmpgh.com';

/* ── Period configuration ─────────────────────────────────────────────────── */

export type Period = 'wed' | 'fri';

export interface PeriodConfig {
  period: Period;
  /** portal_settings enabled gate (deploy-safety; seeded 'false' in 0080). */
  gateFlag: string;
  /** portal_settings key holding the CONFIRMED delivery date for this period. */
  confirmKey: string;
  /** notification_type on each per-account send row (unchanged from the crons). */
  notificationType: string;
  /** notification_type on the ONE batch "sent" marker row (double-send guard). */
  sentMarker: string;
  /** notification_type on the reminder-to-Todd row. */
  reminderMarker: string;
  /** notification_type on the not-confirmed alert-to-Todd row. */
  unconfirmedMarker: string;
  /** notification_log template tag. */
  template: string;
  /** Email subject line (identical to the old cron). */
  subject: string;
  /** Human ordering-cutoff label ("Tuesday 7 AM" / "Thursday 7 AM"). */
  cutoffLabel: string;
  /** The delivery weekday word used in the "you're already in" line. */
  weekdayWord: string;
  /** Order-link query suffix ('' for Wed; '?day=fri' for Fri). */
  orderQuery: string;
  /** The target delivery date for the CURRENT run ('YYYY-MM-DD'). */
  nextDeliveryDate: (now?: Date) => string;
  /** Short "when it sends" label for the review page + reminder copy. */
  sendWhenLabel: string;
  /** The scheduled send weekday (UTC 0=Sun) + time, for "sends next" ordering. */
  sendDowUtc: number;
  sendHourUtc: number;
  sendMinuteUtc: number;
}

export const PERIOD_CONFIG: Record<Period, PeriodConfig> = {
  wed: {
    period: 'wed',
    gateFlag: 'wholesale_list_wed_enabled',
    confirmKey: 'fresh_sheet_confirmed_wed',
    notificationType: 'chef_availability_wed',
    sentMarker: 'fresh_sheet_sent_wed',
    reminderMarker: 'fresh_sheet_reminder_wed',
    unconfirmedMarker: 'fresh_sheet_unconfirmed_wed',
    template: 'wholesale-list-wed',
    subject: "This week's list is open — Wednesday delivery, order by Tuesday 7 AM",
    cutoffLabel: CUTOFF_LABEL,
    weekdayWord: 'Wednesday',
    orderQuery: '',
    nextDeliveryDate: (now?: Date) => nextDeliveryWednesday(now),
    sendWhenLabel: 'Fri 8:30 AM',
    sendDowUtc: 5,      // Fridays
    sendHourUtc: 12,
    sendMinuteUtc: 30,  // 12:30 UTC = 8:30 AM ET (EDT)
  },
  fri: {
    period: 'fri',
    gateFlag: 'wholesale_list_fri_enabled',
    confirmKey: 'fresh_sheet_confirmed_fri',
    notificationType: 'chef_availability_fri',
    sentMarker: 'fresh_sheet_sent_fri',
    reminderMarker: 'fresh_sheet_reminder_fri',
    unconfirmedMarker: 'fresh_sheet_unconfirmed_fri',
    template: 'wholesale-list-fri',
    subject: "This week's list is open — Friday delivery, order by Thursday 7 AM",
    cutoffLabel: CUTOFF_LABEL_FRIDAY,
    weekdayWord: 'Friday',
    orderQuery: '?day=fri',
    nextDeliveryDate: (now?: Date) => nextDeliveryFriday(now),
    sendWhenLabel: 'Tue 10:00 AM',
    sendDowUtc: 2,      // Tuesdays
    sendHourUtc: 14,
    sendMinuteUtc: 0,   // 14:00 UTC = 10:00 AM ET (EDT)
  },
};

export function isPeriod(v: unknown): v is Period {
  return v === 'wed' || v === 'fri';
}

/** The URL of the review + confirm page for a period. */
export function reviewPageUrl(period: Period): string {
  return `${ADMIN_ORIGIN}/admin/wholesale/fresh-sheet?period=${period}`;
}

/* ── Email body (identical output to the pre-extraction crons) ────────────── */

export interface CatalogItem {
  name: string; category: string | null; unit: string; sort_order: number; unitCents: number;
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string
  ));
}

/** Text-alternative availability list, grouped by category. */
export function availabilityText(items: CatalogItem[]): string {
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
export function availabilityHtml(items: CatalogItem[]): string {
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

/** Split a stored multi-line "this week's notes" value into clean lines. */
export function noteLines(note: string): string[] {
  return note.split('\n').map((l) => l.trim()).filter(Boolean);
}

export function bodyText(
  items: CatalogItem[], deliveryLabel: string, orderUrl: string, alreadyOrdered: boolean, cfg: PeriodConfig,
  note = '',
): string {
  const lines = noteLines(note);
  return (
    'Good morning from Tiny Seed Farm —\n\n' +
    `This week's wholesale availability is open for ${deliveryLabel} delivery. ` +
    `Order by ${cfg.cutoffLabel} ET.\n\n` +
    (alreadyOrdered
      ? `You're already in for ${cfg.weekdayWord} — reply to this email to change anything.\n\n`
      : '') +
    (lines.length
      ? "This week's notes:\n" + lines.map((l) => `  • ${l}`).join('\n') + '\n\n'
      : '') +
    "Here's what's fresh this week:\n\n" +
    availabilityText(items) + '\n\n' +
    `Order here: ${orderUrl}\n\n` +
    'Questions or changes? Just reply to this email.\n' +
    '— Tiny Seed Farm'
  );
}

export function bodyHtml(
  items: CatalogItem[], deliveryLabel: string, orderUrl: string, alreadyOrdered: boolean, cfg: PeriodConfig,
  note = '',
): string {
  const lines = noteLines(note);
  return (
    `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:600px;margin:0 auto;color:#1f2937;line-height:1.6;font-size:15px">` +
    `<p style="margin:0 0 6px;font-weight:700;color:#166534">🌱 Tiny Seed Farm — Wholesale</p>` +
    `<p style="margin:0 0 14px">This week's availability is open for <strong>${escapeHtml(deliveryLabel)}</strong> delivery. Order by <strong>${escapeHtml(cfg.cutoffLabel)} ET</strong>.</p>` +
    (alreadyOrdered
      ? `<p style="margin:0 0 14px;padding:10px 14px;background:#f0fdf4;border-radius:8px;color:#166534">You're already in for ${escapeHtml(cfg.weekdayWord)} — reply to this email to change anything.</p>`
      : '') +
    (lines.length
      ? `<div style="margin:0 0 14px;padding:12px 16px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px">` +
        `<p style="margin:0 0 6px;font-weight:700;color:#92400e">📣 This week's notes</p>` +
        lines.map((l) => `<p style="margin:3px 0;color:#78350f">${escapeHtml(l)}</p>`).join('') +
        `</div>`
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

/* ── portal_settings helpers ──────────────────────────────────────────────── */

/** Read a portal_settings value ('' when absent / errored). */
export async function readSetting(db: Db, key: string): Promise<string> {
  const { data, error } = await db
    .from('portal_settings')
    .select('value')
    .eq('key', key)
    .maybeSingle();
  if (error) {
    console.error(`[fresh-sheet] portal_settings read failed (${key}):`, error.message);
    return '';
  }
  return ((data as { value: string | null } | null)?.value ?? '').trim();
}

/** True only when the stored portal_settings value === 'true'. */
export async function readFlag(db: Db, key: string): Promise<boolean> {
  return (await readSetting(db, key)) === 'true';
}

/* ── Data gathering (shared by preview + send) ────────────────────────────── */

interface ProdRow { name: string; category: string | null; unit: string; sort_order: number; price_cents: number }

/** The active catalog, ordered exactly as the send builds it. */
export async function fetchActiveProducts(db: Db): Promise<ProdRow[]> {
  const { data, error } = await db
    .from('wholesale_products')
    .select('name, category, unit, sort_order, price_cents')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })
    .overrideTypes<ProdRow[], { merge: false }>();
  if (error) {
    console.error('[fresh-sheet] product query failed:', error.message);
    throw new Error(`product_query_failed: ${error.message}`);
  }
  return data ?? [];
}

/** The most recent wholesale_products.updated_at (list "freshness"), or null. */
export async function lastProductChange(db: Db): Promise<string | null> {
  const { data, error } = await db
    .from('wholesale_products')
    .select('updated_at')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error('[fresh-sheet] last-change query failed:', error.message);
    return null;
  }
  return (data as { updated_at: string | null } | null)?.updated_at ?? null;
}

interface Acct {
  id: string; restaurant_name: string; email: string | null;
  order_token: string | null; pricing_tier_id: string | null;
}
export interface AudienceAccount {
  acct: Acct;
  recipients: string[];
  alreadyOrdered: boolean;
  discountPct: number;
}
export interface Audience {
  accounts: AudienceAccount[];
  /** Accounts sending to ≥1 recipient. */
  sendableCount: number;
  /** Total distinct recipient email addresses. */
  recipientCount: number;
}

/**
 * Resolve the send audience for a period+delivery date — the accounts with an
 * order token and ≥1 order recipient (minus vendor accounts + TEST_EXCLUDES),
 * each with its tier discount + "already ordered" flag. Shared by the preview
 * (recipient count) and the send (who gets the email) so they never disagree.
 */
export async function resolveAudience(db: Db, deliveryDate: string): Promise<Audience> {
  // Pricing tiers → discount by id.
  const { data: tierData } = await db
    .from('wholesale_pricing_tiers')
    .select('id, discount_pct')
    .overrideTypes<Array<{ id: string; discount_pct: number }>, { merge: false }>();
  const discountByTier = new Map<string, number>();
  for (const t of tierData ?? []) discountByTier.set(t.id, t.discount_pct ?? 0);

  const { data: acctData, error: acctErr } = await db
    .from('wholesale_accounts')
    .select('id, restaurant_name, email, order_token, pricing_tier_id')
    .not('order_token', 'is', null)
    .overrideTypes<Acct[], { merge: false }>();
  if (acctErr) {
    console.error('[fresh-sheet] accounts query failed:', acctErr.message);
    throw new Error(`accounts_query_failed: ${acctErr.message}`);
  }
  const accounts = (acctData ?? []).filter(
    (a) => a.order_token && !VENDOR_ACCOUNT_NAMES.has(a.restaurant_name.trim().toLowerCase())
  );
  const accountIds = accounts.map((a) => a.id);

  // Which accounts already have a (non-cancelled) order for this delivery date.
  const orderedSet = new Set<string>();
  if (accountIds.length > 0) {
    const { data: ordRows } = await db
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
    const { data: contactRows } = await db
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

  const out: AudienceAccount[] = [];
  const distinctRecipients = new Set<string>();
  for (const acct of accounts) {
    const recipients = resolveOrderRecipients(contactsByAccount.get(acct.id) ?? [], acct.email)
      .filter((e) => !TEST_EXCLUDES.has(e.trim().toLowerCase()));
    const discountPct = acct.pricing_tier_id ? (discountByTier.get(acct.pricing_tier_id) ?? 0) : 0;
    for (const r of recipients) distinctRecipients.add(r.trim().toLowerCase());
    out.push({ acct, recipients, alreadyOrdered: orderedSet.has(acct.id), discountPct });
  }

  return {
    accounts: out,
    sendableCount: out.filter((a) => a.recipients.length > 0).length,
    recipientCount: distinctRecipients.size,
  };
}

/** Price the active catalog for a given tier discount (list price at 0). */
export function priceItems(products: ProdRow[], discountPct: number): CatalogItem[] {
  return products.map((p) => ({
    name: p.name, category: p.category, unit: p.unit, sort_order: p.sort_order,
    unitCents: effectiveUnitCents(p.price_cents, discountPct),
  }));
}

/* ── Double-send guard ────────────────────────────────────────────────────── */

/** Has a completed batch already been sent for this period+delivery date? Reads
 *  the ONE `<sentMarker>` row we write after a successful send. Fail-soft: on a
 *  read error we return false (better a rare double than a silent no-send). */
export async function alreadySent(db: Db, cfg: PeriodConfig, deliveryDate: string): Promise<boolean> {
  const { data, error } = await db
    .from('notification_log')
    .select('metadata')
    .eq('notification_type', cfg.sentMarker)
    .order('sent_at', { ascending: false })
    .limit(20);
  if (error) {
    console.error(`[fresh-sheet] alreadySent read failed (${cfg.sentMarker}):`, error.message);
    return false;
  }
  for (const r of (data ?? []) as Array<{ metadata: Json }>) {
    const md = r.metadata as { delivery_date?: string } | null;
    if (md && md.delivery_date === deliveryDate) return true;
  }
  return false;
}

/* ── Send (the shared engine — called by the crons AND confirm.ts) ────────── */

async function sendOne(cfg: PeriodConfig, to: string[], text: string, html: string): Promise<{ ok: boolean; detail: string }> {
  try {
    if (!RESEND_API_KEY || !RESEND_FROM_EMAIL) return { ok: false, detail: 'resend_not_configured' };
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: RESEND_FROM_EMAIL, to, reply_to: REPLY_TO, subject: cfg.subject, text, html }),
    });
    if (!resp.ok) {
      const detail = await resp.text().catch(() => '');
      console.error(`[${cfg.template}] Resend failed (HTTP ${resp.status}): ${detail.slice(0, 200)}`);
      return { ok: false, detail: `resend_http_${resp.status}` };
    }
    return { ok: true, detail: 'sent' };
  } catch (e) {
    console.error(`[${cfg.template}] sendOne threw (swallowed):`, e);
    return { ok: false, detail: 'threw' };
  }
}

async function logRow(
  db: Db, cfg: PeriodConfig, recipient: string, status: 'sent' | 'failed',
  detail: string | null, metadata: Record<string, unknown>,
): Promise<void> {
  try {
    await db.from('notification_log').insert({
      channel: 'email',
      notification_type: cfg.notificationType,
      recipient,
      status,
      provider: 'resend',
      subject: cfg.subject,
      template: cfg.template,
      error_message: detail,
      metadata: metadata as unknown as Json,
    });
  } catch (e) {
    console.error(`[${cfg.template}] notification_log insert threw (swallowed):`, e);
  }
}

/** The batch "sent" marker — the double-send guard + the TodayFlow "sent" pill
 *  read this. ONE row per successful send. */
async function markSent(
  db: Db, cfg: PeriodConfig, deliveryDate: string, ranAt: string,
  counts: { sent: number; failed: number; skipped_no_recipient: number; active_products: number },
): Promise<void> {
  try {
    await db.from('notification_log').insert({
      channel: 'email',
      notification_type: cfg.sentMarker,
      recipient: 'batch',
      status: 'sent',
      provider: 'resend',
      subject: cfg.subject,
      template: cfg.template,
      error_message: null,
      metadata: { ranAt, period: cfg.period, delivery_date: deliveryDate, ...counts } as unknown as Json,
    });
  } catch (e) {
    console.error(`[${cfg.template}] sent-marker insert threw (swallowed):`, e);
  }
}

export type SendOutcome =
  | { ok: true; period: Period; delivery_date: string; active_products: number;
      accounts_considered: number; sent: number; failed: number;
      skipped_no_recipient: number; ran_at: string;
      results: Array<{ account: string; to: string[]; outcome: string; already_ordered: boolean }> }
  | { ok: true; skipped: 'no_active_products' | 'already_sent'; period: Period; delivery_date: string; ran_at: string };

/**
 * Send the fresh sheet to every audience account, priced per tier, with a
 * per-account audit row + a batch "sent" marker. This is the SHARED engine:
 * the crons call it after their gate + confirm checks pass, and confirm.ts's
 * "send now" calls it directly. Both get identical audience, copy, logging, and
 * the built-in double-send guard.
 *
 * Requires a SERVICE-ROLE client (the account/contact tables are admin-only RLS
 * and the cron has no cookie).
 */
export async function sendFreshSheet(db: Db, period: Period): Promise<SendOutcome> {
  const cfg = PERIOD_CONFIG[period];
  const ranAt = new Date().toISOString();
  const deliveryDate = cfg.nextDeliveryDate();

  // Double-send guard — a completed batch for this period+date is a no-op.
  if (await alreadySent(db, cfg, deliveryDate)) {
    return { ok: true, skipped: 'already_sent', period, delivery_date: deliveryDate, ran_at: ranAt };
  }

  const products = await fetchActiveProducts(db);
  if (products.length === 0) {
    // Never mail an empty availability list.
    return { ok: true, skipped: 'no_active_products', period, delivery_date: deliveryDate, ran_at: ranAt };
  }

  const deliveryLabel = prettyDeliveryDate(deliveryDate);
  const [audience, note] = await Promise.all([
    resolveAudience(db, deliveryDate),
    readSetting(db, 'fresh_sheet_note'),
  ]);

  let sent = 0;
  let failed = 0;
  let skippedNoRecipient = 0;
  const results: Array<{ account: string; to: string[]; outcome: string; already_ordered: boolean }> = [];

  for (const a of audience.accounts) {
    if (a.recipients.length === 0) { skippedNoRecipient += 1; continue; }
    const items = priceItems(products, a.discountPct);
    const orderUrl = `${ADMIN_ORIGIN}/order/${a.acct.order_token}${cfg.orderQuery}`;
    const outcome = await sendOne(
      cfg, a.recipients,
      bodyText(items, deliveryLabel, orderUrl, a.alreadyOrdered, cfg, note),
      bodyHtml(items, deliveryLabel, orderUrl, a.alreadyOrdered, cfg, note),
    );
    if (outcome.ok) sent += 1; else failed += 1;
    await logRow(db, cfg, a.recipients.join(','), outcome.ok ? 'sent' : 'failed', outcome.ok ? null : outcome.detail, {
      ranAt, account_id: a.acct.id, restaurant_name: a.acct.restaurant_name,
      delivery_date: deliveryDate, already_ordered: a.alreadyOrdered, period: cfg.period,
    });
    results.push({ account: a.acct.restaurant_name, to: a.recipients, outcome: outcome.detail, already_ordered: a.alreadyOrdered });
  }

  // Batch "sent" marker — double-send guard + TodayFlow "sent" pill read this.
  await markSent(db, cfg, deliveryDate, ranAt, {
    sent, failed, skipped_no_recipient: skippedNoRecipient, active_products: products.length,
  });

  return {
    ok: true, period, delivery_date: deliveryDate, active_products: products.length,
    accounts_considered: audience.accounts.length, sent, failed,
    skipped_no_recipient: skippedNoRecipient, results, ran_at: ranAt,
  };
}

/* ── Review-page snapshot (the exact email Todd sees before confirming) ────── */

export interface FreshSheetSnapshot {
  period: Period;
  deliveryDate: string;
  deliveryLabel: string;
  activeCount: number;
  lastChange: string | null;
  recipientCount: number;
  sendableCount: number;
  subject: string;
  /** The EXACT email HTML (built by the SAME bodyHtml the send uses). */
  html: string;
  text: string;
  enabled: boolean;
  confirmedFor: string;   // the confirmed delivery date ('' if none)
  isConfirmed: boolean;   // confirmedFor === deliveryDate
  alreadySent: boolean;
}

/**
 * Build everything the review + confirm page renders — target date, freshness,
 * the EXACT rendered email (list-price tier, no "already ordered" line: the
 * default new-list rendering), audience count, and the confirm/sent state.
 * Uses the SAME body-builder + audience resolver as the send, so what Todd
 * approves is what chefs receive.
 */
export async function buildSnapshot(db: Db, period: Period): Promise<FreshSheetSnapshot> {
  const cfg = PERIOD_CONFIG[period];
  const deliveryDate = cfg.nextDeliveryDate();
  const deliveryLabel = prettyDeliveryDate(deliveryDate);

  const [products, lastChange, audience, enabled, confirmedFor, sentAlready, note] = await Promise.all([
    fetchActiveProducts(db),
    lastProductChange(db),
    resolveAudience(db, deliveryDate),
    readFlag(db, cfg.gateFlag),
    readSetting(db, cfg.confirmKey),
    alreadySent(db, cfg, deliveryDate),
    readSetting(db, 'fresh_sheet_note'),
  ]);

  // The email exactly as a list-tier chef receives it (list price, no
  // already-ordered banner — the default new-list view).
  const items = priceItems(products, 0);
  const orderUrl = `${ADMIN_ORIGIN}/order/YOUR-LINK${cfg.orderQuery}`;
  const html = bodyHtml(items, deliveryLabel, orderUrl, false, cfg, note);
  const text = bodyText(items, deliveryLabel, orderUrl, false, cfg, note);

  return {
    period,
    deliveryDate,
    deliveryLabel,
    activeCount: products.length,
    lastChange,
    recipientCount: audience.recipientCount,
    sendableCount: audience.sendableCount,
    subject: cfg.subject,
    html,
    text,
    enabled,
    confirmedFor,
    isConfirmed: confirmedFor === deliveryDate && deliveryDate.length > 0,
    alreadySent: sentAlready,
  };
}

/* ── "Sends next" ordering (review-page default period) ───────────────────── */

/** Epoch-ms of the next scheduled cron send for a period. */
export function nextScheduledSendMs(period: Period, now: Date = new Date()): number {
  const cfg = PERIOD_CONFIG[period];
  for (let i = 0; i < 8; i += 1) {
    const cand = Date.UTC(
      now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + i,
      cfg.sendHourUtc, cfg.sendMinuteUtc, 0, 0,
    );
    const d = new Date(cand);
    if (d.getUTCDay() === cfg.sendDowUtc && cand > now.getTime()) return cand;
  }
  return Number.MAX_SAFE_INTEGER;
}

/** Which period's fresh sheet sends soonest — the review page's default. */
export function periodSendingNext(now: Date = new Date()): Period {
  return nextScheduledSendMs('wed', now) <= nextScheduledSendMs('fri', now) ? 'wed' : 'fri';
}

/* ── Owner emails (reminder + not-sent alert) ─────────────────────────────── */

/** Fail-soft Resend send of a single owner-only email. */
export async function sendOwnerEmail(
  subject: string, text: string, html: string,
): Promise<{ ok: boolean; detail: string }> {
  try {
    if (!RESEND_API_KEY || !RESEND_FROM_EMAIL) return { ok: false, detail: 'resend_not_configured' };
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: RESEND_FROM_EMAIL, to: [OWNER_EMAIL], subject, text, html }),
    });
    if (!resp.ok) {
      const detail = await resp.text().catch(() => '');
      console.error(`[fresh-sheet] owner email failed (HTTP ${resp.status}): ${detail.slice(0, 200)}`);
      return { ok: false, detail: `resend_http_${resp.status}` };
    }
    return { ok: true, detail: 'sent' };
  } catch (e) {
    console.error('[fresh-sheet] sendOwnerEmail threw (swallowed):', e);
    return { ok: false, detail: 'threw' };
  }
}

/** Best-effort owner-email audit row. */
export async function logOwnerRow(
  db: Db, notificationType: string, template: string, subject: string,
  status: 'sent' | 'failed', detail: string | null, metadata: Record<string, unknown>,
): Promise<void> {
  try {
    await db.from('notification_log').insert({
      channel: 'email',
      notification_type: notificationType,
      recipient: OWNER_EMAIL,
      status,
      provider: 'resend',
      subject,
      template,
      error_message: detail,
      metadata: metadata as unknown as Json,
    });
  } catch (e) {
    console.error(`[fresh-sheet] ${notificationType} log insert threw (swallowed):`, e);
  }
}

/** A short human "38 active products · last product change: Thu 4:12 PM". */
export function freshnessLine(activeCount: number, lastChange: string | null): string {
  const base = `${activeCount} active product${activeCount === 1 ? '' : 's'}`;
  if (!lastChange) return `${base} · no recorded product changes yet`;
  const when = new Intl.DateTimeFormat('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
    timeZone: 'America/New_York',
  }).format(new Date(lastChange));
  return `${base} · last product change: ${when}`;
}
