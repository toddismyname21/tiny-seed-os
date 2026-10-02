#!/usr/bin/env python3
"""Search Todd's Gmail read-only.  usage: gmail_search.py "<gmail query>" [n]
   Lives here (not /tmp) because /tmp gets wiped and silent empty results
   look exactly like "no matches" — 2026-10-01."""
import json, sys, base64, re, requests
ROOT='/Users/toddsmacbookpro2026/Documents/TIny_Seed_OS'
tok=json.load(open(f'{ROOT}/tinypm/.oauth_tokens/todd.json'))
env={}
for line in open(f'{ROOT}/tinypm/.env'):
    line=line.strip()
    if line and not line.startswith('#') and '=' in line:
        k,v=line.split('=',1); env[k.strip()]=v.strip().strip('"\'')
r=requests.post('https://oauth2.googleapis.com/token', data={
  'client_id':env['GOOGLE_CLIENT_ID'],'client_secret':env['GOOGLE_CLIENT_SECRET'],
  'refresh_token':tok['refresh_token'],'grant_type':'refresh_token'})
r.raise_for_status()
H={'Authorization':'Bearer '+r.json()['access_token']}

def search(q,n=25):
    r=requests.get('https://gmail.googleapis.com/gmail/v1/users/me/messages',
                   headers=H,params={'q':q,'maxResults':n}); r.raise_for_status()
    return [m['id'] for m in r.json().get('messages',[])]

def meta(mid):
    r=requests.get(f'https://gmail.googleapis.com/gmail/v1/users/me/messages/{mid}',
        headers=H,params={'format':'metadata','metadataHeaders':['From','To','Subject','Date']})
    r.raise_for_status(); j=r.json()
    h={x['name']:x['value'] for x in j['payload']['headers']}
    return {'id':mid,'date':h.get('Date',''),'from':h.get('From',''),
            'subj':h.get('Subject',''),'snippet':j.get('snippet','')[:200]}

def body(mid):
    r=requests.get(f'https://gmail.googleapis.com/gmail/v1/users/me/messages/{mid}',
                   headers=H,params={'format':'full'}); r.raise_for_status()
    j=r.json(); out=[]
    def walk(p):
        mt=p.get('mimeType','')
        if mt=='text/plain' and p.get('body',{}).get('data'):
            out.append(base64.urlsafe_b64decode(p['body']['data']).decode('utf8','replace'))
        elif mt=='text/html' and p.get('body',{}).get('data') and not out:
            h=base64.urlsafe_b64decode(p['body']['data']).decode('utf8','replace')
            h=re.sub(r'<(script|style)[^>]*>.*?</\1>','',h,flags=re.S|re.I)
            h=re.sub(r'<br\s*/?>|</tr>|</p>|</div>','\n',h,flags=re.I)
            out.append(re.sub(r'\n{3,}','\n\n',re.sub(r'<[^>]+>','',h)))
        for c in p.get('parts',[]) or []: walk(c)
    walk(j['payload'])
    hd={x['name']:x['value'] for x in j['payload']['headers']}
    atts=[]
    def wa(p):
        if p.get('filename'): atts.append(p['filename'])
        for c in p.get('parts',[]) or []: wa(c)
    wa(j['payload'])
    return hd,'\n'.join(out),atts

if __name__=='__main__':
    q=sys.argv[1]; n=int(sys.argv[2]) if len(sys.argv)>2 else 25
    ids=search(q,n)
    print(f'query: {q!r} -> {len(ids)} hit(s)')
    for mid in ids:
        m=meta(mid)
        print(f"{m['date'][:22]:24} {m['from'][:40]:42} {m['subj'][:65]}")
        print(f"     id={m['id']}  {m['snippet'][:140]}")
