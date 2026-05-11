/**
 * POST /api/admin/box-contents/save
 *
 * Form body:
 *   - week_date    YYYY-MM-DD
 *   - share_type   canonical enum value (spring_veg, summer_veg, fall_veg,
 *                  flower, flex, add_on, wholesale_csa)
 *   - items[i][product_name] / [variety] / [quantity] / [unit]
 *     / [is_swappable] (boolean) / [swap_options] (comma-separated string)
 *
 * Semantics: REPLACES the full set of items for (week_date, share_type).
 * Implementation:
 *   1. Validate every item
 *   2. DELETE all existing rows for (week_date, share_type)
 *   3. INSERT all submitted items
 *
 * We do the delete+insert in two separate statements (not a single
 * transaction) because PostgREST doesn't expose transactional batching
 * easily, and the audit_log trigger will record both ops. The window
 * between delete + insert is brief and the destination is admin-only,
 * so no member-facing race risk. If the insert fails after the delete,
 * we still have the audit_log diff to reconstruct (admins can undo by
 * re-pasting from CSV / previous week). Acceptable for Day 10.
 *
 * Day 7 finding context: this endpoint is THE channel for canonical
 * share_type rows going forward. Old 'Veggie-CSA' rows from the Sheets
 * import remain in the table but are filtered out by the new admin UI
 * (which only offers canonical values in its tabs). We don't migrate
 * the legacy rows in this endpoint — Todd will publish fresh contents
 * for upcoming weeks via this UI.
 *
 * On success: 303 → /admin/box-contents?week=<>&share_type=<>&ok=saved
 * On failure: 303 → /admin/box-contents?...&error=<code>
 */
import type { APIRoute } from 'astro';
import { z } from 'zod';
import { requireAdmin } from '../../../../lib/admin';
import { isSameOriginPost, PORTAL_ORIGIN } from '../../../../lib/onboarding';

export const prerender = false;

const CANONICAL_SHARES = new Set([
  'spring_veg', 'summer_veg', 'fall_veg', 'flower', 'flex', 'add_on', 'wholesale_csa',
]);

const ItemSchema = z.object({
  product_name: z.string().trim().min(1).max(80),
  variety: z.string().trim().max(80).nullable(),
  quantity: z.number().nonnegative().max(1_000),
  unit: z.string().trim().min(1).max(30),
  is_swappable: z.boolean(),
  swap_options: z.array(z.string().trim().min(1).max(80)).max(20),
});

type ParsedItem = z.infer<typeof ItemSchema>;

/**
 * Form data uses bracketed names like `items[0][product_name]` —
 * parse those into a sparse array.
 */
function parseItems(formData: FormData): unknown[] {
  const buckets = new Map<number, Record<string, unknown>>();
  const numericKey = /^items\[(\d+)\]\[([a-z_]+)\]$/;
  for (const [key, value] of formData.entries()) {
    const match = key.match(numericKey);
    if (!match) continue;
    const idx = Number.parseInt(match[1], 10);
    const field = match[2];
    if (!Number.isFinite(idx)) continue;
    const bucket = buckets.get(idx) ?? {};
    if (field === 'quantity') {
      bucket[field] = Number.parseFloat(String(value));
    } else if (field === 'is_swappable') {
      bucket[field] = String(value) === 'true';
    } else if (field === 'swap_options') {
      // CSV in the textbox: 'spinach, arugula, kale' → array
      bucket[field] = String(value).split(',').map((s) => s.trim()).filter(Boolean);
    } else if (field === 'variety') {
      const v = String(value).trim();
      bucket[field] = v.length === 0 ? null : v;
    } else {
      bucket[field] = String(value);
    }
    buckets.set(idx, bucket);
  }
  // Defaults for boolean if checkbox unchecked (browsers omit it).
  for (const b of buckets.values()) {
    if (b.is_swappable === undefined) b.is_swappable = false;
    if (b.swap_options === undefined) b.swap_options = [];
    if (b.variety === undefined) b.variety = null;
  }
  return Array.from(buckets.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([, v]) => v);
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
    return redirect('/admin/box-contents?error=invalid_input', 303);
  }

  const weekDate = String(formData.get('week_date') ?? '');
  const shareType = String(formData.get('share_type') ?? '');

  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekDate)) {
    return redirect('/admin/box-contents?error=invalid_input', 303);
  }
  if (!CANONICAL_SHARES.has(shareType)) {
    return redirect(`/admin/box-contents?week=${weekDate}&error=invalid_input`, 303);
  }

  const rawItems = parseItems(formData);
  // Allow empty (clearing a week) — both delete + skip insert.
  const validated: ParsedItem[] = [];
  for (const raw of rawItems) {
    const parsed = ItemSchema.safeParse(raw);
    if (!parsed.success) {
      return redirect(
        `/admin/box-contents?week=${weekDate}&share_type=${shareType}&error=invalid_input`,
        303
      );
    }
    validated.push(parsed.data);
  }

  // Reject duplicate product_names for the same (week, share) — the
  // UNIQUE constraint on box_contents would error otherwise.
  const seen = new Set<string>();
  for (const it of validated) {
    const k = it.product_name.toLowerCase();
    if (seen.has(k)) {
      return redirect(
        `/admin/box-contents?week=${weekDate}&share_type=${shareType}&error=duplicate_product`,
        303
      );
    }
    seen.add(k);
  }

  // Step 1: delete existing rows for (week_date, share_type).
  const { error: deleteErr } = await locals.supabase
    .from('box_contents')
    .delete()
    .eq('week_date', weekDate)
    .eq('share_type', shareType);
  if (deleteErr) {
    console.error('[api/admin/box-contents/save] delete failed:', deleteErr.message);
    return redirect(
      `/admin/box-contents?week=${weekDate}&share_type=${shareType}&error=invalid_input`,
      303
    );
  }

  // Step 2: insert new rows (if any).
  if (validated.length > 0) {
    const rows = validated.map((it) => ({
      week_date: weekDate,
      share_type: shareType,
      product_name: it.product_name,
      variety: it.variety,
      quantity: it.quantity,
      unit: it.unit,
      is_swappable: it.is_swappable,
      swap_options: it.is_swappable ? it.swap_options : null,
    }));
    const { error: insertErr } = await locals.supabase.from('box_contents').insert(rows);
    if (insertErr) {
      console.error('[api/admin/box-contents/save] insert failed:', insertErr.message);
      return redirect(
        `/admin/box-contents?week=${weekDate}&share_type=${shareType}&error=invalid_input`,
        303
      );
    }
  }

  return redirect(
    `/admin/box-contents?week=${weekDate}&share_type=${shareType}&ok=saved`,
    303
  );
};
