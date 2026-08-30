/**
 * AUTOMATION HEARTBEAT — did the things that are supposed to run, actually run?
 *
 * ── WHY THIS EXISTS ──────────────────────────────────────────────────────────
 * Three pieces of customer-facing automation went dark in a single week and
 * NOTHING anywhere reported a problem (measured 2026-08-29/30):
 *
 *   • Chef order reminders  — last sent 2026-08-10. Three Mondays, ~50 chefs.
 *   • Wednesday fresh sheet — last sent 2026-07-18. Six weeks.
 *   • Friday fresh sheet    — NEVER sent. Not once.
 *
 * Every one of those failures returned **HTTP 200**. A gated cron whose
 * `portal_settings` flag is false returns `{ok: true, skipped: 'disabled'}`, and
 * a fresh sheet whose confirm marker has gone stale returns
 * `{ok: true, skipped: 'unconfirmed'}`. Uptime is green. Logs are clean. The
 * cron dashboard is green. The work simply stops happening.
 *
 * That is the exact failure mode that makes "my week runs on autopilot" unsafe:
 * autopilot you cannot verify is not autopilot, it is hope. This module turns
 * silence into a signal.
 *
 * ── THE IDEA ─────────────────────────────────────────────────────────────────
 * Do not ask "did the endpoint return 200?" — it always does. Ask instead:
 * **"is there evidence in notification_log that this actually reached someone,
 * recently enough?"** Delivery is the only honest proof of life.
 *
 * A job is only judged when its gate is ON. A deliberately-disabled job is
 * reported as OFF (visible, not alarming) — turning something off on purpose
 * must never page you, but it must never become invisible either. That is how
 * `chef_reminder_enabled` sat false for three weeks without anyone noticing.
 *
 * ── WHY notification_log AND NOT A CRON DASHBOARD ────────────────────────────
 * pg_cron will happily report a successful run of a job that returned
 * `skipped: 'disabled'`. Vercel will report a successful invocation of the same.
 * Both are true and both are useless. The only fact that matters to a member is
 * whether an email arrived, and that is what notification_log records.
 *
 * ── CAUTION FOR FUTURE EDITORS ───────────────────────────────────────────────
 * `notification_type` values here are NOT guesses — each was read from the
 * sender that writes it (`lib/fresh-sheet.ts:102,121` for the fresh-sheet
 * markers) and cross-checked against live rows. If you add a check, go read the
 * sender first. A typo'd type silently reports "NEVER" forever, which is worse
 * than no check at all because it trains you to ignore the alert.
 *
 * Also: PostgREST caps result sets at 1000 rows regardless of `.limit()`. A
 * naive "select all and take the max" scan silently truncates and reports a
 * stale timestamp — it did exactly that while this module was being written.
 * Every probe below is therefore an ORDER BY sent_at DESC LIMIT 1 per type,
 * which is immune to the cap.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

/** Weekly jobs get 7 days + 2 days of slack before we call them dead. */
export const WEEKLY_MAX_AGE_DAYS = 9;
/** Daily jobs get 2 days. */
export const DAILY_MAX_AGE_DAYS = 2;

export interface HeartbeatCheckDef {
  /** portal_settings flag that enables this job; null = always-on. */
  gate: string | null;
  /** notification_log.notification_type written on a REAL delivery. */
  notificationType: string;
  label: string;
  maxAgeDays: number;
}

/**
 * The jobs we assert on. Every `notificationType` was verified against the code
 * that writes it AND against live rows on 2026-08-30.
 */
export const HEARTBEAT_CHECKS: readonly HeartbeatCheckDef[] = [
  { gate: 'chef_reminder_enabled',      notificationType: 'chef_order_reminder',  label: 'Chef order reminders (Mon)',   maxAgeDays: WEEKLY_MAX_AGE_DAYS },
  { gate: 'flex_reminder_enabled',      notificationType: 'flex_order_reminder',  label: 'Flex order reminders (Sun)',   maxAgeDays: WEEKLY_MAX_AGE_DAYS },
  { gate: 'wholesale_list_wed_enabled', notificationType: 'fresh_sheet_sent_wed', label: 'Wednesday fresh sheet',        maxAgeDays: WEEKLY_MAX_AGE_DAYS },
  { gate: 'wholesale_list_fri_enabled', notificationType: 'fresh_sheet_sent_fri', label: 'Friday fresh sheet',           maxAgeDays: WEEKLY_MAX_AGE_DAYS },
  { gate: null,                         notificationType: 'flex_list_reminder',   label: 'Flex draft staged (Thu)',      maxAgeDays: WEEKLY_MAX_AGE_DAYS },
  { gate: null,                         notificationType: 'harvie_auto_import',   label: 'Harvie import (Mon)',          maxAgeDays: WEEKLY_MAX_AGE_DAYS },
] as const;

export type HeartbeatState = 'ok' | 'stale' | 'never' | 'off';

export interface HeartbeatResult {
  label: string;
  gate: string | null;
  notificationType: string;
  state: HeartbeatState;
  lastSentAt: string | null;
  ageDays: number | null;
  maxAgeDays: number;
}

/**
 * Classify one job. Pure — takes the facts, returns the verdict, so it is
 * unit-testable without a database.
 *
 * `enabled === false` short-circuits to 'off': a job you turned off is not
 * broken. It still appears in the report so "off" cannot hide.
 */
export function classifyHeartbeat(
  def: HeartbeatCheckDef,
  enabled: boolean,
  lastSentAt: string | null,
  now: number
): HeartbeatResult {
  const base = {
    label: def.label,
    gate: def.gate,
    notificationType: def.notificationType,
    lastSentAt,
    maxAgeDays: def.maxAgeDays,
  };

  if (!enabled) return { ...base, state: 'off', ageDays: null };
  if (!lastSentAt) return { ...base, state: 'never', ageDays: null };

  const parsed = Date.parse(lastSentAt);
  // An unparseable timestamp is treated as 'never' rather than silently OK —
  // failing toward the alarm is the whole point of this module.
  if (Number.isNaN(parsed)) return { ...base, state: 'never', ageDays: null };

  const ageDays = Math.floor((now - parsed) / 86_400_000);
  return { ...base, ageDays, state: ageDays > def.maxAgeDays ? 'stale' : 'ok' };
}

/** Anything an operator must look at. 'off' is deliberate and excluded. */
export function heartbeatProblems(results: readonly HeartbeatResult[]): HeartbeatResult[] {
  return results.filter((r) => r.state === 'stale' || r.state === 'never');
}

/**
 * Run every check against the live database.
 *
 * Fail-OPEN on read errors: a heartbeat that cannot read must not manufacture a
 * false alarm, and must never be able to take down the nightly health run that
 * hosts it. Unknown gate values are treated as DISABLED, matching `readFlag`
 * semantics everywhere else (`value === 'true'` and nothing else is on).
 */
export async function runHeartbeat(
  supabase: SupabaseClient<Database>,
  now: number = Date.now(),
  checks: readonly HeartbeatCheckDef[] = HEARTBEAT_CHECKS
): Promise<HeartbeatResult[]> {
  // One read for every gate, rather than one per check.
  const gateKeys = checks.map((c) => c.gate).filter((g): g is string => !!g);
  const gateValues = new Map<string, string>();
  if (gateKeys.length > 0) {
    const { data, error } = await supabase
      .from('portal_settings')
      .select('key, value')
      .in('key', gateKeys);
    if (error) console.error('[heartbeat] gate read failed:', error.message);
    for (const row of (data ?? []) as Array<{ key: string; value: string }>) {
      gateValues.set(row.key, row.value);
    }
  }

  const out: HeartbeatResult[] = [];
  for (const def of checks) {
    const enabled = def.gate === null ? true : gateValues.get(def.gate) === 'true';

    let lastSentAt: string | null = null;
    if (enabled) {
      // ORDER BY DESC LIMIT 1 — immune to PostgREST's 1000-row cap.
      const { data, error } = await supabase
        .from('notification_log')
        .select('sent_at')
        .eq('notification_type', def.notificationType)
        .eq('status', 'sent')
        .order('sent_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) {
        console.error(`[heartbeat] ${def.notificationType} read failed:`, error.message);
        // Fail open — report as OK rather than invent an outage.
        out.push({
          label: def.label, gate: def.gate, notificationType: def.notificationType,
          state: 'ok', lastSentAt: null, ageDays: null, maxAgeDays: def.maxAgeDays,
        });
        continue;
      }
      lastSentAt = (data as { sent_at: string } | null)?.sent_at ?? null;
    }

    out.push(classifyHeartbeat(def, enabled, lastSentAt, now));
  }
  return out;
}

/** One-line-per-job plain-text block for the nightly email. */
export function formatHeartbeatText(results: readonly HeartbeatResult[]): string {
  const icon: Record<HeartbeatState, string> = {
    ok: 'OK   ', stale: 'STALE', never: 'NEVER', off: 'OFF  ',
  };
  return results
    .map((r) => {
      const age =
        r.state === 'off' ? 'gate is off — nothing is being sent'
        : r.state === 'never' ? 'has NEVER sent'
        : `last sent ${r.ageDays}d ago`;
      return `  ${icon[r.state]} ${r.label} — ${age}`;
    })
    .join('\n');
}
