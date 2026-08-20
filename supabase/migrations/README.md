# Supabase Migrations

## Convention: timestamps, not sequence numbers

**New migrations use `YYYYMMDDHHMMSS_description.sql`.** This is the Supabase
CLI default.

```bash
supabase migration new add_wholesale_delivery_notes
# creates supabase/migrations/20260820143012_add_wholesale_delivery_notes.sql
```

If you are writing the file by hand, generate the prefix the same way the CLI
does (UTC):

```bash
date -u +%Y%m%d%H%M%S
```

## Why the change

`0001`–`0092` used sequential numbering. That works with one author. It breaks
the moment there are several: Todd now runs dedicated Claude Code terminals
(CSA, Wholesale, Grants) in separate git worktrees, and two of them will both
reach for `0093_` on the same afternoon. Nothing errors — the filenames simply
differ in description, both get committed, and the applied order becomes
whatever the sort happens to produce. The collision is silent, which is the
worst kind.

Timestamps can't collide across terminals, sort correctly by definition, and
record when the migration was actually authored. This is precisely why the
Supabase CLI defaults to them.

## `0001`–`0092` are frozen

Do **not** renumber, rename, or reorder any existing migration. They are
applied in production, and they are referenced by name in `CHANGE_LOG.md` and
in commit messages. Renaming an applied migration desynchronises the
`supabase_migrations.schema_migrations` ledger from the files on disk.

Timestamped names sort after 4-digit names lexically (`2` > `0`), so new
migrations land after the historical sequence without any special handling.

## Scope of this directory

This is the **root** `supabase/migrations/` — the CSA portal / farm database.
It is shared by every domain terminal and is therefore SHARED KERNEL: claim it
in `.claude/rules/active-locks.md` before adding a migration. The
`scripts/hooks/shared-kernel-lock.sh` hook enforces this and also warns
(without blocking) if a new file uses the old `NNNN_` form.

`apps/grant-portal/supabase/migrations/` is a separate, app-scoped database and
is not covered by the lock.
