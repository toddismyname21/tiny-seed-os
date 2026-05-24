/**
 * Delivery-proof photo signing (privacy — migration 0025).
 *
 * The `delivery-proofs` Storage bucket is PRIVATE. `delivery_stops.
 * proof_photo_url` stores the OBJECT PATH (`{route_date}/{stop_id}.{ext}`),
 * NOT a public URL. Anywhere we DISPLAY a proof photo we must mint a
 * short-lived SIGNED URL on demand, server-side, from that path:
 *   - admin route page  (src/pages/admin/route/[id].astro)
 *   - member tracker    (src/lib/delivery.ts → DeliveryTracker / today API)
 *
 * Signing uses the service-role client (bypasses storage RLS). That is
 * safe because every caller signs ONLY after it has independently proven
 * authorization for that specific stop:
 *   - admin pages: requireAdmin / admin RLS already passed.
 *   - member path: the proof_photo_url came out of an RLS-SCOPED
 *     delivery_stops read, so the member already owns that stop.
 *
 * TTL: short by design. The member tracker re-fetches /api/delivery/today
 * on Realtime updates + a 60s fallback poll, and the admin page is SSR
 * (fresh URL each load), so a brief lifetime is plenty and limits how
 * long any leaked link stays live.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

export const PROOF_BUCKET = 'delivery-proofs';

/**
 * Signed-URL lifetime, in seconds. 1 hour — long enough that an open tab
 * keeps a working image through a delivery window, short enough that a
 * leaked URL expires the same day.
 */
export const PROOF_SIGNED_URL_TTL_SECONDS = 60 * 60;

/**
 * True if `value` already looks like an absolute URL (legacy rows that
 * may have stored a full public URL before migration 0025, or any
 * accidental URL write). We pass those through unchanged rather than
 * trying to sign them — signing a non-path would fail.
 */
function isAbsoluteUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

/**
 * Convert a stored `proof_photo_url` value (an object PATH in the private
 * bucket) into a short-lived signed URL for display. Returns null when:
 *   - the value is null/empty (no photo), or
 *   - signing fails (logged; the UI just renders no photo).
 *
 * Pass the SERVICE-ROLE client (`supabaseAdmin`) — it bypasses storage
 * RLS. Callers MUST have already authorized access to the underlying stop
 * (admin check, or an RLS-scoped delivery_stops read) before calling.
 *
 * Defensive: a value that is already an absolute http(s) URL (a legacy
 * pre-0025 row) is returned as-is rather than (mis)signed.
 */
export async function signProofUrl(
  serviceClient: SupabaseClient<Database>,
  storedValue: string | null | undefined,
  ttlSeconds: number = PROOF_SIGNED_URL_TTL_SECONDS
): Promise<string | null> {
  if (!storedValue) return null;
  const value = String(storedValue).trim();
  if (!value) return null;
  if (isAbsoluteUrl(value)) return value;

  const { data, error } = await serviceClient.storage
    .from(PROOF_BUCKET)
    .createSignedUrl(value, ttlSeconds);

  if (error) {
    console.error('[delivery-proof] sign failed for', value, '-', error.message);
    return null;
  }
  return data?.signedUrl ?? null;
}
