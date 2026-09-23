# Toolkit Gap Research — Claude Code Operations Stack, 2026

**Date researched:** 2026-09-14
**Prior related research (not duplicated here):** `CLAUDE_CODE_MCP_PLUGINS_ECOSYSTEM_2026.md` and `MCP_PLUGINS_QUICK_REFERENCE.md` (2026-03-15, pre-dates the Supabase/QuickBooks/Shopify direct-API stack — its Google Sheets/RAG-memory recommendations are stale now that the backend has moved off Sheets for CSA); `WEATHER_TEMPLATES_RESEARCH.md` (2026-02-12, marketing-angle weather API comparison — reused here, not re-derived); `TEXT_SYSTEM_COMPLIANCE_RESEARCH_2026.md` and `TEXT_SYSTEM_TECH_RESEARCH_2026.md` (2026-08-16, A2P 10DLC + business-texting-platform comparison — extended here with Telnyx/AWS specifics, not re-litigated); `VOICE_WITHOUT_TWILIO_2026.md` (2026, hands-free voice — different problem than SMS).

---

## Executive Summary

- The stack is already strong for a one-person farm operation. Most "gaps" close with **zero new recurring cost** — a native macOS CLI install, a free-tier signup, or an official Claude Code plugin — not a new platform to maintain.
- The single highest-leverage find: the **official Supabase MCP server** (`https://mcp.supabase.com/mcp`, OAuth, free with your existing Supabase account) adds `generate_typescript_types` — this can auto-regenerate the locked shared-kernel file `apps/csa-portal/src/lib/database.types.ts` from the live schema instead of hand-editing it, plus `get_advisors` (security/performance linting) and a `read_only=true` mode that caps blast radius for exploratory queries, something raw service-role REST access doesn't give you.
- **Frost/weather decisions have zero data support today.** Two free, verified-live, no-signup sources close this: NOAA/NWS (`api.weather.gov`, official Frost Advisory/Freeze Warning alerts for your exact NWS zone) and Open-Meteo (free forecast API, daily min/max temps to compute growing-degree-days). Neither costs anything at farm scale.
- **Handwriting OCR for H-2A time cards is not worth a dedicated service at 2 cards/month.** Claude's built-in vision (already available in every session) reads the photo directly; Google Cloud Vision's free tier (1,000 units/month) would also cover it but adds GCP account/billing overhead for no benefit at this volume.
- **No SMS vendor bypasses A2P 10DLC carrier registration** — confirmed against Telnyx and AWS End User Messaging pricing pages, both require the same 10DLC/toll-free/short-code registration Twilio does. The lower-friction path already documented in `TEXT_SYSTEM_COMPLIANCE_RESEARCH_2026.md` (a wrapper service like TextMagic that handles registration for you, or toll-free verification instead of a 10DLC campaign) still stands; switching raw carriers doesn't remove the compliance step.
- **PDF generation is genuinely ad-hoc** — verified three different approaches live in the repo right now (headless Chrome subprocess, `fpdf`, `weasyprint`). Since Playwright 1.60 is already installed for screenshots/smoke tests, its built-in `page.pdf()` should become the one path for any HTML-templated document — no new dependency, just consolidation.
- Three official Claude Code plugins are worth installing immediately, all free: `typescript-lsp` (automatic diagnostics/type errors on every edit to the Astro/TypeScript CSA portal), `github` (bundled GitHub MCP — may remove the need for `gh` CLI entirely, see below), and `security-guidance` (defense-in-depth alongside the existing pre-commit hook and PR review workflow).

---

## Key Findings

| Tool / Source | Gap it fills | Cost | Priority | Setup effort |
|---|---|---|---|---|
| Official Supabase MCP (`mcp.supabase.com`) | Auto-regenerate `database.types.ts`, security/perf advisors, read-only mode for safe exploration | Free (existing Supabase plan) | **HIGH** | ~10 min (OAuth login) |
| `typescript-lsp` Claude Code plugin | Live type-checking on every CSA-portal edit | Free | **HIGH** | ~5 min + install `typescript-language-server` |
| `github` Claude Code plugin (official GitHub MCP) | PR/issue automation without a separate CLI | Free | **HIGH** | ~5 min |
| NOAA/NWS `api.weather.gov` | Official frost/freeze alerts for the farm's NWS zone | Free, no key | **HIGH** | ~30 min (one cron job) |
| Open-Meteo forecast API | Daily min/max temps to compute growing-degree-days | Free (≤10k calls/day) | **MED** | ~30 min |
| Playwright `page.pdf()` (already installed) | Replace 3 ad-hoc PDF methods with one | Free (no new install) | **MED** | ~1–2 hrs to migrate existing scripts |
| Better Stack free tier | Site uptime (csa.tinyseedfarm.com) + cron/pg_cron heartbeat monitoring in one dashboard | Free (10 monitors + 10 heartbeats) | **MED** | ~30 min |
| `gh` CLI | PR/issue automation from the terminal | Free | LOW–MED (may be superseded by `github` plugin) | 5 min (`brew install gh`) |
| `security-guidance` Claude Code plugin | Extra security review pass on every change | Free | MED | ~5 min |
| ImageMagick, qpdf | Image resizing/labels, PDF merge/form-fill for grant paperwork | Free | LOW | 5 min each |
| ffmpeg | Video processing (social media clips) | Free | LOW | 5 min |
| Claude vision (already available) for H-2A time cards | Handwriting transcription at ~2 cards/month | Free | N/A — already covered | none |
| Google Maps MCP (community) | — | — | **NOT RECOMMENDED** | Route optimization is blocked on enabling billed Google APIs, not on tooling; no official Google Maps MCP exists (best community option: 454★, unofficial) |
| QuickBooks/Intuit MCP (any) | — | — | **NOT RECOMMENDED** | Ecosystem is immature — largest repo found has 45 GitHub stars; your direct QuickBooks Online API integration is already more capable |
| Dedicated SMS vendor switch (Telnyx/Sinch/AWS) | — | — | **NOT RECOMMENDED as a Twilio "fix"** | All require the same A2P 10DLC registration; switching providers doesn't remove the compliance step |

---

## Detailed Analysis

### 1. MCP servers

**Supabase — adopt.** The official server moved to a hosted, OAuth-based remote endpoint (`https://mcp.supabase.com/mcp`), configured per-client with `.mcp.json` or `claude mcp add`. Verified directly from `supabase.com/mcp` (fetched 2026-09-14). Tool groups: **Database** (`list_tables`, `list_extensions`, `list_migrations`, `apply_migration`, `execute_sql`), **Debugging** (`query_logs`, `get_advisors`), **Development** (`get_project_url`, `get_publishable_keys`, `generate_typescript_types`), **Edge Functions**, **Account management**, **Docs search**, and experimental **Branching** (paid-plan feature). Configuration supports `read_only=true` and `project_ref` scoping — meaningful because the current setup hits Supabase via a service-role key with unrestricted write access; an MCP session scoped read-only for exploratory/reporting work reduces the chance of an accidental write during analysis. The concrete win for this repo: `generate_typescript_types` can regenerate `apps/csa-portal/src/lib/database.types.ts` — a file that's under the active-locks system specifically *because* it's hand-maintained and shared across worktrees — directly from the live schema, removing a class of drift bug. Source: https://raw.githubusercontent.com/supabase-community/supabase-mcp/main/README.md and https://supabase.com/mcp (both fetched live 2026-09-14).

**Postgres MCP (generic) — skip.** Searched GitHub for standalone Postgres MCP servers (top results: `bytebase/dbhub` 3,509★, `subnetmarco/pgmcp` 540★, others). None add anything the Supabase MCP's `execute_sql`/`apply_migration`/`list_migrations` don't already cover for this specific database, and a second tool with overlapping database write access is an added risk surface for no added capability. Source: GitHub Search API, `postgres mcp server`, 824 total results scanned by stars, fetched 2026-09-14.

**Playwright MCP — skip in favor of what's already installed.** Microsoft's official `@playwright/mcp` exists and is actively maintained, but its own README (fetched 2026-09-14) now explicitly steers coding agents toward **Playwright CLI + Skills** instead of MCP: *"Modern coding agents increasingly favor CLI-based workflows... because CLI invocations are more token-efficient... This makes CLI + SKILLs better suited for high-throughput coding agents."* Since Playwright 1.60 and browser automation are already working via direct tool calls in this stack, adding the MCP server would trade token efficiency for no new capability. Source: https://raw.githubusercontent.com/microsoft/playwright-mcp/main/README.md.

**Google Maps MCP — not recommended.** No official Google Maps Platform MCP exists (searched `org:googlemaps` and `googlemaps mcp` on GitHub, 2026-09-14 — the highest-traction community option is `cablate/mcp-google-map` at 454★, unofficial). More importantly, this doesn't address the actual blocker in `docs/ROUTE_OPTIMIZATION_PLAN.md`: Geocoding + Route Optimization APIs and billing are not enabled on the Google Cloud project. An MCP wrapper adds nothing until that's unblocked — once it is, direct REST calls (same pattern as Shopify/QuickBooks today) work fine without an MCP layer. This is a Todd-needs-to-enable-billing item, not a tooling gap.

**Stripe MCP — not applicable.** Stripe hosts an official remote MCP (`https://mcp.stripe.com`) and a Claude Code plugin (`claude plugin install stripe@claude-plugins-official`), confirmed via `stripe/agent-toolkit` README (fetched 2026-09-14). Not relevant — the farm's payment/billing rails are Shopify and QuickBooks, not Stripe. Flagging only so it isn't re-researched later.

**QuickBooks/Intuit MCP — not recommended.** GitHub search for `quickbooks mcp` (2026-09-14) returns 14 repos, none with meaningful adoption — the largest, `dubbl-org/dubbl`, has 45 stars and isn't QBO-specific; most purpose-built QBO MCP servers sit at 0–8 stars and were last touched within the past two months (i.e., still experimental, not converging on a standard). The farm's existing direct QuickBooks Online API integration (OAuth tokens in DB, invoice engine already built per `SYSTEM_INVENTORY.md`) is already more capable than any of these. Revisit only if Intuit ships an official server.

**Slack MCP — not recommended (no current use case).** Farm communication runs through Gmail, iMessage, and the CSA portal, not Slack. Anthropic does bundle an official `slack` plugin in the official marketplace if that changes.

**Filesystem/memory MCP — already covered natively.** Claude Code's own file tools and this agent's persistent memory system already provide this; a separate filesystem/memory MCP would duplicate existing, free capability.

### 2. Weather APIs

Two free sources, used together, close the "farm decisions have no weather data" gap completely — verified live against the farm's approximate coordinates (Beaver County, PA) on 2026-09-14:

- **NOAA/NWS (`api.weather.gov`)** — official U.S. government source, free, no API key, requires only a `User-Agent` header identifying the app. `GET /points/{lat},{lon}` resolves the exact NWS forecast office and grid cell (confirmed: office `PBZ`, Pittsburgh) and returns `forecast`, `forecastHourly`, and `forecastGridData` endpoints. `GET /alerts/active?area=PA` returns every currently active NWS alert for the state, including the exact category that matters for frost decisions — **Frost Advisory** and **Freeze Warning** — issued by the local office, the same alerts a farmer would see from a weather app, sourced directly rather than scraped. Both endpoints returned live, correctly-structured JSON in this test. This is the right source for *official, actionable* frost/freeze alerts because it reflects NWS meteorologist judgment, not a raw temperature threshold.
- **Open-Meteo** — free, no signup, no API key required for non-commercial-scale use (confirmed live: a 7-day daily min/max forecast for the farm's coordinates returned correctly with zero authentication). Aggregates 30+ national weather models (NOAA/NWS, ECMWF, DWD, and others) and normalizes to hourly/daily resolution. It has no built-in "growing degree days" field, but `temperature_2m_max`/`temperature_2m_min` daily values are exactly the inputs GDD needs — trivial to compute in a small script (`GDD = ((Tmax+Tmin)/2) - base_temp`, e.g. base 50°F for most vegetable crops). Paid tiers exist only for commercial-volume/dedicated-capacity use (Standard 1M calls/month and up) — irrelevant at farm scale. Source: https://open-meteo.com/en/pricing and https://open-meteo.com/en/features (fetched 2026-09-14); prior comparison research already in `WEATHER_TEMPLATES_RESEARCH.md` (2026-02-12) covers additional commercial options (WeatherAPI.com, Visual Crossing, Tomorrow.io) for the marketing use case — none is needed here since NWS + Open-Meteo are both free and sufficient.

**Recommendation:** one small daily cron (Vercel cron or pg_cron, matching the existing pattern) that (a) pulls NWS active alerts for the farm's zone and flags Frost Advisory/Freeze Warning, and (b) pulls Open-Meteo daily min/max to compute a running GDD total for the season. No paid tier, no new vendor relationship, no MCP needed — this is a REST-call script like the Shopify/QuickBooks integrations already in place.

### 3. Handwriting OCR (H-2A time cards)

At ~2 cards/month, a dedicated OCR service isn't worth the setup overhead. Claude's built-in vision (already available in every session — the agent can read a photo of a handwritten time card directly, no separate API call, no extra cost) is the right tool at this volume. For completeness: Google Cloud Vision's Document Text Detection (their handwriting-capable OCR mode) has a genuinely free tier — first 1,000 units/month at $0 (confirmed via `cloud.google.com/vision/pricing`, fetched 2026-09-14) — so it would also be "free" here, but it requires a GCP project, billing account (even if unbilled), and service-account credentials, which is real setup and maintenance cost for a capability that's already covered. **Revisit this only if H-2A time-card volume grows into weekly batches** (e.g., multiple workers, daily cards) where a scripted OCR pipeline would save meaningfully more time than Claude reading each photo in conversation.

### 4. SMS without Twilio

Checked whether switching raw carrier/CPaaS providers removes the A2P 10DLC friction documented in `TEXT_SYSTEM_COMPLIANCE_RESEARCH_2026.md`. It does not:

- **Telnyx** — $0.004/message part + carrier passthrough (blended US carrier fee ~$0.0038/part in their own example, i.e., ~$0.0078/part all-in) — comparable to Twilio's raw per-message pricing, no meaningful savings at farm volume. Telnyx's own pricing page lists "Numbers, lookup, and **10DLC**" as separate line-item primitives — i.e., 10DLC registration is still required. Source: https://telnyx.com/pricing/messaging (fetched 2026-09-14).
- **AWS End User Messaging (formerly Pinpoint SMS)** — pricing explicitly breaks out rates by sender type including **10DLC**, Short Code, Long Code, and Toll-free — same registration categories, same requirement. Source: https://aws.amazon.com/end-user-messaging/pricing/ (fetched 2026-09-14).
- **Sinch / SimpleTexting-style wrappers** — not independently re-verified today (already covered for TextMagic in the existing compliance doc, which found TextMagic explicitly line-items "Brand & campaign registration" as a service it handles for you — i.e., the same underlying carrier requirement, just outsourced).

**Conclusion, unchanged from the existing research:** A2P 10DLC (or the toll-free-verification equivalent) is a carrier-level requirement independent of vendor — there is no vendor-hop that avoids it. The actual lower-friction paths remain what `TEXT_SYSTEM_COMPLIANCE_RESEARCH_2026.md` already identified: either (a) fix Twilio's specific rejection reasons (documented there, codes 30882/30908) and resubmit, or (b) move to a wrapper service like TextMagic that handles registration on your behalf for a flat monthly fee. **I could not verify live turnaround-time claims for toll-free verification vs. 10DLC campaign vetting today** (Twilio's and Telnyx's toll-free-verification pages returned JS-rendered content I couldn't extract text from) — if turnaround time is the deciding factor, that needs a direct question to a provider's sales/support before committing, not an assumption from this research.

### 5. CLI tools

Checked what's actually present on the Mac before recommending anything (2026-09-14):

| Tool | Status found | Recommendation |
|---|---|---|
| `jq` | **Already installed** (`/usr/bin/jq`) | No action |
| `ripgrep` (`rg`) | **Already installed** | No action |
| `gh` (GitHub CLI) | Not installed | Install if PR/issue work from the terminal is wanted — but see below, the official `github` Claude Code plugin (bundled GitHub MCP) may cover this without a separate CLI. Try the plugin first; install `gh` only if a workflow needs it outside a Claude Code session. |
| ImageMagick (`magick`/`convert`) | Not installed | Useful for: resizing/watermarking CSA/wholesale product photos, generating consistent label images for seed packets/produce tags |
| `qpdf` / `pdftk` | Not installed | Useful for: merging/splitting grant application PDFs, filling flat PDF forms (relevant to `FORM_DCED-BFTC-001_FILLED.html` and similar) |
| `ffmpeg` | Not installed | Useful for: trimming/compressing farm video for social media posting — only worth it if video content becomes a regular workflow, currently LOW priority |

### 6. Monitoring/alerting

Compared free tiers for the stated gap (uptime for csa.tinyseedfarm.com + failure alerting for Vercel cron / pg_cron jobs), all fetched live 2026-09-14:

- **Better Stack** — free tier: 10 uptime monitors, 10 heartbeats (their term for dead-man's-switch/cron monitoring), a status page, 30-second checks. This is the only option checked that covers **both** needs (HTTP uptime *and* cron heartbeat) in one free account, which matters for a one-person operation that doesn't want two dashboards to check. Source: https://betterstack.com/uptime.
- **healthchecks.io** — free "Hobbyist" tier: 20 monitored cron jobs, 100 log entries per job. Purpose-built for cron/heartbeat monitoring specifically (not general HTTP uptime). Source: https://healthchecks.io/pricing/.
- **UptimeRobot** — free tier: 5-minute check intervals, basic status pages (their paid "Solo" tier adds 60-second checks). Confirmed via their FAQ copy, fetched 2026-09-14; this is HTTP-uptime-only, no dedicated cron-heartbeat product in the free tier.

**Recommendation:** Better Stack free tier — it's the only one of the three that covers the full stated need (site + cron) without paying or running two tools, and it stays free at Tiny Seed's scale (well under 10 monitors/heartbeats today).

### 7. Claude Code ecosystem — plugins worth adopting

Fetched the current official docs directly (`docs.claude.com/.../plugins.md` and `.../discover-plugins.md`, both 2026-09-14 — Mintlify-rendered, read via the `.md` suffix for raw content). The plugin system and official marketplace (`claude-plugins-official`, auto-added on first interactive run) are materially different from what the March 2026 MCP research doc described (that doc predates this plugin system and focused on manually-configured MCP servers). Concretely useful for this repo:

- **`typescript-lsp`** — installs a Language Server Protocol connection (requires the `typescript-language-server` binary). Once installed, Claude gets automatic diagnostics after every edit (type errors, missing imports, syntax issues surfaced without a manual build) and precise code navigation (jump-to-definition, find-references) instead of grep-based search. The CSA portal is Astro + TypeScript with a shared `database.types.ts` — this is a direct, concrete fit, not a generic nice-to-have.
- **`github`** (bundled official GitHub MCP server) — source control integration without manual MCP config. Installing this may make a standalone `gh` CLI unnecessary for in-session PR/issue work; worth trying before installing `gh` separately.
- **`security-guidance`** — reviews each change for common vulnerabilities and has Claude fix them in the same session. Complements, doesn't replace, the existing pre-commit hook (13 checks) and the GitHub Actions PR auto-review — an extra pass during editing rather than only at commit/PR time.
- **`commit-commands`** — standardized git commit/push/PR-creation workflows as skills. Minor convenience, not essential.
- **`vercel` and `supabase` official plugins** exist in the marketplace (bundled MCP servers for those services) — evaluate whether they add anything over the direct Supabase MCP config and existing Vercel CLI already in use; likely redundant with the Supabase MCP setup recommended in section 1, so don't install both.

All are installed with `/plugin install <name>@claude-plugins-official` and are free. Source: https://docs.claude.com/en/docs/claude-code/discover-plugins.md.

---

## Recommendations for Tiny Seed OS — Adoption Order

1. **Official Supabase MCP** — configure `mcp.supabase.com` for the csa-portal project; start with `read_only=true` for exploratory work, full access only when actively migrating. Try `generate_typescript_types` against `database.types.ts` under a claimed lock before trusting it as the primary regeneration path.
2. **`typescript-lsp` Claude Code plugin** — install the plugin + `typescript-language-server` binary; immediate diagnostic value on every CSA-portal edit.
3. **NOAA/NWS + Open-Meteo frost/GDD cron** — one small script, free, closes a real decision-making gap (harvest/planting/frost timing) that currently has zero data support.
4. **Better Stack free tier** — covers both site uptime and pg_cron/Vercel cron failure alerting in one free account; replaces "no monitoring beyond 15-min site-health CI."
5. **`github` Claude Code plugin** — try before installing `gh` CLI separately; likely covers the PR/issue automation gap without an extra terminal tool.
6. **Consolidate PDF generation onto Playwright's `page.pdf()`** — no new install (Playwright 1.60 already present); replace the `fpdf`/`weasyprint`/raw-Chrome-subprocess mix over time as scripts are touched.
7. **`security-guidance` Claude Code plugin** — free defense-in-depth alongside the existing pre-commit hook and PR review action.
8. **ImageMagick + qpdf via Homebrew** — low-effort installs for product-photo/label work and grant-PDF merging/form-filling; install when the next concrete need for either comes up rather than pre-emptively.

**Explicitly not recommended:** any Postgres/Google Maps/QuickBooks/Slack MCP server (redundant or immature relative to what's already built), switching SMS carriers away from Twilio as a way to avoid A2P registration (it isn't one), or a dedicated OCR service for H-2A time cards at current volume.

---

## Sources

- Supabase MCP: https://raw.githubusercontent.com/supabase-community/supabase-mcp/main/README.md ; https://supabase.com/mcp (fetched 2026-09-14)
- Playwright MCP: https://raw.githubusercontent.com/microsoft/playwright-mcp/main/README.md (fetched 2026-09-14)
- Stripe agent toolkit / MCP: https://raw.githubusercontent.com/stripe/agent-toolkit/main/README.md (fetched 2026-09-14)
- GitHub repo search (QuickBooks MCP, Google Maps MCP, Postgres MCP): GitHub Search API, queries `quickbooks mcp`, `google maps mcp server`, `postgres mcp server`, fetched 2026-09-14
- NOAA/NWS API: live calls to `https://api.weather.gov/points/40.5,-80.2` and `https://api.weather.gov/alerts/active?area=PA`, fetched 2026-09-14
- Open-Meteo: https://open-meteo.com/en/pricing ; https://open-meteo.com/en/features ; live call to `https://api.open-meteo.com/v1/forecast`, fetched 2026-09-14
- Google Cloud Vision pricing: https://cloud.google.com/vision/pricing (fetched 2026-09-14)
- Telnyx SMS pricing: https://telnyx.com/pricing/messaging (fetched 2026-09-14)
- AWS End User Messaging pricing: https://aws.amazon.com/end-user-messaging/pricing/ (fetched 2026-09-14)
- healthchecks.io pricing: https://healthchecks.io/pricing/ (fetched 2026-09-14)
- Better Stack uptime: https://betterstack.com/uptime (fetched 2026-09-14)
- UptimeRobot pricing: https://uptimerobot.com/pricing (fetched 2026-09-14)
- Claude Code plugins docs: https://docs.claude.com/en/docs/claude-code/plugins.md ; https://docs.claude.com/en/docs/claude-code/discover-plugins.md (fetched 2026-09-14)
- Repo evidence for PDF ad-hoc claim: `scripts/migrate-csa/generate_2026_csa_sales_pdf.py` (headless Chrome subprocess), `legal/grants/ag_innovation_2026/round2_202604189681/01_application/ralph_checklist_pdf.py` (fpdf), `legal/kretschmann_tiny_seed_lease/generate_pdf.py` (weasyprint) — read directly 2026-09-14
- Repo evidence for CLI tool presence check: `command -v gh jq rg magick qpdf pdftk ffmpeg` run directly on the working environment, 2026-09-14
- Prior internal research (context, not re-derived): `docs/research/CLAUDE_CODE_MCP_PLUGINS_ECOSYSTEM_2026.md`, `docs/research/WEATHER_TEMPLATES_RESEARCH.md`, `docs/research/TEXT_SYSTEM_COMPLIANCE_RESEARCH_2026.md`, `docs/research/TEXT_SYSTEM_TECH_RESEARCH_2026.md`

## Date Researched

2026-09-14
