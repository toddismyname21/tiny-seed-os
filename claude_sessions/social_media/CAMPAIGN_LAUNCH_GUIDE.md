# DIRECT MAIL CAMPAIGN LAUNCH GUIDE
## "Won't You Be My Neighbor" - Ready to Go Live

**Created:** 2026-01-22
**Status:** READY FOR LAUNCH

---

# PART 1: SHOPIFY DISCOUNT CODE SETUP

## Create the NEIGHBOR Discount Code

In Shopify Admin, go to **Discounts → Create discount**

### Discount 1: NEIGHBOR-VEG-FULL
| Setting | Value |
|---------|-------|
| **Code** | `NEIGHBOR` |
| **Type** | Fixed amount |
| **Value** | $30 off |
| **Applies to** | Specific collections |
| **Collection** | Veggie CSA (Full Share) |
| **Minimum requirements** | Minimum purchase of $600 |
| **Customer eligibility** | All customers |
| **Usage limits** | Limit to one use per customer |
| **Active dates** | Start now → End March 31, 2026 |

### Discount 2: NEIGHBOR-VEG-HALF
| Setting | Value |
|---------|-------|
| **Code** | `NEIGHBOR` |
| **Type** | Fixed amount |
| **Value** | $15 off |
| **Applies to** | Specific collections |
| **Collection** | Veggie CSA (Half Share) |
| **Minimum requirements** | Minimum purchase of $300 |
| **Customer eligibility** | All customers |
| **Usage limits** | Limit to one use per customer |
| **Active dates** | Start now → End March 31, 2026 |

### Discount 3: NEIGHBOR-FLORAL
| Setting | Value |
|---------|-------|
| **Code** | `NEIGHBOR` |
| **Type** | Fixed amount |
| **Value** | $20 off |
| **Applies to** | Specific collections |
| **Collection** | Floral CSA (All) |
| **Minimum requirements** | None |
| **Customer eligibility** | All customers |
| **Usage limits** | Limit to one use per customer |
| **Active dates** | Start now → End March 31, 2026 |

### Important: Exclude Add-ons
Make sure NONE of the add-on products are included in these discount collections.

---

# PART 2: SOCIAL MEDIA DASHBOARD SETUP

## Access the Dashboard

**URL:** `web_app/social-intelligence.html`

Or via Admin Panel:
1. Go to Admin Panel
2. Click "Social Media" section in sidebar
3. Click "Full Dashboard" or use the quick view in "Social Brain"

## What the Dashboard Does

| Feature | Purpose |
|---------|---------|
| **Brain Tab** | Daily briefing with urgent actions |
| **Action Queue** | Prioritized tasks (Sales > Complaints > Questions) |
| **AI Post Recommendations** | Approve/edit/regenerate content |
| **Voice Training** | Teach the AI your brand voice |
| **Content Calendar** | 7-day preview of scheduled posts |
| **One-Click Scheduling** | Instant post scheduling |

## Initial Setup Steps

1. **Open the Dashboard** - Click social-intelligence.html
2. **Generate Your First Briefing** - Click "Generate Fresh Briefing"
3. **Train the AI Voice** - Add 5-10 of your best-performing posts
4. **Configure Platforms** - Add Instagram account (API keys in settings)
5. **Test SMS Alerts** - Enable urgent action notifications

---

# PART 3: CAMPAIGN LAUNCH CHECKLIST

## Week 1: Preparation (5 Days Before Mailing)

### Day 1: Setup
- [ ] **Create NEIGHBOR discount in Shopify** (see Part 1)
- [ ] **Test discount code** - Make sure it applies correctly
- [ ] **Verify landing page** - Visit `web_app/neighbor.html`
- [ ] **Test form submission** - Fill out form, check `MARKETING_NeighborSignups` sheet

### Day 2: Design
- [ ] **Select farm photos** - High-res, warm, inviting
- [ ] **Open Canva** - Create new 6.5" x 9" design
- [ ] **Design front** - Use POSTCARD_DESIGN.md specs
- [ ] **Design back** - Include QR code, offers, URL
- [ ] **Proofread everything** - Spelling, phone, website

### Day 3: QR Code & Tracking
- [ ] **Generate QR code** - Use `tinyseedfarm.com/neighbor?source=postcard&campaign=feb26`
- [ ] **Test QR code** - Scan it, make sure it works
- [ ] **Add UTM parameters** - For GA tracking

### Day 4: Print Order
- [ ] **Export design as PDF** (print quality)
- [ ] **Order from VistaPrint** - 1,000 qty, 6.5"x9", 14pt glossy
- [ ] **Select fastest shipping** - ~3-5 days

### Day 5: USPS EDDM Setup
- [ ] **Go to eddm.usps.com**
- [ ] **Select carrier routes:**
  - 15217 (Squirrel Hill) - Start here
  - 15218 (Swissvale/Edgewood)
  - 15221 (Point Breeze)
- [ ] **Calculate total households** - Aim for 1,000
- [ ] **Note the post office** for drop-off

---

## Week 2: Production & Mailing

### Days 6-10: Wait for Print
- [ ] Track shipment from VistaPrint
- [ ] Prepare EDDM facing slips (download from USPS)
- [ ] Count/bundle postcards when they arrive

### Day 11: Mail Drop
- [ ] **Bundle postcards by route** (EDDM requires bundling)
- [ ] **Complete EDDM paperwork**
- [ ] **Pay postage** ($0.247/piece = ~$247 for 1,000)
- [ ] **Drop at post office**
- [ ] **Get receipt** for records

### Days 12-18: Delivery Window
- [ ] USPS delivers within 3-7 days
- [ ] Monitor landing page traffic (Google Analytics)
- [ ] Check `MARKETING_NeighborSignups` sheet for responses

---

## Week 3+: Response Tracking

### Daily Tasks
- [ ] Check signup sheet for new entries
- [ ] Check Shopify for NEIGHBOR code usage
- [ ] Respond to any inquiries promptly

### Weekly Report
| Metric | Target | Actual |
|--------|--------|--------|
| Postcards mailed | 1,000 | _____ |
| Landing page visits | 100+ | _____ |
| Email signups | 40+ | _____ |
| NEIGHBOR code uses | 20+ | _____ |
| New CSA members | 20+ | _____ |
| Revenue generated | $10,000+ | _____ |

---

# PART 4: BUDGET SUMMARY

| Item | Cost |
|------|------|
| Postcard printing (1,000) | $180 |
| EDDM Postage | $247 |
| Design (Canva free) | $0 |
| QR code (free generators) | $0 |
| **TOTAL** | **$427** |

## Expected ROI

| Scenario | CSA Signups | Revenue | ROI |
|----------|-------------|---------|-----|
| Conservative (2%) | 6 | $3,000 | 7x |
| Target (4%) | 20 | $10,000 | 23x |
| Optimistic (6%) | 30 | $15,000 | 35x |

---

# PART 5: TRACKING DASHBOARD

## Where to Monitor Results

1. **Google Sheet:** `MARKETING_NeighborSignups`
   - All form submissions from landing page
   - Includes: name, email, ZIP, neighborhood, source, campaign

2. **Shopify Admin:** Discounts → NEIGHBOR
   - View "Used X times"
   - Click for details on who used it

3. **Google Analytics:** (if configured)
   - Traffic to `/neighbor` page
   - UTM campaign tracking

4. **Landing Page:** `web_app/neighbor.html`
   - Form with hidden tracking fields
   - Auto-populates source from URL params

---

# PART 6: QUICK REFERENCE

## Key URLs

| Purpose | URL |
|---------|-----|
| Landing Page | `tinyseedfarm.com/neighbor` |
| With Tracking | `tinyseedfarm.com/neighbor?source=postcard&campaign=feb26` |
| EDDM Tool | `eddm.usps.com` |
| Social Dashboard | `web_app/social-intelligence.html` |

## Discount Code

**Code:** `NEIGHBOR`

| Product | Discount | Minimum |
|---------|----------|---------|
| Veggie CSA Full | $30 off | $600+ |
| Veggie CSA Half | $15 off | $300+ |
| Floral CSA | $20 off | Any |
| Add-ons | None | - |

## Contact for EDDM Questions

**USPS Business Help:** 1-800-344-7779
**EDDM Online Help:** eddm.usps.com/help

---

**READY TO LAUNCH!**

All systems are go. Follow the checklist and your postcards will be in mailboxes within 2-3 weeks.

*Generated by Social Media Claude - 2026-01-22*
