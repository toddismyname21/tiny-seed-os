# Session Handoff — February 27, 2026

## What Just Happened
This session installed 5 new MCP servers and fixed mobile text truncation bugs on both pages. All changes are pushed live.

## MCP Server Config (FIXED — previous session had missing -y flags)
All servers now have `-y` flag and API keys configured. First session had 7/12 NOT LOADED because Playwright, Lighthouse, and a11y were missing `-y` in npx args, and Firecrawl was missing its API key env var. All fixed now.

### Project-level servers (9):
| Server | Purpose | API Key |
|--------|---------|---------|
| **playwright** | Browser automation, screenshots | No |
| **lighthouse** | Performance, SEO, a11y scoring | No |
| **a11y** | WCAG compliance via axe-core | No |
| **image-optimizer** | WebP/AVIF conversion, batch, smart crop | No |
| **colorsandfonts** | Palette generation, contrast validation | No |
| **image-compare** | Pixel-perfect visual diffing | No |
| **brave-search** | Web search + local business search | Yes — configured |
| **firecrawl** | Website scraping, competitive analysis | Yes — configured |
| **claude-flow** | Orchestration (pre-existing) | No |

### User-level servers (2):
| Server | Purpose |
|--------|---------|
| **chrome-devtools** | DOM inspection, performance traces |
| **context7** | Live documentation lookup |

### Built-in:
| Server | Purpose |
|--------|---------|
| **Vercel** | Deployment, docs search |

**Firecrawl also installed as CLI** (`firecrawl` command) AND as a skill (`/firecrawl`). The MCP server + CLI + skill are all available.

## Commits This Session
- `7e52c3a` — Fix h1 clamp minimum for mobile: 2.2rem → 1.75rem
- `c05b095` — Fix mobile text truncation on presale and wholesale hero sections
- `539f817` (prev session) — Fix van placement
- `a807fa4` (prev session) — PA keystone icon in wholesale trust bar
- `c6b1951` (prev session) — Add graphics, photos, descriptions to wholesale + USDA badge to both pages
- `ccaeec0` (prev session) — Wholesale page audit: fix brand colors, add trust signals + FAQ + JSON-LD

## Known Issues to Verify
1. **Mobile text wrapping** — h1 clamp fix just pushed. Verify on production that "Pittsburgh's Favorite Seedlings Are Back" and "Grow Your Business with Tiny Seed Seedlings" display fully on 375px screens
2. **CDN cache** — GitHub Pages may still be serving cached versions. Use `?v=timestamp` to bust cache
3. **Presale plan file exists** — `/Users/samanthapollack/.claude/plans/snug-growing-rivest.md` has a visual design audit plan for the presale page. May or may not still be relevant — check with user

## Visual Verification Workflow (MANDATORY)
```bash
# Screenshot before pushing ANY visual change
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless --disable-gpu --screenshot=/tmp/PAGE.png --window-size=1440,900 "URL"

# Then Read the screenshot to visually inspect
# Desktop: --window-size=1440,900
# Tablet: --window-size=768,1024
# Mobile: --window-size=375,812
```

## Design Tokens (Both Pages)
```css
--green: #2d9f4e;      /* Primary — warmer natural green */
--green-dark: #248c42;  /* Hover states */
--green-deep: #166534;  /* Dark backgrounds, text */
--green-tint: #dcfce7;  /* Light green backgrounds */
--warm-cream: #fffbeb;  /* Section backgrounds */
--warm-sand: #fef3c7;   /* Accents */
--radius: 12px;         /* Card corners */
```
- 2 button shapes: pill CTAs (50px radius, white text) + ghost outlines (8px radius)
- Typography: Inter (body) + Playfair Display (headings)
- Section padding: 80px desktop, 40px mobile

## Critical Facts
- Farm founded: **2017** (NOT 2022)
- Organic status: **USDA Certified Organic**
- Email: **todd@tinyseedfarmpgh.com** (owner-confirmed correct domain)
- Phone: **REMOVED** from all pages — do not re-add
- Presale deadline: **March 20, 2026**
- Variety count: **90+**
- Deploy: `git push origin main` → GitHub Pages → `app.tinyseedfarm.com`

## Competitive Intel Gathered This Session
- **Who Cooks For You Farm** — Direct competitor, certified organic, CSA + plant sale at same Pittsburgh farmers markets (Bloomfield, Squirrel Hill). Spring CSA $27/week small, $33/week medium. Plant sale through online marketplace portal. No transparent per-plant pricing (our advantage).
- **Grow Pittsburgh** — Community org, not direct competitor but part of ecosystem
- **Pond Hill Farm** — CSA programs, accepts SNAP/EBT
- **Green Things Farm Collective** — Fall CSA, buffet-style

## File Locations
- Presale: `web_app/seedling-presale-2026.html` (~3,500 lines)
- Wholesale: `web_app/seedling-wholesale-2026.html` (~1,400 lines)
- API config: `web_app/api-config.js`
- Memory: `/Users/samanthapollack/.claude/projects/-Users-samanthapollack/memory/`
- Toolkit docs: See memory `toolkit.md`
- Full rules: `CLAUDE.md`
