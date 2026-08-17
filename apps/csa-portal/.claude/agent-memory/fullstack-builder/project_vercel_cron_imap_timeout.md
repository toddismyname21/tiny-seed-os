---
name: vercel-cron-imap-timeout
description: CSA portal is Vercel Hobby (60s function ceiling); IMAP-fetch + per-item Claude/QB crons must cap work per invocation
metadata:
  type: project
---

The CSA portal (`apps/csa-portal`) deploys to Vercel **Hobby** — max function duration is **60s** (default is even lower; set `maxDuration: 60` on the `@astrojs/vercel` adapter in astro.config.mjs to get the ceiling). Hobby also allows **max 2 vercel.json crons** (flex-list-reminder + vendor-bills fill both slots; the other ~7 crons in `src/pages/api/cron/` run via Supabase pg_cron/Vault, not Vercel).

**Why it bites:** A cron that IMAP-fetches many messages (download full RFC822 + `simpleParser` MIME + base64 PDFs) AND makes a per-message Anthropic + QuickBooks round-trip blows 60s on a wide window. The `/api/cron/vendor-bills` 45-day backfill returned `FUNCTION_INVOCATION_TIMEOUT` (empty/HTML body, not JSON) until it was bounded.

**How to apply:** For these crons — (1) cap candidates per invocation (`?max=`, default small); (2) apply the cap DURING the IMAP fetch (skip already-logged rows BEFORE downloading their bodies, break once enough survivors), not just at the processing stage; (3) give the fetch phase only a fraction of the wall-clock budget so processing has room; (4) mark the response `truncated` and make re-invocation idempotent (dedup-on-log by a stable message id = `uidValidity-uid`) so a backfill can be run in chunks. The production nightly window (3 days ≈ 2-4 candidates) completes in ~2s and never truncates — the budget is for the testing/backfill path. Also: POST to portal API routes is blocked by Astro's cross-site-POST guard, so cron/curl tests must use GET (both handlers exist). See [[qb-vendor-name-drift]] and [[local-admin-post-csrf]].
