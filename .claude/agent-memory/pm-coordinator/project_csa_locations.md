---
name: CSA Delivery & Pickup Locations 2026
description: All CSA pickup stops with addresses, days, and coordinates — plus season dates, share types, and home delivery info
type: project
---

## CSA Pickup Locations (from PICKUP_LOCATIONS array, MERGED TOTAL.js line 61985)

All Wednesday stops are CSA porch/driveway drops. Saturday/Tuesday are farmers market pickups.

| # | Location | Address | Day | Type |
|---|----------|---------|-----|------|
| 1 | Zelienople | 358 East New Castle Street, Zelienople, PA 16063 | Wednesday | CSA stop |
| 2 | Cranberry | 230 Elmhurst Circle, Cranberry Township, PA 16066 | Wednesday | CSA stop |
| 3 | Allison Park - Simons (DEFAULT) | 4312 Middle Rd, Allison Park, PA 15101 | Wednesday | CSA stop |
| 4 | Allison Park - St Pauls | 1965 Ferguson Rd, Allison Park, PA 15101 | Wednesday | CSA stop (alt) |
| 5 | Fox Chapel | 237 Kittanning Pike, Pittsburgh, PA 15215 | Wednesday | CSA stop |
| 6 | Highland Park | 5901 Bryant St, Pittsburgh, PA 15206 | Wednesday | CSA stop |
| 7 | Squirrel Hill | 5502 Kamin Street, Pittsburgh, PA 15217 | Wednesday | CSA stop |
| 8 | Mt. Lebanon | 326 Newburn Dr, Pittsburgh, PA 15216 | Wednesday | CSA stop |
| 9 | North Side - Mayfly Market | 30 W North Ave, Pittsburgh, PA 15212 | Wednesday | CSA stop |
| 10 | Bloomfield Market | 5050 Liberty Ave, Pittsburgh, PA 15224 | Saturday | Farmers market |
| 11 | Lawrenceville Market | 115 41st St, Pittsburgh, PA 15201 | Tuesday | Farmers market |
| 12 | Sewickley Market | 200 Walnut St, Sewickley, PA 15143 | Saturday | Farmers market |

## Home Delivery
- Flat rate: $15/week
- Day: Wednesdays
- Zone: Pittsburgh area, validated by 10-minute rule (proximity to route line)

## 2026 Season Dates (from getSeasonDates(), line 46285)

| Share Type | Start | End | Weeks |
|------------|-------|-----|-------|
| Spring Veg | May 4 | May 31 | 4 |
| Summer Veg | June 1 | October 3 | 18 |
| Bouquet/Floral | June 1 | September 19 | 16 |
| Flex | June 1 | December 31 | 31 |

## Share Types (from Shopify variant parsing)
- Spring Veg CSA
- Summer Veg CSA (also: Friends & Family, Small Summer)
- Flower/Bouquet/Floral CSA (Petite + Full Bloom, weekly + biweekly)
- Flex CSA (gift card based)

**Why:** These locations are needed for marketing emails, CSA signup pages, delivery coordination, and route planning.
**How to apply:** Reference when drafting CSA marketing emails, updating Shopify product variants, or configuring pickup reminders.

## Allison Park Default (confirmed by Todd 2026-05-06)
When CSA_Members rows have `Pickup_Location = "Allison Park"` without Simons/St Pauls suffix, **route to Simons (4312 Middle Rd)**. St Pauls is the alternate site, used only when explicitly tagged. Future enhancement: add Pickup_Sub_Location column or rename pickup values.
