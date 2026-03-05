---
name: smoke-test
description: Interactive smoke testing via Playwright MCP — load pages, check console errors, verify content renders
---

# Smoke Test

Run interactive smoke tests on Tiny Seed OS pages via Playwright MCP.

## Usage

- `/smoke-test web_app/sales.html` — test one specific page
- `/smoke-test --changed` — test all git-modified HTML files
- `/smoke-test --all` — test the 10 highest-priority pages

## Priority Pages (for `--all`)

1. `web_app/index.html` — main hub
2. `web_app/greenhouse-dashboard.html` — greenhouse management
3. `web_app/sales.html` — sales dashboard
4. `web_app/wholesale.html` — wholesale orders
5. `web_app/employee-management.html` — employee management
6. `web_app/schedule.html` — scheduling
7. `web_app/marketing-command-center.html` — MCC
8. `web_app/financial-dashboard.html` — finances
9. `web_app/chief-of-staff.html` — executive dashboard
10. `sowing-sheets.html` — sowing task sheets

## For `--changed`

Discover changed HTML files:
```bash
git diff --name-only HEAD | grep -E '\.html$'
```

## Steps per Page

### 1. Navigate via Playwright MCP
Use `mcp__playwright__browser_navigate` to load the page on the live site:
- URL: `https://app.tinyseedfarm.com/[path]`
- Use the full file path including `web_app/` prefix (e.g., `https://app.tinyseedfarm.com/web_app/sales.html`)
- Root pages use just the filename (e.g., `https://app.tinyseedfarm.com/sowing-sheets.html`)

### 2. Check for console errors
Use `mcp__playwright__browser_console_messages` to capture all console output.
- Flag any `error` level messages
- Ignore warnings and info messages
- Ignore known API/network errors (Failed to fetch, CORS, 401, 403)

### 3. Verify content renders
Use `mcp__playwright__browser_snapshot` to get the page's accessibility tree.
- Verify the page has meaningful content (not just a loader or blank page)
- Check that primary navigation is present
- Check that main content area has text

### 4. Take screenshot
Use `mcp__playwright__browser_take_screenshot` for visual reference.

### 5. Check network failures
Use `mcp__playwright__browser_network_requests` to check for failed requests.
- Flag any 4xx or 5xx responses (except expected API auth failures)

## Output

For each page tested:
```
## [page-name]
- Load: PASS/FAIL (HTTP status)
- Console Errors: X critical, Y warnings
- Content: PASS/FAIL (has meaningful content)
- Network: X failed requests
- Screenshot: [attached]
```

Summary at end:
```
## Summary
- Pages tested: X
- All passing: Y
- Failures: Z (list specific pages)
```
