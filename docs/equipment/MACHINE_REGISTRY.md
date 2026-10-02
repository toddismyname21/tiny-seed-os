# Farm machine registry

Started 2026-09-24. Before this, no machine on the farm had a written record —
no model numbers, no service history, no hours. Every winter teardown began by
someone squinting at a greasy tag. This file is the fix.

**Rule: every machine gets a row before it gets worked on.** Read the ID tag and
photograph it; do not record a number from memory.

## Machines

### Simplicity riding mower — Kohler Command CV14S
| | |
|---|---|
| Engine model | **CV14S** |
| Engine spec | **14107** ← the number parts are keyed to |
| Engine serial | **3012206931** (prefix 30 = built 2000) |
| EPA family | SKH398U1G2RB |
| Displacement | 398 cc |
| Rated | 14 HP, vertical shaft, single cylinder OHV |
| Features | hydraulic valve lifters (no lash adjustment), full pressure lubrication, cast iron cylinder liner |
| Spark plug | Champion RC12YC / Kohler **12 132 02-S**, gap **1.0 mm (0.040 in)**, torque 38.0–43.4 N·m (28–32 ft-lb) |
| Oil filter | Kohler **52 050 02-S** — change every other oil change (200 hr); oil change every 100 hr |
| Oil | SAE 10W-30 (API SG/SH/SJ+); Kohler-brand "Command" oil covers the full temp range. 5W-20/5W-30 synthetic OK up to 40°F (4°C) |
| Crankcase capacity (w/filter) | **1.9 L (2.0 US qt)** |
| ID tag photo | Gmail, freetodd21@gmail.com → todd@, 2026-09-24 "Lawn mower and Kawasaki mule.", IMG_0695.jpeg |
| Status 2026-09-24 | **Down.** Ran until the fuel lines dry-rotted. Owner replacing carburetor and all fuel line. |
| Chassis model | ⚠️ NOT RECORDED — Simplicity model/serial is on a separate frame decal. Get it. |

Spark plug and oil filter verified 2026-09-24 from two independent sources: the
official Kohler CV11–CV16 owner's manual (`docs/equipment/reference_pdfs/KOHLER_CV11-CV16_OWNERS_MANUAL.pdf`)
and the Jack's Small Engines parts catalog keyed exactly to spec 14107 — both
give the identical part numbers.

### Kawasaki Mule 550 (KAF300C), 2000 — engine FE290D
| | |
|---|---|
| Engine code | **FE290D-DS09** |
| Engine number | **FE290DE402516** |
| Displacement | 286 cc |
| Rated | 9 HP, single cylinder, air cooled, OHV |
| Features | **HAS automatic compression release (ACR)** — confirmed 2026-09-24; solid (non-hydraulic) valve train, lash IS adjustable/required |
| Compression (minimum) | 290 kPa / 42 psi recoil-cranked, 390 kPa / 57 psi electric-cranked — factory service limit, not a "healthy" floor |
| Valve lash, cold | Intake 0.12 mm (0.005 in), Exhaust 0.12 mm (0.005 in) |
| Spark plug | NGK BPR5ES, gap **0.7–0.8 mm (0.028–0.031 in)**; torque UNVERIFIED |
| Oil | SAE 10W-30 (SF/SG/SH/SJ); pressurized lubrication with oil filter |
| Oil pan capacity | Max 1.1 L, Min 0.8 L |
| Fuel tank capacity | 6.0 L |
| ID tag photo | same email, IMG_0691.jpeg |
| Status 2026-09-24 | **Down.** Runs, but no power under load — will not climb a hill. |
| Already replaced | starter · carburetor · primary (drive) clutch · secondary (driven) clutch · drive belt — **none fixed it, entire drive side is new** |
| Chassis VIN | ⚠️ NOT RECORDED — under the seat or on the left rear frame rail. Get it. |
| Fuel pump vs gravity | ⚠️ NOT RECORDED — go look, follow the line from the tank |

All FE290 specs verified 2026-09-24 from the Kawasaki FE120–FE400 factory
service manual (`docs/equipment/reference_pdfs/KAWASAKI_FE_SERIES_SERVICE_MANUAL.pdf`),
read directly and cross-checked against the rendered page images, not a search
summary. Full detail and page citations in `MULE_550_NO_POWER_DIAGNOSIS.md`.

### Salad dryer #1 — Mannhart SD-PS
| | |
|---|---|
| Maker | **Mannhart, Inc., Grapevine, Texas** — Made in USA |
| Model | **SD-PS** |
| Serial | **PS-0018** (last digits partly obscured on the plate — re-read before ordering) |
| Electrical | 115 V · 60 Hz · **2.5 A**, single phase |
| Listing | UL, "Commercial Food Preparing Machine **62E3**" |
| Controls | mechanical spring timer (visible in photo, marked in minutes) |
| Status 2026-10-02 | **Out of service — no basket.** Machine otherwise present and plumbed (PVC visible) |
| ID tag photo | Todd, 2026-10-02, two plate photos |
| ⚠️ Needed | **inner basket.** Measure cavity ID × depth before sourcing |

### Salad dryer #2 — "The Greens Machine" (Shelleymatic)
| | |
|---|---|
| Name on machine | **The Greens Machine — Vegetable Drier by Shelleymatic**, patent pending |
| Service sticker | **ALCO** service hotline 1-800-835-2246 (a 1980s-era distributor sticker; do not assume live) |
| Status 2026-10-02 | **Out of service — no basket** |
| ⚠️ Needed | **inner basket.** Measure cavity ID × depth before sourcing |

⭐ **The Greens Machine product line still exists.** Verified 2026-10-02: it passed
**Shelleymatic → Dito-Dean → Electrolux Professional**, and is sold today as the
Electrolux Professional **"Greens Machine" VP1 / VP2 / VP4 vegetable dryer, 20
gallon** (current retail $3,059–$3,745; used VP1 units $1,800–$2,195 on eBay).
**That means a live OEM parts channel may reach this machine** — call Electrolux
Professional parts, or Parts Town, with photos and the Shelleymatic name.

## Salad dryer dimensions and drive — measured 2026-10-02

| | |
|---|---|
| Bowl inside diameter | **21 in** |
| Bowl depth | **19 in** |
| Bowl volume | **6,581 in3 = 28.5 US gal** |
| Basket implied (1/2 in clearance all round) | ~20 in x 18 in = **24.5 US gal** |
| **Class** | **20-gallon commercial** — same class as Hobart SDPE-11 and Electrolux VP1 |
| **Drive** | **cast octagonal boss the basket slips over.** Centre hole, rectangular slot beside it, two small holes on the centre line |
| Both machines share the same drive | YES — Todd confirmed. **One basket pattern fits both** |

**The octagonal drive rules out a plain produce basket.** The basket must have a
matching octagonal socket in its floor or it spins free and drives nothing. Any
"use a bushel basket" idea is dead, and the 1-1/4 bushel orange baskets on the
farm equipment list are for something else.

**Still needed to identify the part: the octagon itself** — across the flats,
across the corners, and height above the deck.

## Parts that exist, priced 2026-10-02

Right aisle: WebstaurantStore **"Salad Dryer / Spinner Parts and Accessories"**
(`/49725/`, 50 products).

| Part | Price | Note |
|---|---|---|
| **Hobart `PESPIN-BASKET`** basket, SDPE-11 dryers | **$404.99** ea, ships free | item `425PESPINBAS`, 20-gal class |
| **Delfield `6230116`** Liner with lid, plastic | **$364.49** ea | "liner" = the basket |
| **Delfield `6230251`** **Drive, Liner, Casting** | **$134.64** | **same kind of part as Todd's octagonal boss** |
| 176BASKETLG / 176BASKETSM | $51.49 / $40.49 | countertop size — far too small |
| Hobart part at Kitchenall / Chef's Deal | $465.00 / $562.10 | worse prices |

**Two baskets at OEM price is roughly $730-810.**

**The Delfield route is the interesting one.** Delfield sells the drive casting
as a separate part, so a mismatch is fixable: buy the liner AND its casting and
swap the casting onto the machine. That turns a fitment problem into a bolt-on.

## Salad dryer basket sourcing — what is verified and what is not

| Fact | Status |
|---|---|
| Greens Machine lineage → Electrolux Professional VP series, still in production | ✅ verified 2026-10-02 |
| Hobart OEM replacement basket `PESPIN-BASKET` for SDPE-11 dryers = **$465.00** at Kitchenall | ✅ verified — use as an order-of-magnitude anchor for an OEM basket |
| Rubbermaid BRUTE **GreensKeeper** 32 gal vegetable crisper, `FG263600WHT`, **$445.00** w/ lid + dolly | ✅ price verified (WebstaurantStore) |
| **That a GreensKeeper is the spin basket for these machines** | ❌ **NOT VERIFIED — do not assume.** An eBay seller bundled a Hobart dryer with a 20-gal GreensKeeper, which only shows the two get used together. The GreensKeeper is sold as a storage crisper |
| What basket fits the Mannhart SD-PS | ❌ unknown |
| Whether Mannhart, Inc. still trades | ❌ unknown — not found in a 2026-10-02 search |

🔴 **Next step is a measurement, not a search.** For each machine, record the
**inner cavity diameter and depth**, the drive/hub arrangement at the bottom, and
whether the basket seats on a shaft or free-floats. Those four facts identify the
part. Todd's own equipment list already buys *"1¼ bushel orange baskets — FOR
SALAD SPINNER"* at ~$11.40 each from Brookdale, which suggests **at least one
farm spinner takes a standard produce basket rather than a proprietary drum** —
worth checking first, because it is the cheapest possible answer by two orders of
magnitude.

## Service log

| Date | Machine | What was done | By | Parts | Cost |
|---|---|---|---|---|---|
| | | | | | |

## Still to add
Every other powered machine on the farm — tractors (MF 1240, Allis G, Lannen
RT-20), the Ram ProMaster and NV1500, the walk-behind equipment, the greenhouse
heaters, the wash-pack pumps. One row each, ID tag photographed.
