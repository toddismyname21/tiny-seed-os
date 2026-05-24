/**
 * POST /api/admin/recipes
 *
 * Recipe-library CRUD. One endpoint, switched on `action`:
 *   - action='create'  → insert a recipe
 *   - action='update'  → update a recipe by id
 *   - action='delete'  → delete a recipe by id
 *
 * Body (multipart/form-data):
 *   - action      'create' | 'update' | 'delete'   (whitelisted)
 *   - id          UUID (required for update/delete)
 *   - title       String (create/update)
 *   - source      'farm' | 'link' (create/update)
 *   - url         String (required when source='link')
 *   - body        String (required when source='farm')
 *   - crops[]     Array of crop-tag strings (Tags component)
 *   - image_url   String, optional
 *   - is_active   'true' | (absent → false)
 *
 * Security: isSameOriginPost CSRF + requireAdmin (role admin/staff). The
 * write runs through the cookie-aware RLS-scoped client whose
 * `admin_all_recipes` policy (migration 0026) re-checks is_admin_caller()
 * (defense-in-depth beneath the handler's requireAdmin gate).
 *
 * On success: 303 → /admin/recipes?ok=<created|updated|deleted>
 * On failure: 303 → /admin/recipes?error=<code>
 */
import type { APIRoute } from 'astro';
import { z } from 'zod';
import { requireAdmin } from '../../../lib/admin';
import { isSameOriginPost, PORTAL_ORIGIN } from '../../../lib/onboarding';

export const prerender = false;

const REDIRECT = '/admin/recipes';

const CropSchema = z.string().trim().min(1).max(60);

// Base fields shared by create + update. We refine below to enforce the
// link-needs-url / farm-needs-body invariant (mirrors the DB CHECK
// constraints in migration 0026).
const RecipeFields = z
  .object({
    title: z.string().trim().min(1, 'title_required').max(160, 'title_too_long'),
    source: z.enum(['farm', 'link'], { message: 'invalid_source' }),
    url: z.string().trim().max(2000).nullable(),
    body: z.string().trim().max(20_000).nullable(),
    crops: z.array(CropSchema).max(40, 'too_many_crops'),
    image_url: z.string().trim().max(2000).nullable(),
    is_active: z.boolean(),
  })
  .superRefine((val, ctx) => {
    if (val.source === 'link') {
      if (!val.url || val.url.length === 0) {
        ctx.addIssue({ code: 'custom', message: 'url_required', path: ['url'] });
      } else if (!/^https?:\/\//i.test(val.url)) {
        ctx.addIssue({ code: 'custom', message: 'invalid_url', path: ['url'] });
      }
    }
    if (val.source === 'farm' && (!val.body || val.body.length === 0)) {
      ctx.addIssue({ code: 'custom', message: 'body_required', path: ['body'] });
    }
    if (val.image_url && !/^https?:\/\//i.test(val.image_url)) {
      ctx.addIssue({ code: 'custom', message: 'invalid_image_url', path: ['image_url'] });
    }
  });

function fail(redirect: (url: string, status: 303) => Response, code: string): Response {
  return redirect(`${REDIRECT}?error=${code}`, 303);
}

/** Read crop chips: prefer `crops[]`, fall back to comma/newline split. */
function readCrops(formData: FormData): string[] {
  const bracketed = formData.getAll('crops[]').map(String);
  const raw =
    bracketed.length > 0
      ? bracketed
      : String(formData.get('crops') ?? '')
          .split(/[,\n]/)
          .map((s) => s.trim())
          .filter(Boolean);
  // De-dupe case-insensitively, preserve first casing.
  const seen = new Set<string>();
  const out: string[] = [];
  for (const c of raw) {
    const t = c.trim();
    if (!t) continue;
    const k = t.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(t);
  }
  return out;
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
    return fail(redirect, 'invalid_input');
  }

  const action = String(formData.get('action') ?? '');
  if (action !== 'create' && action !== 'update' && action !== 'delete') {
    return fail(redirect, 'invalid_input');
  }

  // ─── DELETE ─────────────────────────────────────────────────────────
  if (action === 'delete') {
    const id = String(formData.get('id') ?? '');
    if (!z.uuid().safeParse(id).success) {
      return fail(redirect, 'invalid_input');
    }
    const { error } = await locals.supabase.from('recipes').delete().eq('id', id);
    if (error) {
      console.error('[api/admin/recipes] delete failed:', error.message);
      return fail(redirect, 'network');
    }
    return redirect(`${REDIRECT}?ok=deleted`, 303);
  }

  // ─── CREATE / UPDATE — validate the shared fields ───────────────────
  const rawSource = String(formData.get('source') ?? '');
  const rawUrl = String(formData.get('url') ?? '').trim();
  const rawBody = String(formData.get('body') ?? '').trim();
  const rawImage = String(formData.get('image_url') ?? '').trim();

  const parsed = RecipeFields.safeParse({
    title: String(formData.get('title') ?? ''),
    source: rawSource,
    // For a link recipe we keep url + null the body; for farm, the inverse.
    // The DB CHECK forbids a link with no url / a farm with no body, and we
    // also blank the irrelevant field so stale content never lingers.
    url: rawSource === 'link' ? (rawUrl.length ? rawUrl : null) : null,
    body: rawSource === 'farm' ? (rawBody.length ? rawBody : null) : null,
    crops: readCrops(formData),
    image_url: rawImage.length ? rawImage : null,
    is_active: formData.get('is_active') === 'true',
  });

  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? 'invalid_input';
    const known = new Set([
      'title_required', 'title_too_long', 'invalid_source', 'url_required',
      'invalid_url', 'body_required', 'too_many_crops', 'invalid_image_url',
    ]);
    return fail(redirect, known.has(msg) ? msg : 'invalid_input');
  }

  const payload = {
    title: parsed.data.title,
    source: parsed.data.source,
    url: parsed.data.url,
    body: parsed.data.body,
    crops: parsed.data.crops,
    image_url: parsed.data.image_url,
    is_active: parsed.data.is_active,
  };

  if (action === 'create') {
    const { error } = await locals.supabase.from('recipes').insert(payload);
    if (error) {
      console.error('[api/admin/recipes] insert failed:', error.message);
      return fail(redirect, 'network');
    }
    return redirect(`${REDIRECT}?ok=created`, 303);
  }

  // action === 'update'
  const id = String(formData.get('id') ?? '');
  if (!z.uuid().safeParse(id).success) {
    return fail(redirect, 'invalid_input');
  }
  const { error } = await locals.supabase.from('recipes').update(payload).eq('id', id);
  if (error) {
    console.error('[api/admin/recipes] update failed:', error.message);
    return fail(redirect, 'network');
  }
  return redirect(`${REDIRECT}?ok=updated`, 303);
};
