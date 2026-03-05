---
name: ux-audit
description: Comprehensive UX evaluation using MCP tools — Lighthouse, accessibility, screenshots, and Claude vision analysis
---

# UX Audit

Run a comprehensive UX evaluation on $ARGUMENTS using all available MCP testing tools.

## Target User Persona

Evaluate for: **Farm workers and small farm owners** with limited tech experience, often using mobile phones in bright sunlight, muddy hands, limited connectivity. Interfaces must be immediately obvious, high-contrast, and forgiving of errors.

## Steps

### 1. Load page via Playwright MCP
Navigate to the page with `test_mode=true` auth bypass:
- Use `mcp__playwright__browser_navigate` to load `https://app.tinyseedfarm.com/$ARGUMENTS`
- If testing locally, use `http://localhost:3000/web_app/$ARGUMENTS`

### 2. Desktop screenshot (1440px)
- Use `mcp__playwright__browser_resize` to set viewport to 1440x900
- Use `mcp__playwright__browser_take_screenshot` — save reference

### 3. Mobile screenshot (375px)
- Use `mcp__playwright__browser_resize` to set viewport to 375x812 (iPhone SE)
- Use `mcp__playwright__browser_take_screenshot` — save reference

### 4. Lighthouse audit
Run `mcp__lighthouse__run_audit` on the page URL. Collect:
- Performance score
- Accessibility score
- Best Practices score
- SEO score

Target thresholds:
- Performance: >= 50 (our pages are heavy)
- Accessibility: >= 80
- Best Practices: >= 70
- SEO: >= 60

### 5. Accessibility audit
Run `mcp__a11y__audit_webpage` on the page URL.
Flag any WCAG 2.1 AA violations, especially:
- Missing alt text on images
- Insufficient color contrast (critical for outdoor use)
- Missing form labels
- Keyboard navigation issues
- Touch target sizes < 44x44px

### 6. Static UX preflight
```bash
./scripts/ux-preflight-audit.sh $ARGUMENTS
```

### 7. Claude Vision analysis
Read the desktop and mobile screenshots and evaluate:
- Is the primary action obvious within 3 seconds?
- Is the navigation clear and limited (3-5 items)?
- Are interactive elements visually distinct from static content?
- Is text readable at arm's length on mobile?
- Is there visual hierarchy guiding the user's eye?
- Are error/empty states handled gracefully?

## Output

Produce a structured report:

```
## UX Audit: [filename]

### Scores
| Metric | Score | Target | Status |
|--------|-------|--------|--------|
| Lighthouse Performance | XX | 50 | PASS/FAIL |
| Lighthouse Accessibility | XX | 80 | PASS/FAIL |
| Lighthouse Best Practices | XX | 70 | PASS/FAIL |
| Lighthouse SEO | XX | 60 | PASS/FAIL |
| a11y Violations | X | 0 | X issues |
| UX Preflight | XX/XX | all pass | X warnings |

### Critical Issues (must fix)
- [list]

### Warnings (should fix)
- [list]

### Recommendations
- [list prioritized by impact]
```
