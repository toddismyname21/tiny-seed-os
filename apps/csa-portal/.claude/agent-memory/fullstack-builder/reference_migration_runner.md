---
name: migration-runner
description: How to apply a SQL migration to the live CSA Supabase DB and verify it
metadata:
  type: reference
---

CSA-portal DB migrations are applied to the LIVE Supabase project via the
Management API (not `supabase db push`). From inside `apps/csa-portal`:

```
pip3 install requests --break-system-packages   # one-time; not preinstalled
set -a && source /Users/samanthapollack/Documents/TIny_Seed_OS/.env.csa && set +a
python3 ../../scripts/migrate-csa/run_migration.py ../../supabase/migrations/<file>.sql
```

- Credentials (`SUPABASE_PROJECT_REF`, `SUPABASE_PAT`) live in **repo-root `.env.csa`**
  (gitignored), NOT in `apps/csa-portal/.env`. Project ref: `melizsvabemhaqeaqtyw`.
- The runner executes arbitrary SQL — also handy for ad-hoc verification: write a
  `SELECT ...` to a temp `.sql` and run it; the last statement's rows print back.
  A `SELECT to_regclass('public.x')` / `information_schema.columns` check confirms
  DDL landed.
- HTTP 201 = success. Migrations are idempotent-friendly (CREATE … IF NOT EXISTS,
  ADD COLUMN IF NOT EXISTS, DROP NOT NULL) so re-running the same file is safe.

**Schema types are NOT auto-generated.** There is no `gen types` script — after a
migration you must hand-edit `src/lib/database.types.ts` (add the table to
`Tables`, add new columns, fix nullability) or `astro check` errors against the
typed Supabase client. `astro build` does NOT typecheck, but `astro check` does.

See [[verify-real-output]].
