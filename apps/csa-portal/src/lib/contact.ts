/**
 * contact.ts — single source of truth for the member→farm contact CTAs.
 *
 * Every "get in touch" affordance a MEMBER sees (Contact the farm, "Email
 * Todd for help" on /login, the delivery-issue CTA, etc.) must reach BOTH
 * inboxes so nothing slips through the cracks:
 *   - tinyseedfleurs@gmail.com  — Loren (the CSA comms inbox; primary)
 *   - todd@tinyseedfarmpgh.com — Todd (owner)
 *
 * `mailto:` supports a comma-separated recipient list, so a single CTA can
 * open a pre-addressed draft to both. Per RFC 6068 the list is comma-
 * separated and the address local/domain parts contain no characters that
 * require percent-encoding, so the raw comma list is a valid mailto target
 * across Gmail, Apple Mail, and Outlook.
 *
 * IMPORTANT — scope. This module covers the MEMBER-FACING CONTACT CTAs
 * ONLY. It must NEVER be used for the magic-link from-address or any
 * system/transactional from-address (those live in the email layer and
 * stay as-is).
 */

/** Loren's CSA comms inbox — the PRIMARY address members copy/see. */
export const CSA_PRIMARY_EMAIL = 'tinyseedfleurs@gmail.com';

/** The farm owner — always CC'd on member contact so nothing is missed. */
export const CSA_OWNER_EMAIL = 'todd@tinyseedfarmpgh.com';

/**
 * Both recipients, comma-separated, for use as a `mailto:` target.
 * e.g. `mailto:tinyseedfleurs@gmail.com,todd@tinyseedfarmpgh.com`.
 */
export const CSA_CONTACT_EMAILS = `${CSA_PRIMARY_EMAIL},${CSA_OWNER_EMAIL}`;

/**
 * Build a `mailto:` href that addresses BOTH the CSA comms inbox and the
 * owner, with an optional pre-filled subject and body. Subject/body are
 * URL-encoded for you, so callers pass plain human text.
 *
 * @param subject  Optional plain-text subject (encoded internally).
 * @param body     Optional plain-text body (encoded internally).
 * @returns A `mailto:` URL string safe to drop into an <a href>.
 */
export function contactMailto(subject?: string, body?: string): string {
  const params: string[] = [];
  if (subject) params.push(`subject=${encodeURIComponent(subject)}`);
  if (body) params.push(`body=${encodeURIComponent(body)}`);
  const query = params.length > 0 ? `?${params.join('&')}` : '';
  return `mailto:${CSA_CONTACT_EMAILS}${query}`;
}
