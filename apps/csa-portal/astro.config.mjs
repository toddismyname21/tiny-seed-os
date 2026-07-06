// @ts-check
import { defineConfig, envField } from 'astro/config';
import vercel from '@astrojs/vercel';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  // Server-side rendering on Vercel — landing page pulls live data from
  // Supabase per-request (we want a fresh count, no stale build-time data).
  output: 'server',
  adapter: vercel({
    webAnalytics: { enabled: false },
  }),

  site: 'https://csa.tinyseedfarm.com',

  // The dev toolbar injects an <astro-dev-toolbar> overlay that intercepts
  // pointer events and adds DOM the a11y scanner would flag. The E2E
  // harness runs against the SSR dev server (the Vercel adapter has no
  // `preview`), so we disable the toolbar when ASTRO_DISABLE_DEV_TOOLBAR=1
  // (set by the Playwright webServer command). Todd's normal `npm run dev`
  // keeps the toolbar.
  devToolbar: {
    enabled: process.env.ASTRO_DISABLE_DEV_TOOLBAR !== '1',
  },

  vite: {
    plugins: [tailwindcss()],
  },

  // Typed env schema — surfaces via `astro:env/client` and `astro:env/server`
  // imports. Required because PUBLIC_SUPABASE_URL / PUBLIC_SUPABASE_ANON_KEY
  // are needed in browser-bundled code, while SUPABASE_SERVICE_ROLE_KEY must
  // remain server-only and never leak into the client bundle.
  // Docs: https://docs.astro.build/en/guides/environment-variables/
  env: {
    schema: {
      PUBLIC_SUPABASE_URL: envField.string({
        context: 'client',
        access: 'public',
      }),
      PUBLIC_SUPABASE_ANON_KEY: envField.string({
        context: 'client',
        access: 'public',
      }),
      SUPABASE_SERVICE_ROLE_KEY: envField.string({
        context: 'server',
        access: 'secret',
      }),

      // ── Shopify → Supabase order sync (/api/sync/shopify-orders) ──
      // All three live as Vercel env vars on this project. Declared
      // `optional` so a local build/check (where they're absent) still
      // succeeds; the endpoint guards their presence at runtime and
      // returns 500 if any is missing in production.
      SHOPIFY_ACCESS_TOKEN: envField.string({
        context: 'server',
        access: 'secret',
        optional: true,
      }),
      SHOPIFY_STORE_NAME: envField.string({
        context: 'server',
        access: 'secret',
        optional: true,
      }),
      CRON_SECRET: envField.string({
        context: 'server',
        access: 'secret',
        optional: true,
      }),

      // ── Gmail auto-ingest (Monday Harvie PO → /api/cron/harvie-ingest) ──
      // OAuth refresh-token flow against the todd@ / tinyseedorders@ mailbox:
      // the cron exchanges GMAIL_REFRESH_TOKEN for a short-lived access token
      // (POST oauth2.googleapis.com/token) then reads the weekly Harvie PO
      // attachment via the Gmail API (gmail.readonly). All THREE live as Vercel
      // env vars and are SERVER-SECRET — they must never reach the client
      // bundle. `optional` so a local build/check (where they're absent) still
      // succeeds; the cron guards their presence at runtime and fail-softs
      // (logs + notifies, never 500s) when any is missing.
      GOOGLE_CLIENT_ID: envField.string({
        context: 'server',
        access: 'secret',
        optional: true,
      }),
      GOOGLE_CLIENT_SECRET: envField.string({
        context: 'server',
        access: 'secret',
        optional: true,
      }),
      GMAIL_REFRESH_TOKEN: envField.string({
        context: 'server',
        access: 'secret',
        optional: true,
      }),

      // ── Google Maps Platform (route optimizer) ──
      // Geocoding API + Routes API (computeRouteMatrix), used server-side by
      // /api/admin/optimize-route. Lives as a Vercel env var; optional so a
      // local build/check (where it's absent) still succeeds — the endpoint
      // returns 500 if it's missing at runtime.
      GOOGLE_MAPS_API_KEY: envField.string({
        context: 'server',
        access: 'secret',
        optional: true,
      }),

      // ── Transactional email (Resend) — household-share invites ──
      // Live as Vercel env vars. `optional` so a local build/check (where
      // they're absent) still succeeds; the invite send is best-effort and
      // fail-soft at runtime, so a missing key just skips the email.
      RESEND_API_KEY: envField.string({
        context: 'server',
        access: 'secret',
        optional: true,
      }),
      RESEND_FROM_EMAIL: envField.string({
        context: 'server',
        access: 'secret',
        optional: true,
      }),

      // ── Resend webhook signing secret (svix-style) ──
      // Resend signs delivery/open/click/bounce webhook payloads with a
      // per-endpoint secret (whsec_...). /api/admin/campaigns/webhook
      // verifies the svix-id / svix-timestamp / svix-signature headers
      // against it. `optional` so a build/check (and the window before the
      // secret is configured in the Resend dashboard) still succeeds; the
      // webhook gracefully no-op-ACCEPTS unsigned payloads when this is
      // unset so Resend's delivery attempts don't hard-fail before the
      // secret is wired up. Set this in Vercel once the endpoint is
      // registered in the Resend dashboard.
      RESEND_WEBHOOK_SECRET: envField.string({
        context: 'server',
        access: 'secret',
        optional: true,
      }),

      // ── Unsubscribe-token HMAC secret (CAN-SPAM one-click unsubscribe) ──
      // Used to sign + verify the tokenized unsubscribe links embedded in
      // every weekly email (lib/weekly-email.ts → signUnsubscribeToken /
      // verifyUnsubscribeToken). Lives as a Vercel env var. `optional` so a
      // local build/check (where it's absent) still succeeds; the send +
      // unsubscribe handlers guard its presence at runtime and refuse to
      // operate (rather than mint forgeable links) if it's missing.
      UNSUBSCRIBE_SECRET: envField.string({
        context: 'server',
        access: 'secret',
        optional: true,
      }),

      // ── Post-pickup feedback-token HMAC secret (micro-survey links) ──
      // Signs + verifies the per-(customer, week) tokens embedded in the
      // weekly email's "How was your box?" link (lib/feedback.ts →
      // signFeedbackToken / verifyFeedbackToken). A DISTINCT secret is
      // preferred so rotating feedback links never invalidates unsubscribe
      // links; the callers fall back to UNSUBSCRIBE_SECRET when this is unset,
      // so the survey works before a separate secret is wired. `optional` so a
      // local build/check (where it's absent) still succeeds.
      FEEDBACK_SECRET: envField.string({
        context: 'server',
        access: 'secret',
        optional: true,
      }),
    },
  },
});
