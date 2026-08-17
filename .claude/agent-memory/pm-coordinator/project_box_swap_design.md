---
name: box-swap-design
description: The CONFIRMED box-swap ritual design (Todd 2026-06-18) — menu = Flex availability, 2 free swaps/week then charge Flex balance. Plus what's already built vs dormant.
metadata:
  type: project
---

**Box-swap ritual — CONFIRMED design (Todd 2026-06-18).** The benchmark's #1 retention gap; it's the feature that lets members swap items they won't eat for ones they will, with a do-nothing-default fallback.

**The model Todd chose (practical, no per-item pairs):**
- **Swap menu = the weekly Flex availability list.** No "X swaps for Y" pairs to maintain (Todd rejected that — "everything changes all the time"). A member swaps any box item OUT and swaps IN anything available this week. The available list = the Flex catalog items toggled ON (the ghost-toggle list Todd already maintains weekly). ZERO extra weekly curation.
- **2 free swaps/week**, 1-for-1. After the 2 free, additional swaps/adds = **charged to the member's Flex balance** (store credit — the existing Flex system). So box-swap + Flex become ONE system: 2 free, then it's Flex. If balance is empty → block the extra for now; card-overage is Phase 2 (already on the CSA_TODO list).
- **Cutoff: Tuesday 8 AM ET** (same as Flex). Do nothing = default box.

**What's already BUILT (dormant, 2026-06-18 audit):**
- Member page `/box` (`pages/box/index.astro`): renders this week's box per share type, per-item swap buttons → bottom-sheet picker → confirm; Tue 8AM cutoff banner. **Uses the per-item-pairs model** (`box_contents.is_swappable` + `swap_options`) + `box_swaps`.
- `pages/api/box/swap.ts` + `swap-undo.ts`: swap endpoints (validate swappable + allowed option + cutoff + idempotent; swap_credits aware).
- Admin `admin/box-contents.astro` + `admin/box-plan/` to publish the box.
- **Two competing data models:** Model A (LIVE on /box) = `box_contents` per-item pairs. Model B (scaffolding, unused) = `weekly_swap_menu` (a pool: side/item/qty) + `box_swap_events` (member, swap_out_item, swap_in_item, **credits_used**, status, locked_at). **Todd's design matches Model B** (menu + credits) → build on B, retire A's pairs.
- **Why dormant:** all box-plan tables empty (0 rows) — no week's box ever published into `box_contents`. It's a switch never flipped, not a from-scratch build.

**Build plan:** (1) publish weekly box into box_contents; (2) make /box swap pull the swap-IN options from the Flex availability menu (not per-item swap_options); (3) free-swap counter (2/wk) then deduct Flex balance via the existing Flex order/credit path; (4) verify live end-to-end before activating. Related: [[flex-portal-state]], [[csa-flex-store-credit]], [[csa-flex-ordering-build]].
