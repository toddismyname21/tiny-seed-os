/**
 * market-checkout-email.ts — member-facing receipt when staff deduct a
 * market-table purchase from their Farm Flex balance.
 *
 * A member walks up to the Tiny Seed table at the Bloomfield / Sewickley /
 * South Side farmers market, picks out produce, and a staff member deducts
 * the total from their flex (Shopify store credit) balance on the spot via
 * the Market Checkout tool. This sends the member an immediate receipt:
 * "$X deducted, new balance $Y, items: ..." — proof of the transaction and
 * a running balance so nobody is surprised later.
 *
 * Contract (mirrors flex-order-email.ts):
 *   - Sends via the Resend REST API. The caller passes the resolved
 *     RESEND_API_KEY / RESEND_FROM_EMAIL so this module stays free of
 *     astro:env import side-effects and is trivially testable.
 *   - FAIL-SOFT: any problem (missing key, Resend down, non-2xx, thrown
 *     error) is logged and swallowed. NEVER throws, NEVER blocks checkout —
 *     the debit has already happened before we get here. The receipt is a
 *     courtesy, not part of the money movement.
 *   - reply_to = the team (CSA_CONTACT_EMAILS = Frankie + Todd) so a reply
 *     lands in the CSA inbox; bcc Todd for an owner copy of every market sale.
 *   - Plain-text + minimal HTML (Resend wants at least one; we send both).
 *
 * This module owns ONLY the market-checkout receipt. It does not touch the
 * magic-link from-address or any other transactional email.
 */
import { CSA_CONTACT_EMAILS, CSA_OWNER_EMAIL } from './contact';

/** Everything the receipt needs. All values are known at debit time. */
export interface MarketCheckoutEmailInput {
  /** The member's email (recipient). */
  to: string;
  /** The member's display name, for the greeting ("Hi Maria"). */
  name: string;
  /** Dollars deducted this checkout. */
  amount: number;
  /** The member's balance AFTER the deduction (from Shopify). */
  newBalance: number;
  /** Optional free-text "items" note the staff typed (what they bought). */
  items: string | null;
  /** Which market table (display label), or null when unknown. */
  marketLabel: string | null;
  /** Resolved Resend API key (astro:env/server). */
  resendApiKey: string | undefined;
  /** Resolved Resend from-address (astro:env/server). */
  resendFromEmail: string | undefined;
}

/** $X.XX from a dollar number. */
function formatMoney(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
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

/** First name for the greeting — first token of the name, or "there". */
function firstNameOf(name: string): string {
  const t = (name ?? '').trim().split(/\s+/)[0];
  return t && t !== '(unknown)' ? t : 'there';
}

/**
 * Send the member their market-checkout receipt. Best-effort + fail-soft —
 * returns void, never throws, logs any failure. Safe to `await` directly in
 * the checkout handler AFTER the debit succeeds.
 */
export async function sendMarketCheckoutReceipt(
  input: MarketCheckoutEmailInput
): Promise<void> {
  try {
    const {
      to,
      name,
      amount,
      newBalance,
      items,
      marketLabel,
      resendApiKey,
      resendFromEmail,
    } = input;

    if (!resendApiKey || !resendFromEmail) {
      console.warn('[market-checkout-email] Resend not configured — skipping receipt email');
      return;
    }
    if (!to) {
      console.warn('[market-checkout-email] no recipient — skipping');
      return;
    }

    const greetingName = firstNameOf(name);
    const itemsClean = (items ?? '').trim();
    const subject = `Market purchase: ${formatMoney(amount)} from your Farm Flex`;

    // ── Plain text ─────────────────────────────────────────────────────
    const text =
      `Hi ${greetingName},\n\n` +
      `Thanks for stopping by the Tiny Seed table${marketLabel ? ` at ${marketLabel}` : ''}! 🌱\n\n` +
      `Market purchase: ${formatMoney(amount)} deducted from your Farm Flex balance.\n` +
      `New balance: ${formatMoney(newBalance)}\n` +
      (itemsClean ? `Items: ${itemsClean}\n` : '') +
      `\n` +
      `Questions? Just reply to this email.\n\n` +
      `Tiny Seed Farm · 257 Zeigler Rd, Rochester, PA · Certified Organic`;

    // ── Minimal HTML ───────────────────────────────────────────────────
    const html =
      `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;` +
      `max-width:520px;margin:0 auto;color:#0f172a;line-height:1.6">` +
      `<p style="font-size:20px;font-weight:700;margin:0 0 4px">Market purchase receipt 🌱</p>` +
      `<p style="color:#475569;margin:0 0 16px">Hi ${escapeHtml(greetingName)} — thanks for stopping ` +
      `by the Tiny Seed table${marketLabel ? ` at ${escapeHtml(marketLabel)}` : ''}!</p>` +
      `<table style="width:100%;border-collapse:collapse;font-size:15px;margin:0 0 4px">` +
      `<tr>` +
      `<td style="padding:6px 0;color:#0f172a">Deducted today</td>` +
      `<td style="padding:6px 0;text-align:right;font-weight:700;color:#0f172a;white-space:nowrap">` +
      `&minus;${formatMoney(amount)}</td>` +
      `</tr>` +
      `<tr><td colspan="2" style="border-top:1px solid #e2e8f0;padding:2px 0"></td></tr>` +
      `<tr>` +
      `<td style="padding:6px 0;font-weight:700">New Farm Flex balance</td>` +
      `<td style="padding:6px 0;text-align:right;font-weight:700;white-space:nowrap">` +
      `${formatMoney(newBalance)}</td>` +
      `</tr>` +
      `</table>` +
      (itemsClean
        ? `<p style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;` +
          `padding:12px 16px;font-size:14px;color:#166534;margin:16px 0">` +
          `🧺 <strong>Items:</strong> ${escapeHtml(itemsClean)}</p>`
        : '') +
      `<p style="color:#6b7280;font-size:13px;margin-top:20px">` +
      `Questions? Just reply to this email.<br>` +
      `Tiny Seed Farm · 257 Zeigler Rd, Rochester, PA · Certified Organic</p>` +
      `</div>`;

    // reply_to = the team inbox(es), as an array (Resend accepts a list).
    const replyTo = CSA_CONTACT_EMAILS.split(',').map((e) => e.trim()).filter(Boolean);

    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: resendFromEmail,
        to: [to],
        bcc: [CSA_OWNER_EMAIL],
        reply_to: replyTo,
        subject,
        text,
        html,
      }),
    });

    if (!resp.ok) {
      const detail = await resp.text().catch(() => '');
      console.error(
        `[market-checkout-email] Resend send failed (HTTP ${resp.status}): ${detail.slice(0, 300)}`
      );
    }
  } catch (e) {
    console.error('[market-checkout-email] Resend send threw (swallowed):', e);
  }
}
