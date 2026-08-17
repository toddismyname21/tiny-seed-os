---
name: CSA portal deploy conventions
description: Real (vs documented) deployment pipeline for apps/csa-portal — branch, Supabase migration path, Vercel production target trigger.
type: project
---

The `apps/csa-portal/` Astro project ships through a path that doesn't quite match the surface-level instructions ("git push origin main").

**Git branch:**
- Working branch is `csa-migration`, NOT `main`. Every CSA portal commit since the migration kicked off lives there.
- The Vercel project config says `productionBranch: main`, but actual production deploys happen from `csa-migration` via explicit API calls with `target: "production"`. Pushes to `csa-migration` create *preview* deploys automatically.
- **Why:** Todd hasn't promoted csa-migration to main yet — the wholesale migration also targets main, and they don't want to mix. Status as of 2026-05-11.
- **How to apply:** `git push origin csa-migration` (not main). Then trigger production via Vercel API (see below).

**Supabase migrations:**
- The repo has a Supabase CLI config but `supabase db push` isn't wired up to credentials. Migrations are applied via the Management API REST endpoint `https://api.supabase.com/v1/projects/{SUPABASE_PROJECT_REF}/database/query`.
- Auth uses `SUPABASE_PAT` from `.env.csa`.
- Cloudflare in front of api.supabase.com returns 1010 on the default `python-requests` User-Agent. Send a browser UA to get through.
- `scripts/migrate-csa/run_migration.py` is the canonical runner — accepts a SQL file path as its only argument.

**Vercel production deploy trigger:**
- Required env vars in `.env.csa`: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`.
- The `gitSource` body MUST include `repoId` (numeric — found via GET `/v9/projects/{id}` → `link.repoId`). Without it, POST returns HTTP 400 "missing required property `repoId`".
- For repoId 1132521680 (tiny-seed-os): POST to `https://api.vercel.com/v13/deployments?teamId={ORG_ID}` with `{ name, project, target: "production", gitSource: { type: "github", ref: "csa-migration", sha: "...", repoId: 1132521680 } }`.
- Production aliases: csa.tinyseedfarm.com, tiny-seed-csa.vercel.app.

**Build time:** ~30-40 seconds end-to-end. Auto-deploys (from push) usually start within seconds; manual production triggers complete in ~35s.

**Env vars present in `.env.csa`** (verified 2026-05-11): SUPABASE_URL, SUPABASE_PROJECT_REF, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY, SUPABASE_DB_PASSWORD, SUPABASE_DB_HOST, SUPABASE_DB_USER, SUPABASE_PAT, VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID, RESEND_API_KEY, RESEND_FROM_EMAIL, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_VERIFY_SERVICE_SID, TWILIO_PHONE_NUMBER, SENTRY_DSN, POSTHOG_API_KEY, SHEET_ID.

**CSP:** apps/csa-portal/vercel.json already permits `connect-src wss://*.supabase.co` — Realtime works out of the box.
