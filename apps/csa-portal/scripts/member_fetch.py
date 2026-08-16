#!/usr/bin/env python3
"""Fetch a member-facing page as a given member (auth via magic link).
Usage: member_fetch.py <email> <path>"""
import os, json, base64, sys
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

SUPABASE_URL=os.environ['SUPABASE_URL'].rstrip('/')
SERVICE_KEY=os.environ.get('SUPABASE_SERVICE_ROLE_KEY') or os.environ['SUPABASE_SERVICE_KEY']
REF=os.environ.get('SUPABASE_PROJECT_REF','melizsvabemhaqeaqtyw')
SITE='https://csa.tinyseedfarm.com'
UA='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36'
b64=lambda b: base64.urlsafe_b64encode(b).decode().rstrip('=')
EMAIL=sys.argv[1]; PATH=sys.argv[2] if len(sys.argv)>2 else '/account'

r=requests.post(f'{SUPABASE_URL}/auth/v1/admin/generate_link',
    headers={'apikey':SERVICE_KEY,'Authorization':f'Bearer {SERVICE_KEY}','Content-Type':'application/json','User-Agent':UA},
    json={'type':'magiclink','email':EMAIL,'redirect_to':SITE+'/account'}); r.raise_for_status()
r2=requests.get(r.json()['action_link'],allow_redirects=False,headers={'User-Agent':UA})
q=parse_qs(urlparse(r2.headers.get('Location','')).fragment)
acc=q['access_token'][0]; rt=q['refresh_token'][0]; exp=int(q.get('expires_at',['0'])[0])
sub=json.loads(base64.urlsafe_b64decode(acc.split('.')[1]+'=='))['sub']
sess={'access_token':acc,'refresh_token':rt,'expires_in':3600,'expires_at':exp,'token_type':'bearer',
      'user':{'id':sub,'aud':'authenticated','role':'authenticated','email':EMAIL}}
val='base64-'+b64(json.dumps(sess).encode()); name=f'sb-{REF}-auth-token'
cookies={}
if len(val)>3180:
    for i in range(0,len(val),3180): cookies[f'{name}.{i//3180}']=val[i:i+3180]
else: cookies[name]=val
rr=requests.get(SITE+PATH,cookies=cookies,headers={'User-Agent':UA})
sys.stderr.write(f'GET {PATH} as {EMAIL} -> {rr.status_code}, final={rr.url}\n')
sys.stdout.write(rr.text)
