/**
 * POST /api/admin/pickup-locations/[id]
 *
 * Form body — every field is optional except the row already exists,
 * so any missing fields are skipped:
 *   - day_of_week    'Sun'|'Mon'|...|'Sat' | ''
 *   - time_start     HH:MM or empty
 *   - time_end       HH:MM or empty
 *   - max_capacity   integer ≥ 0 or empty
 *   - host_name      string ≤ 80
 *   - host_phone     string ≤ 30
 *   - notes          string ≤ 500   (ADMIN-ONLY internal — never shown to members)
 *   - pickup_instructions string ≤ 2000 (MEMBER-FACING — shown on /account/*)
 *   - is_active      'true' | (absent → false)
 *
 * Saves the location row. RLS admin_all_pickup_locations policy lets
 * the cookie-aware client through.
 *
 * On success: 303 → /admin/pickup-locations?ok=saved
 * On failure: 303 → /admin/pickup-locations?error=<code>
 */
import type { APIRoute } from 'astro';
import { z } from 'zod';
import { requireAdmin } from '../../../../lib/admin';
import { isSameOriginPost, PORTAL_ORIGIN } from '../../../../lib/onboarding';

export const prerender = false;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

const Body = z.object({
  day_of_week: z.enum(DAYS).nullable(),
  time_start: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).nullable(),
  time_end: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).nullable(),
  max_capacity: z.number().int().nonnegative().max(1000).nullable(),
  host_name: z.string().max(80).nullable(),
  host_phone: z.string().max(30).nullable(),
  notes: z.string().max(500).nullable(),
  pickup_instructions: z.string().max(2000).nullable(),
  is_active: z.boolean(),
});

function strOrNull(v: FormDataEntryValue | null): string | null {
  if (v === null) return null;
  const s = String(v).trim();
  return s.length === 0 ? null : s;
}

export const POST: APIRoute = async ({ request, locals, params, redirect }) => {
  if (!isSameOriginPost(request, PORTAL_ORIGIN)) {
    return new Response('Forbidden', { status: 403 });
  }

  const auth = await requireAdmin(locals.supabase, locals.user);
  if (auth.response) return auth.response;

  const id = params.id ?? '';
  if (!UUID_RE.test(id)) {
    return redirect('/admin/pickup-locations?error=invalid_input', 303);
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return redirect('/admin/pickup-locations?error=invalid_input', 303);
  }

  const capacityStr = strOrNull(formData.get('max_capacity'));
  const capacity = capacityStr === null ? null : Number.parseInt(capacityStr, 10);

  const dayRaw = strOrNull(formData.get('day_of_week'));
  const dayParsed = dayRaw === null
    ? null
    : (DAYS as readonly string[]).includes(dayRaw) ? (dayRaw as (typeof DAYS)[number]) : null;

  const parsed = Body.safeParse({
    day_of_week: dayParsed,
    time_start: strOrNull(formData.get('time_start')),
    time_end: strOrNull(formData.get('time_end')),
    max_capacity: capacityStr === null ? null : capacity,
    host_name: strOrNull(formData.get('host_name')),
    host_phone: strOrNull(formData.get('host_phone')),
    notes: strOrNull(formData.get('notes')),
    pickup_instructions: strOrNull(formData.get('pickup_instructions')),
    is_active: formData.get('is_active') === 'true',
  });

  if (!parsed.success) {
    return redirect('/admin/pickup-locations?error=invalid_input', 303);
  }

  const { error } = await locals.supabase
    .from('pickup_locations')
    .update({
      day_of_week: parsed.data.day_of_week,
      time_start: parsed.data.time_start,
      time_end: parsed.data.time_end,
      max_capacity: parsed.data.max_capacity,
      host_name: parsed.data.host_name,
      host_phone: parsed.data.host_phone,
      notes: parsed.data.notes,
      pickup_instructions: parsed.data.pickup_instructions,
      is_active: parsed.data.is_active,
    })
    .eq('id', id);

  if (error) {
    console.error('[api/admin/pickup-locations/[id]] update failed:', error.message);
    return redirect('/admin/pickup-locations?error=invalid_input', 303);
  }

  return redirect('/admin/pickup-locations?ok=saved', 303);
};
