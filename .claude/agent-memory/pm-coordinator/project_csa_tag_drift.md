---
name: csa-tag-drift-and-canonical-tags
description: 2026-06-02 — discovered + resolved Shopify customer-tag drift on 2026 CSA. Canonical tags now `2026-summer-csa` + `2026-flower-csa`. Self-healing reconciliation script lives at scripts/migrate-csa/sync_csa_tags.py. Underlying Flow workflow still applies wrong tag — Todd to fix in UI.
metadata:
  type: project
---

**Canonical tags (filter these in Shopify segments + Shopify Email campaigns):**
- `2026-summer-csa` ← Summer Veg + Flex CSA buyers (segment "2026 Summer CSA Members", auto-updating)
- `2026-flower-csa` ← Flower CSA buyers (segment "2026 Flower CSA Members" created 2026-06-02, id `gid://shopify/Segment/526538637465`)

DO NOT use `csa-2026-summer` (wrong order) — that tag is bound to a stale Shopify Flow workflow and is silently applied to new CSA buyers. Until the Flow workflow is renamed in Shopify Admin → Apps → Flow (UI-only edit, no API), every fresh CSA buyer arrives carrying the wrong tag and is silently EXCLUDED from the launch-email segment.

**How to apply:** Before ANY segment-based Shopify Email campaign that depends on these tags, run `python3 scripts/migrate-csa/sync_csa_tags.py --commit`. It is idempotent, never removes tags, and only adds the missing canonical tag. Re-running with no flag = dry-run preview. Safe to wire into a daily cron (GitHub Actions, Supabase pg_cron via Edge Function, or local launchd).

**Why:** Shopify Flow IS installed. Flow workflow definitions are not exposed via the Admin GraphQL API (only the Flow app is queryable, not its workflow rules). Until the offending workflow is fixed in the Shopify Admin UI, the self-healing reconciliation script is the safety net. After Todd fixes the Flow, the script becomes a belt-and-suspenders no-op.

**State after 2026-06-02 fix:**
- 163 customers tagged `2026-summer-csa` (was 156)
- 52 customers tagged `2026-flower-csa` (was 0 — new canonical)
- 4 NOT_SUBSCRIBED customers in the segments (Mollie Rosenzweig, Shay Park, Lisa Garrison, Robert Healey) → Shopify Email won't deliver; Todd to reach out personally
- Mollie Rosenzweig has both shares (summer + flower) and is unsubscribed → priority for Todd's personal outreach

Related: [[csa-migration-data-gaps]] (data sync was already clean — issue was purely Shopify tag plumbing); [[csa-portal-prod-deploy]]; [[csa-day10-email-unblocked]].
