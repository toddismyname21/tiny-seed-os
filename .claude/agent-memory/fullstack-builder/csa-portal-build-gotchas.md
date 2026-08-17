---
name: csa-portal-build-gotchas
description: Non-obvious facts for building in apps/csa-portal — manual database.types, season phase semantics, env schema, the migration runner venv.
metadata:
  type: project
---

Gotchas when building in `apps/csa-portal/` (Astro + Supabase + Vercel). See also [[csa-portal-deploy-conventions]].

**`src/lib/database.types.ts` is HAND-MAINTAINED, not generated.**
- Header says it'll be regenerated via `supabase gen types` "once we add a CLI token" — that hasn't happened. So when you add a table in a SQL migration, you MUST also hand-add its `Row`/`Insert`/`Update`/`Relationships` block here, or `astro check` won't know the table exists and typed `.from('new_table')` calls fail.
- **Why:** the typed Supabase client (`SupabaseClient<Database>`) keys everything off this file.
- **How to apply:** every new table migration → mirror the columns into database.types.ts in the same change.
- **It already drifts from the live DB in places.** Concrete case found 2026-06-18: `flex_inventory.library_id uuid` (FK → product_library, added in migration `0045_product_library.sql`) existed in the live DB but was MISSING from the `flex_inventory` Row block here, so typed `.select('...library_id')` / `.insert({library_id})` wouldn't compile. Migrations live at REPO ROOT `supabase/migrations/`, not under apps/csa-portal. **How to apply:** before writing a typed query against a column, grep `supabase/migrations/` for it; if the migration added it but database.types.ts lacks it, hand-add the field (matching nullability) as part of your change.

**`seasonPhase()` in `src/lib/season.ts` keeps a season 'active' through its ENTIRE final delivery week, not just the final delivery day.**
- A season with last delivery on a Wednesday stays 'active' through the following Tuesday (final Wed + 6 days), then flips to 'complete'. e.g. summer last-delivery Oct 7 → 'active' through Oct 13, 'complete' Oct 14. Spring last-delivery May 27 → 'active' through June 2, 'complete' June 3.
- **Why:** members should still see "this week's box" on the days after the final Wednesday. This is deliberate UX, encoded in the summer test contract.
- **How to apply:** if a task brief says "season X is complete the day after the last delivery," it's wrong against this code — assert the true (active-through-the-week) behavior and document the discrepancy rather than breaking the shared logic.

**Env vars for server secrets go in `astro.config.mjs` `env.schema` via `envField.string({ context:'server', access:'secret' })`, imported from `astro:env/server`.**
- Secrets that may be ABSENT in a local build/check (e.g. SHOPIFY_ACCESS_TOKEN, CRON_SECRET) must be `optional: true` or the build fails locally. Guard their presence at runtime instead. They're real on Vercel.
- The repo does NOT use `process.env` / `import.meta.env` directly anywhere — always the typed `astro:env` imports.

**`npm run build` (esbuild) does NOT full-type-check `.astro` files — `npx astro check` does. They disagree.**
- Concrete case (2026-07-09, pick-pack `[...slug].astro`): an inline TS type-predicate inside a JSX expression container — `.filter((d): d is { col: typeof d.col; cell: NonNullable<typeof d.cell> } => !!d.cell)` — BUILT FINE but broke `astro check` (the `{ ...generic... }` object type made the Astro/JSX parser mis-tokenize `>` / `{`, cascading "Cannot find name 'r'"/"')' expected" errors down the whole template). The build is NOT sufficient verification.
- **How to apply:** ALWAYS run `npx astro check` after editing an `.astro` file, not just `npm run build`. Inside JSX expression braces, avoid complex inline type predicates; narrow with `flatMap((x) => cond ? [obj] : [])` (which type-narrows cleanly) instead of `.filter((): x is T =>)`. The baseline is 11 pre-existing errors (all stale `database.types.ts` casts, none in touched files) — a clean change keeps it at exactly 11.

**The migration runner (`scripts/migrate-csa/run_migration.py`) needs the venv at `scripts/migrate-csa/.venv`.**
- The system python3 lacks `requests`. Run it as `scripts/migrate-csa/.venv/bin/python scripts/migrate-csa/run_migration.py <sql>`.
- Source env first: `set -a && source ./.env.csa && set +a` (`.env.csa` is at REPO ROOT, not under apps/csa-portal). Needs SUPABASE_PROJECT_REF + SUPABASE_PAT.
- Project ref: `melizsvabemhaqeaqtyw`. A successful DDL apply returns HTTP 201.

**Members table constraints worth knowing (migrations 0004/0013/0014):**
- `members.share_type` ∈ {spring_veg, summer_veg, fall_veg, flower, flex, add_on, wholesale_csa}. The Shopify `categorize()` also yields `home_delivery` (skip — it's a delivery method) and `flex` (→ store credit, not a member row).
- `members.share_size` ∈ {small, regular, family, petite, large, light, full, half, quarter, single, double} or NULL.
- `members.season` is stored as a bare word in live data: `Summer`, `Spring`, plus legacy `2026`/`Bouquet`/`Flex`. Write `Spring`/`Summer`.
- `members.payment_status` live values: mostly `Paid` (capital P).
- `customers.customer_type` ∈ {csa, retail, market, wholesale, chef, employee}; CSA buyers are `csa`.
- Admin RLS pattern: `is_admin_caller()` (migration 0017, SECURITY DEFINER) + `FOR ALL TO authenticated USING/WITH CHECK (is_admin_caller())`. Service role bypasses RLS.

**Member self-service writes go through the cookie-aware RLS-scoped client (`Astro.locals.supabase` in pages / `locals.supabase` in API routes), NEVER supabaseAdmin.**
- Customer self-edit: policy `customers_self_update` (migration 0011) = `FOR UPDATE USING (email = auth.jwt()->>'email') WITH CHECK (...same...)` — the WITH CHECK also BLOCKS changing email to someone else's, so email-change can't be done through it. To update the caller's own customers row, filter `.eq('email', user.email)` (matches the predicate; only their row matches). Member self-edit shares this pattern via `members_self_update` / `prefs_self_all` (also 0011).
- The self-service profile editor lives at `/account/profile` (page) + `/api/account/profile.ts` (POST), built 2026-05-22 — it mirrors the /api/account/preferences contract (isSameOriginPost/PORTAL_ORIGIN CSRF, Zod, ?ok=saved/?error=<code> redirects). Email rendered read-only there (auth identity). It REPLACED the old "Email Todd to update" read-only profile section on the account hub.
- Migrations live at REPO ROOT `supabase/migrations/`, NOT under apps/csa-portal/. Astro server builds output to `.vercel/output/` (route patterns in `.vercel/output/config.json` like `account/profile/?$`); `dist/server` gets rearranged away by the Vercel adapter, so verify routes there, not in dist.
