# Cloudflare DNS Migration Runbook

**Why:** Squarespace DNS silently appends 3 trailing spaces to TXT records (verified via `dig` hex dump 2026-05-08), which prevents Resend domain verification. Migrating DNS to Cloudflare fixes this and gives us:
- Free, faster DNS resolution
- Honest TXT record handling
- Free SSL on apex (already have Vercel handling subdomain SSL)
- Free DDoS protection
- Analytics on DNS queries

**When to execute:** Before Day 10 (Resend email integration). Estimated 15-30 min total. Zero downtime if executed correctly.

**Risk level:** MEDIUM — wrong execution = email delivery breaks, Shopify storefront breaks. Mitigations below.

---

## Pre-flight Checklist

Before starting:
- [ ] Note current DNS provider's nameservers: `ns-cloud-e1/e2/e3/e4.googledomains.com` (verified via `dig +short NS tinyseedfarm.com`)
- [ ] Export full DNS records list from Squarespace (screenshot or copy-paste each row)
- [ ] Have Cloudflare account ready (sign up free at cloudflare.com if not yet)
- [ ] Confirm `tinyseedfarm.com` registrar (the entity controlling nameservers, NOT the DNS host). May still be Google Domains / Squarespace — to migrate DNS to Cloudflare, we change nameservers at the registrar.
- [ ] No active deployments / business operations during the change window (Wednesday morning is bad — CSA delivery day)

## Step 1 — Inventory ALL existing DNS records (10 min)

In Squarespace DNS panel, list every record. Likely set:

| Record | Type | Host | Data | Why |
|---|---|---|---|---|
| Apex | A | `@` | `23.227.38.32` | Shopify storefront |
| WWW | CNAME | `www` | `tinyseedfarm.com` | redirect to apex |
| CSA portal | CNAME | `csa` | `cname.vercel-dns.com` | Day 1 added |
| Resend DKIM | TXT | `resend._domainkey` | `p=MIGfMA...AB` | broken — has trailing whitespace |
| Resend MX | MX | `send` | `feedback-smtp.us-east-1.amazonses.com` priority 10 | works |
| Resend SPF | TXT | `send` | `v=spf1 include:amazonses.com ~all` | works |
| Google Workspace | MX (?) | `@` | smtp gmail/google | Check — Todd may use Google Workspace email |
| Email auth (?) | TXT | `@` | `v=spf1 include:_spf.google.com ~all` (or similar) | Check — for outbound email from `@tinyseedfarmpgh.com` |
| Domain verification | TXT | various | for Shopify, Google, etc. | Check |

**ACTION:** Take a screenshot of the full Squarespace DNS panel BEFORE making any changes. Save to `docs/email-templates/dns-snapshot-pre-cloudflare.png` (or wherever).

## Step 2 — Add domain to Cloudflare (5 min)

1. cloudflare.com → log in → Add a Site
2. Enter `tinyseedfarm.com`
3. Pick **Free plan**
4. Cloudflare will scan and import all current DNS records — verify each one matches the Squarespace inventory from Step 1
5. **CRITICAL:** uncheck "Proxy" (orange cloud) for ALL records initially. We want Cloudflare to be DNS-only at first. Proxy can be enabled later if we want CDN benefits.
6. **Re-enter the Resend DKIM TXT record cleanly** (this is the whole point of the migration):
   - Delete any imported `resend._domainkey` record
   - Add new TXT: name `resend._domainkey`, content `p=MIGfMA0GCSqGSIb3...wIDAQAB` (no trailing whitespace; paste from `docs/email-templates/magic_link.html` reference values OR from the Resend domain config API)
   - TTL: Auto

## Step 3 — Update nameservers at the registrar (5 min)

Cloudflare gives you 2 nameservers (something like `xxx.ns.cloudflare.com` and `yyy.ns.cloudflare.com`).

Where the nameservers are managed depends on where the domain was originally registered:

**Most likely path** (since current NS is `ns-cloud-e*.googledomains.com`):
1. Squarespace Domains panel (formerly Google Domains)
2. Find `tinyseedfarm.com` → click → look for "Nameservers" section
3. Change from "Use Squarespace name servers" to "Custom name servers"
4. Replace with the 2 Cloudflare nameservers
5. Save

**Propagation:** 1 hour to 24 hours, typically 1-3 hours. During this window, queries may hit either old or new DNS — that's why we made sure Cloudflare's records exactly match Squarespace's first.

## Step 4 — Verify propagation (rolling)

```bash
# Repeat every 15 min until both authoritative nameservers report Cloudflare's
dig +short NS tinyseedfarm.com @8.8.8.8
# Expected eventually: cloudflare nameservers, not googledomains

# When NS update is live, verify all records resolve correctly
dig +short A tinyseedfarm.com @8.8.8.8                       # → 23.227.38.32 (Shopify)
dig +short CNAME csa.tinyseedfarm.com @8.8.8.8                # → cname.vercel-dns.com.
dig +short MX send.tinyseedfarm.com @8.8.8.8                  # → 10 feedback-smtp.us-east-1.amazonses.com.
dig +short TXT resend._domainkey.tinyseedfarm.com @8.8.8.8    # → "p=MIGfMA..." with NO trailing whitespace
dig +short TXT send.tinyseedfarm.com @8.8.8.8                 # → "v=spf1 include:amazonses.com ~all"
```

**Critical check:** the DKIM TXT must end with `B"` (closing quote immediately after the B). NOT `B   "` like Squarespace was doing. Use `xxd` to verify byte-level:

```bash
dig +short TXT resend._domainkey.tinyseedfarm.com @8.8.8.8 | xxd | tail -3
# Last bytes should be: ...IDAQAB"
```

## Step 5 — Trigger Resend re-verify

```bash
source .env.csa
curl -sL -X POST -H "Authorization: Bearer $RESEND_API_KEY" \
  "https://api.resend.com/domains/ed76caed-a99c-4140-abb7-be92398650be/verify"
sleep 30
curl -sL -H "Authorization: Bearer $RESEND_API_KEY" \
  "https://api.resend.com/domains/ed76caed-a99c-4140-abb7-be92398650be" \
  | python3 -m json.tool | grep -E "status"
# Expected: status: verified  (within 1-5 min after DNS resolves cleanly)
```

## Step 6 — Configure Supabase Auth to use Resend SMTP

Once Resend is verified, swap Supabase Auth's email provider:

1. Supabase Dashboard → Authentication → Email Templates → "Use a custom SMTP server"
2. Settings:
   - Host: `smtp.resend.com`
   - Port: `465`
   - Username: `resend`
   - Password: (the Resend API key)
   - Sender email: `hello@tinyseedfarm.com` (or `noreply@tinyseedfarm.com`)
   - Sender name: `Tiny Seed Farm CSA`
3. Save

OR via the Management API:

```bash
curl -X PATCH https://api.supabase.com/v1/projects/melizsvabemhaqeaqtyw/config/auth \
  -H "Authorization: Bearer $SUPABASE_PAT" \
  -H "User-Agent: Mozilla/5.0 TinySeed-Migration" \
  -H "Content-Type: application/json" \
  -d '{
    "smtp_admin_email": "hello@tinyseedfarm.com",
    "smtp_host": "smtp.resend.com",
    "smtp_port": 465,
    "smtp_user": "resend",
    "smtp_pass": "'"$RESEND_API_KEY"'",
    "smtp_sender_name": "Tiny Seed Farm CSA",
    "smtp_max_frequency": 60
  }'
```

After this, magic link emails come from `hello@tinyseedfarm.com` via Resend's deliverability infrastructure.

## Rollback Plan

If something breaks during Step 3 (nameserver change), the rollback:
1. Revert nameservers back to `ns-cloud-e1/e2/e3/e4.googledomains.com` at the registrar
2. Wait for propagation (1-3 hours typical)
3. Squarespace's old records still exist on the Google nameservers — site keeps working
4. Triage what went wrong with Cloudflare setup before retrying

If something breaks AFTER Cloudflare DNS has fully propagated (>24h since change):
1. The fastest fix is in Cloudflare itself — edit the broken record there
2. Records propagate from Cloudflare in ~1-5 min (much faster than Squarespace)
3. If we MUST roll back to Squarespace: change nameservers back at the registrar; expect another 1-3 hour propagation window

## Things that COULD break

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| Missed a DNS record from Squarespace inventory | Medium | Email/site breakage for that subdomain | Step 1 inventory + Cloudflare auto-import |
| Google Workspace email broken (if Todd uses it) | Medium | Inbound mail broken on tinyseedfarm.com | Verify MX records for apex match before NS change |
| Shopify storefront brief downtime | Low | Marketing site unreachable | Apex A record is in both Squarespace and Cloudflare; brief race during NS change is fine |
| `csa.tinyseedfarm.com` brief downtime | Low | CSA portal unreachable for 1-3h | CNAME is identical in both; should be no actual outage |
| Squarespace TXT padding issue resurfaces somehow | Very Low | DKIM still broken | Cloudflare does not pad TXT; verified via competitor benchmark |

## Time estimate

| Step | Time |
|---|---|
| 1. Inventory | 10 min |
| 2. Cloudflare setup | 5 min |
| 3. NS change at registrar | 2 min (action) + 1-3h propagation |
| 4. Verify | rolling, every 15 min |
| 5. Resend verify | 5 min |
| 6. Supabase SMTP config | 3 min |
| **Total active work** | **~25-30 min** |
| **Total elapsed** | **~2-4 hours** (mostly DNS propagation) |

## When to execute

NOT on a CSA delivery day (Wednesday). Best timing: Thursday-Sunday morning. Block 30 min for active work, monitor occasionally over the following few hours.
