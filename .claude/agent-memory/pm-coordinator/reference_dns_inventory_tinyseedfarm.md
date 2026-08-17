---
name: DNS inventory for tinyseedfarm.com (live as of 2026-05-18)
description: Every authoritative DNS record on tinyseedfarm.com — Shopify, Google Workspace, Resend, Vercel, GitHub Pages — needed for any DNS migration or troubleshooting
metadata:
  type: reference
---

## Nameservers (registrar = Squarespace Domains)

```
ns-cloud-e1.googledomains.com
ns-cloud-e2.googledomains.com
ns-cloud-e3.googledomains.com
ns-cloud-e4.googledomains.com
```

DNS is hosted on Google's nameservers (Squarespace acquired Google Domains, kept the infrastructure). Squarespace Domains panel controls these records.

## Live records (verified via `dig @8.8.8.8` on 2026-05-18)

| Type | Name | Value | Service / Purpose |
|---|---|---|---|
| A | @ | `23.227.38.32` | **Shopify** storefront (apex marketing site) |
| CNAME | www | `tiny-seed-farmers-market.myshopify.com` → `shops.myshopify.com` → `23.227.38.74` | **Shopify** www |
| CNAME | csa | `cname.vercel-dns.com` (→ Vercel IPs `76.76.21.98`, `66.33.60.67`) | **CSA Portal** (Astro on Vercel) |
| CNAME | app | `toddismyname21.github.io` (→ GitHub Pages IPs `185.199.108-111.153`) | **Admin OS** (legacy HTML on GitHub Pages) |
| CNAME | _domainconnect | `_domainconnect.domains.squarespace.com` | Squarespace auto-config — drop if migrating off Squarespace |
| MX | @ | 5 records: `1 aspmx.l.google.com`, `5 alt1`, `5 alt2`, `10 alt3`, `10 alt4` | **Google Workspace** inbound mail for `@tinyseedfarm.com` (separate domain from `@tinyseedfarmpgh.com`) |
| TXT | @ | `v=spf1 include:_spf.google.com ~all` | Google Workspace outbound SPF |
| TXT | google._domainkey | 3-chunk RSA key: `v=DKIM1; k=rsa; p=MIIBIjA...rwIDAQAB` | Google Workspace DKIM (must be reassembled into a single TXT value when entering elsewhere) |
| TXT | resend._domainkey | `p=MIGfMA0GCSqGSIb3...wIDAQAB` (no trailing whitespace — byte-verified clean via xxd) | **Resend** DKIM — verified |
| MX | send | `10 feedback-smtp.us-east-1.amazonses.com` | **Resend** feedback subdomain |
| TXT | send | `v=spf1 include:amazonses.com ~all` | **Resend** SPF for sending subdomain |
| CAA | @ | `0 issue "ssl.com"`, `0 issue "pki.goog"`, `0 issue "letsencrypt.org"` | TLS issuance allow-list — letsencrypt covers Vercel + GitHub Pages renewals |

## Missing / should add

| Type | Name | Suggested value | Why |
|---|---|---|---|
| TXT | _dmarc | `v=DMARC1; p=quarantine; rua=mailto:dmarc@tinyseedfarm.com; pct=100; adkim=s; aspf=r` | Required by Gmail/Yahoo bulk-sender policy (Feb 2024+). Without it, deliverability drops as we ramp transactional volume. Can be added directly in Squarespace — does NOT require DNS migration. |

## Resend status (verified live via API on 2026-05-18)

- Domain ID: `ed76caed-a99c-4140-abb7-be92398650be`
- Status: **verified** (sending enabled)
- All 3 records (DKIM TXT, SPF MX, SPF TXT) report `verified`
- Test email sent successfully through Resend at audit time → API accepted

## Supabase Auth SMTP status

- Currently `null` — using Supabase's default mailer
- Default mailer rate-limit: **4 emails/hour** — production-blocker
- Project ref: `melizsvabemhaqeaqtyw`
- Site URL: `https://csa.tinyseedfarm.com`
- Allow-list includes: csa.tinyseedfarm.com, /auth/callback, /auth/confirm, localhost:4321

## Cloudflare migration runbook status (`docs/specs/CLOUDFLARE_DNS_MIGRATION_RUNBOOK.md`)

- Written 2026-05-08 when Squarespace was breaking the Resend DKIM TXT record with trailing whitespace
- **As of 2026-05-18 the broken state has self-resolved** — Resend is verified, DKIM is byte-clean
- The runbook's "must execute before Day 10" assertion is no longer true
- Real reasons to still migrate eventually: DMARC easier to manage, Cloudflare Page Rules for legacy URL redirects, faster propagation when we need to change records

## Related domain — tinyseedfarmpgh.com (Todd's email domain)

- Nameservers: `ns4.wixdns.net`, `ns5.wixdns.net` (Wix DNS)
- MX: same Google Workspace cluster
- SPF + google site verification configured
- Separate DNS host from tinyseedfarm.com — DO NOT confuse the two

## Why this matters

Any DNS change to `tinyseedfarm.com` has THREE simultaneous failure modes:
1. **Shopify storefront breaks** (apex A + www CNAME) — kills marketing site
2. **Google Workspace inbound mail breaks** (5 MX records + SPF + DKIM) — Todd stops receiving mail
3. **Resend outbound breaks** (DKIM + send subdomain MX/SPF) — CSA member emails fail silently

All three must be preserved in any migration. Get the inventory right BEFORE flipping nameservers.

**How to apply:** Before any DNS work on tinyseedfarm.com, re-verify this list with `dig @8.8.8.8` — Squarespace can change records and we may not know. Always preserve every record in the table above.
