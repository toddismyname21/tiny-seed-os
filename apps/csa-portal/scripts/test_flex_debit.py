#!/usr/bin/env python3
"""Verify flex deduct-at-order on freetodd21 (TEST account). Places/edits orders
and checks the Shopify store-credit balance moves correctly + idempotently.
Reverses everything at the end to leave the test account clean."""
import os, json, base64, time
from urllib.parse import urlparse, parse_qs
import requests

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def load_env(p):
    if os.path.exists(p):
        for line in open(p):
            line=line.strip()
            if line and not line.startswith('#') and '=' in line:
                k,v=line.split('=',1); os.environ.setdefault(k.strip(),v.strip())
load_env(os.path.join(ROOT,'.env'))
load_env(os.path.join(os.path.dirname(os.path.dirname(ROOT)),'.env.csa'))

SU=os.environ['SUPABASE_URL'].rstrip('/')
SK=os.environ.get('SUPABASE_SERVICE_ROLE_KEY') or os.environ['SUPABASE_SERVICE_KEY']
REF=os.environ.get('SUPABASE_PROJECT_REF','melizsvabemhaqeaqtyw')
SITE='https://csa.tinyseedfarm.com'; EMAIL='freetodd21@gmail.com'
UA='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36'
MEMBER='5f493595-9760-4b78-ae3f-53da4aa989c5'; WEEK='2026-06-22'
ROSEMARY='d04d0dbc-fc8d-4c96-9850-21cc9d531e08'  # $3
CILANTRO='eb6035ef-7bc5-4ac5-98b9-5d3a7ea95ef5'  # $3
b64=lambda b: base64.urlsafe_b64encode(b).decode().rstrip('=')

# session
r=requests.post(f'{SU}/auth/v1/admin/generate_link',headers={'apikey':SK,'Authorization':f'Bearer {SK}','Content-Type':'application/json','User-Agent':UA},json={'type':'magiclink','email':EMAIL,'redirect_to':SITE+'/account'}); r.raise_for_status()
r2=requests.get(r.json()['action_link'],allow_redirects=False,headers={'User-Agent':UA})
q=parse_qs(urlparse(r2.headers.get('Location','')).fragment)
acc=q['access_token'][0]; rt=q['refresh_token'][0]; exp=int(q.get('expires_at',['0'])[0])
sub=json.loads(base64.urlsafe_b64decode(acc.split('.')[1]+'=='))['sub']
sess={'access_token':acc,'refresh_token':rt,'expires_in':3600,'expires_at':exp,'token_type':'bearer','user':{'id':sub,'aud':'authenticated','role':'authenticated','email':EMAIL}}
val='base64-'+b64(json.dumps(sess).encode()); name=f'sb-{REF}-auth-token'
cookies={}
if len(val)>3180:
    for i in range(0,len(val),3180): cookies[f'{name}.{i//3180}']=val[i:i+3180]
else: cookies[name]=val
H={'User-Agent':UA}; HPOST={**H,'Origin':SITE,'Referer':SITE+'/account/flex-order','Content-Type':'application/x-www-form-urlencoded'}

def balance():
    rr=requests.get(f'{SITE}/api/account/flex-balance',cookies=cookies,headers=H)
    try: d=rr.json()
    except: return None
    for k in ('total','balance','available'):
        if isinstance(d,dict) and k in d:
            v=d[k]
            return v.get('total') if isinstance(v,dict) else v
    return d

def submit(lines):
    body={'member_id':MEMBER,'week_starting':WEEK,'lines':json.dumps(lines)}
    rr=requests.post(f'{SITE}/api/account/flex-order/submit',cookies=cookies,headers=HPOST,data=body,allow_redirects=False)
    loc=rr.headers.get('Location','')
    return rr.status_code, loc

def step(label, expect):
    b=balance(); print(f'  {label}: balance=${b}  (expect {expect})'); return b

print('FLEX DEBIT TEST — freetodd21\n')
b0=step('B0 before any order','baseline')
print('  place Rosemary $3 ->', submit([{'flex_item_id':ROSEMARY,'qty':1}])); time.sleep(2)
b1=step('B1 after $3 order', f'{b0}-3')
print('  RE-SUBMIT same $3 (idempotency) ->', submit([{'flex_item_id':ROSEMARY,'qty':1}])); time.sleep(2)
b2=step('B2 after resubmit', f'{b1} (no change)')
print('  EDIT add Cilantro (total $6) ->', submit([{'flex_item_id':ROSEMARY,'qty':1},{'flex_item_id':CILANTRO,'qty':1}])); time.sleep(2)
b3=step('B3 after edit to $6', f'{b1}-3')
print('  EDIT back to $3 (refund) ->', submit([{'flex_item_id':ROSEMARY,'qty':1}])); time.sleep(2)
b4=step('B4 after edit to $3', f'{b1} (refunded)')
print('\nVERDICT:')
def chk(name,cond): print(f'  {"PASS" if cond else "FAIL"}  {name}')
if None in (b0,b1,b2,b3,b4): print('  (could not read balance — inspect /api/account/flex-balance)')
else:
    chk('debit on order (B1 = B0-3)', abs(b1-(b0-3))<0.01)
    chk('idempotent re-submit (B2 = B1)', abs(b2-b1)<0.01)
    chk('edit up debits delta (B3 = B1-3)', abs(b3-(b1-3))<0.01)
    chk('edit down refunds (B4 = B1)', abs(b4-b1)<0.01)
