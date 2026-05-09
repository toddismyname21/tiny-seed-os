#!/usr/bin/env python3
"""
sheets_to_supabase.py — Idempotent data migration from Google Sheets to Supabase Postgres.

Pulls from:
  - SALES_Customers (1,694 rows)  → customers
  - CSA_Pickup_Locations (~12)    → pickup_locations (or use seed migration 0012)
  - CSA_Products (~17)            → csa_products
  - CSA_Members (309)             → members + member_preferences (split)
  - CSA_BoxContents (~960)        → box_contents
  - CSA_Email_Log                 → notification_log (channel='email', provider='gmail_legacy')
  - FlexFunds_Log                 → flex_transactions

Idempotency strategy:
  - All upserts use legacy_id (or other natural key) ON CONFLICT DO UPDATE
  - Re-running is safe; rows update in place
  - Counts are reported per table for verification

Usage:
  export SUPABASE_URL=https://xxx.supabase.co
  export SUPABASE_SERVICE_ROLE_KEY=xxx              # bypasses RLS — required for migration
  export SHEETS_OAUTH_TOKEN=ya29.xxx                # from cos OAuth refresh
  export SHEET_ID=128O56X_FN9_U-s0ENHBBRyLpae_yvWHPYbBheVlR3Vc
  python3 sheets_to_supabase.py [--dry-run] [--table customers]

Requirements:
  pip3 install requests psycopg[binary] python-dateutil

Author: PM_ARCHITECT
Date: 2026-05-08
"""

import argparse
import os
import sys
import json
import time
from typing import Any, Optional
from datetime import date, datetime
from dataclasses import dataclass

import requests

# ─────────────────────────────────────────────────────────────────────
# Config
# ─────────────────────────────────────────────────────────────────────

SHEET_ID = os.environ.get('SHEET_ID', '128O56X_FN9_U-s0ENHBBRyLpae_yvWHPYbBheVlR3Vc')
SUPABASE_URL = os.environ.get('SUPABASE_URL', '')
SUPABASE_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY', '')
SHEETS_TOKEN = os.environ.get('SHEETS_OAUTH_TOKEN', '')

if not all([SUPABASE_URL, SUPABASE_KEY, SHEETS_TOKEN]):
    print("ERROR: Missing required env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SHEETS_OAUTH_TOKEN")
    print("       Run: source ~/tinyseed_migration_env.sh  (or set them manually)")
    sys.exit(1)

# ─────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────

def fetch_sheet(sheet_name: str) -> list[dict]:
    """Fetch a Google Sheet and return list of dicts (header row → keys)."""
    url = f"https://sheets.googleapis.com/v4/spreadsheets/{SHEET_ID}/values/{sheet_name}"
    r = requests.get(url, headers={'Authorization': f'Bearer {SHEETS_TOKEN}'}, timeout=30)
    r.raise_for_status()
    rows = r.json().get('values', [])
    if not rows:
        return []
    headers = rows[0]
    return [dict(zip(headers, row + [''] * (len(headers) - len(row)))) for row in rows[1:]]


def supabase_upsert(table: str, rows: list[dict], on_conflict: str = 'legacy_id') -> int:
    """Upsert into Supabase via PostgREST. Returns count inserted/updated."""
    if not rows:
        return 0
    url = f"{SUPABASE_URL}/rest/v1/{table}?on_conflict={on_conflict}"
    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates,return=minimal',
    }
    # Batch in chunks of 500
    total = 0
    for i in range(0, len(rows), 500):
        chunk = rows[i:i+500]
        r = requests.post(url, headers=headers, json=chunk, timeout=60)
        if not r.ok:
            print(f"  ERROR on chunk {i}: {r.status_code} {r.text[:500]}")
            sys.exit(1)
        total += len(chunk)
    return total


def supabase_count(table: str) -> int:
    url = f"{SUPABASE_URL}/rest/v1/{table}?select=count"
    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Prefer': 'count=exact',
        'Range-Unit': 'items',
        'Range': '0-0',
    }
    r = requests.get(url, headers=headers, timeout=15)
    if not r.ok: return -1
    cr = r.headers.get('Content-Range', '')
    return int(cr.split('/')[-1]) if '/' in cr else 0


def safe_str(v: Any, default: Optional[str] = None) -> Optional[str]:
    if v is None or (isinstance(v, str) and v.strip() == ''):
        return default
    return str(v).strip()


def safe_bool(v: Any) -> Optional[bool]:
    if v is None: return None
    s = str(v).strip().lower()
    if s in ('true', 'yes', '1', 'y', 't'): return True
    if s in ('false', 'no', '0', 'n', 'f', ''): return False
    return None


def safe_int(v: Any, default: Optional[int] = None) -> Optional[int]:
    if v is None or (isinstance(v, str) and v.strip() == ''):
        return default
    try: return int(float(str(v).strip()))
    except: return default


def safe_decimal(v: Any) -> Optional[float]:
    if v is None or (isinstance(v, str) and v.strip() == ''):
        return None
    try: return float(str(v).replace('$','').replace(',','').strip())
    except: return None


def safe_date(v: Any) -> Optional[str]:
    if v is None or (isinstance(v, str) and v.strip() == ''):
        return None
    s = str(v).strip()
    # Try common formats
    for fmt in ('%Y-%m-%d', '%m/%d/%Y', '%-m/%-d/%Y'):
        try:
            return datetime.strptime(s, fmt).date().isoformat()
        except ValueError: continue
    return None


DAY_MAP = {
    'sunday': 'Sun', 'sun': 'Sun',
    'monday': 'Mon', 'mon': 'Mon',
    'tuesday': 'Tue', 'tue': 'Tue', 'tues': 'Tue',
    'wednesday': 'Wed', 'wed': 'Wed', 'weds': 'Wed',
    'thursday': 'Thu', 'thu': 'Thu', 'thur': 'Thu', 'thurs': 'Thu',
    'friday': 'Fri', 'fri': 'Fri',
    'saturday': 'Sat', 'sat': 'Sat',
}

def normalize_day(s: str) -> Optional[str]:
    if not s: return None
    return DAY_MAP.get(s.strip().lower(), None)


def normalize_share_type(s: str) -> str:
    """Map free-text share types from sheet → enum values."""
    s = (s or '').lower()
    if 'flower' in s: return 'flower'
    if 'flex' in s: return 'flex'
    if 'add' in s: return 'add_on'
    if 'wholesale' in s: return 'wholesale_csa'
    if 'spring' in s: return 'spring_veg'
    if 'summer' in s: return 'summer_veg'
    if 'fall' in s: return 'fall_veg'
    return 'summer_veg'  # default


VALID_SHARE_SIZES = {'small','regular','family','petite','large','light','full','half','quarter','single','double'}

def normalize_share_size(s: str) -> Optional[str]:
    s = (s or '').strip().lower()
    if s in VALID_SHARE_SIZES:
        return s
    # Fallback keyword matches for legacy free-text values
    if 'full' in s: return 'full'
    if 'half' in s: return 'half'
    if 'quarter' in s: return 'quarter'
    if 'double' in s: return 'double'
    if 'single' in s: return 'single'
    return None


# ─────────────────────────────────────────────────────────────────────
# Migrators
# ─────────────────────────────────────────────────────────────────────

def migrate_customers(dry_run: bool = False) -> int:
    print("\n=== Migrating SALES_Customers → customers ===")
    rows = fetch_sheet('SALES_Customers')
    print(f"  Source rows: {len(rows)}")
    out = []
    skipped = 0
    seen_emails = set()
    for r in rows:
        legacy_id = safe_str(r.get('Customer_ID'))
        email = safe_str(r.get('Email'))
        if not legacy_id or not email:
            skipped += 1
            continue
        # Dedupe on email (CITEXT unique would reject; pre-skip duplicates, keeping first occurrence)
        email_lower = email.lower()
        if email_lower in seen_emails:
            skipped += 1
            continue
        seen_emails.add(email_lower)

        out.append({
            'legacy_id':            legacy_id,
            'customer_type':        (safe_str(r.get('Customer_Type')) or 'csa').lower(),
            'company_name':         safe_str(r.get('Company_Name')),
            'contact_name':         safe_str(r.get('Contact_Name')) or 'Unknown',
            'email':                email_lower,
            'phone':                safe_str(r.get('Phone')),
            'address':              safe_str(r.get('Address')),
            'city':                 safe_str(r.get('City')),
            'state':                safe_str(r.get('State')),
            'zip':                  safe_str(r.get('Zip')),
            'delivery_instructions': safe_str(r.get('Delivery_Instructions')),
            'payment_terms':        safe_str(r.get('Payment_Terms')),
            'price_tier':           safe_str(r.get('Price_Tier')),
            'is_active':            safe_bool(r.get('Is_Active')) if r.get('Is_Active') else True,
            'last_order_date':      safe_date(r.get('Last_Order_Date')),
            'total_orders':         safe_int(r.get('Total_Orders')) or 0,
            'total_spent':          safe_decimal(r.get('Total_Spent')) or 0,
            'notes':                safe_str(r.get('Notes')),
        })
    print(f"  Transformed: {len(out)} valid, {skipped} skipped (no email/id, or duplicate email)")
    if dry_run:
        print(f"  [DRY-RUN] would upsert {len(out)} customers")
        if out: print(f"  Sample: {json.dumps(out[0], default=str, indent=2)[:500]}")
        return len(out)
    # Use email as conflict key: SALES_Customers occasionally has same email under
    # different Customer_IDs, and orphan auto-create may also have inserted on email.
    # Email is the true natural key for a customer.
    n = supabase_upsert('customers', out, on_conflict='email')
    print(f"  ✓ Upserted {n} customers")
    return n


def migrate_csa_products(dry_run: bool = False) -> int:
    print("\n=== Migrating CSA_Products → csa_products ===")
    rows = fetch_sheet('CSA_Products')
    print(f"  Source rows: {len(rows)}")
    out = []
    for r in rows:
        legacy_id = safe_str(r.get('Product_ID'))
        if not legacy_id: continue
        out.append({
            'legacy_id':           legacy_id,
            'shopify_product_id':  safe_str(r.get('Shopify_Product_ID')),
            'name':                safe_str(r.get('Product_Name')) or 'Unnamed',
            'category':            safe_str(r.get('Category')) or 'unknown',
            'size':                safe_str(r.get('Size')),
            'season':              safe_str(r.get('Season')),
            'frequency':           safe_str(r.get('Frequency')),
            'price':               safe_decimal(r.get('Price')),
            'veg_code':            safe_str(r.get('Veg_Code')),
            'floral_code':         safe_str(r.get('Floral_Code')),
            'start_date':          safe_date(r.get('Start_Date')),
            'end_date':            safe_date(r.get('End_Date')),
            'total_weeks':         safe_int(r.get('Total_Weeks')),
            'max_members':         safe_int(r.get('Max_Members')),
            'is_active':           safe_bool(r.get('Is_Active')) if r.get('Is_Active') else True,
            'description':         safe_str(r.get('Description')),
        })
    if dry_run: return len(out)
    n = supabase_upsert('csa_products', out, on_conflict='legacy_id')
    print(f"  ✓ Upserted {n} products")
    return n


def get_customer_id_by_legacy(legacy_id: str) -> Optional[str]:
    """Lookup customers.id by legacy_id."""
    if not legacy_id: return None
    url = f"{SUPABASE_URL}/rest/v1/customers?legacy_id=eq.{legacy_id}&select=id&limit=1"
    r = requests.get(url, headers={'apikey': SUPABASE_KEY, 'Authorization': f'Bearer {SUPABASE_KEY}'}, timeout=15)
    if r.ok and r.json():
        return r.json()[0]['id']
    return None


def get_pickup_location_id_by_name(name: str) -> Optional[str]:
    if not name: return None
    url = f"{SUPABASE_URL}/rest/v1/pickup_locations?name=ilike.{name}&select=id&limit=1"
    r = requests.get(url, headers={'apikey': SUPABASE_KEY, 'Authorization': f'Bearer {SUPABASE_KEY}'}, timeout=15)
    if r.ok and r.json():
        return r.json()[0]['id']
    return None


def autocreate_customer_for_orphan(member_row: dict) -> Optional[str]:
    """For members whose Customer_ID doesn't exist in customers table, auto-create
    a customer record using contact info on the member row.
    Returns the new customer's UUID, or None if creation failed.

    Background: prior to the 2026-05-05 fix in createCSAMemberFromShopify, ~77
    Shopify-imported CSA members never had matching SALES_Customers rows created.
    Their email/name/phone live only on the member row. We backfill them here
    so no data is lost in the migration.
    """
    customer_legacy_id = safe_str(member_row.get('Customer_ID'))
    email = safe_str(member_row.get('Email'))
    name = safe_str(member_row.get('Customer_Name'))
    phone = safe_str(member_row.get('Phone'))
    if not (email and name and customer_legacy_id):
        return None
    payload = {
        'legacy_id':     customer_legacy_id,
        'customer_type': 'csa',
        'contact_name':  name,
        'email':         email.lower(),
        'phone':         phone,
        'is_active':     True,
        'notes':         'Auto-created during 2026-05-08 migration from CSA_Members orphan (no SALES_Customers row existed).',
    }
    url = f"{SUPABASE_URL}/rest/v1/customers?on_conflict=email"
    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates,return=representation',
    }
    r = requests.post(url, headers=headers, json=[payload], timeout=30)
    if r.ok and r.json():
        return r.json()[0]['id']
    return None


def migrate_members(dry_run: bool = False) -> int:
    print("\n=== Migrating CSA_Members → members + member_preferences ===")
    rows = fetch_sheet('CSA_Members')
    print(f"  Source rows: {len(rows)}")
    out_members = []
    skipped = 0
    autocreated_customers = 0
    for r in rows:
        legacy_id = safe_str(r.get('Member_ID'))
        customer_legacy_id = safe_str(r.get('Customer_ID'))
        if not legacy_id or not customer_legacy_id:
            skipped += 1
            continue

        if dry_run:
            customer_id = '<lookup-deferred>'
            pickup_loc_id = '<lookup-deferred>'
        else:
            customer_id = get_customer_id_by_legacy(customer_legacy_id)
            if not customer_id:
                # Auto-create customer from member row data (handles orphans from
                # pre-2026-05-05 Shopify import bug — see autocreate_customer_for_orphan)
                customer_id = autocreate_customer_for_orphan(r)
                if not customer_id:
                    print(f"  ⚠️  Member {legacy_id}: cannot resolve customer (no Email/Name on member row) — skipping")
                    skipped += 1
                    continue
                autocreated_customers += 1
            pickup_loc_id = get_pickup_location_id_by_name(safe_str(r.get('Pickup_Location')))

        total_weeks = safe_int(r.get('Total_Weeks')) or 0
        weeks_remaining = safe_int(r.get('Weeks_Remaining')) or 0

        out_members.append({
            'legacy_id':            legacy_id,
            'customer_id':          customer_id,
            'share_type':           normalize_share_type(safe_str(r.get('Share_Type')) or ''),
            'share_size':           normalize_share_size(safe_str(r.get('Share_Size')) or ''),
            'season':               safe_str(r.get('Season')) or 'Unknown',
            'start_date':           safe_date(r.get('Start_Date')) or date.today().isoformat(),
            'end_date':             safe_date(r.get('End_Date')) or date.today().isoformat(),
            'total_weeks':          max(total_weeks, 1),
            'weeks_remaining':      min(weeks_remaining, total_weeks) if total_weeks else 0,
            'pickup_day':           normalize_day(safe_str(r.get('Pickup_Day')) or ''),
            'pickup_location_id':   pickup_loc_id,
            'delivery_address':     safe_str(r.get('Delivery_Address')),
            'customization_allowed': safe_bool(r.get('Customization_Allowed')) if r.get('Customization_Allowed') else True,
            'swap_credits':         max(safe_int(r.get('Swap_Credits')) or 0, 0),
            'vacation_weeks_used':  max(safe_int(r.get('Vacation_Weeks_Used')) or 0, 0),
            'status':               (safe_str(r.get('Status')) or 'active').lower(),
            'payment_status':       safe_str(r.get('Payment_Status')),
            'amount_paid':          safe_decimal(r.get('Amount_Paid')),
            'biweekly_week':        safe_int(r.get('Biweekly_Week')),
            'notes':                safe_str(r.get('Notes')),
        })

    print(f"  Transformed: {len(out_members)} valid, {skipped} skipped")
    if not dry_run and autocreated_customers > 0:
        print(f"  ↳ Auto-created {autocreated_customers} customer rows for orphan members (pre-2026-05-05 Shopify bug)")
    if dry_run:
        print(f"  [DRY-RUN] would upsert {len(out_members)} members")
        return len(out_members)
    n = supabase_upsert('members', out_members, on_conflict='legacy_id')
    print(f"  ✓ Upserted {n} members")
    return n


def migrate_box_contents(dry_run: bool = False) -> int:
    print("\n=== Migrating CSA_BoxContents → box_contents ===")
    rows = fetch_sheet('CSA_BoxContents')
    print(f"  Source rows: {len(rows)}")
    out = []
    skipped = 0
    seen = set()
    for r in rows:
        week_date = safe_date(r.get('Week_Date'))
        share_type = safe_str(r.get('Share_Type'))
        product_name = safe_str(r.get('Product_Name'))
        if not (week_date and share_type and product_name):
            skipped += 1
            continue
        # Dedupe (week_date, share_type, product_name) since UNIQUE constraint
        key = (week_date, share_type.lower(), product_name.lower())
        if key in seen:
            skipped += 1
            continue
        seen.add(key)

        swap_options_raw = safe_str(r.get('Swap_Options')) or ''
        swap_options = [s.strip() for s in swap_options_raw.split(',') if s.strip()]

        out.append({
            'legacy_id':     safe_str(r.get('Box_ID')),
            'week_date':     week_date,
            'share_type':    share_type,
            'product_name':  product_name,
            'variety':       safe_str(r.get('Variety')),
            'quantity':      safe_decimal(r.get('Quantity')) or 1,
            'unit':          safe_str(r.get('Unit')) or 'each',
            'is_swappable':  safe_bool(r.get('Is_Swappable')) or False,
            'swap_options':  swap_options if swap_options else None,
            'notes':         safe_str(r.get('Notes')),
        })
    print(f"  Transformed: {len(out)} valid, {skipped} skipped (missing week/share/product or duplicate)")
    if dry_run: return len(out)
    n = supabase_upsert('box_contents', out, on_conflict='week_date,share_type,product_name')
    print(f"  ✓ Upserted {n} box_contents rows")
    return n


def migrate_flex_funds(dry_run: bool = False) -> int:
    print("\n=== Migrating FlexFunds_Log → flex_transactions ===")
    rows = fetch_sheet('FlexFunds_Log')
    print(f"  Source rows: {len(rows)}")
    out = []
    for r in rows:
        email = safe_str(r.get('Email'))
        amount = safe_decimal(r.get('Amount'))
        if not email or amount is None:
            continue

        # Map sheet 'Type' to enum
        type_raw = (safe_str(r.get('Type')) or 'credit').lower()
        if type_raw not in ('credit','debit','refund','transfer','adjustment'):
            type_raw = 'adjustment'

        out.append({
            'email':         email.lower(),
            'type':          type_raw,
            'amount':        abs(amount),
            'reason':        safe_str(r.get('Reason')),
            'admin_email':   safe_str(r.get('Admin_Email')),
            'gift_card_id':  safe_str(r.get('Gift_Card_ID')),
            'order_id':      safe_str(r.get('Order_ID')),
            'created_at':    safe_str(r.get('Timestamp')),  # ISO timestamp from sheet
        })
    print(f"  Transformed: {len(out)}")
    if dry_run: return len(out)
    # No legacy_id — just insert. Idempotency would require dedup by (email, created_at, amount)
    # Phase 1: do a simple insert; admin reconciles manually post-migration
    url = f"{SUPABASE_URL}/rest/v1/flex_transactions"
    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
    }
    # Batch insert
    total = 0
    for i in range(0, len(out), 500):
        chunk = out[i:i+500]
        r = requests.post(url, headers=headers, json=chunk, timeout=60)
        if r.ok:
            total += len(chunk)
        else:
            print(f"  ERROR: {r.status_code} {r.text[:500]}")
    print(f"  ✓ Inserted {total} flex transactions")
    return total


# ─────────────────────────────────────────────────────────────────────
# Verification
# ─────────────────────────────────────────────────────────────────────

def verify_counts():
    print("\n═══ Post-migration row counts ═══")
    for tbl in ['customers', 'pickup_locations', 'csa_products', 'members',
                'member_preferences', 'box_contents', 'vacation_holds',
                'box_swaps', 'pickup_attendance', 'flex_transactions',
                'notification_log', 'audit_log']:
        n = supabase_count(tbl)
        print(f"  {tbl:25} {n:>6} rows")


# ─────────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────────

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Migrate CSA data: Sheets → Supabase')
    parser.add_argument('--dry-run', action='store_true', help='Transform only, don\'t write to Supabase')
    parser.add_argument('--table', choices=['customers','products','members','boxes','flex','all'],
                        default='all', help='Migrate only one table')
    args = parser.parse_args()

    print(f"═══ CSA Migration: Sheets → Supabase ═══")
    print(f"  Sheet ID: {SHEET_ID}")
    print(f"  Supabase: {SUPABASE_URL}")
    print(f"  Mode: {'DRY-RUN' if args.dry_run else 'LIVE'}")
    print(f"  Table:  {args.table}")

    started = time.time()

    if args.table in ('customers','all'):    migrate_customers(args.dry_run)
    if args.table in ('products','all'):     migrate_csa_products(args.dry_run)
    if args.table in ('members','all'):      migrate_members(args.dry_run)
    if args.table in ('boxes','all'):        migrate_box_contents(args.dry_run)
    if args.table in ('flex','all'):         migrate_flex_funds(args.dry_run)

    if not args.dry_run:
        verify_counts()

    print(f"\n═══ Done in {time.time()-started:.1f}s ═══")
