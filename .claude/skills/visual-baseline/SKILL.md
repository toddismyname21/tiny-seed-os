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

1. `index.html` (hub)
2. `greenhouse-dashboard.html`
3. `sales.html`
4. `wholesale.html`
5. `employee-management.html`
6. `marketing-command-center.html`
7. `financial-dashboard.html`
8. `chief-of-staff.html`
9. `schedule.html`
10. `farmers-market.html`

## Steps per Page

### 1. Navigate
Use `mcp__playwright__browser_navigate` to load `https://app.tinyseedfarm.com/[page]`

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
