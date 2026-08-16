#!/usr/bin/env python3
"""Backfill flex debits: for every (member, week) with PENDING flex orders that
was never debited (no debit ledger row), debit the cart total from their Shopify
store credit and record a flex_transactions ledger row. Idempotent (skips any
already-debited order), reversible (every debit recorded). Excludes test accounts.
Reports each member's before→after so balances can be spot-checked."""
import os, json, time, sys
import requests

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def load_env(p):
    if os.path.exists(p):
        for line in open(p):
            line=line.strip()
            if line and not line.startswith('#') and '=' in line:
                k,v=line.split('=',1); os.environ.setdefault(k.strip(),v.strip())
for p in (os.path.join(os.path.dirname(os.path.dirname(ROOT)),'mcp-server','.env'),
          os.path.join(os.path.dirname(os.path.dirname(ROOT)),'.env.csa')):
    load_env(p)

PAT=os.environ['SUPABASE_PAT']; REF=os.environ['SUPABASE_PROJECT_REF']
SHOP=os.environ['SHOPIFY_STORE_NAME']; STOK=os.environ['SHOPIFY_ACCESS_TOKEN']
SAPI=f"https://{SHOP}.myshopify.com/admin/api/2024-10/graphql.json"
SH={"X-Shopify-Access-Token":STOK,"Content-Type":"application/json"}
EXECUTE = len(sys.argv)>1 and sys.argv[1]=='GO'

def sql(q):
    for _ in range(3):
        r=requests.post(f"https://api.supabase.com/v1/projects/{REF}/database/query",
            headers={"Authorization":f"Bearer {PAT}","Content-Type":"application/json"},
            data=json.dumps({"query":q}),timeout=30)
        if r.status_code in (200,201): return r.json()
        time.sleep(3)
    raise RuntimeError(f"sql failed: {r.status_code} {r.text[:200]}")
def gql(q,v):
    r=requests.post(SAPI,headers=SH,data=json.dumps({"query":q,"variables":v}),timeout=30)
    return r.json()

# pending (member, week) groups never debited, excluding test accounts
rows=sql("""
SELECT m.id AS member_id, c.email, fo.week_starting::text AS week,
       SUM(fo.total_cents) AS total_cents
FROM flex_orders fo
JOIN members m ON m.id=fo.member_id
JOIN customers c ON c.id=m.customer_id
WHERE fo.status='pending'
  AND c.email IS NOT NULL
  AND c.email NOT ILIKE '%freetodd%' AND c.email NOT ILIKE '%fakeemail%' AND c.email <> 'test@test.com'
  AND NOT EXISTS (
    SELECT 1 FROM flex_transactions ft
    WHERE ft.order_id = 'flexorder:'||m.id||':'||fo.week_starting AND ft.type='debit')
GROUP BY m.id, c.email, fo.week_starting
HAVING SUM(fo.total_cents) > 0
ORDER BY c.email, fo.week_starting;""")

print(f"{'EXECUTE' if EXECUTE else 'DRY RUN'} — {len(rows)} (member,week) groups to backfill\n")
done=0; debited=0.0; fails=[]
for r in rows:
    email=r['email']; week=r['week']; total=round(r['total_cents']/100,2); mid=r['member_id']
    if not EXECUTE:
        print(f"  would debit ${total:6.2f}  {email}  wk {week}"); continue
    try:
        cust=gql('query($q:String!){customers(first:1,query:$q){edges{node{id storeCreditAccounts(first:5){edges{node{id balance{amount}}}}}}}}',{"q":f'email:"{email}"'})
        edges=cust['data']['customers']['edges']
        if not edges: fails.append((email,week,total,'no shopify customer')); print(f"  SKIP  {email} wk {week}: no shopify customer"); continue
        accts=edges[0]['node']['storeCreditAccounts']['edges']
        if not accts: fails.append((email,week,total,'no store-credit account')); print(f"  SKIP  {email} wk {week}: no store-credit account"); continue
        acct_id=accts[0]['node']['id']; old=sum(float(e['node']['balance']['amount']) for e in accts)
        deb=gql('mutation($id:ID!,$amt:MoneyInput!){storeCreditAccountDebit(id:$id,debitInput:{debitAmount:$amt}){storeCreditAccountTransaction{account{balance{amount}}} userErrors{message}}}',
                {"id":acct_id,"amt":{"amount":f"{total:.2f}","currencyCode":"USD"}})
        ue=deb.get('data',{}).get('storeCreditAccountDebit',{}).get('userErrors') or deb.get('errors')
        if ue: fails.append((email,week,total,str(ue))); print(f"  FAIL  {email} wk {week} ${total}: {ue}"); continue
        new=deb['data']['storeCreditAccountDebit']['storeCreditAccountTransaction']['account']['balance']['amount']
        eml=email.replace("'","''")
        sql(f"INSERT INTO flex_transactions (member_id,email,type,amount,reason,order_id) VALUES ('{mid}','{eml}','debit',{total},'Flex order backfill — week of {week}','flexorder:{mid}:{week}')")
        done+=1; debited+=total
        print(f"  OK    {email:38} wk {week}  ${total:6.2f}  ${old:.2f} -> ${new}")
        time.sleep(0.5)
    except Exception as e:
        fails.append((email,week,total,str(e)[:80])); print(f"  ERROR {email} wk {week}: {e}")
print(f"\n{'Debited' if EXECUTE else 'Would debit'}: {done if EXECUTE else len(rows)} orders, ${debited:.2f}" if EXECUTE else f"\nTotal would debit: ${sum(round(r['total_cents']/100,2) for r in rows):.2f} across {len(rows)} orders")
if fails: print(f"FAILURES/SKIPS ({len(fails)}):"); [print('   ',f) for f in fails]
