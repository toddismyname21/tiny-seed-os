---
name: research-tooling
description: How to actually research on this machine — Playwright browser tools in scripts/research/, what works, what is blocked, and what still needs Todd
metadata:
  type: reference
---

**Set up 2026-09-24 after an afternoon of failed lookups.** Todd: *"We need to
figure out a way to enhance our research... This stinks we can't get this done."*

## The tools, in order of preference

1. **`WebSearch` / `WebFetch`** — granted to pm-coordinator 2026-09-24. Try
   these first. They did not exist before that date, which is why every earlier
   lookup had to be delegated to a subagent.
2. **`scripts/research/*.mjs`** — headless Chromium via Playwright. Use when
   WebFetch is blocked or the page needs JavaScript.
   - `fetch.mjs <url>` — render any page, print visible text
   - `search_site.mjs <url> <query>` — **type into a site's own search box**
   - `amazon_search.mjs "<query>"` — title / price / rating / review count
   - `amazon_product.mjs <ASIN>...` — verify one product page
   - **Must be run from the repo root** — `/tmp` cannot resolve `playwright`.
3. **`mcp__claude-in-chrome__*`** — Chrome 154 installed 2026-09-24. Needs Todd
   to launch it once and add the extension. This is the ONLY path to pages
   behind his logged-in sessions.

## Hard-won specifics

- **Playwright and Chromium were already installed** for the disabled test
  suite. Nobody had pointed them at the open web. Check for tools before
  concluding you lack them.
- **Type into the search box; do not guess query parameters.** PartsTree's
  search is client-side — every constructed URL returned `Results for ""`, while
  one keystroke returned the exact model. This is the single most useful trick
  here.
- **`curl` is dead for retail.** DuckDuckGo serves a CAPTCHA, PartsTree returns
  an empty shell, ereplacementparts 403s. Do not waste turns on it.
- **Bing disambiguates badly** — "Kohler CV14S carburetor" returned Kohler
  *bathroom faucets*. Go direct to the retailer instead.
- **PartsTree is lawn/garden only.** No Kawasaki UTVs. Powersports needs
  Partzilla / Babbitts / Amazon.
- **Research subagents were failing** on 2026-09-24 — four died with identical
  `API Error: The response stopped arriving`. If that recurs, do the work
  directly rather than respawning.

## Still needed from Todd
- Launch Chrome once + add the Claude extension
- A **Brave Search API key** (free tier ~2,000/mo) — then wire it into
  `scripts/research/`

Plan and full diagnosis: `docs/system/RESEARCH_CAPABILITY_PLAN.md`
