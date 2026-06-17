/**
 * flex-order-email.ts — member-facing "your order is in" confirmation email.
 *
 * Tony (2026-06-12): "I didn't get a confirmation email" after placing a flex
 * order. After a successful submit we now email the MEMBER a receipt so they
 * have proof the order went through and know they can still change it until
 * the Tuesday cutoff.
 *
 * Contract (mirrors request-delivery.ts):
 *   - Sends via the Resend REST API using RESEND_API_KEY / RESEND_FROM_EMAIL
 *     (astro:env/server). The caller passes the resolved values so this module
 *     stays free of astro:env import side-effects and is trivially testable.
 *   - FAIL-SOFT: any problem (missing key, Resend down, non-2xx, thrown
 *     error) is logged and swallowed. This function NEVER throws and NEVER
 *     blocks the order — the order is already placed before we get here.
 *   - reply_to is the team (CSA_CONTACT_EMAILS = Frankie + Todd) so a member
 *     reply lands in the CSA inbox, not a no-reply void.
 *   - Plain-text body + a minimal HTML version (Resend wants at least one;
 *     we send both for broad client support).
 *
 * This module owns ONLY the flex-order confirmation. It does not touch the
 * magic-link from-address or any other transactional email.
 */
import { CSA_CONTACT_EMAILS } from './contact';

/** One itemized line on the receipt. */
export interface FlexOrderEmailLine {
  name: string;
  qty: number;
  lineCents: number;
}

/** Everything the receipt needs. All values are known at submit time. */
export interface FlexOrderEmailInput {
  /** The member's email (recipient). */
  to: string;
  /** Ordered lines (name × qty + line total in cents). */
  lines: FlexOrderEmailLine[];
  /** Grand total in cents. */
  totalCents: number;
  /** Human label for this week ("Week of June 15"), for the subject/body. */
  weekLabel: string;
  /** Human label for the change deadline ("Tuesday 8 AM"). */
  cutoffLabel: string;
  /**
   * Where the box goes — a short, member-facing pickup line
   * ("Sewickley · Wednesday 3–6 PM" or "Home delivery"). Null when we
   * couldn't resolve it; the receipt then omits the pickup row gracefully.
   */
  pickupLine: string | null;
  /** Resolved Resend API key (astro:env/server). */
  resendApiKey: string | undefined;
  /** Resolved Resend from-address (astro:env/server). */
  resendFromEmail: string | undefined;
}

/** $X.XX from integer cents. */
function formatCents(cents: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
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
 * Send the member their flex-order confirmation. Best-effort + fail-soft —
 * returns void, never throws, and logs any failure. Safe to `await` directly
 * in the submit handler AFTER the order is placed.
 */
export async function sendFlexOrderConfirmation(input: FlexOrderEmailInput): Promise<void> {
  try {
    const { to, lines, totalCents, weekLabel, cutoffLabel, pickupLine, resendApiKey, resendFromEmail } = input;

    if (!resendApiKey || !resendFromEmail) {
      console.warn('[flex-order-email] Resend not configured — skipping confirmation email');
      return;
    }
    if (!to || lines.length === 0) {
      // Nothing meaningful to confirm (defensive — submit always has ≥1 line).
      console.warn('[flex-order-email] no recipient or empty order — skipping');
      return;
    }

    const subject = 'Your Tiny Seed order is in ✅';

    // ── Plain text ─────────────────────────────────────────────────────
    const textLines = lines
      .map((l) => `  ${l.qty} × ${l.name} — ${formatCents(l.lineCents)}`)
      .join('\n');
    const text =
      `Your Tiny Seed order is in ✅\n\n` +
      `${weekLabel}\n\n` +
      `Your box:\n${textLines}\n` +
      `  ${'-'.repeat(28)}\n` +
      `  Total: ${formatCents(totalCents)}\n\n` +
      (pickupLine ? `Pickup: ${pickupLine}\n\n` : '') +
      `You can change your order until ${cutoffLabel}. ` +
      `Just head back to your weekly order in the member portal.\n\n` +
      `Paid from your Farm Flex balance — no card needed.\n\n` +
      `Questions? Just reply to this email.\n\n` +
      `Tiny Seed Farm · 257 Zeigler Rd, Rochester, PA · Certified Organic`;

    // ── Minimal HTML ───────────────────────────────────────────────────
    const rowsHtml = lines
      .map(
        (l) =>
          `<tr>` +
          `<td style="padding:6px 0;color:#0f172a">${escapeHtml(String(l.qty))} &times; ${escapeHtml(l.name)}</td>` +
          `<td style="padding:6px 0;text-align:right;color:#475569;white-space:nowrap">${formatCents(l.lineCents)}</td>` +
          `</tr>`
      )
      .join('');

    const html =
      `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;` +
      `max-width:520px;margin:0 auto;color:#0f172a;line-height:1.6">` +
      `<p style="font-size:20px;font-weight:700;margin:0 0 4px">Your Tiny Seed order is in ✅</p>` +
      `<p style="color:#475569;margin:0 0 16px">${escapeHtml(weekLabel)}</p>` +
      `<table style="width:100%;border-collapse:collapse;font-size:15px;margin:0 0 4px">` +
      `${rowsHtml}` +
      `<tr><td colspan="2" style="border-top:1px solid #e2e8f0;padding:2px 0"></td></tr>` +
      `<tr>` +
      `<td style="padding:6px 0;font-weight:700">Total</td>` +
      `<td style="padding:6px 0;text-align:right;font-weight:700">${formatCents(totalCents)}</td>` +
      `</tr>` +
      `</table>` +
      (pickupLine
        ? `<p style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;` +
          `padding:12px 16px;font-size:14px;color:#166534;margin:16px 0">` +
          `🧺 <strong>Pickup:</strong> ${escapeHtml(pickupLine)}</p>`
        : '') +
      `<p style="font-size:14px;color:#475569;margin:16px 0 4px">` +
      `You can change your order until <strong>${escapeHtml(cutoffLabel)}</strong> — ` +
      `just head back to your weekly order in the member portal.</p>` +
      `<p style="font-size:14px;color:#475569;margin:4px 0 16px">` +
      `Paid from your Farm Flex balance — no card needed.</p>` +
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
        bcc: ['todd@tinyseedfarmpgh.com'],
        reply_to: replyTo,
        subject,
        text,
        html,
      }),
    });

    if (!resp.ok) {
      const detail = await resp.text().catch(() => '');
      console.error(
        `[flex-order-email] Resend send failed (HTTP ${resp.status}): ${detail.slice(0, 300)}`
      );
    }
  } catch (e) {
    console.error('[flex-order-email] Resend send threw (swallowed):', e);
  }
}
