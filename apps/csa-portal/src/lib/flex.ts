/**
 * Farm Flex wallet — read-only balance + history (Phase 1).
 *
 * "Farm Flex" is a member's prepaid store credit. The SOURCE OF TRUTH for
 * the spendable balance is **Shopify Store Credit** (one combined number).
 * Supabase's `flex_transactions` table separately records the promotional
 * **loyalty bonus** portion so accounting can split escheatment-exempt
 * principal from the goodwill bonus (see CHANGE_LOG 2026-05-21).
 *
 *   total     = sum of the customer's Shopify store-credit account balances
 *   bonus     = Σ flex_transactions.amount WHERE reason ILIKE '%loyalty bonus%'
 *   principal = max(0, total − bonus)
 *
 * The member's Shopify customer is resolved by EMAIL (their portal auth
 * identity). This module is SERVER-ONLY — it imports the Shopify secret via
 * `astro:env/server` (re-exported through ./shopify) and uses the
 * service-role Supabase client. NEVER import it from a client component.
 *
 * FAIL-SOFT CONTRACT: every public function swallows its own errors.
 *   - getFlexBalance      → null  on any failure / missing customer.
 *   - getFlexTransactions → []    on any failure.
 * Callers treat null/[] as "hide the wallet" — a flex outage must never
 * break the dashboard or account pages. Nothing here ever throws.
 */
import { shopifyConfigured, shopifyGraphQL } from './shopify';
import { supabaseAdmin } from './supabase';

export interface FlexBalance {
  /** Combined spendable store credit (USD), from Shopify. */
  total: number;
  /** Promotional loyalty-bonus portion (USD), from flex_transactions. */
  bonus: number;
  /** Prepaid principal = max(0, total − bonus). Never expires. */
  principal: number;
  /** Currency code from Shopify (e.g. 'USD'). */
  currency: string;
}

export interface FlexTransaction {
  id: string;
  /** ISO timestamp the transaction was recorded. */
  date: string;
  /** Signed-by-type display amount is the caller's job; this is the raw magnitude. */
  amount: number;
  reason: string | null;
  type: 'credit' | 'debit' | 'refund' | 'transfer' | 'adjustment';
}

/* ──────────────────────────────────────────────────────────────────
 * Shopify: resolve customer by email → sum store-credit balances.
 *
 * GraphQL shape mirrors the BALANCE_QUERY in shopify.ts, but keyed by
 * email rather than a known customer GID (the portal only knows the
 * member's email). `storeCreditAccounts(first:5)` is summed in case a
 * customer somehow has multiple accounts — normally there's one.
 * ────────────────────────────────────────────────────────────────── */

const CUSTOMER_CREDIT_BY_EMAIL = `
  query($q: String!) {
    customers(first: 1, query: $q) {
      edges {
        node {
          id
          storeCreditAccounts(first: 5) {
            edges { node { balance { amount currencyCode } } }
          }
        }
      }
    }
  }
`;

interface CustomerCreditResp {
  customers: {
    edges: Array<{
      node: {
        id: string;
        storeCreditAccounts: {
          edges: Array<{
            node: { balance: { amount: string; currencyCode: string } };
          }>;
        };
      };
    }>;
  };
}

/**
 * Build a Shopify customer search term for an exact email match.
 * Wrapping in quotes guards against emails containing reserved search
 * characters (`:`, spaces) breaking the query syntax. We also escape any
 * embedded double-quote / backslash to keep the literal well-formed.
 */
function emailQuery(email: string): string {
  const safe = email.trim().toLowerCase().replace(/(["\\])/g, '\\$1');
  return `email:"${safe}"`;
}

/**
 * Read a member's Farm Flex balance, resolved by email.
 *
 * Returns `null` on EVERY failure path — Shopify creds absent, Shopify
 * down/non-2xx (shopifyGraphQL throws), GraphQL-level errors, no matching
 * customer, or any unexpected exception. Callers hide the wallet on null.
 * NEVER throws.
 */
export async function getFlexBalance(email: string): Promise<FlexBalance | null> {
  try {
    if (!email || !email.trim()) return null;
    // No Shopify creds (e.g. local build) → no source of truth → hide.
    if (!shopifyConfigured()) return null;

    // 1. Shopify: combined store-credit balance for this email.
    const res = await shopifyGraphQL<CustomerCreditResp>(CUSTOMER_CREDIT_BY_EMAIL, {
      q: emailQuery(email),
    });
    if (res.errors?.length) return null;

    const node = res.data?.customers?.edges?.[0]?.node;
    if (!node) return null; // no Shopify customer for this email

    const accounts = node.storeCreditAccounts?.edges ?? [];
    let total = 0;
    let currency = 'USD';
    for (const edge of accounts) {
      const amt = Number.parseFloat(edge.node.balance.amount);
      if (Number.isFinite(amt)) total += amt;
      // Take the currency from the first account that reports one.
      if (edge.node.balance.currencyCode) currency = edge.node.balance.currencyCode;
    }

    // 2. Supabase: loyalty-bonus portion for this email. Fail-soft —
    //    if the bonus lookup errors we treat bonus as 0 (still show the
    //    real spendable total rather than hiding the whole wallet).
    const bonus = await getLoyaltyBonusTotal(email);

    const principal = Math.max(0, total - bonus);

    return {
      total,
      bonus,
      principal,
      currency,
    };
  } catch (err) {
    console.error('[flex] getFlexBalance failed (fail-soft → null):', err);
    return null;
  }
}

/**
 * Sum of the member's promotional loyalty-bonus credits, from Supabase
 * `flex_transactions` (reason ILIKE '%loyalty bonus%'). Fail-soft → 0.
 * Internal helper; never throws.
 */
async function getLoyaltyBonusTotal(email: string): Promise<number> {
  try {
    const { data, error } = await supabaseAdmin
      .from('flex_transactions')
      .select('amount')
      .eq('email', email.trim().toLowerCase())
      .ilike('reason', '%loyalty bonus%');
    if (error) {
      console.error('[flex] loyalty-bonus query failed (→ 0):', error.message);
      return 0;
    }
    let sum = 0;
    for (const row of data ?? []) {
      const amt = Number(row.amount);
      if (Number.isFinite(amt)) sum += amt;
    }
    return sum;
  } catch (err) {
    console.error('[flex] loyalty-bonus lookup threw (→ 0):', err);
    return 0;
  }
}

/**
 * Recent flex_transactions for a member's email, newest first (limit 25),
 * for the history list on /account/flex. Fail-soft → []. NEVER throws.
 */
export async function getFlexTransactions(email: string): Promise<FlexTransaction[]> {
  try {
    if (!email || !email.trim()) return [];
    const { data, error } = await supabaseAdmin
      .from('flex_transactions')
      .select('id, created_at, amount, reason, type')
      .eq('email', email.trim().toLowerCase())
      .order('created_at', { ascending: false })
      .limit(25);
    if (error) {
      console.error('[flex] getFlexTransactions query failed (→ []):', error.message);
      return [];
    }
    return (data ?? []).map((row) => ({
      id: row.id,
      date: row.created_at,
      amount: Number(row.amount),
      reason: row.reason,
      type: row.type,
    }));
  } catch (err) {
    console.error('[flex] getFlexTransactions threw (→ []):', err);
    return [];
  }
}

/* ──────────────────────────────────────────────────────────────────
 * Display helpers (pure, shared by dashboard + /account/flex).
 * ────────────────────────────────────────────────────────────────── */

/** Format a USD amount as `$1,150.00`. */
export function formatFlexMoney(amount: number, currency = 'USD'): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    // Unknown currency code → fall back to a plain 2-decimal dollar string.
    return `$${amount.toFixed(2)}`;
  }
}

/** Whether a transaction adds to the balance (drives +/− sign + color). */
export function isCreditType(type: FlexTransaction['type']): boolean {
  return type === 'credit' || type === 'refund' || type === 'adjustment';
}
