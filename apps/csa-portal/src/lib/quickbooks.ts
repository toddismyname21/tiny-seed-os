/**
 * QuickBooks Online (Intuit) OAuth 2.0 + Accounting API — server-only.
 *
 * Farm bookkeeping integration. Todd connects once via /admin/quickbooks/connect
 * (→ Intuit authorize → /admin/quickbooks/callback), and the resulting tokens
 * are stored in `portal_settings` (qb_* keys) via the service-role client.
 * Thereafter the access token is auto-refreshed from the refresh token as needed.
 *
 * SECURITY: imports Intuit client secret via astro:env/server. NEVER import from
 * a client component. Tokens live in portal_settings (admin-only RLS; only the
 * service-role client reads/writes them). All functions fail SOFT with a typed
 * result rather than throwing raw secrets into logs.
 *
 * Intuit endpoints (same AUTH/TOKEN for sandbox + prod; only API base differs):
 *   AUTHORIZE:  https://appcenter.intuit.com/connect/oauth2
 *   TOKEN:      https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer
 *   REVOKE:     https://developer.api.intuit.com/v2/oauth2/tokens/revoke
 *   API (sbx):  https://sandbox-quickbooks.api.intuit.com/v3/company/{realmId}
 *   API (prod): https://quickbooks.api.intuit.com/v3/company/{realmId}
 */
import {
  QB_CLIENT_ID,
  QB_CLIENT_SECRET,
  QB_ENVIRONMENT,
  QB_REDIRECT_URI,
} from 'astro:env/server';
import { supabaseAdmin } from './supabase';

const AUTHORIZE_URL = 'https://appcenter.intuit.com/connect/oauth2';
const TOKEN_URL = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer';
const REVOKE_URL = 'https://developer.api.intuit.com/v2/oauth2/tokens/revoke';
const SCOPE = 'com.intuit.quickbooks.accounting';

/** True when the client id/secret/redirect are configured (env set in Vercel). */
export function quickbooksConfigured(): boolean {
  return Boolean(QB_CLIENT_ID && QB_CLIENT_SECRET && QB_REDIRECT_URI);
}

/** 'sandbox' (default) or 'production' — controls the API base URL only. */
export function qbEnvironment(): 'sandbox' | 'production' {
  return QB_ENVIRONMENT === 'production' ? 'production' : 'sandbox';
}

function apiBase(realmId: string): string {
  const host =
    qbEnvironment() === 'production'
      ? 'https://quickbooks.api.intuit.com'
      : 'https://sandbox-quickbooks.api.intuit.com';
  return `${host}/v3/company/${realmId}`;
}

/* ── portal_settings token store ─────────────────────────────────────────── */

const KEYS = {
  realm: 'qb_realm_id',
  access: 'qb_access_token',
  refresh: 'qb_refresh_token',
  expires: 'qb_token_expires_at', // ISO timestamp
  connectedAt: 'qb_connected_at',
  state: 'qb_oauth_state', // short-lived CSRF state during connect
} as const;

async function readSetting(key: string): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from('portal_settings')
    .select('value')
    .eq('key', key)
    .maybeSingle();
  if (error) {
    console.error(`[quickbooks] portal_settings read failed (${key}):`, error.message);
    return '';
  }
  return ((data as { value: string | null } | null)?.value ?? '').trim();
}

async function writeSetting(key: string, value: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('portal_settings')
    .upsert({ key, value }, { onConflict: 'key' });
  if (error) console.error(`[quickbooks] portal_settings write failed (${key}):`, error.message);
}

async function deleteSetting(key: string): Promise<void> {
  const { error } = await supabaseAdmin.from('portal_settings').delete().eq('key', key);
  if (error) console.error(`[quickbooks] portal_settings delete failed (${key}):`, error.message);
}

export interface QbConnection {
  connected: boolean;
  realmId: string;
  environment: 'sandbox' | 'production';
  connectedAt: string;
}

/** Current connection status (does NOT expose tokens). */
export async function getConnection(): Promise<QbConnection> {
  const [realmId, refresh, connectedAt] = await Promise.all([
    readSetting(KEYS.realm),
    readSetting(KEYS.refresh),
    readSetting(KEYS.connectedAt),
  ]);
  return {
    connected: Boolean(realmId && refresh),
    realmId,
    environment: qbEnvironment(),
    connectedAt,
  };
}

/* ── OAuth: authorize URL + CSRF state ───────────────────────────────────── */

/** Build the Intuit authorize URL and persist a one-time CSRF state. */
export async function buildAuthorizeUrl(): Promise<string> {
  const state = crypto.randomUUID();
  await writeSetting(KEYS.state, state);
  const params = new URLSearchParams({
    client_id: QB_CLIENT_ID as string,
    response_type: 'code',
    scope: SCOPE,
    redirect_uri: QB_REDIRECT_URI as string,
    state,
  });
  return `${AUTHORIZE_URL}?${params.toString()}`;
}

/** Verify + consume the CSRF state returned on the callback. */
export async function consumeState(state: string): Promise<boolean> {
  const stored = await readSetting(KEYS.state);
  await deleteSetting(KEYS.state);
  return Boolean(stored) && stored === state;
}

/* ── OAuth: token exchange, refresh, revoke ──────────────────────────────── */

function basicAuthHeader(): string {
  const raw = `${QB_CLIENT_ID}:${QB_CLIENT_SECRET}`;
  // btoa is available in the Vercel Node runtime; Buffer fallback for safety.
  const b64 =
    typeof btoa === 'function' ? btoa(raw) : Buffer.from(raw, 'utf8').toString('base64');
  return `Basic ${b64}`;
}

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number; // seconds
  token_type: string;
}

async function tokenRequest(body: URLSearchParams): Promise<TokenResponse> {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: basicAuthHeader(),
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });
  // Capture Intuit's transaction id (intuit_tid) for support/troubleshooting.
  const tid = res.headers.get('intuit_tid') ?? '';
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    console.error(`[quickbooks] token request failed HTTP ${res.status} (intuit_tid=${tid}): ${detail.slice(0, 300)}`);
    throw new Error(`token_request_failed HTTP ${res.status} (intuit_tid=${tid}): ${detail.slice(0, 300)}`);
  }
  return (await res.json()) as TokenResponse;
}

async function persistTokens(realmId: string, t: TokenResponse): Promise<void> {
  const expiresAt = new Date(Date.now() + (t.expires_in - 60) * 1000).toISOString();
  await Promise.all([
    writeSetting(KEYS.realm, realmId),
    writeSetting(KEYS.access, t.access_token),
    writeSetting(KEYS.refresh, t.refresh_token),
    writeSetting(KEYS.expires, expiresAt),
  ]);
}

/** Exchange an authorization code (from the callback) for tokens + store them. */
export async function exchangeCodeForTokens(code: string, realmId: string): Promise<void> {
  const t = await tokenRequest(
    new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: QB_REDIRECT_URI as string,
    })
  );
  await persistTokens(realmId, t);
  await writeSetting(KEYS.connectedAt, new Date().toISOString());
}

/** A valid access token, refreshing (and persisting) if expired/near-expiry. */
export async function getAccessToken(): Promise<string | null> {
  const [access, refresh, expires, realmId] = await Promise.all([
    readSetting(KEYS.access),
    readSetting(KEYS.refresh),
    readSetting(KEYS.expires),
    readSetting(KEYS.realm),
  ]);
  if (!refresh || !realmId) return null;
  const stillValid = access && expires && new Date(expires).getTime() > Date.now();
  if (stillValid) return access;
  // Refresh.
  try {
    const t = await tokenRequest(
      new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refresh })
    );
    await persistTokens(realmId, t);
    return t.access_token;
  } catch (e) {
    console.error('[quickbooks] token refresh failed:', e);
    return null;
  }
}

/** Revoke the refresh token at Intuit and clear stored tokens. */
export async function disconnect(): Promise<void> {
  const refresh = await readSetting(KEYS.refresh);
  if (refresh && quickbooksConfigured()) {
    try {
      await fetch(REVOKE_URL, {
        method: 'POST',
        headers: {
          Authorization: basicAuthHeader(),
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: refresh }),
      });
    } catch (e) {
      console.error('[quickbooks] revoke request failed (clearing local tokens anyway):', e);
    }
  }
  await Promise.all([
    deleteSetting(KEYS.realm),
    deleteSetting(KEYS.access),
    deleteSetting(KEYS.refresh),
    deleteSetting(KEYS.expires),
    deleteSetting(KEYS.connectedAt),
  ]);
}

/* ── Accounting API helper ───────────────────────────────────────────────── */

/**
 * Authenticated call to the QuickBooks Accounting API. Path is relative to the
 * company base, e.g. `/invoice` or `/query?query=...`. Returns parsed JSON.
 * Throws on non-2xx (caller decides how to surface). Auto-refreshes the token.
 */
export async function qbApi<T = unknown>(
  path: string,
  init: { method?: string; body?: unknown } = {}
): Promise<T> {
  const token = await getAccessToken();
  const realmId = await readSetting(KEYS.realm);
  if (!token || !realmId) throw new Error('quickbooks_not_connected');
  const res = await fetch(`${apiBase(realmId)}${path}`, {
    method: init.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
  // Capture Intuit's transaction id (intuit_tid) — Intuit support uses it to
  // trace a specific request when troubleshooting. Logged on every error.
  const tid = res.headers.get('intuit_tid') ?? '';
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    console.error(`[quickbooks] API ${init.method ?? 'GET'} ${path} failed HTTP ${res.status} (intuit_tid=${tid}): ${detail.slice(0, 400)}`);
    throw new Error(`qb_api ${res.status} (intuit_tid=${tid}): ${detail.slice(0, 400)}`);
  }
  return (await res.json()) as T;
}

/* ── Accounting: customers, items, invoices ──────────────────────────────
 * Minimal, idempotent building blocks for creating an invoice:
 *   findOrCreateCustomer → findOrCreateItem (per line) → createInvoice.
 * All use the SQL-like QuickBooks query API to avoid duplicates. Item creation
 * needs an income account, so we resolve the company's first Income account.
 * minorversion pins the API schema. */

const QB_MINOR = 73;

/** Escape a value for a QuickBooks query string literal. */
function qbEscape(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

/** Find a customer by exact DisplayName, or create one. Returns the QB Id. */
export async function findOrCreateCustomer(displayName: string): Promise<string> {
  const query = `select Id from Customer where DisplayName = '${qbEscape(displayName)}'`;
  const found = await qbApi<{ QueryResponse: { Customer?: Array<{ Id: string }> } }>(
    `/query?query=${encodeURIComponent(query)}&minorversion=${QB_MINOR}`
  );
  const existing = found.QueryResponse.Customer?.[0]?.Id;
  if (existing) return existing;
  const created = await qbApi<{ Customer: { Id: string } }>(
    `/customer?minorversion=${QB_MINOR}`,
    { method: 'POST', body: { DisplayName: displayName } }
  );
  return created.Customer.Id;
}

/** The Id of the company's first Income account — used to back new Items. */
async function defaultIncomeAccountId(): Promise<string> {
  const found = await qbApi<{ QueryResponse: { Account?: Array<{ Id: string }> } }>(
    `/query?query=${encodeURIComponent("select Id from Account where AccountType = 'Income' maxresults 5")}&minorversion=${QB_MINOR}`
  );
  const id = found.QueryResponse.Account?.[0]?.Id;
  if (!id) throw new Error('no_income_account_found');
  return id;
}

/** Find a Service Item by Name, or create it backed by an income account. */
export async function findOrCreateItem(name: string): Promise<string> {
  const query = `select Id from Item where Name = '${qbEscape(name)}'`;
  const found = await qbApi<{ QueryResponse: { Item?: Array<{ Id: string }> } }>(
    `/query?query=${encodeURIComponent(query)}&minorversion=${QB_MINOR}`
  );
  const existing = found.QueryResponse.Item?.[0]?.Id;
  if (existing) return existing;
  const incomeAccountId = await defaultIncomeAccountId();
  const created = await qbApi<{ Item: { Id: string } }>(
    `/item?minorversion=${QB_MINOR}`,
    { method: 'POST', body: { Name: name, Type: 'Service', IncomeAccountRef: { value: incomeAccountId } } }
  );
  return created.Item.Id;
}

/* ── Item lookup for BILLING (exact-match only) ───────────────────────────
 * findOrCreateItem above is fine for a caller that owns its own item names,
 * but it is the WRONG tool for invoicing farm produce: it would silently mint
 * a new QuickBooks Service item for every product spelling the portal has
 * ever used, polluting Todd's live chart of accounts.
 *
 * Wholesale invoicing therefore resolves items by EXACT normalised name
 * against the items that already exist, and falls back to one generic
 * catch-all item (with the real product name in the line Description) when
 * there is no exact match. Substring/fuzzy matching is deliberately NOT
 * implemented: it previously mapped "Kale (bunch)" onto "Curly Kale (12 ct)"
 * and "Cabbage (head)" onto "Cabbage (25# Bulk)", which would bill a chef for
 * a product they never received. A wrong item is worse than a generic one. */

/** Name of the generic catch-all Service item used for unmatched produce. */
export const QB_GENERIC_ITEM_NAME = 'Wholesale';

/**
 * Documented Id of that generic item in Todd's connected realm (verified
 * 2026-08-16). Only used if the by-name lookup comes back empty — the name
 * lookup is authoritative so this constant can never point the wrong way in a
 * different realm without also failing the name match.
 */
export const QB_GENERIC_ITEM_ID = '513';

export interface QbItemSummary {
  id: string;
  name: string;
  fullyQualifiedName: string | null;
  active: boolean;
}

/**
 * Normalise an item/product name to a comparison key: lower-case, alphanumeric
 * only. "Kale (bunch)" → "kalebunch". Punctuation, spacing and case drift
 * between the portal catalog and QuickBooks are noise; anything else is a
 * genuinely different product.
 */
export function normalizeItemName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Every Item in the connected company, paged through the query API (QuickBooks
 * caps a page at 1000). Inactive items are returned too so the caller can
 * decide; buildItemIndex() indexes only active ones.
 */
export async function listItems(): Promise<QbItemSummary[]> {
  const PAGE = 1000;
  const out: QbItemSummary[] = [];
  for (let start = 1; ; start += PAGE) {
    const query = `select Id, Name, FullyQualifiedName, Active from Item startposition ${start} maxresults ${PAGE}`;
    const res = await qbApi<{
      QueryResponse: {
        Item?: Array<{
          Id: string;
          Name: string;
          FullyQualifiedName?: string | null;
          Active?: boolean;
        }>;
      };
    }>(`/query?query=${encodeURIComponent(query)}&minorversion=${QB_MINOR}`);
    const page = res.QueryResponse.Item ?? [];
    for (const i of page) {
      out.push({
        id: i.Id,
        name: i.Name,
        fullyQualifiedName: i.FullyQualifiedName ?? null,
        active: i.Active !== false,
      });
    }
    if (page.length < PAGE) break;
    // Defensive ceiling — a realm with >20k items would mean something is very
    // wrong, and an unbounded loop against a paid API is not acceptable.
    if (out.length >= 20_000) break;
  }
  return out;
}

export interface QbItemIndex {
  /** normalised name (and normalised sub-item leaf) → QuickBooks Item Id. */
  byName: Map<string, string>;
  /** Id of the generic catch-all item unmatched lines are billed against. */
  genericItemId: string;
}

/**
 * Build the exact-match index used by wholesale invoicing. A sub-item's
 * FullyQualifiedName ("Produce:Kale (bunch)") is indexed under BOTH the full
 * path and its leaf, because the portal only ever knows the leaf. First writer
 * wins, so a plain top-level item is never shadowed by a deeper sub-item.
 */
export async function buildItemIndex(): Promise<QbItemIndex> {
  const items = (await listItems()).filter((i) => i.active);
  const byName = new Map<string, string>();
  const put = (key: string, id: string) => {
    if (key && !byName.has(key)) byName.set(key, id);
  };
  for (const i of items) put(normalizeItemName(i.name), i.id);
  for (const i of items) {
    const fq = i.fullyQualifiedName;
    if (!fq) continue;
    put(normalizeItemName(fq), i.id);
    const leaf = fq.split(':').pop() ?? '';
    put(normalizeItemName(leaf), i.id);
  }
  return {
    byName,
    genericItemId: byName.get(normalizeItemName(QB_GENERIC_ITEM_NAME)) ?? QB_GENERIC_ITEM_ID,
  };
}

/**
 * Resolve one product name to a QuickBooks Item Id. `matched:false` means the
 * line fell back to the generic item and the caller MUST carry the real
 * product name in the line Description.
 */
export function resolveItemId(
  index: QbItemIndex,
  productName: string
): { itemId: string; matched: boolean } {
  const id = index.byName.get(normalizeItemName(productName));
  return id ? { itemId: id, matched: true } : { itemId: index.genericItemId, matched: false };
}

/**
 * Find a customer by EXACT DisplayName. Returns null when there is no such
 * customer — unlike findOrCreateCustomer this NEVER creates one, because a
 * near-miss name would split a restaurant's ledger across two QuickBooks
 * customers and silently corrupt the books. Billing callers use this and
 * surface an actionable error instead.
 */
export async function findCustomerByName(displayName: string): Promise<string | null> {
  const query = `select Id from Customer where DisplayName = '${qbEscape(displayName.trim())}'`;
  const found = await qbApi<{ QueryResponse: { Customer?: Array<{ Id: string }> } }>(
    `/query?query=${encodeURIComponent(query)}&minorversion=${QB_MINOR}`
  );
  return found.QueryResponse.Customer?.[0]?.Id ?? null;
}

export interface InvoiceLineInput {
  item: string;        // QB Item name (find-or-created when itemId is absent)
  /** Pre-resolved QuickBooks Item Id. When set, NO find-or-create happens —
   *  this is how wholesale invoicing avoids minting items for produce names. */
  itemId?: string;
  description?: string;
  qty: number;
  unitPrice: number;   // dollars per unit
}

export interface CreateInvoiceInput {
  customerName: string;
  lines: InvoiceLineInput[];
  /** Customer-facing memo — a good place for a reference like a Sales Order #. */
  memo?: string;
  /** Optional invoice number override (else QuickBooks auto-numbers). */
  docNumber?: string;
  /** Optional email to set on the invoice for later sending. */
  billEmail?: string;
  /** Pre-resolved QuickBooks Customer Id. When set, NO find-or-create runs. */
  customerId?: string;
  /** Invoice date, YYYY-MM-DD. Defaults to today in QuickBooks when omitted. */
  txnDate?: string;
  /** INTERNAL note (never shown to the customer) — traceability back to us. */
  privateNote?: string;
}

export interface CreatedInvoice {
  id: string;
  docNumber: string;
  total: number;
}

/**
 * Create an invoice in QuickBooks: resolve the customer (pre-resolved
 * `customerId` wins, else find-or-create by name), resolve each line Item
 * (pre-resolved `itemId` wins, else find-or-create by name), then POST the
 * invoice. Amounts are computed qty × unitPrice.
 * Returns the new invoice's Id, DocNumber, and total.
 *
 * This CREATES the invoice only. It never emails or "sends" it — there is no
 * /invoice/{id}/send call in this module, deliberately: Todd reviews and sends
 * every invoice from QuickBooks himself.
 */
export async function createInvoice(input: CreateInvoiceInput): Promise<CreatedInvoice> {
  const customerId = input.customerId ?? (await findOrCreateCustomer(input.customerName));
  const Line = [];
  for (const l of input.lines) {
    const itemId = l.itemId ?? (await findOrCreateItem(l.item));
    Line.push({
      DetailType: 'SalesItemLineDetail',
      Amount: Math.round(l.qty * l.unitPrice * 100) / 100,
      Description: l.description ?? l.item,
      SalesItemLineDetail: {
        ItemRef: { value: itemId },
        Qty: l.qty,
        UnitPrice: l.unitPrice,
      },
    });
  }
  const body: Record<string, unknown> = { CustomerRef: { value: customerId }, Line };
  if (input.memo) body.CustomerMemo = { value: input.memo };
  if (input.docNumber) body.DocNumber = input.docNumber;
  if (input.billEmail) body.BillEmail = { Address: input.billEmail };
  if (input.txnDate) body.TxnDate = input.txnDate;
  if (input.privateNote) body.PrivateNote = input.privateNote;

  const res = await qbApi<{ Invoice: { Id: string; DocNumber: string; TotalAmt: number } }>(
    `/invoice?minorversion=${QB_MINOR}`,
    { method: 'POST', body }
  );
  return { id: res.Invoice.Id, docNumber: res.Invoice.DocNumber, total: res.Invoice.TotalAmt };
}

/* ── Accounting: vendors, bills, purchases ────────────────────────────────
 * Building blocks for the nightly vendor-invoice → Bills cron
 * (/api/cron/vendor-bills). These are ACCOUNTS-PAYABLE reads/writes only:
 * findOrCreateVendor, queryVendorBills (dedupe), queryVendorPurchases (paid
 * check), and createBill. There is intentionally NO BillPayment/payment
 * helper anywhere in this module — the cron enters a Bill and never moves
 * money. All use the SQL-like QuickBooks query API. */

export interface QbVendorMatch {
  Id: string;
  DisplayName: string;
}

/** Legal-entity suffixes stripped when computing a vendor's "core" tokens. */
const VENDOR_SUFFIXES = new Set([
  'llc', 'l.l.c', 'inc', 'inc.', 'incorporated', 'co', 'co.', 'company',
  'corp', 'corp.', 'ltd', 'ltd.', 'llp', 'pllc', 'pc', 'lp', 'dba',
]);

/**
 * Normalize a vendor name to its significant lower-case word tokens: drop
 * punctuation and trailing legal suffixes (LLC, Inc, Co, …). So
 * "Goat Rodeo Farm & Dairy, LLC" and "Goat Rodeo Farm & Dairy LLC" both →
 * ["goat","rodeo","farm","dairy"]. This is what makes the dedupe robust to the
 * comma/suffix/"Roasters"-vs-"Coffee" drift between an email's stated vendor
 * and the QB DisplayName.
 */
function vendorCoreTokens(name: string): string[] {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ') // punctuation → space (drops &, commas, dots)
    .split(/\s+/)
    .filter((w) => w.length > 0 && !VENDOR_SUFFIXES.has(w));
}

/**
 * Find EXISTING QuickBooks vendors that plausibly match `name`, robust to
 * punctuation / legal-suffix / word-order drift. Strategy:
 *   1. Query QB for vendors whose DisplayName contains the FIRST significant
 *      token (e.g. "goat", "redhawk", "bounty") — a cheap server-side net.
 *   2. In JS, keep only those whose core tokens OVERLAP the input's core
 *      tokens on the leading words (all input core tokens except possibly a
 *      trailing generic like "farm"/"dairy" must be present, OR the first two
 *      significant tokens match). This prevents "Goat" from matching an
 *      unrelated "Goat Yoga" while still catching the comma/suffix variants.
 * Returns every surviving match so the caller can dedupe against any of the
 * vendor's spelling variants. Empty array if none.
 */
export async function findVendorsByNameLike(name: string): Promise<QbVendorMatch[]> {
  const coreTokens = vendorCoreTokens(name);
  if (coreTokens.length === 0) return [];

  // Server-side net: search on the first significant token.
  const anchor = coreTokens[0];
  const query = `select Id, DisplayName from Vendor where DisplayName like '%${qbEscape(anchor)}%' maxresults 100`;
  const found = await qbApi<{ QueryResponse: { Vendor?: QbVendorMatch[] } }>(
    `/query?query=${encodeURIComponent(query)}&minorversion=${QB_MINOR}`
  );
  const candidates = found.QueryResponse.Vendor ?? [];

  // Precompute the input's leading-two significant tokens for the strict test.
  const inLead2 = coreTokens.slice(0, 2).join(' ');

  return candidates.filter((v) => {
    const vTokens = vendorCoreTokens(v.DisplayName);
    if (vTokens.length === 0) return false;
    const vSet = new Set(vTokens);
    // Strong signal A: leading TWO significant tokens match (order-preserving).
    const vLead2 = vTokens.slice(0, 2).join(' ');
    if (inLead2.length > 0 && inLead2 === vLead2) return true;
    // Strong signal B: every input core token is present in the vendor's core
    // tokens (handles "Redhawk Coffee Roasters" ⊇-ish "Redhawk Coffee" only in
    // the reverse direction, so we also check the reverse containment).
    const inAllInV = coreTokens.every((t) => vSet.has(t));
    const inSet = new Set(coreTokens);
    const vAllInIn = vTokens.every((t) => inSet.has(t));
    return inAllInV || vAllInIn;
  });
}

/**
 * Find a vendor by EXACT DisplayName, or create one. Returns the QB Id +
 * DisplayName. Exact-match-first avoids attaching a bill to a fuzzy near-name
 * vendor; creation is only reached when no exact name exists.
 */
export async function findOrCreateVendor(displayName: string): Promise<QbVendorMatch> {
  const clean = displayName.trim();
  const query = `select Id, DisplayName from Vendor where DisplayName = '${qbEscape(clean)}'`;
  const found = await qbApi<{ QueryResponse: { Vendor?: QbVendorMatch[] } }>(
    `/query?query=${encodeURIComponent(query)}&minorversion=${QB_MINOR}`
  );
  const existing = found.QueryResponse.Vendor?.[0];
  if (existing) return existing;
  const created = await qbApi<{ Vendor: QbVendorMatch }>(
    `/vendor?minorversion=${QB_MINOR}`,
    { method: 'POST', body: { DisplayName: clean } }
  );
  return created.Vendor;
}

export interface QbBillSummary {
  Id: string;
  DocNumber: string | null;
  TotalAmt: number;
  TxnDate: string;
  vendorId: string;
}

/**
 * All Bills for a specific vendor Id (most recent first). Used by the cron's
 * duplicate check: same vendor + same DocNumber OR same amount within a
 * window ⇒ already entered. QuickBooks has no `like` on numeric/date columns
 * here, so we pull the vendor's recent bills and filter in JS.
 */
export async function queryVendorBills(vendorId: string, maxResults = 50): Promise<QbBillSummary[]> {
  const query = `select Id, DocNumber, TotalAmt, TxnDate, VendorRef from Bill where VendorRef = '${qbEscape(vendorId)}' order by TxnDate desc maxresults ${Math.max(1, Math.min(1000, maxResults))}`;
  const found = await qbApi<{
    QueryResponse: {
      Bill?: Array<{
        Id: string;
        DocNumber?: string | null;
        TotalAmt: number;
        TxnDate: string;
        VendorRef?: { value: string };
      }>;
    };
  }>(`/query?query=${encodeURIComponent(query)}&minorversion=${QB_MINOR}`);
  return (found.QueryResponse.Bill ?? []).map((b) => ({
    Id: b.Id,
    DocNumber: b.DocNumber ?? null,
    TotalAmt: b.TotalAmt,
    TxnDate: b.TxnDate,
    vendorId: b.VendorRef?.value ?? vendorId,
  }));
}

export interface QbPurchaseSummary {
  Id: string;
  TotalAmt: number;
  TxnDate: string;
  entityName: string | null;
  privateNote: string | null;
  lineAmounts: number[];
}

/**
 * Recent Purchase transactions (card/ACH spends from the connected bank feed)
 * on or after `sinceDate` (YYYY-MM-DD). Used by the cron's paid check: a
 * matching EntityRef name OR a line/total amount equal to the invoice amount
 * ⇒ the invoice was likely paid directly on a card and should NOT be
 * re-entered as a Bill. Amounts are returned for the caller to compare with a
 * tolerance.
 */
export async function queryVendorPurchases(sinceDate: string, maxResults = 200): Promise<QbPurchaseSummary[]> {
  const query = `select Id, TotalAmt, TxnDate, EntityRef, PrivateNote, Line from Purchase where TxnDate >= '${qbEscape(sinceDate)}' order by TxnDate desc maxresults ${Math.max(1, Math.min(1000, maxResults))}`;
  const found = await qbApi<{
    QueryResponse: {
      Purchase?: Array<{
        Id: string;
        TotalAmt: number;
        TxnDate: string;
        EntityRef?: { name?: string | null };
        PrivateNote?: string | null;
        Line?: Array<{ Amount?: number }>;
      }>;
    };
  }>(`/query?query=${encodeURIComponent(query)}&minorversion=${QB_MINOR}`);
  return (found.QueryResponse.Purchase ?? []).map((p) => ({
    Id: p.Id,
    TotalAmt: p.TotalAmt,
    TxnDate: p.TxnDate,
    entityName: p.EntityRef?.name ?? null,
    privateNote: p.PrivateNote ?? null,
    lineAmounts: (p.Line ?? []).map((l) => l.Amount ?? 0).filter((n) => n > 0),
  }));
}

export interface CreateBillInput {
  vendorId: string;
  /** Expense account Id to book the whole bill against. */
  accountId: string;
  amount: number;
  txnDate: string; // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD
  docNumber?: string | null;
  privateNote?: string;
}

export interface CreatedBill {
  id: string;
  docNumber: string | null;
  total: number;
}

/**
 * Create a Bill (accounts payable) in QuickBooks with ONE
 * AccountBasedExpenseLineDetail line. This records that money is OWED — it is
 * NOT a payment. There is no BillPayment call here or anywhere in this module.
 */
export async function createBill(input: CreateBillInput): Promise<CreatedBill> {
  const amount = Math.round(input.amount * 100) / 100;
  const body: Record<string, unknown> = {
    VendorRef: { value: input.vendorId },
    TxnDate: input.txnDate,
    DueDate: input.dueDate,
    Line: [
      {
        DetailType: 'AccountBasedExpenseLineDetail',
        Amount: amount,
        AccountBasedExpenseLineDetail: {
          AccountRef: { value: input.accountId },
        },
      },
    ],
  };
  if (input.docNumber) body.DocNumber = input.docNumber;
  if (input.privateNote) body.PrivateNote = input.privateNote;

  const res = await qbApi<{ Bill: { Id: string; DocNumber?: string | null; TotalAmt: number } }>(
    `/bill?minorversion=${QB_MINOR}`,
    { method: 'POST', body }
  );
  return { id: res.Bill.Id, docNumber: res.Bill.DocNumber ?? null, total: res.Bill.TotalAmt };
}
