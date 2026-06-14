/**
 * POST /api/admin/wholesale/update   (admin only)
 *
 * Todd's differentiator: a real-time "today's quality" update for a single
 * wholesale product — a fresh-from-the-field photo + a short note
 * ("Arugula's a touch small this week but great flavor"). Inserts a row
 * into `wholesale_product_updates` keyed to the CURRENT cycle Monday so
 * chefs see this week's note next to the product.
 *
 * Form fields (multipart/form-data):
 *   - product_id   UUID — required
 *   - note         optional, up to 1000 chars
 *   - photo_url    optional absolute URL from /api/admin/wholesale/photo
 *
 * At least one of {note, photo_url} must be present — an empty update is a
 * no-op error (no point inserting a blank row).
 *
 * week_starting = mondayOfWeek(today in ET). created_by = admin email.
 *
 * Authorization: requireAdmin + isSameOriginPost. Writes go through the
 * cookie-aware RLS client (wholesale_product_updates_staff policy).
 *
 * On success: 303 → /admin/wholesale/products?ok=update_posted#p-<id>
 * On failure: 303 → /admin/wholesale/products?error=<code>#p-<id>
 */
import type { APIRoute } from 'astro';
import { z } from 'zod';
import { requireAdmin } from '../../../../lib/admin';
import { isSameOriginPost, PORTAL_ORIGIN } from '../../../../lib/onboarding';
import { mondayOfWeek } from '../../../../lib/cycle';

export const prerender = false;

const BASE = '/admin/wholesale/products';

function back(key: 'ok' | 'error', val: string, anchor?: string): string {
  const a = anchor ? `#${anchor}` : '';
  return `${BASE}?${key}=${val}${a}`;
}

function strOrNull(v: FormDataEntryValue | null): string | null {
  if (v === null) return null;
  const s = String(v).trim();
  return s.length === 0 ? null : s;
}

/** Today's date (YYYY-MM-DD) in America/New_York — the cycle is ET-anchored. */
function todayET(): string {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric', month: '2-digit', day: '2-digit',
  });
  return fmt.format(new Date()); // en-CA => YYYY-MM-DD
}

const Body = z.object({
  product_id: z.uuid(),
  note: z.string().trim().max(1000).nullable(),
  photo_url: z.url().max(2000).nullable(),
});

export const POST: APIRoute = async ({ request, locals, redirect }) => {
  if (!isSameOriginPost(request, PORTAL_ORIGIN)) {
    return new Response('Forbidden', { status: 403 });
  }
  const auth = await requireAdmin(locals.supabase, locals.user);
  if (auth.response) return auth.response;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return redirect(back('error', 'invalid_input'), 303);
  }

  const productId = strOrNull(form.get('product_id'));
  const parsed = Body.safeParse({
    product_id: productId,
    note: strOrNull(form.get('note')),
    photo_url: strOrNull(form.get('photo_url')),
  });

  if (!parsed.success) {
    return redirect(back('error', 'invalid_input', productId ? `p-${productId}` : undefined), 303);
  }
  const d = parsed.data;

  // A quality update with neither a photo nor a note is meaningless.
  if (!d.note && !d.photo_url) {
    return redirect(back('error', 'empty_update', `p-${d.product_id}`), 303);
  }

  const weekStarting = mondayOfWeek(todayET());
  const createdBy = auth.ctx.user.email ?? null;

  const { error } = await locals.supabase.from('wholesale_product_updates').insert({
    product_id: d.product_id,
    photo_url: d.photo_url,
    note: d.note,
    week_starting: weekStarting,
    created_by: createdBy,
  });

  if (error) {
    console.error('[api/admin/wholesale/update] insert failed:', error.message);
    return redirect(back('error', 'save_failed', `p-${d.product_id}`), 303);
  }

  return redirect(back('ok', 'update_posted', `p-${d.product_id}`), 303);
};
