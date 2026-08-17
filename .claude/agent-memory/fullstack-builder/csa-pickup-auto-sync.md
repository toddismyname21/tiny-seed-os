---
name: csa-pickup-auto-sync
description: Pickup auto-assign from Shopify variantTitle in the sync + nightly self-healing health-check cron — matcher rules, idempotency contract, vault-secret pattern.
metadata:
  type: project
---

CSA pickup auto-sync + nightly health-check (built 2026-06-04 on csa-migration). The 15-min Shopify→Supabase sync was creating member rows with `pickup_location_id = NULL` because nothing read the variantTitle (which IS the pickup choice). ~149 launch members had no pickup → launch blocker. This work fixes the bleed forward AND adds a daily self-healer.

**The matcher (`src/lib/pickup-from-variant.ts`) is STRICT-PREFIX, not greedy keyword.**
- Algorithm: lowercase + trim → detect home_delivery / allison_park_tbd up front → strip `$amount / ` flex prefix → strip ` (...)` parenthetical → rewrite table → exact case-insensitive fallback against pickup_locations.name.
- REWRITES table only contains the Shopify-vs-canonical name mismatches (bloomfield → "Bloomfield Market" because the Wed CSA Bloomfield stop doesn't exist; mt lebanon → "Mt. Lebanon"; simon → "Simon's"; st paul → "St. Paul's"). Canonical names with NO mismatch (Highland Park, Squirrel Hill, Mt. Lebanon, Simon's, St. Paul's) ALSO live in REWRITES so legacy variants without periods/apostrophes still land — meaning the rewrite branch always fires before the exact branch for those names. Tests assert the rewrite-branch reason for them.
- The `bloomfield → Bloomfield Market` rewrite IS DELIBERATE — Shopify's "Bloomfield (SATURDAY FARMER'S MARKET)" variant maps to the SAT market, NOT a separate Wed CSA stop (no Wed Bloomfield row exists). Don't add a separate Wed Bloomfield row without first changing this rewrite. The bug it prevents already happened once: greedy `.includes("bloomfield")` matched "Highland Park (Bryant St. Market)" as Bloomfield.
- The matcher NEVER guesses. Unmatched → `{locationId: null, reason: "unmatched:<verbatim>"}` so the sync can surface it for human review. Home_delivery / allison_park_tbd return null with the appropriate reason — these are EXPECTED nulls (member-choice or delivery_address branch), the caller must NOT auto-assign.

**Idempotency contract — NEVER overwrite a non-NULL pickup_location_id.**
- Sync (`/api/sync/shopify-orders.ts`): PRE-READS existing member row by legacy_id; OMITS pickup_location_id + pickup_day from the upsert payload when existing pickup is non-NULL. A member's manual pickup choice (via /account/pickup) wins forever.
- Sibling-share fallback (flower follows veg, both in sync AND nightly-health): UPDATE has both `.eq('id', t.id)` AND `.is('pickup_location_id', null)` predicates — even a race between two concurrent runs can't double-fill.
- Nightly backfill: same `.is('pickup_location_id', null)` predicate on the UPDATE.
- **How to apply:** every pickup-touching code path must filter on `.is('pickup_location_id', null)` BEFORE update, not just assume the read-then-write is exclusive.

**Sibling-share rule: flower customers who also buy veg pick up flowers at the same stop.**
- After member upsert for an order, if a flower member is still NULL on pickup, scan the SAME customer's active members for a summer_veg / flex share with a non-NULL pickup → copy.
- Implemented in BOTH the sync (per-order, after member upserts) AND nightly-health (across all active candidates, grouped by customer_id).

**The nightly cron (`/api/cron/nightly-health`) is bearer-gated, runs at 06:00 ET, does THREE things:**
1. Pickup backfill (any active member with NULL pickup AND NULL delivery_address, share_type ∈ {summer_veg, flex, flower, spring_veg}). Looks up most recent Shopify order → matchVariantToPickup → if non-null update. Then sibling-share pass.
2. Tag-sync (TS port of `scripts/migrate-csa/sync_csa_tags.py`): ensures `2026-summer-csa` (summer_veg + flex) and `2026-flower-csa` (flower) tags. Same TEST_EXCLUDES set. tagsAdd is idempotent.
3. Sync watermark lag check (> 30 min = two missed */15 runs = flag).
- Emails Todd the daily summary via Resend; subject ✓ if clean, ⚠ if actionable. Fail-soft Resend send (logs + swallows; returns 200 regardless). Logs to `notification_log` (type='health_check').
- Each of the three sections wrapped in independent try/catch → one failure never blocks the others.

**Migration 0033 vault-secret pattern.**
- Stores nothing in the migration file; pulls bearer from `vault.decrypted_secrets WHERE name = 'cron_secret'` at run time.
- DO-block guard: if the vault secret isn't present, RAISE NOTICE and skip `cron.schedule` rather than failing — operator can run the schedule block manually after creating the secret. Same secret reused by the existing `csa-shopify-sync` job pattern (per docs/CSA_SYNC_RUNBOOK §2).
- One-time setup I had to do: `SELECT vault.create_secret('<bearer>', 'cron_secret');` — the existing `csa-shopify-sync` job had the bearer hardcoded into its `cron.job.command` (not in vault), so the vault was empty on day 1. After creating it + re-applying 0033, the schedule registered cleanly.
- **How to apply:** future cron jobs should follow the same vault-pull pattern (NEVER inline the secret), and any migration adding a new cron should use the same DO-block-with-NOTICE skip so a missing secret doesn't fail the whole migration.

**The shopify.ts ORDERS_QUERY now selects `variantTitle`.** Previously absent. `ShopifyLineItem.variantTitle: string | null` is now part of the public shape. Callers that don't care can ignore it; planOrder threads it through to PlannedMember.

**The dry-run preview includes the pickup-match outcome.** Per-member entries in the `planned[]` array gained `variant_title`, `would_fill_pickup_location_id`, `pickup_match_reason` — surfaces matcher behavior on the admin sync page without writing anything.

**Tests are tsx scripts, NOT vitest.** Existing convention. Added `package.json` script `"test:unit": "for f in src/lib/*.test.ts; do echo \"==> $f\"; npx tsx \"$f\" || exit 1; done"` to bring them under a stable npm name. 38 assertions in pickup-from-variant.test.ts.

**Live smoke test confirmed end-to-end (2026-06-04 morning, against production data):**
- Unauth → 401, auth → 200 with full health-check JSON.
- Resend send succeeded (`email_outcome: {ok: true, detail: "sent"}`).
- tags_customers_checked: 183 (every active CSA member); tags_added: 0 (already in sync).
- pickups_fixed: 0 (PM had already manually run /tmp/fix_null_pickups.py earlier).

See also [[csa-sync-reliability]] (the in-endpoint error alert + /admin/sync), [[csa-pickup-nudge]] (the member-facing pickup forcing-nudge), [[csa-portal-deploy-conventions]] (Management API + Vercel deploy).
