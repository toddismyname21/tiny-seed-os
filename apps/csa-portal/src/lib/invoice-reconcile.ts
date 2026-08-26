/**
 * Order ↔ QuickBooks invoice reconciliation.
 *
 * ── WHY THIS EXISTS ─────────────────────────────────────────────────────────
 * /api/admin/wholesale/deliver links an order to its invoice when the invoice
 * is created BY the portal. Todd also invoices by hand directly in QuickBooks,
 * and nothing links those. Measured 2026-08-24: 65 portal orders read
 * "uninvoiced" while QuickBooks had already billed $25,096 since June —
 * roughly $11,400 of that was billed-but-unlinked. Every "what still needs
 * invoicing?" report was therefore wrong, and acting on one would have
 * double-billed the farm's largest accounts.
 *
 * This module closes the loop from the QuickBooks side, so the link exists no
 * matter which way an invoice got made.
 *
 * ── MATCH TIERS (first hit wins; never falls through to a weaker tier) ──────
 *  1 portal_note  — PrivateNote carries "portal order <id8>", stamped by
 *                   deliver.ts. Unambiguous: it IS the order id.
 *  2 memo_dates   — Memo names the deliveries, e.g. "7/8, 7/15 and 7/22
 *                   deliveries". Bundled invoices are normal here (Mediterra's
 *                   #7849626 covers seven standing weeks), so this tier may
 *                   link MANY orders to ONE invoice.
 *  3 date_amount  — same customer, TxnDate == delivery_date, totals agree.
 *  There is deliberately NO "same customer + same date, different amount"
 *  tier. It was tried and removed on 2026-08-24 after it matched Black Radish's
 *  8/19 VEG delivery ($299) to invoice #9000022, which was a $100 Bulk Flower
 *  Bucket — a completely unrelated sale that happened to fall on the same day.
 *  Acting on that match merged two sales onto one invoice. A same-day amount
 *  mismatch is now REPORTED for a human (`review`), never linked.
 *
 * ── INVARIANTS ──────────────────────────────────────────────────────────────
 *  • NEVER relink an order that already has an invoice_number. The first link
 *    wins; a second one silently rewriting history is how billing gets lost.
 *  • AMBIGUITY IS NOT A MATCH. If a tier yields more than one candidate order
 *    for an invoice, none are linked and it is reported for a human. EYV
 *    genuinely has two separate orders dated 2026-07-22 with different totals —
 *    guessing between them would bill the wrong delivery.
 *  • An order is matched at most ONCE per run, so two invoices cannot claim the
 *    same delivery.
 *  • Matching is by qbo_customer_id ONLY (migration 0093). Names are unusable:
 *    "Allegro" is "allegrohearthbakery" in QuickBooks.
 *  • Reconciliation is READ-ONLY against QuickBooks. It creates nothing, sends
 *    nothing, and voids nothing — it only writes invoice_number/invoiced_at
 *    back onto portal orders.
 */

export type MatchTier = 'portal_note' | 'memo_dates' | 'date_amount';

export interface QbInvoiceLite {
  id: string;
  /** True when every billable line sits under the FLOWER SALES item hierarchy.
   *  Loren invoices the flower side of the business separately and it has
   *  NOTHING to do with wholesale vegetable orders. Excluded from matching
   *  entirely — see the note on `reconcile`. */
  isFloral?: boolean;
  docNumber: string;
  txnDate: string; // YYYY-MM-DD
  totalCents: number;
  customerId: string;
  privateNote: string;
  memo: string;
}

export interface PortalOrderLite {
  id: string;
  qboCustomerId: string | null;
  deliveryDate: string; // YYYY-MM-DD
  totalCents: number;
  invoiceNumber: string | null;
}

export interface OrderMatch {
  orderId: string;
  invoiceId: string;
  /** What gets written to wholesale_orders.invoice_number. */
  invoiceNumber: string;
  tier: MatchTier;
}

/** Same customer and date, but the totals disagree — so it may not be the same
 *  sale at all. Surfaced for a person to judge; never linked automatically. */
export interface ReviewItem {
  invoiceId: string;
  invoiceNumber: string;
  orderId: string;
  deliveryDate: string;
  /** Positive => QuickBooks billed MORE than the order is worth. */
  differenceCents: number;
}

export interface ReconcileResult {
  matches: OrderMatch[];
  /** Invoices we could not attribute to any order — possible manual one-offs. */
  unmatchedInvoices: QbInvoiceLite[];
  /** Orders still with no invoice after the run — the genuine billing backlog. */
  unmatchedOrders: PortalOrderLite[];
  /** Invoice ids where a tier found >1 candidate order and refused to guess. */
  ambiguous: Array<{ invoiceId: string; tier: MatchTier; orderIds: string[] }>;
  /** Same-customer/same-date pairs whose totals disagree. NOT linked. */
  review: ReviewItem[];
}

/** The number we record. DocNumber when QuickBooks issued one, else the Id —
 *  API-created invoices come back with a blank DocNumber when custom
 *  transaction numbers are switched off, and a blank link is no link. */
export function invoiceNumberOf(inv: QbInvoiceLite): string {
  return (inv.docNumber ?? '').trim() || inv.id;
}

/**
 * Pull delivery dates out of invoice text: "7/8, 7/15 and 7/22 deliveries",
 * "Orders: 7/1, 7/8", "6/3/26 and 6/10/26".
 *
 * `fallbackYear` (the invoice's own year) fills in bare M/D. Two-digit years
 * are 2000-based. Impossible dates are dropped rather than clamped — a clamped
 * date would silently match the wrong delivery.
 *
 * Deliberately NOT matched: PO numbers ("PO #7820454") have no slash, and
 * anything with a 3+ digit component is rejected below.
 */
export function parseCitedDates(text: string, fallbackYear: number): string[] {
  const out = new Set<string>();
  const re = /\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const mo = Number(m[1]);
    const da = Number(m[2]);
    if (mo < 1 || mo > 12 || da < 1 || da > 31) continue;
    let yr = fallbackYear;
    if (m[3] !== undefined) {
      const y = Number(m[3]);
      yr = m[3].length <= 2 ? 2000 + y : y;
    }
    // Reject a date the calendar does not have (e.g. 2/30) — Date rolls it
    // forward, which would point at a delivery that never happened.
    const d = new Date(Date.UTC(yr, mo - 1, da));
    if (d.getUTCMonth() !== mo - 1 || d.getUTCDate() !== da) continue;
    out.add(`${yr}-${String(mo).padStart(2, '0')}-${String(da).padStart(2, '0')}`);
  }
  return [...out];
}

/** The 8-char order-id prefix deliver.ts stamps into PrivateNote. */
export function parsePortalOrderRef(privateNote: string): string | null {
  const m = /portal order\s+([0-9a-f]{8})/i.exec(privateNote ?? '');
  return m ? m[1].toLowerCase() : null;
}

/**
 * Match invoices to orders. Pure: no IO, so the tier rules are testable
 * against real production shapes without touching QuickBooks.
 *
 * Invoices are processed oldest-first so that when two invoices could claim the
 * same delivery, the earlier one — the one actually raised for it — wins.
 */
export function reconcile(
  invoices: QbInvoiceLite[],
  orders: PortalOrderLite[],
): ReconcileResult {
  const matches: OrderMatch[] = [];
  const ambiguous: ReconcileResult['ambiguous'] = [];
  const review: ReviewItem[] = [];
  const claimedOrders = new Set<string>();
  const matchedInvoices = new Set<string>();

  // Only orders that still need a link are eligible.
  const open = orders.filter((o) => !o.invoiceNumber);
  const byCustomer = new Map<string, PortalOrderLite[]>();
  for (const o of open) {
    if (!o.qboCustomerId) continue;
    const list = byCustomer.get(o.qboCustomerId);
    if (list) list.push(o);
    else byCustomer.set(o.qboCustomerId, [o]);
  }
  const byIdPrefix = new Map<string, PortalOrderLite[]>();
  for (const o of open) {
    const k = o.id.slice(0, 8).toLowerCase();
    const list = byIdPrefix.get(k);
    if (list) list.push(o);
    else byIdPrefix.set(k, [o]);
  }

  const take = (inv: QbInvoiceLite, cands: PortalOrderLite[], tier: MatchTier): boolean => {
    const free = cands.filter((o) => !claimedOrders.has(o.id));
    if (free.length === 0) return false;
    if (free.length > 1 && tier !== 'memo_dates') {
      // memo_dates is legitimately one-to-many; every other tier must be 1:1.
      ambiguous.push({ invoiceId: inv.id, tier, orderIds: free.map((o) => o.id) });
      return false;
    }
    for (const o of free) {
      claimedOrders.add(o.id);
      matches.push({
        orderId: o.id,
        invoiceId: inv.id,
        invoiceNumber: invoiceNumberOf(inv),
        tier,
      });
    }
    matchedInvoices.add(inv.id);
    return true;
  };

  // Flower invoices belong to Loren's side of the business. They never
  // correspond to a wholesale vegetable order, so they are not candidates.
  const ordered = [...invoices]
    .filter((i) => !i.isFloral)
    .sort((a, b) => a.txnDate.localeCompare(b.txnDate));

  for (const inv of ordered) {
    // Tier 1 — the portal stamped its own order id.
    const ref = parsePortalOrderRef(inv.privateNote);
    if (ref) {
      const cands = (byIdPrefix.get(ref) ?? []).filter((o) => !claimedOrders.has(o.id));
      if (cands.length > 0 && take(inv, cands, 'portal_note')) continue;
    }

    const sameCustomer = byCustomer.get(inv.customerId) ?? [];
    if (sameCustomer.length === 0) continue;

    // Tier 2 — the memo names the deliveries. One invoice, many weeks.
    const year = Number(inv.txnDate.slice(0, 4));
    const cited = parseCitedDates(`${inv.memo} ${inv.privateNote}`, year);
    if (cited.length > 0) {
      const cands = sameCustomer.filter(
        (o) => cited.includes(o.deliveryDate) && !claimedOrders.has(o.id),
      );
      if (cands.length > 0 && take(inv, cands, 'memo_dates')) continue;
    }

    // Tier 3 — invoiced on the delivery date, totals agree.
    const sameDate = sameCustomer.filter(
      (o) => o.deliveryDate === inv.txnDate && !claimedOrders.has(o.id),
    );
    const exact = sameDate.filter((o) => o.totalCents === inv.totalCents);
    if (exact.length > 0 && take(inv, exact, 'date_amount')) continue;

    // Same day, different money. NOT a match — see the Black Radish note above.
    for (const o of sameDate) {
      review.push({
        invoiceId: inv.id,
        invoiceNumber: invoiceNumberOf(inv),
        orderId: o.id,
        deliveryDate: o.deliveryDate,
        differenceCents: inv.totalCents - o.totalCents,
      });
    }
  }

  return {
    matches,
    unmatchedInvoices: invoices.filter((i) => !matchedInvoices.has(i.id)),
    unmatchedOrders: open.filter((o) => !claimedOrders.has(o.id)),
    ambiguous,
    review,
  };
}
