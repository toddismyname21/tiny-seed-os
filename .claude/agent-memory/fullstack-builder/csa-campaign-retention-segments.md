---
name: csa-campaign-retention-segments
description: CSA campaign renewal/win-back segments (Phase 2 W2) — resolveRecipientsRaw single-source, lapsed definition, renewal_url substitution, dashboard-lock/category constraints.
metadata:
  type: project
---

Phase 2 Wave 2 (2026-07-05) extended the EXISTING campaign email system (not a new one) with renewal + win-back audiences. Builds on [[csa-campaign-sender]].

**Single source of truth:** count and send MUST use one segment function. `lib/campaign.ts resolveRecipientsRaw(supabase, filter)` dispatches on `filter.segment` ('active'/'renewal_window'/'lapsed'). SEND = sendCampaign → resolveRecipients → resolveRecipientsRaw; COUNT = recipients-count.ts → countRecipients → resolveRecipientsRaw. TEST_EXCLUDES applied by BOTH callers on the raw list (so every segment excludes test accounts). This refactor removed the old duplicated `resolveRecipientsPreExclude`.

**Season-derived helpers live in `lib/campaign-segments.ts`** (new-file, type-only import from campaign.ts to avoid a runtime cycle). `weeksRemainingInSeason = totalWeeks − currentWeekNumber + 1` is the EXACT dashboard renewal-banner formula.

**Why the weeks-left helper is NOT shared with dashboard yet:** dashboard.astro was LOCKED by PM (Phase 2 W1) during this build, so it still inlines the same arithmetic. When its lock releases, point it at `weeksRemainingInSeason`.

**LAPSED definition (documented, season-derived — no single column):** customer is lapsed when (1) has a lapse signal = a members row status IN (lapsed/expired/inactive/cancelled) OR status='active' but its share's season is season-derived 'complete'; AND (2) has no active share now; AND (3) not unsubscribed. Unsubscribe RPC (`unsubscribe_member_by_email`) sets ALL of a customer's member_preferences.newsletter_opt_in=false, so "any false" == opted out; MISSING prefs = opted-in (most migrated lapsed members have no prefs row).

**{{renewal_url}} substitution:** added to `personalize()` (escapeHtml-safe for href), sourced from `portal_settings.renewal_url` via `fetchRenewalUrl(supabase)`, wired into sendCampaign/sendTestEmail/preview.ts. Uses the same {{first_name}} mechanism.

**Template category constraint:** campaign_templates.category CHECK (migration 0034) only allows announcement/weekly/reminder/wholesale/welcome. Renewal templates use 'reminder', win-back use 'announcement' — do NOT invent new categories without altering the CHECK + TEMPLATE_CATEGORIES + DB types.

**Seed templates:** migration 0071 (root supabase/migrations/), data-only, ON CONFLICT(name) DO NOTHING, NO rollback (seeds must persist — see [[csa-management-api-implicit-txn]]). Names are the stable deep-link key (RENEWAL_TEMPLATE_NAMES/WINBACK_TEMPLATE_NAMES) for the /admin/campaigns playbook cards → `/admin/campaigns/new?template=<name>`.

**Known limitation:** editing a segment template on /admin/campaigns/templates resets it to share-type mode (that page's form has no segment control). Authoring path for segment campaigns = composer + playbook cards.
