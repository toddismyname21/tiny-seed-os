/**
 * Add-on share display labels (member-facing).
 *
 * Members can subscribe to non-vegetable "add-on" shares — Cheese,
 * Mushroom, Bread, Coffee, Eggs — alongside (or instead of) a veg share.
 * In the `members` table these are all stored as `share_type='add_on'`
 * with NO column carrying the specific add-on type: the only signal is a
 * free-text breadcrumb in `members.notes`, written by the CSA migration /
 * Shopify sync from the original Shopify product title, e.g.:
 *
 *   "...2026 Mushroom CSA Add-On..."
 *   "...Local Cheese CSA Add-On 2026..."
 *   "Local Bread Add-On"
 *   "Coffee Add-On 2026"
 *
 * Without this helper every add-on row renders as the generic
 * SHARE_TYPE_LABELS['add_on'] = "Add-On", so a member with two add-ons
 * (e.g. Cheese + Mushroom) sees two identical "Add-On" rows and can't
 * tell them apart. We derive a clean, specific label from the notes.
 *
 * SINGLE SOURCE OF TRUTH: the actual keyword → type matching lives in
 * `deriveAddon` (lib/cycle.ts), which the admin pack/manifest logic
 * already uses. We delegate to it so the member-facing label and the
 * admin-facing add-on classification can never drift apart; this module
 * only maps the typed result onto a human label.
 */
import { deriveAddon, type AddOnType } from './cycle';

/** The label shown when the add-on type can't be derived from notes. */
export const GENERIC_ADD_ON_LABEL = 'Add-On';

/** Member-facing label per derived add-on type. `unknown` → generic. */
const ADD_ON_TYPE_LABELS: Record<Exclude<AddOnType, 'unknown'>, string> = {
  mushroom: 'Mushroom add-on',
  cheese: 'Cheese add-on',
  bread: 'Bread add-on',
  coffee: 'Coffee add-on',
  eggs: 'Egg add-on',
};

/**
 * Derive a clean, member-facing add-on label from a `members.notes`
 * string (case-insensitive, via deriveAddon). Returns e.g. "Cheese
 * add-on" / "Mushroom add-on", or the generic "Add-On" when notes is
 * empty/null or names no known add-on type.
 *
 * Never throws; treats null/undefined/whitespace as "unknown".
 */
export function addOnLabel(notes: string | null | undefined): string {
  const { type } = deriveAddon(notes);
  if (type === 'unknown') return GENERIC_ADD_ON_LABEL;
  return ADD_ON_TYPE_LABELS[type];
}

/**
 * Resolve the display label for ANY share, special-casing add-ons.
 *
 * For `share_type='add_on'` we derive the specific add-on name from
 * `notes`; for every other share type we fall back to the caller-supplied
 * `baseLabel` (the page's SHARE_TYPE_LABELS lookup). This lets a page do:
 *
 *   shareDisplayLabel(share.share_type, share.notes,
 *     SHARE_TYPE_LABELS[share.share_type] ?? share.share_type)
 *
 * and get "Cheese add-on" for add-ons + "Summer Vegetable Share" for veg
 * with one call.
 */
export function shareDisplayLabel(
  shareType: string,
  notes: string | null | undefined,
  baseLabel: string,
): string {
  if (shareType === 'add_on') return addOnLabel(notes);
  return baseLabel;
}
