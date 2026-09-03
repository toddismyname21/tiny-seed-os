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

── APPROVAL GATE ────────────────────────────────────────────────────────────
Refuses to send to any EXTERNAL recipient unless --todd-approved carries Todd's
VERBATIM approval words.

Why: on 2026-09-03 an email to the PA Dept of Agriculture was sent after Todd
said "I am going to forgo the call and just email to get the ball rolling."
That was a decision about CHANNEL, not a release — Todd had said "send it out
after my approval" and wanted to read the draft first. The operator interpreted;
interpretation is the failure mode. Todd: "it really makes me nervous I am
going to send out information I do not want to send out."

This gate forces the operator to paste Todd's actual approval phrase. Pasting
"forgo the call and just email" into an approval field exposes itself as a
non-approval instantly; "send it" does not. The quote prints with the send, so
every external transmission carries its authorization on the record.

Internal sends (all recipients @tinyseedfarmpgh.com or farm team addresses)
are exempt — mailing Todd his own documents needs no ceremony.
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
ap.add_argument("--todd-approved", default="", metavar="QUOTE",
                help="Todd's VERBATIM approval words for this send (required for external recipients).")
a = ap.parse_args()

# ── verification gate (shared module — every sender uses the same one) ─────
sys.path.insert(0, str(Path(__file__).resolve().parent))
from verify_facts import enforce as _enforce_facts

_enforce_facts(a.text, a.subject, a.i_verified)

TEAM = ["todd@tinyseedfarmpgh.com", "tinyseedfleurs@gmail.com"]
TO = [x.strip() for x in a.to.split(",") if x.strip()]
if not TO:
    sys.exit("--to had no usable address")

# ── approval gate: external recipients require Todd's verbatim release ──────
INTERNAL = {t.lower() for t in TEAM} | {"tinyseedcsa@gmail.com"}
_external = [t for t in TO if t.lower() not in INTERNAL]
if _external:
    _q = a.todd_approved.strip()
    # Phrases that are decisions about channel/strategy, NOT a release. If the
    # quote is only this, the operator is interpreting again — block it.
    _non_release = re.search(
        r"forgo|instead of|rather than|just email|email is fine|let'?s (just )?email|get the ball rolling",
        _q, re.I) and not re.search(r"\bsend\b|\bapprove", _q, re.I)
    if not _q:
        sys.exit("BLOCKED — external recipient(s) %s with NO approval.\n"
                 "Show Todd the draft, wait for his release, then pass his exact words:\n"
                 '  --todd-approved "send it"\n'
                 "A channel choice ('let's just email') is NOT a release." % ", ".join(_external))
    if _non_release:
        sys.exit("BLOCKED — the quoted words are a channel/strategy decision, not a release:\n"
                 "  \"%s\"\n"
                 "Go back and ask Todd: 'Ready for me to send?' Only an explicit release sends." % _q)
    print(f"APPROVED by Todd: \"{_q}\"  → external: {', '.join(_external)}")
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
