#!/usr/bin/env python3
"""Reusable Resend sender. Reads RESEND_API_KEY + RESEND_FROM_EMAIL from .env.
Usage: send_email.py --to a@b.com --subject "S" --text "..." [--attach f1.pdf f2.pdf]
Prints the Resend message id on success (proof of send).

── VERIFICATION GATE ────────────────────────────────────────────────────────
Refuses to send when the body contains a PHONE NUMBER or a LINK that is not in
config/verified_facts.json.

Why: on 2026-08-27 a wrong phone number went out in 68 emails — including a
58-recipient wholesale blast and a driver's route instructions. It was a
customer's personal cell, used as the farm's number. Nobody mistyped it; it was
simply never looked up, and nothing in the pipeline could tell the difference
between a fact and a recollection.

This gate cannot check whether prose is true. What it CAN do is stop the class of
fact that is cheap to verify and expensive to get wrong — the ones a recipient
will act on. To add a fact, read it from a primary source (contract, invoice,
database row, live page) and put it in the registry. Never from memory.

--i-verified "<where it came from>" overrides for a one-off, and the reason is
printed with the send so the override is on the record rather than silent.
"""
import sys, json, base64, re, urllib.request, urllib.error, argparse
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def load_env(p):
    e = {}
    for ln in p.read_text().splitlines():
        ln = ln.strip()
        if ln and not ln.startswith("#") and "=" in ln:
            k, v = ln.split("=", 1)
            e[k.strip()] = v.strip().strip('"').strip("'")
    return e

env = load_env(ROOT / ".env")
KEY = env.get("RESEND_API_KEY"); FROM = env.get("RESEND_FROM_EMAIL")
if not KEY or not FROM:
    sys.exit("Missing RESEND_API_KEY or RESEND_FROM_EMAIL in .env")

ap = argparse.ArgumentParser()
# Comma-separated so several people land on ONE thread and can see each other
# (e.g. an outgoing chef and the incoming one during a handoff). Sending
# separate copies instead would hide the handoff from both of them.
ap.add_argument("--to", required=True, help="one address, or several comma-separated")
ap.add_argument("--subject", required=True)
ap.add_argument("--text", required=True)
ap.add_argument("--attach", nargs="*", default=[])
ap.add_argument("--i-verified", default="", metavar="SOURCE",
                help="Override the fact gate. Give the primary source you READ it from.")
a = ap.parse_args()

# ── verification gate (shared module — every sender uses the same one) ─────
sys.path.insert(0, str(Path(__file__).resolve().parent))
from verify_facts import enforce as _enforce_facts

_enforce_facts(a.text, a.subject, a.i_verified)

TEAM = ["todd@tinyseedfarmpgh.com", "tinyseedfleurs@gmail.com"]
TO = [x.strip() for x in a.to.split(",") if x.strip()]
if not TO:
    sys.exit("--to had no usable address")
body = {"from": FROM, "to": TO, "subject": a.subject, "text": a.text, "reply_to": TEAM, "bcc": ["todd@tinyseedfarmpgh.com"]}
atts = []
for f in a.attach:
    p = Path(f)
    atts.append({"filename": p.name, "content": base64.b64encode(p.read_bytes()).decode()})
if atts:
    body["attachments"] = atts

req = urllib.request.Request(
    "https://api.resend.com/emails", data=json.dumps(body).encode(), method="POST",
    headers={"Authorization": f"Bearer {KEY}", "Content-Type": "application/json",
             "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                           "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
             "Accept": "application/json"})
try:
    with urllib.request.urlopen(req, timeout=60) as r:
        data = json.loads(r.read().decode())
        print(f"SENT ✓  HTTP {r.status}  id={data.get('id')}  to={a.to}")
except urllib.error.HTTPError as e:
    print(f"FAILED  HTTP {e.code}: {e.read().decode()}")
    sys.exit(1)
