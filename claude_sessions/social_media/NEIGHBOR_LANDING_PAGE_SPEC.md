# "Won't You Be My Neighbor" Landing Page Specification

**Prepared by:** Social Media Claude
**Date:** 2026-01-16
**For:** Direct Mail Campaign Response Page

---

## Overview

A warm, welcoming landing page specifically for direct mail recipients. The page creates a sense of community invitation and makes it easy to join the Tiny Seed Farm family.

**URL:** `tinyseedfarm.com/neighbor` or `tinyseedfarm.com/welcome`

---

## Page Concept

### Theme: "Won't You Be My Neighbor"

Inspired by Mr. Rogers' warm, welcoming approach - this page makes recipients feel invited to join something special, not sold to.

### Tone
- Warm and personal
- Community-focused
- Authentic farm story
- Low pressure, high value

### Visual Style
- Soft, natural colors (greens, earth tones)
- Beautiful farm photography
- Clean, uncluttered layout
- Mobile-first design

---

## Page Structure & Wireframe

```
┌─────────────────────────────────────────────────────────────┐
│                        HERO SECTION                          │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                                                     │    │
│  │         [Beautiful Farm Photo - Morning Light]      │    │
│  │                                                     │    │
│  │     "Welcome, Neighbor"                             │    │
│  │     You're Invited to Join Our Farm Family          │    │
│  │                                                     │    │
│  │     [  Claim Your Welcome Gift  ] <- Primary CTA    │    │
│  │                                                     │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    INTRODUCTION SECTION                      │
│                                                              │
│  "Hi, I'm [Farmer Name], and this is Tiny Seed Farm"        │
│                                                              │
│  [Photo of farmer]    We're a small family farm just        │
│                       [X] miles from your home. We grow      │
│                       organic vegetables, flowers, and       │
│                       mushrooms for neighbors like you.      │
│                                                              │
│                       We believe everyone deserves access    │
│                       to fresh, local food grown with care.  │
│                                                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                      WHAT WE OFFER                           │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │ CSA Box  │  │ Market   │  │  Farm    │  │  Events  │    │
│  │  Icon    │  │  Stand   │  │  Store   │  │   Icon   │    │
│  │          │  │  Icon    │  │  Icon    │  │          │    │
│  │ Weekly   │  │ Fresh at │  │ Order    │  │ Tours &  │    │
│  │ Boxes    │  │ Markets  │  │ Online   │  │ Dinners  │    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    SPECIAL OFFER SECTION                     │
│           (Highlighted box - different background)           │
│                                                              │
│     🎁 YOUR NEIGHBOR WELCOME GIFT                           │
│                                                              │
│     As a thank you for being our neighbor:                  │
│                                                              │
│     • FREE farm tour for your family                        │
│     • 25% OFF your first CSA box                            │
│     • Exclusive "Neighbor" pricing all season               │
│                                                              │
│     Enter your email to claim:                              │
│     ┌────────────────────────────────────┐                  │
│     │  your@email.com                    │                  │
│     └────────────────────────────────────┘                  │
│     ┌────────────────────────────────────┐                  │
│     │  Your ZIP Code                     │                  │
│     └────────────────────────────────────┘                  │
│                                                              │
│     [  Yes! I Want My Welcome Gift  ]                       │
│                                                              │
│     Use code: NEIGHBOR25 at checkout                        │
│                                                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    SOCIAL PROOF                              │
│                                                              │
│  "The freshest vegetables I've ever had. So glad they       │
│   reached out!" - Sarah M., Squirrel Hill                   │
│                                                              │
│  "Our kids love visiting the farm. We're customers          │
│   for life." - The Johnson Family, Fox Chapel               │
│                                                              │
│  [Photo grid: happy customers, farm scenes, produce]        │
│                                                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    LOCATION & CONTACT                        │
│                                                              │
│  Find Us:                    Connect:                        │
│  [Embedded Map]              📧 hello@tinyseedfarm.com      │
│                              📞 (412) XXX-XXXX               │
│  123 Farm Road               📱 @tinyseedfarm               │
│  Pittsburgh, PA 15XXX                                        │
│                                                              │
│  Farm Stand Hours:                                           │
│  Sat & Sun: 9am - 2pm                                       │
│                                                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                       FOOTER                                 │
│                                                              │
│  Tiny Seed Farm | Growing Community, One Seed at a Time     │
│                                                              │
│  [Instagram] [Facebook] [TikTok]                            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Copy Suggestions

### Headlines

**Primary:**
- "Welcome, Neighbor"
- "You're Invited to Join Our Farm Family"
- "Fresh From Your Neighbor's Farm"

**Secondary:**
- "We Grow Food for Families Like Yours"
- "Just [X] Miles From Your Door"
- "Your Local Farm, Growing for You"

### Body Copy

**Introduction:**
> "Hi, I'm [Name], and I started Tiny Seed Farm because I believe everyone deserves access to real food - vegetables that actually taste like vegetables, picked fresh that morning, grown by someone who lives in your community.
>
> We're not a faceless grocery store. We're your neighbors. And we'd love to have you as part of our farm family."

**The Offer:**
> "Because you're our neighbor, we want to give you something special. A chance to see the farm, taste the difference, and experience what real local food is all about - no strings attached."

**Call-to-Action:**
> "Join hundreds of Pittsburgh families who've made Tiny Seed Farm their source for fresh, local food. We can't wait to meet you."

---

## Technical Requirements

### Tracking Implementation

1. **UTM Parameters:** Page should capture source
   - `?source=dm` (direct mail)
   - `?source=dm-feb26` (specific campaign)
   - `?source=dm-squirrelhill` (specific neighborhood)

2. **Promo Code Tracking:**
   - `NEIGHBOR25` - 25% off first order
   - `WELCOME` - Free farm tour
   - Can create neighborhood-specific codes: `SQHILL25`, `FOXCHAPEL25`

3. **Form Capture:**
   - Email (required)
   - ZIP code (required - helps track which mailers work)
   - Name (optional)
   - How did you hear about us? (hidden field: "Direct Mail")

4. **Analytics Events:**
   - Page view
   - Scroll depth
   - CTA clicks
   - Form submissions
   - Promo code usage

### Integration Points

- Email captures → Shopify/email list
- Form submissions → Google Sheet for tracking
- Promo codes → Shopify discount system

---

## Mobile Design Notes

- Hero image should be impactful on mobile
- CTA buttons large and thumb-friendly
- Form fields easy to tap
- Minimal scrolling to reach offer
- Phone number click-to-call enabled

---

## A/B Testing Ideas

| Element | Version A | Version B |
|---------|-----------|-----------|
| Headline | "Welcome, Neighbor" | "Fresh From Your Neighbor's Farm" |
| Offer | 25% off first CSA | Free farm tour |
| CTA | "Claim Your Gift" | "Join the Farm Family" |
| Hero | Farm landscape | Farmer portrait |
| Form | Email only | Email + ZIP |

---

## Conversion Tracking Dashboard

Create simple tracking in Google Sheets:

| Date | Source | ZIP | Email | Converted to Sale? | Order Value |
|------|--------|-----|-------|-------------------|-------------|
| 2/15 | dm-feb-sqhill | 15217 | yes | yes | $125 |
| 2/15 | dm-feb-sqhill | 15217 | yes | no | - |
| 2/16 | dm-feb-foxchapel | 15238 | yes | yes | $500 |

**Key Metrics:**
- Landing page visits (by source)
- Email signups (conversion rate)
- Promo code usage
- Sales attributed to direct mail
- Cost per acquisition

---

## Implementation Options

### Option 1: Simple (Shopify Page)
- Build as Shopify page
- Use Shopify's built-in forms
- Promo codes work natively
- ~2 hours to build

### Option 2: Dedicated Landing Page (Recommended)
- Build in `web_app/neighbor.html`
- Custom tracking
- More control over design
- Integrate with existing API
- ~4-6 hours to build

### Option 3: Landing Page Builder
- Use Carrd, Unbounce, or similar
- Quick setup
- Monthly cost ($10-50)
- Less integration flexibility

---

## Launch Checklist

- [ ] Page built and tested
- [ ] Mobile responsive verified
- [ ] Form submissions working
- [ ] Email integration connected
- [ ] Promo codes created in Shopify
- [ ] Analytics tracking installed
- [ ] UTM parameters tested
- [ ] QR code generated and tested
- [ ] Print URL on mailer verified

---

*Landing page spec complete. See DIRECT_MAIL_CAMPAIGN_PLAN.md for full campaign details.*
