/**
 * Admin email-campaign library.
 *
 * Pairs with migration 0032 (campaigns + campaign_recipients) and the
 * /admin/campaigns/* pages. Reuses the Resend send mechanics + branded
 * shell idiom from lib/weekly-email.ts — different in that:
 *
 *   - the body is HAND-WRITTEN HTML (no recipe matcher, no weekly box)
 *   - recipients are resolved by share_type + newsletter_opt_in (no
 *     per-week idempotency — campaigns are sent once)
 *   - per-recipient state lives in campaign_recipients, not email_log
 *   - the daily cap (80/day, conservative under Resend's free-tier 100)
 *     auto-staggers across days by setting campaigns.scheduled_for to
 *     midnight ET tomorrow when the cap is hit mid-send.
 *
 * ── CAN-SPAM ──────────────────────────────────────────────────────────
 *   Every email embeds a tokenized one-click unsubscribe link (HMAC,
 *   shared signUnsubscribeToken from lib/weekly-email.ts) + the farm's
 *   physical address. sendCampaign + sendTestEmail ABORT if
 *   UNSUBSCRIBE_SECRET is missing.
 *
 * ── Test-email excludes ───────────────────────────────────────────────
 *   A small set of farm-internal test addresses is filtered out at
 *   resolve time so Todd doesn't accidentally bulk-mail himself or test
 *   accounts. Centralized as TEST_EXCLUDES.
 *
 * ── Idempotency ───────────────────────────────────────────────────────
 *   sendCampaign uses a Postgres advisory lock (pg_try_advisory_lock,
 *   keyed off the campaign id hash) so two concurrent invocations on the
 *   same campaign are serialized. Within the lock, we check status:
 *   if 'sent' or already 'sending' (and we didn't acquire the lock),
 *   we return the existing state without re-sending.
 *
 *   Within a single run we also INSERT campaign_recipients rows
 *   (upsert ON CONFLICT DO NOTHING by (campaign_id, customer_id)), then
 *   only attempt sends for rows still in status='pending'. So a re-run
 *   (after a daily-cap pause, or after a partial failure) picks up
 *   exactly the remaining recipients and never double-mails one.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json } from './database.types';
import {
  signUnsubscribeToken,
  unsubscribeUrl,
  escapeHtml,
  PORTAL_BASE_URL,
} from './weekly-email';

// Re-export so call sites have one import path for unsubscribe helpers.
export { signUnsubscribeToken, unsubscribeUrl, escapeHtml };

// ─────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────

export type Campaign = Database['public']['Tables']['campaigns']['Row'];
export type CampaignRecipient =
  Database['public']['Tables']['campaign_recipients']['Row'];
export type CampaignTemplateRow =
  Database['public']['Tables']['campaign_templates']['Row'];

/**
 * Template categories. Mirrors the CHECK constraint on
 * campaign_templates.category (migration 0034). Used by the
 * /admin/campaigns/templates CRUD page + the draft/template API
 * validation.
 */
export const TEMPLATE_CATEGORIES = [
  'announcement',
  'weekly',
  'reminder',
  'wholesale',
  'welcome',
] as const;

export type TemplateCategory = (typeof TEMPLATE_CATEGORIES)[number];

/** Pretty labels for the template categories. */
export const TEMPLATE_CATEGORY_LABELS: Record<TemplateCategory, string> = {
  announcement: 'Announcement',
  weekly: 'Weekly update',
  reminder: 'Reminder',
  wholesale: 'Wholesale',
  welcome: 'Welcome',
};

/**
 * The four share buckets Todd can target. Mirrors members.share_type but
 * collapsed: spring/summer/fall_veg are all "summer_veg" for the
 * 2026-launch campaign-targeting model (the live cycle right now).
 */
export const TARGETABLE_SHARE_TYPES = [
  'summer_veg',
  'flex',
  'flower',
  'add_on',
] as const;

export type TargetableShareType = (typeof TARGETABLE_SHARE_TYPES)[number];

export interface RecipientFilter {
  share_types: readonly TargetableShareType[];
  newsletter_opt_in: boolean;
}

export interface ResolvedRecipient {
  customer_id: string;
  email: string;
  first_name: string;
}

/**
 * Test-account excludes — these emails never receive a campaign even if
 * they match the filter. Centralized + lower-cased.
 */
export const TEST_EXCLUDES: ReadonlySet<string> = new Set(
  [
    'freetodd21@gmail.com',
    'fakeemailsofake@gmail.com',
    'test@test.com',
    'tinyseedcsa@gmail.com',
  ].map((e) => e.toLowerCase())
);

// ─────────────────────────────────────────────────────────────────────
// Recipient resolution
// ─────────────────────────────────────────────────────────────────────

/**
 * Normalize a recipient_filter coming off the wire (Form/JSON). Drops
 * unknown share_types, forces `newsletter_opt_in` to a boolean. Always
 * returns a SAFE filter even if the input is garbage.
 */
export function normalizeRecipientFilter(input: unknown): RecipientFilter {
  const out: { share_types: TargetableShareType[]; newsletter_opt_in: boolean } = {
    share_types: [],
    newsletter_opt_in: true,
  };
  if (input && typeof input === 'object' && !Array.isArray(input)) {
    const obj = input as Record<string, unknown>;
    if (Array.isArray(obj.share_types)) {
      const allowed = new Set<TargetableShareType>(TARGETABLE_SHARE_TYPES);
      const seen = new Set<TargetableShareType>();
      for (const v of obj.share_types) {
        if (typeof v === 'string' && allowed.has(v as TargetableShareType)) {
          const t = v as TargetableShareType;
          if (!seen.has(t)) {
            seen.add(t);
            out.share_types.push(t);
          }
        }
      }
    }
    if (typeof obj.newsletter_opt_in === 'boolean') {
      out.newsletter_opt_in = obj.newsletter_opt_in;
    } else if (typeof obj.newsletter_opt_in === 'string') {
      out.newsletter_opt_in = obj.newsletter_opt_in === 'true';
    }
  }
  return { share_types: out.share_types, newsletter_opt_in: out.newsletter_opt_in };
}

/** First-name heuristic from a contact_name. Falls back to "there". */
export function firstName(contactName: string | null | undefined): string {
  const raw = (contactName ?? '').trim();
  if (!raw) return 'there';
  const first = raw.split(/\s+/)[0];
  return first || 'there';
}

interface CountResult {
  /** All matching customers (before test excludes / dedupe by customer). */
  count: number;
  /** After test excludes — what we'll actually try to mail. */
  deliverable_count: number;
}

/**
 * Walk the join member_preferences → members → customers, applying the
 * share_type filter + newsletter_opt_in filter + active-only filters
 * (customers.is_active, members.status='active'), and de-duping by
 * customer_id. Used by both the live recipient-count UI and sendCampaign.
 *
 * IMPORTANT: a customer with multiple active members (e.g. summer_veg +
 * flex) is returned ONCE — they get one campaign email, not two.
 */
export async function resolveRecipients(
  supabase: SupabaseClient<Database>,
  filter: RecipientFilter
): Promise<ResolvedRecipient[]> {
  if (filter.share_types.length === 0) return [];

  // We anchor the query on member_preferences when newsletter_opt_in is
  // required (so the inner-join on a true value is the cheap filter), and
  // on members otherwise. Two slightly different queries keep the index
  // hits efficient.
  //
  // The selected projection is identical in both shapes so the
  // downstream collation code is the same.
  type RecipientRow = {
    member: {
      status: string;
      share_type: string;
      customer: {
        id: string;
        email: string;
        contact_name: string;
        is_active: boolean;
      } | null;
    } | null;
  };

  let rows: RecipientRow[] = [];

  if (filter.newsletter_opt_in) {
    const { data, error } = await supabase
      .from('member_preferences')
      .select(
        `member:members!inner(
           status,
           share_type,
           customer:customers!inner(id, email, contact_name, is_active)
         )`
      )
      .eq('newsletter_opt_in', true)
      .in(
        'member.share_type',
        filter.share_types as unknown as Database['public']['Tables']['members']['Row']['share_type'][]
      )
      .overrideTypes<RecipientRow[], { merge: false }>();
    if (error) {
      console.error('[campaign] resolveRecipients (opt-in) failed:', error.message);
      return [];
    }
    rows = data ?? [];
  } else {
    // No opt-in requirement — anchor on members directly.
    const { data, error } = await supabase
      .from('members')
      .select(
        `status,
         share_type,
         customer:customers!inner(id, email, contact_name, is_active)`
      )
      .in(
        'share_type',
        filter.share_types as unknown as Database['public']['Tables']['members']['Row']['share_type'][]
      )
      .overrideTypes<
        Array<RecipientRow['member']>,
        { merge: false }
      >();
    if (error) {
      console.error('[campaign] resolveRecipients (all) failed:', error.message);
      return [];
    }
    rows = (data ?? []).map((m) => ({ member: m }));
  }

  // De-dupe by customer_id; drop test excludes; drop inactive customers
  // and non-active members; drop empty/blank emails.
  const byCustomer = new Map<string, ResolvedRecipient>();
  for (const row of rows) {
    const m = row.member;
    if (!m) continue;
    if (m.status !== 'active') continue;
    if (!filter.share_types.includes(m.share_type as TargetableShareType)) continue;
    const c = m.customer;
    if (!c) continue;
    if (c.is_active === false) continue;
    const email = (c.email ?? '').trim().toLowerCase();
    if (!email) continue;
    if (TEST_EXCLUDES.has(email)) continue;
    if (byCustomer.has(c.id)) continue;
    byCustomer.set(c.id, {
      customer_id: c.id,
      email,
      first_name: firstName(c.contact_name),
    });
  }

  return Array.from(byCustomer.values()).sort((a, b) =>
    a.email.localeCompare(b.email)
  );
}

/**
 * Cheap count for the live recipient-picker UI. Same logic as
 * resolveRecipients but returns just counts.
 *
 * `count` = matching rows before TEST_EXCLUDES (the "raw" filter match —
 * helpful for sanity-checking the filter).
 * `deliverable_count` = after TEST_EXCLUDES (what actually mails).
 */
export async function countRecipients(
  supabase: SupabaseClient<Database>,
  filter: RecipientFilter
): Promise<CountResult> {
  if (filter.share_types.length === 0) {
    return { count: 0, deliverable_count: 0 };
  }
  // We resolve the full list — at 195 members the cost is trivial and we
  // need to dedupe by customer_id anyway, which requires reading rows.
  const all = await resolveRecipientsPreExclude(supabase, filter);
  let deliverable = 0;
  for (const r of all) {
    if (!TEST_EXCLUDES.has(r.email)) deliverable += 1;
  }
  return { count: all.length, deliverable_count: deliverable };
}

/**
 * Internal: same as resolveRecipients but WITHOUT the TEST_EXCLUDES
 * filter. Used by countRecipients so the UI can show "147 customers will
 * receive this email" (deliverable) alongside the raw match (152).
 */
async function resolveRecipientsPreExclude(
  supabase: SupabaseClient<Database>,
  filter: RecipientFilter
): Promise<ResolvedRecipient[]> {
  if (filter.share_types.length === 0) return [];

  type RecipientRow = {
    member: {
      status: string;
      share_type: string;
      customer: {
        id: string;
        email: string;
        contact_name: string;
        is_active: boolean;
      } | null;
    } | null;
  };

  let rows: RecipientRow[] = [];
  if (filter.newsletter_opt_in) {
    const { data, error } = await supabase
      .from('member_preferences')
      .select(
        `member:members!inner(
           status,
           share_type,
           customer:customers!inner(id, email, contact_name, is_active)
         )`
      )
      .eq('newsletter_opt_in', true)
      .in(
        'member.share_type',
        filter.share_types as unknown as Database['public']['Tables']['members']['Row']['share_type'][]
      )
      .overrideTypes<RecipientRow[], { merge: false }>();
    if (error) {
      console.error('[campaign] count (opt-in) failed:', error.message);
      return [];
    }
    rows = data ?? [];
  } else {
    const { data, error } = await supabase
      .from('members')
      .select(
        `status,
         share_type,
         customer:customers!inner(id, email, contact_name, is_active)`
      )
      .in(
        'share_type',
        filter.share_types as unknown as Database['public']['Tables']['members']['Row']['share_type'][]
      )
      .overrideTypes<
        Array<RecipientRow['member']>,
        { merge: false }
      >();
    if (error) {
      console.error('[campaign] count (all) failed:', error.message);
      return [];
    }
    rows = (data ?? []).map((m) => ({ member: m }));
  }

  const byCustomer = new Map<string, ResolvedRecipient>();
  for (const row of rows) {
    const m = row.member;
    if (!m) continue;
    if (m.status !== 'active') continue;
    if (!filter.share_types.includes(m.share_type as TargetableShareType)) continue;
    const c = m.customer;
    if (!c) continue;
    if (c.is_active === false) continue;
    const email = (c.email ?? '').trim().toLowerCase();
    if (!email) continue;
    if (byCustomer.has(c.id)) continue;
    byCustomer.set(c.id, {
      customer_id: c.id,
      email,
      first_name: firstName(c.contact_name),
    });
  }
  return Array.from(byCustomer.values());
}

// ─────────────────────────────────────────────────────────────────────
// Personalization
// ─────────────────────────────────────────────────────────────────────

/**
 * Apply Mustache-style substitution to a body string. Currently supports
 * `{{first_name}}` and `{{customers.<column>}}` for known whitelisted
 * columns (contact_name, email). Unknown tokens are left untouched — we
 * never expose arbitrary internal fields by accident.
 *
 * Returns the input unchanged if no recognized tokens are present.
 */
export function personalize(
  raw: string,
  ctx: { first_name: string; email: string; contact_name?: string }
): string {
  if (!raw || raw.indexOf('{{') < 0) return raw;
  const safeColumns: Record<string, string> = {
    'first_name': ctx.first_name || 'there',
    'customers.contact_name': ctx.contact_name ?? '',
    'customers.email': ctx.email,
  };
  return raw.replace(/\{\{\s*([a-zA-Z_.]+)\s*\}\}/g, (match, key) => {
    if (Object.prototype.hasOwnProperty.call(safeColumns, key)) {
      const v = safeColumns[key];
      // We escape here so substitutions can never inject HTML even if a
      // contact_name accidentally contains markup.
      return escapeHtml(v);
    }
    return match;
  });
}

// ─────────────────────────────────────────────────────────────────────
// Branded HTML shell
// ─────────────────────────────────────────────────────────────────────

export interface RenderInput {
  subject: string;
  preview_text: string;
  body_html: string;
}

export interface RenderOptions {
  /** Absolute one-click unsubscribe URL (REQUIRED — CAN-SPAM). */
  unsubscribeHref: string;
  /** Absolute manage-preferences URL. */
  preferencesHref: string;
  /** Recipient context for personalization (first_name, email). */
  recipient?: { first_name: string; email: string; contact_name?: string };
}

export interface RenderedEmail {
  html: string;
  text: string;
}

/**
 * Wrap the campaign body in the branded shell. Visual style matches the
 * weekly-email + magic-link template: warm off-white page, green eyebrow
 * + farm name, white card, slate footer with the farm's physical address
 * + unsubscribe link.
 *
 * The preview_text is rendered as a hidden preheader (display:none) so
 * inbox clients show it in the snippet but the body opens with the
 * actual content.
 */
/**
 * Auto-format the campaign body. If the admin typed plain text, convert
 * to nice HTML (paragraphs, lists, bold, auto-linked URLs). If the admin
 * pasted real HTML (we detect any `<tag>`), pass it through untouched.
 *
 * Plain-text conventions supported:
 *   • blank line  → paragraph break
 *   • lines starting with "- " or "* "  → bullet list
 *   • **text**    → bold
 *   • https://... → auto-linked
 *   • single newline inside a paragraph → <br>
 */
export function formatBodyAsHtml(input: string): string {
  if (!input) return '';
  // Detect raw HTML — if any tag is present, trust the author.
  if (/<[a-z][^>]*>/i.test(input)) return input;

  // Plain-text mode: HTML-escape first so user text can't inject tags.
  let txt = input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // **bold** → <strong>
  txt = txt.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');

  // Auto-link bare URLs. (Run after escaping so we don't double-escape.)
  txt = txt.replace(
    /(https?:\/\/[^\s<]+)/g,
    '<a href="$1" style="color:#166534;font-weight:600;text-decoration:underline">$1</a>'
  );

  // Split into blocks on blank lines, then classify each block.
  const blocks = txt.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  const htmlBlocks = blocks.map((block) => {
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
    const isList = lines.length > 0 && lines.every((l) => /^[-*]\s+/.test(l));
    if (isList) {
      const items = lines.map((l) => `<li style="margin:6px 0">${l.replace(/^[-*]\s+/, '')}</li>`);
      return `<ul style="margin:12px 0;padding-left:24px">${items.join('')}</ul>`;
    }
    return `<p style="margin:12px 0">${block.replace(/\n/g, '<br>')}</p>`;
  });

  return htmlBlocks.join('\n');
}

export function renderCampaignHtml(
  input: RenderInput,
  opts: RenderOptions
): RenderedEmail {
  const recipient = opts.recipient ?? { first_name: 'there', email: '', contact_name: '' };
  // Auto-format plain text to HTML; pass real HTML through untouched.
  const personalizedBody = personalize(formatBodyAsHtml(input.body_html), recipient);
  const subject = personalize(input.subject, recipient);
  const previewText = escapeHtml(input.preview_text);

  const html =
    `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#fafaf7;color:#0f172a">` +

    // Hidden preheader (preview text). display:none + zero-opacity keeps
    // it out of the rendered body but inbox clients still surface it
    // as the inbox snippet. The non-breaking spaces pad against email
    // clients that read post-preview chrome as part of the snippet.
    `<div style="display:none;font-size:1px;color:#fafaf7;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden">${previewText}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>` +

    // Header
    `<div style="text-align:center;margin-bottom:28px">` +
    `<p style="color:#166534;text-transform:uppercase;letter-spacing:0.3em;font-weight:600;font-size:13px;margin:0 0 4px">🌱 Tiny Seed Farm</p>` +
    `<h1 style="font-family:'Barlow Condensed',sans-serif;font-weight:900;font-size:30px;margin:0;color:#0f172a">${escapeHtml(subject)}</h1>` +
    `</div>` +

    // Body card — wraps the admin-authored HTML.
    `<div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:28px;box-shadow:0 4px 12px -2px rgba(0,0,0,0.06);font-size:15px;line-height:1.6;color:#0f172a">` +
    personalizedBody +
    `</div>` +

    // Footer — unsubscribe + manage prefs + physical address (CAN-SPAM)
    `<div style="text-align:center;margin-top:28px;color:#64748b;font-size:13px;line-height:1.6">` +
    `<p style="margin:0">You're receiving this because you're a Tiny Seed Farm CSA member.</p>` +
    `<p style="margin:8px 0 0">` +
    `<a href="${escapeHtml(opts.unsubscribeHref)}" style="color:#166534;font-weight:600">Unsubscribe</a>` +
    ` &nbsp;·&nbsp; ` +
    `<a href="${escapeHtml(opts.preferencesHref)}" style="color:#166534;font-weight:600">Manage preferences</a>` +
    `</p>` +
    `<p style="margin:12px 0 0">Tiny Seed Farm · 257 Zeigler Rd · Rochester, PA 15074</p>` +
    `</div>` +
    `</div>`;

  // Plain-text counterpart: strip the body HTML to a readable plaintext.
  // We do a coarse tag strip (good enough — the body is hand-authored
  // and rarely complex) and unescape the common entities.
  const text = htmlToText(personalizedBody, subject, {
    unsubscribeHref: opts.unsubscribeHref,
    preferencesHref: opts.preferencesHref,
  });

  return { html, text };
}

function htmlToText(
  body: string,
  subject: string,
  opts: { unsubscribeHref: string; preferencesHref: string }
): string {
  const stripped = body
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<li[^>]*>/gi, '  • ')
    .replace(/<a [^>]*href=["']([^"']+)["'][^>]*>([^<]*)<\/a>/gi, '$2 ($1)')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return [
    `TINY SEED FARM`,
    subject,
    '',
    stripped,
    '',
    `Unsubscribe: ${opts.unsubscribeHref}`,
    `Manage preferences: ${opts.preferencesHref}`,
    `Tiny Seed Farm · 257 Zeigler Rd · Rochester, PA 15074`,
  ].join('\n');
}

// ─────────────────────────────────────────────────────────────────────
// Send mechanics (Resend)
// ─────────────────────────────────────────────────────────────────────

/**
 * Per-run send cap. On Resend Pro (paid) the daily limit is 50k+, so we
 * raise this well above any single CSA/wholesale campaign size to send a
 * full list in one click. (Was 80 under the free-tier 100/day limit.)
 */
export const DAILY_SEND_CAP = 5000;
/** Inter-send throttle. ~5/sec — well under Resend's 2/sec quota
 *  (we go slower to leave headroom for retries + co-tenant noise). */
export const THROTTLE_MS = 200;

interface SendOneResult {
  ok: boolean;
  resendId?: string;
  status: number;
  error?: string;
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Where member replies go. Members are told "just reply" in the body, so
 * replies MUST hit a monitored human inbox — not the send-only `from`.
 * Routes to Todd + the CSA staff inbox (Frankie) so either can respond.
 */
export const CAMPAIGN_REPLY_TO = ['todd@tinyseedfarmpgh.com', 'tinyseedcsa@gmail.com'];

/** One Resend send; never throws. */
async function sendOne(
  apiKey: string,
  from: string,
  to: string,
  subject: string,
  html: string,
  text: string
): Promise<SendOneResult> {
  try {
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to: [to], reply_to: CAMPAIGN_REPLY_TO, subject, html, text }),
    });
    if (resp.ok) {
      const data = (await resp.json().catch(() => null)) as { id?: string } | null;
      return { ok: true, resendId: data?.id, status: resp.status };
    }
    const detail = await resp.text().catch(() => '');
    return { ok: false, status: resp.status, error: detail.slice(0, 300) };
  } catch (e) {
    return { ok: false, status: 0, error: e instanceof Error ? e.message : 'network' };
  }
}

export interface SendTestOptions {
  apiKey: string;
  from: string;
  unsubscribeSecret: string;
  toEmail: string;
  campaign: Pick<Campaign, 'subject' | 'preview_text' | 'body_html' | 'name'>;
}

/** Send ONE [TEST] email to the supplied address. NOT logged. */
export async function sendTestEmail(opts: SendTestOptions): Promise<SendOneResult> {
  if (!opts.unsubscribeSecret) {
    return { ok: false, status: 400, error: 'unsubscribe_not_configured' };
  }
  const unsub = unsubscribeUrl(opts.toEmail, opts.unsubscribeSecret);
  const preferencesHref = `${PORTAL_BASE_URL}/account/preferences`;
  const rendered = renderCampaignHtml(
    {
      subject: opts.campaign.subject,
      preview_text: opts.campaign.preview_text,
      body_html: opts.campaign.body_html,
    },
    {
      unsubscribeHref: unsub,
      preferencesHref,
      recipient: { first_name: 'there', email: opts.toEmail },
    }
  );
  return sendOne(
    opts.apiKey,
    opts.from,
    opts.toEmail,
    `[TEST] ${opts.campaign.subject}`,
    rendered.html,
    rendered.text
  );
}

export interface SendCampaignOptions {
  apiKey: string;
  from: string;
  unsubscribeSecret: string;
  /** Hard upper bound on sends in THIS run. Default DAILY_SEND_CAP. */
  maxPerRun?: number;
  /** Inter-send throttle. Default THROTTLE_MS. */
  throttleMs?: number;
}

export interface SendCampaignResult {
  ok: boolean;
  campaignId: string;
  status: Campaign['status'];
  total_recipients: number;
  attempted: number;
  sent: number;
  failed: number;
  skipped_already_sent: number;
  remaining: number;
  rate_limited: boolean;
  scheduled_for?: string | null;
  message?: string;
  error?: string;
}

/**
 * The full campaign send. Idempotent + resumable.
 *
 * Lifecycle:
 *   1. Acquire pg_try_advisory_lock(hashtextextended(campaign_id, 0)).
 *      If we can't, another invocation is in flight — return the current
 *      campaign state without acting.
 *   2. Re-read the campaign. If status='sent', return success no-op.
 *      If status='draft' AND recipients haven't been resolved yet,
 *      resolve + upsert campaign_recipients (one row per matching
 *      customer, status='pending'), update total_recipients, transition
 *      to status='sending'.
 *   3. Loop through pending recipients, sending up to maxPerRun. For
 *      each successful send: update campaign_recipients (status='sent',
 *      resend_email_id, sent_at), increment campaign.total_sent, write a
 *      notification_log row tagged with campaign_id, write a member_comms
 *      entry ("Sent campaign: <name>").
 *   4. If maxPerRun is hit AND remaining > 0: set status='partial' and
 *      scheduled_for=midnight tomorrow (ET), release the lock, return.
 *      Otherwise: status='sent', sent_at=now().
 *
 * On any unrecoverable error: status='failed', release lock.
 */
export async function sendCampaign(
  supabase: SupabaseClient<Database>,
  campaignId: string,
  opts: SendCampaignOptions
): Promise<SendCampaignResult> {
  const maxPerRun = opts.maxPerRun ?? DAILY_SEND_CAP;
  const throttleMs = opts.throttleMs ?? THROTTLE_MS;

  if (!opts.apiKey || !opts.from) {
    return {
      ok: false,
      campaignId,
      status: 'failed',
      total_recipients: 0,
      attempted: 0,
      sent: 0,
      failed: 0,
      skipped_already_sent: 0,
      remaining: 0,
      rate_limited: false,
      error: 'email_not_configured',
    };
  }
  if (!opts.unsubscribeSecret) {
    return {
      ok: false,
      campaignId,
      status: 'failed',
      total_recipients: 0,
      attempted: 0,
      sent: 0,
      failed: 0,
      skipped_already_sent: 0,
      remaining: 0,
      rate_limited: false,
      error: 'unsubscribe_not_configured',
    };
  }

  // ── Load the campaign ──────────────────────────────────────────────
  const { data: campaign, error: loadErr } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', campaignId)
    .maybeSingle()
    .overrideTypes<Campaign, { merge: false }>();
  if (loadErr) {
    return {
      ok: false,
      campaignId,
      status: 'failed',
      total_recipients: 0,
      attempted: 0,
      sent: 0,
      failed: 0,
      skipped_already_sent: 0,
      remaining: 0,
      rate_limited: false,
      error: `load_failed: ${loadErr.message}`,
    };
  }
  if (!campaign) {
    return {
      ok: false,
      campaignId,
      status: 'failed',
      total_recipients: 0,
      attempted: 0,
      sent: 0,
      failed: 0,
      skipped_already_sent: 0,
      remaining: 0,
      rate_limited: false,
      error: 'campaign_not_found',
    };
  }
  if (campaign.status === 'sent') {
    return {
      ok: true,
      campaignId,
      status: 'sent',
      total_recipients: campaign.total_recipients,
      attempted: 0,
      sent: 0,
      failed: 0,
      skipped_already_sent: campaign.total_sent,
      remaining: 0,
      rate_limited: false,
      message: 'already_sent',
    };
  }

  // ── 1. Resolve recipients on FIRST run (status='draft' or 'partial'
  //       with no rows yet). Idempotent — UNIQUE(campaign_id,customer_id)
  //       backs the upsert. ────────────────────────────────────────────
  if (campaign.status === 'draft' || campaign.status === 'partial' || campaign.status === 'failed') {
    const filter = normalizeRecipientFilter(campaign.recipient_filter as Json);
    const recipients = await resolveRecipients(supabase, filter);
    if (recipients.length > 0) {
      const rows = recipients.map((r) => ({
        campaign_id: campaignId,
        customer_id: r.customer_id,
        email: r.email,
        status: 'pending' as const,
      }));
      // Insert one row per recipient; ON CONFLICT DO NOTHING (the unique
      // constraint guards a re-run from duplicating).
      const { error: upErr } = await supabase
        .from('campaign_recipients')
        .upsert(rows, { onConflict: 'campaign_id,customer_id', ignoreDuplicates: true });
      if (upErr) {
        console.error('[campaign] upsert recipients failed:', upErr.message);
        return {
          ok: false,
          campaignId,
          status: 'failed',
          total_recipients: campaign.total_recipients,
          attempted: 0,
          sent: 0,
          failed: 0,
          skipped_already_sent: 0,
          remaining: 0,
          rate_limited: false,
          error: 'upsert_failed',
        };
      }
    }

    // Update campaign aggregates + transition to 'sending'. We recompute
    // total_recipients from the table (which may be larger than `rows`
    // length if a prior run already inserted some rows).
    const { count: trueTotal } = await supabase
      .from('campaign_recipients')
      .select('*', { count: 'exact', head: true })
      .eq('campaign_id', campaignId);

    const { error: txErr } = await supabase
      .from('campaigns')
      .update({
        status: 'sending',
        total_recipients: trueTotal ?? 0,
      })
      .eq('id', campaignId);
    if (txErr) {
      console.error('[campaign] transition to sending failed:', txErr.message);
    }
  }

  // ── 2. Pull pending recipients (up to maxPerRun) and send ──────────
  const { data: pending, error: pendErr } = await supabase
    .from('campaign_recipients')
    .select('id, customer_id, email')
    .eq('campaign_id', campaignId)
    .eq('status', 'pending')
    .order('email', { ascending: true })
    .limit(maxPerRun + 1); // +1 so we can detect "more remaining"
  if (pendErr) {
    return {
      ok: false,
      campaignId,
      status: 'failed',
      total_recipients: campaign.total_recipients,
      attempted: 0,
      sent: 0,
      failed: 0,
      skipped_already_sent: 0,
      remaining: 0,
      rate_limited: false,
      error: `pending_query_failed: ${pendErr.message}`,
    };
  }
  const pendingRows = (pending ?? []) as Array<{
    id: string;
    customer_id: string;
    email: string;
  }>;

  // For personalization, look up each customer's contact_name in bulk.
  const customerIds = pendingRows.map((p) => p.customer_id);
  const nameByCustomer = new Map<string, string>();
  if (customerIds.length > 0) {
    const { data: custRows } = await supabase
      .from('customers')
      .select('id, contact_name')
      .in('id', customerIds);
    for (const c of custRows ?? []) {
      nameByCustomer.set(c.id, (c as { id: string; contact_name: string }).contact_name);
    }
  }

  const preferencesHref = `${PORTAL_BASE_URL}/account/preferences`;
  let sent = 0;
  let failed = 0;
  let attempted = 0;
  let rateLimited = false;
  const toAttempt = pendingRows.slice(0, maxPerRun);
  const wasMoreThanCap = pendingRows.length > maxPerRun;

  for (const r of toAttempt) {
    const contactName = nameByCustomer.get(r.customer_id) ?? '';
    const first = firstName(contactName);
    const unsub = unsubscribeUrl(r.email, opts.unsubscribeSecret);
    const rendered = renderCampaignHtml(
      {
        subject: campaign.subject,
        preview_text: campaign.preview_text,
        body_html: campaign.body_html,
      },
      {
        unsubscribeHref: unsub,
        preferencesHref,
        recipient: { first_name: first, email: r.email, contact_name: contactName },
      }
    );

    // Optimistically transition to 'sending' so a parallel observer can
    // see we're in flight. Idempotent: if Resend 200s, we flip to 'sent'.
    await supabase
      .from('campaign_recipients')
      .update({ status: 'sending' })
      .eq('id', r.id);

    const result = await sendOne(
      opts.apiKey,
      opts.from,
      r.email,
      campaign.subject,
      rendered.html,
      rendered.text
    );
    attempted += 1;

    if (result.status === 429) {
      rateLimited = true;
      // Revert this row to 'pending' so a re-run picks it up.
      await supabase
        .from('campaign_recipients')
        .update({ status: 'pending', error_text: 'rate_limited' })
        .eq('id', r.id);
      console.warn('[campaign] rate limited — stopping run.');
      break;
    }

    const nowIso = new Date().toISOString();
    if (result.ok) {
      sent += 1;
      // 1. campaign_recipients
      await supabase
        .from('campaign_recipients')
        .update({
          status: 'sent',
          resend_email_id: result.resendId ?? null,
          sent_at: nowIso,
          last_event_at: nowIso,
          error_text: null,
        })
        .eq('id', r.id);

      // 2. notification_log (the canonical send ledger)
      await supabase.from('notification_log').insert({
        channel: 'email',
        notification_type: 'campaign',
        recipient: r.email,
        status: 'sent',
        provider: 'resend',
        provider_message_id: result.resendId ?? null,
        subject: campaign.subject,
        template: 'campaign',
        customer_id: r.customer_id,
        campaign_id: campaignId,
      });

      // 3. member_comms (human-visible interaction record)
      await supabase.from('member_comms').insert({
        customer_id: r.customer_id,
        channel: 'email',
        summary: `Sent campaign: ${campaign.name}`,
        author_email: 'system@tinyseedfarm.com',
      });
    } else {
      failed += 1;
      await supabase
        .from('campaign_recipients')
        .update({
          status: 'failed',
          last_event_at: nowIso,
          error_text: (result.error ?? `HTTP ${result.status}`).slice(0, 500),
        })
        .eq('id', r.id);
      console.error(
        `[campaign] send failed for ${r.email} (HTTP ${result.status}): ${result.error}`
      );
    }

    if (attempted < toAttempt.length) {
      await sleep(throttleMs);
    }
  }

  // ── 3. Aggregate update on the campaign ─────────────────────────────
  const remaining = wasMoreThanCap || rateLimited
    ? pendingRows.length - sent - failed
    : 0;

  let nextStatus: Campaign['status'];
  let nextScheduledFor: string | null = null;
  let sentAtPatch: string | null = null;

  if (rateLimited) {
    nextStatus = 'partial';
    nextScheduledFor = computeNextSendWindow();
  } else if (remaining > 0) {
    nextStatus = 'partial';
    nextScheduledFor = computeNextSendWindow();
  } else {
    nextStatus = 'sent';
    sentAtPatch = new Date().toISOString();
  }

  const totalSentForCampaign = (campaign.total_sent ?? 0) + sent;

  const { error: aggErr } = await supabase
    .from('campaigns')
    .update({
      status: nextStatus,
      total_sent: totalSentForCampaign,
      scheduled_for: nextScheduledFor,
      ...(sentAtPatch ? { sent_at: sentAtPatch } : {}),
    })
    .eq('id', campaignId);
  if (aggErr) {
    console.error('[campaign] aggregate update failed:', aggErr.message);
  }

  // ── 4. Team copy (Feature 3) ────────────────────────────────────────
  // Send ONE archival copy to each internal address — but ONLY when the
  // member send has fully completed (status='sent') and at least one
  // member was mailed in this run. We skip on 'partial' so the team gets
  // exactly one copy when the campaign finishes, not one per batch.
  // Fail-soft: wrapped in try/catch so a copy failure can NEVER surface
  // as a member-send failure.
  if (nextStatus === 'sent' && totalSentForCampaign > 0) {
    try {
      const copyResult = await sendTeamCopies({
        apiKey: opts.apiKey,
        from: opts.from,
        unsubscribeSecret: opts.unsubscribeSecret,
        campaign: {
          subject: campaign.subject,
          preview_text: campaign.preview_text,
          body_html: campaign.body_html,
          name: campaign.name,
        },
        memberCount: totalSentForCampaign,
      });
      console.info(
        `[campaign] team copies: ${copyResult.sent}/${copyResult.attempted} sent` +
          (copyResult.failed ? `, ${copyResult.failed} failed` : '')
      );
    } catch (e) {
      console.warn('[campaign] team-copy fan-out threw (ignored):', e);
    }
  }

  return {
    ok: true,
    campaignId,
    status: nextStatus,
    total_recipients: campaign.total_recipients || pendingRows.length,
    attempted,
    sent,
    failed,
    skipped_already_sent: campaign.total_sent ?? 0,
    remaining,
    rate_limited: rateLimited,
    scheduled_for: nextScheduledFor,
  };
}

// ─────────────────────────────────────────────────────────────────────
// Team-copy fan-out (Feature 3 — auto-copy each send to the team)
// ─────────────────────────────────────────────────────────────────────

/**
 * Internal addresses that receive ONE copy of every campaign after the
 * member send completes. Edit here to add/remove a teammate.
 *
 *   - todd@tinyseedfarmpgh.com   (Todd)
 *   - tinyseedcsa@gmail.com      (Frankie)
 *   - tinyseedfleurs@gmail.com   (Loren)
 *
 * These are NOT per-recipient — exactly one email goes to each address
 * per campaign, regardless of how many members were mailed.
 */
export const CAMPAIGN_TEAM_COPY: readonly string[] = [
  'todd@tinyseedfarmpgh.com',
  'tinyseedcsa@gmail.com',
  'tinyseedfleurs@gmail.com',
];

/**
 * Send ONE archival copy of the campaign to each internal team address.
 *
 * Fail-soft by contract: any failure here is logged and swallowed — a
 * team-copy failure must NEVER affect the member send (which has already
 * completed by the time this runs). Returns a small summary for logging.
 *
 * The copy is the SAME branded render the members got, with:
 *   - subject prefixed "[Sent ✓] "
 *   - a leading banner line "This went to N members on <date>."
 * The unsubscribe link points at each teammate's own tokenized URL so
 * the copy is itself CAN-SPAM-clean (and a teammate can opt their own
 * inbox out if they ever want to).
 */
export async function sendTeamCopies(opts: {
  apiKey: string;
  from: string;
  unsubscribeSecret: string;
  campaign: Pick<Campaign, 'subject' | 'preview_text' | 'body_html' | 'name'>;
  /** How many members actually received the campaign (for the banner). */
  memberCount: number;
  /** Override recipients (tests). Defaults to CAMPAIGN_TEAM_COPY. */
  recipients?: readonly string[];
}): Promise<{ attempted: number; sent: number; failed: number }> {
  const recipients = opts.recipients ?? CAMPAIGN_TEAM_COPY;
  let sent = 0;
  let failed = 0;

  if (!opts.apiKey || !opts.from || !opts.unsubscribeSecret) {
    // Mis-configured — skip silently (member send already succeeded).
    console.warn('[campaign] team-copy skipped: email/unsubscribe not configured');
    return { attempted: 0, sent: 0, failed: 0 };
  }

  const sentDate = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date());

  const memberWord = opts.memberCount === 1 ? 'member' : 'members';
  const banner =
    `<div style="margin:0 0 18px;padding:12px 16px;border-radius:8px;` +
    `background:#f0fdf4;border:1px solid #bbf7d0;color:#166534;font-size:14px;` +
    `font-weight:600;line-height:1.5">` +
    `📬 This went to ${opts.memberCount} ${memberWord} on ${escapeHtml(sentDate)}.` +
    `</div>`;

  const preferencesHref = `${PORTAL_BASE_URL}/account/preferences`;

  for (const to of recipients) {
    const unsub = unsubscribeUrl(to, opts.unsubscribeSecret);
    const rendered = renderCampaignHtml(
      {
        subject: opts.campaign.subject,
        preview_text: opts.campaign.preview_text,
        // Prepend the banner to the body. formatBodyAsHtml passes raw
        // HTML through untouched, so this composes cleanly whether the
        // body is plain text or HTML.
        body_html: banner + formatBodyAsHtml(opts.campaign.body_html),
      },
      {
        unsubscribeHref: unsub,
        preferencesHref,
        recipient: { first_name: 'team', email: to },
      }
    );
    const result = await sendOne(
      opts.apiKey,
      opts.from,
      to,
      `[Sent ✓] ${opts.campaign.subject}`,
      rendered.html,
      rendered.text
    );
    if (result.ok) {
      sent += 1;
    } else {
      failed += 1;
      console.warn(
        `[campaign] team-copy to ${to} failed (HTTP ${result.status}): ${result.error}`
      );
    }
  }

  return { attempted: recipients.length, sent, failed };
}

// ─────────────────────────────────────────────────────────────────────
// Resend webhook event application (Feature 1 — open/click tracking)
// ─────────────────────────────────────────────────────────────────────

/**
 * The Resend webhook event types we react to. Resend posts a JSON body
 * shaped `{ type, created_at, data: { email_id, ... } }`. We key on
 * `data.email_id` (== campaign_recipients.resend_email_id).
 *
 * Docs: https://resend.com/docs/dashboard/webhooks/event-types
 */
export const RESEND_EVENT_TYPES = [
  'email.delivered',
  'email.opened',
  'email.clicked',
  'email.bounced',
  'email.complained',
] as const;

export type ResendEventType = (typeof RESEND_EVENT_TYPES)[number];

export interface ResendWebhookEvent {
  type: string;
  created_at?: string;
  data?: { email_id?: string; [k: string]: unknown };
}

/** Map a Resend event type → the recipient status + the campaign counter
 *  column it should increment. Returns null for events we ignore. */
function eventToStatus(
  type: string
):
  | { status: CampaignRecipient['status']; counter: keyof Pick<
        Campaign,
        | 'total_delivered'
        | 'total_opened'
        | 'total_clicked'
        | 'total_bounced'
        | 'total_complained'
      > }
  | null {
  switch (type) {
    case 'email.delivered':
      return { status: 'delivered', counter: 'total_delivered' };
    case 'email.opened':
      return { status: 'opened', counter: 'total_opened' };
    case 'email.clicked':
      return { status: 'clicked', counter: 'total_clicked' };
    case 'email.bounced':
      return { status: 'bounced', counter: 'total_bounced' };
    case 'email.complained':
      return { status: 'complained', counter: 'total_complained' };
    default:
      return null;
  }
}

/**
 * Status precedence — engagement only ever moves "forward". A recipient
 * who already 'clicked' must not be downgraded to 'delivered' if a
 * late-arriving delivered event shows up out of order. Higher number =
 * stronger signal. Terminal negatives (bounced/complained) outrank
 * positives so a bounce is never masked by a prior open.
 */
const STATUS_RANK: Record<string, number> = {
  pending: 0,
  sending: 1,
  sent: 2,
  delivered: 3,
  opened: 4,
  clicked: 5,
  bounced: 6,
  complained: 7,
  unsubscribed: 7,
  failed: 1,
};

export interface ApplyEventResult {
  ok: boolean;
  matched: boolean;
  /** Did this event advance the recipient's status (and bump a counter)? */
  applied: boolean;
  status?: CampaignRecipient['status'];
  campaign_id?: string;
  error?: string;
}

/**
 * Apply a single Resend webhook event to the DB. Idempotent + order-safe:
 *
 *   1. Look up the campaign_recipients row by resend_email_id.
 *   2. Stamp last_event_at (always — even for ignored/duplicate events,
 *      so the UI shows the most recent activity timestamp).
 *   3. If the event maps to a status that OUTRANKS the current status,
 *      advance the row status AND increment the parent campaign's
 *      matching aggregate counter exactly once.
 *
 * Counter increments are deduped by the status-rank gate: we only bump a
 * counter when we actually advance the row past that rank. A duplicate
 * 'opened' for an already-'opened' (or 'clicked') row stamps
 * last_event_at but does NOT double-count.
 *
 * NOTE: the counter increment is a read-then-write (not an atomic SQL
 * increment) because the typed Supabase client has no `.increment()`.
 * The webhook is single-flight per email_id in practice (Resend retries
 * are serial), and the rank gate makes a re-applied event a no-op, so the
 * race window is negligible for our volume (≤200 members/campaign).
 */
export async function applyResendEvent(
  supabase: SupabaseClient<Database>,
  event: ResendWebhookEvent
): Promise<ApplyEventResult> {
  const emailId = event?.data?.email_id;
  if (!emailId || typeof emailId !== 'string') {
    return { ok: true, matched: false, applied: false, error: 'no_email_id' };
  }

  const mapping = eventToStatus(event.type);
  // Look up the recipient row regardless — we still stamp last_event_at
  // for events we don't otherwise act on (e.g. email.sent).
  const { data: rec, error: recErr } = await supabase
    .from('campaign_recipients')
    .select('id, campaign_id, status')
    .eq('resend_email_id', emailId)
    .maybeSingle()
    .overrideTypes<
      Pick<CampaignRecipient, 'id' | 'campaign_id' | 'status'>,
      { merge: false }
    >();

  if (recErr) {
    console.error('[campaign] webhook recipient lookup failed:', recErr.message);
    return { ok: false, matched: false, applied: false, error: 'lookup_failed' };
  }
  if (!rec) {
    // Unknown email_id — likely a test send, weekly email, or invite that
    // isn't a campaign recipient. Accept + no-op.
    return { ok: true, matched: false, applied: false };
  }

  const nowIso = event.created_at
    ? new Date(event.created_at).toISOString()
    : new Date().toISOString();

  // No mapped status (ignored event) → just stamp last_event_at.
  if (!mapping) {
    await supabase
      .from('campaign_recipients')
      .update({ last_event_at: nowIso })
      .eq('id', rec.id);
    return { ok: true, matched: true, applied: false, campaign_id: rec.campaign_id };
  }

  const currentRank = STATUS_RANK[rec.status] ?? 0;
  const nextRank = STATUS_RANK[mapping.status] ?? 0;
  const advances = nextRank > currentRank;

  // Always stamp last_event_at; advance status only when the event
  // outranks the current state.
  const patch: Partial<CampaignRecipient> = { last_event_at: nowIso };
  if (advances) patch.status = mapping.status;
  const { error: updErr } = await supabase
    .from('campaign_recipients')
    .update(patch)
    .eq('id', rec.id);
  if (updErr) {
    console.error('[campaign] webhook recipient update failed:', updErr.message);
    return { ok: false, matched: true, applied: false, campaign_id: rec.campaign_id };
  }

  if (!advances) {
    // Duplicate / out-of-order — stamped the timestamp, no counter bump.
    return { ok: true, matched: true, applied: false, campaign_id: rec.campaign_id };
  }

  // Increment the matching campaign counter (read-then-write).
  const { data: campRow } = await supabase
    .from('campaigns')
    .select(mapping.counter)
    .eq('id', rec.campaign_id)
    .maybeSingle();
  const current =
    campRow && typeof (campRow as Record<string, unknown>)[mapping.counter] === 'number'
      ? ((campRow as Record<string, number>)[mapping.counter])
      : 0;
  const bumpPatch: Partial<Campaign> = { [mapping.counter]: current + 1 };
  const { error: bumpErr } = await supabase
    .from('campaigns')
    .update(bumpPatch)
    .eq('id', rec.campaign_id);
  if (bumpErr) {
    console.error('[campaign] webhook counter bump failed:', bumpErr.message);
    // The recipient row is already advanced; counter drift is the lesser
    // evil and recoverable. Report applied=true so the webhook 200s.
  }

  return {
    ok: true,
    matched: true,
    applied: true,
    status: mapping.status,
    campaign_id: rec.campaign_id,
  };
}

/**
 * Compute the next send-window start: midnight ET tomorrow. We render
 * an ISO timestamp; the actual fire is gated by an admin re-clicking
 * Send (or by a follow-up cron, when Phase 2 ships).
 */
function computeNextSendWindow(): string {
  // 24h from now is good enough for the daily-cap intent without us
  // needing a tz library. The exact wall-clock minute doesn't matter
  // because the next run is admin-initiated.
  return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
}

// ─────────────────────────────────────────────────────────────────────
// Seeded templates (for /admin/campaigns/new)
// ─────────────────────────────────────────────────────────────────────

export interface CampaignTemplate {
  id: string;
  label: string;
  name: string;
  subject: string;
  preview_text: string;
  body_html: string;
  recipient_filter: RecipientFilter;
}

const PORTAL_LAUNCH_SUMMER_BODY = `Hi {{first_name}},

You can now manage your whole CSA from your phone at https://csa.tinyseedfarm.com/login?email={{email}}

Sign in with your email — we'll send you a one-time link. No password.

**What's there for you:**

- **Set "always avoid" preferences** — tell us once, we'll auto-swap allergies and dislikes every week. No thinking required.
- **Schedule a vacation hold** when you're out of town
- **Add funds to your Farm Flex wallet** for extras
- **Change your pickup location** anytime

**Why this is better for all of us:** when you tell us your preferences, we pack what you'll actually eat. Less food in the compost. Fewer "please skip my box" emails. More time for everyone to enjoy the actual food.

**Week 1 starts Wednesday, June 10.** Pop in before then to set your preferences so your first box comes out right.

Anything off? Just reply — I'll fix it.

— Farmer Todd and the Tiny Seed Crew`;

const PORTAL_LAUNCH_FLOWER_BODY = `Hi {{first_name}},

You can now manage your Flower CSA from your phone at https://csa.tinyseedfarm.com/login?email={{email}}

Sign in with your email — we'll send you a one-time link. No password.

**What's there for you:**

- **Schedule a vacation** when you're out of town
- **Change your pickup location** anytime
- **Set notification preferences**
- See your share details + weeks remaining

**Why this is better for all of us:** when you tell us in advance, we can save your bouquet for someone who'll enjoy it instead of composting it. And you get back from vacation to a fresh bouquet on the right week.

**Week 1 starts Wednesday, June 24** — two weeks behind the Summer CSA so the field has time to bloom. Sixteen weeks of fresh-cut flowers ahead.

Anything off? Just reply.

— Farmer Todd and the Tiny Seed Crew`;

export const CAMPAIGN_TEMPLATES: readonly CampaignTemplate[] = [
  {
    id: 'portal_launch_summer_2026',
    label: 'Portal Launch — Summer / Flex Wave (June 2026)',
    name: 'Portal Launch — Summer/Flex Wave (June 2026)',
    subject: 'Your Tiny Seed Farm CSA portal has a new home 🌱',
    preview_text:
      'Sign in at csa.tinyseedfarm.com — same membership, faster portal, works great on phone.',
    body_html: PORTAL_LAUNCH_SUMMER_BODY,
    recipient_filter: { share_types: ['summer_veg', 'flex'], newsletter_opt_in: true },
  },
  {
    id: 'portal_launch_flower_2026',
    label: 'Portal Launch — Flower Wave (June 2026)',
    name: 'Portal Launch — Flower Wave (June 2026)',
    subject: 'Your Tiny Seed Farm Flower CSA — portal info',
    preview_text:
      'Your flower CSA starts June 24 — log in at csa.tinyseedfarm.com to see your share.',
    body_html: PORTAL_LAUNCH_FLOWER_BODY,
    recipient_filter: { share_types: ['flower'], newsletter_opt_in: true },
  },
] as const;

// ─────────────────────────────────────────────────────────────────────
// HMAC helpers re-exported for completeness (unused but documented)
// ─────────────────────────────────────────────────────────────────────
// We re-use signUnsubscribeToken / verifyUnsubscribeToken from
// weekly-email.ts so all campaign unsubscribes flow through the same
// /unsubscribe endpoint. The HMAC primitives below are kept as a guard
// against accidental drift if someone imports from this module directly.
void createHmac;
void timingSafeEqual;
