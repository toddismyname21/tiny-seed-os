# STATUS: Social Media Claude

**Last Updated:** 2026-01-16 @ Evening

---

## CURRENT STATUS: LANDING PAGE LIVE

Neighbor landing page is built, deployed, and ready for the direct mail campaign.

---

## JUST COMPLETED

### Landing Page: `web_app/neighbor.html`

**Live URL:** https://toddismyname21.github.io/tiny-seed-os/web_app/neighbor.html

| Feature | Status |
|---------|--------|
| Hero section with "Welcome, Neighbor" | Done |
| Farm introduction story | Done |
| 3 offer cards (25% off, Free Tour, Neighbor Pricing) | Done |
| Signup form (name, email, ZIP, neighborhood) | Done |
| All target neighborhoods in dropdown | Done |
| Campaign tracking via URL params | Done |
| Backend API for signups | Done |
| Duplicate email handling | Done |
| Mobile responsive design | Done |

### Target Neighborhoods Included
- Squirrel Hill
- Shadyside
- Highland Park
- Mt. Lebanon
- Cranberry Township
- Zelienople
- North Hills
- Fox Chapel
- Sewickley
- Upper St. Clair
- Peters Township

### Backend Endpoints Added
```
addNeighborSignup - Saves signup to MARKETING_NeighborSignups sheet
getNeighborSignups - Returns all signups with neighborhood breakdown
```

### How Tracking Works
Postcard URLs can include parameters:
- `?n=cranberry` - Pre-selects neighborhood
- `?campaign=feb26-cranberry` - Tracks which mailer
- `?source=postcard` - Tracks source type

Example: `tinyseedfarm.com/neighbor?n=cranberry&campaign=feb26`

---

## DIRECT MAIL DELIVERABLES (Complete)

| File | Description | Status |
|------|-------------|--------|
| `DIRECT_MAIL_RESEARCH.md` | USPS programs, costs, timelines | Done |
| `ADDRESS_TARGETING_ALGORITHM.md` | High-value address scoring system | Done |
| `NEIGHBOR_LANDING_PAGE_SPEC.md` | Page design spec | Done |
| `DIRECT_MAIL_CAMPAIGN_PLAN.md` | Step-by-step campaign plan | Done |
| `MORNING_DIRECT_MAIL_BRIEF.md` | Executive summary | Done |
| `web_app/neighbor.html` | **LIVE LANDING PAGE** | Done |

---

## MARKETING COMMAND CENTER (Previous Session)

- [x] Stripped all fake/demo data
- [x] Added "Update Follower Counts" manual entry
- [x] Fixed CORS issue with follower save
- [x] All platforms showing as connected via Ayrshare

---

## PENDING ITEMS

### For Owner to Do
1. **Deploy Apps Script** - Run new deployment to activate `addNeighborSignup` endpoint
2. **Create NEIGHBOR25 promo code** - In Shopify for the 25% discount
3. **Review landing page** - Visit the live URL and confirm it looks right
4. **Decide on postcard design** - DIY with Canva or hire designer

### Still Needs Shopify Credentials
Email marketing integration still waiting for Shopify API token (not found in project).

---

## FILES CREATED THIS SESSION

```
/web_app/
└── neighbor.html              (NEW - LIVE)

/apps_script/MERGED TOTAL.js   (UPDATED)
└── Added addNeighborSignup()
└── Added getNeighborSignups()
```

---

## WHAT OWNER NEEDS TO DO FOR LANDING PAGE TO WORK

**CRITICAL:** The Apps Script needs a new deployment for the signup form to work!

1. Go to: https://script.google.com/
2. Open the Tiny Seed OS project
3. Click "Deploy" > "Manage deployments"
4. Click the pencil icon on the current deployment
5. Select "New version" from the dropdown
6. Click "Deploy"
7. Copy the new Web app URL (if it changed, update neighbor.html)

Without this step, form submissions will fail because the new `addNeighborSignup` function isn't deployed yet.

---

## NEXT STEPS (When Ready)

1. Deploy Apps Script (see above)
2. Test form submission on landing page
3. Create postcard design in Canva
4. Generate mailing list using algorithm
5. Order postcards
6. Mail them out!

---

*Social Media Claude - Landing Page Complete and Deployed*
