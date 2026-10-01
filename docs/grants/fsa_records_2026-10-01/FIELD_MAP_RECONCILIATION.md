# Reconciling the OS field map against FSA's — 2026-10-01

## The headline: they do not line up, and they should not

| | Fields | Total acres |
|---|---|---|
| **Tiny Seed OS** (`REF_Fields` / soil-tests.html) | 24 blocks | **7.60 ac** |
| **FSA** (GeoJSON, 2026-10-01) | 11 fields, 3 farms | **97.41 ac** |

**A 13× difference, and it is not an error.**

- **FSA counts whole tracts** — everything in the farm boundary. Woods, pasture,
  roadway, buildings, ground nobody has planted in years.
- **The OS counts production blocks** — the beds actually growing vegetables.

7.6 acres of intensive vegetable production inside 97 acres of leased tract is
an entirely normal market-farm shape. **The OS blocks sit INSIDE the FSA fields.**
This is a one-to-many mapping, not a rename.

## Side by side

### Tiny Seed OS — 24 production blocks, 7.60 ac
| Block | Acres | | Block | Acres |
|---|---|---|---|---|
| Z3 | 0.72 | | F7M | 0.26 |
| HOL | 0.62 | | Z5 | 0.21 |
| JS1 | 0.53 | | K1 | 0.10 |
| F3L | 0.51 | | K2 | 0.08 |
| SO | 0.51 | | House | 0.07 |
| M | 0.48 | | B | 0.06 |
| JL | 0.42 | | Greenhouse | 0.05 |
| JS10 | 0.40 | | House | 0.03 |
| JS3 | 0.38 | | | |
| IOL | 0.37 | | | |
| JS6 | 0.37 | | | |
| IL | 0.31 | | | |
| CL | 0.28 | | | |
| F11M | 0.28 | | | |
| F3M | 0.28 | | | |
| JS4 | 0.28 | | | |

⚠️ `House` appears twice (0.03 and 0.07). Worth cleaning up in the OS.
⚠️ `Kretschmann` and `Rosemary` and `Z1` appear in `fieldConfig` with bed counts
but carry **no acreage** — incomplete records.

### FSA — 11 fields, 97.41 ac, all Beaver County (42007)

| Farm/Tract/Field | Acres | Type | Centroid | Map |
|---|---|---|---|---|
| **1068/446/1** | **33.55** | **HEL** | 40.747077, -80.163148 | [map](https://maps.google.com/?q=40.747077,-80.163148) |
| 1068/446/2 | 1.24 | **HEL** | 40.748767, -80.160136 | [map](https://maps.google.com/?q=40.748767,-80.160136) |
| 1068/446/3 | 0.95 | UHEL | 40.745867, -80.161083 | [map](https://maps.google.com/?q=40.745867,-80.161083) |
| 1068/446/4 | 6.41 | UHEL | 40.743748, -80.163655 | [map](https://maps.google.com/?q=40.743748,-80.163655) |
| 1068/446/5 | 20.79 | UHEL | 40.747596, -80.163886 | [map](https://maps.google.com/?q=40.747596,-80.163886) |
| 1068/446/6 | 3.74 | UHEL | 40.748348, -80.160861 | [map](https://maps.google.com/?q=40.748348,-80.160861) |
| **1079/1583/1** | 3.76 | **HEL** | 40.741631, -80.162387 | [map](https://maps.google.com/?q=40.741631,-80.162387) |
| 1079/1583/2 | 17.45 | UHEL | 40.742841, -80.162439 | [map](https://maps.google.com/?q=40.742841,-80.162439) |
| **1238/1783/1** | 5.50 | **HEL** | 40.749972, -80.161573 | [map](https://maps.google.com/?q=40.749972,-80.161573) |
| 1238/1783/2 | 1.38 | UHEL | 40.750117, -80.160406 | [map](https://maps.google.com/?q=40.750117,-80.160406) |
| 1238/1783/3 | 2.64 | UHEL | 40.749629, -80.160568 | [map](https://maps.google.com/?q=40.749629,-80.160568) |

All three farms are clustered within about a mile — 40.741 to 40.750 N,
-80.160 to -80.164 W. Consistent with adjoining ground on one operation.

## ❌ Why I cannot finish this automatically

**The OS field records carry no coordinates.** They have names, bed counts and
acreage — no geography. FSA's file has polygons but no names we recognise.
**There is no shared key**, so any mapping I produced would be a guess, and a
guess here puts a conservation practice on the wrong tract in a federal
application.

## ✅ What Todd needs to do — 20 minutes

Open each map link above and name what is there. The centroids are real
coordinates; the satellite view should make them obvious.

| FSA field | Acres | Type | Which OS blocks sit in it | Crop | AMP practice |
|---|---|---|---|---|---|
| 1068/446/1 | 33.55 | HEL | | | |
| 1068/446/2 | 1.24 | HEL | | | |
| 1068/446/3 | 0.95 | UHEL | | | |
| 1068/446/4 | 6.41 | UHEL | | | |
| 1068/446/5 | 20.79 | UHEL | | | |
| 1068/446/6 | 3.74 | UHEL | | | |
| 1079/1583/1 | 3.76 | HEL | | | |
| 1079/1583/2 | 17.45 | UHEL | | | |
| 1238/1783/1 | 5.50 | HEL | | | |
| 1238/1783/2 | 1.38 | UHEL | | | |
| 1238/1783/3 | 2.64 | UHEL | | | |

**The only rows that must be right for AMP** are the ones holding the salad
greens and the tomatoes. Start there; the rest can follow.

## Why this is worth doing once, properly

The same mapping serves three obligations:

1. **AMP** — the project must attach to an FSA-registered field
2. **FSA acreage reporting** — Sara Downs is about to set this up with Todd
3. **OEFFA organic** — field histories and maps, same ground

Build it once, store it in the OS beside `REF_Fields`, and all three are fed
from one record instead of three reconstructions.

## 🔧 Suggested fix in the OS

Add to each field record:
- `fsa_farm`, `fsa_tract`, `fsa_field`
- `fsa_land_type` (HEL / UHEL)

Then acreage-by-crop-by-FSA-field is a query, not an afternoon.
