/**
 * route-order.ts — the CURATED FARM-LOOP delivery sequence.
 *
 * Single source of truth for the order the truck drives on the Wednesday
 * run. The truck leaves THE FARM (257 Zeigler Rd, Rochester PA 15074) and
 * loops out, returning to the farm:
 *
 *   NW Butler loop  — New Brighton (15066) → Zelienople (16063) →
 *                     Harmony (16037) → Cranberry (16066) → Seven Fields (16046)
 *   North Hills     — North Park/Gibsonia (15044) → Allison Park (15101) →
 *                     Fox Chapel (15215) → 15237 North Hills
 *   City            — North Side (15212) → Melwood/Oakland (15213) →
 *                     Highland Park (15206) → Oakmont (15139) →
 *                     Squirrel Hill (15217)
 *   South           — South Side / Jane St (15203) → Mt. Lebanon (15216) →
 *                     15243
 *
 * Raw zip-ascending is WRONG (it puts North Park 15044 first); this is a
 * hand-built loop keyed by zip. Used by BOTH:
 *   - /admin/route-sheet/[week]  (the printable, zip-sorted route sheet)
 *   - POST /api/admin/route       (auto-seeding stop_order in farm-loop order)
 * so the printed sheet and the driver app agree on stop order.
 *
 * A zip not in the list (or a row with no extractable zip) ranks AFTER every
 * known zip — it lands at the end of the loop (just before the RETURN), never
 * silently first.
 */

/** The curated farm-loop zip sequence. Index = position in the drive order. */
export const ZIP_ROUTE_ORDER: readonly string[] = [
  '15066', // New Brighton
  '16063', // Zelienople
  '16037', // Harmony
  '16066', // Cranberry
  '16046', // Seven Fields
  '15044', // North Park / Gibsonia
  '15101', // Allison Park
  '15215', // Fox Chapel
  '15237', // North Hills
  '15212', // North Side
  '15213', // Melwood / Oakland
  '15206', // Highland Park
  '15139', // Oakmont
  '15217', // Squirrel Hill
  '15203', // South Side / Jane St
  '15216', // Mt. Lebanon
  '15243',
];

/** Sentinel rank for an unknown / missing zip — sorts after every known zip. */
export const UNKNOWN_RANK = Number.MAX_SAFE_INTEGER;

/**
 * Extract the first 5-digit ZIP from a free-form address (`\b\d{5}\b`).
 * Returns '' when none is found.
 */
export function extractZip(addr: string | null | undefined): string {
  if (!addr) return '';
  const m = String(addr).match(/\b(\d{5})\b/);
  return m ? m[1]! : '';
}

/**
 * Map a zip OR a free-form address to its position in the farm loop.
 *
 * Accepts either:
 *   - a bare 5-digit zip ('15066')          → looked up directly
 *   - a free-form address ('759 Spring St, Harmony PA 16037')
 *                                            → zip is extracted, then looked up
 *
 * A known zip returns its loop index (0-based). An unknown zip, an empty
 * string, or an address with no extractable zip returns {@link UNKNOWN_RANK},
 * which sorts after all known stops. Pair with a zip/title tiebreak for a
 * fully deterministic sort (see sortByRouteOrder).
 */
export function routeRank(zipOrAddress: string | null | undefined): number {
  if (!zipOrAddress) return UNKNOWN_RANK;
  const raw = String(zipOrAddress).trim();
  // Already a bare 5-digit zip? Use it directly; else pull a zip out of the
  // address text. (A 5-digit-only string passes extractZip too, but this
  // short-circuit avoids the regex on the common bare-zip path.)
  const zip = /^\d{5}$/.test(raw) ? raw : extractZip(raw);
  if (!zip) return UNKNOWN_RANK;
  const i = ZIP_ROUTE_ORDER.indexOf(zip);
  return i === -1 ? UNKNOWN_RANK : i;
}

/**
 * Comparator factory for sorting a list into farm-loop order.
 *
 * Sorts by routeRank ASC. Ties (same rank — same known zip, OR both in the
 * unknown bucket) fall back to zip-ascending (empty zip last), then to a
 * caller-supplied title, so the order is deterministic run-to-run.
 *
 * @param zipOf    extracts the zip-or-address-derived zip from an item
 * @param titleOf  optional final tiebreak label (defaults to '')
 */
export function sortByRouteOrder<T>(
  zipOf: (item: T) => string,
  titleOf: (item: T) => string = () => ''
): (a: T, b: T) => number {
  return (a, b) => {
    const za = zipOf(a);
    const zb = zipOf(b);
    const ra = routeRank(za);
    const rb = routeRank(zb);
    if (ra !== rb) return ra - rb;
    // Same rank. For two known zips this means same zip → title sort. For the
    // unknown bucket (both UNKNOWN_RANK) fall back to zip-ascending (empty zip
    // sorts last among them), then title.
    if (za !== zb) {
      if (!za) return 1;
      if (!zb) return -1;
      return za < zb ? -1 : 1;
    }
    return titleOf(a).localeCompare(titleOf(b));
  };
}
