/**
 * POST /api/admin/health/run
 *
 * Admin-triggered "run reconciliation now" button. Proxies to the cron
 * endpoint /api/cron/nightly-health using the CRON_SECRET that lives in
 * astro:env so the browser never sees it.
 *
 * Why a proxy and not a direct fetch from the client?
 *   - CRON_SECRET is a bearer secret. It MUST stay server-side.
 *   - The cron endpoint expects `Authorization: Bearer <CRON_SECRET>`,
 *     i.e. machine-to-machine. Forwarding the admin's cookie session
 *     would require the cron endpoint to also know about admin auth —
 *     simpler to keep the contract pure (bearer-only) and proxy.
 *   - Centralizes the admin-only gate: this endpoint enforces
 *     requireAdmin() + CSRF, so a stray CSRF from another origin can't
 *     trigger a reconciliation.
 *
 * The cron endpoint itself is built by a parallel agent. While that's
 * in flight this proxy returns a clear 503 ("not yet deployed") so the
 * UI button can render a friendly message instead of a generic 500.
 *
 * Auth:
 *   1. requireAdmin() — admin/staff only.
 *   2. isSameOriginPost() — CSRF defense.
 *
 * Response: { ok, status, body } where body is whatever the cron
 * endpoint returned (JSON-parsed if possible, raw text otherwise).
 */
import type { APIRoute } from 'astro';
import { CRON_SECRET } from 'astro:env/server';
import { requireAdmin } from '../../../../lib/admin';
import { isSameOriginPost, PORTAL_ORIGIN } from '../../../../lib/onboarding';

export const prerender = false;

/** The cron endpoint URL, relative to whichever site this is running on.
 *  We build the absolute URL from Astro.url so it works in dev, preview,
 *  and prod without any env coupling. */
function cronUrl(siteOrigin: string): string {
  return new URL('/api/cron/nightly-health', siteOrigin).toString();
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}

export const POST: APIRoute = async ({ request, locals, url }) => {
  if (!isSameOriginPost(request, PORTAL_ORIGIN)) {
    // The cron endpoint is destructive (it writes pickups + tags). A
    // forged cross-origin POST that managed to ride an admin's cookie
    // could fire it without the admin's intent. Refuse hard.
    return json({ ok: false, error: 'forbidden' }, 403);
  }

  const auth = await requireAdmin(locals.supabase, locals.user);
  if (auth.response) return auth.response;

  if (!CRON_SECRET) {
    return json(
      {
        ok: false,
        error: 'cron_secret_not_configured',
        message:
          'CRON_SECRET is not set in this environment. The nightly-health endpoint cannot be called without it.',
      },
      500
    );
  }

  const target = cronUrl(url.origin);

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${CRON_SECRET}`,
        'content-type': 'application/json',
        // Echo the proxying admin so the cron endpoint can audit it if
        // it cares to (the bearer doesn't carry identity).
        'x-admin-email': auth.ctx.user.email ?? 'unknown',
      },
      body: JSON.stringify({ triggered_by: 'admin_ui', admin_email: auth.ctx.user.email ?? null }),
    });
  } catch (e) {
    return json(
      {
        ok: false,
        error: 'cron_unreachable',
        message:
          e instanceof Error ? e.message : 'fetch to /api/cron/nightly-health threw',
      },
      502
    );
  }

  // Parse the upstream response. We tolerate both JSON and text bodies
  // so the UI can display whichever the cron endpoint chose.
  const rawText = await upstream.text();
  let body: unknown = rawText;
  try {
    body = JSON.parse(rawText);
  } catch {
    /* upstream returned non-JSON; keep raw */
  }

  // 404 specifically = "the parallel agent's endpoint hasn't shipped yet".
  // Surface that distinctly so the UI shows a clear hint instead of a
  // generic 502.
  if (upstream.status === 404) {
    return json(
      {
        ok: false,
        error: 'cron_not_yet_deployed',
        message:
          '/api/cron/nightly-health is not deployed yet. Once the nightly-health endpoint ships, this button will trigger it.',
        upstream_status: upstream.status,
      },
      503
    );
  }

  return json(
    {
      ok: upstream.ok,
      upstream_status: upstream.status,
      body,
    },
    upstream.ok ? 200 : 502
  );
};
