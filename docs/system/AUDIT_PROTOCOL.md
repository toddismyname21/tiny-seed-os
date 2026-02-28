# Code & Script Audit Protocol — Tiny Seed Farm OS

## Purpose

Every code change must pass automated and manual AI-powered security review before deployment. This is non-negotiable. Our stack (single-file HTML/JS, Google Apps Script, Sheets backend, GitHub Pages) has specific attack surfaces that generic linters miss.

---

## Mandatory Audit Gates

### Gate 1: Pre-Commit (Every Change)

Before any `git push origin main`, the agent MUST run a security sweep covering:

- **No hardcoded secrets** — API keys, deployment IDs, script URLs must come from `api-config.js`, never inline
- **No innerHTML with external data** — All Sheets-sourced content rendered via `.textContent`, never `.innerHTML`
- **No eval(), document.write(), setTimeout(string)** — Zero tolerance
- **All external scripts/styles have SRI hashes** — `integrity` attribute on every `<script>` and `<link>` from CDN
- **CSP meta tag present** — HTML files must include `<meta http-equiv="Content-Security-Policy">`

### Gate 2: Weekly Full Audit

Run a 3-pass audit weekly on the entire codebase:

**Pass 1 — Context Build (no bug hunting yet):**
Map all entry points, data flows, API calls, trust boundaries, and the complete request lifecycle from browser → Apps Script → Sheets → response.

**Pass 2 — Security Sweep:**
Check against OWASP Top 10 with focus on our attack surfaces:

- Client-side price/quantity manipulation (cart must send item IDs + quantities ONLY — server looks up prices)
- Formula injection in Sheets writes (prefix user values with `'`)
- Unvalidated doPost/doGet parameters (whitelist the `action` parameter)
- Race conditions on concurrent writes (LockService required)
- CORS exposure (Apps Script returns `Access-Control-Allow-Origin: *` by default — accept this risk but validate server-side)

**Pass 3 — Adversarial Red Team:**
Agent assumes attacker role. Attempts: price manipulation via DevTools, direct curl to Apps Script endpoint with forged data, formula injection into Sheets cells, XSS via crafted variety names in the spreadsheet.

### Gate 3: Monthly Deep Audit

- Run `gitleaks detect` on full repo history
- Scan all dependencies for known CVEs
- Review Apps Script project sharing permissions (only Todd should have editor access)
- Review Apps Script triggers for unexpected entries
- Verify GitHub Pages "Enforce HTTPS" is enabled
- Run Mozilla Observatory scan on app.tinyseedfarm.com

---

## Architecture Rules (Non-Negotiable)

| Rule | Why |
|------|-----|
| Server-side price lookup | Client-submitted prices = attacker sets their own price |
| Server-side quantity validation | Reject negative, zero, non-integer, over-stock |
| Server-side total calculation | The Apps Script doPost computes the real total, never trusts the client |
| LockService on all writes | Concurrent Sheets writes corrupt data without it |
| Formula injection prevention | Prefix all user-submitted cell values with `'` before writing |
| No secrets in git history | Use `api-config.js` pattern; `.clasp.json` in `.gitignore` |
| Whitelist action parameter | Never do `this[action]()` — check against explicit list |

---

## Trust Boundary Model

```
BROWSER (Untrusted)              APPS SCRIPT (Trusted)
─────────────────────           ──────────────────────
Cart display (cosmetic)    →    Look up real prices from Sheet
Quantity inputs            →    Validate type, range, stock
Bundle selection           →    Recalculate totals independently
Form fields                →    Sanitize all input
"Total: $X.XX" display          Return confirmation
```

**RULE:** Everything in the browser is cosmetic/UX only. Everything in Apps Script is authoritative.

---

## Tools Required

| Tool | Purpose | When |
|------|---------|------|
| Trail of Bits Skills | Structured audit workflows in Claude Code | Install once, use ongoing |
| Gitleaks | Secret scanning across git history | Monthly + after any config change |
| Mozilla Observatory | Security header grading | Monthly on production URL |
| Anthropic Security Review | Auto PR review GitHub Action | Every pull request |

---

## Severity Classification

- **P0 (Critical)** — Blocks deployment. Price manipulation, secret exposure, injection vectors, auth bypass.
- **P1 (High)** — Fix before next push. Missing server-side validation, innerHTML with external data, missing LockService.
- **P2 (Medium)** — Fix this week. Missing CSP, missing SRI hashes, verbose error messages.
- **P3 (Low)** — Track for next sprint. Code complexity, naming, minor dead code.

---

## Agent Directive

When auditing code, agents MUST:

1. **Build context first** — Read the full file and map data flows before hunting bugs
2. **Use specific prompts per dimension** — Not one generic "review this" but separate security, performance, logic, and infrastructure passes
3. **Provide evidence** — Exact file, exact line, exact attack scenario, exact fix
4. **Score findings** — Severity (P0-P3) × Confidence (High/Medium/Low). Only P0-P1 + High confidence block deployment
5. **Never self-review without adversarial pass** — The agent that wrote the code cannot be the only one reviewing it
6. **Apply the Recursive Criticism technique** — After generating findings, ask "What did I miss?" and re-review

---

## Implementation

- **Pre-commit hook:** `scripts/pre-commit-hook.sh` (checks 9-13 enforce Gate 1)
- **Weekly audit:** `./scripts/security-audit.sh` (runs Gate 2 three-pass audit)
- **PR review:** `.github/workflows/security-review.yml` (Anthropic auto-review)
- **Monthly audit:** Manual checklist per Gate 3 above

---

*Based on methodologies from Trail of Bits, Anthropic, OWASP, SANS, Bishop Fox, Crash Override, and Cursor BugBot. Backed by research showing multi-pass audits catch 2-3x more issues than single-pass.*
