#!/usr/bin/env python3
"""PROVE/disprove the flex double-debit race: fire N simultaneous identical
flex submits at freetodd21 and check whether the balance drops once or N times."""
import os, json, base64, time, threading
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
SU=os.environ['SUPABASE_URL'].rstrip('/'); SK=os.environ.get('SUPABASE_SERVICE_ROLE_KEY') or os.environ['SUPABASE_SERVICE_KEY']
REF=os.environ.get('SUPABASE_PROJECT_REF','melizsvabemhaqeaqtyw'); PAT=os.environ['SUPABASE_PAT']
SITE='https://csa.tinyseedfarm.com'; EMAIL='freetodd21@gmail.com'
UA='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36'
MEMBER='5f493595-9760-4b78-ae3f-53da4aa989c5'; WEEK='2026-06-22'; ROSEMARY='d04d0dbc-fc8d-4c96-9850-21cc9d531e08'
b64=lambda b: base64.urlsafe_b64encode(b).decode().rstrip('=')
def sql(query):
    r=requests.post(f"https://api.supabase.com/v1/projects/{REF}/database/query",headers={"Authorization":f"Bearer {PAT}","Content-Type":"application/json"},data=json.dumps({"query":query}),timeout=30)
    return r.json()
# session
r=requests.post(f'{SU}/auth/v1/admin/generate_link',headers={'apikey':SK,'Authorization':f'Bearer {SK}','Content-Type':'application/json','User-Agent':UA},json={'type':'magiclink','email':EMAIL,'redirect_to':SITE+'/account'}); r.raise_for_status()
r2=requests.get(r.json()['action_link'],allow_redirects=False,headers={'User-Agent':UA})
q=parse_qs(urlparse(r2.headers.get('Location','')).fragment)
acc=q['access_token'][0]; rt=q['refresh_token'][0]; exp=int(q.get('expires_at',['0'])[0]); sub=json.loads(base64.urlsafe_b64decode(acc.split('.')[1]+'=='))['sub']
sess={'access_token':acc,'refresh_token':rt,'expires_in':3600,'expires_at':exp,'token_type':'bearer','user':{'id':sub,'aud':'authenticated','role':'authenticated','email':EMAIL}}
val='base64-'+b64(json.dumps(sess).encode()); name=f'sb-{REF}-auth-token'
cookies={name:val} if len(val)<=3180 else {f'{name}.{i//3180}':val[i:i+3180] for i in range(0,len(val),3180)}
H={'User-Agent':UA,'Origin':SITE,'Referer':SITE+'/account/flex-order','Content-Type':'application/x-www-form-urlencoded'}
def bal():
    d=requests.get(f'{SITE}/api/account/flex-balance',cookies=cookies,headers={'User-Agent':UA}).json(); return d.get('total')
# clean slate
sql(f"DELETE FROM flex_orders WHERE member_id='{MEMBER}' AND week_starting='{WEEK}'")
sql(f"DELETE FROM flex_transactions WHERE order_id='flexorder:{MEMBER}:{WEEK}'")
b0=bal(); print(f"B0 (clean): ${b0}")
N=6; body={'member_id':MEMBER,'week_starting':WEEK,'lines':json.dumps([{'flex_item_id':ROSEMARY,'qty':1}])}
results=[]
def fire():
    try: results.append(requests.post(f'{SITE}/api/account/flex-order/submit',cookies=cookies,headers=H,data=body,allow_redirects=False,timeout=30).status_code)
    except Exception as e: results.append(str(e))
ths=[threading.Thread(target=fire) for _ in range(N)]
print(f"firing {N} simultaneous identical $3 submits...")
for t in ths: t.start()
for t in ths: t.join()
time.sleep(3)
b1=bal()
deb=sql(f"SELECT count(*) c, COALESCE(sum(amount),0) s FROM flex_transactions WHERE order_id='flexorder:{MEMBER}:{WEEK}' AND type='debit'")
print(f"responses: {results}")
print(f"B1 after {N} concurrent submits: ${b1}  (dropped ${round((b0 or 0)-(b1 or 0),2)})")
print(f"debit ledger rows: {deb[0]['c']}  total debited: ${deb[0]['s']}")
print(f"VERDICT: {'SAFE (single $3 debit)' if abs((b0 or 0)-(b1 or 0)-3)<0.01 and int(deb[0]['c'])==1 else 'RACE CONFIRMED — multiple debits for one cart'}")
