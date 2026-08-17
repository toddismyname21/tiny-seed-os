---
name: csa-portal-color-tokens
description: apps/csa-portal brand-green tokens are WCAG-AA tuned — which green to use for text/buttons vs decorative, so you don't reintroduce a contrast failure.
metadata:
  type: project
---

The `apps/csa-portal` brand greens in `src/styles/global.css` `@theme` are WCAG-AA tuned (since 2026-05-24). Picking the wrong one for small text re-breaks the now-hard-gated `color-contrast` axe check. See also [[csa-portal-test-harness]].

- `--color-ts-primary: #166534` (green-800) — the ACTION green: button labels, white-on-green buttons (`bg-ts-primary`), links, badges (`text-ts-primary` on `bg-ts-primary/10|15`), active bottom-nav label. 7.13:1 on white, 6.82:1 on the `#fafaf7` page bg, ≥5.7:1 on its own tinted badges. USE THIS for any small text/UI element.
- `--color-ts-primary-dark: #14532d` (green-900, 9.11:1) — hover for primary buttons/links.
- `--color-ts-primary-light: #22c55e` and `--color-ts-seasonal: #22c55e` — VIBRANT, for LARGE/DECORATIVE accents only (box hero, icon tints, empty-state art — those need only 3:1). DO NOT use for small text or normal-size UI text: `#22c55e` is ~2.x:1 and FAILS AA. The comments in global.css say this explicitly.
- `--color-ts-success` mirrors `--color-ts-primary` (#166534).
- Magenta `--color-ts-accent #be185d` already passes (6.04:1) — fine for text.

**Why:** the old `#16a34a` primary measured 3.29:1 (and 2.7:1 on green-on-green-tint badges) — the lone serious axe violation, fixed by deepening to green-800. The fix is via the design TOKEN, so it cascades to all ~39 files using `text-ts-primary`.

**How to apply:** when adding green text/buttons/badges, use `text-ts-primary` / `bg-ts-primary` (= #166534) — never hardcode a lighter green and never reach for `--ts-primary-light`/`--ts-seasonal` for text. The axe gate (`npm run test:a11y`, now with NO color-contrast rule baseline) will FAIL the build if you reintroduce a sub-4.5:1 green. (Two pre-existing 12px `--ts-text-muted #64748b`-on-tint nodes are node-baselined — see [[csa-portal-test-harness]] — and a portal-wide `--ts-text-muted` darken is the open follow-up.)
