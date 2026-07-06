/**
 * wholesale-import-commit.ts — the SHARED write path for wholesale order imports.
 *
 * This is the extracted core of what used to live inline in
 * /api/admin/wholesale/import/commit.ts. It is now called by BOTH:
 *
 *   1. the admin importer (POST /api/admin/wholesale/import/commit) — the
 *      deliberate, human-driven "upload / review / commit" flow. It passes
 *      `onExisting: 'replace'`, preserving the ORIGINAL behavior byte-for-byte:
 *      re-committing the same (account, delivery_date, external_ref) DELETES the
 *      prior items and updates the order row in place (corrected-PDF re-upload
 *      replaces, never duplicates).
 *
 *   2. the Monday Gmail auto-ingest cron (/api/cron/harvie-ingest) — the
 *      unattended flow. It passes `onExisting: 'skip'`: if an order already
 *      exists for that (account, delivery_date, external_ref) it is LEFT
 *      UNTOUCHED and reported as skipped. An automated job must never silently
 *      overwrite an order Todd may have hand-edited; the manual admin importer
 *      remains the one deliberate "replace" path.
 *
 * The ONLY behavioral difference between the two callers is what happens when a
 * matching order already exists — controlled by `onExisting`. Everything else
 * (mapping upserts, account resolution, totals, item rows) is identical, so the
 * logic is defined exactly once here.
 *
 * Sequence (unchanged from the original inline implementation):
 *   1. Remember mappings: upsert vendor_product_map for every line carrying a
 *      product_id, so the NEXT import of that SKU/name auto-resolves.
 *   2. Resolve the vendor account by restaurant_name = vendor_display; create it
 *      (random order_token) if missing.
 *   3. Idempotency: key on (account_id, delivery_date, external_ref).
 *        - 'replace' + existing → delete items, update order in place.
 *        - 'skip'    + existing → return { skipped:true } WITHOUT any write to
 *          the order or its items.
 *        - no existing → insert a new order row.
 *   4. Insert wholesale_order_items (product_id nullable — the pack page renders
 *      off product_name, so unmapped lines are fine).
 *
 * Every failure returns a discriminated `{ ok:false, error, detail }` with the
 * SAME error codes the admin endpoint returned before, so its JSON response and
 * HTTP status are unchanged.
 */
import { randomBytes } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';
import type { Vendor } from './wholesale-import';

/** One import line, already resolved to a (possibly null) product mapping. */
export interface CommitLine {
  /** vendor_product_map key (Harvie canonical SKU / normalized MW name). */
  vendor_key: string;
  /** Resolved catalog product id, or null for an unmapped line. */
  product_id?: string | null;
  /** Display name — catalog name when mapped, else the raw PDF description. */
  product_name: string;
  qty: number;
  unit_price_cents?: number | null;
}

/** The normalized order to commit (output of parse + mapping resolution). */
export interface CommitInput {
  vendor: Vendor;
  /** Account display name — the wholesale_accounts.restaurant_name to resolve. */
  vendor_display: string;
  /** YYYY-MM-DD. */
  delivery_date: string;
  /** Vendor's own order id (Harvie PO #). Part of the idempotency key. */
  external_ref?: string | null;
  lines: CommitLine[];
}

export interface CommitOptions {
  /**
   * What to do when an order already exists for (account, delivery_date,
   * external_ref):
   *   - 'replace' → delete prior items + update the order (admin importer).
   *   - 'skip'    → leave it untouched and report skipped (auto-ingest cron).
   */
  onExisting: 'replace' | 'skip';
}

/** Error codes — identical to the admin endpoint's original `error` strings. */
export type CommitErrorCode =
  | 'map_upsert_failed'
  | 'account_create_failed'
  | 'item_delete_failed'
  | 'order_update_failed'
  | 'order_create_failed'
  | 'item_insert_failed';

export type CommitResult =
  | {
      ok: true;
      /** True when the incoming PO already existed and was left untouched
       *  (only possible under onExisting:'skip'). */
      skipped: boolean;
      /** True when a brand-new order row was inserted this run. */
      created: boolean;
      /** True when an existing order row was replaced (onExisting:'replace'). */
      replaced: boolean;
      order_id: string;
      account_id: string;
      /** Order total in dollars (0 when skipped — the existing row is unchanged). */
      total_amount: number;
      /** Count of lines that committed with product_id NULL (unmapped). */
      unmapped_count: number;
    }
  | { ok: false; error: CommitErrorCode; detail?: string };

/** 24-char URL-safe token for a freshly-created vendor account. */
function makeOrderToken(): string {
  return randomBytes(18).toString('base64url').slice(0, 24);
}

/**
 * Commit a parsed wholesale order. See the file header for the full contract.
 * Never throws for an expected DB failure — returns `{ ok:false, error }`.
 */
export async function commitWholesaleImport(
  supabase: SupabaseClient<Database>,
  input: CommitInput,
  opts: CommitOptions
): Promise<CommitResult> {
  const { vendor, vendor_display } = input;
  const delivery_date = input.delivery_date;
  const external_ref = input.external_ref?.trim() || null;
  const lines = input.lines;

  // ── 1. Remember product mappings (only lines that carry a product_id) ──
  const mapUpserts = lines
    .filter((l) => l.product_id)
    .map((l) => ({
      vendor,
      vendor_key: l.vendor_key,
      product_id: l.product_id!,
      product_name: l.product_name,
    }));
  if (mapUpserts.length) {
    const { error: mapErr } = await supabase
      .from('vendor_product_map')
      .upsert(mapUpserts, { onConflict: 'vendor,vendor_key' });
    if (mapErr) {
      console.error('[wholesale-import-commit] vendor_product_map upsert failed:', mapErr.message);
      return { ok: false, error: 'map_upsert_failed', detail: mapErr.message };
    }
  }

  // ── 2. Resolve / create the vendor account ──
  let accountId: string;
  const { data: acct } = await supabase
    .from('wholesale_accounts')
    .select('id')
    .eq('restaurant_name', vendor_display)
    .maybeSingle();
  if (acct?.id) {
    accountId = (acct as { id: string }).id;
  } else {
    const { data: ins, error: acctErr } = await supabase
      .from('wholesale_accounts')
      .insert({ restaurant_name: vendor_display, status: 'active', order_token: makeOrderToken() })
      .select('id')
      .single();
    if (acctErr || !ins) {
      console.error('[wholesale-import-commit] account insert failed:', acctErr?.message);
      return { ok: false, error: 'account_create_failed', detail: acctErr?.message };
    }
    accountId = (ins as { id: string }).id;
  }

  // ── 3. Idempotency: find an existing order for this (account, date, ref) ──
  const totalCents = lines.reduce(
    (s, l) => s + Math.round((l.unit_price_cents ?? 0) * (Number(l.qty) || 0)),
    0
  );
  const totalAmount = Math.round(totalCents) / 100;
  const notes = `Imported ${vendor_display}${external_ref ? ` ${external_ref}` : ''}`;
  const unmappedCount = lines.reduce((n, l) => n + (l.product_id ? 0 : 1), 0);

  let existingQ = supabase
    .from('wholesale_orders')
    .select('id')
    .eq('account_id', accountId)
    .eq('delivery_date', delivery_date);
  existingQ = external_ref ? existingQ.eq('external_ref', external_ref) : existingQ.is('external_ref', null);
  const { data: existing } = await existingQ.maybeSingle();

  let orderId: string;
  if (existing?.id) {
    orderId = (existing as { id: string }).id;

    // Auto-ingest contract: never overwrite an order that already exists.
    if (opts.onExisting === 'skip') {
      return {
        ok: true,
        skipped: true,
        created: false,
        replaced: false,
        order_id: orderId,
        account_id: accountId,
        total_amount: 0,
        unmapped_count: 0,
      };
    }

    // Admin 'replace' path (byte-identical to the original commit endpoint):
    // wipe the prior items so the re-import fully replaces them.
    const { error: delErr } = await supabase
      .from('wholesale_order_items')
      .delete()
      .eq('order_id', orderId);
    if (delErr) {
      console.error('[wholesale-import-commit] item delete failed:', delErr.message);
      return { ok: false, error: 'item_delete_failed', detail: delErr.message };
    }
    const { error: updErr } = await supabase
      .from('wholesale_orders')
      .update({
        status: 'submitted',
        source: vendor,
        external_ref,
        total_amount: totalAmount,
        notes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);
    if (updErr) {
      console.error('[wholesale-import-commit] order update failed:', updErr.message);
      return { ok: false, error: 'order_update_failed', detail: updErr.message };
    }
  } else {
    const { data: ins, error: ordErr } = await supabase
      .from('wholesale_orders')
      .insert({
        account_id: accountId,
        delivery_date,
        status: 'submitted',
        source: vendor,
        external_ref,
        total_amount: totalAmount,
        notes,
      })
      .select('id')
      .single();
    if (ordErr || !ins) {
      console.error('[wholesale-import-commit] order insert failed:', ordErr?.message);
      return { ok: false, error: 'order_create_failed', detail: ordErr?.message };
    }
    orderId = (ins as { id: string }).id;
  }

  // ── 4. Insert order items ──
  const itemRows = lines.map((l) => {
    const qty = Number(l.qty) || 0;
    const unit = l.unit_price_cents ?? null;
    return {
      order_id: orderId,
      product_id: l.product_id ?? null,
      product_name: l.product_name,
      qty,
      unit_price_cents: unit,
      line_total_cents: unit === null ? null : Math.round(unit * qty),
    };
  });
  const { error: itemErr } = await supabase.from('wholesale_order_items').insert(itemRows);
  if (itemErr) {
    console.error('[wholesale-import-commit] item insert failed:', itemErr.message);
    return { ok: false, error: 'item_insert_failed', detail: itemErr.message };
  }

  return {
    ok: true,
    skipped: false,
    created: !existing?.id,
    replaced: Boolean(existing?.id),
    order_id: orderId,
    account_id: accountId,
    total_amount: totalAmount,
    unmapped_count: unmappedCount,
  };
}
