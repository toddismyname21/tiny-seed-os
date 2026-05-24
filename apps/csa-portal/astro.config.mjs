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
    },
  },
});
