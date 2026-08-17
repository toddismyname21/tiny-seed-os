---
name: csa-vercel-deploy
description: How the csa-portal deploys to prod + the false "Vercel failure" GitHub status signal
metadata:
  type: project
---

The csa-portal (apps/csa-portal) deploys to production at https://csa.tinyseedfarm.com via Vercel's GitHub integration on push to the **`csa-migration`** branch (the long-lived integration branch; `main` is behind). Vercel project: `tiny-seed-csa` (prj_79QslZ2yoA83k0WBp9kICvMNcZGd).

**Why this matters / the trap:** Every commit's GitHub "deployment status" shows **`failure`** — including commits that ARE live on prod (verified: 37ebbe9 is live yet has only a single "failure" status). This is a FALSE signal: it mirrors the GitHub Actions "CSA Portal CI → Build + astro check" job, which fails because `astro check` reports ~9 PRE-EXISTING type errors (cycle.ts:674, order/[token].astro `bump_wholesale_visit` rpc, box/index.astro). Vercel's GitHub-deployments object never receives the eventual success event. The ACTUAL Vercel production build succeeds and auto-promotes regardless.

**Preferred deploy path (verified working 2026-06-30):** from `apps/csa-portal`, run `set -a && source ../../.env.csa && set +a && vercel deploy --prod --token "$VERCEL_TOKEN" --yes`. This builds + promotes + aliases csa.tinyseedfarm.com in ~40s and returns a JSON object with readyState=READY. The `VERCEL_TOKEN` in `.env.csa` is now a REAL token (no longer the "TBD" placeholder), and `vercel` CLI is at /opt/homebrew/bin/vercel. This is more reliable than waiting on the GitHub-integration push (which shows the false `failure` status below). `.env.csa` also has VERCEL_ORG_ID + VERCEL_PROJECT_ID.

**How to apply:**
- Prefer the explicit `vercel deploy --prod --token …` above for a deterministic, immediate prod deploy. Otherwise the GitHub push to `csa-migration` auto-deploys but promotion can LAG many minutes.
- Do NOT trust `gh api .../deployments/.../statuses` (shows `failure`) to judge whether a csa-portal deploy worked. VERIFY on the live site instead: `curl -s -o /dev/null -w '%{http_code}' https://csa.tinyseedfarm.com/<route>` (303 = live+auth-gated, 404 = not deployed yet).
- Production promotion (GitHub-integration path) can LAG many minutes behind the push (Vercel's internal queue). Poll the live route until it resolves; don't assume failure from the status object alone.
- `astro preview` does NOT work (the @astrojs/vercel adapter rejects it). To functionally test an endpoint locally, use `npm run dev` (astro dev on :4321) — it runs the real endpoint code against the real prod Supabase.
- `npm run build` = `astro build` only (no `astro check`), so it will NOT catch type errors. The CI's `astro check` will. New `.rpc('fn')` names must be added to src/lib/database.types.ts Functions block or `astro check` errors (build still passes).

Migrations live at repo-root `supabase/migrations/` (NOT apps/csa-portal/). Apply with: `set -a && source ../../.env.csa && set +a && /Users/samanthapollack/Documents/TIny_Seed_OS/scripts/migrate-csa/.venv/bin/python ../../scripts/migrate-csa/run_migration.py ../../supabase/migrations/<file>` (run from apps/csa-portal). See [[migration-runner]] (reference_migration_runner.md).
