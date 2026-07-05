/**
 * POST /api/admin/campaigns/templates   (admin only)
 *
 * CRUD for the campaign template library (Feature 4, migration 0034).
 * Drives both the /admin/campaigns/templates management page AND the
 * composer's "Save as template" button.
 *
 * Body (JSON):
 *   action: 'save' | 'delete'
 *
 *   save:
 *     id?               UUID (present → UPDATE; absent → INSERT)
 *     name              1..160
 *     category          one of TEMPLATE_CATEGORIES
 *     subject           1..200
 *     preview_text      1..200
 *     body_html         1..200000
 *     recipient_filter  { share_types: string[], newsletter_opt_in: boolean }
 *
 *   delete:
 *     id                UUID
 *
 * Response: { ok: true, template?: {...} } | { ok: false, error }
 *
 * Security: isSameOriginPost CSRF + requireAdmin. Writes go through the
 * cookie-aware (RLS-scoped) client so the audit trigger captures the
 * acting admin's email, and the campaign_templates_admin_all policy
 * (migration 0034) is the second line of defense.
 */
import type { APIRoute } from 'astro';
import { z } from 'zod';
import { requireAdmin } from '../../../../lib/admin';
import { isSameOriginPost, PORTAL_ORIGIN } from '../../../../lib/onboarding';
import {
  TARGETABLE_SHARE_TYPES,
  TEMPLATE_CATEGORIES,
  SEGMENT_KINDS,
  normalizeRecipientFilter,
} from '../../../../lib/campaign';
import type { Json } from '../../../../lib/database.types';

export const prerender = false;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

const SaveSchema = z.object({
  action: z.literal('save'),
  id: z.string().uuid().nullable().optional(),
  name: z.string().trim().min(1, 'name_required').max(160, 'name_too_long'),
  category: z.enum(TEMPLATE_CATEGORIES),
  subject: z.string().trim().min(1, 'subject_required').max(200, 'subject_too_long'),
  preview_text: z
    .string()
    .trim()
    .min(1, 'preview_required')
    .max(200, 'preview_too_long'),
  body_html: z
    .string()
    .trim()
    .min(1, 'body_required')
    .max(200_000, 'body_too_long'),
  recipient_filter: z
    .object({
      share_types: z.array(z.enum(TARGETABLE_SHARE_TYPES)).default([]),
      newsletter_opt_in: z.boolean().default(true),
      // Phase 2 Wave 2 segments — optional so legacy payloads stay valid.
      segment: z.enum(SEGMENT_KINDS).optional(),
      renewal_weeks_threshold: z.number().int().min(1).max(52).optional(),
    })
    .default({ share_types: [], newsletter_opt_in: true }),
});

const DeleteSchema = z.object({
  action: z.literal('delete'),
  id: z.string().uuid('invalid_id'),
});

const BodySchema = z.discriminatedUnion('action', [SaveSchema, DeleteSchema]);

async function parseBody(request: Request): Promise<Record<string, unknown> | null> {
  const ct = (request.headers.get('content-type') ?? '').toLowerCase();
  try {
    if (ct.includes('application/json')) {
      return (await request.json()) as Record<string, unknown>;
    }
    const fd = await request.formData();
    const out: Record<string, unknown> = {};
    for (const [k, v] of fd.entries()) out[k] = String(v);
    return out;
  } catch {
    return null;
  }
}

export const POST: APIRoute = async ({ request, locals }) => {
  if (!isSameOriginPost(request, PORTAL_ORIGIN)) {
    return json({ ok: false, error: 'forbidden' }, 403);
  }
  const auth = await requireAdmin(locals.supabase, locals.user);
  if (auth.response) return auth.response;

  const raw = await parseBody(request);
  if (!raw) return json({ ok: false, error: 'invalid_input' }, 400);

  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return json(
      { ok: false, error: parsed.error.issues[0]?.message ?? 'invalid_input' },
      400
    );
  }

  // ── DELETE ──────────────────────────────────────────────────────────
  if (parsed.data.action === 'delete') {
    const { error } = await locals.supabase
      .from('campaign_templates')
      .delete()
      .eq('id', parsed.data.id);
    if (error) {
      console.error('[api/admin/campaigns/templates] delete failed:', error.message);
      return json({ ok: false, error: 'delete_failed' }, 500);
    }
    return json({ ok: true });
  }

  // ── SAVE (create or update) ──────────────────────────────────────────
  const input = parsed.data;
  const filter = normalizeRecipientFilter(input.recipient_filter);
  const filterJson: Json = {
    share_types: [...filter.share_types],
    newsletter_opt_in: filter.newsletter_opt_in,
    segment: filter.segment ?? 'active',
    renewal_weeks_threshold: filter.renewal_weeks_threshold ?? null,
  };
  const payload = {
    name: input.name,
    category: input.category,
    subject: input.subject,
    preview_text: input.preview_text,
    body_html: input.body_html,
    recipient_filter: filterJson,
  };

  if (input.id) {
    const { data, error } = await locals.supabase
      .from('campaign_templates')
      .update(payload)
      .eq('id', input.id)
      .select('*')
      .maybeSingle();
    if (error) {
      // 23505 = unique_violation on name.
      if (error.code === '23505') {
        return json({ ok: false, error: 'name_taken' }, 409);
      }
      console.error('[api/admin/campaigns/templates] update failed:', error.message);
      return json({ ok: false, error: 'update_failed' }, 500);
    }
    if (!data) return json({ ok: false, error: 'not_found' }, 404);
    return json({ ok: true, template: data });
  }

  const { data, error } = await locals.supabase
    .from('campaign_templates')
    .insert(payload)
    .select('*')
    .maybeSingle();
  if (error) {
    if (error.code === '23505') {
      return json({ ok: false, error: 'name_taken' }, 409);
    }
    console.error('[api/admin/campaigns/templates] insert failed:', error.message);
    return json({ ok: false, error: 'insert_failed' }, 500);
  }
  return json({ ok: true, template: data });
};
