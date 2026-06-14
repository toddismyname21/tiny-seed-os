/**
 * Weekly CSA email — matching, tokenized unsubscribe, and the branded
 * HTML template.
 *
 * Flow (owner-controlled, NEVER auto-sent):
 *   1. composeWeeklyEmail() reads the upcoming Wednesday's box_contents +
 *      the active recipe library, matches up to 3 recipes to the box, and
 *      builds the branded HTML/text.
 *   2. /admin/weekly-email previews it + shows the opted-in recipient
 *      count.
 *   3. /api/admin/weekly-email/send (admin + CSRF) sends via Resend ONLY
 *      to active members with newsletter_opt_in=true, logs each send to
 *      email_log (per-week idempotent), and batches/throttles.
 *
 * CAN-SPAM: every email embeds a tokenized one-click unsubscribe link
 * (signUnsubscribeToken) + a manage-preferences link + the farm's
 * physical address.
 *
 * Pittsburgh is America/New_York. The "upcoming Wednesday" is computed by
 * lib/box.ts upcomingWednesdayET() so this matches /dashboard, /box, and
 * the admin box editor exactly.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';
import { prettyDateET } from './box';
import { mondayOfWeek } from './cycle';
import {
  boxCropTokenSet,
  recipeMatchesCrops,
  type Recipe,
} from './recipes';

export const WEEKLY_EMAIL_TYPE = 'weekly_box';
export const PORTAL_BASE_URL = 'https://csa.tinyseedfarm.com';

/** How many recipes we surface per weekly email. */
export const MAX_RECIPES_PER_EMAIL = 3;

export interface BoxItem {
  product_name: string;
  variety: string | null;
  quantity: number;
  unit: string;
}

export interface ComposedEmail {
  /** Pretty Wednesday date, e.g. "Wednesday, May 27". */
  weekPretty: string;
  /** The week_date key, YYYY-MM-DD. */
  weekDate: string;
  /** Box items found for the week (may be empty). */
  items: BoxItem[];
  /** Recipes matched to the box (0–3). */
  recipes: Recipe[];
  subject: string;
}

// ─────────────────────────────────────────────────────────────────────
// Matching
// ─────────────────────────────────────────────────────────────────────

/**
 * Read the upcoming week's box items, collapse to a DISTINCT set of
 * product names (across every share_type — a recipe for "kale" is
 * relevant to anyone whose box has kale), and return both the de-duped
 * display items and the raw product-name list used for matching.
 *
 * `weekDate` is the delivery WEDNESDAY (the display/idempotency key). We
 * derive the cycle MONDAY (mondayOfWeek) for the box_contents query because
 * EVERY box_contents row in prod is keyed to the cycle Monday — querying by
 * the Wednesday matches nothing, so the email would list zero items even when
 * the box is published. Same root cause + fix as the /box member page.
 *
 * Uses whichever supabase client is passed:
 *   - the cookie-aware admin client for /admin previews (RLS admin-bypass)
 *   - supabaseAdmin (service role) for the actual send
 */
export async function readUpcomingBoxItems(
  supabase: SupabaseClient<Database>,
  weekDate: string
): Promise<BoxItem[]> {
  const boxContentsWeek = mondayOfWeek(weekDate);
  const { data, error } = await supabase
    .from('box_contents')
    .select('product_name, variety, quantity, unit, share_type')
    .eq('week_date', boxContentsWeek);

  if (error) {
    console.error('[weekly-email] box_contents read failed:', error.message);
    return [];
  }

  // De-dupe by product_name (case-insensitive) so the email lists each
  // crop once even if it appears in multiple share types. Keep the first
  // occurrence's variety/qty/unit for display.
  const seen = new Map<string, BoxItem>();
  for (const row of (data ?? []) as Array<{
    product_name: string;
    variety: string | null;
    quantity: number;
    unit: string;
  }>) {
    const key = row.product_name.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.set(key, {
      product_name: row.product_name,
      variety: row.variety,
      quantity: row.quantity,
      unit: row.unit,
    });
  }
  return Array.from(seen.values()).sort((a, b) =>
    a.product_name.localeCompare(b.product_name)
  );
}

/**
 * Match up to `limit` ACTIVE recipes to the box's crops. We deliberately
 * INTERLEAVE link + farm recipes so the email feels like a natural mix
 * ("here's one from us, here's a couple from around the web") rather than
 * three of the same kind. The algorithm:
 *   1. Filter active recipes whose crops overlap the box (recipeMatchesCrops).
 *   2. Split into farm[] and link[] (stable order = newest first, by
 *      caller's sort).
 *   3. Alternate picking farm, link, farm, … until we hit `limit` or run
 *      out of both lists.
 */
export function matchRecipesToBox(
  activeRecipes: readonly Recipe[],
  boxProductNames: readonly string[],
  limit = MAX_RECIPES_PER_EMAIL
): Recipe[] {
  const boxTokens = boxCropTokenSet(boxProductNames);
  if (boxTokens.size === 0) return [];

  const matched = activeRecipes.filter(
    (r) => r.is_active && recipeMatchesCrops(r.crops, boxTokens)
  );

  const farm = matched.filter((r) => r.source === 'farm');
  const link = matched.filter((r) => r.source === 'link');

  const out: Recipe[] = [];
  let fi = 0;
  let li = 0;
  // Alternate farm/link for a natural mix. Start with farm so our own
  // content leads when available.
  while (out.length < limit && (fi < farm.length || li < link.length)) {
    if (fi < farm.length) out.push(farm[fi++]);
    if (out.length >= limit) break;
    if (li < link.length) out.push(link[li++]);
  }
  return out;
}

/**
 * Compose the full weekly email payload for a given week. Reads the box
 * + active recipes through `supabase`, matches, and returns everything
 * the template + preview need.
 */
export async function composeWeeklyEmail(
  supabase: SupabaseClient<Database>,
  weekDate: string
): Promise<ComposedEmail> {
  const items = await readUpcomingBoxItems(supabase, weekDate);

  const { data: recipeRows, error: recipeErr } = await supabase
    .from('recipes')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (recipeErr) {
    console.error('[weekly-email] recipes read failed:', recipeErr.message);
  }

  const recipes = matchRecipesToBox(
    (recipeRows ?? []) as Recipe[],
    items.map((i) => i.product_name)
  );

  const weekPretty = prettyDateET(weekDate);

  return {
    weekPretty,
    weekDate,
    items,
    recipes,
    subject: `This week's Tiny Seed box — ${weekPretty}`,
  };
}

// ─────────────────────────────────────────────────────────────────────
// Tokenized unsubscribe (HMAC) — CAN-SPAM one-click, no login
// ─────────────────────────────────────────────────────────────────────

/**
 * URL-safe base64 (RFC 4648 §5) without padding. The token is
 * `<b64(email)>.<b64(hmac)>` — both parts are URL-safe so the link needs
 * no further encoding.
 */
function b64urlEncode(input: Buffer | string): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function b64urlDecode(input: string): Buffer {
  const pad = input.length % 4 === 0 ? '' : '='.repeat(4 - (input.length % 4));
  const std = input.replace(/-/g, '+').replace(/_/g, '/') + pad;
  return Buffer.from(std, 'base64');
}

/**
 * Sign a tokenized unsubscribe value for a member email. The token is
 * `<b64url(lowercased email)>.<b64url(HMAC-SHA256(email, secret))>`.
 *
 * The email is lowercased before signing so case variants verify
 * identically (and so the DB lookup, which lowercases too, matches).
 */
export function signUnsubscribeToken(email: string, secret: string): string {
  const normalized = email.trim().toLowerCase();
  const mac = createHmac('sha256', secret).update(normalized).digest();
  return `${b64urlEncode(normalized)}.${b64urlEncode(mac)}`;
}

/**
 * Verify a tokenized unsubscribe value. Returns the normalized email on
 * success, or null on any failure (malformed, bad signature). Constant-
 * time MAC comparison via timingSafeEqual.
 */
export function verifyUnsubscribeToken(token: string, secret: string): string | null {
  if (!token || typeof token !== 'string') return null;
  const dot = token.indexOf('.');
  if (dot <= 0 || dot === token.length - 1) return null;

  const emailPart = token.slice(0, dot);
  const macPart = token.slice(dot + 1);

  let email: string;
  let providedMac: Buffer;
  try {
    email = b64urlDecode(emailPart).toString('utf8');
    providedMac = b64urlDecode(macPart);
  } catch {
    return null;
  }

  if (!email) return null;

  const expectedMac = createHmac('sha256', secret).update(email).digest();
  if (providedMac.length !== expectedMac.length) return null;
  if (!timingSafeEqual(providedMac, expectedMac)) return null;

  return email;
}

/** Build the absolute one-click unsubscribe URL for an email. */
export function unsubscribeUrl(email: string, secret: string): string {
  const token = signUnsubscribeToken(email, secret);
  return `${PORTAL_BASE_URL}/unsubscribe?token=${encodeURIComponent(token)}`;
}

// ─────────────────────────────────────────────────────────────────────
// Branded HTML template
// ─────────────────────────────────────────────────────────────────────

/** Minimal HTML escaping for any interpolated user/content string. */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Quantity display: "1 bunch", "2 lb", or just the name if qty is 0/blank. */
function itemLine(item: BoxItem): string {
  const name = escapeHtml(item.product_name);
  const variety = item.variety ? ` <span style="color:#64748b">(${escapeHtml(item.variety)})</span>` : '';
  const qty =
    item.quantity && item.quantity > 0
      ? `<span style="color:#475569"> · ${escapeHtml(String(item.quantity))} ${escapeHtml(item.unit)}</span>`
      : '';
  return `${name}${variety}${qty}`;
}

/** Render one recipe card (link or farm). */
function recipeCard(recipe: Recipe): string {
  const title = escapeHtml(recipe.title);
  const image = recipe.image_url
    ? `<img src="${escapeHtml(recipe.image_url)}" alt="" width="100%" style="display:block;width:100%;max-height:200px;object-fit:cover;border-radius:8px 8px 0 0" />`
    : '';

  if (recipe.source === 'link' && recipe.url) {
    return (
      `<div style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin:0 0 16px">` +
      image +
      `<div style="padding:16px">` +
      `<p style="margin:0 0 8px;font-weight:700;font-size:17px;color:#0f172a">${title}</p>` +
      `<a href="${escapeHtml(recipe.url)}" style="display:inline-block;color:#166534;font-weight:600;font-size:15px;text-decoration:none">View recipe →</a>` +
      `</div></div>`
    );
  }

  // farm — show a short excerpt + the steps.
  const body = (recipe.body ?? '').trim();
  // Excerpt = first paragraph / first ~180 chars.
  const firstPara = body.split(/\n\s*\n/)[0] ?? body;
  const excerpt = firstPara.length > 180 ? `${firstPara.slice(0, 180).trim()}…` : firstPara;
  // Steps: render the whole body with line breaks preserved.
  const steps = escapeHtml(body).replace(/\n/g, '<br />');

  return (
    `<div style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin:0 0 16px">` +
    image +
    `<div style="padding:16px">` +
    `<p style="margin:0 0 4px;font-weight:700;font-size:17px;color:#0f172a">${title}` +
    ` <span style="display:inline-block;background:#16653415;color:#166534;font-size:11px;font-weight:700;padding:2px 8px;border-radius:99px;vertical-align:middle">From the farm</span></p>` +
    `<p style="margin:8px 0 12px;font-size:14px;line-height:1.55;color:#475569">${escapeHtml(excerpt)}</p>` +
    `<div style="font-size:14px;line-height:1.6;color:#0f172a">${steps}</div>` +
    `</div></div>`
  );
}

export interface RenderOptions {
  /** Absolute one-click unsubscribe URL (REQUIRED — CAN-SPAM). */
  unsubscribeHref: string;
  /** Absolute manage-preferences URL. */
  preferencesHref: string;
}

/**
 * Render the full branded HTML email. Visual style matches the
 * magic-link auth template (docs/email-templates/magic_link.html):
 * warm off-white page, Barlow-Condensed display heading, white card,
 * green CTA, slate footer with the farm's physical address.
 *
 * IMPORTANT: the `unsubscribeHref` is non-optional and always rendered
 * in the footer — there is no code path that produces an email without
 * a working unsubscribe link.
 */
export function renderWeeklyEmailHtml(email: ComposedEmail, opts: RenderOptions): string {
  const itemsHtml =
    email.items.length > 0
      ? `<ul style="margin:0;padding:0 0 0 18px;font-size:15px;line-height:1.7;color:#0f172a">` +
        email.items.map((it) => `<li style="margin:0 0 2px">${itemLine(it)}</li>`).join('') +
        `</ul>`
      : `<p style="margin:0;font-size:15px;color:#475569">Box contents for this week are being finalized — check the portal for the latest.</p>`;

  const recipesHtml =
    email.recipes.length > 0
      ? email.recipes.map(recipeCard).join('')
      : `<p style="margin:0;font-size:15px;color:#475569">No recipes matched this week's box yet — but you can always browse ideas in your member portal.</p>`;

  return (
    `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:540px;margin:0 auto;padding:32px 24px;background:#fafaf7;color:#0f172a">` +

    // Header
    `<div style="text-align:center;margin-bottom:32px">` +
    `<p style="color:#166534;text-transform:uppercase;letter-spacing:0.3em;font-weight:600;font-size:13px;margin:0 0 4px">🌱 Tiny Seed Farm</p>` +
    `<h1 style="font-family:'Barlow Condensed',sans-serif;font-weight:900;font-size:34px;margin:0;color:#0f172a">This week's box</h1>` +
    `<p style="margin:6px 0 0;font-size:15px;color:#475569">${escapeHtml(email.weekPretty)}</p>` +
    `</div>` +

    // Card: box contents
    `<div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:28px;box-shadow:0 4px 12px -2px rgba(0,0,0,0.06)">` +
    `<p style="margin:0 0 14px;font-weight:700;font-size:18px;color:#0f172a">In your box</p>` +
    itemsHtml +

    // Recipes
    `<p style="margin:28px 0 14px;font-weight:700;font-size:18px;color:#0f172a">Recipes for your box</p>` +
    recipesHtml +

    // Farm note
    `<div style="margin-top:24px;padding-top:20px;border-top:1px solid #e2e8f0">` +
    `<p style="margin:0;font-size:14px;line-height:1.6;color:#475569">Thanks for growing with us this season. Every box is picked fresh the morning of your delivery — we hope it brings something good to your table.</p>` +
    `<p style="margin:10px 0 0;font-size:14px;color:#475569">— Todd &amp; the Tiny Seed crew</p>` +
    `</div>` +
    `</div>` +

    // Footer — unsubscribe + manage prefs + physical address (CAN-SPAM)
    `<div style="text-align:center;margin-top:32px;color:#64748b;font-size:13px;line-height:1.6">` +
    `<p style="margin:0">You're receiving this because you opted in to Tiny Seed Farm CSA updates.</p>` +
    `<p style="margin:8px 0 0">` +
    `<a href="${escapeHtml(opts.unsubscribeHref)}" style="color:#166534;font-weight:600">Unsubscribe</a>` +
    ` &nbsp;·&nbsp; ` +
    `<a href="${escapeHtml(opts.preferencesHref)}" style="color:#166534;font-weight:600">Manage preferences</a>` +
    `</p>` +
    `<p style="margin:12px 0 0">Tiny Seed Farm · 257 Zeigler Rd · Rochester, PA 15074</p>` +
    `</div>` +
    `</div>`
  );
}

/** Plain-text counterpart (multipart fallback — also CAN-SPAM compliant). */
export function renderWeeklyEmailText(email: ComposedEmail, opts: RenderOptions): string {
  const lines: string[] = [];
  lines.push('TINY SEED FARM — This week\'s box');
  lines.push(email.weekPretty);
  lines.push('');
  lines.push('IN YOUR BOX');
  if (email.items.length > 0) {
    for (const it of email.items) {
      const variety = it.variety ? ` (${it.variety})` : '';
      const qty = it.quantity && it.quantity > 0 ? ` - ${it.quantity} ${it.unit}` : '';
      lines.push(`  • ${it.product_name}${variety}${qty}`);
    }
  } else {
    lines.push('  Box contents are being finalized — check the portal.');
  }
  lines.push('');
  lines.push('RECIPES FOR YOUR BOX');
  if (email.recipes.length > 0) {
    for (const r of email.recipes) {
      if (r.source === 'link' && r.url) {
        lines.push(`  • ${r.title}: ${r.url}`);
      } else {
        lines.push(`  • ${r.title} (from the farm)`);
        const body = (r.body ?? '').trim();
        if (body) {
          for (const bl of body.split('\n')) lines.push(`    ${bl}`);
        }
      }
    }
  } else {
    lines.push('  No recipes matched this week\'s box yet.');
  }
  lines.push('');
  lines.push('Thanks for growing with us this season.');
  lines.push('— Todd & the Tiny Seed crew');
  lines.push('');
  lines.push(`Unsubscribe: ${opts.unsubscribeHref}`);
  lines.push(`Manage preferences: ${opts.preferencesHref}`);
  lines.push('Tiny Seed Farm · 257 Zeigler Rd · Rochester, PA 15074');
  return lines.join('\n');
}
