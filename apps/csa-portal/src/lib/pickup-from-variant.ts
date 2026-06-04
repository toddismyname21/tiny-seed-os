/**
 * Pickup-location matcher: Shopify line-item variantTitle → pickup_locations row.
 *
 * BACKGROUND
 * ──────────
 * Shopify CSA products carry the pickup choice as the line item's *variant*
 * (e.g. "Squirrel Hill (CSA CUSTOMER PORCH)", "Bloomfield (SATURDAY FARMER'S
 * MARKET)"). The sync (api/sync/shopify-orders.ts) creates the member row but
 * historically left `pickup_location_id` NULL because nothing read the variant
 * — so ~149 launch members had no pickup recorded. This module is the single
 * source of truth for resolving that variant string to a pickup_locations row.
 *
 * IT IS USED IN TWO PLACES
 *   1. In-line during the Shopify sync (forward-looking: every new order is
 *      auto-assigned a pickup_location_id when its variant resolves).
 *   2. In the nightly health-check cron (self-healing: any active member that
 *      still has NULL pickup gets one filled in from their most recent order).
 *
 * MATCHING LOGIC (strict prefix, NOT greedy keyword)
 * ───────────────────────────────────────────────────
 * Greedy substring matching is dangerous here — "Bloomfield Market" (Saturday
 * market) and "Bloomfield" (a hypothetical Wed CSA stop) would both match a
 * raw `.includes("bloomfield")` against either location name. We've already
 * been burned by this: "Highland Park (Bryant St. Market)" briefly matched the
 * Bloomfield Market location through a fuzzy keyword match.
 *
 * So the algorithm is strictly:
 *
 *   1. Lowercase + trim the raw variantTitle.
 *   2. Detect home-delivery / Allison-Park-TBD up-front (these are explicitly
 *      not pickup locations and must NEVER be auto-assigned).
 *   3. Strip any "$amount / " flex prefix: "$150 / Highland Park (...)" → "Highland Park (...)"
 *   4. Strip the trailing " (detail)" parenthetical: "Highland Park (Bryant St. Market)" → "Highland Park"
 *   5. Apply known rewrite table — these are the specific mismatches between
 *      Shopify's variant text and the canonical pickup_locations.name:
 *        bloomfield        → Bloomfield Market   (SAT market — NOT a Wed CSA stop)
 *        mt lebanon        → Mt. Lebanon         (Shopify lacks the period)
 *        simon             → Simon's             (Shopify drops the apostrophe)
 *        st paul           → St. Paul's          (Shopify drops the period + apostrophe)
 *        everything else   → exact case-insensitive match against location.name
 *   6. Return the matched location's id, or null with a structured reason.
 *
 * NEVER returns a guess. An unmatched variant returns `{locationId: null,
 * reason: "unmatched:<verbatim>"}` so the caller can surface it for human
 * review rather than silently assigning the wrong stop.
 */

/**
 * Minimum shape required from a pickup_locations row. Callers typically pass
 * the full Row but we only depend on id + name. Day-of-week is consumed by
 * the caller (to also set members.pickup_day) but not by the matcher.
 */
export interface PickupLocation {
  id: string;
  name: string;
}

/**
 * Why a match (or non-match) was returned. Stable strings — the caller may
 * branch on these to decide "leave NULL but don't surface as a problem"
 * (home_delivery, allison_park_tbd) versus "leave NULL and surface for
 * review" (unmatched:*).
 *
 *   prefix_match:<head>→<name>   resolved via the rewrite table
 *   exact_match:<name>           resolved via a direct case-insensitive hit
 *   home_delivery                "Home Delivery" / "Delivered" variants — handled separately by sync
 *   allison_park_tbd             "Allison Park (TBD)" — member chooses Simon's or St. Paul's later via PickupNudgeBanner
 *   no_loc_record_for:<target>   the rewrite table named a location that isn't in pickup_locations (data drift)
 *   unmatched:<verbatim>         unknown variant — needs human review
 *   no_variant                   empty / null input
 */
export type MatchReason =
  | `prefix_match:${string}`
  | `exact_match:${string}`
  | 'home_delivery'
  | 'allison_park_tbd'
  | `no_loc_record_for:${string}`
  | `unmatched:${string}`
  | 'no_variant';

export interface MatchResult {
  /** The matched pickup_locations.id, or null when no canonical match. */
  locationId: string | null;
  /** Structured reason — see MatchReason above. */
  reason: MatchReason;
}

/**
 * Known rewrites from the lowercased, paren-stripped, dollar-prefix-stripped
 * "head" of the variant title to the canonical pickup_locations.name. Keep in
 * sync with the actual rows in pickup_locations.
 *
 * NOTE on "bloomfield": the Wed-window Bloomfield CSA stop does NOT exist as
 * a separate pickup_locations row in 2026 — the only Bloomfield row IS the
 * Saturday farmers' market. So a variant of "Bloomfield (...)" deliberately
 * maps to "Bloomfield Market" (the SAT market).
 */
const REWRITES: ReadonlyMap<string, string> = new Map([
  ['bloomfield',     'Bloomfield Market'],
  ['mt. lebanon',    'Mt. Lebanon'],
  ['mt lebanon',     'Mt. Lebanon'],
  ['simon',          "Simon's"],
  ["simon's",        "Simon's"],
  ['st paul',        "St. Paul's"],
  ["st. paul's",     "St. Paul's"],
  ["st. paul",       "St. Paul's"],
]);

/**
 * Resolve a Shopify line-item variantTitle to a pickup_locations row.
 *
 * @param variantTitle      The raw line-item variantTitle from Shopify (may be null/empty).
 * @param pickupLocations   The full live set of pickup_locations rows to match against.
 *                          Pass everything `is_active=true`; we case-insensitive-compare on `.name`.
 *
 * @returns {MatchResult}   `{locationId, reason}` — locationId non-null on a successful match.
 *                          Callers MUST handle the null + reason cases (home_delivery,
 *                          allison_park_tbd, unmatched:*) explicitly — never auto-assign
 *                          on a null match.
 *
 * Pure / side-effect free / deterministic — safe to use anywhere.
 */
export function matchVariantToPickup(
  variantTitle: string | null | undefined,
  pickupLocations: ReadonlyArray<PickupLocation>
): MatchResult {
  // 1. Trivial reject — nothing to match.
  if (!variantTitle || variantTitle.trim().length === 0) {
    return { locationId: null, reason: 'no_variant' };
  }

  const rawTrimmed = variantTitle.trim();
  const lower = rawTrimmed.toLowerCase();

  // 2. Home delivery — handled by the caller's delivery_address branch, not by
  //    pickup_location_id. Detect early to bypass the rewrite/exact logic.
  //    Matches "Home Delivery — $15/wk", "Home Delivery (...)", "Delivered (...)"
  //    and the legacy "Home Delivery" spelling.
  if (lower.includes('home delivery') || lower.startsWith('delivered')) {
    return { locationId: null, reason: 'home_delivery' };
  }

  // 3. Allison Park (TBD) — these orders intentionally don't have a pickup
  //    location yet. The member is funnelled through PickupNudgeBanner to
  //    pick Simon's or St. Paul's. NEVER auto-assign one of them here.
  if (lower.includes('allison park')) {
    return { locationId: null, reason: 'allison_park_tbd' };
  }

  // 4. Strip the optional "$amount / " flex prefix.
  //    e.g. "$150 / Highland Park (Bryant St. Market)" → "Highland Park (Bryant St. Market)"
  let head = lower;
  if (head.includes(' / ')) {
    const parts = head.split(' / ');
    // Take the LAST segment — robust to weirdness like "$X / $Y / Location".
    head = parts[parts.length - 1] ?? head;
  }

  // 5. Strip the trailing " (detail)" parenthetical (most variants have one).
  const parenIdx = head.indexOf(' (');
  if (parenIdx > 0) {
    head = head.slice(0, parenIdx);
  }
  head = head.trim();

  if (head.length === 0) {
    // The variant was entirely a parenthetical — nothing left to match.
    return { locationId: null, reason: `unmatched:${rawTrimmed.slice(0, 60)}` };
  }

  // 6. Rewrite table — handles the Shopify-vs-canonical-name mismatches.
  const targetName = REWRITES.get(head);
  if (targetName) {
    const match = pickupLocations.find(
      (loc) => (loc.name ?? '').toLowerCase() === targetName.toLowerCase()
    );
    if (match) {
      return { locationId: match.id, reason: `prefix_match:${head}→${match.name}` };
    }
    // The rewrite told us where to go, but the destination row doesn't exist
    // (data drift). Surface for review rather than silently failing.
    return { locationId: null, reason: `no_loc_record_for:${targetName}` };
  }

  // 7. Final fallback — exact case-insensitive match against the location name.
  //    This handles all the locations where Shopify's variant text already
  //    matches our canonical name (Highland Park, Squirrel Hill, North Side,
  //    Fox Chapel, Lawrenceville, Cranberry, Oakmont, Shadyside, Zelienople,
  //    Rochester, Mercer, South Side, North Park, etc.).
  const exact = pickupLocations.find(
    (loc) => (loc.name ?? '').toLowerCase() === head
  );
  if (exact) {
    return { locationId: exact.id, reason: `exact_match:${exact.name}` };
  }

  // 8. Unknown — surface verbatim so a human can investigate.
  return { locationId: null, reason: `unmatched:${rawTrimmed.slice(0, 60)}` };
}
