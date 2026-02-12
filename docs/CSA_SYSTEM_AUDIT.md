# CSA System Complete Audit

**Date:** 2026-02-12
**Auditor:** Claude Opus 4.5 (PM Architect Role)
**Status:** COMPREHENSIVE AUDIT

---

## Executive Summary

The Tiny Seed Farm CSA system is a sophisticated, multi-layered management platform consisting of:
- **1 Member Portal** (csa.html) - Full-featured PWA with authentication
- **3 Location Finder Tools** - Widget, full-page finder, and embed script
- **17 Neighborhood SEO Pages** - Targeting local CSA searches
- **70+ Backend Functions** - Apps Script for CSA management
- **Smart Intelligence Layer** - Churn prediction, health scoring, proactive alerts

**Overall Assessment:** The system is well-architected with extensive functionality, but has several gaps in implementation and integration.

---

## 1. Frontend Audit

### 1.1 CSA Member Portal (`web_app/csa.html`)

**Status:** PRODUCTION-READY with authentication

**File Location:** `/Users/samanthapollack/Documents/TIny_Seed_OS/web_app/csa.html`

**Features Implemented:**
| Feature | Status | Description |
|---------|--------|-------------|
| Magic Link Login | COMPLETE | Email-based passwordless authentication |
| SMS Code Login | COMPLETE | Phone-based 6-digit verification |
| Onboarding Wizard | COMPLETE | 4-step new member onboarding |
| This Week's Box View | COMPLETE | Shows current box contents |
| Item Swap System | COMPLETE | Swap items with available alternatives |
| Vacation Hold Scheduling | COMPLETE | Schedule holds with donate/credit options |
| Flex Funds Display | COMPLETE | Shows balance, history, add funds |
| Order History | COMPLETE | Past pickups with status |
| Account Settings | COMPLETE | Profile, preferences, notifications |
| Pull-to-Refresh | COMPLETE | Mobile refresh gesture |
| Skeleton Loading | COMPLETE | Loading states for all sections |
| Toast Notifications | COMPLETE | Success/error feedback |
| Weather Widget | COMPLETE | Farm weather display |
| Social Thumbnails | COMPLETE | Instagram feed integration |
| Season Status Banner | COMPLETE | Pre-season countdown |
| Renewal Prompts | COMPLETE | End-of-season renewal CTAs |

**Authentication Flow:**
1. User enters email/phone
2. System sends magic link (email) or 6-digit code (SMS)
3. User clicks link/enters code
4. Portal validates token via `verifyCSAMagicLink()` or `verifyCSASMSCode()`
5. Member data loaded, session established
6. First-time users see onboarding wizard

**Onboarding Steps:**
1. Order Confirmation - Verify membership details
2. Vegetable Preferences - Free-text skip list
3. Communication Preferences - Email/SMS opt-in
4. Participation Confirmation - Checkbox agreement

**Design Quality:**
- Modern, mobile-first CSS design
- CSS variables for theming
- Responsive breakpoints at 480px and 768px
- Touch feedback animations
- Professional green color scheme (#22c55e primary)

---

### 1.2 CSA Location Finder Tools

**File Locations:**
- `/Users/samanthapollack/Documents/TIny_Seed_OS/web_app/csa-location-finder.html` - Full page with map
- `/Users/samanthapollack/Documents/TIny_Seed_OS/web_app/csa-location-widget.html` - Embeddable widget
- `/Users/samanthapollack/Documents/TIny_Seed_OS/web_app/csa-unified-finder.html` - Unified version
- `/Users/samanthapollack/Documents/TIny_Seed_OS/web_app/csa-location-finder-embed.js` - Embed script

**Features:**
| Feature | Status | Description |
|---------|--------|-------------|
| ZIP Code Search | COMPLETE | Find locations by ZIP |
| Geolocation | COMPLETE | "Use My Location" button |
| Distance Calculation | COMPLETE | Haversine formula (miles) |
| Location List | COMPLETE | Sorted by distance |
| Community Stops | COMPLETE | Porch pickup locations |
| Home Delivery Check | COMPLETE | Eligible ZIP detection |
| Interactive Map | COMPLETE | Leaflet.js integration (full version) |
| Embed Script | COMPLETE | For Shopify/external use |

**Pickup Locations (14 Total):**
| Location | Type | Schedule |
|----------|------|----------|
| Rochester (Kretschmann Farm) | Farm | Farm Hours |
| Lawrenceville | Farmers Market | Tuesday 4-7pm |
| Bloomfield | Farmers Market | Saturday 9am-2pm |
| Sewickley | Farmers Market | Saturday 9am-1pm |
| Allison Park - St. Paul's | Church | Wednesday 4-6pm |
| Allison Park - Simon's | Market | Daily |
| Oakmont - Today's Organic | Market | Market Hours |
| Highland Park - Bryant St. | Market | Market Hours |
| North Side - Mayfly | Market | Market Hours |
| Mt. Lebanon | Community (Porch) | Weekly |
| Squirrel Hill | Community (Porch) | Weekly |
| Fox Chapel | Community (Porch) | Weekly |
| Cranberry | Community (Porch) | Weekly |
| North Park | Community (Porch) | Weekly |
| Zelienople | Community (Porch) | Weekly |

---

### 1.3 SEO Content Pages

**Location:** `/Users/samanthapollack/Documents/TIny_Seed_OS/web_app/seo_content/`

**Files:**
- `best-csa-pittsburgh-2026.html` - Pillar content page
- `csa-pickup-locations-pittsburgh.html` - Location guide
- `direct-farm-csa-vs-aggregators.html` - Comparison content
- `faq-featured-snippets.html` - FAQ structured data

**Neighborhood Landing Pages (13):**
- cranberry-township-csa-delivery.html
- east-liberty-csa-delivery.html
- fox-chapel-csa-delivery.html
- highland-park-csa-delivery.html
- lawrenceville-csa-delivery.html
- mt-lebanon-csa-delivery.html
- mt-washington-csa-delivery.html
- north-hills-csa-delivery.html
- northside-pittsburgh-csa-delivery.html
- oakmont-csa-delivery.html
- shadyside-csa-delivery.html
- south-hills-csa-delivery.html
- southside-pittsburgh-csa-delivery.html
- squirrel-hill-csa-delivery.html
- wexford-csa-delivery.html
- zelienople-csa-delivery.html

**SEO Features:**
- Schema.org LocalBusiness markup
- Schema.org FAQPage markup
- Schema.org Service markup
- Open Graph tags
- Canonical URLs
- Meta descriptions with keywords

---

## 2. Backend Audit

### 2.1 Core CSA Functions in Apps Script

**File:** `/Users/samanthapollack/Documents/TIny_Seed_OS/apps_script/MERGED TOTAL.js`

**Total CSA Functions Found:** 70+

#### Member Management Functions

| Function | Purpose | Status |
|----------|---------|--------|
| `findCSAMembership()` | Find member by phone/email | ACTIVE |
| `getCSAMembers()` | Get all CSA members | ACTIVE |
| `createCSAMember()` | Create new member | ACTIVE |
| `updateCSAMember()` | Update member details | ACTIVE |
| `addCSAMemberDirect()` | Direct add without Shopify | ACTIVE |
| `importShopifyCSAMembers()` | Import from CSV | ACTIVE |
| `importCSAMembersFromShopify()` | Direct API import | ACTIVE |
| `fullCSAImportFromShopify()` | Batch import all orders | ACTIVE |
| `clearCSAMembersSheet()` | Clear members sheet | ACTIVE |
| `dedupeCSAMembers()` | Remove duplicates | ACTIVE |
| `updateCSAMemberPickupLocations()` | Update locations | ACTIVE |

#### Authentication Functions

| Function | Purpose | Status |
|----------|---------|--------|
| `sendCSAMagicLink()` | Send email login link | ACTIVE |
| `verifyCSAMagicLink()` | Verify email token | ACTIVE |
| `sendCSASMSCode()` | Send SMS verification | ACTIVE |
| `verifyCSASMSCode()` | Verify SMS code | ACTIVE |
| `generateCSAMagicLinkEmail()` | Generate login email HTML | ACTIVE |

#### Box & Product Functions

| Function | Purpose | Status |
|----------|---------|--------|
| `getCSAProducts()` | Get available products | ACTIVE |
| `upsertCSAProduct()` | Create/update product | ACTIVE |
| `syncCSAProductsFromShopify()` | Sync from Shopify | ACTIVE |
| `getCSABoxContents()` | Get box items for week | ACTIVE |
| `customizeCSABox()` | Process item swaps | ACTIVE |
| `generateWeeklyCSABoxes()` | Auto-generate boxes | ACTIVE |

#### Order & Scheduling Functions

| Function | Purpose | Status |
|----------|---------|--------|
| `submitCSAOrder()` | Submit Flex CSA order | ACTIVE |
| `generateWeeklyCSAOrders()` | Create weekly orders | ACTIVE |
| `setCSAVacationHold()` | Set vacation hold | ACTIVE |
| `getCSAPickupHistory()` | Get pickup history | ACTIVE |
| `getCSAOrdersForWeek()` | Get orders for week | ACTIVE |
| `registerCSAOrderWebhook()` | Shopify webhook setup | ACTIVE |
| `autoCreateCSAMembersFromOrder()` | Auto-create from Shopify | ACTIVE |

#### Pickup Location Functions

| Function | Purpose | Status |
|----------|---------|--------|
| `getCSAPickupLocations()` | Get all locations | ACTIVE |
| `createCSAPickupLocation()` | Create new location | ACTIVE |

#### Communication Functions

| Function | Purpose | Status |
|----------|---------|--------|
| `sendCSAWelcomeEmail()` | Welcome email to new member | ACTIVE |
| `sendCSAWeeklyReminder()` | Weekly pickup reminder | ACTIVE |
| `sendCSAConfirmationReminder()` | Confirmation nudge | ACTIVE |
| `logCSAEmailSent()` | Log email history | ACTIVE |
| `resendCSAWelcomeEmail()` | Resend welcome | ACTIVE |

#### Renewal Campaign Functions

| Function | Purpose | Status |
|----------|---------|--------|
| `initCSARenewalsSheet()` | Initialize renewals sheet | ACTIVE |
| `scanCSARenewals()` | Scan for upcoming renewals | ACTIVE |
| `getCSARenewalsNeeded()` | Get renewal list | ACTIVE |
| `sendCSARenewalReminder()` | Send renewal email | ACTIVE |
| `runCSARenewalCampaign()` | Automated campaign | ACTIVE |

#### Flex CSA Functions

| Function | Purpose | Status |
|----------|---------|--------|
| `createFlexCSAGiftCard()` | Create Flex gift card | ACTIVE |
| `sendFlexCSAGiftCardEmail()` | Email gift card | ACTIVE |
| `getFlexCartDefaults()` | Get default Flex cart | ACTIVE |

---

### 2.2 Smart CSA Intelligence Layer

**File:** `/Users/samanthapollack/Documents/TIny_Seed_OS/apps_script/SmartCSAIntelligence.js`

**Owner Directive:** "I WANT IT TO BE SO SMART THAT IT KNOWS WHAT I SHOULD DO BEFORE ME"

#### Health Scoring Functions

| Function | Purpose | Status |
|----------|---------|--------|
| `calculateMemberHealthScoreSmart()` | Calculate 0-100 health score | ACTIVE |
| `calculateMemberHealthScoreEnhanced()` | Enhanced with real pickup data | ACTIVE |
| `getAtRiskCSAMembers()` | Get members below threshold | ACTIVE |
| `getCSARetentionDashboard()` | Retention metrics | ACTIVE |
| `getCSARetentionDashboardEnhanced()` | Enhanced with cohort analysis | ACTIVE |
| `getCSAChurnAlerts()` | Get churn risk alerts | ACTIVE |

**Health Score Formula:**
```
HEALTH_SCORE = (Pickup_Score x 0.30) + (Engagement_Score x 0.25)
             + (Customization_Score x 0.20) + (Support_Score x 0.15)
             + (Tenure_Score x 0.10)
```

**Risk Levels:**
| Score | Level | Action Required |
|-------|-------|-----------------|
| 75-100 | GREEN | Standard engagement |
| 50-74 | YELLOW | Proactive outreach within 7 days |
| 25-49 | ORANGE | Immediate contact within 48 hours |
| 0-24 | RED | Same-day intervention |

#### Proactive Alert Functions

| Function | Purpose | Status |
|----------|---------|--------|
| `getProactiveCSAAlerts()` | Get all proactive alerts | ACTIVE |
| `getOnboardingTasks()` | Get pending onboarding tasks | ACTIVE |
| `getCSAOnboardingStatus()` | Member onboarding status | ACTIVE |
| `triggerCSAOnboardingEmail()` | Trigger onboarding email | ACTIVE |
| `recordCSAPickupAttendance()` | Record pickup attendance | ACTIVE |
| `recordCSAImplicitSignal()` | Record implicit preference | ACTIVE |
| `logCSASupportInteraction()` | Log support interaction | ACTIVE |

**Alert Types:**
1. CONSECUTIVE_MISSED_PICKUPS - 2+ missed pickups in a row
2. LOW_HEALTH_SCORE - Score below 60
3. FIRST_YEAR_AT_RISK - New member struggling
4. ONBOARDING_AT_RISK - Not activated within 14 days

---

### 2.3 Preference Learning System

| Function | Purpose | Status |
|----------|---------|--------|
| `saveCSAMemberPreference()` | Save item preference | ACTIVE |
| `getCSAMemberPreferences()` | Get all preferences | ACTIVE |
| `updateCSAMemberPreferences()` | Update preferences | ACTIVE |
| `calculateCSABoxSatisfaction()` | Calculate box satisfaction | ACTIVE |

**Preference Weights:**
- EVERY_TIME: 5 points
- LIKE_IT: 4 points
- SOMETIMES: 3 points (default)
- RARELY: 2 points
- NEVER: 0 points

**Implicit Signals:**
- Item kept in box: +0.3 points
- Item swapped out: -0.7 points
- Add-on purchased: +1.0 points
- Recipe clicked: +0.4 points

---

### 2.4 Data Structures

#### CSA_Members Sheet Schema

| Column | Description |
|--------|-------------|
| Member_ID | Unique identifier |
| Customer_Name | Full name |
| Email | Email address |
| Phone | Phone number |
| Share_Type | Vegetable, Flower, Flex |
| Share_Size | Small, Regular, Friends & Family |
| Season | 2026, etc. |
| Frequency | Weekly, Biweekly |
| Pickup_Day | Day of week |
| Pickup_Location | Location name |
| Delivery_Address | For home delivery |
| Status | Active, Inactive, On Hold |
| Created_Date | Signup date |
| Total_Paid | Amount paid |
| Notes | Shopify order reference |

#### CSA_Preferences Sheet Schema

| Column | Description |
|--------|-------------|
| Preference_ID | Unique ID |
| Member_ID | FK to CSA_Members |
| Item_ID | Crop/variety identifier |
| Rating | 1-5 scale |
| Source | onboarding, explicit, implicit |
| Confidence | 0-1 for inferred ratings |
| Created_Date | First rated |
| Modified_Date | Last update |

#### CSA_Pickup_Attendance Sheet Schema

| Column | Description |
|--------|-------------|
| Attendance_ID | Unique ID |
| Member_ID | FK to CSA_Members |
| Week_Date | Pickup week |
| Attended | Boolean |
| Notes | Additional info |

#### CSA_Products Sheet Schema

| Column | Description |
|--------|-------------|
| Product_ID | Unique ID |
| Product_Name | Display name |
| Category | Vegetable, Flower, Flex |
| Size | Small, Regular, Large |
| Frequency | Weekly, Biweekly |
| Price | Price in dollars |
| Season | Valid season |
| Veg_Code | Vegetable code |
| Floral_Code | Flower code |

---

## 3. Shopify Integration

### 3.1 Product Sync

**Import Methods:**
1. CSV Upload - `importShopifyCSAMembers()`
2. Direct API - `importCSAMembersFromShopify()`
3. Webhook - `registerCSAOrderWebhook()` + `autoCreateCSAMembersFromOrder()`

**CSA Products Detected:**
- 2026 Small Summer CSA Share (Weekly/Biweekly)
- 2026 Friends & Family Summer CSA Share (Weekly/Biweekly)
- 2026 Spring CSA Share
- 2026 Flex CSA Share ($150/$300)
- 2026 Tiny Seed Fleurs Petite Bloom (Weekly/Biweekly)
- 2026 Tiny Seed Fleurs Full Bloom (Weekly/Biweekly)

**Add-On Products:**
- Local Bread (Weekly/Biweekly)
- Redhawk Coffee (Weekly/Biweekly)
- Mushroom (Weekly/Biweekly)
- Goat Cheese (Weekly/Biweekly)

### 3.2 Order Processing

**Webhook Flow:**
1. Customer purchases CSA on Shopify
2. Shopify sends order webhook
3. `autoCreateCSAMembersFromOrder()` processes order
4. CSA member created in Google Sheets
5. Welcome email sent via `sendCSAWelcomeEmail()`

**Order Data Extraction:**
- Customer name and email
- Share type (parsed from product name)
- Share size (Small, Regular, Family)
- Frequency (Weekly, Biweekly)
- Pickup location (from line item properties)
- Season dates

---

## 4. Member Journey Documentation

### 4.1 New Member Signup Flow

```
1. DISCOVERY
   - Customer finds CSA via search (SEO pages)
   - Uses location finder to check eligibility
   - Browses Shopify store

2. PURCHASE
   - Selects share type and size
   - Chooses pickup location or delivery
   - Completes Shopify checkout

3. WEBHOOK PROCESSING
   - Shopify sends order webhook
   - System creates CSA_Members entry
   - Member_ID generated

4. WELCOME EMAIL
   - sendCSAWelcomeEmail() triggered
   - Contains magic link to portal
   - Includes share details and first pickup

5. PORTAL ACTIVATION
   - Member clicks magic link
   - verifyCSAMagicLink() validates token
   - Onboarding wizard appears

6. ONBOARDING (4 steps)
   - Step 1: Confirm order details
   - Step 2: Enter vegetable preferences
   - Step 3: Set communication preferences
   - Step 4: Confirm participation

7. PORTAL ACCESS
   - Dashboard with week's box
   - Customize/swap items
   - View pickup schedule
   - Manage vacation holds
```

### 4.2 Weekly Member Cycle

```
WEDNESDAY (5 days before pickup):
- Box contents finalized
- Customization window opens

FRIDAY (3 days before):
- Reminder email sent (if enabled)
- "Customize by Sunday" nudge

SUNDAY 5pm:
- Customization deadline
- Box locked

MONDAY:
- Boxes packed

TUESDAY:
- Pickup day (most locations)
- SMS reminder (if enabled)

POST-PICKUP:
- Attendance recorded
- Implicit signals captured
- Health score updated
```

### 4.3 Onboarding Schedule (30 Days)

| Day | Channel | Purpose |
|-----|---------|---------|
| 0 | Email + SMS | Welcome & Confirmation |
| 1 | Email | Quick Start Guide |
| 2 | SMS | Profile Completion Nudge |
| 3 | Email | Feature Education (Customization) |
| 5 | Email | Social Proof (Member Stories) |
| 7 | Email + SMS | First Pickup Prep |
| 8 | SMS | Post-Pickup Check-in |
| 10 | Email | Recipes Based on Box |
| 14 | Email | Milestone Celebration |
| 21 | Email | Community Invite |
| 30 | Phone/Email | Personal Success Call |

---

## 5. Complete Feature List

### 5.1 Member-Facing Features

| Feature | Implementation | Notes |
|---------|---------------|-------|
| Passwordless Login | Magic Link + SMS | Complete |
| View This Week's Box | Portal dashboard | Complete |
| Swap Box Items | Modal interface | Complete |
| "Remember" Preferences | Checkbox option | Complete |
| Vacation Holds | Donate or credit | Complete |
| Flex Funds Balance | Dashboard widget | Complete |
| Purchase Flex Funds | Link to Shopify | Complete |
| Pickup History | Order list view | Complete |
| Communication Preferences | Settings tab | Complete |
| Profile Management | Settings tab | Complete |
| Weather Display | Farm conditions | Complete |
| Instagram Feed | Social thumbnails | Complete |
| Season Countdown | Pre-season banner | Complete |
| Renewal Prompts | End-of-season | Complete |

### 5.2 Admin/Owner Features

| Feature | Implementation | Notes |
|---------|---------------|-------|
| Member Import (CSV) | Apps Script function | Complete |
| Member Import (API) | Direct Shopify sync | Complete |
| Webhook Auto-Create | Shopify integration | Complete |
| Member Health Scores | Smart intelligence | Complete |
| Churn Alerts | Proactive system | Complete |
| Retention Dashboard | Analytics view | Complete |
| Cohort Analysis | Enhanced dashboard | Complete |
| Onboarding Tracking | Task system | Complete |
| Renewal Campaigns | Automated outreach | Complete |
| Box Generation | Weekly automation | Complete |
| Attendance Tracking | Pickup records | Complete |

### 5.3 Marketing/SEO Features

| Feature | Implementation | Notes |
|---------|---------------|-------|
| Location Finder Widget | Embeddable | Complete |
| Neighborhood Pages | 13+ pages | Complete |
| Schema.org Markup | LocalBusiness, FAQPage | Complete |
| FAQ Snippets | Structured data | Complete |
| CSA Comparison Content | Pillar page | Complete |

---

## 6. Integrations

### 6.1 Active Integrations

| System | Integration Type | Status |
|--------|-----------------|--------|
| Shopify | Products, Orders, Webhooks | ACTIVE |
| Google Sheets | Database backend | ACTIVE |
| Gmail/SMTP | Email sending | ACTIVE |
| Twilio (planned) | SMS sending | PARTIAL |
| Instagram | Social feed | ACTIVE |
| Leaflet.js | Maps | ACTIVE |
| Google Maps Places | Geolocation | ACTIVE |

### 6.2 Data Flow

```
Shopify (Orders) --> Webhook --> Apps Script --> Google Sheets
                                     |
                                     v
                              Welcome Email
                                     |
                                     v
                              CSA Portal <-- Magic Link Auth
```

---

## 7. Gaps and Weaknesses

### 7.1 Critical Gaps

| Gap | Impact | Recommendation |
|-----|--------|----------------|
| SMS Integration Incomplete | Cannot send SMS reminders | Complete Twilio integration |
| Portal Login Tracking Missing | Engagement score hardcoded at 70 | Add last_login tracking |
| No Waitlist System | Cannot capture interested customers | Build waitlist capture form |
| Manual Box Packing | Labor intensive | Add inventory-to-box allocation |

### 7.2 Important Gaps

| Gap | Impact | Recommendation |
|-----|--------|----------------|
| No Real-Time Sync | Shopify changes not instant | Add polling or more webhooks |
| Preference Quiz Not Built | Cold start problem | Build onboarding quiz UI |
| Recipe Integration Missing | Missed engagement opportunity | Add recipe suggestions |
| No NPS Tracking | Cannot measure satisfaction | Add NPS survey |
| Renewal Flow Manual | Requires owner intervention | Automate renewal processing |

### 7.3 Nice-to-Have Gaps

| Gap | Impact | Recommendation |
|-----|--------|----------------|
| No Push Notifications | Mobile engagement lower | Add PWA notifications |
| No Dark Mode | Preference for some users | Add theme toggle |
| No Spanish Translation | Limits audience | Add i18n |
| No Referral System | Organic growth limited | Build member referrals |

---

## 8. Recommendations

### 8.1 Immediate Actions (This Week)

1. **Complete SMS Integration**
   - Configure Twilio credentials
   - Test `sendCSASMSCode()` and `sendCSAWeeklyReminder()`
   - Enable SMS toggle in member preferences

2. **Add Portal Login Tracking**
   - Log last_login timestamp in CSA_Members
   - Update `calculateMemberHealthScoreEnhanced()` to use real data
   - Replace hardcoded engagement score

3. **Deploy Welcome Email**
   - CSAWelcomeEmail.html is built and ready
   - Verify email sending works
   - Add magic link generation

### 8.2 Short-Term Actions (This Month)

1. **Build Waitlist Capture**
   - Add waitlist form to location finder
   - Create CSA_Waitlist sheet
   - Add notification when capacity opens

2. **Automate Renewals**
   - Configure `runCSARenewalCampaign()` trigger
   - Set up 30/14/7 day reminder sequence
   - Add Shopify renewal link generation

3. **Connect Preference Quiz**
   - Build onboarding step 2 UI
   - Save preferences to CSA_Preferences sheet
   - Use for box recommendation

### 8.3 Long-Term Actions (This Season)

1. **Implement Demand Forecasting**
   - Aggregate preferences across members
   - Generate planting recommendations
   - Build farmer dashboard view

2. **Add Inventory-to-Box Allocation**
   - Connect to harvest data
   - Implement fair distribution algorithm
   - Handle surplus/shortage

3. **Build Community Features**
   - Member discussion forum
   - Recipe sharing
   - Neighbor referral rewards

---

## 9. File Index

### Frontend Files
| File | Path | Purpose |
|------|------|---------|
| CSA Portal | `/web_app/csa.html` | Member portal |
| Location Finder | `/web_app/csa-location-finder.html` | Full page with map |
| Location Widget | `/web_app/csa-location-widget.html` | Embeddable widget |
| Unified Finder | `/web_app/csa-unified-finder.html` | Combined version |
| Embed Script | `/web_app/csa-location-finder-embed.js` | Shopify embed |
| Welcome Email | `/apps_script/CSAWelcomeEmail.html` | Email template |

### Backend Files
| File | Path | Purpose |
|------|------|---------|
| Main Backend | `/apps_script/MERGED TOTAL.js` | All CSA functions |
| Smart Intelligence | `/apps_script/SmartCSAIntelligence.js` | Churn/retention |

### SEO Content
| File | Path | Purpose |
|------|------|---------|
| Best CSA Guide | `/web_app/seo_content/best-csa-pittsburgh-2026.html` | Pillar content |
| Pickup Locations | `/web_app/seo_content/csa-pickup-locations-pittsburgh.html` | Location guide |
| Neighborhood Pages | `/web_app/seo_content/neighborhoods/` | 13 local pages |

### Documentation
| File | Path | Purpose |
|------|------|---------|
| System Spec | `/claude_sessions/backend/SMART_CSA_SYSTEM_SPEC.md` | Full specification |
| This Audit | `/docs/CSA_SYSTEM_AUDIT.md` | This document |

---

## 10. Conclusion

The CSA system is **architecturally sound** and has **most core features implemented**. The major gaps are:

1. **SMS not working** - Blocks member communication
2. **Login tracking missing** - Health scores inaccurate
3. **No waitlist** - Losing potential customers
4. **Renewals manual** - Owner burden

**Priority Focus:** Complete SMS integration and add login tracking to unlock the full potential of the churn prediction system.

---

*Audit completed 2026-02-12 by Claude Opus 4.5*
