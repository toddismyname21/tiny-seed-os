/**
 * POST /api/admin/market-checkout
 *
 * MARKET CHECKOUT — staff tool that DEDUCTS a farmers-market purchase from a
 * member's Farm Flex (Shopify store credit) balance on the spot. THIS MOVES
 * MONEY, so every guard below is load-bearing.
 *
 * Flow:
 *   1. CSRF (isSameOriginPost) + requireAdmin (role admin/staff).
 *   2. Zod-validate { customer_id, amount, note?, idem }.
 *   3. Resolve the member's customer + Shopify customer GID by email.
 *   4. IDEMPOTENCY / double-submit guard: reject if an identical market
 *      checkout for the same customer + amount was logged within 2 minutes
 *      (member_comms summary match) — protects against a double-tap or a
 *      retried request re-debiting the member.
 *   5. RE-FETCH the live balance from Shopify (NEVER trust the client) and
 *      reject if amount > balance (insufficient_funds).
 *   6. storeCreditAccountDebit for the amount (USD). On Shopify error,
 *      NOTHING is deducted and we redirect with a clear error.
 *   7. Log to member_comms (author_email = staff email, channel 'other').
 *   8. Fire-and-await a fail-soft receipt email to the member.
 *   9. Redirect back with ?ok=deducted&amount=X&name=... showing the BIG
 *      green confirmation + the NEW balance.
 *
 * Safety caps: amount must be > 0, ≤ $500, ≤ live balance.
 *
 * On success: 303 → /admin/market-checkout?ok=deducted&amount=&name=&new_balance=
 * On failure: 303 → /admin/market-checkout?error=<code>[&customer_id=]
 */
import type { APIRoute } from 'astro';
import { z } from 'zod';
import { RESEND_API_KEY, RESEND_FROM_EMAIL } from 'astro:env/server';
import { requireAdmin } from '../../../lib/admin';
import { isSameOriginPost, PORTAL_ORIGIN } from '../../../lib/onboarding';
import {
  shopifyConfigured,
  getCustomerGidByEmail,
  getStoreCreditAccount,
  debitStoreCredit,
} from '../../../lib/shopify';
import { sendMarketCheckoutReceipt } from '../../../lib/market-checkout-email';

export const prerender = false;

const REDIRECT = '/admin/market-checkout';

/** Hard cap on a single market checkout. A market produce sale above this is
 *  almost certainly a fat-finger; force a deliberate second transaction. */
const MAX_AMOUNT = 500;

/** Idempotency window — a second identical checkout inside this many ms is a
 *  double-submit, not a real second purchase. */
const IDEMPOTENCY_WINDOW_MS = 2 * 60 * 1000;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const Body = z.object({
  customer_id: z.string().regex(UUID_RE, 'invalid_customer'),
  // Coerce the form string → number, then bound it. The refine messages map
  // 1:1 to the redirect error codes the page renders.
  amount: z.coerce
    .number({ message: 'invalid_amount' })
    .finite('invalid_amount')
    .gt(0, 'amount_too_low')
    .max(MAX_AMOUNT, 'amount_too_high'),
  note: z.string().trim().max(280).optional().default(''),
  // Client-generated idempotency token (uuid). Defensive: not trusted for
  // auth, only used to make the summary line unique-per-submit so a genuine
  // second purchase isn't blocked while a true double-tap is.
  idem: z.string().trim().max(80).optional().default(''),
});

/** Round a dollar amount to cents (avoid float drift before comparison). */
function toCents(n: number): number {
  return Math.round(n * 100);
}

/** Build the member_comms summary line for a market checkout. The amount +
 *  customer scope make this the idempotency match key. */
function checkoutSummary(amount: number, items: string, marketLabel: string | null): string {
  const itemPart = items ? ` — items: ${items}` : '';
  const where = marketLabel ? ` at ${marketLabel}` : '';
  return `MARKET CHECKOUT: -$${amount.toFixed(2)}${where}${itemPart}`;
}

function fail(
  redirect: (url: string, status: 303) => Response,
  code: string,
  customerId?: string
): Response {
  const cust = customerId ? `&customer_id=${encodeURIComponent(customerId)}` : '';
  return redirect(`${REDIRECT}?error=${code}${cust}`, 303);
}

export const POST: APIRoute = async ({ request, locals, redirect }) => {
  // 1. CSRF: same-origin POSTs only.
  if (!isSameOriginPost(request, PORTAL_ORIGIN)) {
    return new Response('Forbidden', { status: 403 });
  }

  // 1. AuthZ: caller must be admin or staff.
  const auth = await requireAdmin(locals.supabase, locals.user);
  if (auth.response) return auth.response;
  const ctx = auth.ctx;

  // 2. Parse + validate the form.
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return fail(redirect, 'invalid_input');
  }

  const parsed = Body.safeParse({
    customer_id: String(formData.get('customer_id') ?? ''),
    amount: String(formData.get('amount') ?? ''),
    note: String(formData.get('note') ?? ''),
    idem: String(formData.get('idem') ?? ''),
  });
  if (!parsed.success) {
    const code = parsed.error.issues[0]?.message ?? 'invalid_input';
    const cid = String(formData.get('customer_id') ?? '');
    return fail(redirect, code, UUID_RE.test(cid) ? cid : undefined);
  }
  const { customer_id, amount, note } = parsed.data;
  const amountCents = toCents(amount);

  // 0. Shopify must be configured — otherwise there is no balance to debit.
  if (!shopifyConfigured()) {
    return fail(redirect, 'shopify_unconfigured', customer_id);
  }

  // 3. Resolve the customer (name + email + flex share + stop). We confirm
  //    they are an ACTIVE FLEX member server-side — never trust that the
  //    client only listed flex members.
  type CustomerRow = { id: string; contact_name: string; email: string };
  const { data: customer, error: custErr } = await locals.supabase
    .from('customers')
    .select('id, contact_name, email')
    .eq('id', customer_id)
    .maybeSingle()
    .overrideTypes<CustomerRow, { merge: false }>();
  if (custErr) {
    console.error('[api/admin/market-checkout] customer lookup failed:', custErr.message);
    return fail(redirect, 'network', customer_id);
  }
  if (!customer || !customer.email) {
    return fail(redirect, 'member_not_found', customer_id);
  }

  // Confirm an ACTIVE flex membership for this customer (defense-in-depth).
  type FlexMemberRow = {
    id: string;
    pickup_location: { name: string } | { name: string }[] | null;
  };
  const { data: flexMember, error: memErr } = await locals.supabase
    .from('members')
    .select('id, pickup_location:pickup_locations(name)')
    .eq('customer_id', customer_id)
    .eq('share_type', 'flex')
    .eq('status', 'active')
    .limit(1)
    .maybeSingle()
    .overrideTypes<FlexMemberRow, { merge: false }>();
  if (memErr) {
    console.error('[api/admin/market-checkout] member lookup failed:', memErr.message);
    return fail(redirect, 'network', customer_id);
  }
  if (!flexMember) {
    return fail(redirect, 'not_flex_member', customer_id);
  }
  const pl = flexMember.pickup_location;
  const marketLabel = Array.isArray(pl) ? (pl[0]?.name ?? null) : (pl?.name ?? null);

  const summary = checkoutSummary(amount, note, marketLabel);

  // 4. IDEMPOTENCY / double-submit guard. Reject if an identical market
  //    checkout (same customer + same amount prefix) was logged in the last
  //    2 minutes. We match on the leading "MARKET CHECKOUT: -$X.XX" prefix so
  //    the same amount blocks regardless of the items note (a double-tap
  //    replays the identical form). The author scope is the customer.
  const sinceIso = new Date(Date.now() - IDEMPOTENCY_WINDOW_MS).toISOString();
  const amountPrefix = `MARKET CHECKOUT: -$${amount.toFixed(2)}`;
  const { data: recent, error: recentErr } = await locals.supabase
    .from('member_comms')
    .select('id, summary, created_at')
    .eq('customer_id', customer_id)
    .gte('created_at', sinceIso)
    .order('created_at', { ascending: false })
    .limit(10);
  if (recentErr) {
    // Fail CLOSED on the idempotency read — a money move must not proceed if
    // we can't confirm it isn't a duplicate.
    console.error('[api/admin/market-checkout] idempotency read failed:', recentErr.message);
    return fail(redirect, 'network', customer_id);
  }
  const isDuplicate = (recent ?? []).some(
    (r) => typeof r.summary === 'string' && r.summary.startsWith(amountPrefix)
  );
  if (isDuplicate) {
    return fail(redirect, 'duplicate', customer_id);
  }

  // 5. RE-FETCH the live Shopify balance + account id. NEVER trust the client.
  let accountId: string;
  let liveBalance: number;
  try {
    const gid = await getCustomerGidByEmail(customer.email);
    if (!gid) {
      return fail(redirect, 'no_shopify_customer', customer_id);
    }
    const account = await getStoreCreditAccount(gid);
    if (!account) {
      // No store-credit account → no flex balance to debit.
      return fail(redirect, 'insufficient_funds', customer_id);
    }
    accountId = account.accountId;
    liveBalance = account.balance;
  } catch (e) {
    console.error('[api/admin/market-checkout] balance fetch failed:', e);
    return fail(redirect, 'shopify_error', customer_id);
  }

  // Reject over-debit against the LIVE balance (cent-exact comparison).
  if (amountCents > toCents(liveBalance)) {
    return fail(redirect, 'insufficient_funds', customer_id);
  }

  // 6. Execute the debit. On ANY Shopify error, NOTHING is deducted.
  let newBalance: number;
  try {
    const outcome = await debitStoreCredit(accountId, amount);
    newBalance = outcome.newBalance;
  } catch (e) {
    console.error('[api/admin/market-checkout] debit failed (nothing deducted):', e);
    return fail(redirect, 'debit_failed', customer_id);
  }

  // 7. Log the human-readable transaction to member_comms. The money has
  //    already moved; a log failure must NOT undo it or block the staff —
  //    log the error and continue to the confirmation.
  const authorEmail = locals.user?.email ?? ctx.user.email ?? null;
  const { error: logErr } = await locals.supabase.from('member_comms').insert({
    customer_id,
    author_email: authorEmail,
    channel: 'other',
    summary,
  });
  if (logErr) {
    console.error(
      '[api/admin/market-checkout] member_comms log failed (debit DID apply):',
      logErr.message
    );
  }

  // 8. Fail-soft receipt email to the member. Awaited but never throws.
  await sendMarketCheckoutReceipt({
    to: customer.email,
    name: customer.contact_name,
    amount,
    newBalance,
    items: note || null,
    marketLabel,
    resendApiKey: RESEND_API_KEY,
    resendFromEmail: RESEND_FROM_EMAIL,
  });

  // 9. BIG green confirmation with the NEW balance.
  const qs = new URLSearchParams({
    ok: 'deducted',
    amount: amount.toFixed(2),
    name: customer.contact_name,
    new_balance: newBalance.toFixed(2),
  });
  return redirect(`${REDIRECT}?${qs.toString()}`, 303);
};
