/**
 * GET /api/track/o/<token>.gif — email OPEN-tracking pixel (PUBLIC).
 *
 * WHY: Todd sends 1:1 wholesale emails from his personal Gmail and gets no
 * open data. Each tracked email (see scripts/send_tracked_email.py) embeds a
 * 1×1 transparent GIF whose URL carries an opaque per-recipient token. When
 * the recipient's mail client loads images, it GETs this endpoint; we stamp
 * the open and return the pixel.
 *
 * PUBLIC by design — there is NO auth and NO same-origin check, because the
 * caller is an EMAIL CLIENT with no cookie and no Origin we control. Access is
 * the opaque token alone (>=24 random url-safe chars, UNIQUE per recipient),
 * validated server-side via the service-role client. middleware.ts lists
 * `/api/track` in PUBLIC_TOKEN_PREFIXES so this is never redirected to /login.
 *
 * RESILIENCE CONTRACT (critical): this endpoint ALWAYS returns the 43-byte
 * transparent GIF with HTTP 200 — for a valid token, an unknown/garbage token,
 * AND on any DB error. We never 404/500 to the mail client (that would leak
 * which tokens exist and could surface broken-image icons in the inbox). The
 * DB stamp is fired best-effort; the pixel response never depends on it.
 *
 * The stamp itself is one round-trip to the SECURITY DEFINER RPC
 * stamp_email_open(token, user_agent) (migration 0060): it sets
 * first_opened_at = coalesce(first_opened_at, now()), last_opened_at = now(),
 * open_count = open_count + 1, user_agent = <UA>. So re-opens re-fire wherever
 * the client re-requests the image (we send no-store / no-cache headers below).
 *
 * Caveat (documented on the admin report): Apple Mail Privacy Protection
 * pre-loads remote images on Apple's proxy → can register an open the human
 * never made; image-blockers do the inverse. Treat counts as directional.
 */
import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../../lib/supabase';

export const prerender = false;

// The canonical 43-byte 1×1 fully-transparent GIF (GIF89a, 1 transparent
// color in the palette, single-pixel image). Stored as base64 of those exact
// 43 bytes so we emit a byte-for-byte standard transparent pixel.
const TRANSPARENT_GIF_BASE64 =
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==';
const PIXEL = Uint8Array.from(atob(TRANSPARENT_GIF_BASE64), (c) =>
  c.charCodeAt(0),
);

/** Build the GIF response. Identical for hit, miss, and error paths so the
 *  endpoint never reveals whether a token matched. */
function pixelResponse(): Response {
  return new Response(PIXEL, {
    status: 200,
    headers: {
      'Content-Type': 'image/gif',
      'Content-Length': String(PIXEL.byteLength),
      // Defeat caching so a re-open re-requests the pixel (where the client
      // allows it). middleware.ts also stamps Cache-Control/Pragma after us;
      // Expires is ours alone.
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      Pragma: 'no-cache',
      Expires: '0',
      // Don't let the token leak via the Referer of any nested request.
      'Referrer-Policy': 'no-referrer',
    },
  });
}

export const GET: APIRoute = async ({ params, request }) => {
  // Astro routes this file as `/api/track/o/[token].gif`, so the `.gif`
  // suffix is part of the static filename — `params.token` is the bare
  // token. Trim defensively in case a client appends nothing/garbage.
  const token = (params.token ?? '').trim();

  // Capture the UA for the stamp (helps distinguish Apple-proxy prefetches
  // from real opens in the report). Bounded to keep a malicious UA from
  // bloating the row.
  const userAgent = (request.headers.get('user-agent') ?? '').slice(0, 1000);

  if (token) {
    try {
      // Atomic stamp via the SECURITY DEFINER RPC. We do NOT await-and-branch
      // on the result for the response — the pixel is returned regardless —
      // but we DO await so the serverless function isn't torn down before the
      // write lands (Vercel can freeze the instance after the response).
      const { error } = await supabaseAdmin.rpc('stamp_email_open', {
        p_token: token,
        p_user_agent: userAgent || null,
      });
      if (error) {
        // Unknown token is NOT an error here (the RPC returns false, no error).
        // A real DB error (transient) → log + still serve the pixel.
        console.error('[track/o] stamp_email_open failed:', error.message);
      }
    } catch (e) {
      console.error(
        '[track/o] unexpected stamp error:',
        e instanceof Error ? e.message : 'unknown',
      );
    }
  }

  return pixelResponse();
};
