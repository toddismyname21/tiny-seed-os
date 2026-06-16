#!/usr/bin/env python3
"""
ORDER RECONCILIATION — ties every portal member to its Shopify order so payment
gaps surface automatically (the fix for "Glenn looked unpaid but wasn't").

For each ACTIVE member with no shopify_order_id, it searches Shopify by the
customer's EMAIL and NAME across the FULL season window (incl. fall presale),
matches the right product for the member's share_type, and either LINKS the
order id or flags the member as "needs review". Prints a discrepancy report.

RUN:  python3 scripts/reconcile_orders.py [--write]   (--write applies the links; default = dry run)
"""
import json, urllib.request, urllib.parse, time, sys
from pathlib import Path

ENV = {}
for ln in (Path(__file__).resolve().parent.parent / ".env").read_text().splitlines():
    ln = ln.strip()
    if ln and not ln.startswith("#") and "=" in ln:
        k, v = ln.split("=", 1); ENV[k.strip()] = v.strip().strip('"').strip("'")
URL, KEY = ENV["PUBLIC_SUPABASE_URL"], ENV["SUPABASE_SERVICE_ROLE_KEY"]
TOK, STORE = ENV["SHOPIFY_ACCESS_TOKEN"], ENV["SHOPIFY_STORE_NAME"]
H = {"apikey": KEY, "Authorization": f"Bearer {KEY}", "Content-Type": "application/json"}
WRITE = "--write" in sys.argv
SINCE = "2025-09-01"   # covers fall presale for the current season
TEST = {"test@test.com", "freetodd21@gmail.com", "fakeemailsofake@gmail.com"}

def sb(p, method="GET", body=None):
    req = urllib.request.Request(f"{URL}/rest/v1/{urllib.parse.quote(p, safe='/?=&.*,()@')}",
                                 data=json.dumps(body).encode() if body else None, method=method, headers=H)
    return json.loads(urllib.request.urlopen(req, timeout=40).read() or b"[]")

def shop(q, v=None, tries=4):
    for i in range(tries):
        r = json.loads(urllib.request.urlopen(urllib.request.Request(
            f"https://{STORE}.myshopify.com/admin/api/2026-04/graphql.json",
            data=json.dumps({"query": q, "variables": v or {}}).encode(), method="POST",
            headers={"X-Shopify-Access-Token": TOK, "Content-Type": "application/json", "User-Agent": "x"}), timeout=60).read())
        if r.get("errors") or r.get("data") is None:
            time.sleep(1.5 * (i + 1)); continue
        return r
    return r

# share_type -> does a Shopify line item name match it?
def line_matches(share_type, name):
    l = " ".join(name.lower().replace("\xa0", " ").split())
    if share_type in ("summer_veg", "spring_veg", "fall_veg"):
        return "csa share" in l and "flower" not in l
    if share_type == "flower":
        return ("flower subscription" in l) or ("bouquet" in l) or ("flower share" in l)
    if share_type == "add_on":
        return "add-on" in l or "add on" in l
    if share_type == "flex":
        return "flex" in l or "farm credit" in l or "store credit" in l
    return False

def find_order(email, name, share_type):
    for q in ([f'email:"{email}"'] if email else []) + ([name] if name else []):
        d = shop('query($q:String!){customers(first:3,query:$q){edges{node{orders(first:40){edges{node{legacyResourceId createdAt displayFinancialStatus lineItems(first:15){edges{node{name}}}}}}}}}}', {"q": q})
        for c in (d.get("data") or {}).get("customers", {}).get("edges", []):
            for o in c["node"]["orders"]["edges"]:
                if o["node"]["createdAt"] >= SINCE and any(line_matches(share_type, li["node"]["name"]) for li in o["node"]["lineItems"]["edges"]):
                    return o["node"]["legacyResourceId"], o["node"]["displayFinancialStatus"]
    return None, None

def main():
    members = sb("members?select=id,share_type,customer:customers(contact_name,email)&status=eq.active&shopify_order_id=is.null")
    members = [m for m in members if ((m.get("customer") or {}).get("email") or "").lower() not in TEST]
    print(f"{'APPLYING' if WRITE else 'DRY RUN'} — {len(members)} active members with no linked order\n")
    linked = 0; review = []
    for m in members:
        c = m.get("customer") or {}
        oid, status = find_order((c.get("email") or "").lower(), c.get("contact_name"), m["share_type"])
        if oid:
            linked += 1
            if WRITE:
                sb(f"members?id=eq.{m['id']}", "PATCH", {"shopify_order_id": str(oid)})
        else:
            review.append((c.get("contact_name"), c.get("email"), m["share_type"]))
        time.sleep(0.5)
    print(f"✅ matched to a Shopify order: {linked}{' (LINKED)' if WRITE else ' (would link)'}")
    print(f"\n⚠️  NEEDS REVIEW — no order found anywhere ({len(review)}): comp / check / data error")
    for nm, em, st in sorted(review, key=lambda x: (x[2], str(x[0]))):
        print(f"   {(nm or '?'):24} {(em or '?'):32} {st}")
    if not WRITE:
        print("\n(dry run — re-run with --write to apply the links)")

if __name__ == "__main__":
    main()
