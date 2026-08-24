#!/usr/bin/env python3
"""
read_messages.py — READ-ONLY analyzer for the local macOS Messages database.

PHASE 0 of the text-commitment system (see docs/research/TEXT_SYSTEM_*.md).
Its ONLY job right now is to MEASURE: how well can we identify who texted Todd,
how much of the traffic is noise, and how much message text is recoverable.
No AI, no writes, no network sends. Decisions come after the numbers.

WHY THIS EXISTS
---------------
Todd runs the farm over text: chefs and CSA members text requests, he agrees,
and the promise is then held only in his head. Before building commitment
extraction we must know the match rate (can we tell WHO texted?) — because an
unattributed commitment is useless.

RELATIONSHIP TO sms_system/imessage_monitor.py
----------------------------------------------
That file is a NEVER-RUN daemon that forwards every message to a Google Apps
Script webhook (with a stale/wrong URL). This script is deliberately different:
strictly local, read-only, aggregate-first. It does not replace or import it.

SAFETY INVARIANTS (do not weaken these)
---------------------------------------
1. The database is opened `file:...?mode=ro` (URI read-only). We NEVER write to
   chat.db. Corrupting Todd's Messages store would be unrecoverable.
2. Message BODIES are never printed unless --show-text is passed explicitly.
   Default output is aggregates + phone numbers only.
3. Read-only connections DO see un-checkpointed WAL data provided the -wal/-shm
   files are readable (SQLite >= 3.22, sqlite.org/wal.html §5). Verified live:
   this Mac returns messages timestamped today.

USAGE
-----
    python3 scripts/read_messages.py stats
    python3 scripts/read_messages.py senders [--limit N] [--unmatched-only]

Requires Full Disk Access for the running terminal (already granted on this Mac).
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sqlite3
import sys
import urllib.request
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable, Optional

# ── Constants ────────────────────────────────────────────────────────────────

DB_PATH = Path.home() / "Library/Messages/chat.db"
ENV_PATH = Path(__file__).resolve().parent.parent / ".env.csa"

# Apple/Cocoa epoch: 2001-01-01T00:00:00Z as a Unix timestamp.
APPLE_EPOCH_OFFSET = 978_307_200

# `message.date` is nanoseconds since the Apple epoch on modern macOS, but older
# rows can carry second- or microsecond-resolution values. iLEAPP and
# imessage-exporter both test magnitude before dividing; we do the same.
NS_THRESHOLD = 1e15
US_THRESHOLD = 1e12

# associated_message_type values that mark a row as a tapback/reaction rather
# than real message content (imessage-exporter message.rs).
#   1000        = sticker/associated
#   2000..2007  = tapback added   (Loved/Liked/Disliked/Laughed/Emphasized/...)
#   3000..3007  = tapback removed
TAPBACK_TYPES = {1000} | set(range(2000, 2008)) | set(range(3000, 3008))

# typedstream decoding. `pytypedstream` provides the same decoder iLEAPP uses.
# Imported defensively so `stats` still runs (degraded) if it is not installed.
try:
    from typedstream.stream import TypedStreamReader
except ImportError:  # pragma: no cover
    TypedStreamReader = None  # type: ignore[assignment]

# Class names / attribute keys emitted by the typedstream that are never the
# message body itself.
TYPEDSTREAM_SKIP_PREFIXES = ("NS", "__k")
TYPEDSTREAM_NOISE = {
    "+", "streamtyped", "NSDictionary", "NSAttributedString",
    "NSObject", "NSString", "NSMutableString", "NSNumber", "NSValue",
}


# ── Phone normalization ──────────────────────────────────────────────────────
# Deliberately mirrors apps/csa-portal/src/lib/phone.ts (normalizeUSPhone) so
# that a number matched here matches identically in the portal. If that file's
# rules change, change these together.

def normalize_us_phone(value: Optional[str]) -> Optional[str]:
    """Return the canonical bare 10-digit US number, or None if not valid."""
    if not value:
        return None
    digits = re.sub(r"\D", "", str(value))

    # Drop a leading US country code on an 11-digit string.
    if len(digits) == 11 and digits.startswith("1"):
        digits = digits[1:]

    if len(digits) != 10:
        return None

    # NANP: area code and exchange code both start 2-9.
    if not ("2" <= digits[0] <= "9"):
        return None
    if not ("2" <= digits[3] <= "9"):
        return None

    return digits


def format_us_phone(digits: Optional[str]) -> str:
    if not digits or len(digits) != 10:
        return digits or "—"
    return f"({digits[:3]}) {digits[3:6]}-{digits[6:]}"


# ── attributedBody extraction ────────────────────────────────────────────────

def parse_attributed_body(blob: Optional[bytes]) -> Optional[str]:
    """
    Extract message text from the `attributedBody` BLOB.

    On this Mac (macOS 26) **99.7% of rows have a NULL `text` column** — the body
    lives in an NSAttributedString serialized with Apple's legacy `typedstream`
    format. Measured 2026-08-16: 1,748 of 1,754 messages required this path, and
    a naive byte-scan recovered 0% of them. A real decoder is mandatory.

    Strategy (validated against the 6 rows where `text` IS populated, so we have
    ground truth): decode the typedstream and take the FIRST string-ish event
    that is not a class name or attribute key. That is structurally correct —
    typedstream serializes the NSString contents *before* the attribute-run
    dictionaries. Both "first" and "longest" matched ground truth 6/6, but they
    disagree on 6.2% of the corpus, so we take the structurally-justified one.

    Note the decoder emits the payload as `bytes` events (not `str`), which is
    why both are handled below — missing that yields a silent 0% recovery rate.

    Falls back to the legacy byte-scan if typedstream is unavailable/raises.
    """
    if not blob:
        return None

    if TypedStreamReader is not None:
        try:
            for event in TypedStreamReader.from_data(blob):
                value: Optional[str] = None
                if isinstance(event, str):
                    value = event
                elif isinstance(event, bytes):
                    try:
                        value = event.decode("utf-8")
                    except UnicodeDecodeError:
                        value = None
                if not value:
                    continue
                if value.startswith(TYPEDSTREAM_SKIP_PREFIXES):
                    continue
                if value in TYPEDSTREAM_NOISE:
                    continue
                cleaned = value.strip()
                if cleaned:
                    return cleaned
        except Exception:
            # Corrupt/unsupported blob — fall through to the legacy scan.
            pass

    for marker in (b"NSString", b"NSMutableString"):
        pos = blob.find(marker)
        if pos == -1:
            continue
        pos += len(marker)

        # Skip the short binary preamble that follows the class name.
        while pos < len(blob) and blob[pos] < 0x20 and blob[pos] != 0:
            pos += 1
        if pos >= len(blob):
            continue

        length_byte = blob[pos]
        if length_byte == 0x81 and pos + 3 <= len(blob):
            length = int.from_bytes(blob[pos + 1:pos + 3], "little")
            pos += 3
        elif length_byte == 0x82 and pos + 4 <= len(blob):
            length = int.from_bytes(blob[pos + 1:pos + 4], "little")
            pos += 4
        elif length_byte < 0x80:
            length = length_byte
            pos += 1
        else:
            continue

        if length <= 0 or pos + length > len(blob):
            continue

        try:
            text = blob[pos:pos + length].decode("utf-8")
        except UnicodeDecodeError:
            text = blob[pos:pos + length].decode("utf-8", errors="ignore")

        text = text.strip()
        if text:
            return text

    return None


# ── Database access ──────────────────────────────────────────────────────────

def open_db() -> sqlite3.Connection:
    """Open chat.db strictly read-only. Never opened for write."""
    if not DB_PATH.exists():
        sys.exit(f"ERROR: Messages database not found at {DB_PATH}")
    try:
        conn = sqlite3.connect(f"file:{DB_PATH}?mode=ro", uri=True, timeout=15)
    except sqlite3.OperationalError as exc:
        sys.exit(
            f"ERROR: cannot open {DB_PATH}: {exc}\n"
            "This usually means Full Disk Access is not granted to this terminal."
        )
    conn.row_factory = sqlite3.Row
    return conn


def apple_ts_to_datetime(raw: Optional[int]) -> Optional[datetime]:
    """Convert a Messages `date` value to an aware UTC datetime."""
    if not raw:
        return None
    value = float(raw)
    if value > NS_THRESHOLD:
        value /= 1e9
    elif value > US_THRESHOLD:
        value /= 1e6
    try:
        return datetime.fromtimestamp(value + APPLE_EPOCH_OFFSET, tz=timezone.utc)
    except (OverflowError, OSError, ValueError):
        return None


# ── Supabase lookup ──────────────────────────────────────────────────────────

def load_env() -> dict:
    env: dict[str, str] = {}
    if not ENV_PATH.exists():
        return env
    for line in ENV_PATH.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, val = line.split("=", 1)
        env[key.strip()] = val.strip().strip('"').strip("'")
    return env


def fetch_known_numbers() -> tuple[dict[str, str], dict[str, str]]:
    """
    Return ({phone -> customer label}, {phone -> wholesale label}).

    Read-only GETs against Supabase. Returns empty dicts (with a warning) if
    credentials are missing, so `stats` still works offline.
    """
    env = load_env()
    url = env.get("SUPABASE_URL") or env.get("PUBLIC_SUPABASE_URL")
    key = env.get("SUPABASE_SERVICE_ROLE_KEY") or env.get("SUPABASE_SERVICE_KEY")
    customers: dict[str, str] = {}
    wholesale: dict[str, str] = {}
    if not url or not key:
        print("  ! Supabase credentials not found — skipping account matching.\n")
        return customers, wholesale

    def get(path: str) -> list:
        req = urllib.request.Request(
            f"{url}/rest/v1/{path}",
            headers={"apikey": key, "Authorization": f"Bearer {key}"},
        )
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                return json.load(resp)
        except Exception as exc:  # network/auth problems must not crash the report
            print(f"  ! Supabase query failed ({path.split('?')[0]}): {exc}")
            return []

    # NOTE: the customers table uses `contact_name` (a single column) plus an
    # optional `company_name` — there is no first_name/last_name pair.
    query = ("customers?select=id,contact_name,company_name,customer_type,phone"
             "&limit=5000")
    by_id: dict[str, str] = {}
    for row in get(query):
        name = (row.get("contact_name") or row.get("company_name") or "").strip()
        kind = row.get("customer_type") or "customer"
        label = f"{name or '(unnamed)'} [{kind}]"
        by_id[row["id"]] = label
        digits = normalize_us_phone(row.get("phone"))
        if digits:
            customers[digits] = label

    # customer_phones (migration 0087) is the alias table — many phones per
    # customer. This is what makes a spouse's or second-line number resolve.
    # Layered AFTER customers.phone so an explicitly-linked alias wins.
    for row in get("customer_phones?select=customer_id,phone,source&limit=10000"):
        digits = normalize_us_phone(row.get("phone"))
        if digits:
            customers[digits] = by_id.get(row["customer_id"], "(unknown customer)")

    accounts: dict[str, str] = {}
    for row in get("wholesale_accounts?select=id,restaurant_name,phone&limit=1000"):
        label = row.get("restaurant_name") or "(unnamed account)"
        accounts[row["id"]] = label
        digits = normalize_us_phone(row.get("phone"))
        if digits:
            wholesale[digits] = label

    # Per-contact cell numbers (migration 0087). The restaurant main line rarely
    # texts; the chef's personal cell does. Layered last so it wins.
    query = "wholesale_account_contacts?select=account_id,name,phone&phone=not.is.null&limit=2000"
    for row in get(query):
        digits = normalize_us_phone(row.get("phone"))
        if not digits:
            continue
        account = accounts.get(row.get("account_id") or "", "(unlinked account)")
        who = (row.get("name") or "").strip()
        wholesale[digits] = f"{account} — {who}" if who else account

    return customers, wholesale


# ── Row iteration ────────────────────────────────────────────────────────────

def iter_messages(conn: sqlite3.Connection) -> Iterable[sqlite3.Row]:
    """Yield real message rows (tapbacks excluded) joined to their handle."""
    placeholders = ",".join("?" for _ in TAPBACK_TYPES)
    sql = f"""
        SELECT m.ROWID           AS rowid,
               m.text            AS text,
               m.attributedBody  AS attributed_body,
               m.date            AS date,
               m.is_from_me      AS is_from_me,
               m.service         AS service,
               h.id              AS handle
        FROM message m
        LEFT JOIN handle h ON m.handle_id = h.ROWID
        WHERE COALESCE(m.associated_message_type, 0) NOT IN ({placeholders})
        ORDER BY m.date ASC
    """
    yield from conn.execute(sql, tuple(TAPBACK_TYPES))


# ── Commands ─────────────────────────────────────────────────────────────────

def cmd_stats(_args: argparse.Namespace) -> int:
    """Aggregate health/recoverability report. Prints NO message content."""
    conn = open_db()
    total = 0
    from_me = 0
    had_text = 0
    needed_fallback = 0
    fallback_ok = 0
    unrecoverable = 0
    services: Counter = Counter()
    oldest: Optional[datetime] = None
    newest: Optional[datetime] = None

    for row in iter_messages(conn):
        total += 1
        if row["is_from_me"]:
            from_me += 1
        services[row["service"] or "unknown"] += 1

        if row["text"] and row["text"].strip():
            had_text += 1
        else:
            needed_fallback += 1
            if parse_attributed_body(row["attributed_body"]):
                fallback_ok += 1
            else:
                unrecoverable += 1

        stamp = apple_ts_to_datetime(row["date"])
        if stamp:
            if oldest is None or stamp < oldest:
                oldest = stamp
            if newest is None or stamp > newest:
                newest = stamp

    conn.close()

    span_days = (newest - oldest).days if oldest and newest else 0
    print("\n═══ MESSAGE DATABASE STATS (read-only, no content shown) ═══\n")
    print(f"  Total messages (tapbacks excluded) : {total:,}")
    print(f"    from Todd                        : {from_me:,}")
    print(f"    from others                      : {total - from_me:,}")
    print(f"  History span                       : {span_days} days")
    if oldest and newest:
        print(f"    oldest                           : {oldest.astimezone():%Y-%m-%d}")
        print(f"    newest                           : {newest.astimezone():%Y-%m-%d}")
    if span_days:
        print(f"  Average volume                     : {total / span_days:.1f} msgs/day")

    print("\n  ── Text recoverability ──")
    print(f"  Plain `text` column present        : {had_text:,}")
    print(f"  Needed attributedBody fallback     : {needed_fallback:,}")
    if needed_fallback:
        rate = 100 * fallback_ok / needed_fallback
        print(f"    recovered by naive decoder       : {fallback_ok:,} ({rate:.1f}%)")
        print(f"    UNRECOVERABLE                    : {unrecoverable:,}")
    recovered_total = had_text + fallback_ok
    if total:
        print(f"  Overall readable                   : {recovered_total:,}"
              f" ({100 * recovered_total / total:.1f}%)")
        if unrecoverable > total * 0.02:
            print("\n  ⚠️  >2% unrecoverable — Phase 1 should use imessage-exporter")
            print("      (Rust, proper typedstream decoder) instead of this parser.")

    print("\n  ── Services ──")
    for name, count in services.most_common():
        print(f"  {name:<10} {count:,}")
    print()
    return 0


def cmd_senders(args: argparse.Namespace) -> int:
    """
    Per-sender summary with account matching. Prints phone numbers and counts —
    never message bodies. This is the input to the Phase 1 'unknown number'
    linking queue.
    """
    conn = open_db()
    inbound: Counter = Counter()
    outbound: Counter = Counter()
    last_seen: dict[str, datetime] = {}

    for row in iter_messages(conn):
        handle = row["handle"]
        if not handle:
            continue
        if row["is_from_me"]:
            outbound[handle] += 1
        else:
            inbound[handle] += 1
        stamp = apple_ts_to_datetime(row["date"])
        if stamp and (handle not in last_seen or stamp > last_seen[handle]):
            last_seen[handle] = stamp
    conn.close()

    print("\n  Loading known numbers from Supabase…")
    customers, wholesale = fetch_known_numbers()
    print(f"  {len(customers)} customer phones, {len(wholesale)} wholesale phones loaded.\n")

    handles = set(inbound) | set(outbound)
    rows = []
    for handle in handles:
        digits = normalize_us_phone(handle)
        if digits and digits in wholesale:
            match, kind = wholesale[digits], "WHOLESALE"
        elif digits and digits in customers:
            match, kind = customers[digits], "MEMBER"
        elif "@" in (handle or ""):
            match, kind = "—", "EMAIL/APPLE-ID"
        else:
            match, kind = "—", "UNKNOWN"
        rows.append({
            "handle": handle,
            "display": format_us_phone(digits) if digits else handle,
            "in": inbound.get(handle, 0),
            "out": outbound.get(handle, 0),
            "kind": kind,
            "match": match,
            "last": last_seen.get(handle),
        })

    if args.unmatched_only:
        rows = [r for r in rows if r["kind"] == "UNKNOWN"]

    # Most active first — the queue Todd should work top-down.
    rows.sort(key=lambda r: r["in"] + r["out"], reverse=True)

    matched = sum(1 for r in rows if r["kind"] in ("MEMBER", "WHOLESALE"))
    two_way_rows = [r for r in rows if r["in"] and r["out"]]
    two_way = len(two_way_rows)
    one_way = sum(1 for r in rows if r["in"] and not r["out"])
    # The number that actually matters: of the senders Todd genuinely converses
    # with (he replied at least once), how many can we attribute to an account?
    # The one-way long tail is overwhelmingly burner-number spam and would
    # otherwise drag the headline match rate down misleadingly.
    two_way_matched = sum(1 for r in two_way_rows
                          if r["kind"] in ("MEMBER", "WHOLESALE"))

    print("═══ SENDERS ═══\n")
    print(f"  {'PHONE':<18} {'IN':>5} {'OUT':>5}  {'TYPE':<14} MATCH")
    print(f"  {'-' * 74}")
    for r in rows[:args.limit]:
        print(f"  {r['display']:<18} {r['in']:>5} {r['out']:>5}  "
              f"{r['kind']:<14} {r['match'][:28]}")

    shown = min(len(rows), args.limit)
    print(f"\n  Showing {shown} of {len(rows)} senders.")
    print(f"  Matched to an account : {matched}")
    print(f"  Two-way conversations : {two_way}")
    print(f"  One-way (never replied): {one_way}")
    if rows:
        print(f"  Match rate, ALL senders: {100 * matched / len(rows):.1f}%")
    if two_way:
        print(f"  ► MATCH RATE, REAL CONVERSATIONS: "
              f"{two_way_matched}/{two_way} "
              f"({100 * two_way_matched / two_way:.1f}%)  ← the number that matters")
        print(f"    unidentified real conversations: {two_way - two_way_matched}"
              f"  ← Phase 1 linking queue")
    print()
    return 0


def load_contacts() -> dict[str, str]:
    """
    phone (canonical 10 digits) → contact name, from the macOS Contacts app.

    WHY THIS IS THE PRIMARY SIGNAL: the Messages database stores NO names, only
    handles. But Todd's address book already names most of the people he texts.
    Measured 2026-08-16: 56 of 67 two-way senders (84%) are in Contacts, versus
    near-zero reliably identifiable by mining message text for self-
    introductions (people don't re-introduce themselves mid-relationship).

    Read-only, like everything else here. Contacts stores one DB per account
    source (iCloud, On My Mac), so all of them are merged.
    """
    base = Path.home() / "Library/Application Support/AddressBook"
    contacts: dict[str, str] = {}
    if not base.exists():
        return contacts

    query = """
        SELECT p.ZFULLNUMBER, r.ZFIRSTNAME, r.ZLASTNAME, r.ZORGANIZATION
        FROM ZABCDPHONENUMBER p
        JOIN ZABCDRECORD r ON p.ZOWNER = r.Z_PK
    """
    for db_path in base.glob("**/AddressBook-v22.abcddb"):
        try:
            conn = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True, timeout=10)
            for number, first, last, org in conn.execute(query):
                digits = normalize_us_phone(number)
                if not digits:
                    continue
                name = " ".join(x for x in (first, last) if x).strip() or (org or "").strip()
                if name:
                    contacts[digits] = name
            conn.close()
        except sqlite3.Error:
            # A locked/absent source DB must not break the whole run.
            continue
    return contacts


def match_name_to_customers(name: str, directory: list[dict]) -> list[tuple[int, dict]]:
    """
    Match a Contacts display name against the customer directory.

    Scoring:
        exact full-name match (case-insensitive) → 10
        all name tokens present in customer name  →  7
        surname match + shared forename initial   →  5
        surname-only match (>3 chars)             →  3
    """
    target = (name or "").strip().lower()
    if not target:
        return []
    tokens = [t for t in re.split(r"\s+", target) if t]
    scored: list[tuple[int, dict]] = []

    for person in directory:
        candidate = (person.get("contact_name") or "").strip().lower()
        if not candidate:
            continue
        cand_tokens = [t for t in re.split(r"\s+", candidate) if t]
        score = 0

        if candidate == target:
            score = 10
        elif tokens and all(t in cand_tokens for t in tokens):
            score = 7
        elif (len(tokens) >= 2 and len(cand_tokens) >= 2
              and len(tokens[-1]) > 3 and tokens[-1] == cand_tokens[-1]):
            score = 5 if tokens[0][:1] == cand_tokens[0][:1] else 3

        if score:
            scored.append((score, person))

    scored.sort(key=lambda pair: pair[0], reverse=True)
    return scored


def fetch_customer_directory() -> list[dict]:
    """All customers (id, name, email, type) for candidate suggestion."""
    env = load_env()
    url = env.get("SUPABASE_URL") or env.get("PUBLIC_SUPABASE_URL")
    key = env.get("SUPABASE_SERVICE_ROLE_KEY") or env.get("SUPABASE_SERVICE_KEY")
    if not url or not key:
        return []
    req = urllib.request.Request(
        f"{url}/rest/v1/customers?select=id,contact_name,company_name,email,"
        f"customer_type,is_active&limit=5000",
        headers={"apikey": key, "Authorization": f"Bearer {key}"},
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.load(resp)
    except Exception as exc:
        print(f"  ! customer directory fetch failed: {exc}")
        return []


def score_candidates(inbound_text: str, directory: list[dict]) -> list[tuple[int, dict]]:
    """
    Rank customers by how strongly their identity appears in what the UNKNOWN
    SENDER wrote.

    CRITICAL: only inbound text is scored. Scoring Todd's outbound messages too
    produced obvious false positives — he routinely mentions other customers by
    name ("Victoria asked about her box"), so a busy thread matched three
    different people at full confidence. Self-identification only comes from the
    other party, so that is all we look at.

    Scoring:
        email address present            → 10  (unambiguous)
        explicit self-intro "this is X"  →  9  (strongest natural-language cue)
        full name present                →  6
        surname present (>3 chars)       →  3
        forename present (>2 chars)      →  1  (weak — many Sarahs)

    Returns [(score, customer)] sorted desc, non-zero only. These are SUGGESTIONS
    for a human to confirm, never an automatic link — see the research note on
    the ~80% accuracy ceiling for this class of inference.
    """
    text = inbound_text.lower()
    if not text.strip():
        return []

    scored: list[tuple[int, dict]] = []
    for person in directory:
        name = (person.get("contact_name") or "").strip().lower()
        email = (person.get("email") or "").strip().lower()
        parts = [p for p in re.split(r"\s+", name) if p]
        score = 0

        if email and email in text:
            score += 10

        # "this is sarah", "it's sarah", "sarah here" — an explicit introduction.
        for token in filter(None, [name] + parts[:1]):
            if len(token) < 3:
                continue
            pattern = (rf"\b(?:this is|it'?s|its|hi,? it'?s|"
                       rf"here'?s)\s+{re.escape(token)}\b|\b{re.escape(token)}\s+here\b")
            if re.search(pattern, text):
                score += 9
                break

        if name and len(name) > 4 and name in text:
            score += 6
        else:
            if len(parts) >= 2 and len(parts[-1]) > 3 and parts[-1] in text:
                score += 3
            if parts and len(parts[0]) > 2 and re.search(rf"\b{re.escape(parts[0])}\b", text):
                score += 1

        if score:
            scored.append((score, person))

    scored.sort(key=lambda pair: pair[0], reverse=True)
    return scored


def cmd_unknown(args: argparse.Namespace) -> int:
    """
    The Phase 1 linking queue: unidentified senders Todd actually converses
    with, each with ranked guesses at who they are.
    """
    conn = open_db()
    texts: dict[str, list[str]] = {}
    inbound: Counter = Counter()
    outbound: Counter = Counter()

    for row in iter_messages(conn):
        handle = row["handle"]
        if not handle:
            continue
        if row["is_from_me"]:
            outbound[handle] += 1
        else:
            inbound[handle] += 1
        # Only what the OTHER party wrote — see score_candidates() for why
        # including Todd's outbound text corrupts the ranking.
        if not row["is_from_me"]:
            body = row["text"] if (row["text"] and row["text"].strip()) else \
                parse_attributed_body(row["attributed_body"])
            if body:
                texts.setdefault(handle, []).append(body)
    conn.close()

    customers, wholesale = fetch_known_numbers()
    directory = fetch_customer_directory()
    contacts = load_contacts()
    print(f"  {len(directory)} customers in directory; "
          f"{len(contacts)} named contacts in the macOS address book.\n")

    # Only senders Todd actually replied to — the one-way tail is spam.
    queue = []
    for handle in set(inbound) | set(outbound):
        if not (inbound.get(handle) and outbound.get(handle)):
            continue
        digits = normalize_us_phone(handle)
        if digits and (digits in customers or digits in wholesale):
            continue
        queue.append(handle)

    queue.sort(key=lambda h: inbound.get(h, 0) + outbound.get(h, 0), reverse=True)

    print("═══ UNKNOWN-NUMBER LINKING QUEUE ═══")
    print("  (two-way conversations with no matching account, busiest first)\n")

    # Score every queued sender once, then reuse — scoring is O(directory) per
    # sender and was previously recomputed twice per handle for the summary.
    #
    # Two independent signals, PREFERRING the address book: if Contacts names
    # this number, matching that name against the customer directory is far more
    # reliable than mining the conversation for a self-introduction. Text mining
    # is kept only as the fallback for numbers Todd has never saved.
    ranked_by_handle: dict[str, list[tuple[int, dict]]] = {}
    source_by_handle: dict[str, str] = {}
    for handle in queue:
        digits = normalize_us_phone(handle)
        contact_name = contacts.get(digits) if digits else None
        ranked = match_name_to_customers(contact_name, directory) if contact_name else []
        if ranked:
            source_by_handle[handle] = f"Contacts: {contact_name}"
        else:
            ranked = score_candidates("\n".join(texts.get(handle, [])), directory)
            source_by_handle[handle] = (
                f"Contacts: {contact_name} (no customer match)" if contact_name
                else "message text"
            )
        ranked_by_handle[handle] = ranked

    for handle in queue[:args.limit]:
        digits = normalize_us_phone(handle)
        display = format_us_phone(digits) if digits else handle
        ranked = ranked_by_handle[handle][:3]

        print(f"  {display}   in:{inbound.get(handle,0)}  out:{outbound.get(handle,0)}"
              f"   [{source_by_handle.get(handle, '?')}]")
        if ranked:
            top = ranked[0][0]
            # A clear winner needs to actually beat the runner-up; otherwise the
            # suggestion is a coin flip and shouldn't be starred.
            runner_up = ranked[1][0] if len(ranked) > 1 else 0
            for score, person in ranked:
                clear = score >= 9 and score > runner_up
                flag = "★" if clear else " "
                print(f"      {flag} [{score:>2}] {(person.get('contact_name') or '(no name)')[:28]:<30}"
                      f" {(person.get('email') or '')[:34]:<36} {person.get('customer_type')}")
                print(f"           link: python3 scripts/read_messages.py link "
                      f"{digits} {person['id']}")
            if top < 9 or top == runner_up:
                print("        ⚠ no clear winner — verify before linking")
        else:
            print("        (sender never names themselves — needs manual ID)")
        print()

    confident = sum(
        1 for h in queue
        if ranked_by_handle[h]
        and ranked_by_handle[h][0][0] >= 9
        and (len(ranked_by_handle[h]) == 1
             or ranked_by_handle[h][0][0] > ranked_by_handle[h][1][0])
    )
    print(f"  {len(queue)} unidentified conversations total; showing "
          f"{min(len(queue), args.limit)}.")
    print(f"  {confident} have an UNAMBIGUOUS candidate (score>=9, beats runner-up).\n")
    return 0


def cmd_link(args: argparse.Namespace) -> int:
    """Write a phone→customer link into customer_phones."""
    digits = normalize_us_phone(args.phone)
    if not digits:
        sys.exit(f"ERROR: {args.phone!r} is not a valid US number.")

    env = load_env()
    url = env.get("SUPABASE_URL") or env.get("PUBLIC_SUPABASE_URL")
    key = env.get("SUPABASE_SERVICE_ROLE_KEY") or env.get("SUPABASE_SERVICE_KEY")
    if not url or not key:
        sys.exit("ERROR: Supabase credentials not found in .env.csa")

    headers = {
        "apikey": key, "Authorization": f"Bearer {key}",
        "Content-Type": "application/json", "Prefer": "return=representation",
    }

    # The target id may be a CUSTOMER or a WHOLESALE ACCOUNT. These live in
    # different tables: customer_phones.customer_id has a FK to customers(id),
    # so passing a wholesale_accounts id here would fail the constraint. Detect
    # which one it is and route to the right home — for a restaurant that means
    # wholesale_account_contacts.phone (the column migration 0087 added, exactly
    # because chefs text from personal cells rather than the restaurant line).
    def exists(table: str) -> Optional[dict]:
        req = urllib.request.Request(
            f"{url}/rest/v1/{table}?select=*&id=eq.{args.customer_id}",
            headers={"apikey": key, "Authorization": f"Bearer {key}"})
        try:
            with urllib.request.urlopen(req, timeout=20) as resp:
                rows = json.load(resp)
                return rows[0] if rows else None
        except Exception:
            return None

    account = exists("wholesale_accounts")
    if account and not exists("customers"):
        name = args.contact_name or account.get("contact_name") or "chef"
        body = json.dumps({
            "account_id": account["id"],
            "email": args.email or f"{digits}@placeholder.invalid",
            "name": name,
            "phone": digits,
            "receives_orders": False,
            "receives_invoices": False,
        }).encode()
        req = urllib.request.Request(f"{url}/rest/v1/wholesale_account_contacts",
                                     data=body, headers=headers, method="POST")
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                json.load(resp)
            print(f"✓ Linked {format_us_phone(digits)} → wholesale account "
                  f"'{account.get('restaurant_name')}' (contact: {name})")
            if not args.email:
                print("  ⚠ placeholder email used — set a real one before this "
                      "contact is used for order/invoice routing.")
            return 0
        except urllib.error.HTTPError as exc:
            print(f"✗ Link failed (HTTP {exc.code}): {exc.read().decode()[:250]}")
            return 1

    payload = json.dumps({
        "customer_id": args.customer_id,
        "phone": digits,
        "label": args.label,
        "source": "linked_from_text",
        "created_by": "read_messages.py",
        "verified_at": datetime.now(timezone.utc).isoformat(),
    }).encode()
    req = urllib.request.Request(f"{url}/rest/v1/customer_phones",
                                 data=payload, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            body = json.load(resp)
        print(f"✓ Linked {format_us_phone(digits)} → customer {args.customer_id}")
        print(f"  row id: {body[0]['id'] if body else '(created)'}")
        return 0
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode()[:300]
        if "duplicate key" in detail or "customer_phones_phone_key" in detail:
            print(f"✗ {format_us_phone(digits)} is ALREADY linked to another "
                  f"customer.\n  This is the ambiguity guard — resolve which "
                  f"customer truly owns it before relinking.")
        else:
            print(f"✗ Link failed (HTTP {exc.code}): {detail}")
        return 1


# ── Phase 2: pending-obligation detection ────────────────────────────────────
#
# DESIGN NOTE — why this is heuristic and not an LLM (yet).
#
# The research (docs/research/TEXT_SYSTEM_TECH_RESEARCH_2026.md) puts automated
# commitment extraction at roughly ~80% F1 at best, with conditional promises,
# negation and hedges ("let me check") as known failure modes. But every one of
# the four real dropped obligations found while categorizing on 2026-08-16 —
# Mackenzie's job reply, Jenifer's invoice, Linda's monthly list, the wedding
# rosemary — shares one dead-simple signal: THE LAST MESSAGE IS INBOUND AND
# TODD NEVER ANSWERED. That is deterministic, needs no model, and cannot
# hallucinate. So v1 ranks dangling threads; language models can add nuance
# later, on top of a base that is already correct.
#
# Everything here is a SUGGESTION for review, never an auto-action.

# Category weights: a silent chef or landlord costs money; a silent friend does
# not. Used only for ordering, never to hide anything.
CATEGORY_WEIGHT = {
    "wholesale": 5, "landlord": 5, "employee": 4, "csa": 3, "market": 3,
    "vendor": 3, "partner": 2, "volunteer": 2, "unknown": 2, "personal": 1,
}

# A real question needs either a '?' or a CLAUSE-INITIAL interrogative. The
# first version matched those words anywhere, so "I'll use what I can" was
# flagged as a question because it contains "can". Requiring start-of-string or
# start-of-clause removes that whole class of false positive.
QUESTION_HINTS = re.compile(
    r"\?"
    r"|(?:^|[.!?]\s+|\n)\s*(can|could|would|will|do|does|did|are|is|should|"
    r"what|when|where|who|how|any chance)\b"
    r"|\b(let me know|lmk)\b", re.I)

# Conversational closers. When the other party's LAST message is just an
# acknowledgement, Todd owes nothing — surfacing these as obligations is the
# fastest way to make the list untrustworthy and get it ignored. Only applied
# to SHORT messages, so "Thanks — and can you also bring basil?" still counts.
#
# Implemented as "contains an acknowledgement AND contains no request" rather
# than a whole-string match: the strict version failed on the real data,
# because "Thanks Todd" and "Ok no problem" carry trailing words.
CLOSER_HINTS = re.compile(
    r"\b(ok(ay)?|got it|thanks?|thank you|thx|ty|no problem|np|no worries|"
    r"perfect|great|awesome|sounds good|sounds great|will do|see you|see ya|"
    r"yep|yeah|cool|appreciate it|much appreciated|you too)\b|[👍🙏❤️😊]", re.I)

# If any of these appear, it is a request/commitment — never a mere closer,
# regardless of how much gratitude is wrapped around it.
REQUEST_HINTS = re.compile(
    r"\b(need|want|can you|could you|would you|please|send|bring|take|order|"
    r"how much|how many|when|where|what time|price|invoice|pay|drop|pick up|"
    r"pickup|deliver|add|also)\b", re.I)

CLOSER_MAX_LEN = 60

# Phrases where TODD commits to something — used to flag promises he made that
# may never have been closed out.
COMMIT_HINTS = re.compile(
    r"\b(i'?ll|i will|we'?ll|we will|let me|i can|we can|i'?m going to|"
    r"we got you|you got it|i'?ll get|send you|drop off|bring you|"
    r"confirm|invoice you|get you)\b", re.I)


def cmd_pending(args: argparse.Namespace) -> int:
    """Rank conversations where Todd appears to owe someone a reply or action."""
    conn = open_db()
    threads: dict[str, list[tuple[Optional[datetime], bool, str]]] = {}
    for row in iter_messages(conn):
        handle = row["handle"]
        if not handle:
            continue
        body = row["text"] if (row["text"] and row["text"].strip()) else \
            parse_attributed_body(row["attributed_body"])
        # U+FFFC (object replacement) is the placeholder for an attachment. A
        # photo with no caption carries no inferable obligation, and surfacing
        # it as "awaiting your reply" is pure noise.
        if body:
            body = body.replace("￼", "").strip()
        if not body:
            continue
        threads.setdefault(handle, []).append(
            (apple_ts_to_datetime(row["date"]), bool(row["is_from_me"]), body))
    conn.close()

    store = load_contact_categories()["contacts"]
    contacts = load_contacts()
    now = datetime.now(timezone.utc)
    findings = []

    for handle, msgs in threads.items():
        if len(msgs) < 2:
            continue

        # REQUIRE A REAL RELATIONSHIP: Todd must have replied at least once.
        # Without this, cold sales spam ("Rocky with CashWise... 500k/36
        # months"), debt-collection shortcodes and never-answered strangers rank
        # as obligations. You cannot owe a reply to someone you never engaged.
        if not any(from_me for _, from_me, _ in msgs):
            continue

        # Shortcodes (5-6 digit senders) are automated, never a person.
        digits_only = re.sub(r"\D", "", handle or "")
        if "@" not in (handle or "") and len(digits_only) < 10:
            continue

        msgs.sort(key=lambda m: m[0] or now)
        last_stamp, last_from_me, last_body = msgs[-1]
        if not last_stamp:
            continue
        age_days = (now - last_stamp).days

        digits = normalize_us_phone(handle)
        entry = store.get(digits or "", {})
        category = entry.get("category", "unknown")
        name = entry.get("name") or (contacts.get(digits) if digits else None) or handle

        kind = None
        detail = last_body
        if not last_from_me:
            # They spoke last — but a short "thanks!" closes a thread rather
            # than opening an obligation.
            compact = " ".join(last_body.split())
            is_closer = (len(compact) <= CLOSER_MAX_LEN
                         and CLOSER_HINTS.search(compact) is not None
                         and REQUEST_HINTS.search(compact) is None
                         and "?" not in compact)
            if not is_closer:
                kind = ("UNANSWERED QUESTION" if QUESTION_HINTS.search(last_body)
                        else "AWAITING YOUR REPLY")
        else:
            # Todd spoke last. If he made a promise and nothing came back, the
            # obligation may still be open on his side.
            if COMMIT_HINTS.search(last_body) and age_days >= args.min_age:
                kind = "YOUR PROMISE — no follow-up since"

        if not kind or age_days < args.min_age:
            continue

        weight = CATEGORY_WEIGHT.get(category, 2)
        # Older + more important ranks higher; cap age so a 40-day-old personal
        # text can't outrank a 3-day-old chef invoice.
        score = weight * 10 + min(age_days, 30)
        findings.append({
            "score": score, "age": age_days, "kind": kind, "name": name,
            "category": category + (f"/{entry['subcategory']}" if entry.get("subcategory") else ""),
            "phone": digits or handle, "detail": " ".join(detail.split())[:150],
            "note": entry.get("note"),
        })

    findings.sort(key=lambda f: -f["score"])
    if args.category:
        findings = [f for f in findings if f["category"].startswith(args.category)]

    print(f"\n═══ PENDING OBLIGATIONS ═══")
    print(f"  {len(findings)} threads where you appear to owe a reply or action "
          f"(idle ≥ {args.min_age}d)\n")

    for f in findings[:args.limit]:
        flag = "🔥" if f["age"] >= 7 else "⚠️ " if f["age"] >= 3 else "  "
        print(f"  {flag} {f['age']:>3}d  {f['kind']:<28} {f['name'][:26]:<28} "
              f"[{f['category']}]")
        print(f"          {format_us_phone(f['phone'])}  \"{f['detail']}\"")
        if f["note"]:
            print(f"          note: {f['note'][:110]}")
        print()

    print(f"  Showing {min(len(findings), args.limit)} of {len(findings)}.")
    print(f"  Read any thread: python3 scripts/read_messages.py thread <phone>\n")
    return 0


# ── Invoice / order sweep ────────────────────────────────────────────────────
#
# Todd runs real business over text: orders arrive as message lists, shortfalls
# are agreed verbally ("we didn't send the radicchio"), and prices get quoted
# inline. None of it reaches the order system unless someone re-types it, which
# is exactly how $1,078.70 of Harvie deliveries went unbilled and how a chef's
# $18 radicchio nearly got invoiced for produce he never received.
#
# This sweep does NOT try to parse orders automatically — that would invent
# quantities. It surfaces the MESSAGES that look financially load-bearing so a
# human can act on them, with dates, ordered newest-first.

SWEEP_PATTERNS: list[tuple[str, str]] = [
    # (label, regex) — order matters; first match wins per message.
    ("SHORTFALL", r"\b(did ?n[o']?t send|didn'?t (?:get|have|make)|never (?:sent|got|came)|"
                  r"missing|left out|forgot|short(?:ed)?\b|out of|couldn'?t get|"
                  r"none this week|no .{0,18} this week|unavailable|not with the rest)\b"),
    ("MONEY",     r"\b(invoice|bill(?:ed|ing)?|pay(?:ment|ing)?|paid|owe|balance due|"
                  r"venmo|zelle|check|credit|refund|discount)\b"),
    ("PRICE",     r"(\$\s?\d|\bper (?:lb|pound|bunch|case|qt|quart|pint|each)\b|\b\d+\s?/\s?lb\b)"),
    ("ORDER",     r"\b(could i (?:please )?get|can i (?:please )?get|i'?ll take|please get|"
                  r"i(?:'?d| would) like|add on|order for|pick ?up (?:at|around|tomorrow)|"
                  r"for (?:tuesday|wednesday|thursday|friday|monday|saturday|sunday))\b"),
]


def cmd_sweep(args: argparse.Namespace) -> int:
    """Surface financially load-bearing messages per contact, for a human to act on."""
    store = load_contact_categories()["contacts"]
    targets = {
        digits: entry for digits, entry in store.items()
        if (not args.category) or entry.get("category", "").startswith(args.category)
    }
    if not targets:
        print(f"\n  No contacts in category {args.category!r}. "
              f"Run `categorize` first.\n")
        return 0

    conn = open_db()
    threads: dict[str, list] = {}
    for row in iter_messages(conn):
        digits = normalize_us_phone(row["handle"] or "")
        if not digits or digits not in targets:
            continue
        body = row["text"] if (row["text"] and row["text"].strip()) else \
            parse_attributed_body(row["attributed_body"])
        if body:
            body = body.replace("￼", "").strip()
        if not body:
            continue
        threads.setdefault(digits, []).append(
            (apple_ts_to_datetime(row["date"]), bool(row["is_from_me"]), body))
    conn.close()

    cutoff = None
    if args.since:
        cutoff = datetime.fromisoformat(args.since).replace(tzinfo=timezone.utc)

    total_hits = 0
    for digits, entry in sorted(targets.items(),
                                key=lambda kv: -(kv[1].get("messages") or 0)):
        msgs = threads.get(digits, [])
        hits = []
        for stamp, from_me, body in msgs:
            if cutoff and stamp and stamp < cutoff:
                continue
            compact = " ".join(body.split())
            for label, pattern in SWEEP_PATTERNS:
                if re.search(pattern, compact, re.I):
                    hits.append((stamp, from_me, label, compact))
                    break
        if not hits:
            continue
        total_hits += len(hits)
        name = entry.get("name") or format_us_phone(digits)
        print(f"\n═══ {name}  [{entry.get('category')}]  {format_us_phone(digits)} ═══")
        if entry.get("note"):
            print(f"    note: {entry['note'][:150]}")
        for stamp, from_me, label, text in sorted(hits, key=lambda h: h[0] or datetime.min.replace(tzinfo=timezone.utc), reverse=True)[:args.per_contact]:
            when = stamp.astimezone().strftime("%b %d") if stamp else "?"
            who = "TODD" if from_me else "THEM"
            mark = {"SHORTFALL": "⚠️ ", "MONEY": "💵", "PRICE": "🏷 ", "ORDER": "📋"}[label]
            print(f"  {mark} {when}  {who:<5} {text[:190]}")

    print(f"\n  {total_hits} flagged messages across {len(targets)} contacts"
          f"{f' since {args.since}' if args.since else ''}.")
    print("  ⚠️ SHORTFALL = possible invoice reduction · 💵 MONEY = billing/payment"
          " · 📋 ORDER = possible unrecorded order · 🏷 PRICE = quoted price\n")
    return 0


def cmd_thread(args: argparse.Namespace) -> int:
    """
    Print ONE conversation, oldest→newest.

    This is the only command that outputs message bodies, and it is deliberately
    scoped to a single phone number that the operator names explicitly — never a
    bulk dump. Used to answer questions like "what did this person order and did
    we ever invoice it?"
    """
    digits = normalize_us_phone(args.phone)
    if not digits:
        sys.exit(f"ERROR: {args.phone!r} is not a valid US number.")

    conn = open_db()
    rows = []
    for row in iter_messages(conn):
        if normalize_us_phone(row["handle"] or "") != digits:
            continue
        body = row["text"] if (row["text"] and row["text"].strip()) else \
            parse_attributed_body(row["attributed_body"])
        if not body:
            continue
        rows.append((apple_ts_to_datetime(row["date"]), bool(row["is_from_me"]), body))
    conn.close()

    if not rows:
        print(f"\n  No readable messages for {format_us_phone(digits)}.\n")
        return 0

    name = load_contacts().get(digits)
    print(f"\n═══ {format_us_phone(digits)}"
          f"{f'  ({name})' if name else ''} — {len(rows)} messages ═══\n")

    shown = rows[-args.limit:] if args.limit else rows
    last_day = None
    for stamp, from_me, body in shown:
        local = stamp.astimezone() if stamp else None
        day = local.strftime("%a %b %d") if local else "?"
        if day != last_day:
            print(f"  ── {day} ──")
            last_day = day
        who = "TODD" if from_me else (name or "THEM")
        time = local.strftime("%H:%M") if local else "  :  "
        for i, line in enumerate(body.splitlines() or [body]):
            prefix = f"  {time}  {who:>10}: " if i == 0 else " " * 22
            print(f"{prefix}{line}")
    print()
    return 0


# ── Contact categorization ───────────────────────────────────────────────────
#
# Categories deliberately REUSE the vocabulary already in the codebase
# (customers.customer_type = csa|retail|market|wholesale|chef|employee, and
# customers.role = member|admin|staff|crew) rather than inventing synonyms —
# see docs/CSA_GLOSSARY_OF_TRUTH.md. Only genuinely-missing kinds are new:
# vendor, landlord, partner, volunteer, personal.

CONTACTS_FILE = Path(__file__).resolve().parent.parent / ".text_contacts.json"

CATEGORIES = {
    "csa": "CSA member",
    "wholesale": "Restaurant / chef account",
    "market": "Farmers-market or retail customer",
    "employee": "Farm employee / crew",
    "vendor": "Supplier / service provider",
    "landlord": "Land, lease, property counterparty",
    "partner": "Platform, agency, org, nonprofit",
    "volunteer": "Volunteer",
    "personal": "Family / friend / non-business",
    "unknown": "Not yet categorized",
}

# Subcategories are only meaningful for employees today. 'h2a' mirrors the
# H-2A visa crew tracked in legal/h2a_worker_onboarding.
# 'floral' is its own division, not a flavour of 'field': the farm runs a
# separate flower CSA (petite/full shares, weekly/biweekly) with its own stops
# and its own weekly cycle — see the WEEK ON THE FARM framework.
EMPLOYEE_SUBCATEGORIES = ["field", "floral", "market", "packhouse",
                          "delivery", "h2a", "office"]

# Ordered keyword rules applied to the CONTACTS DISPLAY NAME. Todd already
# encodes role in how he saves people ("Austin Tiny seed Market", "Eric Farm
# Person", "Stephen Volunteer", "Jeff Shaw (bee Guy)"), which makes the address
# book a surprisingly strong classifier. First match wins, so order matters:
# more specific patterns must precede general ones.
NAME_RULES: list[tuple[str, str, Optional[str]]] = [
    # Explicitly personal — Todd labels these in the contact name itself.
    (r"\b(dating|roommate|mother|mom|dad|father|sister|brother)\b", "personal", None),
    (r"\bvolunteer\b",                         "volunteer", None),
    (r"\bchef\b",                              "wholesale", None),
    # Vendors/service providers Todd tags by what they supply.
    (r"\b(mushroom|bee\s*guy|beekeeper|seed\s*guy|compost)\b", "vendor", None),
    (r"\b(tiny\s*seed|tiny)\s*market\b",       "employee", "market"),
    (r"\bfarmers?\s*market\b",                 "employee", "market"),
    (r"\bmarket\b",                            "employee", "market"),
    (r"\bfarm\s*(person|hand|crew)\b",         "employee", "field"),
    (r"\bfarm\b",                              "employee", "field"),
    (r"\bpack\s*(house|shed)\b",               "employee", "packhouse"),
    (r"\b(driver|delivery)\b",                 "employee", "delivery"),
]


# Named counterparties whose role is DOCUMENTED in this repo — not guesses.
# Each cites where the evidence lives so a future reader can re-verify or
# correct it. Matched on a lowercase substring of the Contacts display name.
KNOWN_ENTITIES: list[tuple[str, str, Optional[str], str]] = [
    # (name fragment, category, subcategory, evidence)
    ("kretschmann",  "landlord", None,
     "TODD_RESPONSIBILITIES_BOARD.md — 'Don Kretschmann monthly bills; lease/arrears negotiation'"),
    ("dan simon",    "landlord", None,
     "TODD_RESPONSIBILITIES_BOARD.md — Simon Farm Sept 30 move-out; 'Weekly text to Dan'"),
    ("juan pablo",   "employee", "h2a",
     "memory project_h2a_workers_2026 + board 'Juan Pablo payroll' (bi-weekly, contract term)"),
    ("csilla",       "wholesale", None,
     "TODD_RESPONSIBILITIES_BOARD.md — 'answer Csilla (Titusz)' re: her Friday order"),
    ("harvie",       "partner", None,
     "Harvie is a CSA software/marketplace platform, not a person (docs/research)"),
]


def load_contact_categories() -> dict:
    if CONTACTS_FILE.exists():
        try:
            return json.loads(CONTACTS_FILE.read_text())
        except json.JSONDecodeError:
            print(f"  ! {CONTACTS_FILE.name} is corrupt — starting fresh.")
    return {"version": 1, "contacts": {}}


def save_contact_categories(store: dict) -> None:
    store["updated_at"] = datetime.now(timezone.utc).isoformat()
    CONTACTS_FILE.write_text(json.dumps(store, indent=2, sort_keys=True))


def auto_categorize(name: Optional[str], customer_type: Optional[str]) -> tuple[str, Optional[str], str]:
    """
    Return (category, subcategory, confidence).

    A confirmed database match beats a name guess: if this number resolves to a
    real customer row, its customer_type IS the answer. Otherwise fall back to
    the address-book naming heuristics, which are suggestive but not proof.
    """
    if customer_type:
        mapping = {
            "csa": "csa", "wholesale": "wholesale", "chef": "wholesale",
            "market": "market", "retail": "market", "employee": "employee",
        }
        mapped = mapping.get(customer_type)
        if mapped:
            return mapped, None, "high"

    text = (name or "").lower()
    if text:
        # Documented counterparties first — evidence beats pattern-matching.
        for fragment, category, sub, _evidence in KNOWN_ENTITIES:
            if fragment in text:
                return category, sub, "high"
        for pattern, category, sub in NAME_RULES:
            if re.search(pattern, text):
                return category, sub, "medium"

    return "unknown", None, "low"


def cmd_categorize(args: argparse.Namespace) -> int:
    """Auto-categorize every two-way conversation; Todd corrects from there."""
    conn = open_db()
    inbound: Counter = Counter()
    outbound: Counter = Counter()
    for row in iter_messages(conn):
        handle = row["handle"]
        if not handle:
            continue
        (outbound if row["is_from_me"] else inbound)[handle] += 1
    conn.close()

    contacts = load_contacts()
    customers, wholesale = fetch_known_numbers()
    directory = {}
    for person in fetch_customer_directory():
        directory[person["id"]] = person

    # phone -> customer_type, via customers.phone and the 0087 alias table.
    type_by_phone: dict[str, str] = {}
    env = load_env()
    url = env.get("SUPABASE_URL") or env.get("PUBLIC_SUPABASE_URL")
    key = env.get("SUPABASE_SERVICE_ROLE_KEY") or env.get("SUPABASE_SERVICE_KEY")
    if url and key:
        def get(path):
            req = urllib.request.Request(
                f"{url}/rest/v1/{path}",
                headers={"apikey": key, "Authorization": f"Bearer {key}"})
            try:
                with urllib.request.urlopen(req, timeout=30) as resp:
                    return json.load(resp)
            except Exception:
                return []
        # SKIP PLACEHOLDER CUSTOMER ROWS. 196 customers carry the literal
        # contact_name 'Unknown' (195 of them 'retail') — legacy/import junk.
        # Trusting one of these as a "confirmed DB match" mis-classified David
        # Green (chef/owner of Cafe Verde, $926 of orders) as a plain 'market'
        # customer, because a junk retail row happened to hold his cell. A row
        # that cannot name the person is not high-confidence evidence.
        for row in get("customers?select=phone,customer_type,contact_name&limit=5000"):
            digits = normalize_us_phone(row.get("phone"))
            name = (row.get("contact_name") or "").strip().lower()
            if not digits or not row.get("customer_type"):
                continue
            if name in ("", "unknown", "n/a", "none"):
                continue
            type_by_phone[digits] = row["customer_type"]
        by_id = {p["id"]: p.get("customer_type") for p in fetch_customer_directory()}
        for row in get("customer_phones?select=phone,customer_id&limit=10000"):
            digits = normalize_us_phone(row.get("phone"))
            if digits and by_id.get(row.get("customer_id")):
                type_by_phone[digits] = by_id[row["customer_id"]]

        # Wholesale accounts + their per-contact cells. Previously omitted, which
        # left chefs already matched by phone (e.g. Pigeon) sitting in 'unknown'.
        for row in get("wholesale_accounts?select=phone&limit=1000"):
            digits = normalize_us_phone(row.get("phone"))
            if digits:
                type_by_phone[digits] = "wholesale"
        for row in get("wholesale_account_contacts?select=phone&phone=not.is.null&limit=2000"):
            digits = normalize_us_phone(row.get("phone"))
            if digits:
                type_by_phone[digits] = "wholesale"

    store = load_contact_categories()
    existing = store["contacts"]
    added = 0

    for handle in set(inbound) | set(outbound):
        if not (inbound.get(handle) and outbound.get(handle)):
            continue  # one-way senders are the spam tail, not relationships
        digits = normalize_us_phone(handle)
        if not digits:
            continue
        name = contacts.get(digits)
        prior = existing.get(digits, {})
        # Never overwrite a human decision.
        if prior.get("source") == "manual":
            continue
        category, sub, confidence = auto_categorize(name, type_by_phone.get(digits))
        existing[digits] = {
            "name": name or prior.get("name"),
            "category": category,
            "subcategory": sub,
            "confidence": confidence,
            "source": "auto",
            "messages": inbound.get(handle, 0) + outbound.get(handle, 0),
        }
        added += 1

    save_contact_categories(store)

    buckets: Counter = Counter()
    for entry in existing.values():
        label = entry["category"]
        if entry.get("subcategory"):
            label += f"/{entry['subcategory']}"
        buckets[label] += 1

    print(f"\n═══ CATEGORIZED {added} CONVERSATIONS ═══")
    print(f"  saved to {CONTACTS_FILE.name} (gitignored — contains personal contacts)\n")
    for label, count in buckets.most_common():
        print(f"  {label:<22} {count}")
    unknown = sum(1 for e in existing.values() if e["category"] == "unknown")
    print(f"\n  {unknown} still 'unknown' — set manually:")
    print("    python3 scripts/read_messages.py set-category <phone> <category> [--sub X]")
    print(f"  categories: {', '.join(CATEGORIES)}")
    print(f"  employee subcategories: {', '.join(EMPLOYEE_SUBCATEGORIES)}\n")
    return 0


def cmd_set_category(args: argparse.Namespace) -> int:
    digits = normalize_us_phone(args.phone)
    if not digits:
        sys.exit(f"ERROR: {args.phone!r} is not a valid US number.")
    if args.category not in CATEGORIES:
        sys.exit(f"ERROR: unknown category {args.category!r}. "
                 f"Valid: {', '.join(CATEGORIES)}")
    if args.sub and args.category == "employee" and args.sub not in EMPLOYEE_SUBCATEGORIES:
        sys.exit(f"ERROR: unknown employee subcategory {args.sub!r}. "
                 f"Valid: {', '.join(EMPLOYEE_SUBCATEGORIES)}")

    store = load_contact_categories()
    entry = store["contacts"].get(digits, {})
    entry.update({
        "category": args.category,
        "subcategory": args.sub,
        "confidence": "high",
        "source": "manual",  # protected from future auto-runs
    })
    # People often span roles (e.g. flower manager who also runs farm admin).
    # One subcategory stays the routing key; the note preserves the rest.
    if args.note:
        entry["note"] = args.note
    if not entry.get("name"):
        entry["name"] = load_contacts().get(digits)
    store["contacts"][digits] = entry
    save_contact_categories(store)
    label = args.category + (f"/{args.sub}" if args.sub else "")
    print(f"✓ {format_us_phone(digits)} ({entry.get('name') or 'unnamed'}) → {label}")
    return 0


def cmd_contacts(args: argparse.Namespace) -> int:
    """Show the categorized directory, grouped."""
    store = load_contact_categories()
    entries = store["contacts"]
    if not entries:
        print("\n  No categories yet — run: python3 scripts/read_messages.py categorize\n")
        return 0

    grouped: dict[str, list] = {}
    for digits, entry in entries.items():
        label = entry["category"] + (f"/{entry['subcategory']}" if entry.get("subcategory") else "")
        grouped.setdefault(label, []).append((entry.get("messages", 0), digits, entry))

    if args.category:
        grouped = {k: v for k, v in grouped.items() if k.startswith(args.category)}

    print()
    for label in sorted(grouped, key=lambda k: -sum(1 for _ in grouped[k])):
        rows = sorted(grouped[label], reverse=True)
        print(f"  ═══ {label.upper()}  ({len(rows)}) ═══")
        for messages, digits, entry in rows:
            mark = " " if entry.get("source") == "manual" else "~"
            print(f"    {mark} {format_us_phone(digits):<18} {messages:>4} msgs  "
                  f"{(entry.get('name') or '⟨unnamed⟩')[:38]}")
        print()
    print("  ~ = auto-classified (unconfirmed)    (blank) = you confirmed it\n")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Read-only analyzer for the local Messages database.",
    )
    sub = parser.add_subparsers(dest="command", required=True)

    p_stats = sub.add_parser("stats", help="aggregate stats, no content shown")
    p_stats.set_defaults(func=cmd_stats)

    p_senders = sub.add_parser("senders", help="per-sender counts + account matching")
    p_senders.add_argument("--limit", type=int, default=40, help="rows to display")
    p_senders.add_argument("--unmatched-only", action="store_true",
                           help="show only senders with no matching account")
    p_senders.set_defaults(func=cmd_senders)

    p_unknown = sub.add_parser(
        "unknown", help="linking queue: unidentified two-way senders + guesses")
    p_unknown.add_argument("--limit", type=int, default=15)
    p_unknown.set_defaults(func=cmd_unknown)

    p_link = sub.add_parser("link", help="link a phone number to a customer id")
    p_link.add_argument("phone")
    p_link.add_argument("customer_id")
    p_link.add_argument("--label", default="mobile")
    p_link.add_argument("--contact-name", dest="contact_name", default=None,
                        help="display name when linking a wholesale contact")
    p_link.add_argument("--email", default=None,
                        help="real email for a new wholesale contact row")
    p_link.set_defaults(func=cmd_link)

    p_cat = sub.add_parser("categorize",
                           help="auto-categorize every two-way conversation")
    p_cat.set_defaults(func=cmd_categorize)

    p_set = sub.add_parser("set-category", help="manually set a contact category")
    p_set.add_argument("phone")
    p_set.add_argument("category", choices=sorted(CATEGORIES))
    p_set.add_argument("--sub", default=None, help="subcategory (employees)")
    p_set.add_argument("--note", default=None,
                       help="free-text note, e.g. a second role this person holds")
    p_set.set_defaults(func=cmd_set_category)

    p_dir = sub.add_parser("contacts", help="show the categorized directory")
    p_dir.add_argument("--category", default=None, help="filter to one category")
    p_dir.set_defaults(func=cmd_contacts)

    p_thread = sub.add_parser("thread", help="print ONE conversation (shows message text)")
    p_thread.add_argument("phone")
    p_thread.add_argument("--limit", type=int, default=0,
                          help="show only the most recent N messages (0 = all)")
    p_thread.set_defaults(func=cmd_thread)

    p_pend = sub.add_parser(
        "pending", help="rank threads where you owe someone a reply or action")
    p_pend.add_argument("--min-age", dest="min_age", type=int, default=2,
                        help="ignore threads idle fewer than N days (default 2)")
    p_pend.add_argument("--limit", type=int, default=20)
    p_pend.add_argument("--category", default=None, help="filter to one category")
    p_pend.set_defaults(func=cmd_pending)

    p_sweep = sub.add_parser(
        "sweep", help="surface order/shortfall/billing messages for a category")
    p_sweep.add_argument("--category", default="wholesale")
    p_sweep.add_argument("--since", default=None, help="ISO date, e.g. 2026-06-01")
    p_sweep.add_argument("--per-contact", dest="per_contact", type=int, default=8)
    p_sweep.set_defaults(func=cmd_sweep)

    args = parser.parse_args()
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
