/**
 * POST /api/admin/flex-inventory/add-from-library   (admin only)
 *
 * Load one or more items into a given week's flex catalog by picking from the
 * master product archive (`product_library`), instead of typing each item by
 * hand. For each selected archive product we INSERT a "ghost" flex_inventory
 * row for the week (is_active=false, qty 0) that Todd then toggles on / sets
 * quantity for. Already-present products for the week are skipped.
 *
 * Form body (multipart/form-data):
 *   - week_starting   YYYY-MM-DD (the cycle Monday)
 *   - library_ids     one or more product_library UUIDs (repeated field)
 *
 * Per selected library_id:
 *   - SKIP if a flex_inventory row already exists for (week_starting, library_id).
 *   - Else INSERT: name/category/photo_url/description copied from the archive
 *     row; unit/price_cents carried forward from the MOST RECENT prior
 *     flex_inventory row with the same library_id (any week), defaulting to
 *     unit='each' / price_cents=0 when there's no history. available_qty=0,
 *     remaining_qty=0, is_active=false, coming_soon=false, is_featured=false.
 *
 * Authorization: requireAdmin + isSameOriginPost. Writes go through the
 * cookie-aware RLS client (admin_all policy), consistent with save.ts and every
 * other admin mutation in this codebase.
 *
 * On success: 303 → /admin/flex-inventory?week=<>&ok=added_from_library
 * On failure: 303 → /admin/flex-inventory?week=<>&error=add_failed
 */
import type { APIRoute } from 'astro';
import { requireAdmin } from '../../../../lib/admin';
import { isSameOriginPost, PORTAL_ORIGIN } from '../../../../lib/onboarding';
import { isYMD } from '../../../../lib/flex-order';

export const prerender = false;

function backTo(week: string, key: 'ok' | 'error', val: string): string {
  return `/admin/flex-inventory?week=${encodeURIComponent(week)}&${key}=${val}`;
}

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
    return redirect(backTo('', 'error', 'add_failed'), 303);
  }

  const week = String(form.get('week_starting') ?? '');
  if (!isYMD(week)) {
    return redirect(backTo(week, 'error', 'add_failed'), 303);
  }

  // De-dupe selected library ids; ignore blanks.
  const libraryIds = Array.from(
    new Set(
      form
        .getAll('library_ids')
        .map((v) => String(v).trim())
        .filter((v) => v.length > 0)
    )
  );
  if (libraryIds.length === 0) {
    // Nothing selected — treat as a no-op success so Todd lands back cleanly.
    return redirect(backTo(week, 'ok', 'added_from_library'), 303);
  }

  // Which of these are already in this week? Skip them.
  type ExistingRow = { library_id: string | null };
  const { data: existingRows, error: existingErr } = await locals.supabase
    .from('flex_inventory')
    .select('library_id')
    .eq('cycle_code', 'WEEKLY')
    .eq('week_starting', week)
    .in('library_id', libraryIds)
    .overrideTypes<ExistingRow[], { merge: false }>();

  if (existingErr) {
    console.error('[api/admin/flex-inventory/add-from-library] existing read failed:', existingErr.message);
    return redirect(backTo(week, 'error', 'add_failed'), 303);
  }
  const alreadyPresent = new Set(
    (existingRows ?? []).map((r) => r.library_id).filter((v): v is string => v !== null)
  );

  const toAdd = libraryIds.filter((id) => !alreadyPresent.has(id));
  if (toAdd.length === 0) {
    // Everything selected was already in the week — nothing to do.
    return redirect(backTo(week, 'ok', 'added_from_library'), 303);
  }

  // Archive rows for the products we're adding (name/category/photo/description).
  type LibRow = {
    id: string;
    name: string;
    category: string | null;
    photo_url: string | null;
    description: string | null;
  };
  const { data: libRows, error: libErr } = await locals.supabase
    .from('product_library')
    .select('id, name, category, photo_url, description')
    .in('id', toAdd)
    .overrideTypes<LibRow[], { merge: false }>();

  if (libErr) {
    console.error('[api/admin/flex-inventory/add-from-library] library read failed:', libErr.message);
    return redirect(backTo(week, 'error', 'add_failed'), 303);
  }
  const libById = new Map((libRows ?? []).map((r) => [r.id, r]));

  // Carry-forward unit/price from the MOST RECENT prior flex_inventory row for
  // each library_id (any week). One small query per product keeps this simple
  // and correct; the selection set is tiny (~51 archive products max).
  type PriorRow = { unit: string; price_cents: number };
  const inserts: Array<{
    cycle_code: 'WEEKLY';
    week_starting: string;
    library_id: string;
    name: string;
    category: string | null;
    unit: string;
    price_cents: number;
    available_qty: number;
    remaining_qty: number;
    photo_url: string | null;
    description: string | null;
    is_active: boolean;
    coming_soon: boolean;
    is_featured: boolean;
  }> = [];

  for (const libraryId of toAdd) {
    const lib = libById.get(libraryId);
    if (!lib) {
      // Selected id isn't a real archive product (stale form / tampering) — skip.
      continue;
    }

    let unit = 'each';
    let priceCents = 0;
    const { data: prior, error: priorErr } = await locals.supabase
      .from('flex_inventory')
      .select('unit, price_cents')
      .eq('library_id', libraryId)
      .order('week_starting', { ascending: false })
      .limit(1)
      .maybeSingle()
      .overrideTypes<PriorRow, { merge: false }>();

    if (priorErr) {
      console.error('[api/admin/flex-inventory/add-from-library] prior lookup failed:', priorErr.message);
      return redirect(backTo(week, 'error', 'add_failed'), 303);
    }
    if (prior) {
      unit = prior.unit;
      priceCents = prior.price_cents;
    }

    inserts.push({
      cycle_code: 'WEEKLY',
      week_starting: week,
      library_id: libraryId,
      name: lib.name,
      category: lib.category,
      unit,
      price_cents: priceCents,
      available_qty: 0,
      remaining_qty: 0,
      photo_url: lib.photo_url,
      description: lib.description,
      is_active: false, // ghost — owner toggles on
      coming_soon: false,
      is_featured: false,
    });
  }

  if (inserts.length === 0) {
    return redirect(backTo(week, 'ok', 'added_from_library'), 303);
  }

  const { error: insertErr } = await locals.supabase.from('flex_inventory').insert(inserts);
  if (insertErr) {
    console.error('[api/admin/flex-inventory/add-from-library] insert failed:', insertErr.message);
    return redirect(backTo(week, 'error', 'add_failed'), 303);
  }

  return redirect(backTo(week, 'ok', 'added_from_library'), 303);
};
