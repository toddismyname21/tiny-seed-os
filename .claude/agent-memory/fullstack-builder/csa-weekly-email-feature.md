---
name: csa-weekly-email-feature
description: CSA recipe library + box-matched weekly email — opt-in source of truth, UNSUBSCRIBE_SECRET gate, the audit-trigger PK bug it surfaced, send capacity.
metadata:
  type: project
---

The CSA weekly box email + recipe library (built 2026-05-24, commit 31496e2 on csa-migration). See also [[csa-portal-build-gotchas]], [[csa-portal-deploy-conventions]], [[csa-management-api-implicit-txn]], [[csa-portal-color-tokens]].

**Shape:** a tagged recipe LIBRARY (`recipes` table, migration 0026) + a weekly email that auto-matches active recipes to the upcoming Wednesday's `box_contents` by crop-name OVERLAP. Owner-confirmed design. Code: `src/lib/recipes.ts` (matching primitives + `COMMON_CROP_TAGS` hint), `src/lib/weekly-email.ts` (matcher `matchRecipesToBox`, branded HTML/text template, HMAC unsubscribe token), pages `/admin/recipes` + `/admin/weekly-email`, public `/unsubscribe.astro`, APIs `/api/admin/recipes.ts` + `/api/admin/weekly-email/send.ts`.

**Matching:** recipe `crops text[]` overlap box `product_name` (case- AND plural-insensitive via `normalizeCropToken` — strips trailing `s` on words >3 chars — plus a substring fallback so "cherry tomatoes" ⟷ "tomato"). Picks up to 3, INTERLEAVING farm+link (farm first) for a natural mix. recipes RLS is admin-only (`admin_all_recipes`); the email reads recipes via the SERVICE-ROLE client (bypasses RLS) — there's deliberately no member/anon read policy.

**Opt-in is the source of truth + the recipient query.** Recipients = `members.status='active'` AND `member_preferences.newsletter_opt_in=true`, joined to the owning `customers` (is_active), DE-DUPED by lowercased customer email (one email per household even with multiple member rows). Same logic in BOTH the `/admin/weekly-email` count and the send handler. `member_preferences.newsletter_opt_in` is set during onboarding (`/api/onboarding/contact`) + editable at `/api/account/preferences`.

**⚠️ Send is GATED on `UNSUBSCRIBE_SECRET` (a server secret, `optional` in astro.config.mjs).** CAN-SPAM: every email embeds a per-recipient HMAC-signed one-click unsubscribe link (`signUnsubscribeToken` / `verifyUnsubscribeToken`, node:crypto createHmac sha256 + timingSafeEqual, URL-safe b64). The send handler 400s `unsubscribe_not_configured` and `/unsubscribe` shows a soft "went wrong" until the secret is set. As of 2026-05-24 `UNSUBSCRIBE_SECRET` is NOT in `.env.csa` or Vercel — PM must add it before any live send.

**NO auto-send anywhere.** Sending only happens when the owner clicks in `/admin/weekly-email` (mode=test → one email to the admin, not logged; mode=all → opted-in members). No cron/scheduled invocation.

**Idempotency + capacity:** every send logged to `email_log` (migration 0026) with `UNIQUE(email_type, week_date, member_email)` — the send SKIPs anyone already logged 'sent' this week, so re-running to finish never double-mails. Batched/throttled for Resend free tier: 600ms between sends (~1.6/s), MAX_PER_RUN 90; on HTTP 429 it STOPS and returns `{sent,skipped,failed,remaining,rate_limited,capped}`. CAPACITY FLAG: ~100/day free tier vs up to 269 active members → a full send needs ≥3 runs across ≥3 days, or a paid Resend tier.

**BUG this surfaced + fixed (migration 0027).** `log_audit_event()` (migration 0009) hardcoded `NEW.id`/`OLD.id` for `audit_log.row_id`. Works for every audited table EXCEPT `member_preferences` (PK is `member_id`, no `id` column) — so INSERTing a member_preferences row raised `42703: record "new" has no field "id"`. Quirk: the UPDATE/DELETE branches reference `NEW.id` too but empirically only INSERT failed (so the existing prefs UPSERT silently worked on UPDATE but failed on first INSERT). Effect: 0 member_preferences rows existed across all 269 active members → newsletter opt-in could never be turned on → the email had zero possible recipients. Fix: resolve row_id from `to_jsonb(NEW/OLD)->>'id'` COALESCE `->>'member_id'` (general across all 8 audited tables, CREATE OR REPLACE, no trigger churn). If you ever add an audited table whose PK isn't `id` or `member_id`, extend the COALESCE.

**Routing note:** `/unsubscribe` is PUBLIC (NOT in middleware `PROTECTED_PREFIXES`) — a logged-out recipient reaches it from their inbox; it verifies the token then calls the SECURITY DEFINER RPC `unsubscribe_member_by_email(p_email)` (runs as anon, UPDATE-only, idempotent) via supabaseAdmin. Added to the unauth E2E probe as a 200 (the two new admin pages as 303).
