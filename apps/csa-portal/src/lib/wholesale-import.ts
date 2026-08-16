/**
 * Wholesale order PDF importer — parser for vendor purchase orders.
 *
 * Admins upload a vendor's order PDF (Harvie purchase order, or a Market Wagon
 * "Fill Ticket" / pick ticket) and this turns the extracted text into a normalized
 * order we can write into wholesale_orders + wholesale_order_items, so the existing
 * /admin/wholesale/pack and /labels pages pick it up automatically.
 *
 * IMPORTANT — extraction reality (verified against the two real sample PDFs):
 *   unpdf's extractText(mergePages:true) returns the page as ONE flat string with
 *   ALL whitespace collapsed to single spaces — there are NO line breaks. So every
 *   pattern below operates on a single space-delimited string, not lines.
 *
 *   Harvie SKUs are emitted with stray hyphen+space breaks, e.g. the SKU printed as
 *   "TSF-SOMETH-SALAD" extracts as "TSF- SOMETH- SALAD". We therefore canonicalize
 *   SKUs by stripping spaces (→ "TSF-SOMETH-SALAD") for the vendor_key, and the
 *   mapping lookup compares on a fully-normalized form (spaces AND hyphens removed,
 *   uppercased) so seed rows keyed as "TSFSOMETHSALAD" still resolve.
 *
 *   Market Wagon emits the delivery date as "20260630" (no dashes) in the sample,
 *   though "2026-06-30" is also handled. The external_ref is the numeric id in the
 *   print URL (…/print?type=product&id=330472).
 */

export type Vendor = 'harvie' | 'market_wagon';

export interface ParsedLine {
  /** The key we store/lookup in vendor_product_map: Harvie canonical SKU, or
   *  normalized lowercase MW product name. */
  vendor_key: string;
  /** Human-readable description straight off the PDF (UI label + fallback name). */
  raw_description: string;
  /** Quantity ordered. Harvie = the Quantity column; MW = the "Pick Total". */
  qty: number;
  /** Unit price in cents. Harvie carries a price; MW pick tickets do not → null. */
  unit_price_cents: number | null;
}

export interface ParsedOrder {
  vendor: Vendor;
  vendor_display: 'Harvie' | 'Market Wagon';
  /** YYYY-MM-DD. */
  delivery_date: string | null;
  /** Vendor's own order id (Harvie PO #, MW pick-ticket id). May be null. */
  external_ref: string | null;
  lines: ParsedLine[];
}

/** Fully-normalize a key for cross-referencing against vendor_product_map:
 *  uppercase, strip everything that isn't a letter or digit. Lets a seed row
 *  keyed "TSFSOMETHSALAD" match an extracted SKU "TSF-SOMETH-SALAD". */
export function normalizeVendorKey(s: string): string {
  return s.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/** Canonical Harvie SKU: collapse the stray "X- Y" hyphen breaks back into
 *  "X-Y" by removing spaces, then trim trailing hyphens. */
function canonicalHarvieSku(raw: string): string {
  return raw.replace(/\s+/g, '').replace(/-+$/, '');
}

/** MM/DD/YYYY → YYYY-MM-DD. Returns null if not a valid date shape. */
function mdyToIso(mdy: string): string | null {
  const m = mdy.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const [, mm, dd, yyyy] = m;
  return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
}

/** "20260630" or "2026-06-30" → "2026-06-30". Returns null if unrecognized. */
function compactOrDashedToIso(s: string): string | null {
  const dashed = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dashed) return `${dashed[1]}-${dashed[2]}-${dashed[3]}`;
  const compact = s.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (compact) return `${compact[1]}-${compact[2]}-${compact[3]}`;
  return null;
}

/**
 * Strip the invisible glyphs some vendors embed in their PDFs. Market Wagon's
 * font interleaves Private-Use-Area characters (e.g. U+E088) between the digits
 * of the delivery date, so "20260630" extracts as "20260630" — which
 * silently breaks every date/number regex. We remove:
 *   - Private Use Area (U+E000–U+F8FF)
 *   - zero-width / BOM / directional marks (U+200B–U+200F, U+FEFF, U+2060)
 * and collapse the resulting runs of whitespace. The visible "▢" checkbox glyph
 * (U+25A2) is intentionally KEPT — the Market Wagon parser relies on it as a
 * per-customer-row delimiter.
 */
export function sanitizeExtractedText(text: string): string {
  return text
    .replace(/[-]/g, '')
    .replace(/[​-‏⁠﻿]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function detectVendor(text: string): Vendor | null {
  const t = text.toLowerCase();
  // Market Wagon checked first: a MW fill ticket can mention generic words; the
  // Harvie PO is unambiguous ("purchase order #"). Keep both explicit.
  if (t.includes('market wagon') || t.includes('fill ticket')) return 'market_wagon';
  if (t.includes('harvie') || t.includes('purchase order #')) return 'harvie';
  return null;
}

/**
 * HARVIE rows live between the "Quantity Total" header and the "Notes to Supplier"
 * / "Total:" footer, in the flat string form:
 *
 *   <idx> <SKU tokens...> <Description...> $ <unit_price> <qty> $ <line_total>
 *
 * A reliable anchor is the price/qty/total triple: "$ 2.85 30.0 $ 85.50". We scan
 * for every "$ <num> <num> $ <num>" occurrence, then carve the text BEFORE each
 * one (after the previous match) into "<idx> <SKU…> <Description…>". The SKU is the
 * run of UPPERCASE/HYPHEN tokens immediately after the leading row index; the rest
 * is the description.
 */
function parseHarvie(text: string): ParsedOrder {
  let delivery_date: string | null = null;
  const dd = text.match(/Delivery Date\s+(\d{1,2}\/\d{1,2}\/\d{4})/i);
  if (dd) delivery_date = mdyToIso(dd[1]);

  let external_ref: string | null = null;
  const po = text.match(/Purchase Order\s*#\s*(\d+)/i);
  if (po) external_ref = po[1];

  // Isolate the line-item region to avoid matching dollar figures in the footer.
  const headerIdx = text.search(/Unit Price\s+Quantity\s+Total/i);
  const footerIdx = text.search(/Notes to Supplier|Total:/i);
  const region =
    headerIdx >= 0
      ? text.slice(
          text.indexOf('Total', headerIdx) + 'Total'.length,
          footerIdx > headerIdx ? footerIdx : undefined
        )
      : text;

  const lines: ParsedLine[] = [];
  // "$ 2.85 30.0 $ 85.50"  — price, qty, line total. Allow optional spaces.
  const tripleRe = /\$\s*([\d,]+\.?\d*)\s+([\d,]+\.?\d*)\s+\$\s*([\d,]+\.?\d*)/g;
  let prevEnd = 0;
  let m: RegExpExecArray | null;
  while ((m = tripleRe.exec(region)) !== null) {
    const before = region.slice(prevEnd, m.index).trim();
    prevEnd = tripleRe.lastIndex;

    const unitPrice = parseFloat(m[1].replace(/,/g, ''));
    const qty = parseFloat(m[2].replace(/,/g, ''));
    if (!isFinite(unitPrice) || !isFinite(qty)) continue;

    // `before` looks like: "1 TSF- SOMETH- SALAD Something Fresh Salad Mix"
    // Drop the leading row index.
    const noIndex = before.replace(/^\d+\s+/, '');
    // SKU = the leading run of tokens that are all-uppercase letters/digits/hyphens.
    // (Description words are mixed/lower case.) A "token" is whitespace-delimited.
    const tokens = noIndex.split(/\s+/);
    const skuTokens: string[] = [];
    let i = 0;
    for (; i < tokens.length; i++) {
      const tok = tokens[i];
      // A SKU token is uppercase letters/digits/hyphens with NO lowercase, and
      // contains at least one letter (so we don't swallow stray numbers). The
      // description that follows always has mixed/lowercase words.
      const isSkuTok = /^[A-Z0-9-]+$/.test(tok) && /[A-Z]/.test(tok) && !/[a-z]/.test(tok);
      if (isSkuTok) skuTokens.push(tok);
      else break;
    }
    const rawSku = skuTokens.join('');
    const vendor_key = canonicalHarvieSku(rawSku);
    let description = tokens.slice(i).join(' ').trim();
    // Strip any inline "Notes: …" the PDF wedges into the description (e.g. Cilantro).
    description = description.replace(/\s*Notes:.*$/i, '').trim();

    if (!vendor_key && !description) continue;

    lines.push({
      vendor_key: vendor_key || normalizeVendorKey(description),
      raw_description: description || rawSku,
      qty: Math.round(qty * 100) / 100,
      unit_price_cents: Math.round(unitPrice * 100),
    });
  }

  return {
    vendor: 'harvie',
    vendor_display: 'Harvie',
    delivery_date,
    external_ref,
    lines,
  };
}

/**
 * MARKET WAGON fill ticket. Flat string form:
 *
 *   Fill Ticket: … on 20260630 <Product A> 27-a ▢ 1 31-a ▢ 1 Pick Total: 2
 *   <Product B> 64-b ▢ 1 Pick Total: 1 … <print URL ...id=330472> …
 *
 * Each product block = a product NAME, then per-customer rows ("27-a ▢ 1"),
 * then "Pick Total: N". We split on "Pick Total: N": the text BEFORE each total
 * (since the previous total / since the header) holds the product name followed by
 * the per-customer rows. We strip the per-customer rows (tokens like "27-a", "▢",
 * bare digits, page-footer noise) to recover the product name.
 */
function parseMarketWagon(text: string): ParsedOrder {
  let delivery_date: string | null = null;
  const dd = text.match(/\bon\s+(\d{4}-?\d{2}-?\d{2})/i);
  if (dd) delivery_date = compactOrDashedToIso(dd[1]);

  let external_ref: string | null = null;
  const ref = text.match(/[?&]id=(\d+)/);
  if (ref) external_ref = ref[1];

  // Everything after "on <date>" is the product list; cut the header off so the
  // first product name isn't polluted by "Fill Ticket: … to Western-PA on <date>".
  let region = text;
  const onMatch = region.match(/\bon\s+\d{4}-?\d{2}-?\d{2}\s+/i);
  if (onMatch && onMatch.index !== undefined) {
    region = region.slice(onMatch.index + onMatch[0].length);
  }

  const lines: ParsedLine[] = [];
  const totalRe = /Pick Total:\s*(\d+)/g;
  let prevEnd = 0;
  let m: RegExpExecArray | null;
  while ((m = totalRe.exec(region)) !== null) {
    let chunk = region.slice(prevEnd, m.index);
    prevEnd = totalRe.lastIndex;
    const qty = parseInt(m[1], 10);

    // Remove the recurring page-footer / URL noise that can land inside a chunk
    // when a product block straddles a page break.
    chunk = chunk
      .replace(/\d{1,2}\/\d{1,2}\/\d{2},?\s*\d{1,2}:\d{2}\s*(AM|PM)/gi, ' ')
      .replace(/Pick Ticket\s*\|\s*Market Wagon Portal/gi, ' ')
      .replace(/https?:\/\/\S+/gi, ' ')
      .replace(/\b\d+\/\d+\b/g, ' '); // "1/2", "2/2" page counters

    // The product NAME is everything up to the first per-customer row marker.
    // A per-customer row starts with a slot token like "27-a", "64-b", "1-a".
    const tokens = chunk.trim().split(/\s+/).filter(Boolean);
    const nameTokens: string[] = [];
    for (const tok of tokens) {
      if (/^\d+-[a-z]$/i.test(tok)) break;      // slot id "27-a" → rows begin
      if (tok === '▢') break;                    // checkbox glyph → rows begin
      nameTokens.push(tok);
    }
    const name = nameTokens.join(' ').trim();
    if (!name || !isFinite(qty)) continue;

    lines.push({
      vendor_key: normalizeVendorKey(name),
      raw_description: name,
      qty,
      unit_price_cents: null,
    });
  }

  return {
    vendor: 'market_wagon',
    vendor_display: 'Market Wagon',
    delivery_date,
    external_ref,
    lines,
  };
}

/**
 * Parse a vendor order PDF buffer into a ParsedOrder. Throws on unknown vendor /
 * unreadable PDF so the endpoint can return a clear 422.
 */
export async function parseWholesalePdf(
  buffer: ArrayBuffer | Uint8Array | Buffer
): Promise<ParsedOrder> {
  const { extractText, getDocumentProxy } = await import('unpdf');
  const bytes =
    buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer as ArrayBuffer);
  let text: string;
  try {
    const pdf = await getDocumentProxy(bytes);
    const res = await extractText(pdf, { mergePages: true });
    text = Array.isArray(res.text) ? res.text.join(' ') : res.text;
  } catch (err) {
    throw new Error(
      `Could not read PDF text: ${err instanceof Error ? err.message : String(err)}`
    );
  }
  text = sanitizeExtractedText(text);

  const vendor = detectVendor(text);
  if (!vendor) {
    throw new Error('Unrecognized vendor — expected a Harvie or Market Wagon order PDF.');
  }
  const parsed = vendor === 'harvie' ? parseHarvie(text) : parseMarketWagon(text);
  if (parsed.lines.length === 0) {
    throw new Error('No order line items found in the PDF.');
  }
  return parsed;
}
