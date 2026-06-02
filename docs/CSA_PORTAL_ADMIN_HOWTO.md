# CSA Portal — Admin Onboarding & How-To

**For:** Frankie (`tinyseedcsa@gmail.com`) and any future admin/staff
**Portal URL:** [csa.tinyseedfarm.com](https://csa.tinyseedfarm.com)
**Last updated:** 2026-06-01
**Questions / when stuck:** Todd — **717-725-5177**

---

## Welcome

This is the admin guide for our new CSA member portal. The portal replaces the old Google-Sheets-based system we used in 2024-2025. Every paying CSA member (about 189 households) can now:

- Log in with a one-time email link (no password to remember)
- See their season info, share size, pickup location, weeks remaining
- Customize their box (swap items)
- Schedule vacation holds
- Add funds to Farm Flex (their store-credit wallet)
- Update dietary preferences, contact info, pickup location

**Your job as admin:** help members who get stuck, run the weekly operations (pack day, labels, vendor orders), and keep the comms log up to date so Todd and you always see the full conversation history with each member.

You'll mostly use the portal **a few times a week** — Mondays/Thursdays for harvest prep, Tuesday/Wednesday/Saturday for pickups, and any time a member emails with a question.

---

## Part 1 — Getting Started

### 1.1 Your login

The portal uses **magic-link login** — no password. Every time you log in:

1. Go to **https://csa.tinyseedfarm.com/login**
2. Enter your email: `tinyseedcsa@gmail.com`
3. Check your inbox — you'll get a one-time login link from `hello@tinyseedfarm.com`
4. Click the link → you're in

Magic links **expire after 1 hour**. If you don't click in time, just request another.

### 1.2 Save it to your phone

Open `https://csa.tinyseedfarm.com` in Safari (iPhone) or Chrome (Android) → tap **Share** → **Add to Home Screen**. Now you have a one-tap icon.

### 1.3 Your role

You have the **staff** role. That means:

- ✅ You can see every member's info, share, pickups, comms log
- ✅ You can post Stop Notes (read-only updates that members see)
- ✅ You can resend magic links, update member details, process delivery requests
- ✅ You can run pack-day, harvest, labels, vendor orders, weekly email
- ⚠️ Some financial actions (issuing Shopify Store Credit, refunds) still go through Todd or Shopify directly — flag those, don't try to do them in the portal

### 1.4 What you'll bookmark

Once you log in, bookmark these pages in your browser:

| Page | URL | When you'll use it |
|------|-----|--------------------|
| Admin home | `/admin` | Every login — your dashboard |
| Member search | `/admin/members` | When a member emails/calls |
| Pack day | `/admin/pack-day` | Tuesday & Friday afternoons |
| Stop manifest | `/admin/stop-manifest` | Wednesday & Saturday mornings |
| Avery 5164 labels | `/admin/labels` | Right before pack day |
| Vendor orders | `/admin/vendor-orders` | Mondays (lead time = 7 days) |
| Weekly email | `/admin/weekly-email` | Each Tuesday |

---

## Part 2 — The Admin Dashboard

When you log in and go to **`/admin`**, you see the high-level overview:

- **Active members** count + week-over-week change
- **Members by pickup stop** (so you see at a glance: 22 at Bloomfield, 18 at Lawrenceville…)
- **This week's pack count** by share size
- **Outstanding action items** — home-delivery requests pending approval, pickup changes, recently-flagged churn risk
- **Quick links** to every admin tool

If something looks off, **don't fix it from the dashboard** — go to the specific page and use the proper tool. Audit logs catch every change you make and Todd can review.

---

## Part 3 — Helping a Member (the most common task)

When a member emails you with a problem, the workflow is:

1. **Find them** → `/admin/members` → search by email or name
2. **Open their member page** → `/admin/members/[id]`
3. **Read their info** — share type, pickup, vacation holds, comms log
4. **Take action** (see workflows below)
5. **Log what you did** — every member page has a **Communication Log** section; add a one-line note (e.g. "Updated pickup to Lawrenceville Tue per email")

> **Why the comms log matters:** Todd will see every note when he opens the member's page. If he reaches out to a member or you do, both of you know what was already discussed. No "didn't you tell them X already?" confusion.

### 3.1 Member can't log in

> **Symptom:** "I never get the email" or "the link expired"

| Step | What to do |
|------|-----------|
| 1 | Open their member page |
| 2 | Confirm their email matches what they're typing (case-insensitive — `Jane@…` and `jane@…` are the same) |
| 3 | If the email is wrong → update it on the member page → ask them to try again |
| 4 | If the email is right → **6-digit code login** is the iPhone in-app-browser fallback. Tell them: "From the login page, tap 'Use a 6-digit code instead.' That works inside Instagram/Facebook." |
| 5 | Add comms log: "Walked through 6-digit fallback / updated email to X" |

### 3.2 Member wants to change pickup location

> **Symptom:** "Can I switch from Bloomfield to Lawrenceville?"

Members can change their own pickup via `/account/pickup` — encourage them to do it themselves. If they want you to do it:

1. Open their member page → **Pickup** card
2. Use the **"Set pickup stop"** dropdown → save
3. Add comms log: "Switched pickup from X to Y per email"

**Important:** This is for pickup → pickup changes. **Home delivery** is a different process (see 3.3).

### 3.3 Member requests home delivery

> **Symptom:** Email subject "Home delivery request — $15/week"

Home delivery is **$15/week**, admin-approved, paid via Shopify. Members CANNOT self-serve switch to delivery (we closed that revenue leak in May).

When a request comes in:

1. You + Todd will both have received the email from `hello@tinyseedfarm.com` (auto-forwarded from the member's request)
2. Reply to the member: "Got your request. We'll set this up — please go to **shop.tinyseedfarm.com/products/home-delivery** and pay the $15/week (or however many weeks)."
3. **WAIT for payment confirmation in Shopify** (don't approve until paid)
4. Once paid: open their member page → Pickup card → **"Set home delivery ($15/week — approved)"** → enter their address → save
5. Add comms log: "Approved home delivery, $15/wk, paid in Shopify on [date]"

> ⚠️ **Never** click the home-delivery approve button before the $15/week is in Shopify. The portal does not auto-charge — Shopify is the source of truth for payments.

### 3.4 Member wants to schedule a vacation hold

> **Symptom:** "I'm gone June 17-July 1, can I skip those weeks?"

Members can do this themselves via `/account/vacation`. If they want you to:

1. Open their member page → **Vacation Holds** card → **"Add hold"**
2. Enter start date + end date
3. Save
4. Add comms log: "Added vacation hold June 17-July 1 per email"

The portal automatically:
- Excludes them from that week's pack list
- Pauses their pickup
- Refunds isn't automatic — vacation holds reschedule, they don't refund. If the member wants a refund instead, escalate to Todd.

### 3.5 Member wants to add funds (Farm Flex)

> **Symptom:** "I want to add $100 to my account credit"

Direct them to `https://csa.tinyseedfarm.com/account/flex` — they can buy a Flex Top-Up themselves (Shopify product). Auto-syncs every 15 min so the balance updates within ~15 min of purchase.

If they need help: open their member page → confirm their Shopify customer ID is linked → walk them through.

### 3.6 Member wants to customize their box

> **Symptom:** "Can I swap kohlrabi for spinach this week?"

Members can swap themselves via `/box` (their dashboard's "This Week's Box" card has a Swap button per item). They have a swap-credit limit (6/season for large boxes, 3/season for small) — the portal enforces this automatically.

If they ask you to do it for them:

1. Open their member page → swap on their behalf via the same interface (you'll see their swap-credit balance)
2. Add comms log

**Allergy substitutions don't use a swap credit** — they're automatic from member preferences. If a member says "I'm allergic to strawberries, please always swap them out," update their **Preferences** (Dietary section) and the system will substitute every future week without burning a credit.

---

## Part 4 — Weekly Operations (the rhythm)

### 4.1 The weekly cycle

Our week runs:

| Day | What happens |
|-----|--------------|
| **Mon 6 AM** | Cutoff — member changes (swaps, holds, preferences) lock in for the week |
| **Mon morning** | You & Todd review the pack-day dashboard, send vendor orders |
| **Mon/Tue** | Harvest Day 1 (for Wed CSA + Lawrenceville Tue + Sat markets) |
| **Tue afternoon** | Print labels + stop manifests for Wed CSA |
| **Wed** | Pack & deliver: Lawrenceville Tue, Bloomfield/Highland Park/etc Wed (8 stops) |
| **Thu** | Harvest Day 2 (for Sat markets) |
| **Sat** | Pack & sell at Saturday farmers' markets |

### 4.2 Pack Day Dashboard (`/admin/pack-day`)

This is your **command center on Mondays and Thursdays**. Open it first.

It shows:
- **Total boxes this week** (broken down by size)
- **Add-on totals** (mushrooms, bread, cheese, coffee, eggs — by vendor)
- **Flex orders this week** (count + $ total)
- **Vendor order status** — green ✓ if you've sent the order, ⏳ if drafted, ❌ if not done
- **Owes-balance list** — members with unpaid balances (don't pack their box without confirming)
- **Quick links** to every other tool

Open the page → glance → know if anything's missing.

### 4.3 Harvest List (`/admin/harvest`)

Tells the field crew **what to pick and how much**.

- **Mon tab** = harvest for Tue Lawrenceville + Wed CSA
- **Thu tab** = harvest for Saturday markets
- Each crop shows total quantity + per-box breakdown
- Add-ons are aggregated separately (the bread total, the egg dozen total)

Print this for the field crew Monday and Thursday mornings.

### 4.4 Pack Sheet (`/admin/pack-sheet`)

The **kitchen checklist** — what goes into each member's box. Grouped by pickup stop, page-broken so each stop is its own printable section.

Add-ons are in their **own column** (we learned the hard way: when add-ons are mixed into the produce column, packers miss them).

Print this Monday and Thursday afternoons.

### 4.5 Per-Stop Manifest (`/admin/stop-manifest`)

The **driver / host's sheet** for each pickup stop.

Each stop has:
- **★ N BOXES ★** big cover (so the driver knows at a glance how many to load)
- Per-member checkbox row: name, share size, add-ons, flex order summary, **live Shopify flex balance**
- ⚠️ flags: allergies (so the host knows to double-check), owes-balance (so they don't hand out a box if there's a billing issue)

Print one for every stop Tuesday afternoon. Hosts use these to check off pickups as members arrive.

### 4.6 Avery 5164 Labels (`/admin/labels`)

The **address labels** for each box. Standard Avery 5164 — 6 labels per Letter-size sheet.

- 1 label per share (a member with veg + cheese gets 2 labels)
- Order: by day (Tue → Wed → Sat) then alphabetical within stop (this is the gold-standard pack order — keeps the kitchen line moving)
- Print these right before pack day. Slap on each box.

### 4.7 Vendor Orders (`/admin/vendor-orders`)

We have **4 vendor partners**: goat-rodeo cheese, redhawk coffee, local-bread, and a mushroom grower. Each one has a **7-day lead time** — we have to order Monday for the following Wednesday pickup.

For each vendor, the page:
1. Auto-computes totals from member add-ons (e.g. "12 wedges of cheddar")
2. Lets you **edit overrides** (e.g. if a member called to add an extra wheel)
3. Templates an email body
4. **Save Draft** OR **Send** button

> ⚠️ **Sending is irreversible** — confirm the totals once before hitting Send. The button shows a confirm prompt for safety, but read the totals carefully.

Once sent, the dashboard turns green ✓ for that vendor for the week.

### 4.8 Box Plan Editor (`/admin/box-plan`)

This is where Todd plans **what's in the box each week** — the base composition before swaps.

You probably won't edit this — Todd does the box planning. But you'll see it: small box vs. large box, each crop + qty + unit. When Todd hits **Save & Publish**, members can see their week's box and the swap menu lights up.

### 4.9 Weekly Email (`/admin/weekly-email`)

The **Tuesday email** to all opted-in members. Shows:
- This week's box contents
- 1-3 matching recipes (from our recipe library)
- Pickup reminders + the standard footer (unsubscribe link, address)

Workflow:
1. Open the page
2. Review the preview (auto-generated)
3. Click **Send**
4. The system batches the send (we have ~189 opted-in members; Resend free tier = 100/day, so it staggers across ~2 hours)

You should send this every Tuesday. If you forget, members notice — they expect the rhythm.

### 4.10 Recipes Library (`/admin/recipes`)

Where we build up the recipe library that powers the weekly email.

You can add a recipe two ways:
- **From the internet** — paste URL + title + tag the crops it features. Email links out to the original.
- **From us** — write your own (title + steps) + tag crops. Email shows the full recipe.

Each Tuesday, the weekly email auto-matches up to 3 recipes whose crop tags overlap this week's box. The more recipes you add over time, the better the matching.

---

## Part 5 — Communication Tools

### 5.1 Per-Member Comms Log

On every member's `/admin/members/[id]` page there's a **Communication Log** section. Every time you talk to a member (email, text, phone, in-person at pickup), add a one-line note.

| What happened | Sample note |
|---------------|------------|
| Changed pickup | "Switched pickup from Bloomfield to Lawrenceville Tue per email 2026-06-03" |
| Approved delivery | "Approved home delivery, $15/wk × 8 weeks paid in Shopify" |
| Resolved login issue | "Walked through 6-digit fallback — works on Instagram in-app" |
| Sent vacation hold | "Added vacation June 20-July 5 per phone call" |
| Resolved complaint | "Apologized for missing eggs week of 7/15, comped 1 dozen next week" |

**Why this matters:**
- Todd reads these. If he reaches out to a member, he's caught up.
- If you go on vacation, anyone covering for you can pick up the thread.
- If a dispute arises, we have a record.

### 5.2 Stop Notes (`/admin/stop-notes`)

These are **read-only posts** members see when they go to their pickup location.

You can post things like:
- "Lawrenceville Tue 7/8: We're 10 minutes late this week due to traffic"
- "Bloomfield: New host — Sarah is taking over from Mark"
- "All stops: Strawberries today are extra-sweet, taste before you leave!"

Members see Stop Notes on their dashboard if it's their pickup stop. They cannot reply (it's broadcast-only). This is a soft launch of community features — if it goes well, we may open member posting later.

### 5.3 Home Delivery Request Emails

When a member requests home delivery via the portal, you AND Todd both get an email automatically. **Don't ignore them** — these are paying customers asking to upgrade their service. Process within 24 hours:

1. Reply to the member with payment instructions
2. Watch for payment in Shopify
3. Once paid, approve in `/admin/members/[id]`
4. Comms log

---

## Part 6 — When Something Looks Wrong

### 6.1 Member's data is missing or wrong

- **Step 1:** Open their member page. Is it really wrong, or are you looking at an old cached view?
- **Step 2:** Cross-check Shopify. Their Shopify customer record is the **source of truth** for: name, email, address, paid amount, Farm Flex balance.
- **Step 3:** If Shopify is right and the portal is wrong, the auto-sync (runs every 15 min) should fix it within the next cycle. If it doesn't, escalate to Todd.

### 6.2 You see "old" data after a member changed something

- The portal reads live from the database. There's no cache.
- If a member says "I just changed my pickup but it still shows old," refresh the page in their browser. If it still shows old, check the member's page — did the change actually save? Sometimes Wi-Fi flakes on their end.

### 6.3 Magic link emails not arriving

- First: tell the member to **check spam/promotions**. Resend emails come from `hello@tinyseedfarm.com` and Gmail sometimes sorts them away.
- Second: have them try the **6-digit code login** option from the login page.
- If still failing after 10 minutes: escalate to Todd. There's a rare bounce issue we may need to investigate.

### 6.4 Shopify shows credit but the portal doesn't

- The Shopify → Supabase sync runs every 15 min. Wait 15 min.
- If still not showing after 30 min, escalate to Todd.

### 6.5 "Two members at one email address"

- This shouldn't happen — we enforce **one email = one account**. But couples/roommates may want to **share an account** instead. See "Household sharing" below.

### 6.6 Household sharing (couples/roommates)

A primary member can **invite** a partner/roommate to share their account via `/account/household`. Both get full login. **Only the primary** can add/remove members.

If a couple is confused about whose name should be on the share, they can sort it out themselves via this page — or you can do it from the member page.

---

## Part 7 — What to Escalate to Todd

| Issue | Handle yourself | Escalate |
|-------|----------------|----------|
| Login/pickup/vacation/preferences | ✅ | |
| Home delivery approval (after Shopify payment) | ✅ | |
| Box swap on member's behalf | ✅ | |
| Comms log notes | ✅ | |
| Refunds, store credit issuance, billing disputes | | 🔴 Todd or Shopify direct |
| Member threats / abusive behavior | | 🔴 Todd |
| Data correction (Supabase row edits) | | 🔴 Todd / PM |
| Anything you're not sure about | | 🔴 Todd (better safe) |

**Todd's cell: 717-725-5177.** Text/call anytime during work hours. Email otherwise.

---

## Part 8 — Your First Week — Soft-Start Checklist

Take it easy your first week. The portal is new for everyone.

- [ ] Log in successfully (magic link, save to home screen)
- [ ] Tour the admin dashboard with Todd — 30 min walkthrough together
- [ ] Bookmark the 7 key URLs (Part 1.4)
- [ ] Find your own customer page in `/admin/members` — note: your shares were deactivated 2026-05-24, that's intentional (you're staff, not a paying member)
- [ ] Open 3 random member pages and read their comms log
- [ ] Post a test Stop Note (then delete it) so you've used the feature once
- [ ] Send a test magic link to yourself, see what it looks like in the inbox
- [ ] On the first Monday: shadow Todd through pack-day → vendor orders → labels → manifest
- [ ] On the first Tuesday: send your first weekly email (Todd reviews the preview with you first)
- [ ] After 1 week: send Todd a "what's confusing / what I want to know more about" list

---

## Part 9 — Quick Reference (Cheat Sheet)

**Login:** `csa.tinyseedfarm.com/login` → email → magic link

**Member emails about…**

| Topic | Page | Action |
|-------|------|--------|
| Can't log in | n/a | Tell them: try 6-digit code from login page |
| Pickup change | `/admin/members/[id]` Pickup card | Update + comms log |
| Home delivery request | (auto-emailed to you + Todd) | Reply with $15/wk Shopify link → wait for payment → approve |
| Vacation hold | `/admin/members/[id]` Vacation Holds card | Add dates + comms log |
| Box swap | `/admin/members/[id]` swap section | Swap + comms log |
| Add funds (Flex) | (they self-serve) | Direct to `csa.tinyseedfarm.com/account/flex` |
| Wrong info on profile | `/admin/members/[id]` | Edit + comms log |
| Recipe question | n/a | Reply directly, link to `/admin/recipes` |
| Billing/refund | escalate | Todd / Shopify |

**Monday routine:** `/admin/pack-day` → `/admin/vendor-orders` → review + send

**Tuesday routine:** `/admin/weekly-email` → review → send. Then `/admin/labels` + `/admin/stop-manifest` → print.

**Wednesday morning:** Hand out manifests to hosts/drivers.

---

## Final Notes

- **You're not alone.** Todd is your backup. The system is designed to fail safely — if you make a mistake, it's almost always reversible (audit log catches everything).
- **Read the comms log first** before responding to a member email. You'll often find Todd or you already handled the question.
- **When in doubt, write a comms log note.** Better to over-document than under-document.
- **Don't reply to angry emails right away.** Give yourself 10 minutes. The portal can handle the delay.

Welcome aboard. We're glad to have you running this with us.

— Todd

*This document lives at `docs/CSA_PORTAL_ADMIN_HOWTO.md` — ask Todd to update it whenever something changes.*
