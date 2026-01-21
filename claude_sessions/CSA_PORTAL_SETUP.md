# CSA PORTAL SETUP GUIDE

**Created:** 2026-01-21
**Status:** Ready for tomorrow's deployment

---

## OVERVIEW

The CSA Customer Portal (`web_app/csa.html`) is built and functional. This document outlines the steps to make it fully operational.

---

## CURRENT STATUS

### Working (v229 Deployment)
- `sendCSAMagicLink` - Sends login email to CSA members
- `verifyCSAMagicLink` - Validates token, returns member data
- `getCSABoxContents` - Returns weekly box contents (needs data)
- `getCSAPickupHistory` - Returns member's pickup history
- `updateCSAMemberPreferences` - Saves member preferences (POST)

### Blocked by Version Limit (Code Pushed, Not Deployed)
- `populateSampleBoxContents` - Creates sample box data for testing
- `getBoxContentsPreview` - Preview all share types
- Fix for `getCSAMembers` - Was calling non-existent secured function

---

## TOMORROW'S PRIORITIES

### Priority 1: Delete Old Apps Script Versions
**Required before any new deployments can happen.**

1. Go to: https://script.google.com
2. Open Tiny Seed OS project
3. Click "Deploy" > "Manage deployments"
4. Delete deployments you don't need (keep v229 and production)
5. Or: File > Project history > delete old versions

### Priority 2: Deploy Pending Code
After deleting old versions:
```bash
clasp deploy -i AKfycbxwlNBHBKBS1sSDHXFbnmuZvhNpHlKi9qJ8crPzB2Iy39zeh0FjTcu9bCxhsz9ugBdc -d "CSA Box Contents + Bug Fixes"
```

### Priority 3: Import Shopify Tags
File ready: `/Users/samanthapollack/Downloads/shopify_tags_import.csv`

In Shopify Admin:
1. Products > Import
2. Select shopify_tags_import.csv
3. Map "Handle" and "Tags" columns
4. Import (existing products will be updated)

### Priority 4: Register Shopify Webhook
To automatically process CSA orders:

In Shopify Admin > Settings > Notifications > Webhooks:
1. Create webhook for "Order creation"
2. URL: `https://script.google.com/macros/s/AKfycbxwlNBHBKBS1sSDHXFbnmuZvhNpHlKi9qJ8crPzB2Iy39zeh0FjTcu9bCxhsz9ugBdc/exec?action=processShopifyOrder`
3. Format: JSON
4. API version: Latest

### Priority 5: Create CSA_BoxContents Data
After deployment, call:
```bash
curl -sL "https://script.google.com/macros/s/[DEPLOYMENT_ID]/exec?action=populateSampleBoxContents"
```

Or manually populate the CSA_BoxContents sheet with columns:
- Week_Date (YYYY-MM-DD)
- Share_Type (Veggie-CSA, Friends-Family, Flower-Share, etc.)
- Crop_ID
- Product_Name
- Variety
- Quantity
- Unit

---

## TESTING THE PORTAL

### Test Magic Link Flow
1. Ensure a CSA member exists in CSA_Members sheet with email
2. Go to: `[BASE_URL]/web_app/csa.html`
3. Enter the member's email
4. Check email for magic link
5. Click link to log in
6. Verify dashboard shows member info and box contents

### API Testing Commands
```bash
# Test magic link send (replace with real member email)
curl -sL "https://script.google.com/macros/s/AKfycbxwlNBHBKBS1sSDHXFbnmuZvhNpHlKi9qJ8crPzB2Iy39zeh0FjTcu9bCxhsz9ugBdc/exec?action=sendCSAMagicLink&email=member@example.com"

# Test box contents
curl -sL "https://script.google.com/macros/s/AKfycbxwlNBHBKBS1sSDHXFbnmuZvhNpHlKi9qJ8crPzB2Iy39zeh0FjTcu9bCxhsz9ugBdc/exec?action=getCSABoxContents&shareType=Veggie-CSA"

# Test retention dashboard
curl -sL "https://script.google.com/macros/s/AKfycbxwlNBHBKBS1sSDHXFbnmuZvhNpHlKi9qJ8crPzB2Iy39zeh0FjTcu9bCxhsz9ugBdc/exec?action=getCSARetentionDashboard"
```

---

## DATA REQUIREMENTS

### CSA_Members Sheet
Required columns:
- Member_ID
- Customer_ID
- Customer_Name
- Email
- Phone
- Share_Type (Veggie-CSA, Flower-Share, etc.)
- Share_Size (Small, Friends-Family, etc.)
- Frequency (Weekly, Biweekly)
- Start_Date
- End_Date
- Pickup_Location
- Status (Active, Inactive, etc.)
- Swap_Credits
- Preferences (JSON)

### SALES_MagicLinks Sheet
Used for authentication tokens:
- Token
- Email
- Created_At
- Expires_At
- Used

### CSA_BoxContents Sheet
Weekly box items:
- Week_Date
- Share_Type
- Crop_ID
- Product_Name
- Variety
- Quantity
- Unit

---

## SHARE TYPES (From Shopify Tags)

| Tag | Description |
|-----|-------------|
| Veggie-CSA | Standard vegetable CSA |
| Friends-Family | Larger veggie share |
| Flower-Share | Full bloom bouquet |
| Petite-Bloom | Smaller bouquet |
| Flex-CSA | Flexible/market credit |
| Seasonal-CSA | Limited season share |

---

## DEPLOYMENT URLS

| Name | URL | Version |
|------|-----|---------|
| Primary (CSA Features) | AKfycbxwlNBHBKBS1sSDHXFbnmuZvhNpHlKi9qJ8crPzB2Iy39zeh0FjTcu9bCxhsz9ugBdc | @229 |
| Legacy (Stable) | AKfycbx8syGK5Bm60fypNO0yE60BYtTFJXxviaEtgrqENmF5GStB58UCEA4Shu_IF9r6kjf5 | @223 |
| HEAD (Latest Pushed) | AKfycbwxe2qjNkrNvYkHv7NJWBJvemu0MGBfO7NEfiF0dBo | @HEAD |

---

## FILES CREATED TONIGHT

| File | Purpose |
|------|---------|
| `/Downloads/shopify_tags_import.csv` | Shopify product tags for import |
| `/Downloads/PICKUP_LOCATION_GUIDE.csv` | Pickup location reference |
| `/claude_sessions/MCP_SERVER_ACCESS.md` | Updated API documentation |
| `/claude_sessions/CSA_PORTAL_SETUP.md` | This file |

---

## CODE CHANGES TONIGHT

### MERGED TOTAL.js
1. Added `populateSampleBoxContents()` - Creates sample box data
2. Added `getBoxContentsPreview()` - Preview function
3. Added API routes for both functions
4. Fixed `getCSAMembers` - Was calling non-existent secured function

### All changes pushed via clasp but blocked from deployment due to 200 version limit.

---

*Ready for tomorrow! Delete old versions first, then deploy.*
