#!/usr/bin/env python3
"""Shared outgoing-copy fact gate.

Every sender imports this. A gate on one door is worthless when the building has
five — on 2026-08-27 a wrong phone number reached 68 emails, and four of the five
senders in this directory would not have stopped it.

check(text, subject) -> list[str] of problems (empty means clean).
enforce(text, subject, override) -> exits 2 with an explanation unless clean.
"""
import json, re, sys
from pathlib import Path

FACTS = Path(__file__).resolve().parents[3] / "config" / "verified_facts.json"


def _norm(t):
    return re.sub(r"\D", "", t)[-10:]


def check(text, subject=""):
    try:
        facts = json.loads(FACTS.read_text())
    except Exception as e:
        return [f"cannot read {FACTS}: {e}"]
    farm = {_norm(k): v for k, v in facts.get("farm_contact_phones", {}).items()}
    third = {_norm(k): v for k, v in facts.get("third_party_phones", {}).items()}
    domains = [d.lower() for d in facts.get("domains", [])]
    body = f"{subject}\n{text}"
    out = []
    for m in re.finditer(r"\b(?:\+?1[-. ])?\(?\d{3}\)?[-. ]\d{3}[-. ]\d{4}\b", body):
        raw = m.group(0); d = _norm(raw)
        if d in farm:
            continue
        if d in third:
            out.append(f"PHONE {raw!r} belongs to {third[d]} — NOT the farm. "
                       "Todd's number is 717-725-5177.")
        else:
            out.append(f"PHONE {raw!r} is not in verified_facts.json")
    for m in re.finditer(r"https?://([A-Za-z0-9.-]+)", body):
        host = m.group(1).lower()
        if not any(host == d or host.endswith("." + d) for d in domains):
            out.append(f"LINK host {host!r} is not in verified_facts.json")
    return out


def enforce(text, subject="", override=""):
    problems = check(text, subject)
    if problems and not override:
        sys.stderr.write(
            "\nBLOCKED — unverified fact(s) in this send:\n"
            + "".join(f"   • {p}\n" for p in problems)
            + f"\nRead it from a primary source, then add it to\n   {FACTS}\n"
            'or pass an override with the source you READ it from.\n'
            "Do NOT override from memory — that is the exact failure this exists to stop.\n\n")
        sys.exit(2)
    if problems:
        print(f"⚠ OVERRIDE — {len(problems)} unverified fact(s); source: {override}")
        for p in problems:
            print(f"   • {p}")
    return problems
