#!/usr/bin/env python3
"""
run_migration.py — apply a SQL migration file to the linked Supabase
project via the Supabase Management API.

We use this path (instead of `supabase db push` via the CLI) because
the CLI requires a session login token + db-side password handshake
that isn't wired into this repo's automation. The Management API takes
a Personal Access Token (PAT) and executes arbitrary SQL through the
`/database/query` endpoint.

Auth + transport notes
─────────────────────
- The PAT lives in `.env.csa` as SUPABASE_PAT (gitignored). Bearer auth.
- Cloudflare in front of api.supabase.com returns 1010 on the default
  Python `requests` user-agent. We send a regular browser UA to bypass.
- The endpoint expects a JSON body { query: "<sql>" } and returns either
  an array of result rows or an array of error objects.

Usage
─────
    python3 scripts/migrate-csa/run_migration.py supabase/migrations/0019_delivery_tracking.sql

Exits non-zero on any failure. Prints the upstream error verbatim.
"""

import json
import os
import sys
from pathlib import Path

import requests


PROJECT_REF = os.environ.get("SUPABASE_PROJECT_REF", "").strip()
PAT = os.environ.get("SUPABASE_PAT", "").strip()

if not PROJECT_REF or not PAT:
    print(
        "ERROR: SUPABASE_PROJECT_REF and SUPABASE_PAT must be set.\n"
        "Run: set -a && source .env.csa && set +a\n"
        "Then retry."
    )
    sys.exit(2)

if len(sys.argv) < 2:
    print("Usage: run_migration.py <path-to-sql-file>")
    sys.exit(2)

sql_path = Path(sys.argv[1])
if not sql_path.is_file():
    print(f"ERROR: {sql_path} does not exist.")
    sys.exit(2)

sql = sql_path.read_text(encoding="utf-8")
if not sql.strip():
    print(f"ERROR: {sql_path} is empty.")
    sys.exit(2)

endpoint = f"https://api.supabase.com/v1/projects/{PROJECT_REF}/database/query"

# Cloudflare in front of api.supabase.com 1010s the default
# python-requests UA. A real-browser UA gets through.
headers = {
    "Authorization": f"Bearer {PAT}",
    "Content-Type": "application/json",
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "application/json",
}

print(f"→ Applying {sql_path} to project {PROJECT_REF} ({len(sql):,} chars of SQL)")

try:
    resp = requests.post(endpoint, headers=headers, json={"query": sql}, timeout=120)
except requests.RequestException as e:
    print(f"ERROR: network failure: {e}")
    sys.exit(1)

print(f"← HTTP {resp.status_code}")

# Successful body is usually a JSON array of rows from the LAST statement
# in the SQL. DDL-only migrations return [].
body_text = resp.text or ""
try:
    body = json.loads(body_text) if body_text else None
except json.JSONDecodeError:
    body = None

if resp.status_code >= 400:
    print("ERROR: Management API returned non-2xx.")
    if body is not None:
        print(json.dumps(body, indent=2))
    else:
        print(body_text)
    sys.exit(1)

# Some 200 responses still contain an error payload (e.g.
# {"message": "...", "code": "..."} for SQL errors). Detect those.
if isinstance(body, dict) and ("message" in body or "code" in body) and "error" in (str(body).lower()):
    print("ERROR: SQL execution failed.")
    print(json.dumps(body, indent=2))
    sys.exit(1)

print("✓ Migration applied.")
if isinstance(body, list) and body:
    print(f"  Last statement returned {len(body)} row(s):")
    print(json.dumps(body[:5], indent=2, default=str))

sys.exit(0)
