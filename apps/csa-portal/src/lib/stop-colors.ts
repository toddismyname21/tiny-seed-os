/**
 * src/lib/stop-colors.ts — the SHARED stop-band color system.
 *
 * This is a faithful copy of the band palette + deterministic mapping used by
 * the print documents /admin/labels, /admin/stop-manifest, and /admin/pack-check
 * so a given stop reads the SAME color on every printed page (the driver pairs
 * the colored box-label sticker with the colored band on the manifest / route
 * sheet at a glance).
 *
 * THE MAPPING (must be identical everywhere — DO NOT change in isolation):
 *   1. Take ALL active stops for the cycle: `cycle.activeStops`.
 *   2. Sort them by `stop_name.localeCompare` (name-only, ascending).
 *   3. The i-th stop in that sorted list gets STOP_BANDS[i % STOP_BANDS.length].
 *   4. The home-delivery sentinel bucket gets the distinct HOME_DELIVERY_BAND.
 *   5. Any unmapped / sentinel stop falls back to NO_STOP_BAND.
 *
 * CRITICAL: callers MUST pass the SAME input list (all active stops of the
 * cycle) so the index of a stop like "Highland Park" is the same on every page.
 * Passing a filtered subset (e.g. only the routed Wednesday stops) would shift
 * indices and break the color match.
 *
 * Fixed hex (NOT theme tokens) on purpose: these are color-print documents and
 * the colors must reproduce identically on paper — pair every rendered band
 * with `print-color-adjust: exact` so the browser keeps the background.
 *
 * NOTE: the labels / manifest / pack-check pages currently inline their own
 * identical copies of these constants. This lib is imported by the route sheet
 * only for now; the others can be migrated to import from here later without any
 * behavior change (the values here match theirs exactly).
 */

export interface BandColor {
  bg: string;
  text: string;
}

/** Curated 15-band palette — index = stop's position in the name-sorted list. */
export const STOP_BANDS: BandColor[] = [
  { bg: '#1f6f54', text: '#ffffff' }, // pine green
  { bg: '#2563a8', text: '#ffffff' }, // ocean blue
  { bg: '#9c3d8f', text: '#ffffff' }, // plum
  { bg: '#b8431f', text: '#ffffff' }, // burnt orange
  { bg: '#6b4fbb', text: '#ffffff' }, // violet
  { bg: '#0f7d8c', text: '#ffffff' }, // teal
  { bg: '#a8901c', text: '#1a1400' }, // mustard (dark text)
  { bg: '#c43c64', text: '#ffffff' }, // raspberry
  { bg: '#3f7d27', text: '#ffffff' }, // leaf green
  { bg: '#4d5fa8', text: '#ffffff' }, // indigo
  { bg: '#b5602a', text: '#ffffff' }, // copper
  { bg: '#117a63', text: '#ffffff' }, // emerald
  { bg: '#8a4b9c', text: '#ffffff' }, // grape
  { bg: '#9e7b15', text: '#1a1400' }, // ochre (dark text)
  { bg: '#5b6770', text: '#ffffff' }, // slate (neutral fallback band)
];

/** Fallback for sentinel / unmapped stops (e.g. "no pickup set"). */
export const NO_STOP_BAND: BandColor = { bg: '#475569', text: '#ffffff' };

/** Distinct, never-reused home-delivery band (warm orange) — matches labels. */
export const HOME_DELIVERY_BAND: BandColor = { bg: '#c2410c', text: '#ffffff' };

/** Minimal shape needed to build the mapping — a subset of cycle's StopTotals. */
export interface StopLike {
  stop_id: string;
  stop_name: string;
}

/**
 * Build the deterministic stop_id → band color map for a cycle.
 *
 * @param activeStops  ALL active stops for the cycle (cycle.activeStops). Pass
 *                     the full list — NOT a filtered subset — or indices shift
 *                     and colors stop matching the labels.
 * @returns Map keyed by stop_id. Home-delivery + unmapped stops are NOT in this
 *          map; resolve those via `bandForStop` below.
 */
export function buildStopBandMap(activeStops: readonly StopLike[]): Map<string, BandColor> {
  const stopBandById = new Map<string, BandColor>();
  const sortedStops = activeStops
    .slice()
    .sort((a, b) => a.stop_name.localeCompare(b.stop_name));
  sortedStops.forEach((s, idx) => {
    stopBandById.set(s.stop_id, STOP_BANDS[idx % STOP_BANDS.length]);
  });
  return stopBandById;
}

/**
 * Resolve a stop's band color. Home-delivery sentinel → the distinct warm band;
 * a mapped pickup stop → its palette color; anything else → NO_STOP_BAND.
 *
 * @param stopId               the stop's id (or HOME_DELIVERY_BUCKET_ID).
 * @param stopBandById         map from buildStopBandMap(cycle.activeStops).
 * @param homeDeliveryBucketId the cycle's HOME_DELIVERY_BUCKET_ID sentinel.
 */
export function bandForStop(
  stopId: string,
  stopBandById: Map<string, BandColor>,
  homeDeliveryBucketId: string,
): BandColor {
  if (stopId === homeDeliveryBucketId) return HOME_DELIVERY_BAND;
  return stopBandById.get(stopId) ?? NO_STOP_BAND;
}
