#!/usr/bin/env python3
"""
CSA INBOX TRIAGE — watches Todd's inbox AND the CSA inbox so no member email is ever missed.

Reads both mailboxes over IMAP, finds CSA-related mail, classifies each as
NEEDS REPLY / NEEDS ACTION / FYI, and prints a triage report. State is tracked in
.csa_inbox_state.json so each message is reported once (nothing re-flagged, nothing missed).

SETUP (one time): add to apps/csa-portal/.env (Gmail App Passwords, 16 chars, no spaces):
    IMAP_TODD_USER=todd@tinyseedfarmpgh.com
    IMAP_TODD_APP_PASSWORD=xxxxxxxxxxxxxxxx
    IMAP_CSA_USER=tinyseedcsa@gmail.com
    IMAP_CSA_APP_PASSWORD=xxxxxxxxxxxxxxxx

RUN:  python3 scripts/csa_inbox_triage.py [--days N] [--all]
      --days N : look back N days (default 4)
      --all    : re-scan even already-seen messages (ignore state)
"""
import imaplib, email, json, re, sys, argparse
from email.header import decode_header
from email.utils import parsedate_to_datetime, parseaddr
from datetime import datetime, timedelta, timezone
from pathlib import Path

ENV = {}
envp = Path(__file__).resolve().parent.parent / ".env"
for ln in envp.read_text().splitlines():
    ln = ln.strip()
    if ln and not ln.startswith("#") and "=" in ln:
        k, v = ln.split("=", 1); ENV[k.strip()] = v.strip().strip('"').strip("'")

STATE = Path(__file__).resolve().parent.parent / ".csa_inbox_state.json"

# A message is CSA-related if it hits these (the CSA inbox treats everything as CSA).
CSA_TERMS = ["csa","share","pickup","pick up","box","flex","vacation","hold","add-on","add on",
             "mushroom","bread","cheese","bouquet","flower","market","bloomfield","sewickley",
             "south side","lawrenceville","squirrel hill","mt. leb","mt leb","north side","oakmont",
             "allison park","cranberry","zelienople","highland park","north park","fox chapel",
             "tiny seed","delivery","harvest","week a","week b","biweekly","subscription","seedling"]
# Action signals
REPLY_SIGNALS = ["?","can you","could you","would you","how do","when is","where do","where is",
                 "is it possible","please confirm","let me know","question","wondering","help",
                 "not sure","confused","do i","can i"]
ACTION_SIGNALS = ["cancel","refund","change","switch","move","upgrade","downgrade","vacation",
                  "hold","skip","didn't receive","did not receive","never got","missing","wrong",
                  "didn't get","complaint","disappointed","stop","pause","update my","new address"]
# Ignore obvious automated/no-reply noise
NOISE_FROM = ["no-reply","noreply","notifications@","mailer-daemon","calendar-notification",
              "donotreply","do-not-reply"]

def dec(s):
    if not s: return ""
    out = []
    for txt, enc in decode_header(s):
        out.append(txt.decode(enc or "utf-8", "ignore") if isinstance(txt, bytes) else txt)
    return "".join(out)

def body_text(msg):
    if msg.is_multipart():
        for part in msg.walk():
            if part.get_content_type() == "text/plain" and "attachment" not in str(part.get("Content-Disposition")):
                try: return part.get_payload(decode=True).decode(part.get_content_charset() or "utf-8", "ignore")
                except Exception: pass
        return ""
    try: return msg.get_payload(decode=True).decode(msg.get_content_charset() or "utf-8", "ignore")
    except Exception: return ""

def classify(frm, subj, body, is_csa_inbox):
    blob = (subj + " " + body).lower()
    is_csa = is_csa_inbox or any(t in blob for t in CSA_TERMS)
    if not is_csa: return None
    fa = frm.lower()
    if any(n in fa for n in NOISE_FROM): return None
    if any(s in blob for s in ACTION_SIGNALS): cat = "NEEDS ACTION"
    elif any(s in blob for s in REPLY_SIGNALS): cat = "NEEDS REPLY"
    else: cat = "FYI"
    return cat

def scan(user, pw, label, since_dt, seen, use_state):
    found = []
    try:
        M = imaplib.IMAP4_SSL("imap.gmail.com")
        M.login(user, pw)
    except Exception as ex:
        print(f"  ⚠️ {label} ({user}): login failed — {ex}"); return found
    M.select("INBOX")
    since = since_dt.strftime("%d-%b-%Y")
    typ, data = M.search(None, f'(SINCE {since})')
    ids = data[0].split()
    for num in ids:
        typ, d = M.fetch(num, "(RFC822)")
        if not d or not d[0]: continue
        msg = email.message_from_bytes(d[0][1])
        mid = msg.get("Message-ID", "") or f"{label}:{num.decode()}"
        if use_state and mid in seen: continue
        frm = dec(msg.get("From", "")); subj = dec(msg.get("Subject", ""))
        body = body_text(msg)[:1500]
        try: dt = parsedate_to_datetime(msg.get("Date"))
        except Exception: dt = None
        cat = classify(frm, subj, body, is_csa_inbox=(label == "CSA inbox"))
        if cat:
            name, addr = parseaddr(frm)
            found.append({"mid": mid, "inbox": label, "from": name or addr, "addr": addr,
                          "subject": subj, "date": dt.strftime("%a %b %d %H:%M") if dt else "?",
                          "cat": cat, "snippet": re.sub(r"\s+", " ", body)[:240]})
        seen.add(mid)
    M.logout()
    return found

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--days", type=int, default=4)
    ap.add_argument("--all", action="store_true")
    args = ap.parse_args()
    seen = set()
    if STATE.exists() and not args.all:
        seen = set(json.loads(STATE.read_text()).get("seen", []))
    since_dt = datetime.now(timezone.utc) - timedelta(days=args.days)
    accounts = [("Todd inbox", ENV.get("IMAP_TODD_USER"), ENV.get("IMAP_TODD_APP_PASSWORD")),
                ("CSA inbox", ENV.get("IMAP_CSA_USER"), ENV.get("IMAP_CSA_APP_PASSWORD")),
                ("Wholesale inbox", ENV.get("IMAP_WHOLESALE_USER"), ENV.get("IMAP_WHOLESALE_APP_PASSWORD"))]
    all_found = []
    for label, user, pw in accounts:
        if not user or not pw:
            print(f"  (skip {label} — no IMAP_*_APP_PASSWORD in .env yet)"); continue
        all_found += scan(user, pw, label, since_dt, seen, use_state=not args.all)
    order = {"NEEDS ACTION": 0, "NEEDS REPLY": 1, "FYI": 2}
    all_found.sort(key=lambda x: (order.get(x["cat"], 9), x["date"]))
    print("\n" + "=" * 72)
    print(f"  CSA INBOX TRIAGE — {len([x for x in all_found if x['cat']!='FYI'])} need attention, {len(all_found)} new CSA emails (last {args.days}d)")
    print("=" * 72)
    for cat in ["NEEDS ACTION", "NEEDS REPLY", "FYI"]:
        rows = [x for x in all_found if x["cat"] == cat]
        if not rows: continue
        print(f"\n### {cat} ({len(rows)})")
        for x in rows:
            print(f"  • [{x['inbox']}] {x['from']} <{x['addr']}> — {x['date']}")
            print(f"    SUBJ: {x['subject']}")
            print(f"    {x['snippet']}")
    if not all_found:
        print("\n  ✅ No new CSA emails needing attention.")
    STATE.write_text(json.dumps({"seen": sorted(seen)[-5000:], "last_run": datetime.now(timezone.utc).isoformat()}))
    print("\n(state saved — these won't be re-reported next run)")

if __name__ == "__main__":
    main()
