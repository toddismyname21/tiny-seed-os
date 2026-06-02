/**
 * POST /api/admin/campaigns/draft
 *
 * Create-or-update a campaign draft. Accepts JSON OR form data so the
 * composer page can submit via fetch with a JSON body and a hidden form
 * fallback (no fancy client-state library).
 *
 * Body:
 *   id?               UUID (when present → UPDATE; absent → INSERT)
 *   name              admin label (1..160)
 *   subject           inbox subject (1..200)
 *   preview_text      inbox preview (1..200)
 *   body_html         editable HTML body (1..200000)
 *   recipient_filter  { share_types: string[], newsletter_opt_in: boolean }
 *
 * Security: isSameOriginPost CSRF + requireAdmin.
 *
 * Status: campaigns being mutated must be in 'draft' (or 'failed' — a
 * retry of a previously failed campaign before any sends went out).
 * Any other status (sending/sent/partial) is rejected to avoid silently
 * mutating an in-flight send.
 *
 * Response: { ok: true, campaign: {id, ...} } | { ok: false, error }
 */
import type { APIRoute } from 'astro';
import { z } from 'zod';
import { requireAdmin } from '../../../../lib/admin';
import { isSameOriginPost, PORTAL_ORIGIN } from '../../../../lib/onboarding';
import {
  TARGETABLE_SHARE_TYPES,
  normalizeRecipientFilter,
  type Campaign,
} from '../../../../lib/campaign';
import type { Json } from '../../../../lib/database.types';

export const prerender = false;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

const DraftSchema = z.object({
  id: z.string().uuid().nullable().optional(),
  name: z.string().trim().min(1, 'name_required').max(160, 'name_too_long'),
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
    })
    .default({ share_types: [], newsletter_opt_in: true }),
});

async function parseBody(request: Request): Promise<Record<string, unknown> | null> {
  const ct = (request.headers.get('content-type') ?? '').toLowerCase();
  try {
    if (ct.includes('application/json')) {
      return (await request.json()) as Record<string, unknown>;
    }
    if (ct.includes('multipart/form-data') || ct.includes('application/x-www-form-urlencoded')) {
      const fd = await request.formData();
      const out: Record<string, unknown> = {};
      for (const [k, v] of fd.entries()) {
        if (k === 'share_types[]') {
          (out.share_types as string[] | undefined) ??
            ((out.share_types = []) as string[]);
          (out.share_types as string[]).push(String(v));
          continue;
        }
        out[k] = String(v);
      }
      // Form data passes booleans as strings.
      const optIn = out.newsletter_opt_in;
      if (typeof optIn === 'string') {
        out.newsletter_opt_in = optIn === 'true' || optIn === 'on';
      }
      out.recipient_filter = {
        share_types: (out.share_types as string[] | undefined) ?? [],
        newsletter_opt_in: out.newsletter_opt_in ?? true,
      };
      return out;
    }
  } catch {
    return null;
  }
  return null;
}

export const POST: APIRoute = async ({ request, locals }) => {
  if (!isSameOriginPost(request, PORTAL_ORIGIN)) {
    return json({ ok: false, error: 'forbidden' }, 403);
  }
  const auth = await requireAdmin(locals.supabase, locals.user);
  if (auth.response) return auth.response;

  const raw = await parseBody(request);
  if (!raw) return json({ ok: false, error: 'invalid_input' }, 400);

  const parsed = DraftSchema.safeParse(raw);
  if (!parsed.success) {
    const code = parsed.error.issues[0]?.message ?? 'invalid_input';
    return json({ ok: false, error: code }, 400);
  }
  const input = parsed.data;
  const filter = normalizeRecipientFilter(input.recipient_filter);

  // recipient_filter is stored as JSONB; we shape it as plain Json for
  // the supabase write so the typed insert/update accepts it.
  const filterJson: Json = {
    share_types: [...filter.share_types],
    newsletter_opt_in: filter.newsletter_opt_in,
  };
  const payload = {
    name: input.name,
    subject: input.subject,
    preview_text: input.preview_text,
    body_html: input.body_html,
    recipient_filter: filterJson,
  };

  // ── UPDATE path ────────────────────────────────────────────────────
  if (input.id) {
    // Guard: only edit drafts (or previously failed campaigns with no
    // sends recorded). Sent/sending/partial campaigns must not have
    // their body silently rewritten.
    const { data: existing, error: lookupErr } = await locals.supabase
      .from('campaigns')
      .select('id, status, total_sent')
      .eq('id', input.id)
      .maybeSingle()
      .overrideTypes<
        Pick<Campaign, 'id' | 'status' | 'total_sent'>,
        { merge: false }
      >();
    if (lookupErr) {
      console.error('[api/admin/campaigns/draft] lookup failed:', lookupErr.message);
      return json({ ok: false, error: 'lookup_failed' }, 500);
    }
    if (!existing) {
      return json({ ok: false, error: 'not_found' }, 404);
    }
    if (existing.status !== 'draft' && !(existing.status === 'failed' && existing.total_sent === 0)) {
      return json({ ok: false, error: 'campaign_in_flight' }, 409);
    }

    const { data, error } = await locals.supabase
      .from('campaigns')
      .update(payload)
      .eq('id', input.id)
      .select('*')
      .maybeSingle();
    if (error) {
      console.error('[api/admin/campaigns/draft] update failed:', error.message);
      return json({ ok: false, error: 'update_failed' }, 500);
    }
    return json({ ok: true, campaign: data });
  }

  // ── CREATE path ────────────────────────────────────────────────────
  const { data, error } = await locals.supabase
    .from('campaigns')
    .insert(payload)
    .select('*')
    .maybeSingle();
  if (error) {
    console.error('[api/admin/campaigns/draft] insert failed:', error.message);
    return json({ ok: false, error: 'insert_failed' }, 500);
  }
  return json({ ok: true, campaign: data });
};
