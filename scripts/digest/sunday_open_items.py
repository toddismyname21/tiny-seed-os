#!/usr/bin/env python3
"""
sunday_open_items.py — build the Sunday "nothing has slipped" digest.

WHY
---
Todd's open work lives in three places that never get read together:
  1. docs/TODD_RESPONSIBILITIES_BOARD.md  — money, people, deadlines, promises
  2. docs/CSA_TODO.md                     — CSA + portal backlog
  3. member_notices (Supabase)            — make-ups PROMISED TO A CUSTOMER
Items age out of attention silently. The mushroom make-ups sat open for a week;
Kelly Corrigan's promised stop went three weeks past its due date. This surfaces
every unclosed item once a week so nothing depends on remembering.

WHAT COUNTS AS OPEN
-------------------
Markdown: a `- [ ]` checkbox. `- [x]` and ~~struck~~ lines are closed and skipped.
Supabase: member_notices.status = 'open'. Overdue ones are called out FIRST,
because a promise past its due date is the thing most likely to cost a member.

Emits plain text on stdout. No sending — the workflow owns delivery, so this
stays runnable by hand (`python3 scripts/digest/sunday_open_items.py`).
"""
from __future__ import annotations
import os, re, sys, json, urllib.request
from datetime import date, datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SOURCES = [
    ("Responsibilities board", ROOT / "docs" / "TODD_RESPONSIBILITIES_BOARD.md"),
    ("CSA to-do",              ROOT / "docs" / "CSA_TODO.md"),
]
CHECKBOX = re.compile(r"^\s*[-*]\s*\[( |x|X)\]\s*(.+?)\s*$")
HEADING  = re.compile(r"^(#{2,4})\s*(.+?)\s*$")

def clean(text: str) -> str:
    text = re.sub(r"~~.*?~~", "", text)          # struck-through = done
    text = re.sub(r"\*\*(.*?)\*\*", r"\1", text) # bold
    text = re.sub(r"`(.*?)`", r"\1", text)
    text = re.sub(r"\[(.*?)\]\((.*?)\)", r"\1", text)
    return " ".join(text.split())

def parse_markdown(path: Path):
    """Return [(section, item)] for every UNCHECKED checkbox."""
    if not path.exists():
        return []
    out, section = [], "(top)"
    for line in path.read_text(encoding="utf-8").splitlines():
        h = HEADING.match(line)
        if h:
            section = clean(h.group(2))
            continue
        m = CHECKBOX.match(line)
        if m and m.group(1) == " ":
            body = clean(m.group(2))
            if body:
                out.append((section, body))
    return out

def fetch_open_notices():
    url = os.environ.get("PUBLIC_SUPABASE_URL") or os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        return None  # signals "could not check" — never silently report zero
    try:
        q = f"{url}/rest/v1/member_notices?status=eq.open&select=title,due_week,stop_hint&order=due_week.asc"
        req = urllib.request.Request(q, headers={"apikey": key, "Authorization": f"Bearer {key}"})
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.loads(r.read().decode())
    except Exception as e:
        print(f"[warn] member_notices lookup failed: {e}", file=sys.stderr)
        return None

def main() -> int:
    today = date.today()
    week = today.isoformat()
    L = []
    A = L.append
    A(f"OPEN ITEMS — {today.strftime('%A, %B %-d, %Y')}")
    A("=" * 60)
    A("")

    notices = fetch_open_notices()
    if notices is None:
        A("!! Could not reach member_notices — promises to members NOT checked this week.")
        A("")
    else:
        overdue = [n for n in notices if n.get("due_week") and n["due_week"] < week]
        rest    = [n for n in notices if n not in overdue]
        A(f"PROMISES TO MEMBERS — {len(notices)} open, {len(overdue)} OVERDUE")
        A("-" * 60)
        if overdue:
            A("  OVERDUE — these were promised and the date has passed:")
            for n in overdue:
                A(f"    * [{n['due_week']}] {n['title']}" + (f"  ({n['stop_hint']})" if n.get("stop_hint") else ""))
            A("")
        for n in rest:
            A(f"    - [{n.get('due_week') or 'anytime'}] {n['title']}" + (f"  ({n['stop_hint']})" if n.get("stop_hint") else ""))
        if not notices:
            A("    (none — every promise fulfilled)")
        A("")

    grand = 0
    for label, path in SOURCES:
        items = parse_markdown(path)
        grand += len(items)
        A(f"{label.upper()} — {len(items)} open")
        A("-" * 60)
        if not items:
            A("    (nothing open)")
        section = None
        for sec, body in items:
            if sec != section:
                section = sec
                A(f"  {sec}")
            A(f"    - {body[:300]}")
        A("")

    A("=" * 60)
    total = grand + (len(notices) if notices is not None else 0)
    A(f"TOTAL OPEN: {total}")
    A("")
    A("Closed something? Tick the box in docs/TODD_RESPONSIBILITIES_BOARD.md or")
    A("docs/CSA_TODO.md, or mark the member notice done — it drops off next week.")
    print("\n".join(L))
    return 0

if __name__ == "__main__":
    sys.exit(main())
