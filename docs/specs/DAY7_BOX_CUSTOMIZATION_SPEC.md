# Day 7 Spec — Box Customization + Swaps

**Status:** DRAFT — ready to dispatch to fullstack-builder when Day 6 ships
**Dependency:** Day 5 auth + Day 6 onboarding must be live
**Plan reference:** `docs/CSA_MIGRATION_PLAN_2026.md` Day 7

---

## Goal

Logged-in members can view this week's box contents and **swap individual items** for alternatives. Swaps decrement their `swap_credits` and persist to the `box_swaps` table. The dashboard reflects swaps immediately (optimistic update + revalidation).

## User Story

> "It's Tuesday. My CSA box is delivered tomorrow. I just got an email preview and I see kohlrabi in the box — I never use kohlrabi. I open `csa.tinyseedfarm.com` on my phone, tap on this week's box, tap kohlrabi → see 'spinach, lettuce, arugula' as swap options → tap spinach → done. I have 3 swap credits left for the season."

## Architecture

### New page: `/box`

The "this week's box" page. Linked from the dashboard. Shows:
- Header: "Your box for Wednesday, May 13"
- Banner: swap credits remaining ("3 of 5 left this season")
- List of items, each as a card:
  - Product name + variety + quantity + unit
  - If `is_swappable` AND `swap_options.length > 0`: a "Swap this" button
  - If swap was already made: "Swapped for {new_item}" badge + "Undo" button
- Footer: "Customization closes Wednesday at 8 AM. After that, the box ships as shown."

### Swap flow

1. Tap "Swap this" → opens a bottom sheet (mobile) / modal (desktop)
2. Sheet shows the swap options as a vertical list of cards (each with product name + variety)
3. Tap an option → confirm modal: "Swap [original] for [chosen]?"
4. Confirm → POST `/api/box/swap` with `{week_date, original_item, swapped_for}`
5. Server validates:
   - User is authenticated
   - Member has `swap_credits >= 1`
   - Original item is in this week's box for their share_type
   - Original item has `is_swappable=true`
   - Chosen item is in the original item's `swap_options` array
   - No prior swap for this `(member_id, week_date, original_item)` (idempotency — UNIQUE constraint already in `box_swaps`)
6. On success:
   - INSERT into `box_swaps`
   - DECREMENT `members.swap_credits` (single transaction)
   - Return `200 { ok: true, remaining_credits: N }`
7. Client shows success state, updates the badge

### Undo flow

1. Tap "Undo" on a swapped item
2. Confirm modal
3. POST `/api/box/swap/undo` with `{week_date, original_item}`
4. Server: DELETE the swap row, INCREMENT credits back. Same transaction.
5. Idempotent: returns 200 even if already undone.

### Cutoff enforcement

- Customization closes at 8 AM local time the day of the box delivery
- Server enforces this — POST returns 403 with `{ error: 'cutoff_passed' }` after cutoff
- Client shows a read-only view + grays out swap buttons after cutoff

## Components to extract

This is where we start the component library Todd approved:

```
apps/csa-portal/src/components/
  Button.astro
  Card.astro
  BottomSheet.astro       (mobile-first modal-equivalent)
  Modal.astro             (desktop overlay)
  Badge.astro             (status pills)
  EmptyState.astro
  ItemCard.astro          (specific to box items — reuse on /dashboard too)
```

These should be small (30-100 lines each), pure Astro, no JS unless interactivity required.

## Database transactions

Use a Postgres function for the swap to ensure atomicity:

```sql
CREATE OR REPLACE FUNCTION public.swap_box_item(
  p_member_id UUID,
  p_week_date DATE,
  p_original_item TEXT,
  p_swapped_for TEXT
) RETURNS json
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_credits INT;
  v_swap_id UUID;
BEGIN
  -- Lock the member row to prevent concurrent swaps double-spending credits
  SELECT swap_credits INTO v_credits FROM members WHERE id = p_member_id FOR UPDATE;

  IF v_credits IS NULL THEN
    RETURN json_build_object('error', 'member_not_found');
  END IF;
  IF v_credits < 1 THEN
    RETURN json_build_object('error', 'no_credits');
  END IF;

  -- Insert swap (UNIQUE constraint on (member_id, week_date, original_item) prevents double-swap)
  INSERT INTO box_swaps (member_id, week_date, original_item, swapped_for)
  VALUES (p_member_id, p_week_date, p_original_item, p_swapped_for)
  RETURNING id INTO v_swap_id;

  -- Decrement credits
  UPDATE members SET swap_credits = swap_credits - 1 WHERE id = p_member_id;

  RETURN json_build_object('ok', true, 'swap_id', v_swap_id, 'remaining_credits', v_credits - 1);
EXCEPTION
  WHEN unique_violation THEN
    RETURN json_build_object('error', 'already_swapped');
END;
$$;
```

This becomes migration `0015_swap_box_item_function.sql`.

## Verification gates

```bash
# Gate 1: Build clean
npm run build && npx astro check

# Gate 2: Files exist
for f in src/pages/box/index.astro \
         src/pages/api/box/swap.ts \
         src/pages/api/box/swap-undo.ts \
         src/components/{Button,Card,BottomSheet,Badge,ItemCard}.astro \
         supabase/migrations/0015_swap_box_item_function.sql; do
  test -f "$f" && echo "✓ $f" || echo "✗ $f"
done

# Gate 3: Migration applied to Supabase
# Should see swap_box_item function in pg_proc

# Gate 4: Live integration test (with seeded test member having swap_credits=5):
# - GET /box returns box contents + swap UI
# - POST /api/box/swap with valid swap → 200, credits decrement
# - POST /api/box/swap with already-swapped item → 409 idempotency
# - POST /api/box/swap when credits=0 → 402 no_credits
# - POST /api/box/swap after cutoff → 403 cutoff_passed
# - DELETE/swap-undo → credits increment back

# Gate 5: Race condition test
# Two simultaneous swaps for the same member should not double-spend credits
# (Postgres FOR UPDATE lock in the function handles this)
```

## Out of scope for Day 7

- ❌ Adding extra items beyond the standard box (Day 8 — preferences UI)
- ❌ Vacation holds (Day 8)
- ❌ Email preview of upcoming box (Day 10)
- ❌ Multi-week swaps / "always swap kohlrabi for me" (Phase 4 / auto-optimize toggle)

## Edge cases to handle

| Case | Handling |
|---|---|
| Member with 0 credits | Show swap buttons disabled with tooltip "Out of swap credits this season" |
| Member has no active member row (rare) | Redirect to /dashboard with banner |
| Member has TWO active member rows (possible — Spring + Add-On + Flower) | Tabs at top of /box: "Vegetable share | Flower share | Add-on" — each tab shows its own box |
| Box not yet posted for the upcoming week | "This week's box hasn't been published yet — check back Monday morning." |
| Item has `is_swappable=false` | No swap button, just show item normally |
| Item has `is_swappable=true` but `swap_options=[]` | "Sorry, no swaps available for this item this week" |

## Mobile-first notes

- Bottom sheet for swap selection (slides up from bottom on mobile, more thumb-reachable than a top modal)
- Swap option cards should be full-width on mobile, 2-column on tablet+, 3-column on desktop
- Confirmation modal is a centered modal on desktop, full-screen overlay on mobile
- All buttons min 44px tap target
- No hover-only interactions (mobile users can't hover)

## Accessibility

- Bottom sheet/modal: focus trap, escape to close, aria-modal, aria-labelledby
- Swap buttons: aria-label "Swap kohlrabi"
- Confirmation modal: focus the cancel button by default (safer)
- Status changes (swap success): aria-live="polite" announcement
