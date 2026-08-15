/**
 * POST /api/admin/flex-review   (admin only, same-origin)
 *
 * The mutation backend for the phone-first flex REVIEW page
 * (/admin/flex-review/[week]). One JSON endpoint, dispatched on `action`:
 *
 *   action: 'toggle'   — flip a single item's on/off state.
 *       • Week UNPUBLISHED → writes `draft_on` (the desired-visible state).
 *         is_active stays false so members never see a half-built draft.
 *       • Week PUBLISHED   → writes `is_active` directly (edit goes live now).
 *       Body: { action, id, on: boolean, week }
 *
 *   action: 'edit'     — inline edit of price and/or qty for one item.
 *       Body: { action, id, week, price_cents?, available_qty? }
 *       available_qty edit preserves already-ordered units (mirrors
 *       flex-inventory/save: new remaining = max(0, new_avail − ordered)).
 *
 *   action: 'add'      — quick-add a new item to the week.
 *       Body: { action, week, name, price_cents, unit, available_qty, category? }
 *       • Week UNPUBLISHED → inserted is_active=false, draft_on=true (part of
 *         the draft — publishes with the rest).
 *       • Week PUBLISHED   → inserted is_active=true (live immediately),
 *         draft_on=true.
 *
 *   action: 'publish'  — the one-tap PUBLISH: set is_active = draft_on for the
 *       whole week and record portal_settings `flex_published_<week>`.
 *       Body: { action, week }
 *       Idempotent-friendly: re-publishing re-applies draft_on and refreshes
 *       the marker timestamp.
 *
 * Response envelope (ALWAYS): { ok: true, ... } | { ok: false, error, code }.
 *
 * Auth: requireAdmin (401/403 JSON, not a redirect) + isSameOriginPost. Writes
 * go through the cookie-aware RLS admin client (flex_inventory_admin_all /
 * portal_settings admin policy), consistent with every other admin mutation.
 */
import type { APIRoute } from 'astro';
import { z } from 'zod';
import { requireAdmin } from '../../../lib/admin';
import { isSameOriginPost, PORTAL_ORIGIN } from '../../../lib/onboarding';
import { isYMD } from '../../../lib/flex-order';
import { getPublishedAt, publishWeek } from '../../../lib/flex-draft';
import type { Database } from '../../../lib/database.types';

export const prerender = false;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

function fail(code: string, error: string, status = 400): Response {
  return json({ ok: false, error, code }, status);
}

/* ── Per-action schemas ─────────────────────────────────────────────── */

const WeekField = z.string().refine(isYMD, 'invalid_week');

const ToggleBody = z.object({
  action: z.literal('toggle'),
  id: z.uuid(),
  on: z.boolean(),
  week: WeekField,
});

const EditBody = z.object({
  action: z.literal('edit'),
  id: z.uuid(),
  week: WeekField,
  price_cents: z.number().int().nonnegative().max(1_000_000).optional(),
  available_qty: z.number().int().nonnegative().max(100_000).optional(),
}).refine(
  (b) => b.price_cents !== undefined || b.available_qty !== undefined,
  { message: 'nothing_to_edit' },
);

const AddBody = z.object({
  action: z.literal('add'),
  week: WeekField,
  name: z.string().trim().min(1).max(120),
  price_cents: z.number().int().nonnegative().max(1_000_000),
  unit: z.string().trim().min(1).max(30),
  available_qty: z.number().int().nonnegative().max(100_000),
  category: z.string().trim().max(60).nullable().optional(),
});

const PublishBody = z.object({
  action: z.literal('publish'),
  week: WeekField,
});

export const POST: APIRoute = async ({ request, locals }) => {
  if (!isSameOriginPost(request, PORTAL_ORIGIN)) {
    return fail('forbidden', 'Cross-origin request rejected.', 403);
  }
  const auth = await requireAdmin(locals.supabase, locals.user);
  if (auth.response) return auth.response;
  const supabase = locals.supabase;

  // Parse the JSON body.
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return fail('invalid_json', 'Request body was not valid JSON.');
  }
  const action = (raw as { action?: unknown })?.action;

  // ── TOGGLE ────────────────────────────────────────────────────────
  if (action === 'toggle') {
    const p = ToggleBody.safeParse(raw);
    if (!p.success) return fail('invalid_input', 'Invalid toggle request.');
    const { id, on, week } = p.data;

    const publishedAt = await getPublishedAt(supabase, week);
    // Unpublished → set draft_on (keep it invisible). Published → set is_active.
    const patch = publishedAt ? { is_active: on } : { draft_on: on };

    const { data, error } = await supabase
      .from('flex_inventory')
      .update(patch)
      .eq('id', id)
      .eq('week_starting', week)
      .select('id')
      .maybeSingle();
    if (error) {
      console.error('[flex-review] toggle failed:', error.message);
      return fail('toggle_failed', "Couldn't update that item.", 500);
    }
    if (!data) return fail('not_found', 'That item no longer exists.', 404);
    return json({ ok: true, action: 'toggle', id, on, published: !!publishedAt });
  }

  // ── EDIT (price / qty) ────────────────────────────────────────────
  if (action === 'edit') {
    const p = EditBody.safeParse(raw);
    if (!p.success) return fail('invalid_input', 'Invalid edit request.');
    const { id, week, price_cents, available_qty } = p.data;

    // Build the patch. For available_qty we must preserve already-ordered units.
    const patch: Database['public']['Tables']['flex_inventory']['Update'] = {};
    if (price_cents !== undefined) patch.price_cents = price_cents;

    if (available_qty !== undefined) {
      type Cur = { available_qty: number; remaining_qty: number };
      const { data: cur, error: curErr } = await supabase
        .from('flex_inventory')
        .select('available_qty, remaining_qty')
        .eq('id', id)
        .eq('week_starting', week)
        .maybeSingle()
        .overrideTypes<Cur, { merge: false }>();
      if (curErr) {
        console.error('[flex-review] edit read failed:', curErr.message);
        return fail('edit_failed', "Couldn't update that item.", 500);
      }
      if (!cur) return fail('not_found', 'That item no longer exists.', 404);
      const ordered = Math.max(0, cur.available_qty - cur.remaining_qty);
      patch.available_qty = available_qty;
      patch.remaining_qty = Math.max(0, available_qty - ordered);
    }

    const { data, error } = await supabase
      .from('flex_inventory')
      .update(patch)
      .eq('id', id)
      .eq('week_starting', week)
      .select('id, price_cents, available_qty, remaining_qty')
      .maybeSingle();
    if (error) {
      console.error('[flex-review] edit failed:', error.message);
      return fail('edit_failed', "Couldn't update that item.", 500);
    }
    if (!data) return fail('not_found', 'That item no longer exists.', 404);
    return json({ ok: true, action: 'edit', item: data });
  }

  // ── ADD ───────────────────────────────────────────────────────────
  if (action === 'add') {
    const p = AddBody.safeParse(raw);
    if (!p.success) return fail('invalid_input', 'Fill in a name, price, unit and quantity.');
    const { week, name, price_cents, unit, available_qty, category } = p.data;

    const publishedAt = await getPublishedAt(supabase, week);
    // Unpublished → part of the draft (invisible, staged ON). Published → live now.
    const isActive = !!publishedAt;

    const { data, error } = await supabase
      .from('flex_inventory')
      .insert({
        week_starting: week,
        name,
        category: category ?? null,
        unit,
        price_cents,
        available_qty,
        remaining_qty: available_qty,
        is_active: isActive,
        coming_soon: false,
        is_featured: false,
        draft_on: true,
      })
      .select(
        'id, name, category, unit, price_cents, available_qty, remaining_qty, ' +
        'photo_url, is_active, draft_on'
      )
      .single();
    if (error) {
      console.error('[flex-review] add failed:', error.message);
      return fail('add_failed', "Couldn't add that item.", 500);
    }
    return json({ ok: true, action: 'add', item: data, published: isActive });
  }

  // ── PUBLISH ───────────────────────────────────────────────────────
  if (action === 'publish') {
    const p = PublishBody.safeParse(raw);
    if (!p.success) return fail('invalid_input', 'Invalid publish request.');
    const { week } = p.data;
    try {
      const result = await publishWeek(supabase, week);
      return json({
        ok: true,
        action: 'publish',
        week,
        published_at: result.publishedAt,
        on_count: result.onCount,
        off_count: result.offCount,
      });
    } catch (e) {
      console.error('[flex-review] publish failed:', e instanceof Error ? e.message : String(e));
      return fail('publish_failed', "Couldn't publish the list. Please try again.", 500);
    }
  }

  return fail('unknown_action', 'Unknown action.', 400);
};
