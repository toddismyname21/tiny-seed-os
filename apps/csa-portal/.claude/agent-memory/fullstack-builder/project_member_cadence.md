---
name: member-cadence
description: members.cadence is THE weekly-vs-biweekly source of truth (migration 0073); biweekly_week is only meaningful when cadence='biweekly'
metadata:
  type: project
---

`members.cadence text NOT NULL ('weekly'|'biweekly')` (migration 0073) is THE
source of truth for weekly-vs-biweekly delivery. `biweekly_week ('A'|'B'|NULL)`
is ONLY meaningful when `cadence='biweekly'`. The tuple
(cadence='biweekly', biweekly_week NULL) means "needs A/B assignment" and is
treated as ON-WEEK until assigned (legacy-safe — nobody loses boxes while
unassigned).

**Why:** Before 0073, `biweekly_week` was the only cadence signal and a NULL was
treated as "on every week". That could not tell a WEEKLY member apart from a
biweekly member not-yet-assigned A/B, causing 4 prod bugs: biweekly-unassigned
silently got weekly boxes; weekly+stray-parity got HALF their boxes; the admin
"Unassigned A/B" counter was uncomputable; the self-service picker halved mixed
households' weekly shares. Migration 0073's backfill was behavior-preserving
(biweekly_week set→biweekly, NULL→weekly) plus exactly TWO evidenced,
structurally-guarded corrections for Shopify-proven mixed households.

**How to apply:**
- `biweekly_week === null` NO LONGER means "weekly" — ALWAYS check `cadence`.
- Counting "needs a week": `cadence='biweekly' AND biweekly_week IS NULL`.
- `cycle.ts isMemberOnThisWeek` + `schedule.ts resolveMemberSchedule` take an
  OPTIONAL `cadence` (absent → legacy derivation, for back-compat). Pass the
  column from the DB. `resolveMemberSchedule` returns `needsAssignment`.
- cadence is purchase-defined: the Shopify sync sets it from
  `categorize().freq`. Members can pick A/B but CANNOT change cadence (that's
  admin-only, via /api/admin/members/[id]/biweekly-week which writes BOTH
  columns from a single `schedule` field).
- `lib/share-buckets.ts` still groups by the raw biweekly_week column (a display
  filter) — the authoritative "needs assignment" counter is the cadence-aware
  one on admin/index, not the share-bucket "unassigned" label.

See [[verify-real-output]] — this fix was PM-verified against prod + Shopify.
