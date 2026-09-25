# Winter 2026 — parts buy list and order of work

Two machines, both down. Prices checked **2026-09-24**; Amazon knows the farm
address, so delivery estimates on those links are real.

**Step-by-step procedures live in:**
- `MOWER_KOHLER_CV14S_CARB_AND_TUNEUP.md`
- `MULE_550_NO_POWER_DIAGNOSIS.md`
- `WINTERIZATION_2026.md` — after each machine is confirmed running

---

# BUY LIST

## Tier 1 — buy now, $122. Unblocks all the work.

### Tools (buy first — you cannot diagnose the Mule without this)

| Item | Price | Link | Why |
|---|---|---|---|
| **Leak-down + compression tester, dual gauge** | **$33.99** | `amazon.com/dp/B0B8SMT1CW` · 4.3★, 295 rev | Does **both** tests in the Mule plan. One purchase. |
| *(alt)* TU-21 leak-down only | $22.69 | 4.3★, **1.2K rev** | Cheaper, best-reviewed, but leak-down only |

Buy the dual-purpose one. The Mule plan calls for both tests.

### Mower — Kohler CV14S spec 14107

| Item | Part | Price | Link |
|---|---|---|---|
| **Carburetor** (aftermarket) | Mannial | **$27.99** | `amazon.com/dp/B07MB132PS` · 4.2★, **537 rev** |
| Gasket, carburetor | Kohler **12 041 01-S** | $2.49 | PartsTree — buy OEM |
| Gasket, air cleaner base | Kohler **12 041 02-S** | $2.99 | PartsTree — buy OEM |
| Fuel filter, 75 micron | Kohler **25 050 21-S** | $12.99 | PartsTree |
| Air filter element w/ seal | Kohler **12 083 05-S** | $27.99 | PartsTree |
| Pre-cleaner (foam wrap) | Kohler **12 083 08-S** | $6.99 | PartsTree |
| Fuel line, ethanol-rated | — | ~$10 | **Local auto parts store.** Take a piece of the old line and match the ID. |
| Fuel line clamps, spring type | — | ~$5 | Local |

**Do not** buy the Kohler fuel hose 25 111 81-S at $17.99 for 24 inches. Bulk
ethanol-rated line (SAE 30R7) from any auto parts store is a few dollars and you
need more than 24 inches to redo every run.

**Buy the two gaskets OEM even though the carb is aftermarket.** $5.48 total.
A bad gasket means an air leak and a lean run you chase for weeks.

### Mule 550 — KAF300C

| Item | Part | Price | Link |
|---|---|---|---|
| **CVT drive belt** | Kawasaki **59011-1071** | **$31.39** | `amazon.com/dp/B0FN18HB3Y` — **Gates Sportline** |
| **Tune-up kit** — air + pre-filter + oil + fuel filter + plug | air `11029-1004` · fuel `49019-1055` · oil `49065-7010` | **$31.99** | `amazon.com/dp/B0819PKNSF` · 4.4★, 106 rev |

**On the belt, spend the money on a real brand.** Unlike the carburetor, a CVT
belt *is* the transmission — it carries every bit of torque to the wheels and it
fails under exactly the load you are trying to fix. Gates and Dayco actually
manufacture belts. The $23.50 no-name belts may be fine, but this is my top
suspect for your symptom, and a second failure costs you the diagnosis, not just
the part.

- **Gates Sportline — $31.39** ← recommended, real manufacturer, sensible price
- Dayco HP — $80.21, 4.3★ — premium, probably overkill here
- TCINDRR — $23.50, 4.4★, 12 rev — saves $8, unknown maker

**Tier 1 total: ~$122**

---

## Tier 2 — after diagnosis tells you what you need

Do not buy any of this yet.

| Item | When |
|---|---|
| Mower spark plug + oil filter + oil | Need the numbers from the CV14 manual — **ask a dealer, quote CV14S / spec 14107** |
| Mule spark plug (if not in the kit) | Confirm the kit's plug is correct for FE290D |
| Mule fuel pump | Only if it has one — go look |
| Mower fuel pump `12 559 02-S` | Only if it has one — go look |
| Mower tank cap | Only if the vent will not pass air |
| Mule ignition coil | Only if Stage 2 shows spark breaking down |
| Mule muffler / spark arrestor | Only if Stage 0.4 finds it plugged |
| Flywheel key | Couple of dollars — grab one if you pull the flywheel |
| Valve job / head gasket | Only if leak-down says so |

---

# ORDER OF WORK

## Step 1 — Mule Stage 0, today, before the parts arrive. $0.

From `MULE_550_NO_POWER_DIAGNOSIS.md`, four free checks, 30 minutes:

1. **Look at the drive belt** — glazed, cracked, narrowed? If it is original, you
   have probably found it.
2. **Jack it and spin the rear wheels** — dragging brake?
3. **Watch the throttle plate** while someone floors the pedal — does it reach
   wide open?
4. **Pull the spark arrestor** — caked with carbon? Or drop the muffler and
   drive 100 feet.

**Also while you are out there — write down the two numbers I am missing:**
- the **Mule VIN** (under the seat, or the left rear frame rail)
- the **Simplicity chassis model** (frame decal)

Both go in `MACHINE_REGISTRY.md`.

**And answer one question: does each machine have a fuel PUMP, or gravity feed?**
That decides two line items above.

## Step 2 — Order Tier 1. ~$122.

## Step 3 — Mower, once parts land. Half a day.

Follow `MOWER_KOHLER_CV14S_CARB_AND_TUNEUP.md` start to finish. The order
matters:

1. Drain fuel, pull and **clean the tank** — this is the step that makes the new
   carb last
2. All new line, new filter
3. **Photograph every linkage and spring hole**, then swap the carb
4. Leak check cold → start → warm → leak check again
5. Tune-up: warm oil change, air filter + pre-cleaner, plug, **pull the blower
   housing and clear the cooling fins**
6. Confirm it runs right
7. Winterize

**Remember: no valve adjustment on this engine.** Hydraulic lifters.

## Step 4 — Mule, once the belt and kit land.

1. **New belt first** if Stage 0 was inconclusive — cheapest real fix, top suspect
2. If that does not do it, work `MULE_550_NO_POWER_DIAGNOSIS.md` in order:
   Stage 1 fuel supply → Stage 2 ignition → Stage 3 governor → Stage 4 compression
3. **Set valve lash BEFORE the compression test** — a tight exhaust valve reads
   as a worn engine
4. Compression test, then **leak-down** — the leak-down is the one that answers it
5. **Test it on the actual hill** before you call it fixed
6. Winterize

## Step 5 — Log it.

Every part, price, and date into the service log in `MACHINE_REGISTRY.md`. Next
September this starts from a record instead of memory.

---

# What I still cannot tell you

| Unknown | Why it matters | How to get it |
|---|---|---|
| **Does FE290D have a compression release?** | A healthy engine may read 60–90 psi. Do not condemn it on a low number — that is why the plan leans on leak-down. | Kawasaki FE290D manual, or the camshaft parts diagram |
| FE290D compression spec + valve lash | Needed for Stage 4 | Same manual |
| Mower spark plug, gap, oil filter, capacity | Tune-up | CV14 manual or a dealer |

**When you call a dealer, give them:**
- Mower — `Kohler CV14S, SPEC 14107, SERIAL 3012206931`
- Mule — `Kawasaki Mule 550, KAF300C, year 2000, engine FE290D-DS09`
