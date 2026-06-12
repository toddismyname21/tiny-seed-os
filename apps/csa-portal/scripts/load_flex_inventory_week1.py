#!/usr/bin/env python3
"""
Load Week 1 (week_starting 2026-06-08 = Week A, Wed Jun 10 delivery) flex
inventory. Idempotent: only inserts items not already present for the week.
Loads ONLY the unambiguous available-now items + the 2 CSA shares.
HOLDS the "coming soon" group (Bok Choy, Broccolini, Fennel, Radicchio,
Petite Kale Mix, Something Fresh Mix) pending Todd confirmation.
"""
import json, sys, urllib.request, urllib.error
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WEEK = "2026-06-08"

def load_env(p):
    e = {}
    for ln in (p).read_text().splitlines():
        ln = ln.strip()
        if ln and not ln.startswith("#") and "=" in ln:
            k, v = ln.split("=", 1); e[k.strip()] = v.strip().strip('"').strip("'")
    return e

env = load_env(ROOT / ".env")
URL = env.get("PUBLIC_SUPABASE_URL") or env.get("SUPABASE_URL")
KEY = env.get("SUPABASE_SERVICE_ROLE_KEY")
if not (URL and KEY): sys.exit("missing supabase creds")
H = {"apikey": KEY, "Authorization": f"Bearer {KEY}", "Content-Type": "application/json"}

def req(method, path, body=None, headers=None):
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(f"{URL}{path}", data=data, method=method, headers={**H, **(headers or {})})
    try:
        with urllib.request.urlopen(r, timeout=60) as resp:
            raw = resp.read().decode()
            return resp.status, (json.loads(raw) if raw else None)
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()

# name, category, unit, price_dollars, qty
ITEMS = [
    ("Little Gem Lettuce Duo",            "Head Lettuce",   "duo",   6.00, 100, None),
    ("Red Romaine Lettuce",               "Head Lettuce",   "head",  4.00, 100, None),
    ("Green Sweet Crisp Lettuce",         "Head Lettuce",   "head",  4.00, 100, None),
    ("Red & Green Butter Duo",            "Head Lettuce",   "duo",   6.00, 100, None),
    ("Sweet Oakleaf Lettuce",             "Head Lettuce",   "head",  4.00, 100, None),
    ("Romaine Lettuce",                   "Head Lettuce",   "head",  4.00, 100, None),
    ("Artisan Head Lettuce Mix (3 Heads)","Head Lettuce",   "bag",   7.50, 100, None),
    ("Swiss Chard",                       "Bunching Greens","bunch", 4.00, 100, None),
    ("Dino Kale",                         "Bunching Greens","bunch", 4.00, 100, None),
    ("Dill",                              "Herbs",          "bunch", 3.00, 100, None),
    ("Cilantro",                          "Herbs",          "bunch", 3.00, 100, None),
    ("Rosemary",                          "Herbs",          "bunch", 3.00, 100, None),
    ("Salad Turnips",                     "Roots",          "bunch", 4.00, 100, None),
    ("Arugula (1/4 lb)",                  "Salad Mixes",    "bag",   4.00, 100, None),
    ("King Spring Mix (1/4 lb)",          "Salad Mixes",    "bag",   4.00, 100, None),
    ("King Spring Mix (Big Bag, 12+ oz)", "Salad Mixes",    "bag",   9.00, 100, None),
    ("Spinach (4 oz)",                    "Salad Mixes",    "bag",   4.00, 100, None),
    ("Spinach (Big Bag, 12 oz)",          "Salad Mixes",    "bag",   9.00, 100, None),
    ("Tomato Seedling Duo",               "Seedlings",      "duo",  10.00, 100, None),
    ("Pepper Seedling Duo",               "Seedlings",      "duo",  10.00, 100, None),
    ("Bok Choy",                          "Greens",         "head",  6.00, 100, None),
    ("Small CSA Share",                   "CSA Shares",     "share",35.00, 100,
     "Salad Turnips, Bok Choy, 2 Heads of Lettuce, Cilantro, Radishes, Herb Seedling."),
    ("Family CSA Share",                  "CSA Shares",     "share",45.00, 100,
     "Everything in the Small Share plus Potatoes, Dill, and Swiss Chard."),
]

# Existing names this week → skip
st, existing = req("GET", f"/rest/v1/flex_inventory?select=name&week_starting=eq.{WEEK}")
if st != 200: sys.exit(f"fetch existing failed {st}: {existing}")
have = {r["name"] for r in existing}
print(f"Existing items for {WEEK}: {len(have)}")

rows = []
for name, cat, unit, price, qty, desc in ITEMS:
    if name in have:
        print(f"  skip (exists): {name}"); continue
    row = {
        "cycle_code": "WEEKLY", "week_starting": WEEK, "name": name, "category": cat,
        "unit": unit, "price_cents": int(round(price * 100)),
        "available_qty": qty, "remaining_qty": qty, "is_active": True,
        "description": desc,
    }
    rows.append(row)

if not rows:
    print("Nothing new to insert."); sys.exit(0)

st, res = req("POST", "/rest/v1/flex_inventory", rows, {"Prefer": "return=representation"})
if st not in (200, 201):
    sys.exit(f"INSERT FAILED {st}: {res}")
print(f"\nINSERTED {len(res)} items:")
for r in res:
    print(f"  ${r['price_cents']/100:>6.2f}  {r['category']:<16} {r['name']}")
print(f"\nTotal flex_inventory rows for {WEEK}: {len(have) + len(res)}")
