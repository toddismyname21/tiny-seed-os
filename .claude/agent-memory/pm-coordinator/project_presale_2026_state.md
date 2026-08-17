---
name: Presale 2026 — current state
description: State of seedling-presale-2026.html after March 29 2026 session — what's done, what's next
type: project
---

As of 2026-03-29, the presale page is live on GitHub Pages at:
https://toddismyname21.github.io/tiny-seed-os/web_app/seedling-presale-2026.html

## What was completed this session

**Catalog:** 100+ varieties. 7 new items added to SEEDLING_PRODUCTION via API:
- Snapdragon (Rocket Mix) SDL-1774791027757
- Parker Yarrow SDL-1774791034940
- Rudbeckia Sahara SDL-1774791041527
- Branching Sunflower SDL-1774791057797
- Queen Sofia Marigold SDL-1774791093457
- Giant Orange Marigold SDL-1774791101715
- Snap Bean Mix (Trilogy) SDL-1774791109078

5 existing items updated: Strawflower → Cranberry Rose Strawflower, Celosia → Mixed Pampas Plume, Bachelor Buttons → Bachelor Button Mix, Toma Verde + Aunt Molly's got descriptions and photos.

**Bundle renamed:** Flower Power → Summer Cutting Garden (items: Zinnia×2, Branching Sunflower, Snapdragon, Cranberry Rose Strawflower, Bachelor Button Mix, Rudbeckia Sahara)

**Page restructured (catalog-first):**
Hero → Catalog → Order Form → Pickup Locations → Farmer → USDA Block → Why Pre-Order → FAQ → Growing Tips → Footer

**Content fixes:**
- Removed "organically grown since 2017" (false — certified Dec 2025)
- Added "Certified December 2025" to USDA block
- Removed fake "Join Our Growing Community" section
- Hero copy: "Rochester, PA" → "just north of Pittsburgh"
- Celebrity → Mt. Merit in Growing Tips
- Bundle static list corrected
- $25 minimum added to pricing line
- Referral share URL fixed (was placeholder tinyseedfarm.com)
- "Browse catalog" instruction is now a scroll link

**Performance fixes (Lighthouse):**
- Skeleton loader: replaces spinner — Speed Index 9.4s → 7.8s
- CSP: GA + FB pixel unblocked (both were silently blocked before)
- Color contrast: .variety-price passes WCAG AA now
- Favicons: 8 files committed (were untracked, causing 404s)
- Accessibility: 93 → 97

## What's still pending

**Performance = 0 (critical):** Lighthouse can't measure LCP/TTI because catalog requires Google Apps Script cold start (5-10s). Fix: cache the catalog in localStorage on first load, serve from cache instantly on return visits. This is the #1 remaining UX problem.

**"Something feels off" — unresolved:** User noticed the new catalog-first layout feels off. No visual diagnosis done yet because Playwright MCP wasn't active. In new session: take a screenshot and diagnose properly.

**User asked about tools and next steps:** Start new session with all 13 project MCPs active (Playwright, Lighthouse, a11y, image-compare, etc.) — use Playwright to screenshot the page and do a real visual audit.

## Why: How to apply
When resuming presale work, check the live page with Playwright screenshot first before making any changes. The catalog-first layout may need visual tweaks. The localStorage caching for the catalog is the highest-impact unfinished item.
