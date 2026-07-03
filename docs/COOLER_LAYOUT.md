# Cooler & Pallet-Space Layout — Tiny Seed Farm

**Status:** SOURCE OF TRUTH for the cooler/pallet board (not yet built).
**Owner:** Todd. Captured by PM 2026-07-02 from Todd's two hand-drawn maps + notes.
**Purpose:** The physical map the cooler board will be built from — how many pallet spaces, where, blocking/access, and how spaces are assigned.

> Legend: ✅ = confirmed by Todd · ❓ = needs Todd to confirm/fill.

---

## Spaces overview
| Space | Pallet slots | Notes |
|---|---|---|
| **Pack House cooler (PH)** | **12** ✅ | 3 rows × 4; middle row is the aisle |
| **Barn cooler** | **10** ✅ + shelving ❓ | irregular; shelves on right wall |
| **Truck overflow** (refrigerated van) | ❓ TBD | overflow space — slot count + rules needed |

---

## Pack House (PH) — 12 pallet spaces ✅

```
  PH-1   PH-2   PH-3   PH-4      ← storage row (fill)
[ PH-5   PH-6   PH-7   PH-8 ]    ← AISLE — keep open · door at PH-5
  PH-9  PH-10  PH-11  PH-12      ← storage row (fill)
```

**Rules (confirmed):**
- **Fill order:** PH-1–4 and PH-9–12 first; **keep the middle row PH-5–8 open** as the working aisle.
- **Blocking:** **PH-8 blocks PH-4 & PH-12.** Keeping the aisle clear is what keeps the far corners (PH-4, PH-12) reachable. If overflow forces the aisle, avoid **PH-8** (blocks 4 & 12) and **PH-5** (the door); use 6/7 first.
- **Outbound = accessible:** put **move-it / FIFO-due** pallets nearest the door → **PH-1, 2 and PH-9, 10**; send **long-hold** to the far corners **PH-4, PH-12**.
- **Friday rule:** **PH-1, 2, 3 empty by end of Friday** — reserved for weekend **market returns**, sorted for the pack team to process **Monday**.

**Thursday–Friday weekend-market assignments (confirmed for this cycle):**
| Market | Pallets | Out |
|---|---|---|
| 🟢 Bloomfield | PH-9, PH-10 | Sat |
| 🟠 Sewickley | PH-8, PH-11 | Sat |
| 🟣 South Side | PH-4, PH-12 | Sun |
| ▫ Market returns | PH-1, 2, 3 (empty by Fri EOD) | Mon |

*Intentional sequencing:* Sewickley's PH-8 blocks South Side's PH-4 & PH-12 — but Sewickley leaves **Saturday first**, clearing the aisle and **unblocking South Side for Sunday.** The board should treat this as expected, not a false "blocked" alarm.

---

## Barn cooler — 10 pallet spaces + shelving

Best read of the hand-drawn map (door at bottom-center, Barn-1 nearest the door, shelves on the right wall):

```
   5    4    3    2     [ shelves → ]
   6    7
             10
   8    9
                    1
        [ DOOR ]
```

- **10 pallet slots** (Barn-1 … Barn-10) ✅
- **Shelving** along the right wall ❓ — purpose? (small items / add-ons / boxes?)
- **Barn-1** sits by the door (most accessible). Middle (7, 10) and back row (2–5) are deeper.
- ❓ **Blocking/access not yet defined** — which slots block which (same as we did for PH).

---

## Truck overflow (refrigerated van) ❓
- Used as overflow / cold transport.
- ❓ How many pallet spaces? ❓ Loading order / which destinations stage here?

---

## Assignment model (how spaces are used) ✅ concept, ❓ details
- **By destination — one pallet per:** each **market**, each **wholesale order**, and **CSA**.
- **Flow:** field → wash → placed **directly onto the destination pallet** (no separate "inventory" step — the pallet IS the pack).
- **Priority-to-move:** any item can be flagged 🔴 *move it* (aging/surplus); flagged items should live in accessible slots and feed **CSA boxes** or **wholesale availability**.
- **FIFO + dates:** every pallet stamped **date-in**; oldest = next out; flag when the oldest (or a move-it) is stuck in a blocked/far slot → "restage forward."

---

## Open items — RESOLVED with Todd 2026-07-03
1. **Truck overflow:** ✅ NOT palletized — loose short-term overflow only. Board = a simple "⚠ In the van" list, NO slots/map.
2. **Barn blocking/access:** ✅ Barn MOVES / churns like PH — active zone with move-it alerting (exact slot-blocking not required for v1 zone model).
3. **Barn shelves:** ❓ still open — not v1-blocking.
4. **Assignment approach:** ✅ by destination (per market / per wholesale order / CSA).
5. **Priority tags:** ✅ move-it flags with an OPTIONAL reason (aging / surplus / customer).
6. **Device:** ✅ BOTH — shared pack-house tablet AND crew phones (access must work for the crew, not just Todd/Frankie).

## Key operating rule (Todd 2026-07-03)
- **CSA items must be in the BARN cooler by Tuesday** (CSA pack day) — the board alerts if the CSA pallet isn't staged in the Barn ahead of Tuesday.

## Design approach for the board (v1) — optimized for "always moving stuff"
- **Track LOGICAL pallets** (one per market / wholesale order / CSA) with date-in + optional 🔴 move-it(+reason), NOT physical positions — no logging every shuffle.
- **ZONES not 22 exact slots:** PH-Accessible · PH-Far · Barn · Van-overflow. The rules that matter (aisle PH-5–8 clear, PH-1/2/3 empty by Fri, Sewickley-Sat-unblocks-South-Side-Sun, CSA-in-Barn-by-Tue) fire as ALERTS, not manual tracking.
- **Home screen = MOVE LIST** ("what do I move now, and where?"), map secondary.
- **One-tap restage**; 🔴 move-it feeds CSA-box fill + wholesale availability.
