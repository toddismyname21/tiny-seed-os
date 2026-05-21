/**
 * Shopify Admin GraphQL helpers for the order-sync endpoint.
 *
 * This module is a faithful TypeScript port of the two reference Python
 * scripts that already ran against production:
 *   - scripts/migrate-csa/backfill_missing_members.py   → `categorize()`
 *     + the order/customer GraphQL shapes + the member-row field mapping.
 *   - scripts/migrate-csa/flex_credit_shopify.py        → the
 *     `storeCreditAccountCredit` issuance + the balance-based idempotency
 *     guard.
 *
 * SERVER-ONLY. Imports the Shopify secret from `astro:env/server`; never
 * import this from a client component.
 *
 * Endpoint + auth (Admin GraphQL, API version 2025-01):
 *   POST https://{store}.myshopify.com/admin/api/2025-01/graphql.json
 *   header: X-Shopify-Access-Token: <token>
 */
import { SHOPIFY_ACCESS_TOKEN, SHOPIFY_STORE_NAME } from 'astro:env/server';

/** True iff the Shopify credentials are present (Vercel env at runtime). */
export function shopifyConfigured(): boolean {
  return !!SHOPIFY_ACCESS_TOKEN && !!SHOPIFY_STORE_NAME;
}

function endpoint(): string {
  return `https://${SHOPIFY_STORE_NAME}.myshopify.com/admin/api/2025-01/graphql.json`;
}

export interface GraphQLResult<T> {
  data?: T;
  errors?: Array<{ message: string; [k: string]: unknown }>;
}

/**
 * Execute a GraphQL query/mutation against the Shopify Admin API.
 * Throws on transport failure (non-2xx HTTP); GraphQL-level errors are
 * surfaced in the returned `errors` array (caller decides severity).
 */
export async function shopifyGraphQL<T>(
  query: string,
  variables: Record<string, unknown> = {}
): Promise<GraphQLResult<T>> {
  const res = await fetch(endpoint(), {
    method: 'POST',
    headers: {
      'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN ?? '',
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Shopify HTTP ${res.status}: ${text.slice(0, 300)}`);
  }
  return (await res.json()) as GraphQLResult<T>;
}

/* ──────────────────────────────────────────────────────────────────
 * categorize() — TS port of backfill_missing_members.py:categorize()
 *
 * Parses a Shopify line-item title into a categorized share descriptor,
 * or null to skip (non-2026, non-CSA). Same order of checks as the
 * Python original so the two stay behaviorally identical:
 *   1. require "2026" in the title (case-sensitive, matches Python)
 *   2. add-on   → share_type 'add_on'
 *   3. flower / bouquet / fleurs → 'flower'
 *   4. home delivery → 'home_delivery' (a delivery method, NOT a share)
 *   5. spring + csa → 'spring_veg'
 *   6. fall + csa   → 'fall_veg'
 *   7. summer + csa → 'flex' (if flex) else 'summer_veg'
 *   8. otherwise null
 * ────────────────────────────────────────────────────────────────── */

export type ShareType =
  | 'spring_veg'
  | 'summer_veg'
  | 'fall_veg'
  | 'flower'
  | 'flex'
  | 'add_on'
  | 'home_delivery';

/** Member-table share_size domain (migration 0014). 'regular' etc. */
export type ShareSize =
  | 'small'
  | 'regular'
  | 'family'
  | 'petite'
  | 'large'
  | 'light'
  | 'full'
  | 'half'
  | 'quarter'
  | 'single'
  | 'double';

export interface Category {
  share_type: ShareType;
  share_size: ShareSize | null;
  freq: 'weekly' | 'biweekly';
  /** Raw weeks from the Python heuristic — NOT used for member rows; the
   *  sync derives total_weeks from season.ts instead. Retained for parity
   *  + debugging. */
  weeks: number;
  /** Add-on subtype (mushroom/cheese/bread/coffee/other) when add_on. */
  addon: string | null;
  /** True for spring veg shares (drives Spring season config selection). */
  spring?: boolean;
}

export function categorize(title: string): Category | null {
  const t = title.toLowerCase();
  if (!title.includes('2026')) return null;

  const biweekly = t.includes('biweekly');
  const freq: 'weekly' | 'biweekly' = biweekly ? 'biweekly' : 'weekly';
  const weeks = biweekly ? 9 : 18;

  // Add-ons
  if (t.includes('add-on') || t.includes('add on')) {
    const sub = ['mushroom', 'cheese', 'bread', 'coffee'].find((s) => t.includes(s)) ?? 'other';
    return { share_type: 'add_on', share_size: null, freq, weeks, addon: sub };
  }

  // Flower
  if (t.includes('flower') || t.includes('bouquet') || t.includes('fleurs')) {
    const size: ShareSize =
      t.includes('full bloom') || t.includes('full')
        ? 'full'
        : t.includes('petite')
          ? 'petite'
          : 'regular';
    return { share_type: 'flower', share_size: size, freq, weeks, addon: null };
  }

  // Home delivery (a delivery method, not a share) — skip member creation.
  if (t.includes('home delivery')) {
    return { share_type: 'home_delivery', share_size: null, freq, weeks, addon: null };
  }

  // Veg shares
  if (t.includes('spring') && t.includes('csa')) {
    return { share_type: 'spring_veg', share_size: 'regular', freq, weeks, addon: null, spring: true };
  }
  if (t.includes('fall') && t.includes('csa')) {
    return { share_type: 'fall_veg', share_size: 'regular', freq, weeks, addon: null };
  }
  if (t.includes('summer') && t.includes('csa')) {
    if (t.includes('flex')) {
      return { share_type: 'flex', share_size: 'regular', freq, weeks, addon: null };
    }
    const size: ShareSize =
      t.includes('friends') || t.includes('family') || t.includes('large')
        ? 'family'
        : t.includes('small')
          ? 'small'
          : 'regular';
    return { share_type: 'summer_veg', share_size: size, freq, weeks, addon: null };
  }

  return null;
}

/* ──────────────────────────────────────────────────────────────────
 * Store-credit issuance — TS port of flex_credit_shopify.py
 *
 * Idempotency is double-guarded:
 *   1. The endpoint only credits an order whose shopify_order_sync row
 *      has flex_credited == 0 (per-order ledger guard).
 *   2. Belt-and-suspenders: BEFORE issuing, we read the customer's
 *      current store-credit balance. We only top up the difference
 *      between the target amount and current balance (mirrors the
 *      Python `need = amount - cur` logic), and skip entirely if the
 *      balance already covers it.
 * ────────────────────────────────────────────────────────────────── */

const BALANCE_QUERY = `
  query($id: ID!) {
    customer(id: $id) {
      storeCreditAccounts(first: 5) {
        edges { node { id balance { amount } } }
      }
    }
  }
`;

const CREDIT_MUTATION = `
  mutation($id: ID!, $amount: MoneyInput!) {
    storeCreditAccountCredit(id: $id, creditInput: { creditAmount: $amount }) {
      storeCreditAccountTransaction { account { balance { amount } } }
      userErrors { field message }
    }
  }
`;

interface BalanceResp {
  customer: {
    storeCreditAccounts: { edges: Array<{ node: { id: string; balance: { amount: string } } }> };
  } | null;
}

interface CreditResp {
  storeCreditAccountCredit: {
    storeCreditAccountTransaction: { account: { balance: { amount: string } } } | null;
    userErrors: Array<{ field: string[] | null; message: string }>;
  } | null;
}

/** Read a customer's current Shopify store-credit balance (USD). */
export async function getStoreCreditBalance(customerGid: string): Promise<number> {
  const res = await shopifyGraphQL<BalanceResp>(BALANCE_QUERY, { id: customerGid });
  if (res.errors?.length) {
    throw new Error(`balance query: ${res.errors.map((e) => e.message).join('; ')}`);
  }
  const edges = res.data?.customer?.storeCreditAccounts?.edges ?? [];
  return edges.length > 0 ? Number.parseFloat(edges[0]!.node.balance.amount) : 0;
}

export interface CreditOutcome {
  /** Dollars actually issued this call (0 if already covered / no-op). */
  credited: number;
  /** Resulting balance after the call, when an issuance happened. */
  newBalance: number | null;
  /** True when the existing balance already met/exceeded the target. */
  skipped: boolean;
}

/**
 * Issue store credit to a customer, topping up to `targetAmount` USD.
 * Mirrors flex_credit_shopify.py: reads the current balance, skips when
 * already >= target, otherwise credits the difference.
 *
 * @param customerGid  Shopify customer GID (gid://shopify/Customer/123)
 * @param targetAmount Total flex dollars this customer should hold for
 *                     the order being processed.
 */
export async function issueStoreCredit(
  customerGid: string,
  targetAmount: number
): Promise<CreditOutcome> {
  const current = await getStoreCreditBalance(customerGid);
  if (current >= targetAmount) {
    return { credited: 0, newBalance: current, skipped: true };
  }
  const need = targetAmount - current;
  const res = await shopifyGraphQL<CreditResp>(CREDIT_MUTATION, {
    id: customerGid,
    amount: { amount: need.toFixed(2), currencyCode: 'USD' },
  });

  const userErrors = res.data?.storeCreditAccountCredit?.userErrors ?? [];
  if (res.errors?.length || userErrors.length) {
    const msgs = [
      ...(res.errors ?? []).map((e) => e.message),
      ...userErrors.map((e) => e.message),
    ];
    throw new Error(`storeCreditAccountCredit: ${msgs.join('; ')}`);
  }

  const newBalanceStr =
    res.data?.storeCreditAccountCredit?.storeCreditAccountTransaction?.account?.balance?.amount;
  return {
    credited: need,
    newBalance: newBalanceStr != null ? Number.parseFloat(newBalanceStr) : null,
    skipped: false,
  };
}

/* ──────────────────────────────────────────────────────────────────
 * Order pulling — paginated `orders` query (TS port of the pagination
 * loop in flex_credit_shopify.py / the ORD_Q shape in the backfill).
 * ────────────────────────────────────────────────────────────────── */

export interface ShopifyAddress {
  city: string | null;
  province: string | null;
  zip: string | null;
  address1: string | null;
}

export interface ShopifyLineItem {
  id: string;
  title: string;
  quantity: number;
  amount: number; // originalTotalSet.shopMoney.amount, parsed to number
}

export interface ShopifyOrder {
  id: string; // numeric portion of the GID (idempotency key)
  gid: string; // full gid://shopify/Order/...
  name: string;
  updatedAt: string;
  financialStatus: string | null;
  cancelledAt: string | null;
  email: string | null;
  customerGid: string | null;
  customerEmail: string | null;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  address: ShopifyAddress | null;
  lineItems: ShopifyLineItem[];
}

interface OrdersResp {
  orders: {
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
    edges: Array<{
      node: {
        id: string;
        name: string;
        updatedAt: string;
        displayFinancialStatus: string | null;
        cancelledAt: string | null;
        email: string | null;
        customer: {
          id: string;
          email: string | null;
          firstName: string | null;
          lastName: string | null;
          phone: string | null;
          defaultAddress: ShopifyAddress | null;
        } | null;
        lineItems: {
          edges: Array<{
            node: {
              id: string;
              title: string;
              quantity: number;
              originalTotalSet: { shopMoney: { amount: string } };
            };
          }>;
        };
      };
    }>;
  };
}

const ORDERS_QUERY = `
  query($cursor: String, $q: String!) {
    orders(first: 50, after: $cursor, query: $q, sortKey: UPDATED_AT) {
      pageInfo { hasNextPage endCursor }
      edges { node {
        id name updatedAt displayFinancialStatus cancelledAt email
        customer { id email firstName lastName phone
          defaultAddress { city province zip address1 } }
        lineItems(first: 50) { edges { node {
          id title quantity originalTotalSet { shopMoney { amount } }
        } } }
      } }
    }
  }
`;

/** Numeric id from a Shopify GID, e.g. gid://shopify/Order/12345 → "12345". */
export function gidToId(gid: string): string {
  const parts = gid.split('/');
  return parts[parts.length - 1] ?? gid;
}

/**
 * Pull every Shopify order matching `searchQuery` (a Shopify order search
 * string, e.g. `updated_at:>=2026-05-21T...`), paginating fully. A
 * `maxOrders` cap guards against an unexpectedly huge backlog blowing the
 * function's time budget — the watermark only advances past what we
 * actually saw, so a capped run resumes cleanly next invocation.
 */
export async function fetchOrders(
  searchQuery: string,
  maxOrders = 500
): Promise<ShopifyOrder[]> {
  const out: ShopifyOrder[] = [];
  let cursor: string | null = null;

  while (out.length < maxOrders) {
    const res: GraphQLResult<OrdersResp> = await shopifyGraphQL<OrdersResp>(ORDERS_QUERY, {
      cursor,
      q: searchQuery,
    });
    if (res.errors?.length) {
      throw new Error(`orders query: ${res.errors.map((e) => e.message).join('; ')}`);
    }
    const conn = res.data?.orders;
    if (!conn) break;

    for (const edge of conn.edges) {
      const o = edge.node;
      const cust = o.customer;
      out.push({
        id: gidToId(o.id),
        gid: o.id,
        name: o.name,
        updatedAt: o.updatedAt,
        financialStatus: o.displayFinancialStatus,
        cancelledAt: o.cancelledAt,
        email: o.email,
        customerGid: cust?.id ?? null,
        customerEmail: cust?.email ?? null,
        firstName: cust?.firstName ?? null,
        lastName: cust?.lastName ?? null,
        phone: cust?.phone ?? null,
        address: cust?.defaultAddress ?? null,
        lineItems: o.lineItems.edges.map((le) => ({
          id: gidToId(le.node.id),
          title: le.node.title,
          quantity: le.node.quantity,
          amount: Number.parseFloat(le.node.originalTotalSet.shopMoney.amount),
        })),
      });
    }

    if (conn.pageInfo.hasNextPage && conn.pageInfo.endCursor) {
      cursor = conn.pageInfo.endCursor;
    } else {
      break;
    }
  }

  return out;
}

/**
 * Does this order contain at least one 2026 CSA line item we care about?
 * Matches the task's filter: title contains "2026" AND one of {csa, home
 * delivery, bouquet, (flower AND share)}. The categorize() pass downstream
 * does the precise per-line classification — this is the cheap
 * order-level prefilter.
 */
export function hasCsaLineItem(order: ShopifyOrder): boolean {
  return order.lineItems.some((li) => {
    const t = li.title.toLowerCase();
    if (!li.title.includes('2026')) return false;
    return (
      t.includes('csa') ||
      t.includes('home delivery') ||
      t.includes('bouquet') ||
      (t.includes('flower') && t.includes('share'))
    );
  });
}

/** Cancelled / refunded / voided orders are skipped (mirrors Python). */
export function isOrderSkippable(order: ShopifyOrder): boolean {
  if (order.cancelledAt) return true;
  const fs = (order.financialStatus ?? '').toUpperCase();
  return fs === 'REFUNDED' || fs === 'VOIDED';
}
