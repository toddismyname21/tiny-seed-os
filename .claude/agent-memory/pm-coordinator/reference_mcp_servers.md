---
name: MCP servers configured for this project
description: All 13 MCP servers configured for Tiny Seed OS — most not known until 2026-03-29 session
type: reference
---

These are configured in `~/.claude.json` under `.projects./Users/samanthapollack/Documents/TIny_Seed_OS.mcpServers`.

They are ONLY active in Claude Code sessions started fresh from the project directory. They do NOT appear in sessions that were already running when added.

## Visual / Design MCPs (highest value for UX work)
- `playwright`     — `@playwright/mcp@latest` — browser automation, screenshots, click, fill forms
- `lighthouse`     — `@danielsogl/lighthouse-mcp@latest` — Lighthouse audits as MCP tools
- `a11y`           — `a11y-mcp` — accessibility auditing
- `image-compare`  — `mcp-image-compare-server` — pixel diff between screenshots
- `image-optimizer`— `mcp-image-optimizer` — compress/optimize images
- `colorsandfonts` — `@colorsandfonts/mcp@latest` — design tokens, color palettes

## Research / Data MCPs
- `brave-search`   — `@brave/brave-search-mcp@latest` — web search
- `firecrawl`      — `firecrawl-mcp` — scrape web pages cleanly
- `google-sheets`  — `mcp-google-sheets` — direct Sheets access (alternative to Apps Script)

## Dev Tooling MCPs
- `eslint`         — `@eslint/mcp` — lint JS files
- `github`         — `@modelcontextprotocol/server-github` — GitHub API
- `claude-flow`    — `claude-flow v3alpha` — multi-agent orchestration
- `context7`       — `@upstash/context7-mcp` — library docs lookup (global)
- `chrome-devtools`— `chrome-devtools-mcp@latest` — DevTools (global)

## How to use Playwright for visual audit
In a fresh session, ask: "Use Playwright to navigate to [URL] and take a screenshot."
Playwright MCP exposes: navigate, screenshot, click, fill, evaluate, wait.
