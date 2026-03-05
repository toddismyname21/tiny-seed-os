---
name: full-audit
description: Run comprehensive audit suite on HTML files — element refs, API URLs, UX preflight, and full security/quality audit
---

# Full Audit

Run the complete audit suite on the specified file(s).

## Usage

- `/full-audit web_app/greenhouse-dashboard.html` — audit one file
- `/full-audit --all` — audit all HTML files in web_app/ and root

## Checks (run in order)

### 1. Element Reference Validation
```bash
./scripts/validate-element-refs.sh $ARGUMENTS
```
Checks that every `getElementById`, `querySelector`, event handler, etc. references an element that actually exists in the HTML.

### 2. API URL Consistency
```bash
./scripts/validate-api-urls.sh
```
Verifies no hardcoded API URLs — all should use `api-config.js`.

### 3. UX Preflight Audit
```bash
./scripts/ux-preflight-audit.sh $ARGUMENTS
```
Checks UX quality: mobile viewport, touch targets, contrast, loading states, error handling.

### 4. Full Security & Quality Audit
```bash
./scripts/audit/run-full-audit.sh $ARGUMENTS
```
Runs all audit scripts in `scripts/audit/` — security patterns, accessibility, performance, code quality.

## Output Format

Report each check as:
- **PASS** — no issues found
- **WARN** — non-blocking issues found (list them)
- **FAIL** — blocking issues found (list them with file:line references)

## If `--all` is specified

Discover all HTML files:
```bash
find web_app/ -name '*.html' -type f
find . -maxdepth 1 -name '*.html' -type f
```
Run checks 1-4 on each file. Aggregate results into a summary table.
