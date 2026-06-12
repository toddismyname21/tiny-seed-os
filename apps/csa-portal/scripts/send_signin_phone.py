#!/usr/bin/env python3
"""Send the sign-in/confirm-phone nudge to an AUDITED, STAGED CSV audience.
Audience is locked to the CSV (built by the audit) so it cannot drift.
Dry-run by default; --apply to send. Reply-to = team inboxes."""
import sys, csv, json, time, argparse, urllib.request
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
TEAM = ["tinyseedcsa@gmail.com","todd@tinyseedfarmpgh.com","tinyseedfleurs@gmail.com"]
TEST = {"test@test.com","fakeemailsofake@gmail.com","freetodd21@gmail.com"}
TESTSUB = ("fakeemail","freetodd21","test@test")
JUNK_FIRST = {"","csa","unknown","member"}
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/122 Safari/537.36"
def load_env():
    e={}
    for ln in (ROOT/".env").read_text().splitlines():
        ln=ln.strip()
        if ln and not ln.startswith("#") and "=" in ln:
            k,v=ln.split("=",1); e[k.strip()]=v.strip().strip('"').strip("'")
    return e
def first_name(raw):
    tok=(raw or "").strip().split()
    if not tok: return "there"
    f=tok[0]
    if not f.isalpha() or f.lower() in JUNK_FIRST: return "there"
    return f.capitalize()
def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--csv",required=True); ap.add_argument("--subject",required=True)
    ap.add_argument("--textfile",required=True); ap.add_argument("--apply",action="store_true")
    a=ap.parse_args()
    env=load_env(); RKEY=env["RESEND_API_KEY"]; FROM=env["RESEND_FROM_EMAIL"]
    tpl=Path(a.textfile).read_text()
    people={}
    for r in csv.DictReader(Path(a.csv).open()):
        em=(r["email"] or "").strip().lower()
        if not em or em in TEST or any(s in em for s in TESTSUB): continue
        people[em]=first_name(r["name"])
    print(f"CSV: {a.csv}")
    print(f"SUBJECT: {a.subject}")
    print(f"AUDIENCE: {len(people)} unique recipients (test/team-test excluded)")
    for em,fn in list(people.items())[:6]: print(f"   {fn} <{em}>")
    if not a.apply:
        print("\nDRY-RUN. Re-run with --apply to send."); return
    ok=fail=0; ids=[]
    for em,fn in people.items():
        payload={"from":FROM,"to":[em],"subject":a.subject,
                 "text":tpl.replace("{{first_name}}",fn),"reply_to":TEAM,"bcc":["todd@tinyseedfarmpgh.com"]}
        req=urllib.request.Request("https://api.resend.com/emails",data=json.dumps(payload).encode(),
            method="POST",headers={"Authorization":f"Bearer {RKEY}","Content-Type":"application/json",
            "User-Agent":UA,"Accept":"application/json"})
        try:
            resp=json.loads(urllib.request.urlopen(req,timeout=40).read()); ok+=1; ids.append(resp.get("id"))
        except Exception as ex:
            fail+=1; print(f"  FAIL {em}: {ex}")
        time.sleep(0.35)
    print(f"\nSENT {ok}, failed {fail}")
    print("first 3 Resend ids:", ids[:3])
if __name__=="__main__": main()
