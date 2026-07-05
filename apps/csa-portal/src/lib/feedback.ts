/**
 * Post-pickup micro-survey — HMAC token, link builder, and shared types.
 *
 * PHASE 2 · WAVE 1 (gap 6 / proposal 2.3). The weekly email embeds a
 * per-(customer, week) link `/feedback/<token>`; tapping it lets a member rate
 * their box 1–4 (+ optional comment) with NO login. The token IS the access —
 * it mirrors the one-click unsubscribe model EXACTLY (lib/weekly-email.ts
 * signUnsubscribeToken / verifyUnsubscribeToken): a `<b64url(payload)>.<b64url(
 * HMAC-SHA256(payload, secret))>` string, verified constant-time server-side.
 *
 * PAYLOAD: `${customerId}:${weekDate}` where weekDate is the cycle MONDAY
 * (YYYY-MM-DD) the box was for. The verifier returns the parsed pair (or null)
 * so the submit endpoint knows exactly which (customer, week) the rating is for
 * — the same pair the box_feedback UNIQUE(week_date, customer_id) upserts on.
 *
 * SECRET: callers resolve `FEEDBACK_SECRET || UNSUBSCRIBE_SECRET` (a DISTINCT
 * secret is preferred so rotating feedback links never invalidates unsubscribe
 * links, but we fall back gracefully to the already-provisioned unsubscribe
 * secret so the feature works before a separate secret is wired). This module
 * stays env-free (takes `secret` as a param) exactly like weekly-email.ts, so
 * it's unit-testable without astro:env.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';

/** Base URL of the portal (matches lib/weekly-email.ts PORTAL_BASE_URL). */
export const PORTAL_BASE_URL = 'https://csa.tinyseedfarm.com';

/** The four tap targets, in ascending order. Shared by the public page +
 *  the admin distribution view so the emoji/label never drift. */
export const FEEDBACK_RATINGS = [
  { value: 1, emoji: '😞', label: 'Not great' },
  { value: 2, emoji: '😐', label: 'Okay' },
  { value: 3, emoji: '🙂', label: 'Good' },
  { value: 4, emoji: '😍', label: 'Loved it' },
] as const;

export type FeedbackRating = 1 | 2 | 3 | 4;

/** Parsed token payload. */
export interface FeedbackTokenData {
  customerId: string;
  weekDate: string; // YYYY-MM-DD (cycle Monday)
}

// ── URL-safe base64 (RFC 4648 §5), no padding — identical to weekly-email.ts ──
function b64urlEncode(input: Buffer | string): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function b64urlDecode(input: string): Buffer {
  const pad = input.length % 4 === 0 ? '' : '='.repeat(4 - (input.length % 4));
  const std = input.replace(/-/g, '+').replace(/_/g, '/') + pad;
  return Buffer.from(std, 'base64');
}

/**
 * Sign a feedback token for a (customer, week) pair. The token is
 * `<b64url(payload)>.<b64url(HMAC-SHA256(payload, secret))>` where payload is
 * `${customerId}:${weekDate}`.
 */
export function signFeedbackToken(
  customerId: string,
  weekDate: string,
  secret: string
): string {
  const payload = `${customerId}:${weekDate}`;
  const mac = createHmac('sha256', secret).update(payload).digest();
  return `${b64urlEncode(payload)}.${b64urlEncode(mac)}`;
}

/**
 * Verify a feedback token. Returns the parsed { customerId, weekDate } on
 * success, or null on any failure (malformed, bad signature, bad shape).
 * Constant-time MAC comparison via timingSafeEqual.
 */
export function verifyFeedbackToken(
  token: string,
  secret: string
): FeedbackTokenData | null {
  if (!token || typeof token !== 'string') return null;
  const dot = token.indexOf('.');
  if (dot <= 0 || dot === token.length - 1) return null;

  const payloadPart = token.slice(0, dot);
  const macPart = token.slice(dot + 1);

  let payload: string;
  let providedMac: Buffer;
  try {
    payload = b64urlDecode(payloadPart).toString('utf8');
    providedMac = b64urlDecode(macPart);
  } catch {
    return null;
  }

  const expectedMac = createHmac('sha256', secret).update(payload).digest();
  if (providedMac.length !== expectedMac.length) return null;
  if (!timingSafeEqual(providedMac, expectedMac)) return null;

  // payload = customerId:weekDate. customerId is a UUID (no ':'), so split on
  // the FIRST ':' and validate both halves.
  const sep = payload.indexOf(':');
  if (sep <= 0 || sep === payload.length - 1) return null;
  const customerId = payload.slice(0, sep);
  const weekDate = payload.slice(sep + 1);
  if (!/^[0-9a-fA-F-]{36}$/.test(customerId)) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekDate)) return null;

  return { customerId, weekDate };
}

/**
 * Build the absolute post-pickup feedback URL for a (customer, week). Used by
 * the weekly-email send loop to embed a per-member link.
 */
export function makeFeedbackUrl(
  customerId: string,
  weekDate: string,
  secret: string
): string {
  const token = signFeedbackToken(customerId, weekDate, secret);
  return `${PORTAL_BASE_URL}/feedback/${encodeURIComponent(token)}`;
}
