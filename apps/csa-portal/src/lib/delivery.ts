/**
 * Delivery tracking — state derivation + Apps Script bridge.
 *
 * Phase 1 of the CSA delivery-tracking work (Day 9). The wholesale
 * driver app currently writes per-stop status to Google Sheets via Apps
 * Script. This module reads that data back, filters to a single member's
 * stop for today, and translates it into one of six widget states:
 *
 *   none              ─ no delivery today or member has no active share.
 *                       Caller should hide the widget.
 *   packed            ─ pre-delivery (driver hasn't clocked in, or stop
 *                       is "Pending" before driver clocked in).
 *   out_for_delivery  ─ driver is on the road, this member's stop is
 *                       upcoming but not imminent.
 *   near_you          ─ driver is the next stop or two on the route.
 *   delivered         ─ stop status = "Delivered" (Completed_At set).
 *   issue             ─ stop status = "Issue: <type>" (driver flagged).
 *
 * Phase 2 (during wholesale migration): the driver app moves to Postgres
 * and this module's polling is replaced by a Supabase Realtime channel
 * subscription. The deriveState() function is intentionally pure (no
 * I/O, no Apps Script knowledge) so it can be reused unchanged.
 *
 * SHEET SCHEMA NOTE: `SALES_DeliveryStops` columns (apps_script/MERGED
 * TOTAL.js @42043) — Stop_ID, Route_ID, Stop_Order, Order_ID,
 * Customer_Name, Address, Phone, Delivery_Window, ETA, Status,
 * Arrived_At, Completed_At, Photo_URL, Signature_URL, GPS_Lat, GPS_Lng,
 * Issue_Type, Issue_Notes.
 *
 * The Apps Script endpoint `getDeliveryHistory` currently filters by
 * Driver_ID, NOT Customer_ID — meaning a CSA member's GET will return
 * an empty `deliveries` array. We treat that as the "fail soft" branch
 * per the spec's risk table ("Driver doesn't update status — widget
 * falls back gracefully"). The endpoint contract is fully defined here
 * so when the wholesale migration adds customer-scoped queries (or we
 * move to Postgres), only the upstream changes — the widget keeps
 * working.
 */

/* ──────────────────────────────────────────────────────────────────
 * Apps Script endpoint
 * ────────────────────────────────────────────────────────────────── */

/**
 * Apps Script deployment — the canonical Tiny Seed OS backend. Mirror
 * of `TINY_SEED_API.MAIN_API` in `web_app/api-config.js`. We pin the
 * value here (server-only module) rather than importing the JS shim,
 * which is browser-globals-based and not safe to evaluate under Astro
 * SSR. If the deployment ID rotates, update both places per
 * CLAUDE.md → "NEVER use any API URL other than the one in api-config.js".
 */
export const APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbyT60fyrNfmZkgK3z1-ojgISeZBAbBr9Zz50UtSjqSysE5JpB_cAIjp2KFucwREG4qm/exec';

/* ──────────────────────────────────────────────────────────────────
 * Public types
 * ────────────────────────────────────────────────────────────────── */

export type DeliveryState =
  | 'none'
  | 'packed'
  | 'out_for_delivery'
  | 'near_you'
  | 'delivered'
  | 'issue';

/**
 * Normalized status snapshot for one member's delivery on one day.
 * The shape is the OUTPUT of this module — the input from Apps Script
 * is loosely typed and goes through validation in `parseAppsScriptStop`.
 *
 * `driver_name` is first-name only (privacy — per spec, members never
 * see a driver's full name or phone number).
 */
export interface DeliveryStatus {
  state: DeliveryState;
  /** ISO-8601 timestamp or HH:MM string from the sheet. */
  eta: string | null;
  /** First name only — e.g. "Mark", never "Mark Johnson". */
  driver_name: string | null;
  /** ISO timestamp when the driver marked Delivered. */
  completed_at: string | null;
  /** Google Drive / Cloud Storage URL for the proof-of-delivery photo. */
  photo_url: string | null;
  /** Free-text notes when state === 'issue'. */
  issue_notes: string | null;
  /** ISO timestamp of THIS server-side fetch (so the client can show "Updated 12s ago"). */
  last_updated: string;
}

/**
 * Raw Apps Script stop row. The Apps Script side returns the sheet
 * column names verbatim (PascalCase + underscores). Some fields may
 * be missing if the sheet is incomplete.
 */
export interface AppsScriptStop {
  Stop_ID?: string;
  Route_ID?: string;
  Stop_Order?: number;
  Order_ID?: string;
  Customer_Name?: string;
  Address?: string;
  Phone?: string;
  Delivery_Window?: string;
  ETA?: string;
  /** "Pending" | "In Transit" | "Approaching" | "Delivered" | "Issue: <type>" | ... */
  Status?: string;
  Arrived_At?: string;
  Completed_At?: string;
  Photo_URL?: string;
  Signature_URL?: string;
  GPS_Lat?: number;
  GPS_Lng?: number;
  Issue_Type?: string;
  Issue_Notes?: string;
  /** Routes sheet joins this on Route_ID. Apps Script may or may not include it depending on endpoint. */
  Driver_Name?: string;
  /** Wholesale-style nested shape from getWholesaleDeliveryStatus. */
  driverName?: string;
  eta?: string;
  completedAt?: string;
  proofPhotoUrl?: string;
  deliveryStatus?: string;
  date?: string;
}

/* ──────────────────────────────────────────────────────────────────
 * Pure helpers
 * ────────────────────────────────────────────────────────────────── */

/**
 * Pittsburgh-local YYYY-MM-DD for "today" — used to filter Apps Script
 * deliveries to the current day. America/New_York handles EDT/EST.
 */
export function todayET(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/**
 * Three-letter weekday in America/New_York. Returns 'Sun'..'Sat'.
 * Matches `members.pickup_day` + `pickup_locations.day_of_week` enums.
 */
export function todayWeekdayET(now: Date = new Date()): string {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    weekday: 'short',
  });
  // "Wed" — already in the right format.
  return fmt.format(now);
}

/**
 * Returns just the first whitespace-separated token from a name.
 * Used to render "Driver Mark" not "Driver Mark Johnson" per spec
 * privacy rules.
 */
export function firstNameOf(fullName: string | null | undefined): string | null {
  if (!fullName) return null;
  const trimmed = String(fullName).trim();
  if (trimmed.length === 0) return null;
  const first = trimmed.split(/\s+/)[0];
  return first ?? null;
}

/**
 * The widget is hidden for self-pickup farm locations — those members
 * walk up to the farm; no driver brings their box.
 *
 * Match rule: case-insensitive name contains "Rochester" AND ("farm"
 * OR "pickup"). Defensive against future renames ("Farm Pickup —
 * Rochester", "Rochester (Farm)", etc.) while not catching unrelated
 * future stops in Rochester proper (none exist today). If a host stop
 * in Rochester is ever added that gets driver delivery, we'll tighten
 * the check to an explicit location_id allow-list.
 */
export function isFarmPickup(pickupLocationName: string | null | undefined): boolean {
  if (!pickupLocationName) return false;
  const n = pickupLocationName.toLowerCase();
  return n.includes('rochester') && (n.includes('farm') || n.includes('pickup'));
}

/**
 * Pull the most-specific status string we can find from an Apps Script
 * row. Handles two shapes: the canonical SALES_DeliveryStops column
 * names (PascalCase + underscores) and the lowerCamelCase wrapper from
 * `getWholesaleDeliveryStatus`.
 */
function readStatus(stop: AppsScriptStop): string {
  return String(stop.Status ?? stop.deliveryStatus ?? '').trim();
}

/**
 * deriveState — pure, no I/O. The single source of truth for "what
 * does this stop look like to the member?"
 *
 * Order of checks matters — once we identify an issue or a completed
 * delivery, we stop, since those are terminal. Then we check whether
 * the driver has clocked in (Stop_Order > 0 with a Status that isn't
 * Pending), then near_you, then default to packed.
 *
 * If `stop` is null/undefined, we return 'none' — caller hides the
 * widget. Use this when there's no row for the member's stop today.
 */
export function deriveState(stop: AppsScriptStop | null | undefined): DeliveryState {
  if (!stop) return 'none';

  const statusRaw = readStatus(stop);
  const status = statusRaw.toLowerCase();

  // Terminal states — check first.
  if (stop.Completed_At || stop.completedAt || status === 'delivered' || status === 'completed') {
    return 'delivered';
  }
  if (status.startsWith('issue') || stop.Issue_Type || stop.Issue_Notes) {
    return 'issue';
  }

  // "approaching" is a status the driver app sets when a stop is the
  // next 1–2 on the active route. Match liberally — also covers
  // "near", "nearby", "approaching customer".
  if (status.includes('approach') || status.includes('near')) {
    return 'near_you';
  }

  // In-transit / out for delivery — driver has clocked in and is
  // making the route. Cover several phrasings the driver app + manual
  // edits both produce.
  if (
    status.includes('transit') ||
    status.includes('out for') ||
    status === 'on route' ||
    status === 'enroute' ||
    status === 'en route' ||
    stop.Arrived_At
  ) {
    return 'out_for_delivery';
  }

  // Default: a row exists for today, but the driver hasn't picked it
  // up yet. Show "your box is being packed".
  return 'packed';
}

/* ──────────────────────────────────────────────────────────────────
 * Apps Script bridge
 * ────────────────────────────────────────────────────────────────── */

/**
 * Fetch the member's delivery status for TODAY from Apps Script and
 * normalize it into a DeliveryStatus. Falls back to `state: 'none'` on
 * any upstream failure (fail soft — the widget hides rather than
 * showing a broken card).
 *
 * @param legacyId — `customers.legacy_id`. The Apps Script side keys
 *                   wholesale deliveries by `Customer_ID` which is the
 *                   Sheets-side legacy id, NOT the Supabase UUID.
 * @param now      — clock injection point for tests; defaults to
 *                   `new Date()`. Determines "today" in America/New_York.
 *
 * The function does NOT throw. Any error path returns a status object
 * with `state: 'none'` so callers can render unconditionally.
 */
export async function fetchDeliveryStatus(
  legacyId: string,
  now: Date = new Date()
): Promise<DeliveryStatus> {
  const nowISO = now.toISOString();
  const empty: DeliveryStatus = {
    state: 'none',
    eta: null,
    driver_name: null,
    completed_at: null,
    photo_url: null,
    issue_notes: null,
    last_updated: nowISO,
  };

  if (!legacyId || legacyId.trim().length === 0) {
    // Member has no legacy id — they're a CSA-only signup with no
    // wholesale order history. Driver app today only writes wholesale
    // stops; nothing to look up. Hide the widget.
    return empty;
  }

  // Apps Script HTTP GET. We pass `customerId` even though the current
  // `getDeliveryHistory` implementation filters by driverId — when the
  // backend grows a customer-scoped variant (or we move to Postgres),
  // this call signature is the contract.
  const url = new URL(APPS_SCRIPT_URL);
  url.searchParams.set('action', 'getDeliveryHistory');
  url.searchParams.set('customerId', legacyId);
  url.searchParams.set('limit', '5');

  // Apps Script can be slow (~3-5s p99). Cap at 8s so the dashboard
  // SSR doesn't hang. On timeout we fail soft → widget hides.
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8_000);

  try {
    const res = await fetch(url.toString(), {
      method: 'GET',
      // Apps Script doesn't honor Cache-Control on inbound — but Astro
      // / Vercel might. `no-store` keeps any intermediate proxy from
      // serving a stale tracker.
      headers: { 'Cache-Control': 'no-store' },
      signal: controller.signal,
    });

    if (!res.ok) return empty;

    const data = (await res.json()) as {
      success?: boolean;
      deliveries?: AppsScriptStop[];
      error?: string;
    };

    if (!data || data.success === false || !Array.isArray(data.deliveries)) {
      return empty;
    }

    // Filter to TODAY's stop (America/New_York). Apps Script returns
    // `Delivery_Date` in the routes sheet, but `getDeliveryHistory`
    // sometimes returns the stop directly with no date — match
    // generously (Completed_At date OR explicit `date`/`Delivery_Date`
    // field matches today ET).
    const today = todayET(now);
    const todays = data.deliveries.filter((stop) => {
      const candidate =
        stop.date ??
        (stop as { Delivery_Date?: string }).Delivery_Date ??
        stop.completedAt ??
        stop.Completed_At ??
        stop.Arrived_At;
      if (!candidate) return false;
      // Compare YYYY-MM-DD prefix in America/New_York. The raw string
      // might be ISO ("2026-05-13T16:30:00Z") or a date-only
      // ("2026-05-13") or a JS Date.toString() — handle all three.
      const parsed = new Date(candidate);
      if (Number.isNaN(parsed.getTime())) {
        // String fallback: just look for today's YYYY-MM-DD anywhere
        // in the string. Works for "2026-05-13" and ISO timestamps.
        return String(candidate).slice(0, 10) === today;
      }
      return todayET(parsed) === today;
    });

    const stop = todays[0] ?? null;
    if (!stop) return empty;

    return {
      state: deriveState(stop),
      eta: (stop.ETA ?? stop.eta ?? null) || null,
      driver_name: firstNameOf(stop.Driver_Name ?? stop.driverName ?? null),
      completed_at: (stop.Completed_At ?? stop.completedAt ?? null) || null,
      photo_url: (stop.Photo_URL ?? stop.proofPhotoUrl ?? null) || null,
      issue_notes: (stop.Issue_Notes ?? null) || null,
      last_updated: nowISO,
    };
  } catch (err) {
    // Includes AbortError on timeout + network failures + JSON parse
    // failures. Always fail soft.
    console.error('[delivery] Apps Script fetch failed:', err instanceof Error ? err.message : err);
    return empty;
  } finally {
    clearTimeout(timeoutId);
  }
}

/* ──────────────────────────────────────────────────────────────────
 * Dashboard gate
 * ────────────────────────────────────────────────────────────────── */

/**
 * Gate — should the dashboard render <DeliveryTracker /> today?
 *
 * Three conditions per spec:
 *   1. Today IS the member's pickup day (per pickup_locations.day_of_week
 *      OR members.pickup_day OR the day_of_week on the delivery zone).
 *   2. Member has an active membership (status === 'active' — passed
 *      in by the caller; this helper doesn't query DB).
 *   3. Pickup is NOT the farm self-pickup (Rochester) — those members
 *      walk up to the farm, no driver involved.
 *
 * Caller passes the member's pickup_location row (or null if home
 * delivery — home delivery DOES get tracked). The function returns
 * the boolean gate; the dashboard wraps the widget in `{gate && ...}`.
 */
export interface TrackerGateInput {
  pickup_day: string | null;
  pickup_location_name: string | null;
  pickup_location_day: string | null;
  is_home_delivery: boolean;
  is_active_status: boolean;
}

export function shouldShowTracker(input: TrackerGateInput, now: Date = new Date()): boolean {
  if (!input.is_active_status) return false;

  // Farm pickup → no driver, no tracking.
  if (!input.is_home_delivery && isFarmPickup(input.pickup_location_name)) {
    return false;
  }

  // Resolve pickup-day-of-week:
  //   1. pickup_locations.day_of_week (stop-level — most authoritative)
  //   2. members.pickup_day (member-level override)
  // If neither exists (rare — e.g. new home-delivery member without
  // a route assigned), default to Wednesday (the canonical Tiny Seed
  // delivery day) so we don't hide the widget on what's clearly a
  // delivery day. This is conservative — false-positive (widget
  // shows but state === 'none') is preferred over false-negative
  // (widget hidden on the actual delivery day).
  const pickupDay = input.pickup_location_day ?? input.pickup_day ?? 'Wed';

  return todayWeekdayET(now) === pickupDay;
}
