---
name: csa-portal-fonts
description: How fonts are served in apps/csa-portal — self-hosted woff2 in public/fonts, @font-face in global.css, preloads in BaseLayout, CSP implications.
metadata:
  type: project
---

apps/csa-portal fonts are SELF-HOSTED (since 2026-05-24, LCP fix). NOT Google Fonts. See also [[csa-portal-test-harness]] (the font-LCP issue this fixed) and [[csa-portal-deploy-conventions]].

**Where the files live + how they're declared:**
- `public/fonts/*.woff2` — Inter 400/500/600/700 + Barlow Condensed 500/600/700/800, latin subset, ~192K total. Stable filenames (`inter-400.woff2`, `barlow-condensed-700.woff2`, …) so preloads have predictable URLs.
- Source of truth for the woff2 bytes = the `@fontsource/inter` + `@fontsource/barlow-condensed` packages (in **devDependencies**, NOT imported at runtime — they only seed the files; copy latin weights from `node_modules/@fontsource/<fam>/files/<fam>-latin-<weight>-normal.woff2`).
- `@font-face` rules (font-display: swap) live in `src/styles/global.css` pointing at `/fonts/*.woff2`. global.css is the single stylesheet BaseLayout imports.
- `src/layouts/BaseLayout.astro` PRELOADs only the two LCP-critical weights (`inter-400.woff2` body, `barlow-condensed-700.woff2` display headings) with `crossorigin` (required on font preloads even same-origin). NO Google Fonts `<link>`/preconnect anymore.
- Tailwind tokens `--font-sans: 'Inter', …` / `--font-display: 'Barlow Condensed', …` in global.css `@theme` are the family names the @font-face must match exactly.

**Why this shape:** Google Fonts `<link>` render-blocked ~839ms and Inter was the LCP element (prod Lighthouse 2026-05-24: Perf 88, LCP 2.9s). Self-host kills the external request → render-blocking-resources audit = 0 blocking items. Used `public/fonts` (not @fontsource CSS imports) specifically so preload URLs are stable (Vite hashes @fontsource asset paths).

**CSP coupling (vercel.json):** the CSP previously allowed `fonts.googleapis.com` (style-src) + `fonts.gstatic.com` (font-src) for the old request — both REMOVED 2026-05-24; fonts are `'self'` now. If you ever re-add an external font/style source you must add it back to the CSP or it'll be blocked.

**How to apply:** to add/change a weight — copy the woff2 from the @fontsource package into public/fonts, add an `@font-face` to global.css, and if it's an above-the-fold/LCP weight add a `<link rel=preload crossorigin>` in BaseLayout. Verify with `grep -rn "fonts.googleapis\|fonts.gstatic" src/` → must stay ZERO, and the LH `render-blocking-resources` audit must stay at 0 items.
