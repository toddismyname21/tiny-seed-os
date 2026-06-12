#!/usr/bin/env python3
"""
Who-hasn't-accessed-the-portal report + live table-existence check.

Uses the SERVICE ROLE key (local .env) to read the GROUND TRUTH from
Supabase Auth (auth.users.last_sign_in_at) — more accurate than the
admin dashboard's last_order_date proxy (which exists because the
RLS-scoped client cannot read auth.users).

Outputs: scripts/out/portal_access_report.csv  + console summary.
"""
import csv
import json
import os
import sys
import urllib.request
import urllib.error
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ENV = ROOT / ".env"
OUT = ROOT / "scripts" / "out" / "portal_access_report.csv"

TEST_EXCLUDES = {"test@test.com", "fakeemailsofake@gmail.com", "freetodd21@gmail.com"}
TEST_SUBSTR = ("fakeemail", "freetodd21", "test@test")


def load_env(path):
    env = {}
    for line in path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip().strip('"').strip("'")
    return env


env = load_env(ENV)
URL = env.get("PUBLIC_SUPABASE_URL") or env.get("SUPABASE_URL")
KEY = env.get("SUPABASE_SERVICE_ROLE_KEY")
if not URL or not KEY:
    sys.exit("Missing PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env")

HDRS = {"apikey": KEY, "Authorization": f"Bearer {KEY}", "Content-Type": "application/json"}


def req(path, headers=None):
    url = path if path.startswith("http") else f"{URL}{path}"
    r = urllib.request.Request(url, headers={**HDRS, **(headers or {})})
    try:
        with urllib.request.urlopen(r, timeout=60) as resp:
            return resp.status, json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()


# ── 0. Verify the flex/pickup tables actually exist live ──────────────
print("=== LIVE TABLE EXISTENCE CHECK ===")
for tbl in ("flex_inventory", "flex_orders", "pickup_locations", "members", "customers"):
    status, _ = req(f"/rest/v1/{tbl}?select=*&limit=1")
    verdict = "EXISTS" if status == 200 else f"MISSING/err (HTTP {status})"
    print(f"  {tbl:18} {verdict}")
print()

# ── 1. All auth users → email -> last_sign_in_at ──────────────────────
auth_map = {}
page = 1
while True:
    status, data = req(f"/auth/v1/admin/users?page={page}&per_page=1000")
    if status != 200 or not isinstance(data, dict):
        print(f"[auth] stop at page {page}: HTTP {status}", file=sys.stderr)
        break
    users = data.get("users", [])
    if not users:
        break
    for u in users:
        em = (u.get("email") or "").strip().lower()
        if em:
            auth_map[em] = u.get("last_sign_in_at")
    page += 1
print(f"Auth users fetched: {len(auth_map)}")

# ── 2. Active CSA members + customer email/name ───────────────────────
status, members = req(
    "/rest/v1/members"
    "?select=share_type,status,customer:customers(contact_name,email,phone,is_active)"
    "&status=eq.active"
)
if status != 200:
    sys.exit(f"members query failed HTTP {status}: {members}")
print(f"Active member rows: {len(members)}")

# ── 3. Collapse to one row per customer email ─────────────────────────
people = {}
for m in members:
    c = m.get("customer") or {}
    em = (c.get("email") or "").strip().lower()
    if not em or em in TEST_EXCLUDES or any(s in em for s in TEST_SUBSTR):
        continue
    rec = people.setdefault(em, {
        "name": c.get("contact_name") or "",
        "email": c.get("email") or em,
        "phone": c.get("phone") or "",
        "shares": set(),
    })
    rec["shares"].add(m.get("share_type") or "?")

# ── 4. Classify ───────────────────────────────────────────────────────
never = []
for em, rec in people.items():
    last = auth_map.get(em, "MISSING")  # MISSING = no auth account at all
    if last in (None, "MISSING", ""):
        rec["last_sign_in"] = "(never logged in)" if last in (None, "") else "(no portal account)"
        never.append(rec)

never.sort(key=lambda r: r["name"].lower())

OUT.parent.mkdir(parents=True, exist_ok=True)
with OUT.open("w", newline="") as f:
    w = csv.writer(f)
    w.writerow(["name", "email", "phone", "shares", "status"])
    for r in never:
        w.writerow([r["name"], r["email"], r["phone"], ",".join(sorted(r["shares"])), r["last_sign_in"]])

print()
print("=== PORTAL ACCESS SUMMARY ===")
print(f"  Active CSA customers (deduped, excl. test): {len(people)}")
print(f"  HAVE accessed the portal:                   {len(people) - len(never)}")
print(f"  Have NOT accessed the portal:               {len(never)}")
no_acct = sum(1 for r in never if r['last_sign_in'] == '(no portal account)')
print(f"     ├─ no portal account at all:             {no_acct}")
print(f"     └─ account exists but never logged in:   {len(never) - no_acct}")
print(f"\nReport written: {OUT}")
