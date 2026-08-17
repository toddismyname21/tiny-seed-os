---
name: csa-delivery-text
description: How the CSA "your share has arrived" delivery text actually works (sms: deep links, NOT Twilio) + how a driver is authorized. Corrects the stale "Twilio never worked" belief.
metadata:
  type: reference
---

The CSA delivery "your share has arrived" text is **NOT Twilio / not server-side SMS.** (The old "Twilio never worked" note is moot for this feature.)

**How it works:** `apps/csa-portal/src/pages/admin/text-stop/` is a mobile-first page the driver opens **on their own phone**. They pick the week → tap a stop → each member shows a one-tap **`sms:` deep link** that opens the driver's **own Messages app** pre-filled with the recipient's number + "your share has arrived." The driver hits Send. No SMS API, no cost, works iOS+Android. There's a synthetic **"Home delivery"** entry in the stop list too (`HOME_DELIVERY_BUCKET_ID`). Code comment is explicit: "server-side SMS does NOT work in this environment."

**Driver authorization = a `customers` row with `role` in ('admin','staff'), keyed by EMAIL.** Both the page gate (`lib/admin.ts` `resolveAdminRole` → middleware over `/admin/*`) and the RLS function `is_admin_caller()` (migration 0017) check `customers.email = auth jwt email AND role IN ('admin','staff')`. To onboard a driver: create/patch their `customers` row with `role='staff'`, `customer_type='csa'` (the type CHECK rejects `'member'` — copy an existing staff row like Jackson's), `is_active=true`. Then they log in at csa.tinyseedfarm.com/login with that email (magic-link/OTP) → land in `/admin` → open `/admin/text-stop` on their phone.

**Known staff (drivers/team) as of 2026-06-17:** Todd (admin), Loren, Marigrace, Ben, Frankie, Jackson Schulman, **Sam (skpollac@gmail.com)** — all `staff`.

**Why:** Todd flagged this system as confusing for team + customers and wants it locked down (2026-06-17). **How to apply:** when onboarding a driver, set the staff customers row (above); when "delivery text" is questioned, it's the deep-link tool, not Twilio. Related: [[csa-portal-prod-deploy]].
