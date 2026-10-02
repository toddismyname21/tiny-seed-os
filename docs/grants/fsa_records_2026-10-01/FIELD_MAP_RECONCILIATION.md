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

# 🗺️ RECONCILED — Todd's field map vs. FSA, 2026-10-01

Todd supplied the hand-drawn **Tiny Seed Farm Field Map (12/22 update)**. It
resolves what the data alone could not.

## The farm is a long north–south strip along Zeigler Rd

The map shows **three production clusters** separated by woods, with the barn,
house and greenhouse mid-farm on the Zeigler Rd side. **FSA has exactly three
farms**, and sorted by latitude they stack north→south with **no overlap at
all**:

| | FSA farm | Fields | Acres | Latitude band |
|---|---|---|---|---|
| **NORTH** | **1238** / tract 1783 | 3 | 9.52 | 40.74963 – 40.75012 |
| **MIDDLE** | **1068** / tract 446 | 6 | 66.68 | 40.74375 – 40.74877 |
| **SOUTH** | **1079** / tract 1583 | 2 | 21.21 | 40.74163 – 40.74284 |

## The proposed mapping

| FSA farm | Map cluster | OS blocks | Production ac | Tract ac |
|---|---|---|---|---|
| **1238** (N) | top of map — JS strips + House | JS10, JS6, JS1, JS3, JS4, House | **≈ 2.0** | 9.52 |
| **1068** (MID) | F-fields, pond, barn/home/greenhouse, mid blocks | F3L, F3M, F7M, F11M, SO, IL, HOL, JL, K1, K2, M, IOL, CL, B, Greenhouse | **≈ 4.6** | 66.68 |
| **1079** (S) | bottom of map | **Z3, Z5** | **0.93** | 21.21 |
| | | **TOTAL** | **≈ 7.5** | **97.41** |

≈7.5 production acres against the OS total of **7.60** — the gap is the blocks
carrying bed counts but no acreage (`Kretschmann`, `Rosemary`, `Z1`).

## Why I believe this

1. **Three clusters, three farms, same order.** The map grouping and the
   latitude bands agree without being forced.
2. ⭐ **The south section is the clincher.** Farm 1079 has **exactly 2 FSA
   fields.** The south of the map has **exactly 2 blocks — Z3 and Z5.**
3. **The acreage gap is explained by the drawing itself** — it is covered in the
   word WOODS, plus a pond. 7.5 acres of beds inside 97 acres of tract is
   precisely what that map depicts.
4. **Farm 1068 is the largest tract and holds the most blocks**, the pond, the
   buildings and most of the woods. Consistent.

⚠️ **Hypothesis, not survey.** Built on latitude ordering and cluster shape. One
look at the map links settles it.

## 📍 TODD 2026-10-02 — "tomatoes in F3 next year, salad in many fields"

**This narrows it most of the way.**

### Tomatoes → F3 → farm 1068 / tract 446

⚠️ **"F3" is an OS block name, not an FSA field number.** The OS carries
**`F3L` (0.51 ac)** and **`F3M` (0.28 ac)** — the F-blocks all sit in the
**MIDDLE cluster**, which maps to **FSA farm 1068 / tract 446**.

**Do NOT write "field 3" on the form.** FSA field `1068/446/3` is a different
thing — 0.95 ac of UHEL ground — and it is only a coincidence of numbering.

🔴 **Still open: which of farm 1068's six FSA fields contains F3L/F3M.**

| FSA field | Acres | Type | Satellite |
|---|---|---|---|
| 1068/446/1 | 33.55 | **HEL** | [map](https://maps.google.com/?q=40.747077,-80.163148) |
| 1068/446/2 | 1.24 | **HEL** | [map](https://maps.google.com/?q=40.748767,-80.160136) |
| 1068/446/3 | 0.95 | UHEL | [map](https://maps.google.com/?q=40.745867,-80.161083) |
| 1068/446/4 | 6.41 | UHEL | [map](https://maps.google.com/?q=40.743748,-80.163655) |
| 1068/446/5 | 20.79 | UHEL | [map](https://maps.google.com/?q=40.747596,-80.163886) |
| 1068/446/6 | 3.74 | UHEL | [map](https://maps.google.com/?q=40.748348,-80.160861) |

### ⭐ Salad "in many fields" is fine, and may even be the better answer

The middle cluster already holds most production blocks — `F3L, F3M, F7M, F11M,
SO, IL, HOL, JL, K1, K2, M, IOL, CL, B`. If salad is spread across those,
**salad and tomatoes are both on farm 1068 / tract 446.**

✅ **That is the outcome this document predicted as best:** one FSA farm, two
commodities, HEL ground available for the practice. The cleanest possible shape
for AMP.

**And the acreage rule already established here still holds** — the FSA field
number is an address; the acreage reported is the production acreage actually
treated, not the 33.55 or 66.68 of tract.

### 🔴 Two things to ask Chris

1. **"Salad greens rotate across several blocks inside one FSA tract. Do we name
   one field, several, or the tract?"** Rotation is normal and the form asks for
   a specific field — this needs his answer rather than our guess.
2. **"Tomatoes move to this ground next season. Does the conservation practice
   need to be active on that field now, or at the time of the project?"** The
   rule says the practice must be ACTIVE for those crops and that field.

## 🎯 The only question left for AMP

Not 24 blocks. Not 11 fields. **One question:**

> **Which cluster grows the salad greens — north (JS), middle (F / SO / I / H /
> J / K / M / IO), or south (Z)? And which grows the tomatoes?**

| Commodity | Cluster | → FSA farm/tract | Blocks | Production ac |
|---|---|---|---|---|
| **Salad greens** | | | | |
| **Tomatoes** | | | | |

### What each answer would mean

- **North (JS) → 1238/1783.** Smallest tract. **1238/1783/1 is HEL.**
- **Middle (F/SO/I/H/J/K/M/IO) → 1068/446.** Largest, most blocks, holds the
  greenhouse and barn — the likeliest home for intensive salad, since greens move
  to the pack house constantly. **1068/446/1 and /2 are HEL.**
- **South (Z) → 1079/1583.** Only 0.93 production acres. **1079/1583/1 is HEL.**

**If greens and tomatoes are both in the middle cluster, that is the best
outcome** — one FSA farm, two commodities, HEL ground available for the practice.
Exactly the shape AMP wants.

---

## ❌ Why I cannot finish this automatically

**The OS field records carry no coordinates.** They have names, bed counts and
acreage — no geography. FSA's file has polygons but no names we recognise.
**There is no shared key**, so any mapping I produced would be a guess, and a
guess here puts a conservation practice on the wrong tract in a federal
application.

## ⭐ Todd 2026-10-01: "The production fields are the ones I am using."

Confirmed — the **7.60 acres of production blocks are the farm**. The other ~90
acres in FSA's file are tract area, not ground in vegetables.

### Two things that follow, and both make this easier

**1. The practice acreage is the PRODUCTION acreage, not the field acreage.**
If tarps go on 2 acres of salad greens sitting inside FSA field 1068/446/1,
the application reports **2 acres of practice on field 1068/446/1** — not 33.55.
You are not on the hook for treating 97 acres. The FSA field number is an
address; the acreage you report is what you actually treat.

**2. You do not need all 24 blocks mapped.** For AMP you need exactly two
answers:

> **Which FSA field holds the salad greens?**
> **Which FSA field holds the tomatoes?**

Everything else can wait for Sara's acreage reporting. Two rows is the whole
blocker.

### The narrow ask

| Need | FSA farm/tract/field | OS blocks | Production acres |
|---|---|---|---|
| **Salad greens** | | | |
| **Tomatoes** | | | |

If greens and tomatoes share an FSA field, that is simpler still — one field,
two commodities, which is exactly what AMP asks for.

## ✅ The fuller mapping — 20 minutes, when there is time

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
