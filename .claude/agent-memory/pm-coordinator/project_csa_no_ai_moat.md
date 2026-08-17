---
name: CSA Migration — AI Box Customization DROPPED from scope
description: 2026-05-08 decision to NOT build Harvie-style AI box customization for the CSA migration; preserve preference list + auto-optimize toggle as simple filtering instead
type: project
---

On 2026-05-08, during the CSA migration planning, Todd reviewed the
February 2026 `docs/CSA_IMPROVEMENT_ROADMAP.md` which proposed
Harvie-style AI box customization as a competitive moat. He asked
"do you think it gets us anything, or should we keep it?"

**Decision: DROP the AI customization moat framing.**

**Why:** Single-farm CSA math doesn't justify ML maintenance burden:
- Harvie was a multi-farm marketplace optimizing across 100s of variety options
- Tiny Seed's weekly harvest is 8-15 items — small optimization space
- 80%+ of weekly boxes are similar regardless of preferences
- Real churn drivers (per ATTRA / Stone Barns research): 32% pickup convenience, 24% box value, 18% cooking confidence, 14% communication, 12% specific items
- AI box customization addresses category 5 only — a simple "never send X" preference list does the same job with 5% of the dev burden

**What's KEPT (Todd reaffirmed):**
- Recipe integration as Phase 4 differentiator
- Auto-optimize box toggle — but built as **preference-list filtering**, NOT as ML scoring
- Simple member preferences (`dislikes[]`, `allergies[]`, `delivery_notes`)

**What's DROPPED:**
- `implicit_signals` table (KEPT_IN_BOX, SWAPPED_OUT, RECIPE_CLICKED weights)
- `member_health_scores` ML snapshots
- Complex preference scoring logic
- Marketing claims of "AI moat"

**Time freed up reallocated to:**
- Polished auth flow (passkey support, social SSO)
- Cooking confidence content (recipes per crop)
- Sub-100ms swap UX
- Pickup attendance reminders (top churn driver)

**How to apply:** If a future session is reading the
`CSA_IMPROVEMENT_ROADMAP.md` and considering the Harvie-style AI moat
section: it's been deliberately dropped. Don't re-propose it. The
"competitive moat" for Tiny Seed is QUALITY + SOURCE STORY +
PROXIMITY + COOKING CONFIDENCE — not algorithmic sophistication.

**Lock date:** 2026-05-08
**Source:** `docs/CSA_MIGRATION_PLAN_2026.md` §8.5 (commit `e5291e5` on `csa-migration` branch)
