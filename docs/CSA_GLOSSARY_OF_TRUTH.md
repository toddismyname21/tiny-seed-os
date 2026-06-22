# 🌱 Tiny Seed — Glossary of Truth

**THE single source of canonical terms, labels, and definitions for the CSA / farm operation.**
When a name or rule is ambiguous, THIS doc wins. Every page, email, report, and decision uses these exact terms. Last confirmed with Todd: 2026-06-19.

> Rule: never invent a synonym. If a term isn't here and matters, add it here first, then use it everywhere.

---

## 1. Channels (the 5)
| Channel | Means |
|---|---|
| **CSA** | Subscription veg/flower shares delivered/picked up weekly |
| **Farm Flex** | À‑la‑carte extras members buy against prepaid store credit |
| **Markets** | Farmers-market stalls (walk-up retail + CSA-member pickup) |
| **Wholesale** | Standing/recurring restaurant orders |
| **Floral** | Flower shares + market/wholesale flowers (pick lists ALWAYS separate from veg) |

## 2. Share types (DB enum → say this)
`summer_veg` → **Summer Veg Share** · `flower` → **Flower Share** · `flex` → **Farm Flex** · `add_on` → **Add-On** · `spring_veg` → Spring Veg (season ended)

## 3. Sizes — use ONLY these (legacy DB labels are stale)
- **Summer Veg: `large` or `small`.** NEVER "family / regular / light."
- **Flower: `petite` or `full`.**

## 4. Frequency & Week A/B
- **weekly** or **biweekly.**
- Biweekly = **Week A / Week B** — *every other week*, parity anchored to **Mon 2026‑06‑08**. NEVER "1st & 3rd Wednesday."
- **Week A:** Jun 10, 24, Jul 8… **Week B:** Jun 17, Jul 1, Jul 15…

## 5. The WEEK (locked)
- A CSA week = **Monday–Sunday.**
- Label it **"Week of Jun 22 – Jun 28"** (date range). **NEVER "this / last / next week."**
- Stays the *current* week **through Sunday**, rolls Monday.
- `box_contents` is keyed by the **cycle MONDAY** + size bucket. The delivery day is **Wednesday** but the week spans 4 pickup days.

### ⚠️ 5a. Box plan = TWO tables (known trap — keep in sync!)
The box composition lives in **two** places and they must match or the farm flies blind:
- **`box_contents`** (cols: `week_date`, `share_type` large/small, `product_name`, `quantity`, `unit`) — drives what **MEMBERS see** (portal box display).
- **`weekly_box_plan`** (cols: `cycle_code='WEEKLY'`, `week_starting`, `share_size` large/small, `contents` JSON = `[{crop,qty,unit}]`, `published_at`) — drives what **OPERATIONS see**: `resolveCycle()` reads ONLY this, so **harvest list, pack sheets, labels, and route all come from `weekly_box_plan`.**
- **THE TRAP:** if `box_contents` is set but `weekly_box_plan` is empty (or stale), members see the box but the **harvest/pack/route pages show NOTHING** (root cause of "flying blind on CSA day," found 2026-06-22). Every week, BOTH must be populated for the same Monday + sizes. Resolver also applies member swaps on top, so its counts can be slightly below the raw box_contents math (correct behavior).
- **PERMANENT FIX (planned):** make `box_contents` the single source the resolver reads (or auto-sync box_contents → weekly_box_plan on publish) so they can never diverge.

## 6. Pickup days & stops (4 days)
| Day | Stops |
|---|---|
| **Tue** | Lawrenceville |
| **Wed** | Allison Park – Simons · Cranberry · Fox Chapel · Highland Park · Mt. Lebanon · North Park · North Side · Oakmont – Pittsburgh Taco Boys · Squirrel Hill · Zelienople · Rochester (Farm Pickup) |
| **Sat** | Bloomfield Market · Sewickley Market |
| **Sun** | South Side Market |
(Home delivery = admin-approved, paid $15/wk, runs Wednesday.)

## 7. Cycles & order windows
- **Early-week cycle:** harvest **Mon** → distribute Tue + Wed.
- **Weekend cycle:** harvest **Thu** → distribute Sat + Sun.
- **Window opens Thursday** for all CSA.
- **Box SWAPS lock:** Mon 6 AM (Tue/Wed) · Thu 6 AM (Sat/Sun) — base box is picked Monday, no switching after.
- **Flex à‑la‑carte locks:** Tue 6 AM (Tue/Wed) · Thu 6 AM (Sat/Sun).
- **Add-on (vendor) orders:** placed **≥1 week ahead.**

## 8. Box swap
2 free swaps/week → beyond that, **charge Flex balance.** Swap-in menu = the **available Flex items** (no per-item pairs). `customization_allowed=true` lets a member swap; `false` = fixed standard box.

## 9. Farm Flex money (source of truth)
- **Flex balance = Shopify Store Credit.** That is THE balance (what `getFlexBalance` reads, what the cap checks, what the portal shows).
- **Debit AT ORDER** (assume fulfillment; reverse/credit if unfulfilled). Reconciles on edit (debit the increase, refund the decrease).
- **`flex_transactions`** = audit ledger only. Types: `debit` / `refund` / `credit` (amount always positive). Idempotency key: `order_id = 'flexorder:{member_id}:{week}'`. Ledger writes need the **service-role** client (member RLS can't insert).
- **Flex order statuses:** `pending` (placed, still editable, DOES pack, debited at order) · `locked` · `fulfilled` · `cancelled`.

## 10. Product catalog (one archive)
- **`product_library`** = the master archive (every item, with photo). Add an item once here.
- **`flex_inventory`**, **`box_contents`**, **`wholesale_products`** all reference it via **`library_id`** → add-once-use-everywhere; photos flow across channels.

## 11. Wholesale standing orders (King Spring Mix; all can add on)
Mediterra **50#** · Black Radish **10#** · Cafe Verde **5#** — every **Wednesday**. Butterjoint **10#** — every **Friday**.
(Today wholesale rides the Wed CSA truck to save labor; Mediterra always Wed; goal = Tue/Fri cycle as restaurants cluster.)

## 12. Canonical Shopify tags
`2026-summer-csa` + `2026-flower-csa`. (The Flow workflow's `csa-2026-summer` is WRONG — run `sync_csa_tags.py` before any segment campaign.)

## 13. Systems / IDs
- Portal: **csa.tinyseedfarm.com** (Astro + Supabase, Vercel project `tiny-seed-csa` / `prj_79Qsl…`)
- Supabase project ref: **melizsvabemhaqeaqtyw**
- Shopify store: **tiny-seed-farmers-market**
- Roles: `admin` / `staff` / `member`; `customer_type='csa'`
- **Test accounts (exclude from counts/emails/money):** freetodd21@gmail.com · fakeemailsofake · test@test.com

## 14. Season
Open now → product likely **through ~New Year** (exact end TBD).
