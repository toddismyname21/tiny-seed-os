/**
 * Campaign audience SEGMENTS — server-computed recipient derivation for the
 * retention layer (Phase 2 Wave 2, 2026-07-05).
 *
 * The base campaign audience model (lib/campaign.ts) resolves recipients by
 * `share_type` + `newsletter_opt_in`. This module adds two SEASON-DERIVED
 * segments that layer on top of that model:
 *
 *   - `renewal_window`  active members whose controlling season is within N
 *                       delivery weeks of its end (default from
 *                       portal_settings.renewal_weeks_threshold). This REUSES
 *                       the exact weeks-remaining formula the dashboard's
 *                       renewal banner uses (dashboard.astro §RENEWAL BANNER:
 *                       `controllingSchedule.totalWeeks - currentWeekNumber + 1`)
 *                       — extracted here as `weeksRemainingInSeason` so the two
 *                       surfaces share ONE implementation and can never drift.
 *
 *   - `lapsed`          customers who WERE members but currently have NO active
 *                       share — the win-back pool. Precise definition documented
 *                       on `resolveLapsedRaw` below.
 *
 * ── SINGLE SOURCE OF TRUTH ────────────────────────────────────────────────
 *   Both resolvers here return recipients BEFORE test-account excludes. The
 *   caller (lib/campaign.ts `resolveRecipientsRaw`) applies TEST_EXCLUDES as a
 *   shared final step, so the live recipient COUNT and the actual SEND run
 *   through exactly one function per segment — no divergence between what the
 *   picker previews and what gets mailed.
 *
 * This module is server-only (SupabaseClient<Database>). Type-only imports from
 * ./campaign keep the dependency edge one-directional at runtime (campaign.ts
 * imports the VALUES here; this file imports only TYPES from campaign.ts).
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';
import type { ResolvedRecipient } from './campaign';
import {
  getSchedule,
  seasonPhase,
  currentWeekNumber,
  type SeasonSchedule,
} from './season';

// ─────────────────────────────────────────────────────────────────────
// Segment kinds
// ─────────────────────────────────────────────────────────────────────

/**
 * The audience-selection modes a campaign can use.
 *   - 'active'          the legacy model: share_types + newsletter_opt_in.
 *   - 'renewal_window'  active members ≤N weeks from season end.
 *   - 'lapsed'          former members with no active share (win-back).
 */
export const SEGMENT_KINDS = ['active', 'renewal_window', 'lapsed'] as const;
export type SegmentKind = (typeof SEGMENT_KINDS)[number];

/** Default weeks-left threshold when portal_settings has none / it's unparsable. */
export const DEFAULT_RENEWAL_WEEKS_THRESHOLD = 4;

/**
 * Stable template names (campaign_templates.name is UNIQUE — migration 0034).
 * Seeded by migration 0071 and referenced by the renewal/win-back playbook
 * cards on /admin/campaigns to deep-link into the composer
 * (`/admin/campaigns/new?template=<name>`). KEEP IN SYNC with the seed names in
 * migration 0071 — the names ARE the join key.
 */
export const RENEWAL_TEMPLATE_NAMES = {
  earlyBird: 'Renewal — Early bird',
  reminder: 'Renewal — Reminder',
  lastCall: 'Renewal — Last call',
} as const;

export const WINBACK_TEMPLATE_NAMES = {
  whatsGrowing: "Win-back — What's growing now",
  savedSpot: 'Win-back — We saved you a spot',
  finalNote: 'Win-back — Final note',
} as const;

// ─────────────────────────────────────────────────────────────────────
// Season-derived weeks-left (the ONE implementation dashboard + campaigns share)
// ─────────────────────────────────────────────────────────────────────

/**
 * Delivery weeks remaining in a season, INCLUSIVE of the current delivery week
 * (so the final week = 1). This is the canonical extraction of the dashboard
 * renewal-banner formula:
 *
 *   weeksRemainingInSeason = totalWeeks - currentWeekNumber + 1
 *
 * Only meaningful in the 'active' phase — callers gate on `seasonPhase` first.
 * Pure; no DB. (dashboard.astro currently inlines the same arithmetic; once its
 * Phase-2-W1 lock releases it should import THIS helper so the two can't drift.)
 */
export function weeksRemainingInSeason(
  schedule: SeasonSchedule,
  now: Date = new Date()
): number {
  return schedule.totalWeeks - currentWeekNumber(schedule, now) + 1;
}

/**
 * Among a set of share types, the CONTROLLING schedule: the one that HAS a
 * configured season and the EARLIEST firstDelivery. Mirrors the dashboard's
 * controlling-schedule pick (dashboard.astro §Season awareness). Returns null
 * when none of the shares has a configured season (flex / add_on / fall_veg).
 */
export function controllingScheduleForShares(
  shareTypes: Iterable<string>
): SeasonSchedule | null {
  let controlling: SeasonSchedule | null = null;
  for (const st of shareTypes) {
    const sched = getSchedule(st);
    if (!sched) continue;
    if (!controlling || sched.firstDelivery < controlling.firstDelivery) {
      controlling = sched;
    }
  }
  return controlling;
}

/** Local first-name heuristic (kept in-file to avoid a runtime import cycle
 *  with lib/campaign.ts's `firstName`; identical behavior). */
function firstNameOf(contactName: string | null | undefined): string {
  const raw = (contactName ?? '').trim();
  if (!raw) return 'there';
  return raw.split(/\s+/)[0] || 'there';
}

// ─────────────────────────────────────────────────────────────────────
// Renewal-window resolver
// ─────────────────────────────────────────────────────────────────────

export interface RenewalWindowOptions {
  /** Respect member_preferences.newsletter_opt_in (recommended default true). */
  newsletterOptIn: boolean;
  /** Include customers whose weeks-remaining is ≤ this value. */
  weeksThreshold: number;
  /** Test seam. */
  now?: Date;
}

/**
 * Active members whose controlling season is within `weeksThreshold` delivery
 * weeks of its end. PRE-exclude (caller applies TEST_EXCLUDES).
 *
 * Logic (mirrors the dashboard renewal banner exactly):
 *   1. Pull active members (respecting newsletter_opt_in when required), joined
 *      to their customer. De-dupe by customer, collecting every active
 *      share_type the customer holds.
 *   2. Pick the customer's controlling schedule (earliest configured season).
 *      No configured season → NOT a renewal-window candidate (flex/add_on only).
 *   3. Only in the season's 'active' phase (before → they just joined; complete
 *      → the "that's a wrap" touchpoint owns them).
 *   4. Include when weeksRemainingInSeason ≤ weeksThreshold.
 *
 * One email per customer — a multi-share household is returned once.
 */
export async function resolveRenewalWindowRaw(
  supabase: SupabaseClient<Database>,
  opts: RenewalWindowOptions
): Promise<ResolvedRecipient[]> {
  const now = opts.now ?? new Date();

  type MemberShape = {
    status: string;
    share_type: string;
    customer: {
      id: string;
      email: string;
      contact_name: string;
      is_active: boolean;
    } | null;
  };

  let members: MemberShape[] = [];

  if (opts.newsletterOptIn) {
    const { data, error } = await supabase
      .from('member_preferences')
      .select(
        `member:members!inner(
           status,
           share_type,
           customer:customers!inner(id, email, contact_name, is_active)
         )`
      )
      .eq('newsletter_opt_in', true)
      .overrideTypes<Array<{ member: MemberShape | null }>, { merge: false }>();
    if (error) {
      console.error('[campaign-segments] renewal (opt-in) failed:', error.message);
      return [];
    }
    members = (data ?? [])
      .map((r) => r.member)
      .filter((m): m is MemberShape => m != null);
  } else {
    const { data, error } = await supabase
      .from('members')
      .select(
        `status,
         share_type,
         customer:customers!inner(id, email, contact_name, is_active)`
      )
      .overrideTypes<MemberShape[], { merge: false }>();
    if (error) {
      console.error('[campaign-segments] renewal (all) failed:', error.message);
      return [];
    }
    members = data ?? [];
  }

  // De-dupe by customer; collect that customer's active share types.
  const byCustomer = new Map<
    string,
    { email: string; name: string; shares: Set<string> }
  >();
  for (const m of members) {
    if (m.status !== 'active') continue;
    const c = m.customer;
    if (!c) continue;
    if (c.is_active === false) continue;
    const email = (c.email ?? '').trim().toLowerCase();
    if (!email) continue;
    const entry =
      byCustomer.get(c.id) ?? { email, name: c.contact_name, shares: new Set<string>() };
    entry.shares.add(m.share_type);
    byCustomer.set(c.id, entry);
  }

  const out: ResolvedRecipient[] = [];
  for (const [customer_id, e] of byCustomer) {
    const controlling = controllingScheduleForShares(e.shares);
    if (!controlling) continue; // no season → not a renewal candidate
    if (seasonPhase(controlling, now) !== 'active') continue; // active phase only
    const weeksLeft = weeksRemainingInSeason(controlling, now);
    if (weeksLeft > opts.weeksThreshold) continue;
    out.push({ customer_id, email: e.email, first_name: firstNameOf(e.name) });
  }
  return out.sort((a, b) => a.email.localeCompare(b.email));
}

// ─────────────────────────────────────────────────────────────────────
// Lapsed resolver (win-back pool)
// ─────────────────────────────────────────────────────────────────────

/** Member statuses that, ON THEIR OWN, mark a prior membership as lapsed. */
const LAPSED_STATUSES: ReadonlySet<string> = new Set([
  'lapsed',
  'expired',
  'inactive',
  'cancelled',
]);

/**
 * LAPSED customers — the win-back pool. PRE-exclude (caller applies TEST_EXCLUDES).
 *
 * ── DEFINITION (documented per spec; season-derived, not a single column) ──
 * A customer is LAPSED when ALL of the following hold:
 *
 *   (1) HAS a lapse signal — at least one members row that is EITHER:
 *         (a) status IN ('lapsed','expired','inactive','cancelled'), OR
 *         (b) status='active' but its share's SEASON is 'complete' (season-derived
 *             via season.ts seasonPhase). Covers migrated members whose row was
 *             never flipped out of 'active' after the season ended — e.g. a
 *             spring_veg-only member after 2026-05-27.
 *
 *   (2) HAS NO active share NOW — no members row that is status='active' AND
 *         (has no configured season OR its season is not yet 'complete'). A
 *         summer_veg member (season runs to Oct 7) or a flex member (no season,
 *         active=active) is therefore NEVER lapsed.
 *
 *   (3) NOT unsubscribed — none of the customer's member_preferences rows has
 *         newsletter_opt_in=false. (The one-click unsubscribe RPC sets every one
 *         of a customer's member rows to false, so "any false" == opted out.)
 *         MISSING preferences → treated as opted-IN (most migrated lapsed members
 *         have no preferences row; CAN-SPAM win-back to a former customer who has
 *         not opted out is permitted, and every send carries a one-click
 *         unsubscribe).
 *
 * Customers with only forward-looking statuses ('pending'/'onboarding') and no
 * lapse signal are NOT included (they never had a completed membership to win
 * back). One email per customer.
 */
export async function resolveLapsedRaw(
  supabase: SupabaseClient<Database>,
  now: Date = new Date()
): Promise<ResolvedRecipient[]> {
  type MemberRow = {
    id: string;
    customer_id: string;
    share_type: string;
    status: string;
    customer: { id: string; email: string; contact_name: string } | null;
  };

  const { data: memberData, error: mErr } = await supabase
    .from('members')
    .select('id, customer_id, share_type, status, customer:customers!inner(id, email, contact_name)')
    .overrideTypes<MemberRow[], { merge: false }>();
  if (mErr) {
    console.error('[campaign-segments] lapsed members fetch failed:', mErr.message);
    return [];
  }
  const members = memberData ?? [];

  // Opt-out detection: member_preferences.newsletter_opt_in=false on ANY row.
  const { data: prefData, error: pErr } = await supabase
    .from('member_preferences')
    .select('member_id, newsletter_opt_in');
  if (pErr) {
    console.error('[campaign-segments] lapsed prefs fetch failed:', pErr.message);
    return [];
  }
  const optedOutMembers = new Set<string>();
  for (const p of prefData ?? []) {
    if (p.newsletter_opt_in === false) optedOutMembers.add(p.member_id);
  }

  type Agg = {
    email: string;
    name: string;
    hasActiveNow: boolean;
    hasLapseSignal: boolean;
    optedOut: boolean;
  };
  const byCustomer = new Map<string, Agg>();

  for (const m of members) {
    const c = m.customer;
    if (!c) continue;
    const email = (c.email ?? '').trim().toLowerCase();
    if (!email) continue;

    const agg =
      byCustomer.get(m.customer_id) ??
      { email, name: c.contact_name, hasActiveNow: false, hasLapseSignal: false, optedOut: false };

    const sched = getSchedule(m.share_type);
    const seasonComplete = sched ? seasonPhase(sched, now) === 'complete' : false;

    // (2) active NOW = status active AND (no season OR season not complete).
    if (m.status === 'active' && !seasonComplete) agg.hasActiveNow = true;

    // (1) lapse signal = terminal status OR (active but season complete).
    if (LAPSED_STATUSES.has(m.status) || (m.status === 'active' && seasonComplete)) {
      agg.hasLapseSignal = true;
    }

    // (3) opt-out on any of the customer's member rows.
    if (optedOutMembers.has(m.id)) agg.optedOut = true;

    byCustomer.set(m.customer_id, agg);
  }

  const out: ResolvedRecipient[] = [];
  for (const [customer_id, a] of byCustomer) {
    if (a.hasActiveNow) continue; // currently active → not lapsed
    if (!a.hasLapseSignal) continue; // never completed a membership → skip
    if (a.optedOut) continue; // respect unsubscribe
    out.push({ customer_id, email: a.email, first_name: firstNameOf(a.name) });
  }
  return out.sort((a, b) => a.email.localeCompare(b.email));
}
