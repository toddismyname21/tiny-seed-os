# Research capability — what broke, what fixed it, what to do next

Written 2026-09-24, after a parts lookup that should have taken ten minutes
consumed most of an afternoon.

## What actually happened

Four failures stacked up, and only one of them was anyone's fault.

| # | Failure | Cause | Status |
|---|---|---|---|
| 1 | I have no web tools at all | `.claude/agents/pm-coordinator.md` grants `Read, Grep, Glob, Bash, Agent`. **No WebSearch. No WebFetch.** Every lookup must be delegated. | **Fixable — needs Todd's OK** |
| 2 | All four research agents died | `API Error: The response stopped arriving` — platform-side, identical across all four | Not ours to fix |
| 3 | `curl` bounced off every parts site | Modern retail sites render with JavaScript and block non-browser user agents. DuckDuckGo served a CAPTCHA; PartsTree returned an empty shell. | **FIXED** |
| 4 | Browser automation unavailable | `mcp__claude-in-chrome__*` needs Chrome. **No Chrome on this Mac** — only Safari. | Worked around |

## What fixed it — and it was already here

**Playwright and Chromium are installed in this repo.** They were put there for
the Playwright test suite, which is currently disabled. Nobody had thought to
point them at the open web.

```
~/Library/Caches/ms-playwright/chromium-1223
~/Library/Caches/ms-playwright/chromium_headless_shell-1223
node_modules/playwright
```

A real browser solved in five minutes what curl could not do at all. Two tools
now live in `scripts/research/`:

| Tool | What it does |
|---|---|
| `fetch.mjs <url>` | Renders any page in headless Chromium and prints the visible text. Gets JS-only content and does not read as a bot. |
| `search_site.mjs <url> <query>` | Opens a site and **types into its own search box**. |

**The second one is the important one.** PartsTree's search is client-side —
every URL I constructed returned `Results for ""`, while an actual keystroke
returned exactly one model. When a site search resists URL parameters, stop
guessing at the query string and type into the box.

This is now the default research path. It should have been from the start.

---

## What Todd needs to decide

### 1. Give me web tools directly — free, 30 seconds
Add `WebSearch, WebFetch` to my tool list in
`.claude/agents/pm-coordinator.md`. Today every lookup had to go through a
subagent, and when that subagent died the whole task died with it. The
`researcher` and `marketing-claude` agents already have these tools; the
coordinator does not, which is backwards — the coordinator is the one who needs
to verify a fact mid-conversation.

**I have not made this change.** Granting myself tools is the kind of thing that
should have an explicit yes from you.

### 2. Install Google Chrome — free, 5 minutes
Unlocks `mcp__claude-in-chrome__*`: a real browser with **your logged-in
sessions**. That matters for the things headless Chromium cannot reach —
the Tilmor invoice for order 12391675 that we could not pull today sits behind a
login, and a dealer parts portal will too.

Headless Chromium covers public pages. Chrome covers pages that need to know who
you are.

### 3. A proper search API — $0–50/month, ~20 minutes
Scraping search engines is fragile; today DuckDuckGo served a CAPTCHA and Bing
returned Kohler *plumbing* for an engine query. A real search API is keyed,
reliable, and built for this.

| Option | Cost | Good for |
|---|---|---|
| **Brave Search API** | free tier ~2,000/mo | general search, cheapest start |
| **Tavily** | free tier 1,000/mo | built for AI agents, returns clean extracted text |
| **Exa** | usage-based | finding *similar* pages — good for competitor and supplier scans |
| **Firecrawl** | free tier | turning a whole site into clean markdown |

**Recommendation: start with Brave (free) and add Tavily if we hit the ceiling.**
You create the API key, I wire it into `scripts/research/` and it works from
Bash — no dependency on the agent layer that failed today.

### 4. Install the GitHub CLI — free, 2 minutes
`brew install gh`. My own instructions tell me to use `gh` for GitHub work and
**it is not installed**. Minor, but it has been silently limiting things.

---

## What this is worth beyond machine parts

Today it was a carburetor. The same capability covers:

- **Grant and compliance research** — reading PDA, FSA and OEFFA pages directly
  instead of relying on recall
- **Wholesale price benchmarking** — what other farms charge, pulled live
- **Supplier and lead-time checks** — before committing grant match money to an
  imported transplanter
- **Competitor CSA research** — pricing, share structure, what they offer
- **Verifying claims before they go to a customer**, which is the standing rule
  anyway

The `verify-before-send` and `no-guessing` rules both assume I can actually
reach a source of truth. Today, for anything outside this repo, I largely could
not.

---

## Priority

1. **Web tools on the coordinator** — free, 30 seconds, removes today's single
   biggest failure point
2. **Chrome** — free, 5 minutes, unlocks logged-in pages
3. **Brave Search API key** — free tier, ~20 minutes, ends search-engine scraping
4. **`gh`** — free, 2 minutes

Items 1, 2 and 4 cost nothing but your say-so. Item 3 is a free tier to start.

Meanwhile `scripts/research/` works today and needs no permission.
