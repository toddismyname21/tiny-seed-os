/**
 * wholesale-contacts.ts — routing helpers for an account's MULTIPLE contact
 * emails (`wholesale_account_contacts`).
 *
 * Background (Todd 2026-06-14): chefs route comms to different addresses. A
 * single restaurant can have several contacts, each flagged for what it gets:
 *   - receives_orders   → availability lists + order confirmations
 *   - receives_invoices → billing / invoices
 * e.g. Fet Fisk: orders→nik@fetfisk.net, ALL invoices→accounts@fetfisk.net.
 *
 * The table's RLS is admin/staff-only, so every read here is expected to use
 * the service-role client (`supabaseAdmin`) scoped STRICTLY to a token-resolved
 * `account_id`. These functions are pure given the rows — the caller owns the
 * (token-scoped) query.
 */

/** A single contact row, as stored. */
export interface WholesaleContact {
  email: string;
  name: string | null;
  receives_orders: boolean;
  receives_invoices: boolean;
}

/** Lowercase + trim, for de-duping email recipients case-insensitively. */
function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Resolve the ORDER recipients (availability lists + order confirmations) for
 * an account, given its contacts plus the legacy single `wholesale_accounts.email`.
 *
 * Priority:
 *   1. Every contact with `receives_orders = true` (the explicit routing).
 *   2. If NONE are flagged for orders, fall back to the legacy account email.
 *   3. If that's also empty, return [] — the caller routes the owner copy.
 *
 * Returns de-duplicated, trimmed, lowercased addresses preserving first-seen
 * order. Invalid/empty strings are dropped.
 */
export function resolveOrderRecipients(
  contacts: WholesaleContact[],
  accountEmail: string | null | undefined
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const c of contacts) {
    if (!c.receives_orders) continue;
    const email = (c.email ?? '').trim();
    if (!email) continue;
    const key = normalizeEmail(email);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(email);
  }

  if (out.length === 0) {
    const fallback = (accountEmail ?? '').trim();
    if (fallback) {
      out.push(fallback);
      seen.add(normalizeEmail(fallback));
    }
  }

  return out;
}

/**
 * Resolve the INVOICE recipients (billing) for an account — same shape, keyed
 * on `receives_invoices`. Wired now so the future invoice flow just works; the
 * order-confirmation path uses `resolveOrderRecipients` above.
 */
export function resolveInvoiceRecipients(
  contacts: WholesaleContact[],
  accountEmail: string | null | undefined
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const c of contacts) {
    if (!c.receives_invoices) continue;
    const email = (c.email ?? '').trim();
    if (!email) continue;
    const key = normalizeEmail(email);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(email);
  }

  if (out.length === 0) {
    const fallback = (accountEmail ?? '').trim();
    if (fallback) {
      out.push(fallback);
      seen.add(normalizeEmail(fallback));
    }
  }

  return out;
}
