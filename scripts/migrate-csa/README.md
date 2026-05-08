# CSA Data Migration Scripts

This directory contains the data migration tooling for moving CSA data from Google Sheets to Supabase Postgres.

## Files

| File | Purpose |
|---|---|
| `sheets_to_supabase.py` | Idempotent migration: reads 6 Google Sheets, transforms, upserts to Supabase. Run with `--dry-run` first to validate transformation. |

## Setup (Day 1 of CSA migration)

1. Provision Supabase project (Pro tier, free initially, region `us-east-1`)
2. Apply schema migrations from `supabase/migrations/0001_*.sql` through `0012_*.sql`
3. Refresh Sheets OAuth token (use existing `chief_of_staff/.cos_oauth_tokens.json` flow)
4. Set env vars in your shell:

```bash
export SUPABASE_URL=https://your-project.supabase.co
export SUPABASE_SERVICE_ROLE_KEY="..."     # NOT anon key — service role bypasses RLS for migration
export SHEETS_OAUTH_TOKEN="ya29..."
export SHEET_ID=128O56X_FN9_U-s0ENHBBRyLpae_yvWHPYbBheVlR3Vc
```

## Running the migration

### Step 1 — Dry run (validates transformation, writes nothing)

```bash
python3 sheets_to_supabase.py --dry-run
```

Reports row counts that WOULD be migrated, plus any rows skipped (missing required fields, duplicate emails, etc.).

### Step 2 — Migrate one table at a time (recommended for first live run)

```bash
python3 sheets_to_supabase.py --table customers
python3 sheets_to_supabase.py --table products
python3 sheets_to_supabase.py --table members        # depends on customers + pickup_locations being loaded
python3 sheets_to_supabase.py --table boxes
python3 sheets_to_supabase.py --table flex
```

### Step 3 — Full migration

```bash
python3 sheets_to_supabase.py
```

Verifies counts at the end against expected (~309 members, ~1694 customers, ~960 box_contents, etc.).

## Idempotency

All upserts use `ON CONFLICT (legacy_id) DO UPDATE` — re-running is safe. Rows update in place. New rows get inserted.

`flex_transactions` has no legacy_id and is **append-only**. Re-running creates duplicates. The migration script inserts only on first pass; reconciliation against the source Sheet should be manual if rerun is needed.

## Dual-write window (Days 4-12)

After initial bulk load, run this script every 30 minutes via cron or GitHub Actions schedule:

```bash
*/30 * * * * cd /opt/migration && python3 sheets_to_supabase.py >> /var/log/csa-migration.log 2>&1
```

Apps Script continues to write to Sheets as the source of truth. The script picks up any changes and upserts them to Supabase.

## Cutover (Day 13)

1. Lock Sheets to read-only at cutover moment (Apps Script edit endpoints disabled)
2. Run final migration: `python3 sheets_to_supabase.py`
3. Verify row counts match between Sheets and Postgres
4. Update DNS to point `csa.tinyseedfarm.com` → Vercel
5. Apps Script CSA endpoints log "use new portal" + redirect

## Troubleshooting

| Error | Fix |
|---|---|
| `401 Unauthorized` from Sheets | OAuth token expired — refresh via `chief_of_staff/.cos_oauth_tokens.json` |
| `409 Conflict` on customer email | Two SALES_Customers rows have the same email — script keeps first occurrence |
| `member.customer_id NOT NULL` violation | Customer migration must run BEFORE members. Use `--table customers` first. |
| FK violation on `pickup_location_id` | pickup_locations must be seeded (migration 0012) BEFORE members migration |

## Verification queries (run in Supabase SQL editor post-migration)

```sql
-- Row count parity check
SELECT 'customers' AS table, COUNT(*) FROM customers
UNION ALL SELECT 'members', COUNT(*) FROM members
UNION ALL SELECT 'box_contents', COUNT(*) FROM box_contents
UNION ALL SELECT 'flex_transactions', COUNT(*) FROM flex_transactions;

-- Active CSA members for current season
SELECT season, share_type, COUNT(*) FROM members WHERE status='active' GROUP BY season, share_type ORDER BY season, share_type;

-- Members without a customer (should be 0)
SELECT COUNT(*) FROM members WHERE customer_id NOT IN (SELECT id FROM customers);

-- Members without a pickup location (might exist — home delivery)
SELECT COUNT(*) FROM members WHERE pickup_location_id IS NULL AND delivery_address IS NULL;
```
