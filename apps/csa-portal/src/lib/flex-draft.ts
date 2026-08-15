/**
 * Flex "Thursday Draft + Phone Approve" — shared server helpers.
 *
 * The weekly Farm Flex list STAGES itself every Thursday (a clone of last
 * week's live items) but NEVER goes live to members without Todd's explicit
 * PUBLISH tap. This module holds the pure-ish server logic shared by:
 *   - /api/cron/flex-list-reminder  (Thursday: create the draft, email Todd)
 *   - /admin/flex-review/[week]     (the phone-first review page)
 *   - /api/admin/flex-review        (per-item edits + PUBLISH)
 *   - /api/cron/vendor-bills        (daily unpublished-draft nudge)
 *
 * DRAFT MECHANICS
 * ───────────────
 * A row is invisible to members while is_active=false (the member store only
 * renders is_active=true rows for the resolved week — that IS the draft
 * mechanism). So a staged draft is a set of rows with is_active=false. Each
 * row's DESIRED on/off state lives in `draft_on` (migration 0086). PUBLISH
 * copies draft_on → is_active for the whole week in one action. After publish,
 * per-item toggles write is_active directly (edits go live immediately).
 *
 * PUBLISHED MARKER
 * ────────────────
 * portal_settings key `flex_published_<week>` = ISO timestamp records when a
 * week was published. Its PRESENCE is the single source of truth for
 * "is this week published?" — the review page and the daily nudge both read it.
 *
 * This module is server-only (it takes a Supabase client) but holds NO secrets
 * and makes NO network calls beyond the client it's handed.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';
import { addWeeksYMD, isYMD } from './flex-order';

/** portal_settings key recording when a delivery week's flex list was published. */
export function publishedKey(week: string): string {
  return `flex_published_${week}`;
}

/**
 * The delivery week (Monday 'YYYY-MM-DD') to STAGE when the Thursday cron runs.
 *
 * The reminder cron fires Thursday 11:00 UTC (07:00 ET). The delivery week it
 * stages is the COMING Monday — i.e. the Monday of NEXT week relative to the
 * Thursday it runs on. From any ET Thursday, "next Monday" is +4 days.
 *
 * We compute it DST-safely from the ET calendar date rather than trusting the
 * server clock's local day: find this week's Monday in ET, then add one week.
 * (This also makes it correct if the cron is ever run manually on a non-Thursday
 * — it always names the next full delivery week to prepare, matching
 * week-setup.upcomingSetupWeek's intent but pinned to "the coming Monday".)
 */
export function draftTargetWeek(now: Date = new Date()): string {
  return addWeeksYMD(mondayOfWeekET(now), 1);
}

/** Short ET weekday code ('Mon'…'Sun') for an instant. */
export function etWeekday(now: Date = new Date()): 'Sun' | 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' {
  const wd = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York', weekday: 'short',
  }).format(now);
  return wd as 'Sun' | 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat';
}

/**
 * The delivery week (Monday 'YYYY-MM-DD') the DAILY unpublished-draft NUDGE
 * should check, or null on a day the nudge never runs.
 *
 * The staging→cutoff window runs Thursday (draft created) → the following
 * Tuesday 07:00 ET (order cutoff). The nudge fires on the days IN that window
 * where a still-unpublished list is a live problem:
 *   • Fri / Sat / Sun → the COMING Monday's delivery week (the one just staged).
 *   • Mon             → THIS Monday's delivery week (delivery day arrived and
 *                       the list still isn't live — most urgent).
 *   • Tue / Wed / Thu → null (Tue is cutoff day; a fresh draft is staged Thu).
 */
export function nudgeTargetWeek(now: Date = new Date()): string | null {
  const wd = etWeekday(now);
  if (wd === 'Fri' || wd === 'Sat' || wd === 'Sun') {
    return addWeeksYMD(mondayOfWeekET(now), 1);
  }
  if (wd === 'Mon') {
    return mondayOfWeekET(now);
  }
  return null;
}

/** The Monday (ET, 'YYYY-MM-DD') of the week CONTAINING `now`. */
function mondayOfWeekET(now: Date): string {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short',
  });
  const parts = fmt.formatToParts(now);
  const get = (t: string): string => parts.find((p) => p.type === t)?.value ?? '';
  const dayIndex: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const todayIdx = dayIndex[get('weekday')] ?? 0;
  const back = todayIdx === 0 ? 6 : todayIdx - 1; // Sun → 6, else idx − 1.
  const base = `${get('year')}-${get('month')}-${get('day')}`;
  const [yy, mm, dd] = base.split('-').map((s) => Number.parseInt(s, 10));
  const t = Date.UTC(yy, mm - 1, dd, 12, 0, 0) - back * 86_400_000;
  const dt = new Date(t);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
}

/** The columns copied forward when cloning a week's live items into a draft. */
type CloneRow = {
  name: string;
  category: string | null;
  unit: string;
  price_cents: number;
  available_qty: number;
  description: string | null;
  photo_url: string | null;
  is_featured: boolean;
  library_id: string | null;
  restock_alert_threshold: number;
};

export interface DraftCreateResult {
  /** The target delivery week that was (or would be) staged. */
  week: string;
  /** The week the clone SOURCE came from (target − 1 week). */
  sourceWeek: string;
  /** 'created' | 'already_exists' | 'no_source' — what happened. */
  status: 'created' | 'already_exists' | 'no_source';
  /** Rows in the target week AFTER this ran (existing or just-created). */
  itemCount: number;
  /** True when this call actually inserted rows. */
  didInsert: boolean;
}

/**
 * Idempotently STAGE next week's flex draft by cloning the current week's live
 * items.
 *
 * Semantics (matches the "weekly clone pattern" contract):
 *   - SOURCE: all is_active=true rows of `week − 1` (the current live list).
 *   - Each cloned row: strip id/created_at/updated_at; remaining_qty reset to
 *     available_qty; is_active=false (DRAFT — invisible to members); draft_on=
 *     true (staged ON, so Todd reviews and turns OFF what he lacks).
 *   - IDEMPOTENT: if the target week already has ANY rows, do nothing (a human
 *     may have already started editing it, or the cron already ran). Returns
 *     status='already_exists'.
 *   - If the source week has no live rows, nothing to clone → status='no_source'
 *     (still not an error — Todd builds the week by hand on /admin/flex-inventory).
 *
 * `dryRun` computes everything but performs NO insert (for the cron ?dry=1 probe).
 */
export async function createNextWeekDraft(
  supabase: SupabaseClient<Database>,
  week: string,
  opts: { dryRun?: boolean } = {},
): Promise<DraftCreateResult> {
  if (!isYMD(week)) {
    throw new Error(`createNextWeekDraft: invalid week ${week}`);
  }
  const sourceWeek = addWeeksYMD(week, -1);

  // Idempotency gate: any existing row for the target week (draft OR live)
  // means we must NOT clone again.
  const { count: existingCount, error: countErr } = await supabase
    .from('flex_inventory')
    .select('id', { count: 'exact', head: true })
    .eq('cycle_code', 'WEEKLY')
    .eq('week_starting', week);
  if (countErr) {
    throw new Error(`createNextWeekDraft: target count failed: ${countErr.message}`);
  }
  if ((existingCount ?? 0) > 0) {
    return {
      week, sourceWeek,
      status: 'already_exists',
      itemCount: existingCount ?? 0,
      didInsert: false,
    };
  }

  // Pull the live source list.
  const { data: sourceRows, error: srcErr } = await supabase
    .from('flex_inventory')
    .select(
      'name, category, unit, price_cents, available_qty, description, photo_url, ' +
      'is_featured, library_id, restock_alert_threshold'
    )
    .eq('cycle_code', 'WEEKLY')
    .eq('week_starting', sourceWeek)
    .eq('is_active', true)
    .overrideTypes<CloneRow[], { merge: false }>();
  if (srcErr) {
    throw new Error(`createNextWeekDraft: source read failed: ${srcErr.message}`);
  }
  const source = sourceRows ?? [];
  if (source.length === 0) {
    return { week, sourceWeek, status: 'no_source', itemCount: 0, didInsert: false };
  }

  if (opts.dryRun) {
    return { week, sourceWeek, status: 'created', itemCount: source.length, didInsert: false };
  }

  const inserts = source.map((r) => ({
    week_starting: week,
    name: r.name,
    category: r.category,
    unit: r.unit,
    price_cents: r.price_cents,
    available_qty: r.available_qty,
    remaining_qty: r.available_qty, // reset — nothing ordered on a fresh draft
    description: r.description,
    photo_url: r.photo_url,
    is_active: false, // DRAFT — invisible to members until PUBLISH
    coming_soon: false,
    is_featured: r.is_featured,
    draft_on: true, // staged ON for review
    library_id: r.library_id,
    restock_alert_threshold: r.restock_alert_threshold,
  }));

  const { error: insErr } = await supabase.from('flex_inventory').insert(inserts);
  if (insErr) {
    throw new Error(`createNextWeekDraft: insert failed: ${insErr.message}`);
  }

  return { week, sourceWeek, status: 'created', itemCount: inserts.length, didInsert: true };
}

/**
 * Is a delivery week PUBLISHED? True iff portal_settings has a
 * `flex_published_<week>` key. Returns the ISO timestamp too (null when
 * unpublished). Read failures are treated as "unknown → unpublished" so a
 * transient error errs toward showing the review/publish UI (safe) rather than
 * claiming a week is live when it isn't.
 */
export async function getPublishedAt(
  supabase: SupabaseClient<Database>,
  week: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from('portal_settings')
    .select('value')
    .eq('key', publishedKey(week))
    .maybeSingle();
  if (error) {
    console.error(`[flex-draft] getPublishedAt read failed for ${week}: ${error.message}`);
    return null;
  }
  return data?.value ?? null;
}

/**
 * For the daily NUDGE: does `week` have flex rows staged but ZERO live to
 * members? Returns { total, active } row counts so the caller can decide.
 * A week that needs a nudge has total > 0 AND active === 0 (a draft exists but
 * nothing is published/orderable). Read errors return null (caller skips the
 * nudge — never nag on a transient failure).
 */
export async function draftPublishState(
  supabase: SupabaseClient<Database>,
  week: string,
): Promise<{ total: number; active: number } | null> {
  const [totalRes, activeRes] = await Promise.all([
    supabase
      .from('flex_inventory')
      .select('id', { count: 'exact', head: true })
      .eq('cycle_code', 'WEEKLY')
      .eq('week_starting', week),
    supabase
      .from('flex_inventory')
      .select('id', { count: 'exact', head: true })
      .eq('cycle_code', 'WEEKLY')
      .eq('week_starting', week)
      .eq('is_active', true),
  ]);
  if (totalRes.error || activeRes.error) {
    console.error(
      '[flex-draft] draftPublishState count failed:',
      totalRes.error?.message ?? activeRes.error?.message,
    );
    return null;
  }
  return { total: totalRes.count ?? 0, active: activeRes.count ?? 0 };
}

/**
 * PUBLISH a week: copy draft_on → is_active for EVERY row of the week, then
 * record the published marker. This is the one-tap action.
 *
 * We do it in two steps because PostgREST can't set a column from another
 * column in a single UPDATE. Step 1 turns ON all rows where draft_on=true;
 * step 2 turns OFF all rows where draft_on=false. Both are bounded to the week
 * + WEEKLY cycle. Then we upsert the portal_settings marker.
 *
 * Returns the count of rows turned ON (the published item count) and the ISO
 * timestamp recorded. Throws on any DB error so the caller can surface a
 * failure rather than silently half-publishing.
 */
export async function publishWeek(
  supabase: SupabaseClient<Database>,
  week: string,
): Promise<{ publishedAt: string; onCount: number; offCount: number }> {
  if (!isYMD(week)) throw new Error(`publishWeek: invalid week ${week}`);

  // Step 1: turn ON every draft_on=true row.
  const { data: onRows, error: onErr } = await supabase
    .from('flex_inventory')
    .update({ is_active: true })
    .eq('cycle_code', 'WEEKLY')
    .eq('week_starting', week)
    .eq('draft_on', true)
    .select('id');
  if (onErr) throw new Error(`publishWeek: turn-on failed: ${onErr.message}`);

  // Step 2: turn OFF every draft_on=false row.
  const { data: offRows, error: offErr } = await supabase
    .from('flex_inventory')
    .update({ is_active: false })
    .eq('cycle_code', 'WEEKLY')
    .eq('week_starting', week)
    .eq('draft_on', false)
    .select('id');
  if (offErr) throw new Error(`publishWeek: turn-off failed: ${offErr.message}`);

  // Record the published marker (upsert — re-publishing refreshes the time).
  const publishedAt = new Date().toISOString();
  const { error: markErr } = await supabase
    .from('portal_settings')
    .upsert(
      { key: publishedKey(week), value: publishedAt, updated_at: publishedAt },
      { onConflict: 'key' },
    );
  if (markErr) throw new Error(`publishWeek: marker upsert failed: ${markErr.message}`);

  return {
    publishedAt,
    onCount: (onRows ?? []).length,
    offCount: (offRows ?? []).length,
  };
}
