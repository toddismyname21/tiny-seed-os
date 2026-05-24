/**
 * Referral bonus — code generation + member stats (SERVER-ONLY).
 *
 * A CSA member shares a unique REFERRAL DISCOUNT CODE. A friend enters it
 * at Shopify checkout and gets $25 off a CSA order ($300 minimum, CSA
 * collection only). When that referred order completes (paid, not
 * cancelled), the REFERRER earns $25 in Farm Flex. Unlimited referrals.
 *
 * This module owns the member-facing READ + on-demand CREATE side:
 *   - getOrCreateReferralCode(customer) → mint (or return) the member's
 *     personal code, creating the matching Shopify discount the first time.
 *   - getReferralStats(customerId)      → {count, totalEarned} for the page.
 *
 * The CREDIT side (paying the referrer when a referred order completes)
 * lives in the order sync (/api/sync/shopify-orders) — it reads the codes
 * table written here. The bonus math constant ($25) is shared via
 * REFERRAL_BONUS_AMOUNT so the displayed promise and the issued credit
 * can't drift.
 *
 * SERVER-ONLY: imports the Shopify admin token (via ./shopify) + the
 * service-role Supabase client. NEVER import from a client component.
 *
 * The codes/referrals tables have NO authenticated write policy (migration
 * 0024) — only the service-role client (supabaseAdmin) can write them, so
 * code minting MUST go through this server module.
 */
import { shopifyConfigured, shopifyGraphQL } from './shopify';
import { supabaseAdmin } from './supabase';

/** The standing referral bonus paid to the referrer (USD). */
export const REFERRAL_BONUS_AMOUNT = 25;

/** The friend's discount: $25 off, $300 minimum, CSA collection only. */
export const REFERRAL_DISCOUNT_AMOUNT = 25;
export const REFERRAL_MINIMUM_SUBTOTAL = 300;

/**
 * The Shopify CSA collection the friend discount is restricted to
 * (proven by PM). The $25-off code only applies to items in this
 * collection, so it can't be spent on non-CSA products.
 */
export const CSA_COLLECTION_GID = 'gid://shopify/Collection/184897929349';

/** A member's referral code + the Shopify discount it created. */
export interface ReferralCode {
  code: string;
  shopifyDiscountNodeId: string | null;
}

/** The minimal customer shape this module needs to mint a code. */
export interface ReferralCustomer {
  id: string;
  contact_name: string | null;
  email: string;
}

/**
 * Thrown when code creation fails in a way the page should surface as a
 * friendly "try again" (Shopify down, no creds, GraphQL error). We never
 * write a half row on failure — the member sees the retry message and the
 * next page load attempts a clean creation.
 */
export class ReferralCodeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ReferralCodeError';
  }
}

/* ──────────────────────────────────────────────────────────────────
 * Code string generation.
 *
 * <FIRSTNAME>-<4 random A-Z0-9>. Uppercased, alphanumerics only from the
 * member's first name (so "O'Brien" → "OBRIEN"), capped so the whole code
 * stays short + shareable. If the name yields no usable letters (empty /
 * all punctuation), we fall back to "FRIEND".
 * ────────────────────────────────────────────────────────────────── */

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/0/1 (ambiguous)

function randomSuffix(len = 4): string {
  let out = '';
  for (let i = 0; i < len; i += 1) {
    out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return out;
}

/** Derive the name prefix: first name, A-Z only, uppercased, max 12 chars. */
function codePrefix(customer: ReferralCustomer): string {
  const firstName = (customer.contact_name ?? '').trim().split(/\s+/)[0] ?? '';
  const cleaned = firstName.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 12);
  return cleaned.length >= 2 ? cleaned : 'FRIEND';
}

/** A fresh candidate code, e.g. "MARIA-K7Q2". */
function generateCandidate(customer: ReferralCustomer): string {
  return `${codePrefix(customer)}-${randomSuffix()}`;
}

/* ──────────────────────────────────────────────────────────────────
 * Shopify: create the friend discount (PM-PROVEN mutation shape).
 *
 * $25 off, $300 minimum subtotal, restricted to the CSA collection,
 * once per customer, no usage limit (works for unlimited friends).
 * ────────────────────────────────────────────────────────────────── */

const DISCOUNT_CREATE_MUTATION = `
  mutation($d: DiscountCodeBasicInput!) {
    discountCodeBasicCreate(basicCodeDiscount: $d) {
      codeDiscountNode { id }
      userErrors { field message }
    }
  }
`;

interface DiscountCreateResp {
  discountCodeBasicCreate: {
    codeDiscountNode: { id: string } | null;
    userErrors: Array<{ field: string[] | null; message: string }>;
  } | null;
}

/**
 * Create the CSA-restricted $25-off discount for `code` in Shopify.
 * Returns the created DiscountCodeNode GID. Throws ReferralCodeError on
 * any failure so the caller can surface "try again" without writing a row.
 */
async function createShopifyDiscount(code: string): Promise<string> {
  const variables = {
    d: {
      title: `Referral - ${code}`,
      code,
      startsAt: new Date().toISOString(),
      customerSelection: { all: true },
      customerGets: {
        value: {
          discountAmount: {
            amount: REFERRAL_DISCOUNT_AMOUNT.toFixed(1), // "25.0"
            appliesOnEachItem: false,
          },
        },
        items: { collections: { add: [CSA_COLLECTION_GID] } },
      },
      minimumRequirement: {
        subtotal: {
          greaterThanOrEqualToSubtotal: REFERRAL_MINIMUM_SUBTOTAL.toFixed(1), // "300.0"
        },
      },
      appliesOncePerCustomer: true,
      // No usageLimit → the code works for unlimited friends.
    },
  };

  let res;
  try {
    res = await shopifyGraphQL<DiscountCreateResp>(DISCOUNT_CREATE_MUTATION, variables);
  } catch (err) {
    // Transport failure (non-2xx). shopifyGraphQL throws here.
    throw new ReferralCodeError(
      `Shopify discount create failed: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  const userErrors = res.data?.discountCodeBasicCreate?.userErrors ?? [];
  if (res.errors?.length || userErrors.length) {
    const msgs = [
      ...(res.errors ?? []).map((e) => e.message),
      ...userErrors.map((e) => e.message),
    ];
    throw new ReferralCodeError(`Shopify discount create errors: ${msgs.join('; ')}`);
  }

  const nodeId = res.data?.discountCodeBasicCreate?.codeDiscountNode?.id;
  if (!nodeId) {
    throw new ReferralCodeError('Shopify discount create returned no node id');
  }
  return nodeId;
}

/* ──────────────────────────────────────────────────────────────────
 * getOrCreateReferralCode — the public entry point.
 * ────────────────────────────────────────────────────────────────── */

/**
 * Return the member's referral code, creating it on first use.
 *
 * Flow:
 *   1. If a referral_codes row already exists for this customer → return it.
 *   2. Else pick a unique code string (retry on local DB collision).
 *   3. Create the matching Shopify discount (PM-proven mutation).
 *   4. Insert {customer_id, code, shopify_discount_node_id} and return.
 *
 * FAIL-SOFT on the create path: if Shopify errors we DO NOT write a
 * half row — we throw ReferralCodeError, and the page shows a friendly
 * "try again". The existing-row path (step 1) never throws for a member
 * who already has a code (a transient Shopify outage can't hide a code
 * that's already minted).
 *
 * Concurrency: the UNIQUE(customer_id) + UNIQUE(code) constraints are the
 * source of truth. If two requests race to create the first code, one
 * insert wins and the other hits a unique violation — we then re-read the
 * winner's row and return it (no duplicate, no error to the member).
 *
 * @throws ReferralCodeError when a NEW code can't be created (surface
 *         "try again" on the page). Never throws for an existing code.
 */
export async function getOrCreateReferralCode(
  customer: ReferralCustomer
): Promise<ReferralCode> {
  // 1. Existing row?
  const existing = await readCode(customer.id);
  if (existing) return existing;

  // Creating a new code requires Shopify. Fail-soft if creds absent.
  if (!shopifyConfigured()) {
    throw new ReferralCodeError('Shopify not configured — cannot mint a referral code');
  }

  // 2. Pick a code string not already taken in the DB. The Shopify side
  //    also rejects duplicate codes (userErrors), so this is a cheap
  //    pre-check; the DB UNIQUE constraint is the real guard.
  const code = await pickUniqueCode(customer);

  // 3. Create the Shopify discount FIRST. If this throws, no row is
  //    written — the member retries cleanly.
  const shopifyDiscountNodeId = await createShopifyDiscount(code);

  // 4. Persist. On a unique violation (race: another request created the
  //    customer's code, or the same code string), re-read and return the
  //    winning row rather than erroring.
  const { error: insertErr } = await supabaseAdmin.from('referral_codes').insert({
    customer_id: customer.id,
    code,
    shopify_discount_node_id: shopifyDiscountNodeId,
  });

  if (insertErr) {
    // 23505 = unique_violation. Someone won the race — return their row.
    if (insertErr.code === '23505') {
      const winner = await readCode(customer.id);
      if (winner) return winner;
    }
    throw new ReferralCodeError(`referral_codes insert: ${insertErr.message}`);
  }

  return { code, shopifyDiscountNodeId };
}

/** Read a customer's existing referral code row, or null. */
async function readCode(customerId: string): Promise<ReferralCode | null> {
  const { data, error } = await supabaseAdmin
    .from('referral_codes')
    .select('code, shopify_discount_node_id')
    .eq('customer_id', customerId)
    .maybeSingle();
  if (error) {
    throw new ReferralCodeError(`referral_codes read: ${error.message}`);
  }
  if (!data) return null;
  return { code: data.code, shopifyDiscountNodeId: data.shopify_discount_node_id };
}

/**
 * Generate a code string that isn't already present in referral_codes.
 * Retries on collision (the random 4-char suffix over a 32-char alphabet
 * makes a collision astronomically unlikely, but we check anyway).
 */
async function pickUniqueCode(customer: ReferralCustomer, maxTries = 8): Promise<string> {
  for (let i = 0; i < maxTries; i += 1) {
    const candidate = generateCandidate(customer);
    const { data, error } = await supabaseAdmin
      .from('referral_codes')
      .select('id')
      .eq('code', candidate)
      .maybeSingle();
    if (error) {
      throw new ReferralCodeError(`referral_codes collision check: ${error.message}`);
    }
    if (!data) return candidate; // free
  }
  throw new ReferralCodeError('could not generate a unique referral code after retries');
}

/* ──────────────────────────────────────────────────────────────────
 * getReferralStats — counts for the /account/refer page.
 * ────────────────────────────────────────────────────────────────── */

export interface ReferralStats {
  /** Number of qualifying referred orders this member has earned on. */
  count: number;
  /** Total Farm Flex (USD) this member has earned from referrals. */
  totalEarned: number;
}

/**
 * Count + sum the member's referrals. FAIL-SOFT → {count:0, totalEarned:0}
 * so a stats hiccup never breaks the page (the code itself is the point).
 */
export async function getReferralStats(customerId: string): Promise<ReferralStats> {
  try {
    const { data, error } = await supabaseAdmin
      .from('referrals')
      .select('amount')
      .eq('referrer_customer_id', customerId);
    if (error) {
      console.error('[referral] getReferralStats query failed (→ zeros):', error.message);
      return { count: 0, totalEarned: 0 };
    }
    const rows = data ?? [];
    let totalEarned = 0;
    for (const row of rows) {
      const amt = Number(row.amount);
      if (Number.isFinite(amt)) totalEarned += amt;
    }
    return { count: rows.length, totalEarned: Math.round(totalEarned * 100) / 100 };
  } catch (err) {
    console.error('[referral] getReferralStats threw (→ zeros):', err);
    return { count: 0, totalEarned: 0 };
  }
}
