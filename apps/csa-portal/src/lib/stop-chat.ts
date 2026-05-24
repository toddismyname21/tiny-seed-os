/**
 * Stop Notes / by-stop chat helpers (migration 0029, chat Phase 0).
 *
 * Phase 0 is READ-ONLY for members: staff/host post notes per pickup
 * location; members read notes for THEIR stop(s). Spec:
 * docs/specs/CSA_BY_STOP_CHAT_SPEC.md.
 *
 * This module is intentionally small in Phase 0 — types + the display-name
 * derivation (shared by the admin post path and any future member post
 * path) + the role-badge labels the member/admin views render. The heavier
 * write-path glue (profanity filter, rate-limit, member-insert) lands in
 * Phase 1; the spec maps it here so it has a home.
 */
import type { Database } from './database.types';

export type StopMessage = Database['public']['Tables']['stop_messages']['Row'];
export type StopMessageRole = StopMessage['author_role'];

/** Author roles a Phase-0 admin may post AS. (member is Phase-1 only.) */
export const STAFF_POST_ROLES = ['staff', 'host'] as const;
export type StaffPostRole = (typeof STAFF_POST_ROLES)[number];

/** Min/max note length — mirrors the DB CHECK on stop_messages.body. */
export const BODY_MIN = 1;
export const BODY_MAX = 1000;

/** Max stored display name — mirrors the DB CHECK on author_display_name. */
export const DISPLAY_NAME_MAX = 80;

/**
 * Derive the privacy-preserving display name shown to other members at a
 * stop: first name + last initial ("Jane Marie Smith" → "Jane S."). This is
 * the portal's privacy ceiling — the delivery tracker shows a driver's first
 * name only, and the schema warns "never put a last name here", so a stop
 * note must be AT MOST as revealing. We publish the initial (not the full
 * surname) so neighbors can recognize each other for box swaps without the
 * farm publishing full names.
 *
 * Rules:
 *   - "Jane"               → "Jane"           (single token, no initial)
 *   - "Jane Smith"         → "Jane S."
 *   - "Jane Marie Smith"   → "Jane S."        (last token is the surname)
 *   - "  jane   smith  "   → "Jane S."        (trimmed, collapsed, cased)
 *   - "" / whitespace      → "A member"       (never empty — DB requires ≥1)
 *
 * Capitalizes the first letter of the given name + surname initial so a
 * lowercase contact_name (live data is mixed-case) renders cleanly. The
 * result is clamped to DISPLAY_NAME_MAX to respect the column CHECK.
 */
export function memberDisplayName(contactName: string | null | undefined): string {
  const tokens = String(contactName ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (tokens.length === 0) return 'A member';

  const cap = (s: string): string =>
    s.length === 0 ? s : s.charAt(0).toUpperCase() + s.slice(1);

  const first = cap(tokens[0]);
  if (tokens.length === 1) return clampName(first);

  const lastInitial = tokens[tokens.length - 1].charAt(0).toUpperCase();
  return clampName(`${first} ${lastInitial}.`);
}

/** Clamp a display name to the DB CHECK ceiling (defensive — names are short). */
function clampName(name: string): string {
  return name.length > DISPLAY_NAME_MAX ? name.slice(0, DISPLAY_NAME_MAX).trimEnd() : name;
}

/** Human label for the role badge on a message. Members see "Farm"/"Host". */
export const ROLE_BADGE_LABEL: Record<StopMessageRole, string> = {
  staff: 'Farm',
  host: 'Host',
  member: 'Member',
};

/**
 * Format a stop-note timestamp for display. Absolute date + time in
 * America/New_York (the farm's timezone) — notes are durable logistics
 * messages ("gate code changed"), so an absolute "May 24, 2:15 PM" reads
 * better than a decaying "3h ago". Returns '' for an unparseable input.
 */
export function formatNoteTimestamp(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(d);
}
