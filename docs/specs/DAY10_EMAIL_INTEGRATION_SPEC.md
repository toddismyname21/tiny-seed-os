# Day 10 Spec — Email Integration via Resend

**Status:** DRAFT — depends on Cloudflare DNS migration completing first
**Plan reference:** `docs/CSA_MIGRATION_PLAN_2026.md` Day 10
**Prereq:** `docs/specs/CLOUDFLARE_DNS_MIGRATION_RUNBOOK.md` executed and Resend domain verified

---

## Goal

Programmatic transactional email sending via Resend, with delivery tracking via Resend webhooks recorded in `notification_log`. Replaces Supabase Auth's default mailer (4/hour limit) for production volume.

## Scope

| Email | Trigger | Template |
|---|---|---|
| Welcome | After member completes onboarding (status flips active) | welcome.html |
| Weekly box preview | Sunday or Monday before pickup | weekly_preview.html |
| Pickup reminder | Tuesday morning, 24h before pickup | pickup_reminder.html |
| Renewal reminder | 30/14/7 days before season ends | renewal_reminder.html |
| Vacation hold confirmation | Immediately on schedule | vacation_confirm.html |
| Magic link | Login attempt — handled by Supabase Auth + Resend SMTP integration | magic_link.html (already exists) |

## Architecture

### Email service module: `src/lib/email.ts`

```typescript
import { Resend } from 'resend';
import { RESEND_API_KEY } from 'astro:env/server';
import { supabaseAdmin } from './supabase';

const resend = new Resend(RESEND_API_KEY);

interface SendArgs {
  to: string;
  template: 'welcome' | 'weekly_preview' | 'pickup_reminder' | 'renewal_reminder' | 'vacation_confirm';
  variables: Record<string, unknown>;
  member_id?: string;
  customer_id?: string;
}

export async function sendEmail(args: SendArgs): Promise<{ ok: boolean; id?: string; error?: string }> {
  // 1. Render template (HTML + plaintext)
  const { html, text, subject } = await renderTemplate(args.template, args.variables);

  // 2. Insert notification_log row in 'queued' state
  const { data: log } = await supabaseAdmin.from('notification_log').insert({
    member_id: args.member_id ?? null,
    customer_id: args.customer_id ?? null,
    channel: 'email',
    notification_type: args.template,
    recipient: args.to,
    status: 'queued',
    provider: 'resend',
    subject,
    template: args.template,
  }).select('id').single();

  // 3. Send via Resend
  const result = await resend.emails.send({
    from: 'Tiny Seed Farm <hello@tinyseedfarm.com>',
    to: args.to,
    subject,
    html,
    text,
    tags: [{ name: 'template', value: args.template }, { name: 'log_id', value: log?.id ?? '' }],
  });

  // 4. Update log with provider_message_id + status
  if (result.error) {
    await supabaseAdmin.from('notification_log').update({
      status: 'failed',
      error_message: result.error.message,
    }).eq('id', log!.id);
    return { ok: false, error: result.error.message };
  }

  await supabaseAdmin.from('notification_log').update({
    status: 'sent',
    provider_message_id: result.data?.id,
  }).eq('id', log!.id);

  return { ok: true, id: result.data?.id };
}
```

### Template rendering

Use **React Email** components for templates (it's the dev experience Resend was designed around):
- `apps/csa-portal/src/emails/Welcome.tsx`
- `apps/csa-portal/src/emails/WeeklyPreview.tsx`
- `apps/csa-portal/src/emails/PickupReminder.tsx`
- `apps/csa-portal/src/emails/RenewalReminder.tsx`
- `apps/csa-portal/src/emails/VacationConfirm.tsx`

Each is a React component that renders to HTML + plaintext via `@react-email/render`. Add deps:

```
npm install resend @react-email/components @react-email/render react react-dom
```

(React is added ONLY for email rendering — it never ships to the browser. Templates run server-side at email-send time.)

### Resend webhook handler: `/api/webhooks/resend.ts`

Resend sends webhook events for delivery, opens, clicks, bounces, complaints. We record each into `notification_log`:

```typescript
import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/supabase';
import crypto from 'crypto';

export const POST: APIRoute = async ({ request }) => {
  // Verify Svix signature (Resend uses Svix for webhook signing)
  const signature = request.headers.get('svix-signature') ?? '';
  const id = request.headers.get('svix-id') ?? '';
  const timestamp = request.headers.get('svix-timestamp') ?? '';
  const body = await request.text();

  // ... signature verification ...

  const event = JSON.parse(body);
  const messageId = event.data.email_id;
  const eventType = event.type; // 'email.sent', 'email.delivered', 'email.opened', 'email.bounced', etc.

  const statusMap: Record<string, string> = {
    'email.sent': 'sent',
    'email.delivered': 'delivered',
    'email.opened': 'opened',
    'email.clicked': 'clicked',
    'email.bounced': 'bounced',
    'email.complained': 'complained',
  };

  const updates: Record<string, unknown> = { status: statusMap[eventType] || 'sent' };
  if (eventType === 'email.delivered') updates.delivered_at = event.created_at;
  if (eventType === 'email.opened') updates.opened_at = event.created_at;
  if (eventType === 'email.bounced') updates.error_message = event.data?.bounce?.reason;

  await supabaseAdmin.from('notification_log')
    .update({ ...updates, metadata: event })
    .eq('provider_message_id', messageId);

  return new Response('ok', { status: 200 });
};
```

### Cron-triggered emails

Some emails fire on a schedule (weekly preview Sunday morning, pickup reminder Tuesday morning, renewal reminder N days before end_date). Use **Vercel Cron**:

`apps/csa-portal/vercel.json` — add to existing config:

```json
{
  "crons": [
    { "path": "/api/cron/weekly-preview", "schedule": "0 14 * * 0" },
    { "path": "/api/cron/pickup-reminder", "schedule": "0 13 * * 2" },
    { "path": "/api/cron/renewal-reminder", "schedule": "0 14 * * *" }
  ]
}
```

(Times are UTC. 14 UTC = 10 AM ET. 13 UTC = 9 AM ET.)

Each `/api/cron/*` route:
- Authenticates via `Authorization: Bearer ${CRON_SECRET}` header (Vercel sets this automatically; we configure CRON_SECRET in env)
- Queries Supabase for the eligible recipients
- Calls `sendEmail()` for each
- Logs to notification_log

## Verification gates

```bash
# 1. Dependencies installed
npm ls resend @react-email/components

# 2. Build clean + types
npm run build && npx astro check

# 3. Send test welcome email
curl -X POST https://csa.tinyseedfarm.com/api/email/test \
  -H "Authorization: Bearer $TEST_TOKEN" \
  -d '{"template":"welcome","to":"todd@tinyseedfarmpgh.com"}'
# Expected: 200, log row in notification_log with status='sent'

# 4. Webhook handler responds
curl -X POST https://csa.tinyseedfarm.com/api/webhooks/resend \
  -H "Content-Type: application/json" \
  -d '{"type":"email.delivered","data":{"email_id":"test"}}'
# Expected: 200 (after signature check is bypassed for tests; production requires valid Svix signature)

# 5. Cron schedules registered
curl -H "Authorization: Bearer $VERCEL_TOKEN" \
  "https://api.vercel.com/v1/projects/$VERCEL_PROJECT_ID/crons?teamId=$VERCEL_ORG_ID"
# Expected: 3 cron jobs listed
```

## Out of scope

- ❌ SMS via Twilio (deferred until SMS auth flow is built)
- ❌ Marketing email campaigns (Phase 2)
- ❌ Visual email builder (we use React Email code)
