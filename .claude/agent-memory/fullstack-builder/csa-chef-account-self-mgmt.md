---
name: csa-chef-account-self-mgmt
description: Chef account self-edit on the wholesale order portal — token-keyed /order/<token>/account, multi-contact email routing (receives_orders/receives_invoices), strict account_id scoping.
metadata:
  type: project
---

Chef ACCOUNT self-management in `apps/csa-portal` (built 2026-06-14, NOT committed/deployed — PM verifies). Extends the zero-barrier chef wholesale portal. See [[csa-chef-wholesale-ordering]], [[csa-portal-build-gotchas]].

**Why (Todd, real inbox):** chefs route comms to different addresses. Each `wholesale_accounts` row can have MULTIPLE contacts in `wholesale_account_contacts` (id, account_id, email NOT NULL, name, receives_orders bool [availability lists + order confirmations], receives_invoices bool [billing], created_at). Seeded live: Fet Fisk (orders→kate@/nik@, invoices→accounts@), APTEKA, Mediterra. RLS = admin/staff-only (policy `wac_staff`) → chef-facing reads/writes go through `supabaseAdmin` (service role bypasses RLS) scoped STRICTLY to the token-resolved account_id.

**Routes (middleware already covers them — `/order` + `/api/order` are in PUBLIC_TOKEN_PREFIXES):**
- `src/pages/order/[token]/account.astro` — PUBLIC page, token-resolved (friendly 404 on invalid/paused). Edits contact_name/phone/address + a contacts list (each email row: 📋 receives_orders + 🧾 receives_invoices checkboxes, name, remove; "➕ Add another email" clones a `<template>`). Client guard: ≥1 email, no dup, ≥1 receives_orders, never delete last row.
- `src/pages/api/order/account.ts` — PUBLIC token-auth POST (isSameOriginPost CSRF, NOT requireAdmin). Resolves account BY TOKEN (the only source of account_id — never trusts client). Zod-validates, upserts account basics, then SYNCS contacts: delete-not-resubmitted / update-existing-if-id-belongs-to-account / insert-new (account_id forced). Every write `.eq('account_id', account.id)`.

**Recipient routing (`src/lib/wholesale-contacts.ts`, pure):** `resolveOrderRecipients(contacts, accountEmail)` = every receives_orders contact → fallback to legacy `wholesale_accounts.email` → [] (owner copy). `resolveInvoiceRecipients` mirrors it for receives_invoices (wired for the future invoice flow). De-duped case-insensitively. `src/pages/api/order/submit.ts` now sends the order confirmation to `resolveOrderRecipients(...)` (BCC Todd unchanged); `wholesale-order-email.ts` `to` now accepts `string | string[]`.

**Zod 4 gotchas hit here:**
- `wholesale_account_contacts` was LIVE but not in the hand-maintained `database.types.ts` — had to add the Row/Insert/Update block (see [[csa-portal-build-gotchas]]).
- Use TOP-LEVEL `z.email()` / `z.uuid()` (via `.pipe(z.email())`), NOT the deprecated `.string().email()`/`.uuid()` methods — astro check flags the method form as deprecated (the campaigns routes still use the old form).
- `z.uuid()` in Zod 4 is STRICT on version/variant. DB ids are `gen_random_uuid()` (v4) → valid. Optional id pattern that works: `z.preprocess((v)=> v==='' ? undefined : v, z.uuid().optional())`.

**Admin side:** there is NO chef-accounts admin page (only `/admin/wholesale/products`). Left a TODO at the top of `src/pages/admin/wholesale/products/index.astro` to reuse the same per-contact receives_orders/receives_invoices editor when an admin accounts view is built. Deliberately not built now (chef self-edit was the priority).
