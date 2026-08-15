/**
 * GET|POST /api/cron/vendor-bills   (cron-triggered, NOT user-facing)
 *
 * Nightly (06:00 ET / 10:00 UTC) automation: scan Todd's inbox for new vendor
 * invoices, parse each with Claude, and enter the UNPAID, low-value,
 * high-confidence ones as Bills in QuickBooks (production). Then email Todd a
 * digest of everything it did.
 *
 * ── HARD SAFETY INVARIANTS (non-negotiable) ────────────────────────────────
 *   • BILL ENTRY ONLY. This endpoint NEVER moves money. There is no
 *     BillPayment / payment API call anywhere in this file or in the QB helpers
 *     it uses. A Bill records that money is OWED; a human still pays it in QBO.
 *   • CAP: never auto-enter a bill >= $500. Anything >= $500 (or not
 *     high-confidence) is flagged for human review and NOT entered.
 *   • AUTH: requires the CRON_SECRET bearer — no public access.
 *   • No card/bank numbers are ever logged or emailed (we only handle
 *     vendor/amount/invoice metadata; the raw email body is sent to Claude for
 *     parsing but never persisted or echoed back to the digest).
 *
 * ── PIPELINE ───────────────────────────────────────────────────────────────
 *   1. IMAP-fetch INBOX messages from the last N days (default 3; ?days= for
 *      backfill/testing, capped at 90).
 *   2. Prefilter on subject/from (invoice-ish keywords) + HARD SKIPS for our
 *      own domains, receivables notifications, auto-paid subscription receipts,
 *      and newsletters.
 *   3. Dedupe against vendor_invoice_log by gmail_message_id (the IMAP UID +
 *      mailbox UIDVALIDITY, stable per message).
 *   4. Parse each candidate (email text + PDF attachments) with Claude
 *      (claude-sonnet-4-6) → strict JSON.
 *   5. QuickBooks checks: duplicate (same vendor + DocNumber OR amount within
 *      60 days) and paid (a Purchase in the last 60 days matching the vendor or
 *      the amount — the bank feed surfaces card/ACH spends as Purchases).
 *   6. Entry rules: amount < $500 AND confidence=high AND not already paid AND
 *      payable-by-us ⇒ create Bill. Else ⇒ flag for review, never enter.
 *   7. Log every candidate to vendor_invoice_log with its disposition.
 *   8. Digest: one summary email to Todd if anything actionable happened.
 *
 * FAIL-SOFT: an IMAP outage, a bad PDF, a Claude error, or a QuickBooks hiccup
 * on ONE message must not abort the run or 500 the endpoint. Per-message
 * failures are caught and logged as flagged_review; the endpoint returns a
 * 200 JSON summary.
 *
 * Auth: same `Authorization: Bearer <CRON_SECRET>` pattern as
 * /api/cron/nightly-health.
 */
import type { APIRoute } from 'astro';
import {
  CRON_SECRET,
  IMAP_TODD_USER,
  IMAP_TODD_APP_PASSWORD,
  ANTHROPIC_API_KEY,
  RESEND_API_KEY,
  RESEND_FROM_EMAIL,
} from 'astro:env/server';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { supabaseAdmin } from '../../../lib/supabase';
import {
  nudgeTargetWeek, getPublishedAt, draftPublishState,
} from '../../../lib/flex-draft';
import { prettyWeek } from '../../../lib/flex-order';
import {
  quickbooksConfigured,
  getConnection,
  findVendorsByNameLike,
  findOrCreateVendor,
  queryVendorBills,
  queryVendorPurchases,
  createBill,
  type QbBillSummary,
} from '../../../lib/quickbooks';

export const prerender = false;

/** Digest destination — operational, hardcoded (mirrors nightly-health). */
const DIGEST_TO = 'todd@tinyseedfarmpgh.com';

/** Anthropic model + endpoint for invoice parsing. */
const ANTHROPIC_MODEL = 'claude-sonnet-4-6';
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';

/** Hard cap: never auto-enter a bill at or above this. */
const AUTO_ENTER_MAX = 500;

/** Windows for the QB dedupe/paid checks. */
const DUP_AMOUNT_WINDOW_DAYS = 60;
const PAID_LOOKBACK_DAYS = 60;

/** Amount tolerance for "same amount" comparisons (cents-rounding safe). */
const AMOUNT_TOL = 0.01;

type Action =
  | 'entered'
  | 'flagged_review'
  | 'skipped_duplicate'
  | 'skipped_paid'
  | 'skipped_not_payable';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

function checkAuth(request: Request): Response | null {
  const expected = CRON_SECRET;
  if (!expected) {
    return jsonResponse({ ok: false, error: 'cron_secret_not_configured' }, 500);
  }
  const header = request.headers.get('authorization') ?? '';
  const m = /^Bearer\s+(.+)$/i.exec(header);
  const provided = m?.[1]?.trim() ?? '';
  if (provided.length === 0 || provided !== expected) {
    return jsonResponse({ ok: false, error: 'unauthorized' }, 401);
  }
  return null;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ──────────────────────────────────────────────────────────────────────────
 * PREFILTER
 * ────────────────────────────────────────────────────────────────────────── */

/** Subject/from must look invoice-ish to even be a candidate. */
const INVOICE_HINT =
  /invoice|bill|billing|statement|payment due|past due|amount due|balance due|overdue|remit/i;

/**
 * HARD SKIP predicate — a message that matches ANY of these is NEVER processed
 * (not parsed, not logged, not entered). These are receivables notifications,
 * our own outbound mail, auto-paid subscription receipts, and newsletters —
 * none of which are payables-by-Tiny-Seed.
 */
function isHardSkip(fromAddr: string, subject: string): { skip: boolean; reason: string } {
  const from = fromAddr.toLowerCase();
  const subj = subject.toLowerCase();

  // Our own domains — anything Tiny Seed sent (receipts we issued, internal).
  if (/@(?:[\w.-]*\.)?tinyseedfarm\.com|@(?:[\w.-]*\.)?tinyseedfarmpgh\.com/.test(from)) {
    return { skip: true, reason: 'own_domain' };
  }

  // QuickBooks notifications about OUR receivables (invoices we sent / payments
  // received) — not something we owe.
  if (
    from.includes('quickbooks@notification.intuit.com') &&
    (subj.includes('from tiny seed farm') || subj.includes('payment received'))
  ) {
    return { skip: true, reason: 'qb_receivable_notification' };
  }

  // Bill.com notifications about people paying US / financing offers — not payables.
  if (
    from.includes('inform.bill.com') &&
    (subj.includes('received your invoice') ||
      subj.includes('paid you') ||
      subj.includes('financing'))
  ) {
    return { skip: true, reason: 'billcom_receivable' };
  }

  // Subscription receipts that are ALREADY auto-charged to a card — entering a
  // bill would double-count. (Anthropic, Resend, Google, Apple.)
  if (
    /@(?:[\w.-]*\.)?anthropic\.com|@(?:[\w.-]*\.)?resend\.com|@(?:[\w.-]*\.)?google\.com|@(?:[\w.-]*\.)?apple\.com/.test(
      from
    )
  ) {
    return { skip: true, reason: 'auto_paid_subscription' };
  }

  // Newsletters / non-payable senders.
  if (/nytimes\.com|youngfarmers\.org|substack\.com|mailchimp|constantcontact/.test(from)) {
    return { skip: true, reason: 'newsletter' };
  }

  return { skip: false, reason: '' };
}

/* ──────────────────────────────────────────────────────────────────────────
 * IMAP FETCH
 * ────────────────────────────────────────────────────────────────────────── */

interface RawCandidate {
  /** Stable per-message id: `<uidvalidity>-<uid>`. */
  gmailMessageId: string;
  fromAddr: string;
  subject: string;
  emailDate: Date | null;
  textBody: string;
  /** PDF attachments as base64 for Claude document blocks. */
  pdfs: Array<{ filename: string; base64: string }>;
}

/**
 * Connect to imap.gmail.com over SSL, open INBOX, and return every message
 * newer than `sinceDate` that survives the prefilter, fully parsed (clean text
 * body + any PDF attachments). Skips are applied here so we never even parse
 * hard-skip mail. The IMAP connection is always logged out in `finally`.
 */
async function fetchInboxCandidates(
  sinceDate: Date,
  skipTally: Record<string, number>,
  alreadyLogged: Set<string>,
  maxCandidates: number,
  fetchDeadline: number
): Promise<RawCandidate[]> {
  const client = new ImapFlow({
    host: 'imap.gmail.com',
    port: 993,
    secure: true,
    auth: { user: IMAP_TODD_USER as string, pass: IMAP_TODD_APP_PASSWORD as string },
    logger: false,
  });

  const out: RawCandidate[] = [];
  await client.connect();
  try {
    const lock = await client.getMailboxLock('INBOX');
    let uidValidity = '0';
    try {
      const mailbox = client.mailbox;
      if (mailbox && typeof mailbox !== 'boolean') {
        uidValidity = String(mailbox.uidValidity ?? '0');
      }

      // SINCE is date-granular on the server; we re-check the parsed Date below.
      const uids = await client.search({ since: sinceDate }, { uid: true });
      // Newest first so a capped chunk always makes forward progress: we stop
      // after `maxCandidates` fresh survivors, and dedup-on-log ensures the
      // NEXT call moves on to the older ones. Ascending UID ≈ chronological.
      const uidList = (Array.isArray(uids) ? uids : []).slice().sort((a, b) => b - a);

      for (const uid of uidList) {
        // Stop downloading once we have enough fresh candidates for this call —
        // the download + MIME parse is the expensive part, so we cap it HERE
        // (not just at the Claude-processing stage) to stay under the function
        // time ceiling on wide backfill windows.
        if (out.length >= maxCandidates) break;
        // Hard fetch deadline: never let the download/parse phase eat the whole
        // function budget — leave time for the Claude+QB processing phase.
        if (Date.now() > fetchDeadline) break;

        // Cheap log-dedup BEFORE any body download: skip messages we've already
        // dispositioned in a prior run.
        const messageId = `${uidValidity}-${uid}`;
        if (alreadyLogged.has(messageId)) continue;

        // Pull envelope first so we can prefilter WITHOUT downloading the body.
        let envFrom = '';
        let envSubject = '';
        let envDate: Date | null = null;
        try {
          const msg = await client.fetchOne(
            String(uid),
            { uid: true, envelope: true },
            { uid: true }
          );
          if (msg && typeof msg !== 'boolean' && msg.envelope) {
            const e = msg.envelope;
            envSubject = e.subject ?? '';
            envDate = e.date ? new Date(e.date) : null;
            const f = e.from?.[0];
            envFrom = f?.address ?? '';
          }
        } catch {
          continue; // couldn't read envelope — skip this uid
        }

        // Prefilter 1: invoice-ish hint on subject or from.
        if (!INVOICE_HINT.test(envSubject) && !INVOICE_HINT.test(envFrom)) {
          continue;
        }

        // Prefilter 2: hard skips.
        const hs = isHardSkip(envFrom, envSubject);
        if (hs.skip) {
          skipTally[hs.reason] = (skipTally[hs.reason] ?? 0) + 1;
          continue;
        }

        // Survivor — download the full source and parse text + PDF attachments.
        let source: Buffer | null = null;
        try {
          const dl = await client.download(String(uid), undefined, { uid: true });
          if (dl && dl.content) {
            const chunks: Buffer[] = [];
            for await (const c of dl.content) {
              chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c));
            }
            source = Buffer.concat(chunks);
          }
        } catch {
          source = null;
        }
        if (!source) continue;

        let textBody = '';
        const pdfs: Array<{ filename: string; base64: string }> = [];
        try {
          const parsed = await simpleParser(source);
          textBody = (parsed.text ?? '').trim();
          if (!textBody && parsed.html) {
            textBody = parsed.html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
          }
          for (const att of parsed.attachments ?? []) {
            const ct = (att.contentType ?? '').toLowerCase();
            const fn = (att.filename ?? '').toLowerCase();
            if (ct === 'application/pdf' || fn.endsWith('.pdf')) {
              // Cap each PDF at ~4.5MB to stay within Anthropic doc limits.
              if (att.content && att.content.length <= 4_500_000) {
                pdfs.push({
                  filename: att.filename ?? 'invoice.pdf',
                  base64: att.content.toString('base64'),
                });
              }
            }
          }
        } catch {
          // Unparseable MIME — skip, next run may re-see it if still in window.
          continue;
        }

        out.push({
          gmailMessageId: messageId,
          fromAddr: envFrom,
          subject: envSubject,
          emailDate: envDate,
          textBody: textBody.slice(0, 20_000), // bound prompt size
          pdfs,
        });
      }
    } finally {
      lock.release();
    }
  } finally {
    try {
      await client.logout();
    } catch {
      /* best-effort */
    }
  }
  return out;
}

/* ──────────────────────────────────────────────────────────────────────────
 * CLAUDE PARSE
 * ────────────────────────────────────────────────────────────────────────── */

interface ParsedInvoice {
  is_payable_by_tiny_seed: boolean;
  vendor: string;
  invoice_number: string | null;
  amount: number | null;
  due_date: string | null;
  appears_already_paid: boolean;
  paid_evidence: string | null;
  confidence: 'high' | 'medium' | 'low';
}

const PARSE_SYSTEM = [
  'You are an accounts-payable clerk for Tiny Seed Farm, a small vegetable + flower farm in Pittsburgh, PA.',
  'You are given the text of ONE email and optionally its PDF attachments.',
  'Decide whether this is a VENDOR INVOICE that Tiny Seed Farm must PAY, and extract its fields.',
  '',
  'An invoice is payable-by-Tiny-Seed ONLY IF Tiny Seed Farm (or Todd Wilson) is the CUSTOMER being billed —',
  'i.e. a supplier is charging US for goods/services. If Tiny Seed is the SELLER/vendor on the document, or the',
  'email is a receipt-we-issued, a payment WE received, a newsletter, a statement of OUR receivables, a shipping',
  'notice, or marketing, then is_payable_by_tiny_seed = false.',
  '',
  'appears_already_paid = true when the document itself shows the balance is settled: it says "PAID", shows a',
  'payment/deposit covering the total, a $0 balance due, or notes a payment (e.g. "paid $X on <date>"). Put the',
  'exact evidence phrase in paid_evidence.',
  '',
  'confidence reflects how sure you are of the amount + that this is a real payable invoice: "high" only when the',
  'total owed and vendor are unambiguous. Use "low"/"medium" for statements, ambiguous receipts, or unclear totals.',
  '',
  'amount is the TOTAL AMOUNT DUE in US dollars as a number (no currency symbol, no commas). due_date is ISO',
  'YYYY-MM-DD or null. invoice_number is the vendor\'s invoice/bill number or null.',
  '',
  'Respond with ONLY a JSON object, no prose, no markdown fences:',
  '{"is_payable_by_tiny_seed": bool, "vendor": string, "invoice_number": string|null, "amount": number|null,',
  ' "due_date": "YYYY-MM-DD"|null, "appears_already_paid": bool, "paid_evidence": string|null,',
  ' "confidence": "high"|"medium"|"low"}',
].join('\n');

/** Content block union we send to Anthropic (text + document). */
type AnthropicBlock =
  | { type: 'text'; text: string }
  | {
      type: 'document';
      source: { type: 'base64'; media_type: 'application/pdf'; data: string };
    };

/**
 * Parse ONE candidate with Claude. Returns a ParsedInvoice, or null on any
 * API/JSON failure (caller treats null as flagged_review — never auto-enters
 * on an unparseable response).
 */
async function parseWithClaude(c: RawCandidate): Promise<ParsedInvoice | null> {
  const blocks: AnthropicBlock[] = [];
  blocks.push({
    type: 'text',
    text:
      `Email from: ${c.fromAddr}\n` +
      `Subject: ${c.subject}\n` +
      `Date: ${c.emailDate ? c.emailDate.toISOString() : 'unknown'}\n\n` +
      `--- EMAIL BODY ---\n${c.textBody || '(no text body)'}\n--- END EMAIL BODY ---\n\n` +
      (c.pdfs.length
        ? `The following ${c.pdfs.length} PDF attachment(s) are the invoice document(s).`
        : 'There are no PDF attachments; parse from the email body.'),
  });
  // Attach up to 3 PDFs to bound payload size.
  for (const p of c.pdfs.slice(0, 3)) {
    blocks.push({
      type: 'document',
      source: { type: 'base64', media_type: 'application/pdf', data: p.base64 },
    });
  }

  let resp: Response;
  // Per-call timeout so one slow parse can't blow the function's time budget —
  // an aborted call is treated as a parse failure (⇒ flagged_review upstream).
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), 25_000);
  try {
    resp = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY as string,
        'anthropic-version': ANTHROPIC_VERSION,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 512,
        system: PARSE_SYSTEM,
        messages: [{ role: 'user', content: blocks }],
      }),
      signal: ctrl.signal,
    });
  } catch (e) {
    console.error('[vendor-bills] anthropic fetch threw:', e instanceof Error ? e.message : String(e));
    return null;
  } finally {
    clearTimeout(to);
  }

  if (!resp.ok) {
    const detail = await resp.text().catch(() => '');
    console.error(`[vendor-bills] anthropic HTTP ${resp.status}: ${detail.slice(0, 300)}`);
    return null;
  }

  let text = '';
  try {
    const data = (await resp.json()) as { content?: Array<{ type: string; text?: string }> };
    text = (data.content ?? [])
      .filter((b) => b.type === 'text')
      .map((b) => b.text ?? '')
      .join('')
      .trim();
  } catch {
    return null;
  }

  // Strip any accidental markdown fence, then isolate the JSON object.
  const cleaned = text.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start < 0 || end <= start) return null;

  let raw: unknown;
  try {
    raw = JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return null;
  }
  const o = raw as Record<string, unknown>;

  const conf = String(o.confidence ?? '').toLowerCase();
  const confidence: ParsedInvoice['confidence'] =
    conf === 'high' ? 'high' : conf === 'medium' ? 'medium' : 'low';

  let amount: number | null = null;
  if (typeof o.amount === 'number' && Number.isFinite(o.amount)) amount = o.amount;
  else if (typeof o.amount === 'string') {
    const n = Number(o.amount.replace(/[^0-9.]/g, ''));
    amount = Number.isFinite(n) && n > 0 ? n : null;
  }

  const dueRaw = typeof o.due_date === 'string' ? o.due_date.trim() : '';
  const due_date = /^\d{4}-\d{2}-\d{2}$/.test(dueRaw) ? dueRaw : null;

  return {
    is_payable_by_tiny_seed: o.is_payable_by_tiny_seed === true,
    vendor: (typeof o.vendor === 'string' ? o.vendor : '').trim() || 'Unknown Vendor',
    invoice_number:
      typeof o.invoice_number === 'string' && o.invoice_number.trim()
        ? o.invoice_number.trim()
        : null,
    amount,
    due_date,
    appears_already_paid: o.appears_already_paid === true,
    paid_evidence:
      typeof o.paid_evidence === 'string' && o.paid_evidence.trim() ? o.paid_evidence.trim() : null,
    confidence,
  };
}

/* ──────────────────────────────────────────────────────────────────────────
 * ACCOUNT MAP
 * ────────────────────────────────────────────────────────────────────────── */

/** Expense-account routing by vendor/description hints (verified live IDs). */
const ACCT_COGS = '26'; // Cost of Goods Sold — produce/food/farm-product
const ACCT_SUPPLIES = '41'; // Farming Supplies — supplies/equipment
const ACCT_ASK = '20'; // Ask My Accountant — unclear

function chooseAccountId(vendor: string, subject: string): string {
  const s = `${vendor} ${subject}`.toLowerCase();
  if (
    /produce|food|farm|dairy|creamery|meat|poultry|cheese|goat|orchard|grower|greenhouse|seed|plant|flower|mushroom|honey|bakery/.test(
      s
    )
  ) {
    return ACCT_COGS;
  }
  if (
    /supply|supplies|equipment|hardware|tool|packaging|compost|fertilizer|soil|tractor|irrigation|hose|feed|fuel/.test(
      s
    )
  ) {
    return ACCT_SUPPLIES;
  }
  return ACCT_ASK;
}

/* ──────────────────────────────────────────────────────────────────────────
 * DATE HELPERS
 * ────────────────────────────────────────────────────────────────────────── */

function ymd(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

function daysBetween(a: string, b: string): number {
  const ma = Date.parse(`${a}T00:00:00Z`);
  const mb = Date.parse(`${b}T00:00:00Z`);
  if (Number.isNaN(ma) || Number.isNaN(mb)) return Number.POSITIVE_INFINITY;
  return Math.abs(ma - mb) / 86_400_000;
}

function addDaysYmd(base: Date, days: number): string {
  return ymd(new Date(base.getTime() + days * 86_400_000));
}

/* ──────────────────────────────────────────────────────────────────────────
 * PER-CANDIDATE PROCESSING
 * ────────────────────────────────────────────────────────────────────────── */

interface Disposition {
  gmailMessageId: string;
  fromAddr: string;
  subject: string;
  emailDate: Date | null;
  vendor: string | null;
  invoiceNumber: string | null;
  amount: number | null;
  dueDate: string | null;
  action: Action;
  qbBillId: string | null;
  notes: string;
}

/** Purchases cache — fetched once per run, reused for every candidate. */
interface PurchaseCache {
  loaded: boolean;
  purchases: Awaited<ReturnType<typeof queryVendorPurchases>>;
}

/**
 * Run the QB dedupe + paid checks and (if it passes every gate) create the
 * Bill. Returns the disposition. Pure per-candidate — all fail-soft handling
 * lives in the caller.
 */
async function decideAndMaybeEnter(
  c: RawCandidate,
  parsed: ParsedInvoice,
  purchaseCache: PurchaseCache
): Promise<Pick<Disposition, 'action' | 'qbBillId' | 'notes'>> {
  // Not payable by us → skip (still logged for the audit trail).
  if (!parsed.is_payable_by_tiny_seed) {
    return { action: 'skipped_not_payable', qbBillId: null, notes: 'Claude: not a Tiny Seed payable' };
  }

  const emailYmd = c.emailDate ? ymd(c.emailDate) : ymd(new Date());
  const amount = parsed.amount;

  // ── QB duplicate check: fuzzy vendor match → their bills → same DocNumber
  //    OR same amount within 60 days. ──
  const vendorMatches = await findVendorsByNameLike(parsed.vendor);
  let allVendorBills: QbBillSummary[] = [];
  for (const vm of vendorMatches) {
    const bills = await queryVendorBills(vm.Id, 50);
    allVendorBills = allVendorBills.concat(bills);
  }
  for (const b of allVendorBills) {
    const sameDoc =
      parsed.invoice_number != null &&
      b.DocNumber != null &&
      b.DocNumber.trim().toLowerCase() === parsed.invoice_number.trim().toLowerCase();
    const sameAmt =
      amount != null &&
      Math.abs(b.TotalAmt - amount) <= AMOUNT_TOL &&
      daysBetween(b.TxnDate, emailYmd) <= DUP_AMOUNT_WINDOW_DAYS;
    if (sameDoc || sameAmt) {
      return {
        action: 'skipped_duplicate',
        qbBillId: b.Id,
        notes: `Duplicate of existing Bill ${b.Id}${b.DocNumber ? ` (#${b.DocNumber})` : ''} — matched by ${sameDoc ? 'invoice#' : 'amount'}`,
      };
    }
  }

  // ── Claude said it looks already paid on the document itself. ──
  if (parsed.appears_already_paid) {
    return {
      action: 'skipped_paid',
      qbBillId: null,
      notes: `Invoice appears already paid${parsed.paid_evidence ? `: ${parsed.paid_evidence}` : ''}`,
    };
  }

  // ── QB paid check: a Purchase (bank-feed card/ACH) matching the vendor
  //    name OR the amount in the last 60 days. ──
  if (!purchaseCache.loaded) {
    purchaseCache.purchases = await queryVendorPurchases(
      addDaysYmd(new Date(), -PAID_LOOKBACK_DAYS),
      200
    );
    purchaseCache.loaded = true;
  }
  const vendorLower = parsed.vendor.toLowerCase();
  for (const p of purchaseCache.purchases) {
    const nameHit =
      p.entityName != null &&
      vendorLower.length >= 4 &&
      (p.entityName.toLowerCase().includes(vendorLower) ||
        vendorLower.includes(p.entityName.toLowerCase()));
    const amtHit =
      amount != null &&
      (Math.abs(p.TotalAmt - amount) <= AMOUNT_TOL ||
        p.lineAmounts.some((la) => Math.abs(la - amount) <= AMOUNT_TOL));
    if (nameHit || amtHit) {
      return {
        action: 'skipped_paid',
        qbBillId: null,
        notes: `Likely already paid via bank feed — matching Purchase ${p.Id} (${p.TxnDate}) by ${nameHit ? 'vendor name' : 'amount'}`,
      };
    }
  }

  // ── Entry gate: cap + confidence. ──
  if (amount == null || amount <= 0) {
    return { action: 'flagged_review', qbBillId: null, notes: 'No amount parsed — needs manual review' };
  }
  if (amount >= AUTO_ENTER_MAX) {
    return {
      action: 'flagged_review',
      qbBillId: null,
      notes: `Amount $${amount.toFixed(2)} >= $${AUTO_ENTER_MAX} cap — needs manual approval`,
    };
  }
  if (parsed.confidence !== 'high') {
    return {
      action: 'flagged_review',
      qbBillId: null,
      notes: `Confidence ${parsed.confidence} — needs manual review`,
    };
  }

  // ── Create the Bill. ──
  const vendor = await findOrCreateVendor(parsed.vendor);
  const accountId = chooseAccountId(parsed.vendor, c.subject);
  const dueDate = parsed.due_date ?? addDaysYmd(c.emailDate ?? new Date(), 14);
  const bill = await createBill({
    vendorId: vendor.Id,
    accountId,
    amount,
    txnDate: emailYmd,
    dueDate,
    docNumber: parsed.invoice_number,
    privateNote: `Auto-entered from email by nightly vendor-bills cron ${emailYmd}`,
  });
  return {
    action: 'entered',
    qbBillId: bill.id,
    notes: `Entered Bill ${bill.id} to account ${accountId}, due ${dueDate}`,
  };
}

/* ──────────────────────────────────────────────────────────────────────────
 * DIGEST EMAIL
 * ────────────────────────────────────────────────────────────────────────── */

async function sendDigest(
  entered: Disposition[],
  flagged: Disposition[],
  paid: Disposition[]
): Promise<{ ok: boolean; detail: string }> {
  try {
    if (!RESEND_API_KEY || !RESEND_FROM_EMAIL) {
      return { ok: false, detail: 'resend_not_configured' };
    }
    const dateStr = new Intl.DateTimeFormat('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'America/New_York',
    }).format(new Date());

    const subject = `Bills digest — ${entered.length} entered, ${flagged.length} need review`;

    const rows = [
      ...entered.map((d) => ({ d, label: 'ENTERED' })),
      ...flagged.map((d) => ({ d, label: 'NEEDS REVIEW' })),
      ...paid.map((d) => ({ d, label: 'SKIPPED (paid)' })),
    ];

    const amt = (n: number | null) => (n == null ? '—' : `$${n.toFixed(2)}`);

    const rowsHtml = rows
      .map(({ d, label }) => {
        const color =
          label === 'ENTERED' ? '#15803d' : label === 'NEEDS REVIEW' ? '#b45309' : '#6b7280';
        return (
          `<tr style="border-top:1px solid #e5e7eb">` +
          `<td style="padding:6px 12px 6px 0">${escapeHtml(d.vendor ?? '—')}</td>` +
          `<td style="padding:6px 12px 6px 0;white-space:nowrap">${amt(d.amount)}</td>` +
          `<td style="padding:6px 12px 6px 0">${escapeHtml(d.invoiceNumber ?? '—')}</td>` +
          `<td style="padding:6px 0;font-weight:600;color:${color}">${escapeHtml(label)}</td>` +
          `</tr>` +
          `<tr><td colspan="4" style="padding:0 0 6px;color:#9ca3af;font-size:12px">${escapeHtml(d.notes)}</td></tr>`
        );
      })
      .join('');

    const rowsText = rows
      .map(
        ({ d, label }) =>
          `  • ${d.vendor ?? '—'} | ${amt(d.amount)} | #${d.invoiceNumber ?? '—'} | ${label}\n    ${d.notes}`
      )
      .join('\n');

    const text = [
      `Tiny Seed — nightly vendor-bills digest (${dateStr})`,
      '',
      `${entered.length} entered · ${flagged.length} need review · ${paid.length} skipped as already paid`,
      '',
      rowsText,
      '',
      'Reply to correct anything — bills never auto-pay. Amounts >= $500 or anything uncertain are flagged for you, not entered.',
      '— Tiny Seed nightly vendor-bills',
    ].join('\n');

    const html =
      `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:640px;margin:0 auto;color:#1f2937;line-height:1.6">` +
      `<p style="font-size:18px;font-weight:700;margin:0 0 4px;color:#15803d">Vendor bills digest</p>` +
      `<p style="color:#6b7280;font-size:14px;margin:0 0 16px">${escapeHtml(dateStr)} · ${entered.length} entered · ${flagged.length} need review · ${paid.length} already paid</p>` +
      `<table style="border-collapse:collapse;font-size:14px;width:100%;margin:0 0 16px">` +
      `<tr style="text-align:left;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:.04em">` +
      `<th style="padding:0 12px 6px 0">Vendor</th><th style="padding:0 12px 6px 0">Amount</th>` +
      `<th style="padding:0 12px 6px 0">Invoice #</th><th style="padding:0 0 6px">Action</th></tr>` +
      rowsHtml +
      `</table>` +
      `<p style="background:#fef3c7;border:1px solid #fde68a;border-radius:8px;padding:10px 14px;color:#92400e;font-size:13px;margin:0">` +
      `Reply to correct anything — <strong>bills never auto-pay</strong>. Amounts of $500+ or anything uncertain are flagged for you, not entered.</p>` +
      `<p style="color:#6b7280;font-size:13px;margin-top:20px">Automated by /api/cron/vendor-bills — bill entry only, no payments.</p>` +
      `</div>`;

    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: RESEND_FROM_EMAIL, to: [DIGEST_TO], subject, text, html }),
    });
    if (!resp.ok) {
      const detail = await resp.text().catch(() => '');
      console.error(`[vendor-bills] Resend send failed (HTTP ${resp.status}): ${detail.slice(0, 300)}`);
      return { ok: false, detail: `resend_http_${resp.status}` };
    }
    return { ok: true, detail: 'sent' };
  } catch (e) {
    console.error('[vendor-bills] sendDigest threw (swallowed):', e);
    return { ok: false, detail: 'threw' };
  }
}

/* ──────────────────────────────────────────────────────────────────────────
 * UNPUBLISHED-FLEX-DRAFT NUDGE (fail-soft addition, Thursday-draft system)
 *
 * Piggybacks on this DAILY cron (we're capped at 2 Vercel Hobby crons, both
 * used). On Fri–Mon ET, if the upcoming delivery week has a flex DRAFT staged
 * (rows exist) but NOTHING is live to members (no active rows AND no
 * flex_published_<week> marker), email Todd a one-line nudge with the review
 * link. At most one per day (this cron runs once daily). Entirely fail-soft:
 * a hiccup here never affects the vendor-bills pipeline.
 * ────────────────────────────────────────────────────────────────────────── */

const ADMIN_ORIGIN = 'https://csa.tinyseedfarm.com';

async function maybeSendUnpublishedFlexNudge(): Promise<{
  ran: boolean;
  week: string | null;
  reason: string;
}> {
  try {
    // Only Fri/Sat/Sun/Mon ET produce a target week; other days are a no-op.
    const week = nudgeTargetWeek();
    if (!week) return { ran: false, week: null, reason: 'not_a_nudge_day' };

    // Published already? The marker's presence is the source of truth.
    const publishedAt = await getPublishedAt(supabaseAdmin, week);
    if (publishedAt) return { ran: false, week, reason: 'already_published' };

    // Draft staged but nothing live?
    const state = await draftPublishState(supabaseAdmin, week);
    if (!state) return { ran: false, week, reason: 'state_unavailable' };
    if (state.total === 0) return { ran: false, week, reason: 'no_draft' };
    if (state.active > 0) return { ran: false, week, reason: 'has_active_rows' };

    // → Draft exists, nothing live, not published: nudge.
    if (!RESEND_API_KEY || !RESEND_FROM_EMAIL) {
      return { ran: false, week, reason: 'resend_not_configured' };
    }

    const weekLabel = prettyWeek(week);
    const reviewLink = `${ADMIN_ORIGIN}/admin/flex-review/${week}`;
    const subject = `Flex list still unpublished — ${weekLabel}`;
    const text = [
      `Todd — the Farm Flex list for ${weekLabel} is staged (${state.total} item${state.total === 1 ? '' : 's'}) but NOT published, so members can't order yet.`,
      '',
      'Review & publish:',
      `  ${reviewLink}`,
      '',
      '— Tiny Seed CSA (automated daily check)',
    ].join('\n');
    const html =
      `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:600px;margin:0 auto;color:#1f2937;line-height:1.6">` +
      `<p style="font-size:18px;font-weight:700;margin:0 0 6px;color:#b45309">Flex list still unpublished</p>` +
      `<p style="color:#6b7280;font-size:14px;margin:0 0 14px">${escapeHtml(weekLabel)}</p>` +
      `<p style="margin:0 0 12px">The Farm Flex list for <b>${escapeHtml(weekLabel)}</b> is staged ` +
      `(<b>${state.total} item${state.total === 1 ? '' : 's'}</b>) but <b>not published</b> — members can't order yet.</p>` +
      `<a href="${reviewLink}" style="display:inline-block;background:#15803d;color:#fff;text-decoration:none;` +
      `padding:12px 22px;border-radius:8px;font-weight:700;font-size:15px">Review &amp; publish →</a>` +
      `<p style="color:#6b7280;font-size:13px;margin-top:20px">Automated daily check from /api/cron/vendor-bills.</p>` +
      `</div>`;

    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: RESEND_FROM_EMAIL, to: [DIGEST_TO], subject, text, html }),
    });
    if (!resp.ok) {
      const detail = await resp.text().catch(() => '');
      console.error(`[vendor-bills] flex nudge send failed (HTTP ${resp.status}): ${detail.slice(0, 200)}`);
      return { ran: false, week, reason: `resend_http_${resp.status}` };
    }
    return { ran: true, week, reason: 'sent' };
  } catch (e) {
    console.error('[vendor-bills] flex nudge threw (swallowed):', e);
    return { ran: false, week: null, reason: 'threw' };
  }
}

/* ──────────────────────────────────────────────────────────────────────────
 * HANDLER
 * ────────────────────────────────────────────────────────────────────────── */

async function handle(request: Request): Promise<Response> {
  const denial = checkAuth(request);
  if (denial) return denial;

  // Config guards — fail with a typed error, never 500 on a missing key.
  if (!IMAP_TODD_USER || !IMAP_TODD_APP_PASSWORD) {
    return jsonResponse({ ok: false, error: 'imap_not_configured' }, 200);
  }
  if (!ANTHROPIC_API_KEY) {
    return jsonResponse({ ok: false, error: 'anthropic_not_configured' }, 200);
  }
  if (!quickbooksConfigured()) {
    return jsonResponse({ ok: false, error: 'quickbooks_not_configured' }, 200);
  }
  const qbConn = await getConnection();
  if (!qbConn.connected) {
    return jsonResponse({ ok: false, error: 'quickbooks_not_connected' }, 200);
  }

  // Window: default 3 days, optional ?days= for backfill (capped 90).
  const url = new URL(request.url);
  const daysParam = Number(url.searchParams.get('days'));
  const days = Number.isFinite(daysParam) && daysParam > 0 ? Math.min(90, Math.floor(daysParam)) : 3;
  const sinceDate = new Date(Date.now() - days * 86_400_000);

  // Per-invocation candidate cap. Each candidate costs ~1 Anthropic call + a
  // few QB round-trips, so a wide ?days= backfill can exceed the 60s function
  // ceiling. We process at most `max` fresh candidates per call (default 12,
  // plenty for the 3-day nightly window). A backfill can be run in successive
  // calls — dedup-on-log makes every re-run idempotent, so the NEXT call picks
  // up exactly where this one left off. `truncated` flags when more remain.
  const maxParam = Number(url.searchParams.get('max'));
  const maxCandidates =
    Number.isFinite(maxParam) && maxParam > 0 ? Math.min(50, Math.floor(maxParam)) : 8;

  // Soft wall-clock budget: stop starting new candidates past this so we always
  // return a complete JSON summary (and every started candidate finished +
  // logged) rather than being hard-killed mid-message.
  const startedAt = Date.now();
  const TIME_BUDGET_MS = 42_000; // < 60s ceiling, leaves room to send digest.

  const skipTally: Record<string, number> = {};
  const dispositions: Disposition[] = [];

  // 1. Load the set of already-dispositioned message ids so the IMAP fetch can
  //    skip them BEFORE downloading their bodies (the download + MIME parse is
  //    the expensive step). The log holds one row per candidate ever seen —
  //    small — so we can pull the whole id column.
  const alreadyLogged = new Set<string>();
  {
    const { data: logged, error: logErr } = await supabaseAdmin
      .from('vendor_invoice_log')
      .select('gmail_message_id');
    if (logErr) {
      console.error('[vendor-bills] log id read failed:', logErr.message);
    } else {
      for (const r of logged ?? []) alreadyLogged.add(r.gmail_message_id);
    }
  }

  // 2. Fetch + prefilter INBOX candidates. Fetch stops after `maxCandidates`
  //    FRESH survivors (dedup + prefilter applied inside), bounding the work.
  let candidates: RawCandidate[] = [];
  try {
    // Give the fetch phase at most ~40% of the budget; the rest is for
    // Claude+QB processing of what it returns.
    const fetchDeadline = startedAt + Math.floor(TIME_BUDGET_MS * 0.4);
    candidates = await fetchInboxCandidates(
      sinceDate,
      skipTally,
      alreadyLogged,
      maxCandidates,
      fetchDeadline
    );
  } catch (e) {
    console.error('[vendor-bills] IMAP fetch failed:', e instanceof Error ? e.message : String(e));
    return jsonResponse(
      { ok: false, error: 'imap_fetch_failed', detail: e instanceof Error ? e.message : String(e) },
      200
    );
  }

  // Every candidate returned is already fresh (not in the log) — the fetch did
  // the dedup. The cap it applied means there MAY be more older messages this
  // window that a subsequent call will pick up; we can only observe that when
  // the fetch returned a full page.
  const fresh = candidates;

  const purchaseCache: PurchaseCache = { loaded: false, purchases: [] };

  // 3. Process each fresh candidate — fully fail-soft per message. Honors the
  //    soft time budget; a full page (== maxCandidates) implies more may
  //    remain, so we mark the run truncated for the caller to continue.
  let truncated = fresh.length >= maxCandidates;
  for (const c of fresh) {
    if (Date.now() - startedAt > TIME_BUDGET_MS) {
      truncated = true;
      break;
    }
    let disp: Disposition = {
      gmailMessageId: c.gmailMessageId,
      fromAddr: c.fromAddr,
      subject: c.subject,
      emailDate: c.emailDate,
      vendor: null,
      invoiceNumber: null,
      amount: null,
      dueDate: null,
      action: 'flagged_review',
      qbBillId: null,
      notes: 'Unprocessed',
    };

    try {
      const parsed = await parseWithClaude(c);
      if (!parsed) {
        disp.notes = 'Claude parse failed — flagged for manual review';
      } else {
        disp.vendor = parsed.vendor;
        disp.invoiceNumber = parsed.invoice_number;
        disp.amount = parsed.amount;
        disp.dueDate = parsed.due_date;
        const decision = await decideAndMaybeEnter(c, parsed, purchaseCache);
        disp.action = decision.action;
        disp.qbBillId = decision.qbBillId;
        disp.notes = decision.notes;
      }
    } catch (e) {
      disp.action = 'flagged_review';
      disp.notes = `Processing error — flagged: ${e instanceof Error ? e.message : String(e)}`;
      console.error(`[vendor-bills] processing ${c.gmailMessageId} threw:`, e);
    }

    // 4. Log the disposition — idempotent on gmail_message_id.
    try {
      const { error: logErr } = await supabaseAdmin.from('vendor_invoice_log').insert({
        gmail_message_id: disp.gmailMessageId,
        email_date: disp.emailDate ? disp.emailDate.toISOString() : null,
        from_addr: disp.fromAddr,
        subject: disp.subject,
        vendor: disp.vendor,
        invoice_number: disp.invoiceNumber,
        amount: disp.amount,
        due_date: disp.dueDate,
        action: disp.action,
        qb_bill_id: disp.qbBillId,
        notes: disp.notes,
      });
      if (logErr && !/duplicate key|unique/i.test(logErr.message)) {
        console.error('[vendor-bills] log insert failed:', logErr.message);
      }
    } catch (e) {
      console.error('[vendor-bills] log insert threw:', e);
    }

    dispositions.push(disp);
  }

  // 5. Digest — only when something actionable happened.
  const entered = dispositions.filter((d) => d.action === 'entered');
  const flagged = dispositions.filter((d) => d.action === 'flagged_review');
  const paid = dispositions.filter((d) => d.action === 'skipped_paid');
  const duplicates = dispositions.filter((d) => d.action === 'skipped_duplicate');
  const notPayable = dispositions.filter((d) => d.action === 'skipped_not_payable');

  let emailOutcome = { ok: false, detail: 'no_digest_needed' };
  if (entered.length || flagged.length || paid.length) {
    emailOutcome = await sendDigest(entered, flagged, paid);
  }

  // ── Fail-soft: nudge Todd if next week's flex list is staged but unpublished.
  // Runs AFTER the bills pipeline so a nudge failure can never affect billing.
  const flexNudge = await maybeSendUnpublishedFlexNudge();

  return jsonResponse({
    ok: true,
    flex_nudge: flexNudge,
    window_days: days,
    candidates_after_prefilter: candidates.length,
    hard_skips: skipTally,
    already_logged_skipped: candidates.length - fresh.length,
    processed: dispositions.length,
    truncated,
    // When truncated, more candidates in this window remain; re-invoke with the
    // same params to continue (dedup-on-log makes it idempotent). We don't
    // pre-count the remainder (that would require downloading them).
    unprocessed_this_page: fresh.length - dispositions.length,
    counts: {
      entered: entered.length,
      flagged_review: flagged.length,
      skipped_duplicate: duplicates.length,
      skipped_paid: paid.length,
      skipped_not_payable: notPayable.length,
    },
    dispositions: dispositions.map((d) => ({
      vendor: d.vendor,
      amount: d.amount,
      invoice_number: d.invoiceNumber,
      action: d.action,
      qb_bill_id: d.qbBillId,
      subject: d.subject,
      from: d.fromAddr,
      notes: d.notes,
    })),
    digest_email: emailOutcome,
    ran_at: new Date().toISOString(),
  });
}

export const GET: APIRoute = ({ request }) => handle(request);
export const POST: APIRoute = ({ request }) => handle(request);
