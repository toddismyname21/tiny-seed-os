/**
 * POST /api/admin/pickup-locations/new
 *
 * Form body:
 *   - name              required, string ≤ 80
 *   - day_of_week       optional
 *   - time_start/end    optional
 *   - address/city/zip  optional
 *   - max_capacity      optional
 *   - host_name/phone   optional
 *   - is_delivery_zone  'true' | absent
 *
 * INSERTs into pickup_locations. Defaults is_active=true so a freshly
 * created location is immediately available for member onboarding.
 *
 * On success: 303 → /admin/pickup-locations?ok=created
 * On failure: 303 → /admin/pickup-locations?error=<code>
 */
import type { APIRoute } from 'astro';
import { z } from 'zod';
import { requireAdmin } from '../../../../lib/admin';
import { isSameOriginPost, PORTAL_ORIGIN } from '../../../../lib/onboarding';

export const prerender = false;

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

const Body = z.object({
  name: z.string().trim().min(1).max(80),
  day_of_week: z.enum(DAYS).nullable(),
  time_start: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).nullable(),
  time_end: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).nullable(),
  address: z.string().max(200).nullable(),
  city: z.string().max(80).nullable(),
  zip: z.string().max(10).nullable(),
  max_capacity: z.number().int().nonnegative().max(1000).nullable(),
  host_name: z.string().max(80).nullable(),
  host_phone: z.string().max(30).nullable(),
  is_delivery_zone: z.boolean(),
});

function strOrNull(v: FormDataEntryValue | null): string | null {
  if (v === null) return null;
  const s = String(v).trim();
  return s.length === 0 ? null : s;
}

export const POST: APIRoute = async ({ request, locals, redirect }) => {
  if (!isSameOriginPost(request, PORTAL_ORIGIN)) {
    return new Response('Forbidden', { status: 403 });
  }

  const auth = await requireAdmin(locals.supabase, locals.user);
  if (auth.response) return auth.response;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return redirect('/admin/pickup-locations?error=invalid_input', 303);
  }

  const capacityStr = strOrNull(formData.get('max_capacity'));
  const dayRaw = strOrNull(formData.get('day_of_week'));
  const dayParsed = dayRaw === null
    ? null
    : (DAYS as readonly string[]).includes(dayRaw) ? (dayRaw as (typeof DAYS)[number]) : null;

  const parsed = Body.safeParse({
    name: String(formData.get('name') ?? '').trim(),
    day_of_week: dayParsed,
    time_start: strOrNull(formData.get('time_start')),
    time_end: strOrNull(formData.get('time_end')),
    address: strOrNull(formData.get('address')),
    city: strOrNull(formData.get('city')),
    zip: strOrNull(formData.get('zip')),
    max_capacity: capacityStr === null ? null : Number.parseInt(capacityStr, 10),
    host_name: strOrNull(formData.get('host_name')),
    host_phone: strOrNull(formData.get('host_phone')),
    is_delivery_zone: formData.get('is_delivery_zone') === 'true',
  });

  if (!parsed.success) {
    return redirect('/admin/pickup-locations?error=invalid_input', 303);
  }

  const { error } = await locals.supabase
    .from('pickup_locations')
    .insert({
      name: parsed.data.name,
      day_of_week: parsed.data.day_of_week,
      time_start: parsed.data.time_start,
      time_end: parsed.data.time_end,
      address: parsed.data.address,
      city: parsed.data.city,
      state: 'PA', // default — matches schema default
      zip: parsed.data.zip,
      max_capacity: parsed.data.max_capacity,
      host_name: parsed.data.host_name,
      host_phone: parsed.data.host_phone,
      is_delivery_zone: parsed.data.is_delivery_zone,
      is_active: true,
    });

  if (error) {
    if (error.message.includes('duplicate')) {
      return redirect('/admin/pickup-locations?error=duplicate', 303);
    }
    console.error('[api/admin/pickup-locations/new] insert failed:', error.message);
    return redirect('/admin/pickup-locations?error=invalid_input', 303);
  }

  return redirect('/admin/pickup-locations?ok=created', 303);
};
