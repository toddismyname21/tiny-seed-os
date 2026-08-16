#!/usr/bin/env python3
"""Empirically verify the 0053 ownership guards on schedule_vacation_hold,
cancel_vacation_hold, change_pickup_location by calling them via PostgREST RPC
(the IDOR attack vector) with member and admin JWTs. NON-DESTRUCTIVE: every
probe uses inputs that pass the guard then fail a later validation, so nothing
is mutated. Expect:
  own member  -> a non-'forbidden' error (guard passed)
  other member-> 'forbidden' (IDOR blocked)
  admin JWT   -> a non-'forbidden' error (admin allowed on any member)
"""
import os, json, base64
from urllib.parse import urlparse, parse_qs
import requests

ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def le(p):
    if os.path.exists(p):
        for l in open(p):
            l=l.strip()
            if l and not l.startswith('#') and '=' in l:
                k,v=l.split('=',1); os.environ.setdefault(k.strip(),v.strip())
le(os.path.join(ROOT,'.env')); le(os.path.join(os.path.dirname(os.path.dirname(ROOT)),'.env.csa'))
SU=os.environ['SUPABASE_URL'].rstrip('/')
SK=os.environ.get('SUPABASE_SERVICE_ROLE_KEY') or os.environ['SUPABASE_SERVICE_KEY']
ANON=os.environ['SUPABASE_ANON_KEY']
UA='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36'

OWN='45d105ac-16af-4bae-8e80-e5aac2d8699b'      # freetodd21's member
VICTIM='b7f260ab-c1e1-4b2f-a793-88270ac3b64b'   # drdpgh's member (do not mutate)
RAND='00000000-0000-0000-0000-000000000000'
FUTURE_A='2099-01-05'; FUTURE_B='2099-01-12'

def token(email):
    r=requests.post(f'{SU}/auth/v1/admin/generate_link',headers={'apikey':SK,'Authorization':f'Bearer {SK}','Content-Type':'application/json','User-Agent':UA},json={'type':'magiclink','email':email,'redirect_to':'https://csa.tinyseedfarm.com/account'}); r.raise_for_status()
    r2=requests.get(r.json()['action_link'],allow_redirects=False,headers={'User-Agent':UA})
    return parse_qs(urlparse(r2.headers.get('Location','')).fragment)['access_token'][0]

MEMBER_JWT=token('freetodd21@gmail.com')
ADMIN_JWT=token('todd@tinyseedfarmpgh.com')

def rpc(fn, args, jwt):
    r=requests.post(f'{SU}/rest/v1/rpc/{fn}',headers={'apikey':ANON,'Authorization':f'Bearer {jwt}','Content-Type':'application/json','User-Agent':UA},data=json.dumps(args),timeout=30)
    try: return r.json()
    except Exception: return {'http':r.status_code,'text':r.text[:200]}

def err(resp):
    return resp.get('error') if isinstance(resp,dict) else resp

PASS=True
def check(label, resp, expect_forbidden):
    global PASS
    e=err(resp)
    if expect_forbidden:
        ok = (e=='forbidden')
        verdict='IDOR BLOCKED' if ok else '*** IDOR OPEN ***'
    else:
        ok = (e is not None and e!='forbidden')  # guard passed -> some OTHER validation error
        verdict='guard passed (allowed)' if ok else '*** WRONGLY BLOCKED / unexpected ***'
    PASS = PASS and ok
    print(f"  [{'PASS' if ok else 'FAIL'}] {label}: error={e!r}  -> {verdict}")

print("=== cancel_vacation_hold ===")
check("member -> OWN member",    rpc('cancel_vacation_hold',{'p_member_id':OWN,'p_hold_id':RAND},MEMBER_JWT), False)
check("member -> OTHER member",  rpc('cancel_vacation_hold',{'p_member_id':VICTIM,'p_hold_id':RAND},MEMBER_JWT), True)
check("admin  -> OTHER member",  rpc('cancel_vacation_hold',{'p_member_id':VICTIM,'p_hold_id':RAND},ADMIN_JWT), False)

print("=== change_pickup_location ===")
check("member -> OWN member",    rpc('change_pickup_location',{'p_member_id':OWN,'p_new_location_id':None,'p_new_delivery_address':None},MEMBER_JWT), False)
check("member -> OTHER member",  rpc('change_pickup_location',{'p_member_id':VICTIM,'p_new_location_id':None,'p_new_delivery_address':None},MEMBER_JWT), True)
check("admin  -> OTHER member",  rpc('change_pickup_location',{'p_member_id':VICTIM,'p_new_location_id':None,'p_new_delivery_address':None},ADMIN_JWT), False)

print("=== schedule_vacation_hold ===")
sa={'p_start_date':FUTURE_A,'p_end_date':FUTURE_B,'p_reason':None,'p_disposition':'bogus','p_move_to_week':None}
check("member -> OWN member",    rpc('schedule_vacation_hold',{**sa,'p_member_id':OWN},MEMBER_JWT), False)
check("member -> OTHER member",  rpc('schedule_vacation_hold',{**sa,'p_member_id':VICTIM},MEMBER_JWT), True)
check("admin  -> OTHER member",  rpc('schedule_vacation_hold',{**sa,'p_member_id':VICTIM},ADMIN_JWT), False)

print(f"\nOVERALL: {'ALL GUARDS VERIFIED ✓' if PASS else '*** FAILURES — DO NOT SHIP ***'}")
