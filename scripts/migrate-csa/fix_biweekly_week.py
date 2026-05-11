#!/usr/bin/env python3
"""
fix_biweekly_week.py — Backfill members.biweekly_week from CSA_Members sheet.

Background:
  The 2026-05-08 migration converted CSA_Members.Biweekly_Week (string-valued
  'A' / 'BOTH' / empty) through `safe_int()`, which produced NULL for every
  non-numeric value. 100% of biweekly_week landed in Postgres as NULL.

  Migration 0018 changed the column type from INT to TEXT('A'|'B'|NULL).
  This script re-reads the source sheet and UPDATEs Postgres members rows
  based on the source Biweekly_Week column.

Mapping (per Todd, farm owner, 2026-05-11):
  'A'                 → 'A'    (already assigned to Week A)
  'BOTH'              → NULL   (legacy "subscriber pending A/B choice")
  ''   (empty)        → NULL   (not yet assigned)
  anything else       → NULL   (logged as warning)

Key matching: source `Member_ID` → Postgres `legacy_id`.

Usage:
  python3 scripts/migrate-csa/fix_biweekly_week.py [--dry-run]

Idempotent: re-running with the same sheet contents produces no further
changes.
"""
import argparse
import json
import os
import sys
import subprocess
import urllib.request
import urllib.error
from collections import Counter

# ─────────────────────────────────────────────────────────────────────
# Config
# ─────────────────────────────────────────────────────────────────────
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ENV_PATH = os.path.join(ROOT, '.env.csa')

def load_env(path):
    out = {}
    with open(path) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith('#') or '=' not in line:
                continue
            k, v = line.split('=', 1)
            out[k] = v
    return out

env = load_env(ENV_PATH)
SUPABASE_URL = env['SUPABASE_URL']
SUPABASE_KEY = env['SUPABASE_SERVICE_ROLE_KEY']
SHEET_ID = env.get('SHEET_ID', '128O56X_FN9_U-s0ENHBBRyLpae_yvWHPYbBheVlR3Vc')

# ─────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────
def get_sheets_token() -> str:
    """Refresh & return a Sheets OAuth access token using the cos helper."""
    r = subprocess.run(['python3', '/tmp/refresh_token.py'],
                       capture_output=True, text=True, check=True)
    line = r.stdout.strip()
    return line.split('=', 1)[1]

def fetch_csa_members(token: str) -> list[dict]:
    url = f'https://sheets.googleapis.com/v4/spreadsheets/{SHEET_ID}/values/CSA_Members'
    req = urllib.request.Request(url, headers={'Authorization': f'Bearer {token}'})
    resp = urllib.request.urlopen(req, timeout=30)
    data = json.loads(resp.read())
    rows = data['values']
    headers = rows[0]
    out = []
    for r in rows[1:]:
        # pad short rows
        padded = r + [''] * (len(headers) - len(r))
        out.append(dict(zip(headers, padded)))
    return out

def map_biweekly(raw: str) -> tuple[str | None, str]:
    """Return (postgres_value, classification_tag).

    classification_tag is one of: 'A', 'B', 'BOTH', 'EMPTY', 'OTHER'.
    """
    v = (raw or '').strip().upper()
    if v == 'A':    return ('A',   'A')
    if v == 'B':    return ('B',   'B')
    if v == 'BOTH': return (None,  'BOTH')
    if v == '':     return (None,  'EMPTY')
    return (None, 'OTHER')

def supabase_patch(legacy_id: str, biweekly_value: str | None) -> bool:
    """PATCH a single row in members by legacy_id. Returns True on success."""
    url = f'{SUPABASE_URL}/rest/v1/members?legacy_id=eq.{urllib.request.quote(legacy_id)}'
    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
    }
    body = json.dumps({'biweekly_week': biweekly_value}).encode()
    req = urllib.request.Request(url, data=body, headers=headers, method='PATCH')
    try:
        urllib.request.urlopen(req, timeout=20)
        return True
    except urllib.error.HTTPError as e:
        msg = e.read().decode()[:200]
        print(f'  PATCH {legacy_id} -> {biweekly_value!r} FAILED: {e.code} {msg}')
        return False

def fetch_pg_legacy_ids() -> set[str]:
    """Pull all members.legacy_id values from Postgres (so we can detect
    source rows that don't match a Postgres row)."""
    url = f'{SUPABASE_URL}/rest/v1/members?select=legacy_id&limit=10000'
    headers = {'apikey': SUPABASE_KEY, 'Authorization': f'Bearer {SUPABASE_KEY}'}
    req = urllib.request.Request(url, headers=headers)
    resp = urllib.request.urlopen(req, timeout=30)
    data = json.loads(resp.read())
    return {row['legacy_id'] for row in data if row.get('legacy_id')}

# ─────────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description='Backfill biweekly_week from sheet')
    parser.add_argument('--dry-run', action='store_true', help='Plan only, no PATCH')
    args = parser.parse_args()

    print('═══ Backfill biweekly_week from CSA_Members ═══')
    print(f'  Sheet: {SHEET_ID}')
    print(f'  Supabase: {SUPABASE_URL}')
    print(f'  Mode: {"DRY-RUN" if args.dry_run else "LIVE"}')

    # 1. Refresh & fetch
    token = get_sheets_token()
    rows = fetch_csa_members(token)
    print(f'\n  Source rows: {len(rows)}')

    # 2. Existing Postgres legacy_ids
    pg_legacy = fetch_pg_legacy_ids()
    print(f'  Postgres members.legacy_id values: {len(pg_legacy)}')

    # 3. Plan
    plan: list[tuple[str, str | None, str]] = []  # (legacy_id, pg_val, tag)
    classification = Counter()
    no_match = []
    no_member_id = 0
    for r in rows:
        legacy_id = (r.get('Member_ID') or '').strip()
        if not legacy_id:
            no_member_id += 1
            continue
        if legacy_id not in pg_legacy:
            no_match.append(legacy_id)
            continue
        pg_val, tag = map_biweekly(r.get('Biweekly_Week') or '')
        classification[tag] += 1
        plan.append((legacy_id, pg_val, tag))

    print(f'\n  Plan summary:')
    for tag, n in sorted(classification.items()):
        print(f'    {tag:6} → {n}')
    print(f'    no_member_id_in_source: {no_member_id}')
    print(f'    not_found_in_postgres: {len(no_match)}')
    if no_match[:5]:
        print(f'      sample missing legacy_ids: {no_match[:5]}')

    if args.dry_run:
        print('\n  [DRY-RUN] no writes performed')
        return 0

    # 4. Apply
    print('\n  Applying PATCHes...')
    set_a = 0; set_b = 0; set_null = 0; failed = 0
    for legacy_id, pg_val, tag in plan:
        ok = supabase_patch(legacy_id, pg_val)
        if not ok:
            failed += 1
            continue
        if pg_val == 'A':    set_a += 1
        elif pg_val == 'B':  set_b += 1
        else:                set_null += 1

    print(f'\n  RESULT:')
    print(f'    set to A      : {set_a}')
    print(f'    set to B      : {set_b}')
    print(f'    set to NULL   : {set_null}')
    print(f'    failed        : {failed}')
    print(f'    not in pg     : {len(no_match)}  (source rows with legacy_id we don\'t recognise)')
    print(f'    no Member_ID  : {no_member_id}  (source rows with blank Member_ID)')
    return 0 if failed == 0 else 1

if __name__ == '__main__':
    sys.exit(main())
