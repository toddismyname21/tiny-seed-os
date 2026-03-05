# Tiny Seed OS — QA & Testing Cheat Sheet

Quick reference for all testing tools, skills, and CI workflows.

---

## Slash Commands (type in Claude Code)

| Command | What it does | Example |
|---------|-------------|---------|
| `/full-audit [file]` | Runs ALL audit checks: element refs, API URLs, UX preflight, security | `/full-audit web_app/sales.html` |
| `/full-audit --all` | Audits every HTML file in the project | `/full-audit --all` |
| `/ux-audit [file]` | Deep UX evaluation: Lighthouse scores, accessibility, screenshots, AI visual analysis | `/ux-audit greenhouse-dashboard.html` |
| `/smoke-test [file]` | Load a page in a real browser, check for JS errors, verify content renders | `/smoke-test web_app/sales.html` |
| `/smoke-test --changed` | Smoke test only the HTML files you've changed (git diff) | `/smoke-test --changed` |
| `/smoke-test --all` | Smoke test the 10 highest-priority pages | `/smoke-test --all` |
| `/visual-baseline` | Capture desktop + mobile screenshots of key pages (saves baselines for comparison) | `/visual-baseline` |
| `/visual-diff` | Compare current pages against saved baselines — flags visual regressions | `/visual-diff` |
| `/visual-diff --update` | Replace old baselines with fresh screenshots | `/visual-diff --update` |
| `/verify-html [file]` | Quick check: element refs + API URLs + UX preflight (lighter than full-audit) | `/verify-html web_app/wholesale.html` |
| `/deploy-frontend` | Push to GitHub Pages + auto-validate (HTTP 200, element refs, API URLs, UX preflight) | `/deploy-frontend` |
| `/deploy-backend` | Push Apps Script backend with correct deployment ID | `/deploy-backend` |
| `/pre-work-check` | Pre-work validation before starting any dev task | `/pre-work-check` |

---

## npm Scripts (run in terminal)

| Command | What it does |
|---------|-------------|
| `npm test` | Run ALL Playwright E2E tests (MCC tabs + all-page smoke) |
| `npm run test:mcc` | Run only the MCC tab visibility tests (11 tabs) |
| `npm run test:smoke` | Run the all-pages smoke test (75 pages) |
| `npm run test:audit` | Run the full security/quality audit suite |
| `npm run test:validate` | Quick validation: element refs + API URLs |

**First time setup:** `npm install` then `npx playwright install chromium`

---

## What Runs Automatically (CI/CD)

### On Every Push to main (if HTML/JS/CSS changed)

| Workflow | What it checks | Where to see results |
|----------|---------------|---------------------|
| **E2E Smoke Tests** | Loads pages in headless browser, checks for JS errors, verifies content | GitHub Actions tab |
| **Post-Deploy Audit** | Waits 90s for Pages deploy, then validates: element refs, API URLs, HTTP 200 on live site, content spot-check, UX preflight | Commit comment on GitHub |

### On Every Pull Request

| Workflow | What it checks |
|----------|---------------|
| **E2E Smoke Tests** | Same as above — catches issues before merge |
| **Security Review** | Anthropic Claude reviews code changes for security issues |

### Every 15 Minutes

| Workflow | What it checks |
|----------|---------------|
| **Site Health Monitor** | HTTP 200 on app.tinyseedfarm.com, API responds, correct API URL in live HTML |

### On Every Commit (pre-commit hook, runs locally)

13 checks including:
- Hardcoded secrets detection (blocks commit)
- Banned JS patterns: `eval()`, `new Function()` (blocks commit)
- innerHTML injection warnings
- SRI hash verification on CDN resources
- CSP meta tag checks
- API URL validation

---

## Audit Scripts (run manually)

| Script | What it does |
|--------|-------------|
| `./scripts/audit/run-full-audit.sh` | Runs all audit scripts below |
| `./scripts/validate-element-refs.sh [file]` | Checks every getElementById/querySelector has a matching element |
| `./scripts/validate-api-urls.sh` | Verifies no hardcoded API URLs (should use api-config.js) |
| `./scripts/ux-preflight-audit.sh [file]` | UX quality: mobile viewport, touch targets, loading states, error handling |
| `./scripts/security-audit.sh` | Full OWASP security sweep |

---

## When to Use What

| Situation | Use this |
|-----------|---------|
| **Just finished editing a page** | `/verify-html web_app/your-page.html` |
| **About to deploy** | `/deploy-frontend` (auto-validates after push) |
| **Something looks wrong on mobile** | `/ux-audit your-page.html` |
| **Want to test everything** | `/full-audit --all` or `npm test` |
| **Checking if a deploy broke something** | `/smoke-test --all` |
| **Comparing before/after a big change** | `/visual-baseline` (before) then `/visual-diff` (after) |
| **Quick sanity check** | `npm run test:validate` |

---

## Testing Layers

| Layer | Confidence | What it catches | Tools |
|-------|-----------|----------------|-------|
| **Layer 1: Deterministic** | 95%+ | Broken element refs, wrong API URLs, missing meta tags, WCAG violations | validate-element-refs, validate-api-urls, Lighthouse, axe-core |
| **Layer 2: Behavioral E2E** | 85-90% | Pages that crash, blank tabs, JS errors, missing content | Playwright smoke tests, MCC tab tests |
| **Layer 3: UX Evaluation** | 60-70% | Poor layout, confusing navigation, unreadable text, bad mobile experience | /ux-audit (Lighthouse + a11y + Claude vision) |
