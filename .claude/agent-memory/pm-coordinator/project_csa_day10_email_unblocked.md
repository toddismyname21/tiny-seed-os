---
name: CSA Day 10 email integration — actual blockers (not Cloudflare)
description: 2026-05-18 audit found Resend already verified; Cloudflare DNS migration is NOT a Day 10 prereq. Real blockers are Supabase SMTP config + Day 10 implementation work.
metadata:
  type: project
---

On 2026-05-18, during the Cloudflare DNS migration audit, discovered the runbook's premise (Squarespace breaking the Resend DKIM TXT with trailing whitespace) had self-resolved. Resend reports the `tinyseedfarm.com` domain as `verified`. A live test email through the Resend API succeeded.

## What's actually blocking Day 10 email integration

1. **Supabase Auth SMTP is `null`** — using rate-limited default mailer (4 emails/hour). One PATCH to `/v1/projects/{ref}/config/auth` switches it to Resend SMTP. ~5 min, zero downtime.

2. **No `_dmarc` TXT record** — Gmail/Yahoo 2024+ bulk-sender policy needs DMARC. Without it, our transactional volume will get filtered. Can be added directly in Squarespace DNS panel — does NOT require DNS migration. ~5 min.

3. **Day 10 spec implementation work** — `src/lib/email.ts`, transactional templates (welcome, weekly preview, pickup reminder, renewal, vacation confirm), Resend webhook → `notification_log` Edge Function. This is the actual dev work.

## What's NOT blocking

- ❌ Cloudflare DNS migration — was framed as the Day 10 prereq but is now optional. Real reasons to do it eventually exist (Page Rules for legacy URL redirects, faster propagation, DMARC management ergonomics) but none are critical-path for Day 10.

## Why this matters

**How to apply:** When picking up CSA email work, skip the Cloudflare migration step in the runbook. Go directly to: (1) add DMARC TXT to Squarespace, (2) PATCH Supabase Auth SMTP to Resend, (3) implement Day 10 spec. Save Cloudflare migration for a later session when it can be planned around the Day 14 cutover.

**Cloudflare runbook to revisit:** `docs/specs/CLOUDFLARE_DNS_MIGRATION_RUNBOOK.md` — needs a status header update noting the DKIM issue resolved and the migration is now optional/deferred. Inventory section is mostly correct but missing the `CAA` records and Google `_domainkey` DKIM that I documented in `[[reference_dns_inventory_tinyseedfarm]]`.

**Resend credentials live at:** `.env.csa` (RESEND_API_KEY, RESEND_FROM_EMAIL=hello@tinyseedfarm.com).
**Supabase PAT for SMTP PATCH:** `.env.csa` SUPABASE_PAT.
**Resend domain ID:** `ed76caed-a99c-4140-abb7-be92398650be`.
