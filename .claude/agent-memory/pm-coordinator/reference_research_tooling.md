---
name: research-tooling
description: How to actually research on this machine — Playwright browser tools in scripts/research/, what works, what is blocked, and what still needs Todd
metadata:
  type: reference
---

**Set up 2026-09-24 after an afternoon of failed lookups.** Todd: *"We need to
figure out a way to enhance our research... This stinks we can't get this done."*

## The tools, in order of preference

1. **`WebSearch` / `WebFetch`** — granted to pm-coordinator 2026-09-24, and
   **confirmed working** the same day after restart (ran a real query, got real
   results). Try these first. They did not exist before that date, which is why
   every earlier lookup had to be delegated to a subagent.
   **But do not stop at the WebSearch synthesis for anything load-bearing** — it
   is itself a small model summarizing results, and can misread a spec exactly
   the way a person can. For a number someone is about to act on physically
   (torque spec, compression spec, a phone number), pull the actual source
   WebSearch found and read it directly. WebFetch 403s on some sites
   (jackssmallengines, ereplacementparts) — fall back to `fetch.mjs` below.
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

## Verifying a PDF spec table — do not trust linear text extraction

**Learned 2026-09-24, verifying Kawasaki/Kohler engine specs.** `pypdf`
`page.extract_text()` linearizes a table into reading order, and on any table
with merged cells (an arrow "←" meaning "same value as the column to the left",
or a value spanning multiple sub-columns), the linear text can look plausible
and still put the wrong number under the wrong column — the exact failure mode
already recorded in [[docx-cell-verification]], just for PDFs instead of
`.docx`. It nearly happened here: text extraction suggested a merged "0.12mm /
unnecessary" cell might apply ambiguously across FE120-290; rendering the
actual page as an image showed the true column break was between FE290 and
FE350, not where the linear text implied.

**The fix:** when `pdftoppm`/`poppler` isn't installed (it wasn't; no `brew`
either), render pages with `pymupdf` (`pip install pymupdf`, `import fitz` —
deprecated alias, `import pymupdf` is current):
```python
import fitz
doc = fitz.open(path)
pix = doc[page_index].get_pixmap(matrix=fitz.Matrix(3, 3))  # 3x for readability
pix.save(f'{outdir}/page.png')
```
Then `Read` the PNG and visually confirm the table structure before writing the
number into a document someone will act on. Use `pypdf` text extraction to find
*which* pages matter (grep for keywords), then always confirm the actual number
on the rendered image.

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
