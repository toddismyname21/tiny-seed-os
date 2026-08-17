---
name: csa-admin-trust-dashboard
description: /admin/members customer-keyed redesign + /admin/health dashboard — defaults, share-priority, customer-id deep-link redirect, status API contract, run-cron proxy, nightly health metadata schema.
metadata:
  type: project
---

The CSA portal has two admin trust-restoring pieces built together on 2026-06-04:

## /admin/members rewrite

- **Row = customer, not member.** One row per `customer_id`; the customer's shares + add-ons render as inline pill badges (e.g. "Sharon Bernstein — [Summer Veg · Family] [Flower · Full] [🍄 Mushrooms]").
- **Defaults that match Todd's mental model**: `status=active`, `share_types=all-except-add_on`, `pickup_location=all`.
- **Headline** reads "X customers · Y active shares" (NOT the legacy "N members match"). Y is the raw active member-row count; X is the deduped customer count.
- **Share-type filter** is multi-select checkboxes (faster to scan than a multi-select <select>). JS collects the selected values into a single canonical `share_types=a,b,c` URL param on submit and disables the per-checkbox inputs so only the hidden canonical one round-trips. JS-off fallback uses the SSR-rendered hidden value (admin can't toggle without JS but the page renders + filters correctly).
- **Pagination is per-CUSTOMER**: 50 customers/page. We fetch up to `MAX_FETCH_ROWS = 2000` raw member rows server-side (covers ~5x current scale), group in memory, paginate. When the cap is hit we surface "showing first 2000 rows — narrow filters" caveat rather than silently lying about the count. If membership ever quadruples, move to an RPC.
- **SHARE_PRIORITY** (single canonical order, also used by [id].astro for the customer-id redirect): `summer_veg=0, flex=1, flower=2, spring_veg=3, fall_veg=4, wholesale_csa=5, add_on=6`. Active shares win over inactive ones before SHARE_PRIORITY breaks ties.
- **Pickup-conflict ⚠**: when a customer's active shares have different pickup labels, the row gets a ⚠ icon next to the primary pickup so Todd notices the split. The actual per-share details live on the detail page.
- **Progress** column shows `weeks_remaining/total_weeks` of the share with the HIGHEST weeks_remaining among the customer's active shares (the "longest-running" share).
- **Customer status**: active iff ANY share is active; otherwise the primary share's status.
- **Legacy `share_type=X` single-value param** still parses correctly — links from comms logs / marketing pages continue working.

## /admin/members/[id] — accepts EITHER member_id or customer_id

When the route id is a syntactically valid uuid, we look it up as a `customers.id` first. If it resolves, 303 to that customer's primary active member detail page (same SHARE_PRIORITY). If no customers row matches, we fall through to the original member-id lookup — old deep-links keep working unchanged. The redirect preserves any `?ok=/?error=` query string.

## /admin/health — six health-signal cards

Cards (all hydrated by a single GET /api/admin/health/status, <500ms):

1. **Sync state** — minutes since last `shopify_sync_state.last_synced_at`. Thresholds: yellow≥20min, red≥60min.
2. **NULL pickups** — active members with `pickup_location_id IS NULL AND delivery_address IS NULL AND share_type IN ('summer_veg','flex','flower','spring_veg')`. Surfaces the **Allison-Park-TBD sub-count separately** (detected in-memory by `customer.city.startsWith('allison park')` OR `customer.zip === '15101'`) so the *actionable* count is the real number. Thresholds on the actionable count: yellow≥1, red>20.
3. **Missing canonical tag** — count of active veg/flex customers whose Shopify record isn't carrying `2026-summer-csa`. **Read from the nightly health-check metadata**, NOT computed live (Shopify per-customer GraphQL fan-out is too slow for a <500ms aggregate).
4. **Wrong tag drift** — count carrying the misordered `csa-2026-summer`. Same source: nightly metadata.
5. **Last reconciliation** — most recent `notification_log` row where `notification_type='health_check'`. Pulls fix-counts + sync_lag_minutes out of the JSONB metadata column. Thresholds: yellow≥18h, red≥26h. status='never' when no row yet.
6. **Magic-link delivery 24h** — counts `notification_log` rows of `notification_type='magic_link'`. Returns `status='no_data'` (not red) when `sent===0` because we don't currently log magic links — Supabase Auth → Resend goes around our logging. Phase 2 adds Resend webhooks.

**Polling**: 30s auto-refresh. Pauses while a "Run reconciliation now" request is in flight. Pauses entirely when the tab is hidden. Refreshes immediately when the tab becomes visible again.

**Run-cron proxy** (`POST /api/admin/health/run`):
- Server-side proxy to `/api/cron/nightly-health` with `Authorization: Bearer ${CRON_SECRET}`.
- Both `isSameOriginPost` CSRF + `requireAdmin` enforced.
- Sends `x-admin-email` header for cron-side audit.
- Maps upstream `404` → `503` with `error='cron_not_yet_deployed'` so the UI shows "not yet deployed" instead of a generic 502 (matters when the parallel agent's cron endpoint hasn't shipped yet).
- `CRON_SECRET` absent → `500` with `error='cron_secret_not_configured'` (legitimate dev/test state — tests accept this).
- Upstream fetch throw → `502` with `error='cron_unreachable'`.

## Coupling with the parallel agent's nightly-health endpoint

The /admin/health cards 3, 4, 5 READ values the parallel agent's `/api/cron/nightly-health` writes into `notification_log.metadata` (JSONB). The contract:

```
{
  pickups_fixed: number,            // recon card: "fixed X pickups"
  tags_fixed: number,               // recon card: "Y tags"
  tags_missing_canonical: number,   // tag-drift card: big number
  tags_wrong_count: number,         // wrong-tag card: big number
  sync_lag_minutes: number,         // recon card: "sync lag Z min"
}
```

Until the parallel agent writes a `health_check` row, the tag-drift cards show "—" with status='unknown' (not red — we don't false-alarm).

## Files

- `apps/csa-portal/src/pages/admin/members/index.astro` (rewritten)
- `apps/csa-portal/src/pages/admin/members/[id].astro` (added customer-id redirect at top)
- `apps/csa-portal/src/pages/admin/health.astro` (new)
- `apps/csa-portal/src/pages/api/admin/health/status.ts` (new)
- `apps/csa-portal/src/pages/api/admin/health/run.ts` (new)
- `apps/csa-portal/src/components/AdminShell.astro` (added "🩺 Health" nav item)
- `apps/csa-portal/src/pages/api/admin/reports/[name].csv.ts` (now accepts `share_types` plural; legacy `share_type` still works)
- `apps/csa-portal/tests/e2e/admin-members-health.spec.ts` (8 new tests)
- `apps/csa-portal/tests/e2e/logged-out.spec.ts` (added /admin/health route + 2 API 403 tests)

See also: [[csa-pickup-auto-sync]] (parallel-built nightly health endpoint), [[csa-sync-reliability]] (existing /admin/sync page that this new dashboard complements, not replaces).
