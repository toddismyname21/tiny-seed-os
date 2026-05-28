#!/usr/bin/env python3
"""
init_swap_credits.py — Initialize members.swap_credits + customization_allowed
for the 2026 CSA season (per CSA_OPERATIONS_ADMIN_SPEC.md §3.2).

Spec rule (the task brief, verbatim):
  • weekly large/small ⇒ 6
  • biweekly small/family ⇒ 3
  • customization_allowed = true for summer_veg, false for flex/flower/
    spring/add_on (swaps don't apply to those share types).

Reality reconciliation (per Todd 2026-05-11, encoded in migration 0018 +
src/lib/share-buckets.ts):
  EVERY active CSA member is bi-weekly. There are no weekly subscribers in
  2026. So a literal reading of the spec rule ("weekly ⇒ 6, biweekly ⇒ 3")
  would give every existing member 3 credits and 0 to nobody. That's
  obviously not what was intended — the spec's intent is clearly that the
  size bucket (large/family vs small) drives the credit count.

  Resolution (this script's actual behavior):
    summer_veg, share_size in {large, regular, family, full, double}  → 6
    summer_veg, share_size in {small, petite, light, half, quarter,
                               single}                                 → 3
    summer_veg, share_size NULL / unrecognised                         → 3
                              (conservative: the smaller bucket; admin
                               can bump via the member-detail page)
    all other share_types (spring_veg, fall_veg, flower, flex, add_on,
                           wholesale_csa)                              → 0

  customization_allowed:
    summer_veg  → true
    everything else → false

  This document MUST be flagged in the report to Todd so he can lock it
  into the spec.

Idempotency / overwrite policy:
  - summer_veg members: swap_credits is set UNCONDITIONALLY to the
    size-derived target (6 for large, 3 for small/unknown). The spec calls
    this an INITIALIZATION for the new operations system, so the legacy
    schema-default of 5 (from the old box_swaps system) is meant to be
    REPLACED, not preserved. Re-running the script is a no-op once
    members are at their target.
  - Non-summer members (flex, flower, spring, add_on, wholesale): we do
    NOT touch swap_credits at all. Those share types don't get swaps, but
    we also won't zap any admin-granted goodwill credits sitting on those
    rows.
  - customization_allowed is set to the target value unconditionally — it's
    a boolean derived purely from share_type, so re-running just re-asserts
    the same value (no drift risk).

Scope (matches spec intent — "active" shares):
  status IN ('active', 'paused', 'onboarding')

Usage:
  python3 scripts/migrate-csa/init_swap_credits.py            # dry-run (default)
  python3 scripts/migrate-csa/init_swap_credits.py --commit   # actually write
"""
import argparse
import json
import os
import sys
from collections import Counter

import requests


# ─────────────────────────────────────────────────────────────────────
# Config
# ─────────────────────────────────────────────────────────────────────
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ENV_PATH = os.path.join(ROOT, '.env.csa')


def load_env(path):
    out = {}
    if not os.path.isfile(path):
        print(f"ERROR: {path} not found. Run: set -a && source .env.csa && set +a")
        sys.exit(2)
    with open(path) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith('#') or '=' not in line:
                continue
            k, v = line.split('=', 1)
            out[k] = v.strip().strip('"').strip("'")
    return out


env = load_env(ENV_PATH)
SUPABASE_URL = env.get('SUPABASE_URL', '').rstrip('/')
SERVICE_ROLE_KEY = env.get('SUPABASE_SERVICE_ROLE_KEY', '')

if not SUPABASE_URL or not SERVICE_ROLE_KEY:
    print("ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.csa")
    sys.exit(2)


# Mirrors the size-bucket logic in src/lib/share-buckets.ts so this script
# and the portal agree on what's "large" vs "small."
LARGE_SIZES = {'large', 'regular', 'family', 'full', 'double'}
SMALL_SIZES = {'small', 'petite', 'light', 'half', 'quarter', 'single'}

ELIGIBLE_STATUSES = {'active', 'paused', 'onboarding'}


def target_credits(share_type: str, share_size):
    """6 credits for large summer_veg, 3 for small/unknown summer_veg, 0
    for everything else. Documented in the module docstring."""
    if share_type != 'summer_veg':
        return 0
    if share_size in LARGE_SIZES:
        return 6
    # Small or NULL/unrecognised summer_veg → conservative 3.
    return 3


def target_customization(share_type: str) -> bool:
    """True only for summer_veg — the spec says swaps don't apply to
    flex/flower/spring/add_on/wholesale shares."""
    return share_type == 'summer_veg'


# ─────────────────────────────────────────────────────────────────────
# REST helpers (PostgREST via service-role)
# ─────────────────────────────────────────────────────────────────────
def headers():
    return {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': f'Bearer {SERVICE_ROLE_KEY}',
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
    }


def fetch_members():
    """Page through ALL eligible members. PostgREST defaults to 1000-row
    pages; we use Range headers to paginate."""
    rows = []
    page_size = 1000
    start = 0
    status_filter = ','.join(f'"{s}"' for s in ELIGIBLE_STATUSES)
    while True:
        url = (
            f'{SUPABASE_URL}/rest/v1/members'
            f'?select=id,share_type,share_size,status,swap_credits,customization_allowed,customer_id'
            f'&status=in.({status_filter})'
            f'&order=id.asc'
        )
        h = dict(headers())
        h['Range'] = f'{start}-{start + page_size - 1}'
        h['Range-Unit'] = 'items'
        h['Prefer'] = 'count=exact'
        r = requests.get(url, headers=h, timeout=60)
        r.raise_for_status()
        batch = r.json()
        rows.extend(batch)
        if len(batch) < page_size:
            break
        start += page_size
    return rows


def update_member(member_id: str, patch: dict):
    """PATCH a single member row via PostgREST."""
    url = f'{SUPABASE_URL}/rest/v1/members?id=eq.{member_id}'
    r = requests.patch(url, headers=headers(), json=patch, timeout=30)
    if not r.ok:
        raise RuntimeError(f'PATCH failed {r.status_code}: {r.text}')
    return r.json()


# ─────────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────────
def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--commit', action='store_true',
                    help='Actually write changes. Default is dry-run.')
    args = ap.parse_args()

    mode = 'COMMIT' if args.commit else 'DRY-RUN'
    print(f'→ init_swap_credits — mode: {mode}')
    print(f'→ Fetching eligible members (status in {sorted(ELIGIBLE_STATUSES)})…')

    members = fetch_members()
    print(f'  loaded {len(members)} members')

    # ─── Classify + decide ─────────────────────────────────────────
    credit_buckets = Counter()          # what we *want* members to end up with
    credit_actions = Counter()          # what we'll actually do (init / skip / unchanged)
    custom_actions = Counter()
    by_share_type = Counter()
    by_share_size = Counter()
    will_update = []  # list of (id, patch)
    sample_skips_initialized = []

    for m in members:
        share_type = m.get('share_type')
        share_size = m.get('share_size')
        current_credits = m.get('swap_credits') or 0
        current_custom = bool(m.get('customization_allowed'))

        by_share_type[share_type] += 1
        by_share_size[share_size or '(null)'] += 1

        want_credits = target_credits(share_type, share_size)
        want_custom = target_customization(share_type)

        credit_buckets[want_credits] += 1

        patch = {}

        # ── Credits ────────────────────────────────────────────────
        # summer_veg: UNCONDITIONAL set to the size-derived target. This
        #   is an initialization for the new ops system; the legacy 5 from
        #   the old box_swaps schema is meant to be replaced.
        # non-summer: NEVER touch swap_credits — those share types don't
        #   get swaps, and we don't want to zap any admin-granted goodwill.
        if share_type == 'summer_veg':
            if current_credits == want_credits:
                credit_actions['unchanged_correct'] += 1
            else:
                patch['swap_credits'] = want_credits
                credit_actions[f'init_{want_credits}'] += 1
                if current_credits > 0 and len(sample_skips_initialized) < 3:
                    sample_skips_initialized.append(
                        f'  · member {m["id"][:8]}… {share_type}/{share_size}: '
                        f'{current_credits} → {want_credits}'
                    )
        else:
            # Non-summer: leave alone regardless of current value.
            if current_credits > 0:
                credit_actions['preserved_nontarget'] += 1
            else:
                credit_actions['noop'] += 1

        # ── Customization: assert target. Boolean, derived from
        #                   share_type, no drift risk on re-run.
        if current_custom != want_custom:
            patch['customization_allowed'] = want_custom
            if want_custom:
                custom_actions['set_true'] += 1
            else:
                custom_actions['set_false'] += 1
        else:
            custom_actions['unchanged'] += 1

        if patch:
            will_update.append((m['id'], patch))

    # ─── Summary print ─────────────────────────────────────────────
    print()
    print('── Eligible members by share_type ────────────────────────────')
    for st, n in sorted(by_share_type.items(), key=lambda x: (-x[1], x[0] or '')):
        print(f'  {st or "(null)":15s}  {n:4d}')

    print()
    print('── Target credit buckets (regardless of action) ──────────────')
    for want, n in sorted(credit_buckets.items(), reverse=True):
        label = (
            'large summer_veg' if want == 6 else
            'small/unknown summer_veg' if want == 3 else
            'non-summer share (no credits)'
        )
        print(f'  {want} credits  →  {n:4d}  ({label})')
    total_credits_to_issue = sum(want * n for want, n in credit_buckets.items())
    print(f'  total credits if all initialized: {total_credits_to_issue}')

    print()
    print('── Credit actions (what this run will do) ────────────────────')
    for action, n in sorted(credit_actions.items()):
        print(f'  {action:25s}  {n:4d}')
    if sample_skips_initialized:
        print('  sample summer_veg overwrites (legacy credits → spec target):')
        for s in sample_skips_initialized:
            print(s)

    print()
    print('── customization_allowed actions ─────────────────────────────')
    for action, n in sorted(custom_actions.items()):
        print(f'  {action:25s}  {n:4d}')

    print()
    print(f'── {len(will_update)} member rows need an UPDATE in {mode} mode ──')

    if not args.commit:
        print()
        print('DRY-RUN: no writes made. Re-run with --commit to apply.')
        return 0

    # ─── COMMIT ─────────────────────────────────────────────────────
    print()
    print(f'Writing {len(will_update)} updates…')
    written = 0
    failed = 0
    for member_id, patch in will_update:
        try:
            update_member(member_id, patch)
            written += 1
            if written % 50 == 0:
                print(f'  …{written}/{len(will_update)}')
        except Exception as e:
            failed += 1
            print(f'  FAIL {member_id}: {e}', file=sys.stderr)
    print()
    print(f'✓ wrote {written} updates ({failed} failed)')

    # ─── Re-verify ─────────────────────────────────────────────────
    print()
    print('Re-fetching to verify…')
    after = fetch_members()
    after_credits = Counter(m.get('swap_credits') or 0 for m in after)
    print('  swap_credits distribution AFTER write:')
    for credits, n in sorted(after_credits.items(), reverse=True):
        print(f'    {credits} credits → {n} members')
    total_after = sum(c * n for c, n in after_credits.items())
    print(f'  total credits issued (sum): {total_after}')

    return 0 if failed == 0 else 1


if __name__ == '__main__':
    sys.exit(main())
