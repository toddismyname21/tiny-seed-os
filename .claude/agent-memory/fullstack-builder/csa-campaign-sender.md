---
name: csa-campaign-sender
description: Admin campaign sender at /admin/campaigns — Resend-powered, Supabase recipients, branded shell shared with weekly-email, idempotent send loop.
metadata:
  type: project
---

# CSA Admin Campaign Sender (shipped 2026-06-02)

**Why:** Todd asked for an in-portal replacement for Shopify Email so a single Resend setup + Supabase recipient list covers marketing blasts. Need-by tonight: portal-launch email to ~195 CSA members.

**How to apply:** When extending or debugging the campaign system:
- DB: migration 0032 (campaigns + campaign_recipients + notification_log.campaign_id). campaign_recipients deliberately has NO audit-log trigger (high-cardinality append-style — same convention as notification_log, email_log, flex_transactions).
- Lib: `apps/csa-portal/src/lib/campaign.ts` is the single source of truth for recipient resolution, branded HTML shell rendering, and the send loop. resolveRecipients dedupes by customer_id (a customer with multiple shares gets ONE email). TEST_EXCLUDES is the gated list (`freetodd21@gmail.com`, `fakeemailsofake@gmail.com`, `test@test.com`, `tinyseedcsa@gmail.com`).
- Templates: two seeded in `CAMPAIGN_TEMPLATES` — Summer/Flex + Flower. To add new templates, append to the array; the composer's "Use template" dropdown picks them up automatically.
- Throttling: DAILY_SEND_CAP=80 (under Resend free-tier 100/day), THROTTLE_MS=200 between sends. When the cap is hit mid-send, status='partial' + scheduled_for=tomorrow; admin clicks "Resume send" on the detail page next day. UNIQUE(campaign_id, customer_id) + status='pending' filter is the no-double-send guarantee.
- Personalization: `{{first_name}}` and `{{customers.contact_name}}` / `{{customers.email}}` — extending it means adding to the whitelist inside `personalize()`. We HTML-escape all substitutions so a contact_name with `<` can never inject markup.
- CAN-SPAM: every render reuses `signUnsubscribeToken` + `unsubscribeUrl` from lib/weekly-email.ts. sendCampaign + sendTestEmail abort if UNSUBSCRIBE_SECRET is missing.
- Webhook: `/api/admin/campaigns/webhook` is a Phase-2 stub (200s without acting). Delivered/opened/clicked counts stay at 0 in Phase 1; the detail page surfaces a small "Phase 2" note when status=sent and all four are 0.

Related: see [[csa-portal-deploy-conventions]] for branch/deploy. See [[csa-portal-test-harness]] for the admin-promotion E2E pattern (snapshot customers.role, flip to 'admin', restore in afterAll).
