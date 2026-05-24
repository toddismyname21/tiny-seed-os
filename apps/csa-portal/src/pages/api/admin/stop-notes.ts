/**
 * POST /api/admin/stop-notes
 *
 * Stop Notes admin CRUD (chat Phase 0 — the ONLY way notes are created).
 * One endpoint, switched on `action`:
 *   - action='post'   → insert a note at a pickup location
 *   - action='update' → edit a note's body
 *   - action='hide'   → soft-delete a note (hidden_at = now)
 *   - action='unhide' → restore a hidden note (hidden_at = null)
 *
 * Body (multipart/form-data):
 *   - action               'post' | 'update' | 'hide' | 'unhide' (whitelisted)
 *   - id                   UUID (required for update/hide/unhide)
 *   - pickup_location_id   UUID (required for post)
 *   - role                 'staff' | 'host' (post only; default 'staff')
 *   - host_name            String (required when role='host' — the host's
 *                          display name, e.g. "Brewery yard host")
 *   - body                 String 1..1000 (post/update)
 *
 * Author identity: the note is authored AS the admin's customers row
 * (author_customer_id = ctx.customerId). For role='staff' the display name is
 * the farm-staff first name (admin's contact_name → first token, e.g.
 * "Todd"). For role='host' the display name is the supplied host_name —
 * Phase-0 host notes are posted by staff ON THE HOST'S BEHALF (spec §5.3a).
 *
 * Security: isSameOriginPost CSRF + requireAdmin (role admin/staff). The
 * write runs through the cookie-aware RLS-scoped client whose
 * stop_messages_admin_all policy (migration 0029) re-checks is_admin_caller()
 * (defense-in-depth beneath the handler's requireAdmin gate).
 *
 * On success: 303 → /admin/stop-notes?ok=<posted|updated|hidden|unhidden>
 * On failure: 303 → /admin/stop-notes?error=<code>
 */
import type { APIRoute } from 'astro';
import { z } from 'zod';
import { requireAdmin } from '../../../lib/admin';
import { isSameOriginPost, PORTAL_ORIGIN } from '../../../lib/onboarding';
import { BODY_MIN, BODY_MAX, DISPLAY_NAME_MAX } from '../../../lib/stop-chat';

export const prerender = false;

const REDIRECT = '/admin/stop-notes';

const BodySchema = z
  .string()
  .trim()
  .min(BODY_MIN, 'body_required')
  .max(BODY_MAX, 'body_too_long');

const RoleSchema = z.enum(['staff', 'host'], { message: 'invalid_role' });

const HostNameSchema = z
  .string()
  .trim()
  .min(1, 'host_name_required')
  .max(DISPLAY_NAME_MAX, 'host_name_too_long');

function fail(redirect: (url: string, status: 303) => Response, code: string): Response {
  return redirect(`${REDIRECT}?error=${code}`, 303);
}

/** Derive the staff display name from the admin's contact_name (first token). */
function staffDisplayName(contactName: string | null | undefined, email: string): string {
  const fromName = String(contactName ?? '').trim().split(/\s+/).filter(Boolean)[0];
  if (fromName) {
    return fromName.length > DISPLAY_NAME_MAX ? fromName.slice(0, DISPLAY_NAME_MAX) : fromName;
  }
  // Fallback to the local-part of the email if no contact name is on file.
  const local = email.split('@')[0] || 'Farm';
  return local.length > DISPLAY_NAME_MAX ? local.slice(0, DISPLAY_NAME_MAX) : local;
}

export const POST: APIRoute = async ({ request, locals, redirect }) => {
  if (!isSameOriginPost(request, PORTAL_ORIGIN)) {
    return new Response('Forbidden', { status: 403 });
  }

  const auth = await requireAdmin(locals.supabase, locals.user);
  if (auth.response) return auth.response;
  const ctx = auth.ctx;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return fail(redirect, 'invalid_input');
  }

  const action = String(formData.get('action') ?? '');
  if (action !== 'post' && action !== 'update' && action !== 'hide' && action !== 'unhide') {
    return fail(redirect, 'invalid_input');
  }

  // ─── HIDE / UNHIDE ──────────────────────────────────────────────────
  if (action === 'hide' || action === 'unhide') {
    const id = String(formData.get('id') ?? '');
    if (!z.uuid().safeParse(id).success) {
      return fail(redirect, 'invalid_input');
    }
    const patch =
      action === 'hide'
        ? {
            hidden_at: new Date().toISOString(),
            hidden_by: ctx.customerId,
            hidden_reason: 'staff' as const,
          }
        : { hidden_at: null, hidden_by: null, hidden_reason: null };

    const { error } = await locals.supabase.from('stop_messages').update(patch).eq('id', id);
    if (error) {
      console.error(`[api/admin/stop-notes] ${action} failed:`, error.message);
      return fail(redirect, 'network');
    }
    return redirect(`${REDIRECT}?ok=${action === 'hide' ? 'hidden' : 'unhidden'}`, 303);
  }

  // ─── UPDATE (edit body) ─────────────────────────────────────────────
  if (action === 'update') {
    const id = String(formData.get('id') ?? '');
    if (!z.uuid().safeParse(id).success) {
      return fail(redirect, 'invalid_input');
    }
    const parsedBody = BodySchema.safeParse(String(formData.get('body') ?? ''));
    if (!parsedBody.success) {
      return fail(redirect, parsedBody.error.issues[0]?.message ?? 'invalid_input');
    }
    const { error } = await locals.supabase
      .from('stop_messages')
      .update({ body: parsedBody.data })
      .eq('id', id);
    if (error) {
      console.error('[api/admin/stop-notes] update failed:', error.message);
      return fail(redirect, 'network');
    }
    return redirect(`${REDIRECT}?ok=updated`, 303);
  }

  // ─── POST (create a note) ───────────────────────────────────────────
  const locId = String(formData.get('pickup_location_id') ?? '');
  if (!z.uuid().safeParse(locId).success) {
    return fail(redirect, 'location_required');
  }

  const parsedRole = RoleSchema.safeParse(String(formData.get('role') ?? 'staff'));
  if (!parsedRole.success) {
    return fail(redirect, 'invalid_role');
  }
  const role = parsedRole.data;

  const parsedBody = BodySchema.safeParse(String(formData.get('body') ?? ''));
  if (!parsedBody.success) {
    return fail(redirect, parsedBody.error.issues[0]?.message ?? 'invalid_input');
  }

  let displayName: string;
  if (role === 'host') {
    const parsedHost = HostNameSchema.safeParse(String(formData.get('host_name') ?? ''));
    if (!parsedHost.success) {
      return fail(redirect, parsedHost.error.issues[0]?.message ?? 'host_name_required');
    }
    displayName = parsedHost.data;
  } else {
    // Staff note → the admin's own first name from the canonical customers
    // row (RLS: customers_self_read lets the caller read their own row).
    const { data: me } = await locals.supabase
      .from('customers')
      .select('contact_name')
      .eq('id', ctx.customerId)
      .maybeSingle();
    displayName = staffDisplayName(me?.contact_name, ctx.user.email!);
  }

  // Defensive: confirm the target location exists (admin RLS lets us read
  // all pickup_locations). A clearer error than a downstream FK violation.
  const { data: loc, error: locErr } = await locals.supabase
    .from('pickup_locations')
    .select('id')
    .eq('id', locId)
    .maybeSingle();
  if (locErr) {
    console.error('[api/admin/stop-notes] location lookup failed:', locErr.message);
    return fail(redirect, 'network');
  }
  if (!loc) {
    return fail(redirect, 'location_not_found');
  }

  const { error } = await locals.supabase.from('stop_messages').insert({
    pickup_location_id: locId,
    author_customer_id: ctx.customerId,
    author_display_name: displayName,
    author_role: role,
    body: parsedBody.data,
  });
  if (error) {
    console.error('[api/admin/stop-notes] insert failed:', error.message);
    return fail(redirect, 'network');
  }
  return redirect(`${REDIRECT}?ok=posted`, 303);
};
