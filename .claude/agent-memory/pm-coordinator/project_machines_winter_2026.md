---
name: machines-winter-2026
description: Mower and Mule 550 winter repair — both down, plans written, ~$100 buy list ready; three facts Todd still owes before ordering
metadata:
  type: project
---

**Started 2026-09-24.** All docs in `docs/equipment/`. Start at
`WINTER_2026_BUY_LIST.md`.

| Doc | What |
|---|---|
| `WINTER_2026_BUY_LIST.md` | parts + order of work — **read first** |
| `MOWER_KOHLER_CV14S_CARB_AND_TUNEUP.md` | mower step-by-step |
| `MULE_550_NO_POWER_DIAGNOSIS.md` | Mule step-by-step |
| `WINTERIZATION_2026.md` | applies to every farm engine |
| `MACHINE_REGISTRY.md` | the new equipment record — **nothing existed before this** |

## Simplicity mower — Kohler **CV14S, SPEC 14107**, serial 3012206931
Down since the fuel lines dry-rotted. **Parts are keyed to the SPEC number, not
the model.** Has **hydraulic lifters — there is NO valve lash adjustment.**

It is a fuel SYSTEM job, not a carb job: rotted line sheds into the tank and
filter too, so a new carb on a dirty tank just gets contaminated.

## Kawasaki Mule 550 (KAF300C, 2000) — engine **FE290D-DS09**
Runs, no power under load, will not climb a hill.

**Todd has ALREADY replaced: starter · carburetor · primary clutch · secondary
clutch · drive belt.** The entire drive side is new. Do not suggest any of them
again.

**Top suspect: carbon-plugged muffler / spark arrestor.** Free to test — drop
the muffler, drive 100 feet. Then brakes dragging, throttle not reaching WOT,
CVT geometry, fuel supply upstream of the carb, ignition under load, governor,
then compression.

✅ **SETTLED 2026-09-24, from the Kawasaki FE120-FE400 factory service manual**
(saved at `docs/equipment/reference_pdfs/KAWASAKI_FE_SERIES_SERVICE_MANUAL.pdf`,
read directly + page images cross-checked, not a search summary): FE290 **does**
have an ACR. Compression minimum 290 kPa/42 psi recoil-cranked or 390 kPa/57 psi
electric-cranked, WITH the ACR active — that's a factory floor, not a "should be
higher" red flag. Valve lash 0.12mm intake+exhaust, cold — and **FE290 has no
HLA** (that's FE350/400 only), so lash genuinely needs setting on this engine.
Spark plug NGK BPR5ES, gap 0.7-0.8mm; torque unverified. Leak-down is still the
deciding test regardless (immune to the ACR question by design), but the
compression number is no longer a black box either.

## Three things Todd owes before ordering
1. **Mule VIN** — under the seat or left rear frame rail
2. **Simplicity chassis model** — frame decal
3. **Does each machine have a fuel PUMP or gravity feed?** — decides 2 line
   items. Still open for both machines even after research — mower has NEW
   leaning-yes evidence (spec-14107 parts catalog shows a full pump parts set,
   not an optional accessory) but OEM diagrams bundle running changes, so it's
   still a physical look-and-tell, not resolved by documents.

## Buy list ~$120-125 — ratings verified off the product pages
Standard: **4.0★ minimum AND 100+ reviews.**

| Part | ASIN | Price | Rating |
|---|---|---|---|
| Leak-down + compression tester | B0B8SMT1CW | $33.99 | 4.3★ / 295 |
| Mannial carburetor (names 12 853 93-S + CV14) | B07MHHYGZR | $18.99 | 4.2★ / 285 |
| HIFROM Mule tune-up kit | B0819PKNSF | $31.99 | 4.4★ / 106 |

Plus Kohler OEM: gaskets `12 041 01-S` + `12 041 02-S`, fuel filter
`25 050 21-S`, air element `12 083 05-S`, pre-cleaner `12 083 08-S`, spark plug
`12 132 02-S` (gap 1.0mm), oil filter `52 050 02-S`, SAE 10W-30 (1.9L w/filter).
Fuel line bulk from a local store, NOT the $17.99 Kohler 24-inch piece.

Mower spark plug/oil filter/capacity now verified (see above) — two
independent sources (Kohler owner's manual + spec-14107 parts catalog) agree
exactly. FE290D compression spec and valve lash also verified, see above.
