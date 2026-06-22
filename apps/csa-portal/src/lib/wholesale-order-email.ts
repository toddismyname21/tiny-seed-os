/**
 * wholesale-order-email.ts — chef-facing confirmation when a restaurant places
 * a wholesale order through the zero-barrier /order/<token> page.
 *
 * A chef bookmarks their token URL, builds a cart, taps "Place order". We send
 * an immediate, itemized confirmation so they have a record and trust the farm
 * received it (chefs order at 5am / 11pm — reliability has to be visible).
 *
 * Contract (mirrors market-checkout-email.ts / flex-order-email.ts):
 *   - Sends via the Resend REST API. The caller passes the resolved
 *     RESEND_API_KEY / RESEND_FROM_EMAIL so this module stays free of
 *     astro:env import side-effects and is trivially testable.
 *   - FAIL-SOFT: any problem (missing key, no recipient, Resend down, non-2xx,
 *     thrown error) is logged and swallowed. NEVER throws, NEVER blocks the
 *     order — the order is already placed before we get here. The email is a
 *     courtesy, not part of the write.
 *   - to = the chef (account.email) when present; bcc Todd (owner copy of every
 *     order); reply_to = the team inbox(es) (CSA_CONTACT_EMAILS) so a reply
 *     lands where someone reads it.
 *   - Plain-text + minimal HTML (Resend wants at least one; we send both).
 *
 * This module owns ONLY the wholesale order confirmation. It does not touch the
 * magic-link from-address or any other transactional email.
 */
import { CSA_CONTACT_EMAILS, CSA_OWNER_EMAIL } from './contact';

/** One priced line on the order. */
export interface WholesaleOrderEmailLine {
  name: string;
  unit: string;
  qty: number;
  /** Exact line total in integer cents (server-priced). */
  lineCents: number;
}

/** Everything the confirmation needs. All values are known at place time. */
export interface WholesaleOrderEmailInput {
  /**
   * The order recipients — every contact flagged `receives_orders` for this
   * account (resolved by `resolveOrderRecipients`), already de-duped. A single
   * string is accepted for back-compat (the legacy account email). An empty
   * list (or null/empty string) means no chef recipient is on file → we route
   * the owner copy instead so an order is never silent.
   */
  to: string | string[] | null | undefined;
  /** Restaurant display name, for the subject + greeting. */
  restaurantName: string;
  /** Priced line items. */
  lines: WholesaleOrderEmailLine[];
  /** Order grand total, integer cents. */
  totalCents: number;
  /** Pretty delivery-date label, e.g. "Wednesday, June 18". */
  deliveryLabel: string;
  /** Pretty edit-cutoff label, e.g. "Tuesday 7 AM". */
  cutoffLabel: string;
  /**
   * Extra BCC recipients (hidden from the chef) — the farm inbox(es) so every
   * order is captured. Merged with the owner copy and de-duped. Optional.
   */
  bcc?: string[];
  /**
   * Absolute URL to the chef's account-settings page
   * (https://csa.tinyseedfarm.com/order/<token>/account). When present, we add a
   * soft P.S. inviting them to set their delivery hours & instructions. Optional.
   */
  accountUrl?: string;
  /** Resolved Resend API key (astro:env/server). */
  resendApiKey: string | undefined;
  /** Resolved Resend from-address (astro:env/server). */
  resendFromEmail: string | undefined;
}

/** $X.XX from integer cents. */
function formatCents(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD',
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(cents / 100);
}

/** Minimal HTML escaping for interpolated strings in the email body. */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Send the chef their wholesale-order confirmation. Best-effort + fail-soft —
 * returns void, never throws, logs any failure. Safe to `await` directly in the
 * submit handler AFTER the order succeeds.
 */
export async function sendWholesaleOrderConfirmation(
  input: WholesaleOrderEmailInput
): Promise<void> {
  try {
    const {
      to,
      restaurantName,
      lines,
      totalCents,
      deliveryLabel,
      cutoffLabel,
      bcc,
      accountUrl,
      resendApiKey,
      resendFromEmail,
    } = input;

    if (!resendApiKey || !resendFromEmail) {
      console.warn('[wholesale-order-email] Resend not configured — skipping confirmation email');
      return;
    }

    // Normalize `to` → a clean, de-duped recipient list. Accept either a single
    // string (legacy account email) or an array (resolved order-contacts).
    const recipients = Array.from(
      new Set(
        (Array.isArray(to) ? to : [to])
          .map((e) => (e ?? '').trim())
          .filter((e) => e !== '')
          .map((e) => e) // preserve original case for display; Set keys on it
      )
    );

    if (recipients.length === 0) {
      // No chef email on file — Todd still gets his copy via the BCC, but with
      // no `to` Resend would reject the send, so route the owner copy as the
      // primary recipient instead so the order isn't silent.
      await sendOwnerOnly(input);
      return;
    }

    const subject = `Tiny Seed order received — ${restaurantName}`;

    // Only honor a clean http(s) account URL for the P.S. (defensive — it's
    // server-built, but we never want a malformed/unsafe href in the email).
    const safeAccountUrl =
      accountUrl && /^https?:\/\//i.test(accountUrl.trim()) ? accountUrl.trim() : '';

    // ── Plain text ─────────────────────────────────────────────────────
    const lineText = lines
      .map((l) => `  ${l.qty} × ${l.name} (${l.unit}) — ${formatCents(l.lineCents)}`)
      .join('\n');
    const psText = safeAccountUrl
      ? `\n\nP.S. Set your delivery hours & instructions here so we deliver it right: ${safeAccountUrl}`
      : '';
    const text =
      `Thanks — we've got your order for ${restaurantName}. 🌱\n\n` +
      `${lineText}\n` +
      `${'-'.repeat(32)}\n` +
      `Total: ${formatCents(totalCents)}\n\n` +
      `Delivery: ${deliveryLabel}\n` +
      `Need to change it? Reply to this email — you can edit until ${cutoffLabel}.\n\n` +
      `We'll text when it's on the way.${psText}\n\n` +
      `Tiny Seed Farm · 257 Zeigler Rd, Rochester, PA · Certified Organic`;

    // ── Minimal HTML ───────────────────────────────────────────────────
    const rowsHtml = lines
      .map(
        (l) =>
          `<tr>` +
          `<td style="padding:6px 0;color:#0f172a">${escapeHtml(String(l.qty))} × ${escapeHtml(l.name)}` +
          `<span style="color:#64748b"> (${escapeHtml(l.unit)})</span></td>` +
          `<td style="padding:6px 0;text-align:right;white-space:nowrap;color:#0f172a">${formatCents(l.lineCents)}</td>` +
          `</tr>`
      )
      .join('');
    const html =
      `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;` +
      `max-width:560px;margin:0 auto;color:#0f172a;line-height:1.6">` +
      `<p style="font-size:20px;font-weight:700;margin:0 0 4px">Order received 🌱</p>` +
      `<p style="color:#475569;margin:0 0 16px">Thanks — we've got your order for ` +
      `<strong>${escapeHtml(restaurantName)}</strong>.</p>` +
      `<table style="width:100%;border-collapse:collapse;font-size:15px;margin:0 0 4px">` +
      rowsHtml +
      `<tr><td colspan="2" style="border-top:1px solid #e2e8f0;padding:2px 0"></td></tr>` +
      `<tr>` +
      `<td style="padding:6px 0;font-weight:700">Total</td>` +
      `<td style="padding:6px 0;text-align:right;font-weight:700;white-space:nowrap">${formatCents(totalCents)}</td>` +
      `</tr>` +
      `</table>` +
      `<p style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;` +
      `padding:12px 16px;font-size:14px;color:#166534;margin:16px 0">` +
      `🚚 <strong>Delivery:</strong> ${escapeHtml(deliveryLabel)}<br>` +
      `You can edit this order until <strong>${escapeHtml(cutoffLabel)}</strong> — just reply to this email.` +
      `</p>` +
      (safeAccountUrl
        ? `<p style="color:#475569;font-size:13px;margin:16px 0 0">` +
          `<strong>P.S.</strong> Set your delivery hours &amp; instructions ` +
          `<a href="${escapeHtml(safeAccountUrl)}" style="color:#166534;font-weight:600">here</a> ` +
          `so we deliver it right.</p>`
        : '') +
      `<p style="color:#6b7280;font-size:13px;margin-top:20px">` +
      `We'll text when it's on the way.<br>` +
      `Tiny Seed Farm · 257 Zeigler Rd, Rochester, PA · Certified Organic</p>` +
      `</div>`;

    // reply_to = the team inbox(es), as an array (Resend accepts a list).
    const replyTo = CSA_CONTACT_EMAILS.split(',').map((e) => e.trim()).filter(Boolean);

    // BCC (hidden from the chef): always the owner copy, plus any farm inbox(es)
    // the caller passed (e.g. tinyseedorders@gmail.com). De-duped + trimmed.
    const bccList = Array.from(
      new Set(
        [CSA_OWNER_EMAIL, ...(bcc ?? [])]
          .map((e) => (e ?? '').trim())
          .filter((e) => e !== '')
      )
    );

    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: resendFromEmail,
        to: recipients,
        bcc: bccList,
        reply_to: replyTo,
        subject,
        text,
        html,
      }),
    });

    if (!resp.ok) {
      const detail = await resp.text().catch(() => '');
      console.error(
        `[wholesale-order-email] Resend send failed (HTTP ${resp.status}): ${detail.slice(0, 300)}`
      );
    }
  } catch (e) {
    console.error('[wholesale-order-email] Resend send threw (swallowed):', e);
  }
}

/**
 * When the account has no chef email, still notify the owner so an order is
 * never silent: send the same itemized confirmation TO Todd. Best-effort.
 */
async function sendOwnerOnly(input: WholesaleOrderEmailInput): Promise<void> {
  try {
    const { restaurantName, lines, totalCents, deliveryLabel, resendApiKey, resendFromEmail } = input;
    if (!resendApiKey || !resendFromEmail) return;
    const lineText = lines
      .map((l) => `  ${l.qty} × ${l.name} (${l.unit}) — ${formatCents(l.lineCents)}`)
      .join('\n');
    const text =
      `New wholesale order — ${restaurantName} (no chef email on file).\n\n` +
      `${lineText}\n${'-'.repeat(32)}\nTotal: ${formatCents(totalCents)}\n\nDelivery: ${deliveryLabel}`;
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: resendFromEmail,
        to: [CSA_OWNER_EMAIL],
        subject: `Tiny Seed order received — ${restaurantName} (no chef email)`,
        text,
      }),
    });
  } catch (e) {
    console.error('[wholesale-order-email] owner-only send threw (swallowed):', e);
  }
}
