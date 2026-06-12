/**
 * US mobile phone normalization + validation.
 *
 * Single source of truth shared by:
 *   - middleware.ts          (the sign-in phone gate — decides whether a
 *                             member is forced to /account/add-phone)
 *   - /api/account/add-phone (the interstitial save endpoint)
 *   - /account/index.astro / dashboard.astro (read-side "has a valid phone?"
 *     checks should agree with the gate so the UI never disagrees with the
 *     redirect)
 *
 * WHY THIS EXISTS (Todd directive, 2026-06-08): we text members when their
 * share arrives, so a valid cell number is REQUIRED. The portal gates on it
 * at sign-in. Keeping the normalize + validate rules in one place means the
 * gate, the save, and any read-side display all agree on what "valid" means.
 *
 * Rules (intentionally simple — US numbers only, the farm's market):
 *   - Strip everything except digits.
 *   - Accept a leading US country code "1" on an 11-digit number (drop it).
 *   - A valid number is then exactly 10 digits whose area code (first
 *     digit) and exchange (4th digit) are 2–9 — the NANP rule that rejects
 *     obviously-bogus numbers like 000-/1xx- prefixes.
 *   - Stored canonical form is the bare 10 digits ("4124073884"). Display
 *     formatting is a separate concern (formatUSPhone).
 *
 * Pure + dependency-free so it is import-safe from middleware, API routes,
 * SSR pages, and tests.
 */

/**
 * Normalize free-form input to the canonical 10-digit US number, or null
 * when it is not a valid US phone.
 *
 * Examples:
 *   "(412) 407-3884"  → "4124073884"
 *   "412-407-3884"    → "4124073884"
 *   "+1 412 407 3884" → "4124073884"
 *   "14124073884"     → "4124073884"
 *   ""                → null
 *   "123"             → null
 *   "0124073884"      → null  (area code can't start with 0/1)
 */
export function normalizeUSPhone(input: string | null | undefined): string | null {
  if (input == null) return null;
  let digits = String(input).replace(/\D/g, '');

  // Drop a leading US country code on an 11-digit string.
  if (digits.length === 11 && digits.startsWith('1')) {
    digits = digits.slice(1);
  }

  if (digits.length !== 10) return null;

  // NANP: area code (N) and exchange code (N) first digits are 2–9.
  const areaFirst = digits.charCodeAt(0) - 48; // '0'..'9' → 0..9
  const exchangeFirst = digits.charCodeAt(3) - 48;
  if (areaFirst < 2 || areaFirst > 9) return null;
  if (exchangeFirst < 2 || exchangeFirst > 9) return null;

  return digits;
}

/** True when `input` normalizes to a valid US 10-digit number. */
export function isValidUSPhone(input: string | null | undefined): boolean {
  return normalizeUSPhone(input) !== null;
}

/**
 * Does this stored `customers.phone` value satisfy the sign-in gate?
 *
 * The gate and the read-side UI both call this so they never disagree.
 * An empty/whitespace value or anything that doesn't normalize to a valid
 * US 10-digit number fails (→ member is forced to the add-phone screen).
 */
export function phoneSatisfiesGate(stored: string | null | undefined): boolean {
  if (stored == null) return false;
  if (String(stored).trim().length === 0) return false;
  return isValidUSPhone(stored);
}

/**
 * Pretty "(412) 407-3884" from any valid input, or the trimmed original
 * (never empty) when it can't be normalized — so we never blank out a
 * legacy number we couldn't parse.
 */
export function formatUSPhone(input: string | null | undefined): string {
  const digits = normalizeUSPhone(input);
  if (!digits) return (input ?? '').trim();
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}
