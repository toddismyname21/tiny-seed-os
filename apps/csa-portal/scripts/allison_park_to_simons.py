#!/usr/bin/env python3
"""
Allison Park consolidation: move St. Paul's members + Allison-Park-TBD
(null pickup, city='Allison Park' or zip 15101) → Simon's Farm Stand.
Idempotent: only patches members not already at Simon's. Dry-run unless
--apply is passed.
"""
import json, sys, urllib.request, urllib.error
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SIMONS   = "2f7d376c-fc51-4a12-8b5d-50f3a1baed85"   # Allison Park - Simons (Wed)
STPAULS  = "b62b5e91-8b69-429d-affd-5f20f3eb02f3"   # Allison Park - St. Paul's UMC
APPLY = "--apply" in sys.argv

e={}
for ln in (ROOT/".env").read_text().splitlines():
    ln=ln.strip()
    if ln and not ln.startswith("#") and "=" in ln:
        k,v=ln.split("=",1); e[k.strip()]=v.strip().strip('"').strip("'")
URL=e["PUBLIC_SUPABASE_URL"]; KEY=e["SUPABASE_SERVICE_ROLE_KEY"]
H={"apikey":KEY,"Authorization":f"Bearer {KEY}","Content-Type":"application/json"}

def req(method,path,body=None,headers=None):
    data=json.dumps(body).encode() if body is not None else None
    r=urllib.request.Request(f"{URL}{path}",data=data,method=method,headers={**H,**(headers or {})})
    try:
        with urllib.request.urlopen(r,timeout=60) as resp:
            raw=resp.read().decode(); return resp.status,(json.loads(raw) if raw else None)
    except urllib.error.HTTPError as ex:
        return ex.code, ex.read().decode()

# 1. St Paul's active members
_,stp = req("GET", f"/rest/v1/members?select=id,customer:customers(contact_name,email)&pickup_location_id=eq.{STPAULS}&status=eq.active")
# 2. Null-pickup active members → filter Allison Park in memory
_,nul = req("GET", "/rest/v1/members?select=id,customer:customers(contact_name,email,city,zip)&pickup_location_id=is.null&status=eq.active")
def is_ap(c):
    c=c or {}; city=(c.get("city") or "").strip().lower(); zip_=(c.get("zip") or "").strip()
    return city.startswith("allison park") or zip_=="15101"
tbd=[m for m in (nul or []) if is_ap(m.get("customer"))]

moves={}
for m in (stp or []): moves[m["id"]]=("St. Paul's", (m.get("customer") or {}).get("contact_name"))
for m in tbd:         moves[m["id"]]=("TBD/null",  (m.get("customer") or {}).get("contact_name"))

print(f"St. Paul's active: {len(stp or [])}   Allison-Park-TBD (null pickup): {len(tbd)}")
print(f"Total to move → Simon's: {len(moves)}\n")
for mid,(src,nm) in moves.items():
    print(f"  [{src:10}] {nm}")

if not moves:
    print("\nNothing to move."); sys.exit(0)
if not APPLY:
    print("\nDRY RUN. Re-run with --apply to write."); sys.exit(0)

ids=",".join(moves.keys())
st,res=req("PATCH", f"/rest/v1/members?id=in.({ids})",
           {"pickup_location_id":SIMONS,"pickup_day":"Wed"},
           {"Prefer":"return=representation"})
if st not in (200,204):
    sys.exit(f"PATCH FAILED {st}: {res}")
print(f"\nAPPLIED — moved {len(res) if isinstance(res,list) else len(moves)} members to Simon's (Wed).")
