/**
 * mw-ticket.ts — find THIS WEEK's Market Wagon "Pick Ticket" link from Gmail.
 *
 * Market Wagon emails todd@tinyseedfarmpgh.com every Monday ~5:25 AM ET from
 * no-reply@marketwagon.com, subject "Pick Ticket - MM-DD-YYYY". The HTML body
 * carries a LOGIN-GATED link:
 *
 *     https://admin.marketwagon.com/pages/picktickets/?pID=<id>&sID=12590
 *
 * We can't auto-fetch it (it needs Todd's logged-in browser session). What we
 * CAN do is hand him the exact URL so there's zero inbox-digging: the Monday
 * "Today" deck surfaces "Open pick ticket ↗" pointing straight at it. Todd
 * clicks it (already logged in), prints to PDF, and uploads at
 * /admin/wholesale/import — the existing manual path, unchanged.
 *
 * This is READ-ONLY: it only lists + reads Gmail messages. It reuses the exact
 * OAuth refresh + search + message-fetch helpers the Harvie auto-import uses
 * (harvie-ingest.ts), so there is ONE Gmail integration, not two.
 *
 * FAIL-SOFT CONTRACT: any Gmail error (outage, token refresh, missing config,
 * no matching mail) resolves to `null`. It must NEVER throw — the caller (the
 * admin-home deck) renders fine without a link, falling back to the manual
 * upload instructions.
 */
import {
  getGmailAccessToken,
  gmailSearch,
  gmailGetMessage,
  type GmailPart,
} from './harvie-ingest';

/** Recent Market Wagon pick-ticket notifications (newest first). 5 days covers
 *  a late look-back if Todd checks Tue morning after a Mon 5:25 AM send. */
const MW_QUERY = 'from:no-reply@marketwagon.com subject:"Pick Ticket" newer_than:5d';

/** The link + when the email arrived, for the "arrived <time>" microcopy. */
export interface MwPickTicket {
  /** Fully-qualified admin.marketwagon.com pick-ticket URL (login-gated). */
  url: string;
  /** ISO timestamp the notification email arrived (from Gmail internalDate). */
  emailDate: string;
}

/**
 * Extract the FIRST Market Wagon pick-ticket URL from a message body.
 *
 * The body is raw email HTML, so the link's `&` separators arrive HTML-encoded
 * as `&amp;` (e.g. `...?pID=123&amp;sID=12590`) and the URL is usually wrapped
 * in an `href="..."` / `href='...'`. We match up to the next whitespace or
 * angle bracket, then:
 *   1. decode `&amp;` back to `&` so the query string is usable, and
 *   2. strip any trailing quote/apostrophe artifact — a stray trailing `'` (or
 *      `"`) has been observed clinging to the extracted URL when the href is
 *      single/double-quoted.
 *
 * Exported so the regex behavior is unit-traceable. Returns null if no MW
 * pick-ticket link is present.
 */
export function extractMwPickTicketLink(body: string): string | null {
  // Stop only at whitespace / angle brackets so a quote-wrapped href KEEPS its
  // trailing quote in the raw match — which we then strip below. This is what
  // reproduces (and cleans) the observed trailing-quote artifact.
  const match = body.match(
    /https:\/\/admin\.marketwagon\.com\/pages\/picktickets\/\?[^\s<>]+/i,
  );
  if (!match) return null;
  let url = match[0];
  url = url.replace(/&amp;/gi, '&');   // HTML-entity decode the query separators
  url = url.replace(/['"]+$/, '');     // strip trailing quote/apostrophe artifact
  return url;
}

/** Depth-first collect decoded text from every text/html + text/plain MIME part. */
function collectBodyText(part: GmailPart | undefined): string {
  if (!part) return '';
  let out = '';
  const mime = part.mimeType ?? '';
  if ((mime === 'text/html' || mime === 'text/plain') && part.body?.data) {
    try {
      out += Buffer.from(part.body.data, 'base64url').toString('utf8');
    } catch {
      /* one undecodable part must not sink the whole read */
    }
  }
  for (const child of part.parts ?? []) out += '\n' + collectBodyText(child);
  return out;
}

/**
 * Find the newest Market Wagon pick-ticket link in the last 5 days.
 *
 * Returns `{ url, emailDate }` for the most-recent message that actually
 * contains a pick-ticket link, or `null` if there's no such mail (or on ANY
 * Gmail error — fail-soft, never throws).
 */
export async function findLatestMwPickTicketLink(): Promise<MwPickTicket | null> {
  try {
    const accessToken = await getGmailAccessToken();
    const ids = await gmailSearch(accessToken, MW_QUERY, 10); // newest first
    if (ids.length === 0) return null;

    // Walk newest → older, returning the first message that yields a link.
    for (const id of ids) {
      try {
        const message = await gmailGetMessage(accessToken, id);
        const url = extractMwPickTicketLink(collectBodyText(message.payload));
        if (url) {
          const emailDate = message.internalDate
            ? new Date(Number(message.internalDate)).toISOString()
            : new Date().toISOString();
          return { url, emailDate };
        }
      } catch (perMsg) {
        // One unreadable message must not abort the search — try the next.
        console.error('[mw-ticket] message read failed (continuing):', perMsg);
      }
    }
    return null;
  } catch (e) {
    console.error('[mw-ticket] findLatestMwPickTicketLink failed (fail-soft → null):', e);
    return null;
  }
}
