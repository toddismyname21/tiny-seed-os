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
    },
  },
});
