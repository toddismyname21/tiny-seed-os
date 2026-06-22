/**
 * POST /api/order/account — PUBLIC, token-authenticated chef account self-edit.
 *
 * NO login. The permanent secret `wholesale_accounts.order_token` is the gate
 * (just like /api/order/submit). A chef updates THEIR OWN account from the
 * no-login /order/<token>/account page:
 *   - contact_name, phone, delivery address (on wholesale_accounts)
 *   - the CONTACTS list (`wholesale_account_contacts`): multiple emails, each
 *     flagged receives_orders (availability + order confirmations) and/or
 *     receives_invoices (billing). This is the routing Todd needs (Fet Fisk
 *     orders→nik@, invoices→accounts@; Mediterra wants to add another email).
 *
 * SECURITY MODEL (mirrors submit.ts):
 *   1. CSRF: isSameOriginPost — the form posts same-origin from /order/<token>.
 *   2. Resolve the account BY TOKEN (server-side). The account_id is taken from
 *      this lookup ONLY — we NEVER trust an account_id from the client. Every
 *      contacts write is filtered by `.eq('account_id', account.id)` so a chef
 *      can only ever touch their own account's contacts.
 *   3. `wholesale_accounts` + `wholesale_account_contacts` are admin-RLS-only,
 *      so we use supabaseAdmin (service role) — the token check IN CODE is the
 *      scoping gate, exactly as the order page + submit handler do.
 *   4. Zod-validate everything: required fields, email format, at least one
 *      contact must keep receives_orders (or someone has to get availability).
 *
 * Body (multipart/form-data):
 *   - token            the account's order_token
 *   - contact_name     String, ≤ 120 (optional → null)
 *   - phone            String, ≤ 40 (optional → null)
 *   - address          String, ≤ 300 (optional → null)
 *   - contacts         JSON string: [{ id?, email, name?, receives_orders,
 *                      receives_invoices }, ...]  (id present = existing row)
 *
 * On success: 303 → /order/<token>/account?ok=saved
 * On failure: 303 → /order/<token>/account?error=<code>
 */
import type { APIRoute } from 'astro';
import { z } from 'zod';
import { isSameOriginPost, PORTAL_ORIGIN } from '../../../lib/onboarding';
import { supabaseAdmin } from '../../../lib/supabase';

export const prerender = false;

/** Redirect back to a token's account page with a flash code. */
function backToAccount(token: string, code: string, ok = false): string {
  const key = ok ? 'ok' : 'error';
  return `/order/${encodeURIComponent(token)}/account?${key}=${code}`;
}

/** Optional free-text: trim, empty → null, cap length (code on overflow). */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, 'invalid_input')
    .transform((s) => (s.length === 0 ? null : s))
    .nullable();

/**
 * A single contact in the submitted list. `id` is the existing row's uuid when
 * editing; absent/empty for a brand-new row. Email is required + format-checked.
 */
const ContactSchema = z.object({
  // Existing row's uuid when editing; '' or absent for a brand-new row. We
  // normalize '' → undefined first, then validate the uuid only when present.
  id: z
    .preprocess(
      (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
      z.uuid().optional()
    ),
  email: z
    .string()
    .trim()
    .min(1, 'email_required')
    .max(200, 'email_too_long')
    .pipe(z.email('email_invalid'))
    .transform((s) => s.toLowerCase()),
  name: optionalText(120),
  receives_orders: z.boolean(),
  receives_invoices: z.boolean(),
});

const FormSchema = z.object({
  contact_name: optionalText(120),
  phone: optionalText(40),
  address: optionalText(300),
  delivery_day: optionalText(80),
  delivery_hours: optionalText(120),
  delivery_instructions: optionalText(500),
  contacts: z
    .array(ContactSchema)
    .min(1, 'no_contacts')
    .max(20, 'too_many_contacts')
    // At least one contact must receive orders, or no one gets availability.
    .refine((arr) => arr.some((c) => c.receives_orders), 'need_orders_contact')
    // No duplicate emails (case-insensitive — already lowercased above).
    .refine((arr) => new Set(arr.map((c) => c.email)).size === arr.length, 'dup_email'),
});

export const POST: APIRoute = async ({ request, redirect }) => {
  if (!isSameOriginPost(request, PORTAL_ORIGIN)) {
    return new Response('Forbidden', { status: 403 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return new Response('Bad Request', { status: 400 });
  }

  const token = String(form.get('token') ?? '').trim();
  if (!token) {
    return new Response('Bad Request', { status: 400 });
  }

  // ── Resolve the account BY TOKEN — this is the only source of account_id. ──
  const { data: account, error: acctErr } = await supabaseAdmin
    .from('wholesale_accounts')
    .select('id, status')
    .eq('order_token', token)
    .maybeSingle()
    .overrideTypes<{ id: string; status: 'draft' | 'invited' | 'active' | 'paused' }, { merge: false }>();

  if (acctErr) {
    console.error('[api/order/account] account lookup failed:', acctErr.message);
    return redirect(backToAccount(token, 'save_failed'), 303);
  }
  if (!account || account.status === 'paused') {
    // Same friendly 404 contract as the order page — invalid/expired token.
    return redirect(backToAccount(token, 'invalid_token'), 303);
  }

  // ── Parse + validate the contacts JSON + the basic fields. ──────────────
  let contactsRaw: unknown;
  try {
    contactsRaw = JSON.parse(String(form.get('contacts') ?? '[]'));
  } catch {
    return redirect(backToAccount(token, 'invalid_input'), 303);
  }

  const parsed = FormSchema.safeParse({
    contact_name: String(form.get('contact_name') ?? ''),
    phone: String(form.get('phone') ?? ''),
    address: String(form.get('address') ?? ''),
    delivery_day: String(form.get('delivery_day') ?? ''),
    delivery_hours: String(form.get('delivery_hours') ?? ''),
    delivery_instructions: String(form.get('delivery_instructions') ?? ''),
    contacts: contactsRaw,
  });

  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? 'invalid_input';
    const known = new Set([
      'email_required', 'email_invalid', 'email_too_long',
      'no_contacts', 'too_many_contacts', 'need_orders_contact', 'dup_email',
      'invalid_input',
    ]);
    return redirect(backToAccount(token, known.has(msg) ? msg : 'invalid_input'), 303);
  }

  const { contact_name, phone, address, delivery_day, delivery_hours, delivery_instructions, contacts } = parsed.data;

  // ── 1) Update the account's basic fields. Scoped by id (from the token). ──
  const { error: updErr } = await supabaseAdmin
    .from('wholesale_accounts')
    .update({
      contact_name,
      phone,
      address,
      delivery_day,
      delivery_hours,
      delivery_instructions,
      updated_at: new Date().toISOString(),
    })
    .eq('id', account.id);

  if (updErr) {
    console.error('[api/order/account] account update failed:', updErr.message);
    return redirect(backToAccount(token, 'save_failed'), 303);
  }

  // ── 2) Sync the contacts for THIS account only. ─────────────────────────
  // Strategy: read the existing rows for account.id, then diff:
  //   - rows in the DB whose id is NOT in the submitted set → DELETE
  //   - submitted rows WITH an id → UPDATE (only if id belongs to this account)
  //   - submitted rows WITHOUT an id → INSERT (account_id forced to account.id)
  // Every write is filtered by account_id so a forged/foreign id is inert.
  const { data: existing, error: exErr } = await supabaseAdmin
    .from('wholesale_account_contacts')
    .select('id')
    .eq('account_id', account.id)
    .overrideTypes<{ id: string }[], { merge: false }>();

  if (exErr) {
    console.error('[api/order/account] existing contacts read failed:', exErr.message);
    return redirect(backToAccount(token, 'save_failed'), 303);
  }

  const existingIds = new Set((existing ?? []).map((r) => r.id));
  const submittedIds = new Set(
    contacts.map((c) => c.id).filter((id): id is string => !!id && existingIds.has(id))
  );

  // 2a) DELETE rows that exist for this account but weren't resubmitted.
  const toDelete = [...existingIds].filter((id) => !submittedIds.has(id));
  if (toDelete.length > 0) {
    const { error: delErr } = await supabaseAdmin
      .from('wholesale_account_contacts')
      .delete()
      .eq('account_id', account.id) // double-scope: never delete another account's rows
      .in('id', toDelete);
    if (delErr) {
      console.error('[api/order/account] contact delete failed:', delErr.message);
      return redirect(backToAccount(token, 'save_failed'), 303);
    }
  }

  // 2b) UPDATE existing rows (only those whose id belongs to this account).
  for (const c of contacts) {
    if (c.id && existingIds.has(c.id)) {
      const { error: cuErr } = await supabaseAdmin
        .from('wholesale_account_contacts')
        .update({
          email: c.email,
          name: c.name,
          receives_orders: c.receives_orders,
          receives_invoices: c.receives_invoices,
        })
        .eq('account_id', account.id) // scope to this account
        .eq('id', c.id);
      if (cuErr) {
        console.error('[api/order/account] contact update failed:', cuErr.message);
        return redirect(backToAccount(token, 'save_failed'), 303);
      }
    }
  }

  // 2c) INSERT new rows (no id, or an id that isn't this account's → treat as new).
  const toInsert = contacts
    .filter((c) => !c.id || !existingIds.has(c.id))
    .map((c) => ({
      account_id: account.id, // forced server-side — never from the client
      email: c.email,
      name: c.name,
      receives_orders: c.receives_orders,
      receives_invoices: c.receives_invoices,
    }));

  if (toInsert.length > 0) {
    const { error: insErr } = await supabaseAdmin
      .from('wholesale_account_contacts')
      .insert(toInsert);
    if (insErr) {
      console.error('[api/order/account] contact insert failed:', insErr.message);
      return redirect(backToAccount(token, 'save_failed'), 303);
    }
  }

  return redirect(backToAccount(token, 'saved', true), 303);
};
