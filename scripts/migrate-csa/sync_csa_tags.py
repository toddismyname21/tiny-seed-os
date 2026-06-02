#!/usr/bin/env python3
"""
sync_csa_tags.py — Self-healing CSA customer-tag sync.

PURPOSE
-------
Make sure every 2026 CSA customer has the right tag for the Shopify Email
segments, regardless of any upstream tag-applying drift.

Canonical tags (one per share type — match the Shopify segment filters):
  2026-summer-csa        ← Summer Veg + Flex CSA buyers
  2026-flower-csa        ← Flower CSA buyers (NEW — adds it; flower segment
                            will filter on it once built)

The script is IDEMPOTENT — re-running adds nothing if tags are already in
place. It is also SAFE — it only ADDS tags, never removes them.

USAGE
-----
  --dry-run     (default) Print what WOULD change, no writes
  --commit      Actually write the tag updates

We can put this on a daily cron (or run it before any segment-based campaign)
to guarantee no customer is silently excluded.
"""
import argparse
import os
import sys
import time
import requests
from dotenv import load_dotenv

ROOT = "/Users/samanthapollack/Documents/TIny_Seed_OS"
load_dotenv(f"{ROOT}/.env.csa")
load_dotenv(f"{ROOT}/mcp-server/.env")

STORE = os.environ["SHOPIFY_STORE_NAME"]
TOK = os.environ["SHOPIFY_ACCESS_TOKEN"]
SUPABASE_URL = os.environ["SUPABASE_URL"].rstrip("/")
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

GQL = f"https://{STORE}.myshopify.com/admin/api/2024-10/graphql.json"
SHOP_H = {"X-Shopify-Access-Token": TOK, "Content-Type": "application/json", "User-Agent": "TinySeedTagSync/1.0"}
SB_H = {"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}", "Content-Type": "application/json"}

# Map Supabase share_type → canonical Shopify tag
SHARE_TYPE_TO_TAG = {
    "summer_veg": "2026-summer-csa",
    "flex": "2026-summer-csa",         # flex buyers should also get the summer-csa tag (same email)
    "flower": "2026-flower-csa",
}

TEST_EXCLUDES = {
    "freetodd21@gmail.com",
    "fakeemailsofake@gmail.com",
    "test@test.com",
    "tinyseedcsa@gmail.com",
}


def gql(query, variables=None, retry=3):
    for i in range(retry):
        r = requests.post(GQL, headers=SHOP_H, json={"query": query, "variables": variables or {}}, timeout=30)
        if r.status_code == 200:
            data = r.json()
            if "errors" in data:
                # Throttled? Sleep + retry
                if any("THROTTLED" in str(e).upper() for e in data["errors"]):
                    time.sleep(2 ** i)
                    continue
                raise RuntimeError(f"GraphQL error: {data['errors']}")
            return data["data"]
        time.sleep(1)
    raise RuntimeError(f"GraphQL failed after {retry} retries: {r.status_code}")


def get_supabase_active_members():
    """Pull all active CSA members + their customer rows from Supabase."""
    # Members
    members_url = f"{SUPABASE_URL}/rest/v1/members?status=eq.active&select=customer_id,share_type,share_size,season"
    r = requests.get(members_url, headers=SB_H, timeout=30)
    r.raise_for_status()
    members = r.json()
    # Customers (the ones referenced)
    customer_ids = list({m["customer_id"] for m in members if m.get("customer_id")})
    by_cust = {}
    for i in range(0, len(customer_ids), 100):
        batch = customer_ids[i:i + 100]
        in_list = ",".join(f'"{cid}"' for cid in batch)
        url = f"{SUPABASE_URL}/rest/v1/customers?id=in.({in_list})&select=id,email,contact_name,shopify_customer_id"
        cr = requests.get(url, headers=SB_H, timeout=30)
        cr.raise_for_status()
        for c in cr.json():
            by_cust[c["id"]] = c
    # Group: email → set of canonical tags it should have
    needed = {}
    for m in members:
        cust = by_cust.get(m["customer_id"])
        if not cust:
            continue
        email = (cust.get("email") or "").lower()
        if not email or email in TEST_EXCLUDES:
            continue
        tag = SHARE_TYPE_TO_TAG.get(m["share_type"])
        if not tag:
            continue  # spring_veg, add_on don't get a launch-email tag
        needed.setdefault(email, {"tags": set(), "customer": cust})["tags"].add(tag)
    return needed


def get_shopify_customer_by_email(email):
    """Fetch a Shopify customer record by email."""
    q = """
    query($q: String!) {
      customers(first: 1, query: $q) {
        edges { node { id email firstName lastName tags emailMarketingConsent { marketingState } } }
      }
    }
    """
    data = gql(q, {"q": f"email:{email}"})
    edges = (data.get("customers") or {}).get("edges", [])
    return edges[0]["node"] if edges else None


def add_tags(customer_gid, tags_to_add, commit=False):
    """Add one or more tags to a customer (idempotent)."""
    if not tags_to_add:
        return True
    if not commit:
        return True
    q = """
    mutation($id: ID!, $tags: [String!]!) {
      tagsAdd(id: $id, tags: $tags) {
        userErrors { field message }
        node { id }
      }
    }
    """
    data = gql(q, {"id": customer_gid, "tags": list(tags_to_add)})
    errs = data.get("tagsAdd", {}).get("userErrors", [])
    if errs:
        raise RuntimeError(f"tagsAdd userErrors: {errs}")
    return True


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--commit", action="store_true", help="actually write tags (default dry-run)")
    ap.add_argument("--limit", type=int, default=None, help="for testing — only process first N customers")
    args = ap.parse_args()
    commit = args.commit

    print("=" * 78)
    print(f"  CSA TAG SYNC — {'COMMIT' if commit else 'DRY-RUN'}")
    print("=" * 78)
    print()
    print("→ Loading active CSA members from Supabase...")
    needed = get_supabase_active_members()
    print(f"  {len(needed)} unique customers should have one or more launch-email tags")
    summer_only = sum(1 for v in needed.values() if v["tags"] == {"2026-summer-csa"})
    flower_only = sum(1 for v in needed.values() if v["tags"] == {"2026-flower-csa"})
    both = sum(1 for v in needed.values() if v["tags"] == {"2026-summer-csa", "2026-flower-csa"})
    print(f"      ├─ summer/flex only: {summer_only}")
    print(f"      ├─ flower only:      {flower_only}")
    print(f"      └─ both:             {both}")
    print()

    print("→ Checking each customer in Shopify and adding missing tags...")
    added_log = []
    already_log = []
    not_found_log = []
    unsubscribed_log = []
    count = 0

    items = list(needed.items())
    if args.limit:
        items = items[:args.limit]

    for email, info in items:
        count += 1
        if count % 20 == 0:
            print(f"  ...processed {count}/{len(items)}")
        shop_cust = get_shopify_customer_by_email(email)
        if not shop_cust:
            not_found_log.append(email)
            continue
        current_tags = set(shop_cust.get("tags", []))
        missing = info["tags"] - current_tags
        sub_state = (shop_cust.get("emailMarketingConsent") or {}).get("marketingState", "?")
        if not missing:
            already_log.append((email, sub_state))
            continue
        try:
            add_tags(shop_cust["id"], missing, commit=commit)
            added_log.append((email, shop_cust["firstName"], shop_cust["lastName"], list(missing), sub_state))
        except Exception as e:
            print(f"  ⚠ tagsAdd failed for {email}: {e}")

    print()
    print("=" * 78)
    print("  REPORT")
    print("=" * 78)
    print(f"  Customers already correctly tagged: {len(already_log)}")
    print(f"  Customers needing tag added:        {len(added_log)}")
    print(f"  Customers not found in Shopify:     {len(not_found_log)}")
    print()
    if added_log:
        print(f"  {'COMMITTED' if commit else 'WOULD ADD'} the following tags:")
        for email, fn, ln, tags, sub in added_log:
            flag = "🚫NOT_SUB" if sub != "SUBSCRIBED" else "📧 OK     "
            print(f"    {flag}  {(fn or '?'):15s} {(ln or ''):15s} {email:35s} +{','.join(tags)}")
        print()
    if not_found_log:
        print("  Not found in Shopify (Supabase row exists, but no Shopify customer record):")
        for email in not_found_log:
            print(f"    ✗ {email}")
        print()
    if not commit and added_log:
        print(f"  >>> {len(added_log)} customers would receive tags. Run with --commit to apply.")
    elif commit and added_log:
        print(f"  >>> Applied tags to {len(added_log)} customers.")
    else:
        print("  >>> Nothing to change. All customers correctly tagged.")
    print()


if __name__ == "__main__":
    main()
