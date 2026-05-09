# Day 11 Spec — Shopify Webhook Reroute

**Status:** DRAFT — depends on Days 5-10 being live
**Plan reference:** `docs/CSA_MIGRATION_PLAN_2026.md` Day 11

---

## Goal

New CSA signups via Shopify orders should flow Shopify → **Supabase Edge Function** → Postgres `customers` + `members` rows, instead of the current path Shopify → Apps Script → Google Sheets.

After this day, every new CSA signup writes to the new system. The old Apps Script `createCSAMemberFromShopify` becomes a read-only reference that we keep alive as a fallback for ~14 days.

## Current state (what we're replacing)

- Shopify sends webhook to the Apps Script deployment URL (see `web_app/api-config.js` for the canonical URL — referenced indirectly to satisfy the pre-commit URL check) with `?action=shopifyWebhook` on `orders/create` and `orders/paid`
- Apps Script `handleShopifyWebhook(payload)` parses the order
- Detects CSA share orders (line items matching CSA product IDs)
- Calls `createCSAMemberFromShopify({customerId, customerName, email, phone, shareInfo, pickupInfo, ...})`
- Creates a row in `CSA_Members` Google Sheet
- Sends welcome email via Gmail SMTP

## After-state

- Shopify sends webhook to `https://csa.tinyseedfarm.com/api/webhooks/shopify` (Astro server endpoint)
- OR `https://melizsvabemhaqeaqtyw.functions.supabase.co/shopify-webhook` (Edge Function — preferred for higher reliability/independence from Vercel)
- Function:
  - Verifies Shopify HMAC signature
  - Parses the order
  - Identifies CSA line items (match against `csa_products.shopify_product_id`)
  - Creates customer (upsert by email)
  - Creates member with `status='onboarding'` (so they're funneled through Day 6 flow on first login)
  - Triggers welcome email via Resend (Day 10 module)
- Apps Script webhook stays subscribed for 14 days as fallback; emits a "deprecated" Logger message so we can see if it's still being called

## Architecture decision: Astro endpoint vs Supabase Edge Function?

| Astro endpoint (Vercel) | Supabase Edge Function |
|---|---|
| Same codebase, easier ops | Independent runtime, won't fail if Vercel goes down |
| Limited to Vercel's free tier function execution time (10s) | 60-150s execution time |
| Cold start ~150-300ms | Cold start ~50ms (Deno) |
| Same TS types as the rest of the app | Different runtime (Deno) — separate type setup |

**Recommendation: Astro endpoint** for Day 11. Simpler. We're not at Vercel's tier limits. Edge Function migration is a Phase 2 reliability improvement.

If we hit Vercel cold-start issues at scale → migrate this single endpoint to Edge Function later.

## Implementation: `/api/webhooks/shopify.ts`

```typescript
import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/supabase';
import { sendEmail } from '../../../lib/email';
import { SHOPIFY_WEBHOOK_SECRET } from 'astro:env/server';
import crypto from 'crypto';

export const POST: APIRoute = async ({ request }) => {
  // 1. Verify HMAC signature
  const hmacHeader = request.headers.get('x-shopify-hmac-sha256') ?? '';
  const body = await request.text();
  const computedHmac = crypto
    .createHmac('sha256', SHOPIFY_WEBHOOK_SECRET)
    .update(body, 'utf8')
    .digest('base64');
  if (computedHmac !== hmacHeader) {
    return new Response('invalid signature', { status: 401 });
  }

  const order = JSON.parse(body);

  // 2. Idempotency — check if this order already created a member
  const { data: existing } = await supabaseAdmin
    .from('members')
    .select('id')
    .eq('shopify_order_id', String(order.id))
    .limit(1)
    .single();
  if (existing) return new Response('already processed', { status: 200 });

  // 3. Identify CSA line items
  const { data: csaProducts } = await supabaseAdmin
    .from('csa_products')
    .select('id, shopify_product_id, name, category, size, season, total_weeks')
    .eq('is_active', true);
  const productMap = new Map(csaProducts?.map(p => [p.shopify_product_id, p]));

  const csaLineItems = order.line_items.filter((li: any) =>
    productMap.has(String(li.product_id))
  );
  if (csaLineItems.length === 0) return new Response('not a CSA order', { status: 200 });

  // 4. Upsert customer
  const customerEmail = order.email || order.customer?.email;
  if (!customerEmail) return new Response('no email', { status: 422 });

  const { data: customer, error: custErr } = await supabaseAdmin
    .from('customers')
    .upsert({
      legacy_id: `SHOPIFY-${order.customer?.id ?? 'guest'}`,
      shopify_customer_id: String(order.customer?.id ?? ''),
      customer_type: 'csa',
      contact_name: `${order.customer?.first_name ?? ''} ${order.customer?.last_name ?? ''}`.trim() || customerEmail,
      email: customerEmail,
      phone: order.customer?.phone ?? order.shipping_address?.phone ?? null,
      address: order.shipping_address?.address1 ?? null,
      city: order.shipping_address?.city ?? null,
      state: order.shipping_address?.province_code ?? 'PA',
      zip: order.shipping_address?.zip ?? null,
      is_active: true,
    }, { onConflict: 'email' })
    .select('id, contact_name')
    .single();
  if (custErr) {
    console.error('customer upsert failed:', custErr);
    return new Response('customer error', { status: 500 });
  }

  // 5. Create member row(s) — one per CSA line item
  const created: string[] = [];
  for (const li of csaLineItems) {
    const product = productMap.get(String(li.product_id))!;
    const { data: member } = await supabaseAdmin.from('members').insert({
      customer_id: customer.id,
      share_type: shareTypeFromCategory(product.category),  // helper to map "Vegetable" → "summer_veg" etc.
      share_size: shareSizeFromSize(product.size),
      season: product.season ?? `${new Date().getFullYear()} Summer`,
      start_date: product.start_date ?? new Date().toISOString().slice(0,10),
      end_date: product.end_date ?? new Date().toISOString().slice(0,10),
      total_weeks: product.total_weeks ?? 12,
      weeks_remaining: product.total_weeks ?? 12,
      status: 'onboarding',
      payment_status: 'paid',
      amount_paid: parseFloat(li.price) * li.quantity,
      shopify_order_id: String(order.id),
    }).select('id').single();
    if (member) created.push(member.id);
  }

  // 6. Trigger welcome email (Day 10 dependency)
  if (created.length > 0) {
    await sendEmail({
      to: customerEmail,
      template: 'welcome',
      variables: { contact_name: customer.contact_name, member_count: created.length },
      customer_id: customer.id,
      member_id: created[0],
    });
  }

  return new Response(JSON.stringify({ created_members: created.length }), { status: 200 });
};
```

## Migration 0018 — add Shopify order tracking column

```sql
ALTER TABLE members ADD COLUMN shopify_order_id TEXT;
CREATE INDEX members_shopify_order_idx ON members(shopify_order_id) WHERE shopify_order_id IS NOT NULL;
```

This lets us idempotency-check on incoming webhooks.

## Reroute steps

1. Deploy the new `/api/webhooks/shopify` endpoint (Day 11 commit)
2. Add a NEW webhook subscription in Shopify Admin → Settings → Notifications → Webhooks:
   - Topic: `orders/paid`
   - URL: `https://csa.tinyseedfarm.com/api/webhooks/shopify`
   - Format: JSON
   - Save the **Webhook signing secret** Shopify shows you, add to .env.csa as `SHOPIFY_WEBHOOK_SECRET`, also add to Vercel env vars
3. Test with a real test order (Shopify has a "Send test notification" button on each webhook subscription)
4. Verify member row created in Supabase + welcome email sent
5. **Keep the old Apps Script webhook subscription active for 14 days** as a fallback. The Apps Script handler should be modified to:
   - Log "DEPRECATED — should not be called" (Logger.log)
   - Still create the row (idempotent — Supabase has the data already, but Apps Script is on Sheets so it still works)
   - Email pm-architect alert if called
6. After 14 days of zero hits, delete the Apps Script webhook subscription

## Verification gates

```bash
# 1. Migration applied
SELECT column_name FROM information_schema.columns WHERE table_name='members' AND column_name='shopify_order_id';
# Expected: row

# 2. Endpoint live
curl -sI https://csa.tinyseedfarm.com/api/webhooks/shopify
# Expected: 401 (no signature) — confirms it's reachable + auth-gated

# 3. Test Shopify webhook from their admin
# - Go to Shopify Admin → Notifications → Webhooks → click the new one → "Send test notification"
# - Within 10 sec: verify HTTP 200 returned + a row in members table with status='onboarding'
# - Verify welcome email sent (check notification_log)

# 4. Idempotency
# - Re-send the same test webhook
# - Verify NO new member row created (idempotent on shopify_order_id)
```

## Out of scope

- ❌ Bulk historical Shopify import (separate one-off task; data already migrated from Sheets)
- ❌ Edge Function migration (Phase 2 reliability)
- ❌ Refund/cancellation webhooks (Phase 2 — handle when a member cancels via Shopify)
