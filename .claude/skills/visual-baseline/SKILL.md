---
name: visual-baseline
description: Capture visual baseline screenshots of key pages at desktop and mobile viewports using Playwright MCP
---

# Visual Baseline

Capture baseline screenshots for visual regression testing.

## Usage

- `/visual-baseline` — capture all 10 priority pages
- `/visual-baseline greenhouse-dashboard.html` — capture one specific page

## Priority Pages

1. `web_app/index.html` (hub)
2. `web_app/greenhouse-dashboard.html`
3. `web_app/sales.html`
4. `web_app/wholesale.html`
5. `web_app/employee-management.html`
6. `web_app/marketing-command-center.html`
7. `web_app/financial-dashboard.html`
8. `web_app/chief-of-staff.html`
9. `web_app/schedule.html`
10. `web_app/farmers-market.html`

## Steps per Page

### 1. Navigate
Use `mcp__playwright__browser_navigate` to load `https://app.tinyseedfarm.com/[page]` (use full path including `web_app/` prefix)

### 2. Desktop screenshot (1440px)
- Use `mcp__playwright__browser_resize` to set viewport to 1440x900
- Wait 2 seconds for content to render
- Use `mcp__playwright__browser_take_screenshot`
- Save to `visual-baselines/desktop/[page-name].png`

### 3. Mobile screenshot (375px)
- Use `mcp__playwright__browser_resize` to set viewport to 375x812
- Wait 2 seconds for content to render
- Use `mcp__playwright__browser_take_screenshot`
- Save to `visual-baselines/mobile/[page-name].png`

## Output

Create/update `visual-baselines/manifest.json`:
```json
{
  "created": "2026-03-05T...",
  "pages": [
    {
      "name": "greenhouse-dashboard.html",
      "desktop": "desktop/greenhouse-dashboard.png",
      "mobile": "mobile/greenhouse-dashboard.png"
    }
  ]
}
```

Report:
```
## Visual Baselines Captured
- Pages: X
- Desktop screenshots: X (1440x900)
- Mobile screenshots: X (375x812)
- Saved to: visual-baselines/
```
