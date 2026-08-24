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
 * It also owns the ELIGIBILITY rule for Farm Flex ordering
 * (`resolveFlexEligibility` / `resolveFlexMemberRow`, below) — the single
 * place that decides who may order and which member row the order attaches
 * to. See the section header there for the full rationale.
 *
 * FAIL-SOFT CONTRACT: every public function swallows its own errors.
 *   - getFlexBalance         → null   on any failure / missing customer.
 *   - getFlexTransactions    → []     on any failure.
 *   - resolveFlexMemberRow   → {row:null,hasFlexShare:false} on any failure.
 *   - resolveFlexEligibility → a DENY with an explanatory `reason`.
 * Callers treat null/[] as "hide the wallet" — a flex outage must never
 * break the dashboard or account pages. Nothing here ever throws.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { shopifyConfigured, shopifyGraphQL } from './shopify';
import { supabaseAdmin } from './supabase';
import type { Database } from './database.types';
import {
  pickFlexMemberRow,
  decideFlexEligibility,
  type FlexEligibilityReason,
} from './flex-order';

export type { FlexEligibilityReason };

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
 * ELIGIBILITY — who may use Farm Flex ordering, and which member row
 * their order attaches to. THE SINGLE SOURCE OF THIS RULE.
 *
 * THE BUG THIS FIXES (2026-08-21): two existing rules contradicted each
 * other and stranded real money.
 *   1. The order sync (/api/sync/shopify-orders) DELIBERATELY never creates
 *      a member row for a flex-funds purchase — the members.share_type
 *      domain excludes it, and a flex member row would put that person on
 *      pack sheets / stop manifests / route sheets as a RECURRING weekly
 *      recipient whether or not they ever order.
 *   2. /account/flex-order was gated to `members.share_type='flex'`.
 * So a member could buy Farm Flex funds and then be structurally barred
 * from spending them. Live at the time of the fix: 5 members holding
 * $178.06 of Shopify store credit with no flex share row.
 *
 * THE RULE: a member may use Farm Flex ordering if they have
 *     spendable store credit > 0   OR   a live flex share row.
 * Creating flex member rows was considered and REJECTED (see above) — the
 * fix is eligibility, not data.
 *
 * FAIL-SOFT IS LOAD-BEARING. `getFlexBalance()` returns null for
 * "Shopify unreachable", NOT for "no money". A Shopify outage must never
 * lock an EXISTING flex member out of their weekly order, so:
 *   - a live flex share row is decided WITHOUT consulting Shopify at all
 *     (no balance round-trip, no outage exposure, no added latency), and
 *   - a null balance falls back to exactly the OLD rule (flex row present).
 *
 * THE RULES THEMSELVES are pure functions in lib/flex-order.ts
 * (`pickFlexMemberRow`, `decideFlexEligibility`) so they can be unit-tested
 * without a database or a Shopify token. What follows is only the I/O.
 * ────────────────────────────────────────────────────────────────── */

/** The member-row fields the flex ordering surfaces need. */
export interface FlexMemberRow {
  id: string;
  share_type: string;
  status: string;
  share_size: string | null;
  delivery_address: string | null;
  pickup_location: { day_of_week: string | null } | null;
}

/** Result of resolving WHICH member row a flex order attaches to. */
export interface FlexMemberResolution {
  /** The chosen row, or null when the caller has no member rows at all. */
  row: FlexMemberRow | null;
  /** True when the caller has a LIVE `share_type='flex'` row. */
  hasFlexShare: boolean;
}

/**
 * Resolve the caller's member rows (RLS-scoped to their own account, and
 * household-aware via `current_customer_id()`) and pick the ONE row a flex
 * order should attach to.
 *
 * The PICKING RULE itself lives in lib/flex-order.ts `pickFlexMemberRow` —
 * pure and unit-tested. This function is only the I/O around it.
 *
 * FAIL-SOFT: any query error returns `{ row: null, hasFlexShare: false }`
 * (callers then deny/hide rather than crash). NEVER throws.
 */
export async function resolveFlexMemberRow(
  supabase: SupabaseClient<Database>
): Promise<FlexMemberResolution> {
  try {
    type Row = FlexMemberRow & { created_at: string | null };
    const { data, error } = await supabase
      .from('members')
      .select(
        'id, share_type, status, share_size, delivery_address, created_at, ' +
        'pickup_location:pickup_locations ( day_of_week )'
      )
      .overrideTypes<Row[], { merge: false }>();

    if (error) {
      console.error('[flex] resolveFlexMemberRow query failed:', error.message);
      return { row: null, hasFlexShare: false };
    }

    return pickFlexMemberRow(data ?? []);
  } catch (e) {
    console.error('[flex] resolveFlexMemberRow threw (fail-soft):', e);
    return { row: null, hasFlexShare: false };
  }
}

/**
 * Thin convenience wrapper over `resolveFlexMemberRow` for callers that
 * only need the id. Delegates so the ranking rule lives in ONE place.
 */
export async function resolveFlexMemberId(
  supabase: SupabaseClient<Database>
): Promise<string | null> {
  const { row } = await resolveFlexMemberRow(supabase);
  return row?.id ?? null;
}

export interface FlexEligibility {
  /** May this caller place/see a Farm Flex order? */
  eligible: boolean;
  /** The member row an order attaches to (null when none / not eligible). */
  member: FlexMemberRow | null;
  /** Convenience: `member?.id ?? null`. */
  memberId: string | null;
  /** True when eligibility came from a live flex share row. */
  hasFlexShare: boolean;
  /**
   * Live balance, ONLY when we actually looked it up (i.e. no flex share
   * row). Null both when we skipped the lookup and when Shopify failed —
   * use `balanceUnavailable` to tell those apart.
   */
  balance: FlexBalance | null;
  /** True when we asked Shopify for the balance and could not get it. */
  balanceUnavailable: boolean;
  reason: FlexEligibilityReason;
}

/**
 * THE eligibility decision. Every Farm Flex ordering surface — the page
 * gate, the submit API, the /account + dashboard entry points — calls this
 * and nothing else, so the rule can never drift between them. The rule
 * itself is `decideFlexEligibility` in lib/flex-order.ts (pure, tested);
 * this function supplies it with real data.
 *
 * Cost: ZERO extra round-trips for an existing flex member (one members
 * query, NO Shopify call — which is also what makes a Shopify outage
 * harmless to them). One Shopify call only for a member without a flex row,
 * the only case where credit decides the answer.
 *
 * NEVER throws — every failure path resolves to a deny with a reason.
 */
export async function resolveFlexEligibility(
  supabase: SupabaseClient<Database>,
  email: string
): Promise<FlexEligibility> {
  const { row, hasFlexShare } = await resolveFlexMemberRow(supabase);

  // Only consult Shopify when credit is what decides the answer.
  const balance = hasFlexShare ? null : await getFlexBalance(email);
  const balanceUnavailable = !hasFlexShare && balance === null;

  const { eligible, reason } = decideFlexEligibility(
    hasFlexShare,
    row !== null,
    balance?.total ?? null
  );

  return {
    eligible,
    member: row,
    memberId: row?.id ?? null,
    hasFlexShare,
    balance,
    balanceUnavailable,
    reason,
  };
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

/* ──────────────────────────────────────────────────────────────────
 * ADD FUNDS — Phase 2a (top-up tiles + Shopify "Flex Top-Up" product).
 *
 * Money never moves through this portal. A member taps a preset tile,
 * we send them to a Shopify CART PERMALINK for the matching fixed-price
 * variant, and they complete checkout on Shopify (signed into their
 * Shopify account so store credit + payment work). The existing 15-min
 * order sync (/api/sync/shopify-orders) then credits the principal + the
 * loyalty bonus into their wallet.
 *
 * Custom/arbitrary amounts are OUT of scope for v1: Shopify cart
 * permalinks require a fixed numeric variant id, so we expose presets
 * only. Adding a tier later is just another row in FLEX_TOPUP_VARIANTS.
 * ────────────────────────────────────────────────────────────────── */

/**
 * The standing Farm Flex loyalty ladder (decided 2026-05-21, see
 * CHANGE_LOG):
 *   under $250  → +5%
 *   $250–$499   → +10%
 *   $500 and up → +12%
 *
 * This is the SINGLE source of truth for the bonus percentage. Both the
 * member-facing tiles (what bonus a tile earns) and the order sync (what
 * bonus to actually credit) read it, so the displayed promise and the
 * issued credit can never drift apart.
 */
export const FLEX_BONUS_TIERS: ReadonlyArray<{ min: number; rate: number }> = [
  { min: 500, rate: 0.12 },
  { min: 250, rate: 0.1 },
  { min: 0, rate: 0.05 },
];

/**
 * Loyalty-bonus RATE (as a decimal) earned for a given principal amount,
 * per FLEX_BONUS_TIERS. e.g. flexBonusRate(250) → 0.10.
 * Negative / non-finite input → 0 (no bonus, never negative).
 */
export function flexBonusRate(amount: number): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  for (const tier of FLEX_BONUS_TIERS) {
    if (amount >= tier.min) return tier.rate;
  }
  return 0;
}

/**
 * Loyalty-bonus DOLLARS earned for a given principal amount, rounded to
 * cents (banker-safe: round on the cent, not the float). e.g.
 * flexBonusAmount(250) → 25.00, flexBonusAmount(100) → 5.00.
 */
export function flexBonusAmount(amount: number): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  return Math.round(amount * flexBonusRate(amount) * 100) / 100;
}

/** A preset Add-Funds tile: the principal it loads + the Shopify variant. */
export interface FlexTopUpTier {
  /** Principal dollars the member pays (== the variant price). */
  amount: number;
  /**
   * Shopify ProductVariant numeric id for the "CSA Farm Flex Top-Up"
   * product, used to build the cart permalink. `null` until the product
   * is created in Shopify (TASK 1) — see FLEX_TOPUP_PRODUCT_READY.
   */
  variantId: string | null;
  /** Visually emphasize this tile as the suggested choice. */
  highlight?: boolean;
}

/**
 * The four preset top-up tiles ($50 / $100 / $250 / $500).
 *
 * Wired 2026-05-23 by PM_ARCHITECT — the "CSA Farm Flex Top-Up" Shopify
 * product (gid://shopify/Product/8763606728857, productType "flex-topup",
 * ACTIVE, published to Online Store, inventory not tracked) was created via
 * the Admin API and these are its 4 fixed-price variant numeric ids.
 */
export const FLEX_TOPUP_VARIANTS: ReadonlyArray<FlexTopUpTier> = [
  { amount: 50, variantId: '47841200046233' },
  { amount: 100, variantId: '47841222951065', highlight: true },
  { amount: 250, variantId: '47841222983833' },
  { amount: 500, variantId: '47841223016601' },
];

/** True once every tile has a real Shopify variant id wired in. */
export const FLEX_TOPUP_PRODUCT_READY: boolean = FLEX_TOPUP_VARIANTS.every(
  (t) => typeof t.variantId === 'string' && t.variantId.length > 0
);

/**
 * Shopify storefront subdomain (the `{store}` in
 * `{store}.myshopify.com`). The cart-permalink target. Defaults to the
 * known production store; a server caller may pass the runtime
 * SHOPIFY_STORE_NAME to be safe across environments.
 */
export const FLEX_SHOPIFY_STORE_DEFAULT = 'tiny-seed-farmers-market';

/**
 * Build the Shopify CART PERMALINK that loads exactly one of the given
 * top-up variant into the cart and starts checkout:
 *   https://{store}.myshopify.com/cart/{variantId}:1
 *
 * Returns `null` when the variant isn't wired up yet (variantId null) —
 * callers should render the tile as disabled rather than a dead link.
 *
 * @param tier  one entry from FLEX_TOPUP_VARIANTS
 * @param store storefront subdomain (defaults to the production store)
 */
export function flexTopUpCartUrl(
  tier: FlexTopUpTier,
  store: string = FLEX_SHOPIFY_STORE_DEFAULT
): string | null {
  if (!tier.variantId) return null;
  const sub = (store || FLEX_SHOPIFY_STORE_DEFAULT).trim();
  return `https://${sub}.myshopify.com/cart/${tier.variantId}:1`;
}

/* ──────────────────────────────────────────────────────────────────
 * SYNC SIDE — classify a Shopify line item as a "loads flex funds"
 * purchase and compute the bonus to credit. Shared by the order sync so
 * the bonus math lives in ONE place alongside the ladder above.
 * ────────────────────────────────────────────────────────────────── */

/**
 * Does this Shopify line-item title load Farm Flex funds? True for BOTH
 * the legacy flex SHARE ("...2026 Summer Flex CSA...") and the new
 * "CSA Farm Flex Top-Up" product — anything whose title contains "flex"
 * is a wallet load. Case-insensitive.
 *
 * NOTE: this is intentionally broader than shopify.ts `categorize()`,
 * which only recognizes the flex *share* (it requires "2026"+"summer"+
 * "csa"+"flex"). Top-up titles won't carry "2026"/"summer csa", so the
 * sync must use THIS predicate to catch them.
 */
export function isFlexFundsTitle(title: string): boolean {
  return title.toLowerCase().includes('flex');
}

/** A flex purchase split into the credited parts, ready for the sync. */
export interface FlexCreditPlan {
  /** Dollars the member paid (the line amount) — credited as principal. */
  principal: number;
  /** Bonus rate applied (decimal), per the ladder. */
  bonusRate: number;
  /** Bonus dollars to credit on top of principal. */
  bonus: number;
  /** principal + bonus — the total store credit this purchase yields. */
  total: number;
}

/**
 * Given the dollars paid for a flex line item, split into principal +
 * ladder bonus + total. Pure; the sync uses `total` as the store-credit
 * target and records `bonus` as a flex_transactions row.
 */
export function planFlexCredit(amountPaid: number): FlexCreditPlan {
  const principal = Number.isFinite(amountPaid) && amountPaid > 0 ? amountPaid : 0;
  const bonusRate = flexBonusRate(principal);
  const bonus = flexBonusAmount(principal);
  return {
    principal,
    bonusRate,
    bonus,
    total: Math.round((principal + bonus) * 100) / 100,
  };
}
