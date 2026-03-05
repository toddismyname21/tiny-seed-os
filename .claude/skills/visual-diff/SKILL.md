---
name: visual-diff
description: Compare current page screenshots against baselines using image-compare MCP — detect visual regressions
---

# Visual Diff

Compare current page screenshots against saved baselines to detect visual regressions.

## Usage

- `/visual-diff` — compare all baselined pages
- `/visual-diff greenhouse-dashboard.html` — compare one page
- `/visual-diff --update` — take new screenshots and replace baselines

## Prerequisites

Baselines must exist in `visual-baselines/`. Run `/visual-baseline` first if they don't.

## Steps

### 1. Read manifest
Read `visual-baselines/manifest.json` to get the list of baselined pages.

### 2. For each page

#### a. Take fresh screenshots
- Navigate via `mcp__playwright__browser_navigate` to `https://app.tinyseedfarm.com/[page]`
- Desktop (1440x900): `mcp__playwright__browser_take_screenshot`
- Mobile (375x812): `mcp__playwright__browser_take_screenshot`

#### b. Compare against baselines
Use `mcp__image-compare__compare_images` to compare:
- Fresh desktop screenshot vs `visual-baselines/desktop/[page].png`
- Fresh mobile screenshot vs `visual-baselines/mobile/[page].png`

#### c. Evaluate differences
- **< 2% diff**: PASS (no significant change)
- **2-5% diff**: WARN (minor change, review recommended)
- **> 5% diff**: REVIEW — use Claude vision to analyze both screenshots and describe what changed

### 3. If `--update` flag

Replace baselines with fresh screenshots. Update manifest with new timestamp.

## Output

```
## Visual Regression Report

| Page | Desktop Diff | Mobile Diff | Status |
|------|-------------|-------------|--------|
| greenhouse-dashboard | 0.3% | 1.1% | PASS |
| sales | 12.4% | 8.7% | REVIEW |

### Changes Detected

#### sales.html (desktop: 12.4%, mobile: 8.7%)
[Claude vision description of what changed]

## Summary
- Pages compared: X
- Passing: Y (< 2% diff)
- Warnings: Z (2-5% diff)
- Reviews needed: W (> 5% diff)
```
