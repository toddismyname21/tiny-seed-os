# Chilled water loop — secondary ice tank + circulating pump

**Todd, 2026-10-02:** *"ok, so lets write in a secondary tank, and circulating
pump to keep the water cold."*

Companion to `GREENS_WASHER_BUILD.md` (the tri-clamp bubbler) and
`HYDROCOOLING_OPTIONS.md` (why hydrocooling, and the Penn State evidence).

---

# How it works

```
  ICE TANK (insulated)            WASH TANK (owned, 120" x 20" x 12", ~125 gal)
  +---------------------+         +------------------------------------------+
  |  ice in a basket    |         |   greens + spa-blower bubbler manifold    |
  |  chilled water      | --pump-->  cold water in (sanitary TC)              |
  |                     | <--------  gravity overflow return                  |
  +---------------------+         +------------------------------------------+
```

**The ice never leaves the ice tank.** Water carries the cold. Greens come out of
the wash tank wet and cold and go straight to the spinners exactly as they do
today — **no ice ever reaches a spinner basket.**

## Why a secondary tank beats ice in the wash tank

| | Ice cage in the wash tank | **Secondary tank + pump** |
|---|---|---|
| Ice/greens separation | a cage, in the way of the work | **total — different vessel** |
| Working space | ice occupies part of the tank | **whole wash tank is working space** |
| Cold storage | melts at wash-tank temperature | **insulated — holds cold between batches** |
| Recharge | stop work, add ice | **load the ice tank while washing continues** |
| Capacity ceiling | limited by tank space | **add ice-tank volume without touching the wash tank** |

---

# Sizing

Wash tank working volume: **120" × 20" × 12" = 28,800 in³ = 125 US gal.**

| Full turnover every | Required flow |
|---|---|
| 10 min | 12.5 GPM |
| **15 min** | **8.3 GPM** |
| 20 min | 6.2 GPM |
| 30 min | 4.2 GPM |

**A ⅓–¾ HP sanitary centrifugal pump clears this comfortably.** The real
constraint is not flow, it is how much ice the reservoir holds.

**Ice demand** (Penn State: 1 lb ice cools ~3 lb produce, 85°F → 40°F):

| Greens per day | Ice needed |
|---|---|
| 300 lb | 100 lb |
| 500 lb | 167 lb |
| 800 lb | 267 lb |

➡️ **A 100–150 gallon insulated reservoir covers a heavy day with margin.**

---

# PARTS AND COST

| Item | Qty | Cost | Status |
|---|---|---|---|
| **Goulds 3657 series centrifugal pump** — all **316 stainless**, ⅓ HP, 115V single-phase, 2.9 A max. Built for *"corrosive fluid handling in food processing"* | 1 | **$565.33** | ✅ price read 2026-10-02 |
| *(alt)* Goulds SS0711AF, same series, **¾ HP**, 115V, 7.1 A | — | *$563.33* | ✅ more pump for the same money — **prefer this** |
| **Secondary tank** — **used stainless stock tank, Facebook Marketplace** | 1 | **$400.00** | Todd's figure, 2026-10-02 |
| **Tri-clamp sanitary plumbing** — supply + return, ferrules, clamps, gaskets, valve | — | **$250.00** | est. from `GREENS_WASHER_BUILD.md` part prices |
| **Sanitary flexible hose** — flexible runs between vessels | — | **$150.00** | est. |
| **Perforated stainless ice basket** for the reservoir | 1 | **$100.00** | est.; keeps ice off the pump inlet |
| **Tank insulation** — if the tank is not already jacketed | — | **$150.00** | est. |
| **Labor — 12 hrs @ $25** | — | **$300.00** | grant-eligible, Todd's rate |
| **Wash tank** | — | **$0 — OWNED** | |
| **Spa blower + manifold** | — | **$0 — already budgeted** at $522.91 | |
| | | **TOTAL ≈ $1,915** | |

⚠️ **Four of the eight lines are estimates, not read prices.** The pump is real;
the plumbing, hose, basket and insulation are sized by analogy to the manifold
build and should be itemised against real part numbers before the Budget Builder
is filed.

## Sourcing the secondary tank

🔴 **Used bulk milk tanks do not sell on eBay** — checked 2026-10-02, the listings
are all memorabilia. They are too big to ship, so they move through dairy
equipment dealers and farm auctions.

**Where they actually trade:**

| Dealer | |
|---|---|
| Buchanan & Hall | *"one of the largest selections of used milk coolers and sanitary stainless steel dairy tanks in North America"* |
| Anco Equipment | used bulk milk tanks |
| Salvage House | used stainless food-grade tanks and cooling equipment |
| Ullmer's Dairy Equipment | stainless tanks |
| PurpleUdder.com | free dairy equipment classifieds |

⭐ **Western PA is dairy country, so this is a local-auction and Marketplace item**
— the same channel that found the bagging table and the flail mower.

⭐ **A bulk milk tank is close to a purpose-built hydrocooler for scrap money:**
food-grade stainless, **insulated**, usually with an **agitator**, and often with
**its own refrigeration** — which could remove the need to buy ice at all.

> ✅ **DECIDED 2026-10-02 — $400, used stainless stock tank off Facebook
> Marketplace.** Todd's own equipment list already carried *"Stainless Steel Tank
> ×2 — FOR HYDROCOOLING AND WASHING — Facebook Marketplace — $1,000"* ($500
> each), so $400 is in line with what he has seen them go for.
>
> ⚠️ **A stainless stock tank is NOT insulated** — unlike a bulk milk tank, which
> is. **That makes the $150 insulation line load-bearing, not optional.** Bare
> stainless in a warm pack house will melt ice to no purpose. Wrap it, or the
> cold leaves before it reaches the greens.
>
> 💡 **Still worth watching for a used bulk milk tank** at a local auction. It
> arrives insulated, agitated, and often refrigerated — which could remove the
> ice purchase entirely. But $400 and a wrap gets the loop running now.

---

# WHY THIS IS A DEFENSIBLE GRANT LINE

| Test | |
|---|---|
| Specific commodity | **salad greens** — Penn State lists lettuce and spinach as **H, I**: hydrocool or ice |
| Real gap | greens currently get **no cooling step at all**; they sit at ambient in a stock tank while being bagged |
| Measurable benefit | *"a one-hour delay in cooling can reduce shelf life by a day or more"*; salad greens respire **4× faster at 50°F than 32°F** |
| Market access | **shelf life is the entire wholesale argument.** Buyers reject on wilt and short life |
| Per-item cap | ✅ **this loop is a BUILD, not a single item** — its largest single part is the **$563.33 pump.** For the whole-budget cap test see `PASA_BD_PLAN_REVISED.md` |
| Food safety | tri-clamp sanitary fittings throughout, fully demountable — a quotable GAP strength |
| Labor | eligible; we build it |

🔴 **Condition before use: the sanitiser.** Penn State — *"If hydrocooling water
is recirculated, it should be chlorinated (or other approved sanitizer)."*
Recirculation is exactly what this loop does. **Tiny Seed is OEFFA-certified, so
the sanitiser must be NOP-allowed, and I have NOT verified which qualify.**
Confirm with **Lauren Pope** and record it in the OSP before the loop runs.
