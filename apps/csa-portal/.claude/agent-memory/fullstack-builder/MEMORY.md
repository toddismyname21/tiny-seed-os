# Fullstack Builder — Memory Index

- [Run a CSA migration](reference_migration_runner.md) — how to apply supabase/migrations SQL to the live DB
- [unpdf extraction quirks](project_unpdf_extraction.md) — vendor PDFs: flat text, split SKUs, invisible PUA glyphs
- [Verify against real PDFs/data first](feedback_verify_real_output.md) — read actual output before writing parsers
- [Local admin POST CSRF 403](project_local_admin_post_csrf.md) — admin form-POSTs 403 on the dev server (dual CSRF guard), not a bug
- [CSA Vercel deploy + false "failure" status](project_csa_vercel_deploy.md) — csa-migration→prod; GitHub deploy "failure" is a false signal, verify on live site
- [resolveCycle distribution days](project_resolvecycle_distribution_days.md) — byDistributionDay seeds Tue/Wed/Sat/Sun; Sun=weekend run (South Side); biweekly-parity + admin-curl gotchas
- [customers.routable flag](project_customers_routable.md) — migration 0062 gates the optimizer's home-delivery leg; manual/not-routable stops on the route planner
- [pack_weight_lb](project_pack_weight_lb.md) — migration 0063; total-pounds on the Pick & Pack harvest list; library lookup MUST be exact-name-first (Big Bagz collision)
- [members.cadence](project_member_cadence.md) — migration 0073; cadence is THE weekly-vs-biweekly source of truth; biweekly_week NULL no longer means weekly
- [Deploy + secret-shell blocked in sandbox](project_env_deploy_blocked.md) — `vercel` CLI + inline `.env.csa` sourcing are denied; hand deploy to user, use python DB runner for verification
- [QB vendor name drift](project_qb_vendor_name_drift.md) — QB DisplayNames differ from email vendor names by comma/LLC/"Roasters"; dedup MUST token-normalize, not substring-like
- [Vercel cron IMAP timeout](project_vercel_cron_imap_timeout.md) — Hobby = 60s + 2-cron cap; IMAP-fetch + per-item Claude/QB crons must cap work per invocation and be re-invoke-idempotent
- [Route manual stops](project_route_manual_stops.md) — migration 0084 ad-hoc stops keyed manual:<id>; delivery_stops target XOR now four-way; solver untouched
- [Delivery tracking RLS](project_delivery_tracking_rls.md) — members read ALL routes but ONLY their own stop; route-wide counts/ETA need supabaseAdmin PII-free split-read; migration 0085 adds paused_at/pause_total_sec
