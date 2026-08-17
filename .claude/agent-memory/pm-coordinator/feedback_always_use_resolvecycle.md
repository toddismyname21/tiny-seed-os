---
name: always-use-resolvecycle
description: Any "this week" CSA count (boxes, flowers, flex, harvest, deliveries) MUST come from resolveCycle — never a raw count of active members. Raw counts ignore A/B biweekly + holds + season start and WILL be wrong.
metadata:
  type: feedback
---

**RULE: For ANY "this week" CSA number — bouquets, boxes, harvest qty, deliveries, per-stop counts — compute it through `resolveCycle(supabase, weekMonday)` (run via `npx tsx` in apps/csa-portal with SUPABASE_URL + SERVICE_ROLE_KEY). NEVER answer with a raw `SELECT count(*) ... WHERE status='active'` query.**

**Why:** `resolveCycle` is the single source of truth — it applies **biweekly A/B parity**, **vacation holds**, **season start dates**, swaps, and per-stop bucketing. A raw active-member count ignores all of that and is WRONG.
- 2026-06-22: I sent a floral list of **56 bouquets** (raw active flower members) for flower Week 1. Todd was (rightly) furious — the CORRECT number was **32** (resolveCycle excludes 23 flower members who were off-week on A/B + holds). Same class of mistake risks over-harvest/over-make.
- The readiness check that same day already showed `resolveCycle` flower=32 vs raw=56 — the right number was right there and I ignored it.

**How to apply:** Before quoting/sending ANY weekly operational count, resolve the cycle and read its `members` (filter by share_type), `byDistributionDay`, `byStop`, `boxCompositionByMember`, `flexOrderTotals`, `excluded_biweekly`, `excluded_on_hold`. If asked "how many X this week," the answer comes from resolveCycle, full stop. Related: [[project_csa_weekly_cycle]], [[box-plan-two-tables]].
